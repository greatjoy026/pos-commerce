# Engineering Task Queue — Nexus POS-Commerce Suite

## 1. Active Tasks

### `INV-002 — Ledger Movements & Transactional Allocation`
* **Priority**: P1
* **Type**: Domain Service / Inventory Movements
* **Owner**: Architecture Supervisor (direct implementation while Gemini generation unavailable)
* **Status**: `IMPLEMENTATION COMPLETE — AWAITING ARCHITECTURAL REVIEW`
* **Dependencies**: `INV-001-F1.1` — APPROVED BY SUPERVISOR
* **Objective**: Establish the authoritative transactional inventory mutation layer using immutable movement records, Firestore transactions, integer quantity invariants, insufficient-stock protection, idempotent operation IDs, and atomic inter-location transfers.
* **Scope Boundary**: No POS checkout, e-commerce checkout, payment processing, offline synchronization, financial accounting, reservation subsystem, or full serial/batch lifecycle engine.

---

## 2. Completed Tasks

### `INV-001-F1.1 — Inventory Quantity & Tracking Contract Finalization`
* **Priority**: P1
* **Type**: Domain Architecture / Contract Hardening
* **Status**: `APPROVED BY SUPERVISOR`
* **Dependencies**: `INV-001-F1`, `PROD-001-F2.1`, `SEC-001`
* **Objective**: Finalized discrete integer inventory quantities, SERIAL/BATCH invariants, mandatory timestamps, Firestore parity, public availability projection, and associated tests.

### `INV-001-F1 — Authoritative Inventory Entity & Multi-Location Foundation`
* **Priority**: P1
* **Status**: `SUPERSEDED BY INV-001-F1.1`

### `PROD-001-F2.1 — Final Validation and Public Contract Correction`
* **Priority**: P1
* **Status**: `APPROVED BY SUPERVISOR`

### `SEC-001 — Establish Security Baseline and Firestore Authorization Boundary`
* **Priority**: P0
* **Status**: `APPROVED WITH FOLLOW-UP`
* **Follow-ups**: plaintext PIN migration, customer loyalty field-level protection, trusted public projection ingestion, trusted e-commerce checkout/payment verification.

### `ARCH-001 — Establish Project Governance & Architecture Baseline`
* **Priority**: P0
* **Status**: `APPROVED`

---

## 3. Priority Queue

### P1 — Domain Foundations & Core Services

#### `POS-001 — POS Inventory Resolution Layer`
* **Status**: `QUEUED — BLOCKED PENDING INV-002 APPROVAL`
* **Dependencies**: `INV-002`
* **Scope**: Connect POS to normalized inventory resolution and authoritative base-unit deduction; offline buffer remains future work unless explicitly included in its task.

#### `ECOM-001 — Shared Catalog Contract`
* **Status**: `QUEUED`
* **Dependencies**: `PROD-001-F2.1`, `INV-002`
* **Scope**: Refactor e-commerce to consume shared product/inventory services without duplicating domain logic.

### P2 — Workflows, Quality & Documentation

#### `UX-001 — Product Creation Workflow Review`
* **Status**: `QUEUED`

#### `QA-001 — Product/POS Regression Suite`
* **Status**: `QUEUED`

#### `DOC-001 — Architecture Decision Records`
* **Status**: `QUEUED`
