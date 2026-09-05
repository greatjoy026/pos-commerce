# Engineering Task Queue — Nexus POS-Commerce Suite

## 1. Active Tasks

### `PROD-001-F1 — Product Domain Boundary & SKU Architecture Correction`
* **Priority**: P1 (Correction)
* **Type**: Domain Architecture / Boundary Hardening
* **Owner**: Gemini (Implementation Lead)
* **Status**: `IMPLEMENTATION COMPLETE — AWAITING REVIEW`
* **Dependencies**: `SEC-001`
* **Objective**: Corrected structural boundary issues identified in PROD-001 review:
  * **Domain Isolation**: `CanonicalProduct` strictly limited to identity, merchandising, classification, lifecycle, variants, and packaging unit definitions. Stock, wholesale costs, locations, serials, and batch lots strictly excised from the domain aggregate.
  * **Anti-Silent Fallback Rule**: Normalization rejects missing SKUs, missing names, duplicate variant SKUs within a product, negative prices, and invalid multipliers with structured errors instead of inventing silent placeholders.
  * **Transitional Compatibility Adapters**: Implemented `toLegacyProduct` and `normalizeToLegacyProduct` to bridge `CanonicalProduct` with transitional `ProductOperationalState` without breaking existing UI views or premature inventory refactoring.
  * **Authoritative SKU Resolution**: `resolveProductSku` resolves across base SKUs, base barcodes, variant SKUs, variant barcodes, and packaging barcodes with multipliers.
  * **Catalog Projections**: Centralized public storefront catalog projection (`toPublicCatalogProjection`) and POS view adapter (`toPOSProductView`) in `/src/domain/catalog/projections.ts` and `/src/domain/product/projections.ts`.
  * **Test Verification**: 22 domain tests in `tests/product-domain.test.ts` passing (101 total unit tests passing in `npm test`), zero TypeScript lint errors (`tsc --noEmit`), and successful production build.

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
