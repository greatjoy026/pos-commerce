# Risk Register — Nexus POS-Commerce Suite

## 1. Critical & High-Priority Risks

### RISK-001: Firestore Authorization Relies on Document ID Validation (CRITICAL / P0)
* **Severity**: **CRITICAL (P0)**
* **Category**: Security / Authorization
* **Identified in**: `firestore.rules`
* **Status**: `MITIGATED (SEC-001)` — Replaced insecure `isValidId` write permissions with authenticated role-based access control, schema validation, and immutability rules. Verified via automated authorization test suite (`tests/authorization.test.ts`).
* **Description**: The existing Firestore security rules formerly validated only document IDs (`isValidId(id)`). This has now been replaced with real server-enforced security rules requiring authenticated roles for operational writes, public e-commerce safety, and immutable audit logs.
* **Impact**: Mitigated. Public users can no longer scrape customer PII, read staff records, alter prices, or delete catalog documents.
* **Required Follow-up Task**: `SEC-001 — Establish Security Baseline and Firestore Authorization Boundary` (Complete).

---

### RISK-002: Product Model Duplication & Schema Bloat (HIGH / P1)
* **Severity**: **HIGH (P1)**
* **Category**: Data Integrity / Maintainability
* **Identified in**: `src/types.ts` (`Product`, `ProductPackagingConfig`, `PackagingUnitsConfig`, `BulkPackagingConfig`)
* **Description**: Multiple parallel representations of packaging, variants, and inventory tracking exist across different versions of the product interface. Different components access different fields (e.g. `packaging.unitsPerPackage` vs `packagingUnits[].multiplier`).
* **Impact**: Inconsistent updates, subtle inventory calculation discrepancies, and maintenance friction as new product types are introduced.
* **Required Follow-up Task**: `PROD-001 — Product Domain Normalization`.

---

### RISK-003: Inventory Domain Fragmentation (HIGH / P1)
* **Severity**: **HIGH (P1)**
* **Category**: Inventory Accounting / Financial Integrity
* **Identified in**: `src/App.tsx` (`handleProcessOrder`, `handleQuickReorder`)
* **Description**: Inventory deduction logic is currently embedded directly in UI state handlers in `App.tsx`. Stock is mutated as a plain integer rather than generated via immutable stock ledger movements. Serial and batch tracking are defined in interfaces but not enforced during POS checkout.
* **Impact**: Inability to perform financial inventory valuation audits (FIFO/LIFO), lack of auditability for shrinkage, and risk of negative stock during concurrent checkouts.
* **Required Follow-up Task**: `INV-001 — SKU and Inventory Architecture`.

---

### RISK-004: Duplicated POS and E-Commerce Checkout Logic (MEDIUM / HIGH)
* **Severity**: **MEDIUM / HIGH**
* **Category**: Architectural Consistency
* **Identified in**: `src/App.tsx` (`handleProcessOrder` vs `handlePlaceEcomOrder`)
* **Description**: Both handlers duplicate packaging multiplier calculations, variant deductions, and loyalty point allocations with subtle differences in error handling and audit logging.
* **Impact**: Behavioral divergence between in-store sales and online purchases over time.
* **Required Follow-up Task**: `POS-001` & `ECOM-001`.

---

### RISK-005: Missing Automated Regression & Test Coverage (MEDIUM)
* **Severity**: **MEDIUM**
* **Category**: Quality Assurance
* **Identified in**: `package.json`
* **Description**: No automated unit, integration, or end-to-end test framework (e.g. Vitest, Jest, Playwright) is currently configured in `package.json`. Verification relies on `tsc --noEmit` and manual browser testing.
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
* **Status**: `MITIGATED (SEC-001)` — Public and unauthenticated read access to the `/staff` collection is now strictly blocked by Firestore rules (`allow get, list: if isAuthenticated() && hasAnyStaffRole()`). Unauthenticated clients and customers cannot read staff profiles or inspect PINs.
* **Description**: Staff PIN codes were previously exposed via open client reads. Access is now gated strictly behind authenticated staff sessions.
* **Impact**: Mitigated at the Firestore security boundary. Next phase can introduce Argon2/bcrypt PIN hashing.
* **Required Follow-up Task**: Completed under `SEC-001`.

---

### RISK-008: App.tsx Monolithic State Controller (MEDIUM)
* **Severity**: **MEDIUM**
* **Category**: Performance & Maintainability
* **Identified in**: `src/App.tsx` (944 lines)
* **Description**: All core collections, modals, navigation sub-tabs, and cross-channel order handlers are coordinated in a single component.
* **Impact**: High risk of unintended re-render cascades, dependency reference loops, and merge conflicts.
* **Required Follow-up Task**: Modularize state into domain contexts or custom hooks during P1/P2 milestones.
