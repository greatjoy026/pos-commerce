# ADR-019 — Trusted Inventory Mutation Boundary

**Status:** IMPLEMENTED — AWAITING ARCHITECTURAL REVIEW  
**Task:** INV-002-F1  
**Supersedes:** The client-authoritative portion of ADR-018; ADR-018 remains valid for movement semantics and transaction/idempotency behavior.

## Context

Firestore Security Rules authorize and reject browser requests, but browser JavaScript is not a trusted execution environment. The original INV-002 implementation therefore provided an atomic application path without preventing an authorized client from manufacturing movement records or directly overwriting inventory balances.

Inventory balance integrity requires one trusted mutation boundary.

## Decision

Inventory balance mutations and movement-record creation are moved behind Firebase callable functions using the Firebase Admin SDK.

```text
POS / inventory workflow
        |
        v
Firebase callable function
        |
        +--> authenticate + enterprise/role authorization
        |
        v
Firestore transaction
   |             |
   v             v
inventory     movement
balance       history
```

The browser-facing `src/domain/inventory/movements.ts` module is now a request adapter. It validates basic input locally and calls the trusted functions; it no longer writes `/inventory` or `/inventory_movements` directly.

## Firestore boundary

Client access is intentionally tightened:

- `/inventory_movements`: staff may read; client create/update/delete are denied.
- `/inventory`: staff may read; client creation is limited to zero-balance records for foundational record creation; client update/delete are denied.
- Trusted Admin SDK functions perform balance and movement writes. Admin SDK writes bypass Firestore Security Rules and are therefore protected by explicit function-side authentication, enterprise-scope, role, validation, and transaction checks.

Non-zero opening balances require a future explicit opening-balance operation rather than an untracked direct write.

## Authorization

Callable functions require authentication. If a tenant claim is present it must equal `nexus-enterprise`. The actor must be a super-admin/admin inventory-authorized role through claims or the authoritative `/staff/{uid}` role.

## Integrity invariants

The trusted transaction enforces:

- integer quantities only;
- purchase/return positive deltas;
- sale negative deltas and available-stock protection;
- non-zero adjustment delta with required reason;
- transfer as paired source/destination movements in one transaction;
- `quantityAfter = quantityBefore + quantityDelta`;
- stored inventory state is read inside the same transaction before mutation;
- deterministic operation IDs and complete request identity checks prevent accidental replay with different parameters;
- movement history is immutable from clients.

## Database identity

The callable functions target the same named Firestore database configured by the application (`ai-studio-nexusposcommerce-d2deaf29-88c9-4563-a26f-04f5e6504d77`), with an environment override available for deployment configuration.

## Testing requirements

INV-002-F1 must verify:

- successful purchase, sale, return, adjustment and transfer flows;
- insufficient available stock;
- idempotent retries and operation-ID conflicts;
- tampered movement before/after values;
- unauthorized direct movement creation;
- unauthorized direct inventory balance mutation;
- transfer atomicity and invariants;
- trusted function TypeScript compilation;
- Firestore emulator security rules.

## Non-goals

This ADR does not implement POS checkout, e-commerce checkout, payment processing, accounting, offline synchronization, reservation lifecycle, or a full serial-item ledger.

## Migration

No historical movement records are fabricated. Existing inventory balances remain opening state. No destructive migration is performed by INV-002-F1.
