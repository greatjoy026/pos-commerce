# Engineering Task Queue — Nexus POS-Commerce Suite

## 1. Active Tasks

### `PROD-001-F2 — Final Product Domain Boundary Hardening`
* **Priority**: P1 (Architectural Review Correction)
* **Type**: Domain Architecture / Boundary Hardening
* **Owner**: Gemini (Implementation Lead)
* **Status**: `IMPLEMENTATION COMPLETE — AWAITING REVIEW`
* **Dependencies**: `PROD-001-F1`, `SEC-001`
* **Objective**: Addressed all architectural review findings from PROD-001-F1:
  * **Public Catalog Stock Stripping**: Completely eliminated raw operational stock fields from `/public_products` projections and replaced with derived categorical state (`availability: { status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' }`).
  * **Firestore Rules Enforcement**: Updated `isValidPublicProduct` in `firestore.rules` to strictly forbid numeric `stock` and validate `availability.status`.
  * **Strict Packaging Validation**: Enforced that packaging unit multipliers must be positive numbers (`> 0`) and selling prices non-negative numbers (`>= 0`), rejecting defective inputs without fallback.
  * **Mandatory Category**: Enforced required non-empty category without silent default.
  * **Business Defaults**: Standardized default `rating` to 0 (unrated) and `lifecycle.status` to `'Draft'`.
  * **Catalog-wide SKU & Barcode Uniqueness**: Extended validation engines to detect collisions across base, variant, and packaging units.
  * **Type Safety**: Eliminated `any` casts in domain normalization, projection, and SKU service layers.
  * **Verification**: 109/109 tests passing (`npm test`), zero TypeScript errors (`tsc --noEmit`), clean production build (`npm run build`).

---

## 2. Completed Tasks (Awaiting Technical Supervisor Review)

### `SEC-001 — Establish Security Baseline and Firestore Authorization Boundary`
* **Priority**: P0 (Critical)
* **Type**: Security / Database / Authorization
* **Owner**: Gemini (Implementation Lead)
* **Status**: `IMPLEMENTATION COMPLETE — AWAITING REVIEW`
* **Dependencies**: `ARCH-001`
* **Objective**: Replaced insecure `isValidId(documentId)` rules in `firestore.rules` with a hardened server-enforced authorization system. Completed supervisor correction requirements SEC-001-F1 through F7 and Final Review corrections SEC-001-R1 through R7:
  * **SEC-001-R1**: Created strict `/public_settings` projection; restricted `/settings` to internal staff (`isStaff()`). Stripped supervisor PINs, secrets, and integration URLs from public access.
  * **SEC-001-R2**: Constrained anonymous customer creation to guest checkout with channel `ecom_guest` and 0 loyalty points; enforced owner updates and prevented cross-customer tampering.
  * **SEC-001-R3**: Reinforced dual-collection product model (`/products` vs `/public_products`), strictly forbidding cost, supplier, and reorder fields from public projection. Documented client-side dual-write limitation as temporary compatibility.
  * **SEC-001-R4**: Hardened `/staff_credentials` vault to deny all client SDK reads and writes (`allow read, write: if false;`), reserving access exclusively to trusted server environments via Firebase Admin SDK.
  * **SEC-001-R5**: Documented authoritative role model, establishing Firebase Auth custom claims precedence over Firestore `/staff` documents and outlining token revocation workflows.
  * **SEC-001-R6**: Enforced append-only immutability on `/audit_logs` and documented client-side metadata limitations requiring future trusted server audit writer.
  * **SEC-001-R7**: Enforced untrusted e-commerce client boundaries, mandating `Pending` status and `Pending`/`Unpaid` payment status, and documented client-side price/total limitations.
  * **Test Verification**: 63/63 integration tests passing against local Firebase Firestore Emulator (`tests/emulator-rules.test.ts`) and 79/79 unit tests passing (`tests/authorization.test.ts`).
  * **Production Deployment**: Intentionally held (`NO`) pending supervisor review.


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
