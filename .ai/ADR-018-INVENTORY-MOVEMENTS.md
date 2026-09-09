# ADR-018 — Transactional Inventory Movement Ledger

**Status:** IMPLEMENTED — AWAITING ARCHITECTURAL REVIEW  
**Task:** INV-002

## Decision

`InventoryRecord` remains the authoritative current inventory state. Inventory balance changes are produced by a single transactional movement service and recorded as immutable `InventoryMovementRecord` documents in `/inventory_movements/{movementId}`.

```text
Business operation
  -> movement service
  -> Firestore transaction
     -> inventory balance
     -> immutable movement record
```

## Movement semantics

- `PURCHASE_RECEIPT`: positive delta.
- `SALE`: negative delta and cannot consume reserved/unavailable stock.
- `RETURN`: positive delta.
- `ADJUSTMENT`: signed non-zero delta and requires a reason.
- `TRANSFER`: paired negative source and positive destination movements in one transaction.

All physical quantities are discrete integers. `quantityAfter = quantityBefore + quantityDelta` is enforced by the domain service and Firestore movement schema.

## Idempotency

Caller-supplied `operationId` deterministically maps to movement document IDs. Repeating the same operation returns the existing movement rather than applying the balance change twice. Transfer operations use `_out` and `_in` legs and reject incomplete idempotency state.

## Concurrency and atomicity

Firestore transactions read the movement/idempotency state and authoritative inventory state before writing. Balance and movement writes commit together or not at all, allowing Firestore transaction retry semantics to protect concurrent updates.

## Security boundary

Movement records are staff-readable, inventory-staff creatable, and immutable from the client. `performedBy` must equal the authenticated UID. The existing direct `/inventory` update capability remains during the migration phase because the current browser architecture does not yet provide a trusted server-only movement endpoint; this is an explicit follow-up boundary, not a claim of full server-side trust.

## Non-goals

This ADR does not introduce POS checkout, e-commerce checkout, payment processing, financial accounting, offline synchronization, reservation lifecycle management, or a full serial-number ledger.
