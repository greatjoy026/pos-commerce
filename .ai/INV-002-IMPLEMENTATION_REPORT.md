# INV-002 Implementation Report

**Task:** INV-002 — Ledger Movements & Transactional Allocation  
**Status:** `IMPLEMENTATION COMPLETE — AWAITING ARCHITECTURAL REVIEW`  
**Implementation:** Direct supervisor implementation because Gemini free generations were exhausted.

## Implemented

- `src/domain/inventory/movements.ts` provides the single application-level movement mutation path.
- Purchase receipts, sales, returns, adjustments, and transfers are supported.
- Integer-only quantities and non-zero deltas are enforced.
- Sales/transfers use available inventory (`quantityOnHand - quantityReserved`).
- `quantityAfter` is calculated from the transaction's current authoritative inventory state.
- Firestore transactions atomically update inventory and append movement records.
- Deterministic operation IDs prevent repeated operations from applying a second balance change.
- Transfers write outbound/inbound movement legs and both inventory balances atomically.
- `/inventory_movements/{movementId}` is staff-readable, inventory-staff creatable, and immutable after creation.
- `performedBy` is bound to the authenticated Firebase UID.
- Firebase blueprint documents the movement entity and collection.
- ADR-018 documents the architecture and limitations.
- Task queue activates INV-002 and blocks POS-001 on INV-002 approval.
- Focused movement-boundary tests were added and included in `npm test`.

## Security limitation

The current browser architecture still permits authorized direct `/inventory` updates. The movement service is therefore the authoritative **application path**, but not yet an exclusive server-trusted boundary. A future trusted backend/API task must close this gap before production claims of exclusive movement enforcement are made.

## Migration

No historical inventory movements were fabricated and no destructive migration was performed. Existing inventory balances remain the opening state.

## Verification

The environment used for this implementation cannot reach external package registries/GitHub from the local runtime, so commands could not be truthfully executed here. A dedicated GitHub Actions workflow was added to run `npm ci`, TypeScript validation, the full test command, production build, and Firestore emulator tests.

**No test result is claimed as PASS until CI/local execution confirms it.**

## Explicit non-goals

POS integration, e-commerce checkout integration, payments, financial accounting, offline synchronization, reservation lifecycle, and full serial-item lifecycle remain outside INV-002.
