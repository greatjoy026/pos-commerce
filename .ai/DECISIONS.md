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

---

### ADR-013: Canonical Product Domain Model & Adapter Architecture

* **Status**: `IMPLEMENTED (PROD-001)`
* **Context**: The `Product` interface in `src/types.ts` mixed identity, catalog merchandising, classification, lifecycle, variants, multiple competing packaging representations, and operational inventory state (costs, suppliers, locations, reorder points, serials, batches). POS and E-Commerce consumers accessed this bloated structure directly, and public catalog projections required ad-hoc field stripping.
* **Decision**:
  1. Establish a canonical domain model in `src/domain/product/`:
     - `CanonicalProduct` aggregates merchandising, classification, lifecycle, variants, and operational state.
     - `CanonicalVariant` represents physical/marketable options with explicit attributes and pricing.
     - `ProductSku` represents the authoritative sellable unit.
  2. Implement an Authoritative SKU Resolution Engine (`resolveProductSku`) capable of resolving base SKUs, base barcodes, variant SKUs, variant barcodes, and packaging unit barcodes/SKUs.
  3. Establish a non-destructive bidirectional Normalization Layer (`normalizeProduct`) that wraps legacy and Firestore documents into the canonical structure while preserving full backward compatibility for existing consumers (`p.name`, `p.price`, `p.stock`, `p.variants`).
  4. Single-SKU products without variants are automatically normalized into a default canonical variant, guaranteeing that every product aggregate has at least one sellable variant.
  5. Centralize public catalog projection (`toPublicCatalogProjection`) to strictly enforce the SEC-001/SEC-005 security boundary (stripping wholesale costs, supplier info, internal serials, and reorder levels).
  6. Operational inventory ledger decoupling is cleanly isolated for `INV-001`.
* **Consequences**: Both POS and E-Commerce consume the same authoritative catalog model. Zero logic duplication for SKU/barcode resolution. Backwards compatibility preserved without breaking running components or existing Firestore schemas.

---

### ADR-014: Strict Product Catalog Domain Boundary, Anti-Silent Fallbacks, and Inventory Isolation (PROD-001-F1)

* **Status**: `IMPLEMENTED (PROD-001-F1)`
* **Context**: Technical supervisor review of `PROD-001` identified architectural contamination where operational inventory state (stock counts, wholesale costs, reorder thresholds, physical warehouse locations, serial numbers, and batch lot numbers) remained embedded in product representations. Additionally, legacy normalization layers silently fabricated placeholder SKUs, names, or zero-values when given defective input, masking critical data corruption.
* **Decision**:
  1. **Strict Product Domain Isolation**: `CanonicalProduct` contains exclusively product/catalog identity, merchandising, classification, lifecycle, variants, and packaging unit conversions. All operational inventory concerns (`stock`, `cost`, `location`, `reorderPoint`, `serialNumbers`, `batchNumber`) are strictly banned from `CanonicalProduct`.
  2. **Anti-Silent Fallback Invariant**: Normalization pipelines (`normalizeProduct`, `tryNormalizeProduct`) strictly reject missing base SKUs, missing names, duplicate variant SKUs within a product aggregate, negative prices, and non-positive packaging multipliers with explicit `ProductNormalizationError` / `ProductValidationError[]`. They must never fabricate silent defaults like `SKU-FALLBACK` or random IDs for missing identity data.
  3. **Transitional Compatibility Adapters**:
     - `toLegacyProduct(canonical, operationalState)` and `normalizeToLegacyProduct(raw)` bridge `CanonicalProduct` with transitional `ProductOperationalState` for existing UI views (`Product & { canonical: CanonicalProduct }`), preventing runtime contract breakage while keeping the domain core pristine.
     - `toPOSProductView(canonical, operationalState)` in `/src/domain/catalog/projections.ts` provides clean, typed consumption for POS terminals.
  4. **Strict Scope Boundary with INV-001**: Physical inventory ledgers, multi-location stock allocations, lot tracking, and stock movement records are strictly reserved for `INV-001`.
* **Consequences**:
  - The catalog aggregate is unpolluted by mutable operational state.
  - Data corruption and untyped inputs are caught early at the boundary with structured error feedback.
  - Existing UI components continue running seamlessly via transitional adapters.

---

### ADR-015: Final Product Domain Boundary Hardening & Public Availability Projection (PROD-001-F2)

* **Status**: `IMPLEMENTED (PROD-001-F2)`
* **Context**: Technical supervisor review of `PROD-001-F1` identified that exact stock quantities (`product.stock`, `variant.stock`) were still exposed in `/public_products` projections and permitted by `firestore.rules`. Additionally, packaging unit multipliers and prices lacked strict normalization validation, `category` allowed silent fallback, business defaults for `rating` and `status` required explicit specification, and SKU/barcode uniqueness checks needed cross-type coverage.
* **Decision**:
  1. **Strict Public Availability Status**: The public projection (`/public_products`) strictly strips all exact operational stock numbers (`stock`). Public availability is exposed exclusively via derived categorical state: `availability: { status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' }` computed at the projection boundary.
  2. **Firestore Security Rules Hardening**: `isValidPublicProduct` in `firestore.rules` removes `stock is number` and strictly validates `availability.status in ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']`, rejecting any public product document containing numeric `stock` fields.
  3. **Strict Packaging Unit Validation**: Normalization strictly enforces that `multiplier` is a finite number greater than 0, and `sellingPrice` is a finite non-negative number (`>= 0`). Silent fallbacks to 1 or 0 are completely prohibited.
  4. **Strict Mandatory Category**: Missing or whitespace-only `category` is strictly rejected with a structured `ProductValidationError` instead of inventing `'Uncategorized'`.
  5. **Standardized Business Defaults**: When omitted, `merchandising.rating` defaults to 0 (unrated) and `lifecycle.status` defaults to `'Draft'` (safest lifecycle state).
  6. **Cross-Type SKU & Barcode Uniqueness**: `validateSkuUniqueness` and `validateBarcodeUniqueness` detect collisions across all sellable unit types: base products, variants, and packaging units.
* **Consequences**:
  - Exact inventory counts are no longer leaked to public web storefront consumers or scrapers.
  - Defective packaging multiplier and pricing data cannot corrupt pricing calculations.
  - The domain boundary is hardened and completely ready for `INV-001`.

---

### ADR-016: Strict Finite Number Validation, Mandatory Public Availability Schema, and Threshold Hardening (PROD-001-F2.1)

* **Status**: `IMPLEMENTED (PROD-001-F2.1)`
* **Context**: Technical supervisor review of `PROD-001-F2` identified edge-case vulnerabilities in packaging unit numeric validation (Infinity passed `typeof === 'number' && !isNaN && > 0`), non-deterministic availability threshold handling for invalid or non-finite inputs, and an optional availability loophole in `firestore.rules` schema validators.
* **Decision**:
  1. **Strict Finite Numeric Packaging Validation**: In `src/domain/product/normalization.ts`, validate packaging `multiplier` and `sellingPrice` strictly with `Number.isFinite(value)`.
     - `multiplier` must be finite and `> 0` (rejects 0, -1, NaN, Infinity, -Infinity; accepts 0.1, 1, 6, 24).
     - `sellingPrice` when present must be finite and `>= 0` (rejects -1, NaN, Infinity, -Infinity; accepts 0, 1, 10.50).
     - Non-finite or invalid numbers push structured `ProductValidationError` items; no silent conversion or fallback.
  2. **Mandatory Availability Contract in Firestore Rules**: In `firestore.rules`, enforce that `data.availability is map` and `data.availability.status in ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']` on all `/public_products/{id}` documents and nested variants. Availability is mandatory, never optional. Operational `stock` and sensitive pricing fields (`cost`, `costPrice`) are strictly rejected.
  3. **Deterministic Public Availability Thresholds**: In `src/domain/product/projections.ts`, normalize `lowStockThreshold` using `DEFAULT_LOW_STOCK_THRESHOLD = 5`. Any invalid or non-finite threshold (NaN, Infinity, negative, zero) deterministically falls back to 5. Operational stock <= 0 or non-finite strictly resolves to `OUT_OF_STOCK`.
  4. **Isolated Scope**: No inventory services, physical ledger migrations, or unrelated refactorings are introduced prior to `INV-001`.
* **Consequences**:
  - Packaging calculation vulnerabilities caused by non-finite or negative numbers are eradicated.
  - Public catalog storefront projections are guaranteed to follow a uniform, mandatory availability schema.
  - All regression tests (115/115) pass cleanly with zero lint or build errors.

---

### ADR-017: Authoritative Inventory Quantity & Tracking Contract Finalization (INV-001-F1.1)

* **Status**: `IMPLEMENTED (INV-001-F1.1)`
* **Context**: Technical supervisor review of `INV-001-F1` identified two architectural questions requiring final contract hardening:
  1. Alignment between TypeScript domain quantity semantics and Firestore quantity semantics (Option A: Integer vs Option B: Fractional).
  2. Explicit specification and validation of `SERIAL` and `BATCH` tracking mode invariants and logical identity rules.
* **Decision**:
  1. **Authoritative Quantity Contract (Option A: Discrete Integer Inventory)**:
     - Following deep architectural inspection of the repository, the existing system is architected around discrete countable units with packaging conversions (`PackagingUOMBuilder`, multipliers).
     - Both TypeScript domain layer (`src/domain/inventory/validation.ts`) and Firestore security rules (`firestore.rules`) enforce non-negative integers (`Number.isInteger(qty) && qty >= 0` and `data.quantityOnHand is int && data.quantityOnHand >= 0`).
     - Fractional quantities (e.g. 1.5), NaN, and Infinity are strictly rejected at all system boundaries.
     - Quantity inputs in the UI (`StepInventory.tsx`, `Step3Inventory.tsx`, `PackagingUOMBuilder.tsx`, `Step2Variants.tsx`) enforce `step="1"` and `parseInt(..., 10)`.
     - Future fractional UOM capabilities (e.g., weighable goods) must be introduced as an explicit architectural phase through fixed-point integer scaling (e.g., milligram/gram base units) or a deliberate fractional migration.
  2. **Invariants Governing SERIAL Inventory**:
     - `trackingMode === 'SERIAL'` requires:
       * `quantityOnHand == serialNumbers.length` (exact match).
       * Every serial number must be a non-empty string.
       * No duplicate serial numbers in the array.
       * Zero inventory (`quantityOnHand == 0`) requires an empty array (`serialNumbers: []`).
       * Batch fields (`batchNumber`, `expiryDate`) are strictly forbidden.
     - **Firestore Rules vs Domain Boundary**:
       * Firestore Rules enforces cardinality equality (`serialNumbers.size() == quantityOnHand`), array-wide uniqueness (`serialNumbers.toSet().size() == serialNumbers.size()`), array-wide non-empty items (`!serialNumbers.hasAny([''])`), and head/tail string size bounds.
       * Due to CEL lacking unbounded loops, deep per-element string sanitization and custom formatting are authoritatively enforced in `src/domain/inventory/validation.ts`.
  3. **Invariants Governing BATCH Inventory**:
     - `trackingMode === 'BATCH'` requires:
       * `batchNumber` is mandatory and must be a non-empty string.
       * `expiryDate` when provided must be a valid ISO 8601 string.
       * `serialNumbers` is strictly forbidden.
       * Multiple batches for the same SKU and location are first-class citizens and coexist concurrently.
     - **Firestore Rules vs Domain Boundary**:
       * Firestore Rules enforces structural length bounds (`10 <= size <= 40`) due to CEL lacking regex or arbitrary date parsing. Full semantic ISO 8601 validation is authoritatively enforced in `src/domain/inventory/validation.ts`.
  4. **Schema Blueprint & Public Storefront Alignment**:
     - `firebase-blueprint.json` `publicProduct` schema is updated to remove exact `stock` and mandate categorical `availability: { status }` in alignment with `PROD-001-F2.1` and `firestore.rules`.
  5. **Logical Identity Rule for Inventory Records**:
     - Canonical key generation is formalized in `getInventoryRecordKey()`:
       * For `QUANTITY` and `NONE`: `SKU::LOCATION` (e.g., `SKU-100::loc-warehouse`).
       * For `BATCH`: `SKU::LOCATION::BATCH` (e.g., `SKU-100::loc-warehouse::LOT-2026-A`).
       * Distinct locations (e.g., `SKU-A::LOCATION-1` vs `SKU-A::LOCATION-2`) and distinct batches (e.g., `SKU-A::LOC-1::BATCH-1` vs `SKU-A::LOC-1::BATCH-2`) never collide.
* **Consequences**:
  - The domain contract is 100% consistent across TypeScript validation, Firestore rules, schema blueprint, UI input controls, and test suites.
  - Zero tolerance for corrupted serial or batch inventory states.
  - Ready for subsequent inventory movement and ledgering phases without architectural debt.

---

### ADR-018: Authoritative Inventory Movements & Immutable Transaction Ledger (INV-002)

* **Status**: `IMPLEMENTED (INV-002)`
* **Context**: `INV-001` established `InventoryRecord` as the authoritative current stock state, but did not define the immutable ledger mechanism recording *why* stock changed over time (purchases, sales, returns, adjustments, transfers).
* **Decision**:
  1. **Authoritative Ledger Architecture**:
     - `InventoryRecord` holds current state (`quantityOnHand`, `quantityReserved`).
     - `InventoryMovementRecord` (`inventory_movements` collection) is the immutable, append-only ledger record explaining balance changes.
     - Legacy `Product.stock` is strictly a read-only compatibility projection.
  2. **Movement Types & Semantics**:
     - `PURCHASE_RECEIPT`: Increases `quantityOnHand` (`quantityDelta > 0`).
     - `SALE`: Decreases `quantityOnHand` (`quantityDelta < 0`). Rejects request if sale exceeds available quantity (`quantityOnHand - quantityReserved`).
     - `RETURN`: Increases `quantityOnHand` (`quantityDelta > 0`).
     - `ADJUSTMENT`: Supports both positive and negative `quantityDelta` (`!= 0`). Strictly requires a non-empty `reason`.
     - `TRANSFER`: Two linked movements (`quantityDelta < 0` at source location, `quantityDelta > 0` at destination location) with shared `referenceId`.
  3. **Atomic Firestore Transactions**:
     - All movements execute inside `runTransaction` (`src/services/inventoryService.ts`) enforcing `Read Inventory -> Validate -> Calculate Outcome -> Write Inventory -> Write Movement`.
  4. **Strict Security Rules & Immutability**:
     - `firestore.rules` enforces `allow create: if isStaff() && isValidInventoryMovement(request.resource.data);`.
     - `allow update, delete: if false;` enforces strict append-only ledger immutability.
     - Enforces invariant math rule: `quantityAfter == quantityBefore + quantityDelta`.
* **Consequences**:
  - Inventory balance changes are 100% accountable and audit-trailed.
  - Race conditions during concurrent sales or receipts are prevented by atomic database transactions.
  - Ledger items can never be tampered with, edited, or deleted once recorded.






