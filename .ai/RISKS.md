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
* **Category**: Inventory Accounting / Financial Integrity
* **Identified in**: `src/App.tsx` (`handleProcessOrder`, `handleQuickReorder`), `src/services/dbService.ts`
* **Status**: `PARTIALLY MITIGATED (INV-001-F1 / INV-001-F1.1) — MOVEMENT LEDGERING NOT RESOLVED`
* **Mitigation Progress**:
  1. **Quantity Precision Model**: Ratified Option A (discrete non-negative integer inventory units). Fractional quantities, `NaN`, and `Infinity` are rejected at the TypeScript domain boundary and Firestore security rules boundary.
  2. **UOM Relationship**: Fractional physical reality is modeled through packaging conversions with discrete base units and integer multipliers (`PackagingUOMBuilder`). Any continuous measure (e.g. weighables) must use fixed-point scaling or explicit future migration.
  3. **SERIAL Invariant**: Invariant `quantityOnHand == serialNumbers.length` strictly enforced with non-empty strings, zero duplicates, and zero-stock empty array semantics.
  4. **BATCH Identity**: Mandatory non-empty `batchNumber`, ISO 8601 `expiryDate`, and multi-batch coexistence verified.
  5. **Logical Identity**: Canonical composite keys (`SKU::LOCATION` for standard/serial, `SKU::LOCATION::BATCH` for batch) derived deterministically.
* **Remaining Unresolved Architectural Gaps**:
  * **Movement Integrity Not Resolved**: Stock deduction during POS checkout and e-commerce checkout still mutates ad-hoc balance values in memory and Firestore documents without immutable `StockMovementRecord` double-entry ledger transactions.
  * **Persistence Uniqueness Limitations**: Firestore client-side SDK lacks collection-wide composite unique constraints on `(sku, locationId, batchNumber)`. Enforcing single active balance documents per logical identity requires transactional document ID standardization (`inv_${key}`) or server-side Cloud Function mediation.
  * **Future Movement Architecture**: Deferred to future task (`INV-002: Ledger Movements & Transactional Allocation`), where reservations, stock intake, shrinkage adjustments, and POS fulfillment will be driven by append-only ledger events with optimistic concurrency.
* **Impact**: Inventory state models are now formally validated and protected against invalid data entry or corrupt serial/batch states, but inventory movement integrity and concurrency protection remain open.
* **Required Follow-up Task**: `INV-002 — Ledger Movements & Transactional Allocation`.

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
* **Status**: `PARTIALLY MITIGATED` — Unit tests (`tests/authorization.test.ts`) and emulator integration tests (`tests/emulator-rules.test.ts`) covering authorization, threat payloads, and role boundaries are operational. Domain regression suite remains open.
* **Description**: Test coverage established for authorization rules and schemas. Automated UI/domain regression tests for POS and inventory logic remain to be completed.
* **Impact**: Regression risks during complex domain refactoring or rule deployments.
* **Required Follow-up Task**: `QA-001 — Product/POS Regression Suite`.

---

## 2. Additional Observed Technical Risks

### RISK-006: Unmapped `shift_reports` Collection in Security Rules (HIGH)
* **Severity**: **HIGH**
* **Category**: Data Persistence & Availability
* **Identified in**: `src/services/dbService.ts` (`COLLECTIONS.SHIFT_REPORTS`) vs. `firestore.rules`
* **Status**: `RESOLVED (SEC-001)` — Added `/shift_reports/{shiftId}` to `firestore.rules` and `firebase-blueprint.json` with permissions allowing sales and manager staff to record and inspect shift reconciliations, with permanent immutability (`allow delete: if false`). Added `subscribeShiftReports` and `saveShiftReportToDB` in `dbService.ts`.
* **Description**: Formerly unmapped in rules. Now fully mapped and enforced.
* **Impact**: Resolved. Cashier shift reports and Z-summary records persist securely to Firestore.
* **Required Follow-up Task**: Completed under `SEC-001`.

---

### RISK-007: Plaintext Staff PIN Storage (HIGH)
* **Severity**: **HIGH**
* **Category**: Credential Security
* **Identified in**: `src/types.ts` (`StaffMember.pin`), `src/data/mockData.ts`
* **Status**: `PARTIALLY MITIGATED (NOT RESOLVED)` — Access to `/staff` is restricted to authenticated staff, and the `/staff_credentials` vault has been hardened to deny all client SDK reads and writes (`allow read, write: if false;`). However, plaintext PINs remain in the data layer until cryptographic hashing (Argon2id/bcrypt) and server-side authentication are implemented. Do NOT claim RISK-007 is resolved merely because the credential collection exists.
* **Description**: Staff PIN codes were previously exposed via open client reads. Access is now gated strictly behind authenticated staff sessions, and the `/staff_credentials` vault is isolated. Plaintext PINs must still be replaced with one-way cryptographic hashes.
* **Impact**: Surface-level boundary mitigation achieved; complete credential hardening remains an open task.
* **Required Follow-up Task**: `SEC-002 — Credential Cryptographic Hashing & Server Authentication`.

---

### RISK-008: App.tsx Monolithic State Controller (MEDIUM)
* **Severity**: **MEDIUM**
* **Category**: Performance & Maintainability
* **Identified in**: `src/App.tsx` (944 lines)
* **Status**: `OPEN / UNRESOLVED`
* **Description**: All core collections, modals, navigation sub-tabs, and cross-channel order handlers are coordinated in a single component.
* **Impact**: High risk of unintended re-render cascades, dependency reference loops, and merge conflicts.
* **Required Follow-up Task**: Modularize state into domain contexts or custom hooks during P1/P2 milestones.

---

### RISK-009: Client-Side Dual-Write Public Product Projection Integrity (HIGH)
* **Severity**: **HIGH**
* **Category**: Data Integrity / Trust Boundary
* **Identified in**: `src/services/dbService.ts` (`saveProductToDB`, `updateProductInDB`)
* **Status**: `OPEN / DOCUMENTED LIMITATION`
* **Description**: The public catalog projection (`/public_products`) is currently synchronized via client-side dual-write by the browser when inventory staff save products. While Firestore rules protect both collections from unauthorized actors, the browser remains the intermediary for projection truth.
* **Impact**: Network dropouts during dual-write or modified clients could cause drift between internal products and the public projection.
* **Required Follow-up Task**: `SEC-005 — Server-Authoritative Catalog Projection Pipeline`.

---

### RISK-010: Client-Authored Audit Log Limitations (MEDIUM)
* **Severity**: **MEDIUM**
* **Category**: Compliance / Audit Integrity
* **Identified in**: `src/services/dbService.ts` (`logAuditEvent`)
* **Status**: `OPEN / DOCUMENTED LIMITATION`
* **Description**: Audit log records (`/audit_logs`) are created by client-side browser logic. While security rules enforce that the writer must be authenticated enterprise staff and that existing logs are immutable (`allow update, delete: if false`), metadata such as `staffName`, `action`, and timestamps are client-supplied and cannot be treated as authoritative legal evidence.
* **Impact**: Rogue authenticated staff could falsify action descriptions or timestamps in audit entries.
* **Required Follow-up Task**: `SEC-003 — Trusted Server-Side Audit Pipeline`.

---

### RISK-011: Untrusted Client E-Commerce Calculations (HIGH)
* **Severity**: **HIGH**
* **Category**: Financial Integrity / Checkout Fraud
* **Identified in**: `src/components/ECommerceStorefront.tsx`, `firestore.rules`
* **Status**: `OPEN / DOCUMENTED LIMITATION`
* **Description**: E-commerce orders placed by public visitors are restricted to `status: 'Pending'` and `paymentStatus in ['Pending', 'Unpaid']`, preventing client-side order completion bypass. However, item prices, subtotal, discounts, tax, and order totals are computed client-side.
* **Impact**: Malicious visitors could construct order payloads with modified item prices or artificially low totals. Staff must manually verify payment amounts against gateway receipts before processing.
* **Required Follow-up Task**: `SEC-004 — Server-Authoritative Checkout & Payment Gateway Verification`.
