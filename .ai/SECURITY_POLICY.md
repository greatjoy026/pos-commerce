# Security Policy & Authorization Standards — Nexus POS-Commerce Suite

## 1. Authentication Standards

* **Requirement**: All users accessing administrative or operational endpoints (POS, inventory, staff, financial reports, CRM, system settings) must be authenticated with verifiable credentials.
* **Authentication Provider**: Firebase Authentication (`auth`).
* **Session Verification**: Anonymous or unverified sessions must be restricted to public e-commerce browsing only.

---

## 2. Authorization Hierarchy & Boundaries

Authorization must not rely on client-side state alone. Client-side RBAC (such as `src/utils/permissions.ts`) is a presentation-layer UX convenience, not a security boundary.

True authorization must be enforced at the database rules and API layer using the following hierarchy:

```
Authenticated User (Firebase Auth UID)
       │
       ▼
Tenant / Business Identity (Multi-tenant isolation)
       │
       ▼
Branch / Store / Location Scope
       │
       ▼
Assigned Role (Super Admin, Store Manager, Cashier, etc.)
       │
       ▼
Granular Permission (e.g. inventory.edit, sales.refund)
       │
       ▼
Target Resource / Document
```

---

## 3. Firestore Security Rules Policy

### 3.1 Prohibition of ID-Validity Authorization
* **Mandate**: **Never use document-ID validity as authorization.**
* Rules of the form:
  ```javascript
  // ❌ INSECURE ANTI-PATTERN
  allow write: if isValidId(documentId);
  ```
  validate only the length and type of the string key. They do NOT verify who the caller is, what role they possess, or whether they own the data. This pattern is strictly prohibited for production data access.

### 3.2 Default Deny
* All collections and subcollections must default to `allow read, write: if false;` unless explicitly granted by a verified rule matching user identity, role, and tenant scope.

### 3.3 Audit Log Immutability
* Audit logs (`/audit_logs/{logId}`) must be append-only:
  ```javascript
  allow update, delete: if false;
  ```
* Creation of audit log entries must record the caller's verified `request.auth.uid` and server-stamped timestamp.

---

## 4. Protection of Sensitive Business Domains

The following datasets require strict access controls:
1. **Customer Data (PII)**: Names, emails, phone numbers, addresses, loyalty balances. Read/write restricted to authenticated staff with CRM privileges and the authenticated customer for their own profile.
2. **Staff Credentials**: Passwords, PINs, and permissions must never be readable by unauthorized roles. Plaintext PINs must not be exposed to client document reads.
3. **Financial Records & Invoices**: Revenue figures, tax documents, profit margins, and COGS must only be accessible to `Super Admin`, `Business Owner`, and `Accountant` roles.
4. **Product Costs & Margins**: Supplier costs (`cost`, `calculatedUnitCost`) must be restricted from public storefront inspection.
5. **System Settings**: Currency, tax rates, and terminal security settings must require administrative authorization.

---

## 5. Secrets Management

* **No Hardcoded Secrets**: Never commit or embed private API keys, Firebase service account credentials, OAuth client secrets, or private certificates in client-side code.
* **Environment Variables**: Sensitive configuration must use `.env` (documented in `.env.example`).
* **Server-Side API Proxy**: Third-party integrations requiring secret keys must be executed via server-side endpoints, not called directly from the browser.

---

## 6. Deployed Firestore Authorization Matrix (SEC-001 Hardened)

| Collection | Read (`get` / `list`) | Create | Update | Delete | Immutability / Validation |
|---|---|---|---|---|---|
| `/products/{id}` | Internal Staff Only (`isStaff()`) | Inventory Staff, Manager, Admin | Inventory Staff, Manager, Admin | Store Manager, Admin | Internal catalog with wholesale cost, supplier info, and inventory rules |
| `/public_products/{id}` | Public (`true`) | Inventory Staff, Manager, Admin | Inventory Staff, Manager, Admin | Store Manager, Admin | **Public Projection**: Cost, supplier, batch, and reorder fields STRICTLY excluded |
| `/customers/{id}` | Sales Staff (`isSalesStaff`) or Owner (`auth.uid == id`) | Sales Staff, Owner (`auth.uid == id`), or Constrained Guest (`isValidGuestCustomer`) | Sales Staff or Owner (`auth.uid == id`) | Store Manager, Admin | Non-negative loyalty points; guest creation requires `channel == 'ecom_guest'` and `loyaltyPoints == 0` |
| `/staff/{id}` | Authenticated Staff (`hasAnyStaffRole`) | Store Manager, Admin (`isValidStaff`) | Store Manager, Admin or Self (`avatar`, `phone`) | Super Admin Only | PIN optional on profile; protected from unauthenticated access |
| `/staff_credentials/{id}` | `false` (Deny all client reads) | `false` (Deny all client writes) | `false` (Deny all client writes) | `false` (Deny all client writes) | **Isolated Credential Vault** — completely inaccessible to client SDKs (server-only via Firebase Admin SDK) |
| `/orders/{id}` | Sales Staff or Ordering Customer | Sales Staff (pos) or Untrusted E-Com (`isValidEcomOrder`) | Sales Staff | Super Admin Only | Browser e-com orders MUST be initialized as `Pending` with payment status `Pending`/`Unpaid` |
| `/audit_logs/{id}` | Store Manager, Admin | Authenticated Staff (`isStaff()`) | `false` (Deny) | `false` (Deny) | **STRICTLY IMMUTABLE** append-only ledger |
| `/settings/{id}` | Internal Staff Only (`isStaff()`) | Store Manager, Admin | Store Manager, Admin | `false` (Deny) | **Internal Settings**: Contains supervisor PINs, secrets, printer/network, operational configs |
| `/public_settings/{id}` | Public Storefront (`true`) | Store Manager, Admin | Store Manager, Admin | `false` (Deny) | **Public Settings Projection**: Store name, currency, tax rate; supervisor PINs and secrets strictly forbidden |
| `/shift_reports/{id}` | Sales Staff, Store Manager, Admin | Sales Staff, Store Manager, Admin | Store Manager, Admin | `false` (Deny) | **PERMANENT FINANCIAL RECORD** — no deletion allowed |
| `/{document=**}` | `false` (Deny) | `false` (Deny) | `false` (Deny) | `false` (Deny) | Global default deny catch-all |

---

## 7. Enterprise Scope & Tenant Isolation

* **Single-Enterprise Domain**: The application currently operates under the unified enterprise domain (`nexus-enterprise`).
* **Strict Boundary**: Any token presenting a mismatched foreign `tenantId` is rejected from staff operations (`isEnterpriseScope()`). Access is never silently permitted across foreign contexts.

---

## 8. Authoritative Role & Credential Specifications (SEC-001-R1 through R7)

### 8.1 Public Settings Projection (SEC-001-R1)
* `/settings/{settingId}` contains confidential business configuration: supervisor PINs, integrations, webhook URLs, printer/network setups, and operational parameters. It is restricted exclusively to authenticated enterprise staff (`isStaff()`).
* `/public_settings/{settingId}` is a storefront-safe projection containing only public metadata (`businessName`, `currency`, `taxRate`, storefront contact info).
* Security rules strictly forbid supervisor PINs, secrets, API keys, webhooks, or hardware configurations from being written to `/public_settings`.

### 8.2 Customer Creation Boundaries (SEC-001-R2)
* Unrestricted anonymous customer creation is strictly prohibited.
* Three distinct paths are recognized:
  1. **Enterprise Staff CRM creation**: Sales staff and managers can create customer records across channels.
  2. **Authenticated customer self-registration**: Authenticated users can create and manage their own customer profile where `request.auth.uid == customerId`.
  3. **Constrained guest e-commerce checkout**: Unauthenticated visitors may only create a customer profile if explicitly tagged with `channel: 'ecom_guest'` and `loyaltyPoints: 0` (or omitted). Arbitrary loyalty point grants by anonymous users are rejected at the database level.
* Cross-customer modification is strictly blocked (`request.auth.uid == customerId`).

### 8.3 Public Product Projection Integrity (SEC-001-R3)
* The catalog follows the authoritative flow: `Internal Product (/products) → projection process → Public Product (/public_products)`.
* Wholesale costs, supplier references, reorder thresholds, batch lot tracking, and serial numbers are strictly excluded from `/public_products`.
* Public product projections are writable only by authenticated inventory managers and store administrators (`isInventoryStaff()`).
* **Integrity Limitation (Temporary Compatibility)**: In the current architecture, projection synchronization is executed via client-side dual-write in `src/services/dbService.ts`. While security rules enforce role checks on both collections, a trusted backend service (Cloud Function / background worker) is required to eliminate reliance on client orchestration. Tracked under `PROD-001` and follow-up security task `SEC-005`.

### 8.4 Staff Credential Vault Authority (SEC-001-R4)
* `/staff_credentials/{staffId}` is completely closed to client SDKs: `allow read, write: if false;`.
* No client—including a client authenticated as Super Admin—can read or write to this collection directly.
* All credential operations (PIN validation, password resets, hash generation) must execute inside a trusted server environment using the Firebase Admin SDK.
* Plaintext PINs in the data layer remain tracked as `PARTIALLY MITIGATED` under `RISK-007` until cryptographic hashing (Argon2/bcrypt) is implemented.

### 8.5 Role Authority & Token Verification (SEC-001-R5)
* **Authoritative Source**: Firebase Auth Custom Claims (`request.auth.token.role`, `admin`, `permissions`) form the authoritative security boundary.
* **Secondary Lookup**: The `/staff/{uid}` document serves as the persistent profile. In the event of a mismatch between claims and the document, Firestore rules prioritize Custom Claims (`request.auth.token.role`), preventing client-side document tampering from escalating privileges.
* **Role-Change Workflow**: Administrative role updates must be synchronized by setting custom claims via Firebase Admin SDK (`setCustomUserClaims`) and updating `/staff/{uid}`.
* **Revocation Behavior**: Role downgrades or staff terminations must trigger token revocation (`revokeRefreshTokens`).
* **Follow-up Task**: Server-side custom claims synchronization engine tracked under `SEC-002`.

### 8.6 Audit Log Integrity Boundaries (SEC-001-R6)
* `/audit_logs/{logId}` is strictly append-only: `allow update, delete: if false;`.
* Only authenticated enterprise staff can create audit log records.
* **Integrity Limitation**: In the current client-side implementation, identity fields (`staffName`, `action`, `timestamp`) are populated by the client. While Firestore rules verify that the caller is authenticated staff, client-supplied timestamps and action strings are not tamper-proof server attestations.
* **Target Architecture**: `Authenticated Action → Trusted Server Pipeline → Immutable Audit Record`. Tracked under follow-up task `SEC-003`.

### 8.7 E-Commerce Untrusted Input Boundary (SEC-001-R7)
* Public browser storefronts are treated as untrusted clients.
* Public orders must be created with `status: 'Pending'` and `paymentStatus in ['Pending', 'Unpaid']`.
* Transition to `Completed` or `Paid` is forbidden to unauthenticated clients and reserved for sales staff or verified payment webhooks.
* **Integrity Limitation**: Item unit prices, subtotal, and tax calculated in the browser remain untrusted client inputs until server-side price re-calculation and payment gateway verification are deployed. Tracked under follow-up task `SEC-004`.


