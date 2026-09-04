# Architecture Decision Register (ADR) — Nexus POS-Commerce Suite

## Overview
This register records foundational architectural decisions for `greatjoy026/pos-commerce`. For every decision, the current state, target state, and implementation status are explicitly distinguished.

---

### ADR-001: Evolution Toward Shared Domain Architecture with Specialized Experiences

* **Status**: `PROPOSED / APPROVED IN PRINCIPLE`
* **Context**: The application currently concentrates state, handlers, and views within a single React SPA (`App.tsx`), handling in-store POS, warehouse inventory, financial invoicing, CRM, and an e-commerce storefront.
* **Decision**: Avoid both extremes:
  1. A monolithic super-app frontend where all operational logic is hardcoded into view components; and
  2. Disconnected, fragmented sub-systems with duplicated models.
  Instead, evolve toward a **shared domain core** (shared catalog, inventory, orders, customer CRM) with specialized UI surface experiences (Admin POS register, eCommerce storefront, Warehouse terminal).
* **Current State**: Monolithic state controller in `App.tsx` managing both POS and E-Commerce.
* **Target State**: Clean separation into a shared domain layer (`/src/domain/`) with dedicated presentation adapters.

---

### ADR-002: Shared Authoritative Catalog and Inventory Truth Between POS and E-Commerce

* **Status**: `IN PROGRESS`
* **Context**: Both in-store POS terminals and online storefronts sell from the same product catalog and physical stock pool.
* **Decision**: POS and e-commerce must share the exact same authoritative product, catalog, and inventory domain truth. Both channels must execute stock deductions against the same base units and synchronize in real-time via Firestore snapshot listeners.
* **Current State**: Both channels read from the same Firestore `products` collection, but checkout deduction logic is duplicated between `handleProcessOrder` and `handlePlaceEcomOrder` in `App.tsx`.
* **Target State**: A unified `OrderDomainService` processes order creation and stock decrement for all channels.

---

### ADR-003: Decoupling Structural Product Types from Inventory Capabilities

* **Status**: `PROPOSED`
* **Context**: `src/types.ts` contains `ProductType` ('Standard', 'Composite', 'Bundle', 'Service', 'Digital', 'Rental') intertwined with flags like `trackInventory`, `trackSerial`, `trackBatch`, `trackExpiry`.
* **Decision**: Model **Structural Product Types** (how an item is assembled or defined) orthogonally from **Inventory Capabilities** (how stock is tracked, rotated, or fulfilled).
* **Current State**: Product interface mixes structural types with tracking booleans and embedded arrays.
* **Target State**: Clean type discrimination where capabilities are defined as composable feature traits.

---

### ADR-004: SKU as the Authoritative Inventory Identity

* **Status**: `PROPOSED`
* **Context**: Currently, the product ID (`Product.id`) often doubles as the primary stock identifier, while `Product.variants[]` have their own nested `sku` and `stock`.
* **Decision**: SKU must become the single authoritative identifier for inventory tracking, purchasing, barcode scanning, and stock movement. A single Product may map to one or more SKUs (via variants or packaging units).
* **Current State**: Top-level `Product.stock` exists alongside `ProductVariant.stock`, occasionally requiring dual updates.
* **Target State**: Inventory balances are held strictly at the SKU level. Top-level product stock is derived as an aggregate.

---

### ADR-005: Decoupled Serial and Batch Records vs. Embedded Arrays

* **Status**: `PROPOSED`
* **Context**: Currently, serial numbers and batch lot details are defined as optional arrays inside the `Product` entity (`serialNumbers?: string[]`, `batchLot?: string`).
* **Decision**: Serials, lots, and batches must be stored as individual inventory tracking records in an inventory subcollection or dedicated ledger, rather than unbounded arrays embedded inside the product document.
* **Current State**: Embedded arrays in `Product` types and mock data.
* **Target State**: Separate `inventory_items` or `stock_batches` collection referencing the parent SKU.

---

### ADR-006: Authoritative Base Units with Consistent UOM Conversions

* **Status**: `PARTIALLY IMPLEMENTED (App.tsx)`
* **Context**: Items sold in packs, cartons, boxes, or retail units require consistent mathematical conversion back to the physical base unit (e.g. 1 box of 30 bars = 30 base units).
* **Decision**: Inventory quantities must always be accounted for in an **authoritative base unit**. All selling tiers and packaging units (dozen, carton, pack) must apply deterministic multiplier conversions at point of sale and receiving.
* **Current State**: Multipliers are calculated in `App.tsx` using `orderItem.unitMultiplier` or `packagingUnits` lookups with `dual_stock` / `auto_depackage` logic.
* **Target State**: Formalized in a dedicated `UOMConversionService` supporting custom purchase packaging and retail selling units.

---

### ADR-007: Server-Enforced Firestore Authorization and Security Hardening

* **Status**: `IMPLEMENTED (SEC-001)`
* **Context**: The application previously had open Firestore rules relying exclusively on document ID length (`isValidId(id)`). This left all customer PII, staff PINs, pricing, catalog records, and financial transaction histories vulnerable to unauthenticated manipulation or theft.
* **Decision**: 
  1. Enforce strict Default Deny at the global boundary (`match /{document=**} { allow read, write: if false; }`).
  2. Implement an authenticated Role-Based Access Control (RBAC) model supporting Super Admin, Store Manager, Inventory Manager, and Cashier roles.
  3. Keep catalog browsing and store settings publicly readable so public e-commerce operates without friction.
  4. Permit unauthenticated e-commerce order creation with strict channel and customer schema constraints (`channel == 'ecom'`, non-negative totals).
  5. Enforce append-only immutability for audit logs (`/audit_logs/{id}`) and financial shift reports (`/shift_reports/{id}`).
  6. Restrict `/staff` collection to authenticated staff users, mitigating plain-text PIN exposure to the public internet.
* **Consequences**:
  * Unauthenticated attackers cannot query CRM customer records or read employee PINs.
  * Insecure client-side seeding cannot overwrite production data without admin credentials.
  * Public e-commerce is fully functional for storefront visitors.
  * Real automated test suite (`tests/authorization.test.ts`) verifies all access paths and threat payloads.

---

### ADR-008: Dual-Collection Product Projection and Untrusted Client Input Boundaries

* **Status**: `IMPLEMENTED (SEC-001 Hardening)`
* **Context**: The `products` collection contains sensitive supplier costs, profit margins, reorder thresholds, and batch tracking. Permitting public read access to `/products` would leak wholesale costs to competitors and customers. Furthermore, permitting untrusted browser clients to set order payment or completion status allows price manipulation.
* **Decision**:
  1. **Dual-Collection Strategy**: Restrict `/products` to internal authenticated staff (`isStaff()`). Create `/public_products` as a safe public projection managed by `dbService.ts` on write.
  2. **Strict Projection Schema**: Rules on `/public_products` strictly forbid `cost`, `costPrice`, `reorderPoint`, `supplier`, `serialNumbers`, and `batchNumber`.
  3. **Untrusted E-Commerce Input Boundary**: Unauthenticated browser clients can only create orders with `status == 'Pending'` and `paymentStatus in ['Pending', 'Unpaid']`. Transitioning an order to `Completed` or `Paid` requires staff authorization or server webhook verification.
  4. **Credentials Vault Segregation**: Move sensitive authentication secrets to `/staff_credentials/{staffId}` where client reads are completely disabled (`allow read: if false;`).
* **Consequences**:
  * Public storefront users browse catalog products securely without access to internal business financials.
  * Attackers cannot forge "Paid" orders through client-side API manipulation.
  * Staff PINs and credential material are isolated from general staff profile reads.

---

### ADR-009: Separation of Private Settings and Public Storefront Settings Projection

* **Status**: `IMPLEMENTED (SEC-001-R1)`
* **Context**: The `/settings` collection contains sensitive operational configurations: supervisor PINs, integrations, webhook URLs, printer/network setups, and internal operational parameters. Allowing public reads of `/settings` leaks these confidential values.
* **Decision**:
  1. `/settings/{id}` is strictly restricted to authenticated enterprise staff (`isStaff()`).
  2. `/public_settings/{id}` is created as a storefront-safe public projection (`allow read: if true;`).
  3. Rules on `/public_settings` strictly forbid sensitive fields: `supervisorPin`, `pin`, `secret`, `secrets`, `apiKey`, `apiKeys`, `webhookUrl`, `webhookUrls`, `printerSettings`, `networkSettings`, `securitySettings`, `notificationSettings`, `operationalConfig`, `credentials`.
  4. Client `subscribeSettings` falls back gracefully to `subscribePublicSettings` if the viewer lacks staff credentials.
* **Consequences**: Public visitors and customers access essential storefront configurations (business name, currency, tax rate) without exposing internal infrastructure credentials.

---

### ADR-010: Constrained Guest E-Commerce Customer Creation Boundary

* **Status**: `IMPLEMENTED (SEC-001-R2)`
* **Context**: Open anonymous customer creation permitted arbitrary customer document writes and point injection.
* **Decision**:
  1. Unrestricted anonymous customer creation is eliminated.
  2. Explicitly distinguish: (a) Staff CRM creation, (b) Authenticated customer self-registration (`request.auth.uid == customerId`), and (c) Guest checkout.
  3. Guest customer creation requires explicit marker `channel == 'ecom_guest'` and locks loyalty points to `0`.
  4. Cross-customer profile modification is strictly prohibited.
* **Consequences**: E-commerce guests can check out smoothly while preventing loyalty balance fraud or unauthorized directory tampering.

---

### ADR-011: Complete Client Exclusion from Credential Vault

* **Status**: `IMPLEMENTED (SEC-001-R4)`
* **Context**: Permitting `isSuperAdmin()` client writes to `/staff_credentials` conflicts with the zero-client credential vault architecture.
* **Decision**:
  1. All client SDK operations on `/staff_credentials/{staffId}` are denied unconditionally: `allow read, write: if false;`.
  2. The credential vault is exclusively accessible via trusted server environments (Firebase Admin SDK).
  3. Plaintext PINs must not enter client storage or Firestore documents.
* **Consequences**: Total client isolation for credential material, mitigating token-theft vector for credential compromise.

---

### ADR-012: Authoritative Staff Role Model & Custom Claims Precedence

* **Status**: `IMPLEMENTED (SEC-001-R5)`
* **Context**: Dual-authority ambiguity between Firebase Auth custom claims and the `/staff/{uid}` Firestore document.
* **Decision**:
  1. Firebase Auth Custom Claims (`request.auth.token.role`, `admin`, `permissions`) are the authoritative source of truth for Firestore security rule evaluations.
  2. The `/staff/{uid}` document represents the persistent user profile for UI presentation.
  3. In any conflict between custom claims and document data, custom claims take precedence.
  4. Role updates must be processed via trusted server logic that synchronously updates custom claims and the staff document, followed by token revocation when privileges are reduced.
* **Consequences**: Prevents client-side document tampering from escalating access rights. Full server-side synchronization engine tracked as follow-up task `SEC-002`.


