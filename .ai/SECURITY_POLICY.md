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
