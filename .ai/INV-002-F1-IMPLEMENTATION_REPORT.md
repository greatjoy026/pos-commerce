# INV-002-F1 Implementation Report

**Task:** INV-002-F1 — Inventory Movement Integrity & Trusted Mutation Boundary  
**Status:** `IMPLEMENTATION COMPLETE — AWAITING CI AND ARCHITECTURAL REVIEW`  
**Implementation:** Architecture Supervisor direct implementation because Gemini generation is unavailable.

## Objective

Close the review finding that INV-002's browser-side Firestore transaction was atomic but not an exclusive trusted mutation boundary.

## Implemented

- Added Firebase callable inventory mutation functions under `functions/src/`.
- Added dedicated Functions package and TypeScript build configuration.
- Routed frontend inventory movement APIs through callable functions instead of direct Firestore writes.
- Callable functions authenticate the actor, enforce enterprise scope, and authorize inventory roles using claims or authoritative staff records.
- Trusted functions target the application's named Firestore database, with an environment override.
- Movement and inventory mutations remain transactional and preserve integer, available-stock, transfer, adjustment, and idempotency invariants.
- Movement idempotency compares operation identity including inventory, movement type, delta, actor, reference, and reason.
- Firestore client rules now deny movement creation/update/delete.
- Firestore client rules now deny inventory balance updates/deletes; zero-balance client creation remains allowed for foundational record creation.
- Added emulator security tests proving inventory staff cannot forge movement records or directly change balances.
- CI now builds the trusted Functions package in addition to the root application and emulator security suites.
- Added ADR-019 and updated task queue, risk register, and Firebase blueprint.

## Security Boundary

The browser is no longer treated as a trusted inventory mutation authority. Firestore client rules deny direct balance/movement mutation. The trusted callable layer uses Admin SDK transactions and explicit function-side authorization.

Admin SDK writes bypass Firestore Security Rules by design; therefore function-side authentication, enterprise scope, role authorization, validation, and transaction invariants are mandatory.

## Migration

No historical movement records were fabricated. Existing balances remain opening state. No destructive migration was performed.

## Explicit limitation

The system does not yet provide a formal opening-balance workflow. Client-created inventory records are therefore limited to zero balances. A future opening-balance operation must create an auditable movement rather than restoring direct balance writes.

## Validation Required Before Approval

CI must pass:

1. Root TypeScript validation.
2. Root unit/domain tests.
3. Root production build.
4. Firebase Functions TypeScript build.
5. Firestore emulator security tests.
6. INV-002-F1 direct-mutation bypass tests.

Production deployment is not authorized by this task.
