# Engineering Task Queue — Nexus POS-Commerce Suite

## 1. Active Tasks

### `INV-001-F1.1 — Inventory Quantity & Tracking Contract Finalization`
* **Priority**: P1 (Architectural Supervisor Review Hardening & Correction)
* **Type**: Domain Architecture / Contract Hardening
* **Owner**: Gemini (Implementation Lead)
* **Status**: `IMPLEMENTATION COMPLETE — AWAITING ARCHITECTURAL REVIEW`
* **Dependencies**: `INV-001-F1`, `PROD-001-F2.1`, `SEC-001`
* **Objective**: Addressed all supervisory contract questions and blocking review items:
  * **Option A Ratification**: Formalized authoritative non-negative discrete integer inventory contract across TypeScript domain, Firestore rules, and UI inputs. Fractional, NaN, and Infinity inputs are rejected at all boundaries.
  * **SERIAL Tracking Hardening**: Validated `quantityOnHand == serialNumbers.length`, array-wide uniqueness (`toSet().size() == size()`), array-wide non-empty strings (`!hasAny([''])`), head/tail string size bounds, zero-stock empty array semantics, and isolation from batch fields.
  * **BATCH Tracking Hardening**: Mandated non-empty `batchNumber`, structural length validation in Firestore rules, semantic ISO 8601 validation in TypeScript domain, and multi-batch coexistence per SKU and location.
  * **Firestore Rules Limitation Documentation**: Explicitly documented CEL limitations regarding unbounded list element loops and ISO date regex in `firestore.rules`, types, and governance artifacts.
  * **Blueprint Alignment**: Updated `firebase-blueprint.json` `publicProduct` schema to replace exact `stock` with categorical `availability` map.
  * **Documentation Alignment**: Updated `src/domain/inventory/types.ts` comments and TSDoc to explicitly reflect the discrete non-negative integer contract.
  * **Test Coverage**: 195/195 total automated tests passing (`npm test`), 0 lint errors, clean build.
* **Limitations Documented**: Collection-level uniqueness constraints in Firestore client SDK and movement ledgering are deferred to `INV-002`.

---

## 2. Completed Tasks

### `INV-001-F1 — Authoritative Inventory Entity & Multi-Location Foundation`
* **Priority**: P1
* **Type**: Domain Architecture / Inventory Foundation
* **Owner**: Gemini (Implementation Lead)
* **Status**: `SUPERSEDED BY INV-001-F1.1`
* **Dependencies**: `PROD-001-F2.1`, `SEC-001`

---

### `PROD-001-F2.1 — Final Validation and Public Contract Correction`
* **Priority**: P1 (Architectural Supervisor Review Correction)
* **Type**: Domain Architecture / Boundary Validation
* **Owner**: Gemini (Implementation Lead)
* **Status**: `APPROVED BY SUPERVISOR`
* **Dependencies**: `PROD-001-F2`, `SEC-001`
* **Objective**: Addressed all findings from the architectural supervisor review of PROD-001-F2:
  * Packaging number finite validation, availability normalization, mandatory public availability rules forbidding raw stock, and comprehensive test suite.

---

### `SEC-001 — Establish Security Baseline and Firestore Authorization Boundary`
* **Priority**: P0 (Critical)
* **Type**: Security / Database / Authorization
* **Owner**: Gemini (Implementation Lead)
* **Status**: `IMPLEMENTATION COMPLETE — AWAITING REVIEW`
* **Dependencies**: `ARCH-001`
* **Objective**: Replaced insecure `isValidId(documentId)` rules in `firestore.rules` with a hardened server-enforced authorization system. Completed supervisor correction requirements SEC-001-F1 through F7 and Final Review corrections SEC-001-R1 through R7.

---

### `ARCH-001 — Establish Project Governance & Architecture Baseline`
* **Priority**: P0 (Blocker)
* **Type**: Architecture / Governance / Documentation
* **Owner**: Gemini (Implementation Lead)
* **Status**: `IMPLEMENTATION COMPLETE — AWAITING REVIEW`
* **Dependencies**: None
* **Objective**: Establish the `.ai/` engineering governance layer, inspect the actual codebase, document system architecture, data models, security gaps, coding standards, and risk register.

---

## 3. Priority Queue (Approved for Scheduling)

### P1 — Domain Foundations & Core Services

#### `INV-002 — Ledger Movements & Transactional Allocation`
* **Priority**: P1
* **Type**: Domain Service / Inventory Movements
* **Dependencies**: `INV-001-F1.1`
* **Status**: `QUEUED`
* **Scope**: Implement immutable double-entry `StockMovementRecord` events (receipts, sales, adjustments, transfers). Transition POS and e-commerce stock deductions from ad-hoc document updates to transactional ledger movements.

#### `POS-001 — POS Inventory Resolution Layer`
* **Priority**: P1
* **Type**: POS / Integration
* **Dependencies**: `INV-001-F1.1`
* **Status**: `QUEUED (BLOCKED PENDING INV-001-F1.1 APPROVAL)`
* **Scope**: Connect `POSModule` to the normalized inventory resolution service. Ensure multi-tier unit selection (piece, pack, box) deducts authoritative base units seamlessly, with offline buffer support.

#### `ECOM-001 — Shared Catalog Contract`
* **Priority**: P1
* **Type**: E-Commerce / Storefront
* **Dependencies**: `PROD-001-F2.1`, `INV-001-F1.1`
* **Status**: `QUEUED`
* **Scope**: Refactor `ECommerceStorefront` and checkout handlers to consume the same authoritative product and inventory domain services as POS, eliminating code duplication in `App.tsx`.

---

### P2 — Workflows, Quality & Documentation

#### `UX-001 — Product Creation Workflow Review`
* **Priority**: P2
* **Type**: UX / Frontend
* **Dependencies**: `PROD-001-F2.1`
* **Status**: `QUEUED`
* **Scope**: Consolidate duplicate step components in `src/components/product-form/` (remove orphaned legacy steps) and streamline the 8-step product creation wizard.

#### `QA-001 — Product/POS Regression Suite`
* **Priority**: P2
* **Type**: Testing / QA
* **Dependencies**: `POS-001`, `ECOM-001`
* **Status**: `QUEUED`
* **Scope**: Establish automated unit and integration tests covering inventory deduction, packaging multiplier calculations, tax algorithms, and POS-to-storefront catalog sync.

#### `DOC-001 — Architecture Decision Records`
* **Priority**: P2
* **Type**: Documentation
* **Dependencies**: Ongoing
* **Status**: `QUEUED`
* **Scope**: Maintain and formalize future architectural decision records as new service boundaries and multi-branch features are approved.
