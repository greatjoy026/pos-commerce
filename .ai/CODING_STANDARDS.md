# Coding Standards — Nexus POS-Commerce Suite

## 1. General Engineering Principles

### 1.1 Scope Discipline & Non-Interference
* **Rule**: Keep changes strictly focused on the assigned task.
* **Mandate**: **Do not perform broad refactors while implementing unrelated tasks.**
* **Mandate**: **Do not introduce a second implementation of an existing business rule when an existing domain/service/helper can be reused.**

### 1.2 Backwards Compatibility
* Existing data models in `src/types.ts` contain legacy and operational fields used across the POS and e-commerce storefront.
* Never remove or rename existing fields without an explicit migration plan approved by the Technical Supervisor.
* Provide fallback defaults when reading optional or newly added fields.

---

## 2. TypeScript & Type Safety

### 2.1 Typing Standards
* **No `any`**: Avoid `any`. Use explicit interfaces, type aliases, or generics. If dynamic data is parsed from JSON or external APIs, use `unknown` with type guards.
* **Imports**: Use standard named imports (`import { ... } from '...'`). Place all imports at the top level of the file.
* **Standard Enums**: Use standard TypeScript `enum` or union types (`type ProductType = 'Standard' | ...`). Do not use `const enum`.
* **Central Types**: All cross-module entities must be declared in `src/types.ts`. Feature-specific internal types may reside alongside their respective components.

---

## 3. React Component Architecture

### 3.1 Component Organization & Separation of Concerns
* Use functional components with React hooks.
* Split complex views into modular sub-components (e.g. separate list rows, modal headers, toolbar controls).
* Keep components focused on presentation and UI state. Domain calculations (e.g. taxes, stock conversions, pricing tiers) belong in `/src/utils/` or `/src/services/`.

### 3.2 State Management & Hooks
* **Dependency Array Stability**: Never include mutable objects or freshly constructed callbacks in `useEffect` dependency arrays without memoization (`useMemo`, `useCallback`).
* **Avoid Infinite Loops**: Never call state-setting functions unconditionally in the render phase or inside unmemoized modal open/close transitions.
* **Context Usage**: Keep React Context providers lightweight (e.g. `CurrencyContext`). Avoid putting high-frequency state (like live scanner video frames) into global context.

---

## 4. Firebase & Firestore Access Patterns

### 4.1 Data Access Layer
* All Firestore operations must go through `src/services/dbService.ts`. Do not call raw Firestore SDK methods (`setDoc`, `getDocs`) directly inside UI components.
* Use `serverTimestamp()` or standard ISO string formats (`new Date().toISOString()`) for datetime consistency.
* Wrap all asynchronous Firestore writes in `try/catch` blocks and pass errors through `handleFirestoreError`.

### 4.2 Offline Resilience & Snapshots
* Firestore listeners (`onSnapshot`) must provide both a success callback and an error fallback callback to gracefully handle offline transitions.
* Local storage cache fallback (`localStorage`) must be synchronized when remote operations complete or when operating offline.

---

## 5. UI/UX, Design System & Styling

### 5.1 Tailwind CSS Utility Classes
* All styling must use Tailwind CSS utility classes directly.
* Adhere to the established palette:
  * Admin Canvas: Slate/Indigo/Neutral backgrounds (`bg-slate-50`, `bg-slate-900`, `text-slate-800`).
  * E-Commerce Canvas: Clean white and warm neutral tones with vibrant action accents.
  * Status Indicators: Emerald for active/connected, Amber for warning/offline, Rose for destructive/out-of-stock.
* Responsive Design: Mobile-first prefixes (`sm:`, `md:`, `lg:`, `xl:`). Touch targets must be at least 44px on mobile viewports.

### 5.2 HTML ID Attributes & Testing
* Ensure all actionable interactive elements (buttons, inputs, key metric cards, tabs) include meaningful, unique `id` attributes (e.g. `id="pos-barcode-input"`, `id="btn-complete-checkout"`).

---

## 6. Testing & Quality Verification

* **Pre-Completion Checks**: Before reporting any implementation task as complete, you must run:
  1. `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
  2. `npm run build` (`vite build`) to verify zero bundling or syntax failures.
* **No False Claims**: Never claim tests passed without executing the commands and inspecting the output.
