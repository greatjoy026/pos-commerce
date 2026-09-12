# Risk Register — Nexus POS-Commerce Suite

## 1. Critical & High-Priority Risks

### RISK-001: Firestore Authorization Relies on Document ID Validation (CRITICAL / P0)
* **Severity**: **CRITICAL (P0)**
* **Category**: Security / Authorization
* **Identified in**: `firestore.rules`
* **Status**: `PARTIALLY MITIGATED — PENDING SUPERVISOR REVIEW (SEC-001)` — Replaced insecure `isValidId` write permissions with authenticated role-based access control, dual-collection projections for public safety (`/public_products`, `/public_settings`), credential vault segregation (`/staff_credentials`), guest customer constraints, and immutability rules. Verified via automated authorization test suites (`tests/authorization.test.ts` and `tests/emulator-rules.test.ts`).
* **Description**: The existing Firestore security rules formerly validated only document IDs (`isValidId(id)`). This has now been replaced with real server-enforced security rules requiring authenticated roles for operational writes, public e-commerce safety, and immutable audit logs.
* **Impact**: Surface vulnerability mitigated in emulator test suite. Production deployment is intentionally held pending supervisor review.
* **Required Follow-up Task**: `SEC-001 — Establish Security Baseline and Firestore Authorization Boundary` (Implementation complete, pending supervisor review).

---

### RISK-002: Product Model Duplication & Schema Bloat (HIGH / P1)
* **Severity**: **HIGH (P1)**
* **Category**: Data Integrity / Maintainability
* **Identified in**: `src/types.ts` (`Product`, `ProductPackagingConfig`, `PackagingUnitsConfig`, `BulkPackagingConfig`)
* **Status**: `MITIGATED (PROD-001 / PROD-001-F1 / PROD-001-F2 / PROD-001-F2.1)` — Canonical product domain architecture established in `/src/domain/product/`. Legacy `Product` objects are deterministically normalized into `CanonicalProduct` aggregates with strict isolation of inventory state (`stock`, `cost`, `location`, `reorderPoint`, `serialNumbers`, `batchNumber`). Packaging multipliers and selling prices validated with strict finite number checks (`Number.isFinite`). Public catalog projections strictly strip raw stock quantities, replacing them with derived categorical `availability: { status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' }` backed by mandatory Firestore rules enforcement on public products and variants. Thresholds normalized with safe defaults. Legacy UI compatibility is safely isolated inside transitional adapters (`toLegacyProduct`, `normalizeToLegacyProduct`, `toPOSProductView`) until `INV-001`. Verified with 33 automated domain tests (115 total unit tests).
* **Description**: Multiple parallel representations of packaging, variants, and inventory tracking formerly existed across different versions of the product interface. Different components accessed different fields (e.g. `packaging.unitsPerPackage` vs `packagingUnits[].multiplier`).
* **Impact**: Resolved via `CanonicalProduct` entity, strict `normalizeProduct` engine, authoritative `resolveProductSku` resolver, and isolated transitional adapter layer.
* **Required Follow-up Task**: `INV-001 — SKU and Inventory Architecture` (to decouple inventory balance ledger and replace transitional operational state).

---

### RISK-003: Inventory Domain Fragmentation & Movement Ledgering (HIGH / P1)
* **Severity**: **HIGH (P1)**
* **Category**: Inventory Integrity / Concurrency
* **Identified in**: `src/App.tsx`, `src/services/dbService.ts`, `src/domain/inventory/movements.ts`, `functions/src/inventoryMovements.ts`
* **Status**: `INV-002 IMPLEMENTED; TRUSTED BOUNDARY HARDENING IN PROGRESS (INV-002-F1)`
* **Mitigation Progress**:
  1. **Quantity Precision Model**: Ratified Option A (discrete non-negative integer inventory units). Fractional quantities, `NaN`, and `Infinity` are rejected at the TypeScript domain boundary and Firestore security rules boundary.
  2. **UOM Relationship**: Physical packaging conversions preserve discrete base units and integer multipliers.
  3. **SERIAL Invariant**: `quantityOnHand == serialNumbers.length`, uniqueness, non-empty serials, and zero-stock semantics are enforced.
  4. **BATCH Identity**: Mandatory batch identity and semantic ISO expiry validation are established in the domain.
  5. **Movement Semantics**: INV-002 implements purchase receipts, sales, returns, adjustments, and atomic transfers with deterministic operation IDs and Firestore transactions.
  6. **Trusted Mutation Boundary**: INV-002-F1 routes browser movement requests through Firebase callable functions and denies client creation/update/delete of movement records and direct client inventory balance mutation.
* **Remaining Gaps**:
  * Trusted function deployment and production verification are still pending; no production deployment is authorized by this task.
  * Opening-balance lifecycle is intentionally deferred; client-created inventory records must start at zero.
  * Serial-item lifecycle and reservation lifecycle remain future domain work.
* **Impact**: The primary direct-client integrity bypass identified during INV-002 review is being closed. CI/emulator verification is required before approval.
* **Required Follow-up Task**: Complete `INV-002-F1`, then re-review and merge `INV-002`.

---

### RISK-004: Duplicated POS and E-Commerce Checkout Logic (MEDIUM / HIGH)
* **Severity**: **MEDIUM / HIGH**
* **Category**: Architectural Consistency
* **Identified in**: `src/App.tsx` (`handleProcessOrder` vs `handlePlaceEcomOrder`)
* **Status**: `OPEN / UNRESOLVED` — Pending `POS-001` & `ECOM-001`.
* **Description**: Both handlers duplicate packaging multiplier calculations, variant deductions, and loyalty point allocations with subtle differences in error handling and audit logging.
* **Impact**: Behavioral divergence between in-store sales and online purchases over time.
* **Required Follow-up Task**: `POS-001` & `ECOM-001`.

---

### RISK-005: Missing Automated Regression & Test Coverage (MEDIUM)
* **Severity**: **MEDIUM**
* **Category**: Quality Assurance
* **Identified in**: `package.json`
* **Status**: `PARTIALLY MITIGATED` — Unit tests and emulator integration tests cover authorization, threat payloads, role boundaries, and inventory mutation boundaries. Automated UI/domain regression tests for POS and storefront remain open.
* **Description**: Test coverage established for authorization rules and schemas. Automated UI/domain regression tests for POS and inventory logic remain to be completed.
* **Impact**: Regression risks during complex domain refactoring or rule deployments.
* **Required Follow-up Task**: `QA-001 — Product/POS Regression Suite`.

---

## 2. Additional Observed Technical Risks

### RISK-006: Unmapped `shift_reports` Collection in Security Rules (HIGH)
* **Severity**: **HIGH**
* **Category**: Data Persistence & Availability
* **Status**: `RESOLVED (SEC-001)` — Added `/shift_reports/{shiftId}` to `firestore.rules` with protected permissions and permanent delete immutability.

### RISK-007: Plaintext Staff PIN Storage (HIGH)
* **Severity**: **HIGH**
* **Category**: Credential Security
* **Status**: `PARTIALLY MITIGATED (NOT RESOLVED)` — `/staff_credentials` is client-inaccessible, but plaintext PINs remain in the data layer until cryptographic hashing and server-side authentication are implemented.
* **Required Follow-up Task**: `SEC-002 — Credential Cryptographic Hashing & Server Authentication`.

### RISK-008: App.tsx Monolithic State Controller (MEDIUM)
* **Severity**: **MEDIUM**
* **Category**: Performance & Maintainability
* **Status**: `OPEN / UNRESOLVED`
* **Required Follow-up Task**: Modularize state into domain contexts or custom hooks during P1/P2 milestones.

### RISK-009: Client-Side Dual-Write Public Product Projection Integrity (HIGH)
* **Severity**: **HIGH**
* **Category**: Data Integrity / Trust Boundary
* **Status**: `OPEN / DOCUMENTED LIMITATION`
* **Required Follow-up Task**: `SEC-005 — Server-Authoritative Catalog Projection Pipeline`.

### RISK-010: Client-Authored Audit Log Limitations (MEDIUM)
* **Severity**: **MEDIUM**
* **Category**: Compliance / Audit Integrity
* **Status**: `OPEN / DOCUMENTED LIMITATION`
* **Required Follow-up Task**: `SEC-003 — Trusted Server-Side Audit Pipeline`.

### RISK-011: Untrusted Client E-Commerce Calculations (HIGH)
* **Severity**: **HIGH**
* **Category**: Financial Integrity / Checkout Fraud
* **Status**: `OPEN / DOCUMENTED LIMITATION`
* **Required Follow-up Task**: `SEC-004 — Server-Authoritative Checkout & Payment Gateway Verification`.
