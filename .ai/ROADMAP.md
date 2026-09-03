# Engineering Technical Roadmap — Nexus POS-Commerce Suite

## Phase Overview

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6
Governance   Security    Domain     POS & E-Com     UX         QA        Docs
 (ARCH-001)  (SEC-001) (PROD/INV)   (POS/ECOM)  (UX-001)   (QA-001)   (DOC-001)
```

---

### Phase 0 — Governance & Baseline (Current)
* **Objective**: Establish engineering governance, baseline architecture documentation, coding standards, risk registers, and task tracking.
* **Tasks**:
  * [x] `ARCH-001`: Establish Project Governance & Architecture Baseline.
* **Milestone Exit Gate**: Supervisor approval of `.ai/` governance layer.

---

### Phase 1 — Security & Authorization Boundary
* **Objective**: Address critical security vulnerabilities in data persistence, enforce real authentication, and implement tenant/role-scoped Firestore security rules.
* **Tasks**:
  * [ ] `SEC-001`: Establish Security Baseline and Firestore Authorization Boundary.
    * Migrate `firestore.rules` away from insecure `isValidId` patterns.
    * Implement authenticated read/write controls for staff, customers, orders, and products.
    * Map missing `/shift_reports/{shiftId}` rules.
    * Protect staff PIN credentials and customer PII.
* **Milestone Exit Gate**: Fully authenticated and verified Firestore security rules passing security audit.

---

### Phase 2 — Domain Normalization & Inventory Foundation
* **Objective**: Cleanly model products, variants, SKUs, and authoritative inventory accounting.
* **Tasks**:
  * [ ] `PROD-001`: Product Domain Normalization.
    * Rationalize `src/types.ts` product models with backwards-compatible adapters.
    * Cleanly decouple structural product types from inventory tracking capabilities.
  * [ ] `INV-001`: SKU and Inventory Architecture.
    * Create dedicated inventory domain service.
    * Move from raw integer stock mutation to ledger-based `StockMovementRecord` events.
    * Establish authoritative base-unit conversions for bulk packaging.
* **Milestone Exit Gate**: Unified product catalog contract with multi-UOM inventory integrity.

---

### Phase 3 — POS & E-Commerce Cross-Channel Integration
* **Objective**: Eliminate code duplication between in-store POS register and online storefront checkout.
* **Tasks**:
  * [ ] `POS-001`: POS Inventory Resolution Layer.
    * Connect POS register to the authoritative inventory resolution service.
    * Optimize barcode lookup and offline buffer synchronization.
  * [ ] `ECOM-001`: Shared Catalog Contract.
    * Refactor e-commerce storefront checkout to consume shared order and inventory services.
* **Milestone Exit Gate**: Both POS and storefront executing identical stock deductions and loyalty accruals.

---

### Phase 4 — User Experience & Workflow Streamlining
* **Objective**: Enhance operational workflows for store cashiers and catalog managers.
* **Tasks**:
  * [ ] `UX-001`: Product Creation Workflow Review.
    * Consolidate duplicate step components in `src/components/product-form/`.
    * Streamline the 8-step wizard with visual feedback and validation.
* **Milestone Exit Gate**: Verified, accessible, and error-resilient product authoring workflow.

---

### Phase 5 — Automated Quality Assurance & Regression Testing
* **Objective**: Protect business logic against regressions through automated testing.
* **Tasks**:
  * [ ] `QA-001`: Product/POS Regression Suite.
    * Configure Vitest / React Testing Library.
    * Implement unit tests for tax calculations, multi-currency conversions, and stock multipliers.
    * Implement integration tests for concurrent checkout and stock deductions.
* **Milestone Exit Gate**: Automated CI test suite passing with high coverage on critical financial and inventory paths.

---

### Phase 6 — Architecture Decision Records & Long-Term Documentation
* **Objective**: Formalize architectural evolutions and enterprise multi-store capabilities.
* **Tasks**:
  * [ ] `DOC-001`: Architecture Decision Records & System Handbooks.
* **Milestone Exit Gate**: Complete architectural documentation aligned with multi-branch enterprise scale.
