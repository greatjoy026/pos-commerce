# Risk Register — Nexus POS-Commerce Suite

## 1. Critical & High-Priority Risks

### RISK-001: Firestore Authorization Relies on Document ID Validation (CRITICAL / P0)
* **Severity**: **CRITICAL (P0)**
* **Category**: Security / Authorization
* **Identified in**: `firestore.rules`
* **Description**: The existing Firestore security rules validate document IDs (`isValidId(id)`) but do not verify caller identity, tenant membership, or staff roles (`request.auth == null` is permitted). All collections (`products`, `customers`, `staff`, `orders`, `settings`) allow public read and write operations.
* **Impact**: Unauthenticated users or external clients can query all customer PII, read staff records, alter pricing, write fake orders, or wipe product catalogs.
* **Required Follow-up Task**: `SEC-001 — Establish Security Baseline and Firestore Authorization Boundary`.

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
* **Description**: `dbService.ts` defines `shift_reports` as a Firestore collection, but `firestore.rules` does not declare a rule for `/shift_reports/{shiftId}`. Consequently, writes fall into the default catch-all rule (`match /{document=**} { allow read, write: if false; }`) and are rejected.
* **Impact**: Cashier shift reports and Z-summary records will fail to persist remotely in Firestore.
* **Required Follow-up Task**: Address under `SEC-001`.

---

### RISK-007: Plaintext Staff PIN Storage (HIGH)
* **Severity**: **HIGH**
* **Category**: Credential Security
* **Identified in**: `src/types.ts` (`StaffMember.pin`), `src/data/mockData.ts`
* **Description**: Staff PIN codes are stored as plain 4-digit strings inside the `staff` collection documents.
* **Impact**: Any user or client with read access to the `staff` collection can inspect supervisor and cashier PINs.
* **Required Follow-up Task**: Address under `SEC-001` (hash PINs or verify server-side).

---

### RISK-008: App.tsx Monolithic State Controller (MEDIUM)
* **Severity**: **MEDIUM**
* **Category**: Performance & Maintainability
* **Identified in**: `src/App.tsx` (944 lines)
* **Description**: All core collections, modals, navigation sub-tabs, and cross-channel order handlers are coordinated in a single component.
* **Impact**: High risk of unintended re-render cascades, dependency reference loops, and merge conflicts.
* **Required Follow-up Task**: Modularize state into domain contexts or custom hooks during P1/P2 milestones.
