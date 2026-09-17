# Engineering Task Queue — Nexus POS-Commerce Suite

## 1. Active Tasks

### `ECOM-001 — Shared Catalog Contract`
* **Priority**: P1
* **Type**: Shared Catalog Domain / POS + E-Commerce Integration
* **Owner**: Architecture Supervisor
* **Status**: `IMPLEMENTATION — VALIDATION GATE`
* **Dependencies**: `PROD-001-F2.1` — APPROVED; `INV-002` — MERGED; `POS-001` — APPROVED/MERGED
* **Objective**: Establish one shared Product → Variant → SKU → Packaging/UOM contract for POS and e-commerce. Consumer projections must preserve canonical IDs and must never expose inventory balances, costs, warehouse locations, or payment state.
* **Current Implementation**: Shared catalog contract, deterministic SKU/variant resolution, catalog-defined base-unit conversion, immutable consumer-facing identity fields, and public availability-only projection are implemented under `src/domain/catalog/contract.ts`.
* **Scope Boundary**: No payment gateway, order fulfillment engine, reservation engine, offline synchronization, accounting, or serial/batch lifecycle engine.

### `INV-002 — Ledger Movements & Transactional Allocation`
* **Priority**: P1
* **Type**: Domain Service / Inventory Movements
* **Owner**: Architecture Supervisor
* **Status**: `MERGED — APPROVED IMPLEMENTATION`

---

## 2. Completed Tasks

### `POS-001 — POS Inventory Resolution Layer`
* **Priority**: P1
* **Type**: POS / Inventory Integration / Trusted Backend Boundary
* **Owner**: Architecture Supervisor
* **Status**: `APPROVED — MERGED`
* **Dependencies**: `INV-001-F1.1`, `INV-002`
* **Scope**: Connect POS sale lines to canonical SKU/variant identity and the authoritative inventory movement boundary.

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

#### `ECOM-001 — Shared Catalog Contract`
* **Status**: `ACTIVE — VALIDATION GATE`
* **Dependencies**: `PROD-001-F2.1`, `INV-002`, `POS-001`
* **Scope**: Shared Product → Variant → SKU → Packaging/UOM contract for POS and e-commerce; public projection remains stock/cost/location safe.

### P2 — Workflows, Quality & Documentation

#### `UX-001 — Product Creation Workflow Review`
* **Status**: `QUEUED`

#### `QA-001 — Product/POS Regression Suite`
* **Status**: `QUEUED`

#### `DOC-001 — Architecture Decision Records`
* **Status**: `QUEUED`
