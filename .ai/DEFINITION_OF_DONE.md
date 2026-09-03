# Definition of Done (DoD) — Nexus POS-Commerce Suite

## 1. Overview & Principle

A task is **NOT complete** simply because:
* TypeScript compiles without errors;
* The user interface renders in the browser;
* The happy path works during manual clicking;
* The engineer believes the code is correct.

A task is considered **IMPLEMENTATION COMPLETE** only when all applicable criteria in this document are verified. Final sign-off is granted solely by the **Architecture & Technical Supervisor** (`SUPERVISOR APPROVED`).

---

## 2. Mandatory Quality Gates

Every code change must satisfy these quality gates prior to submission:

### 2.1 Scope & Architectural Fidelity
- [ ] The change directly addresses the acceptance criteria of the assigned Task ID.
- [ ] No unrequested features, speculative dependencies, or extra navigation tabs were introduced.
- [ ] The change conforms to `.ai/ARCHITECTURE.md` and `.ai/DECISIONS.md`.
- [ ] No duplicate implementations of existing business or utility logic were created.

### 2.2 Functional Correctness & Domain Integrity
- [ ] Input validation is implemented for all form and API boundaries.
- [ ] Edge cases (empty states, null data, network latency, offline transitions) are handled.
- [ ] Calculations (currency, tax, discounts, packaging multipliers, stock deductions) are mathematically correct.
- [ ] Downstream dependencies (POS, E-Commerce, CRM, Reports) were checked for behavioral compatibility.

### 2.3 Security & Privacy Review
- [ ] No secrets, private credentials, or service account keys are exposed in client code.
- [ ] Security rules are reviewed; no insecure wildcards (`allow read, write: if true;`) introduced.
- [ ] PII and sensitive business data are properly scoped and protected.

### 2.4 Code Standards & Hygiene
- [ ] Conforms to `.ai/CODING_STANDARDS.md`.
- [ ] Types are strict; no loose `any` casts or unverified type assertions.
- [ ] Meaningful `id` attributes are added to all new interactive elements.
- [ ] No console errors or unresolved runtime warnings during execution.

### 2.5 Verification Checks Executed
- [ ] `npm run lint` (`tsc --noEmit`) passes with zero errors.
- [ ] `npm run build` (`vite build`) completes successfully with clean bundle output.
- [ ] Automated unit or integration tests (when available) executed and passing.
- [ ] Manual verification in the browser executed and documented with specific scenarios.

### 2.6 Documentation & Governance
- [ ] Relevant documentation updated (e.g. `ARCHITECTURE.md`, `DECISIONS.md`, `RISKS.md`).
- [ ] `.ai/IMPLEMENTATION_REPORT.md` is fully completed with actual commands, outputs, and limitations.
- [ ] Task status in `.ai/TASK_QUEUE.md` and `.ai/REVIEW_QUEUE.md` set to:
  `IMPLEMENTATION COMPLETE — AWAITING REVIEW`.

---

## 3. Status Transitions

```
[QUEUED] ──► [IN PROGRESS] ──► [IMPLEMENTATION COMPLETE — AWAITING REVIEW]
                                                   │
                                     (Supervisor Review)
                                                   │
                                                   ├──► [SUPERVISOR APPROVED]
                                                   └──► [REVISION REQUIRED]
```
