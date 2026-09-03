# Engineering Task Queue — Nexus POS-Commerce Suite

## 1. Active Task

### `SEC-001 — Establish Security Baseline and Firestore Authorization Boundary`
* **Priority**: P0 (Critical)
* **Type**: Security / Database / Authorization
* **Owner**: Gemini (Implementation Lead)
* **Status**: `IMPLEMENTATION COMPLETE — AWAITING REVIEW`
* **Dependencies**: `ARCH-001`
* **Objective**: Replaced insecure `isValidId(documentId)` rules in `firestore.rules` with a hardened server-enforced authorization system. Completed supervisor correction requirements SEC-001-F1 through F7:
  * Established single-enterprise boundary rejecting foreign tenant IDs (F1).
  * Implemented dual-collection catalog model with `/public_products` projection stripping sensitive cost/supplier fields (F2).
  * Segregated staff credentials into client-inaccessible `/staff_credentials` vault (F3).
  * Enforced untrusted client input boundaries for e-commerce orders, mandating `Pending` status and preventing client-forged `Completed`/`Paid` states (F4).
  * Authored and executed a 51-test suite against the local Firebase Firestore Emulator (`tests/emulator-rules.test.ts`) with 100% pass rate (F5).
  * Adhered to the production deployment constraint by verifying via emulator prior to supervisor review (F6).
  * Maintained governance risk tracking without prematurely closing partial mitigations (F7).

---

## 2. Completed Tasks (Awaiting Technical Supervisor Review)

### `ARCH-001 — Establish Project Governance & Architecture Baseline`
* **Priority**: P0 (Blocker)
* **Type**: Architecture / Governance / Documentation
* **Owner**: Gemini (Implementation Lead)
* **Status**: `IMPLEMENTATION COMPLETE — AWAITING REVIEW`
* **Objective**: Establish the `.ai/` engineering governance layer, inspect the actual codebase, document system architecture, data models, security gaps, coding standards, and risk register.

---

## 3. Priority Queue (Approved for Scheduling)

---

### P1 — Domain Foundations & Core Services

#### `PROD-001 — Product Domain Normalization`
* **Priority**: P1
* **Type**: Domain Architecture / Refactoring
* **Dependencies**: `SEC-001`
* **Status**: `QUEUED`
* **Scope**: Normalize the unified product model in `src/types.ts`. Disentangle overlapping packaging configs (`ProductPackagingConfig`, `PackagingUnitsConfig`, `BulkPackagingConfig`). Formalize the `Product -> Variant -> SKU` hierarchy with backward-compatible adapters.

#### `INV-001 — SKU and Inventory Architecture`
* **Priority**: P1
* **Type**: Domain Service / Inventory Engine
* **Dependencies**: `PROD-001`
* **Status**: `QUEUED`
* **Scope**: Implement an authoritative inventory service layer. Transition stock mutations from ad-hoc integer decrementing to ledger-based `StockMovementRecord` events. Support multi-location allocation, FIFO/FEFO lot rotation, and automated bulk breaking.

#### `POS-001 — POS Inventory Resolution Layer`
* **Priority**: P1
* **Type**: POS / Integration
* **Dependencies**: `INV-001`
* **Status**: `QUEUED`
* **Scope**: Connect `POSModule` to the normalized inventory resolution service. Ensure multi-tier unit selection (piece, pack, box) deducts authoritative base units seamlessly, with offline buffer support.

#### `ECOM-001 — Shared Catalog Contract`
* **Priority**: P1
* **Type**: E-Commerce / Storefront
* **Dependencies**: `PROD-001`, `INV-001`
* **Status**: `QUEUED`
* **Scope**: Refactor `ECommerceStorefront` and checkout handlers to consume the same authoritative product and inventory domain services as POS, eliminating code duplication in `App.tsx`.

---

### P2 — Workflows, Quality & Documentation

#### `UX-001 — Product Creation Workflow Review`
* **Priority**: P2
* **Type**: UX / Frontend
* **Dependencies**: `PROD-001`
* **Status**: `QUEUED`
* **Scope**: Consolidate duplicate step components in `src/components/product-form/` (remove orphaned legacy steps) and streamline the 8-step product creation wizard.

#### `QA-001 — Product/POS Regression Suite`
* **Priority**: P2
* **Type**: Testing / QA
* **Dependencies**: `POS-001`, `ECOM-001`
* **Status**: `QUEUED`
* **Scope**: Establish automated unit and integration tests (using Vitest/Testing Library) covering inventory deduction, packaging multiplier calculations, tax algorithms, and POS-to-storefront catalog sync.

#### `DOC-001 — Architecture Decision Records`
* **Priority**: P2
* **Type**: Documentation
* **Dependencies**: Ongoing
* **Status**: `QUEUED`
* **Scope**: Maintain and formalize future architectural decision records as new service boundaries and multi-branch features are approved.
