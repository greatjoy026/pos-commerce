# Engineering Task Queue — Nexus POS-Commerce Suite

## 1. Active Tasks

### `POS-001 — POS Inventory Resolution Layer`
* **Priority**: P1
* **Type**: POS / Inventory Integration / Trusted Backend Boundary
* **Owner**: Architecture Supervisor (direct implementation while Gemini generation unavailable)
* **Status**: `IMPLEMENTATION IN PROGRESS — F1 RETRY`
* **Dependencies**: `INV-001-F1.1` — APPROVED; `INV-002` — MERGED
* **Objective**: Connect POS sale lines to canonical SKU/variant identity and the authoritative inventory movement boundary. POS must never directly mutate inventory balances or manufacture movement records.
* **Current Implementation**: Trusted `recordPosSale` callable and POS client adapter are present. POS-001-F1 is removing the legacy App-level stock mutation and making checkout await the authoritative inventory transaction before finalization.
* **Scope Boundary**: No e-commerce checkout, payment gateway integration, reservation subsystem, offline inventory synchronization, accounting, or serial/batch lifecycle engine.

### `INV-002 — Ledger Movements & Transactional Allocation`
* **Priority**: P1
* **Type**: Domain Service / Inventory Movements
* **Owner**: Architecture Supervisor
* **Status**: `MERGED — APPROVED IMPLEMENTATION`
* **Dependencies**: `INV-001-F1.1` — APPROVED
* **Objective**: Establish the authoritative transactional inventory mutation layer using immutable movement records, Firestore transactions, integer quantity invariants, insufficient-stock protection, idempotent operation IDs, and atomic inter-location transfers.

---

## 2. Completed Tasks

### `INV-001-F1.1 — Inventory Quantity & Tracking Contract Finalization`
* **Priority**: P1
* **Type**: Domain Architecture / Contract Hardening
* **Status**: `APPROVED BY SUPERVISOR`

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
* **Status**: `ACTIVE — F1 VALIDATION RUNNING`
* **Dependencies**: `INV-002`
* **Scope**: Connect POS to normalized inventory resolution and authoritative base-unit deduction; offline buffer remains future work unless explicitly included in its task.

#### `ECOM-001 — Shared Catalog Contract`
* **Status**: `QUEUED`
* **Dependencies**: `PROD-001-F2.1`, `INV-002`, `POS-001`
* **Scope**: Refactor e-commerce to consume shared product/inventory services without duplicating domain logic.

### P2 — Workflows, Quality & Documentation

#### `UX-001 — Product Creation Workflow Review`
* **Status**: `QUEUED`

#### `QA-001 — Product/POS Regression Suite`
* **Status**: `QUEUED`

#### `DOC-001 — Architecture Decision Records`
* **Status**: `QUEUED`
