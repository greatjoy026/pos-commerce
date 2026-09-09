# Architecture Baseline — Nexus POS-Commerce Suite

## 1. System Architecture

### 1.1 Architectural Layering (OBSERVED vs. RECOMMENDED)

The current system exhibits an emerging layered design, though several layers are currently collapsed into client-side view controllers.

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                     │
│  - Admin Suite Views (Dashboard, Inventory, POS, CRM, etc.) │
│  - E-Commerce Storefront Views & Drawers                    │
│  - Modals (ProductForm, AI Scanner, Units, Receipts)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ User Events & Input
┌──────────────────────────────▼──────────────────────────────┐
│            Application & State Coordination Layer           │
│  - App.tsx (State coordinator, event handlers, local cache) │
│  - CurrencyContext (Dynamic exchange rates & formatting)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Domain Operations
┌──────────────────────────────▼──────────────────────────────┐
│                    Domain & Business Logic                  │
│  - permissions.ts (RBAC evaluation, category definitions)   │
│  - reportsCalculations.ts (Financial & sales aggregations)  │
│  - aiPhotoExtractor.ts & productScanner.ts (OCR/Vision)     │
│  - Packaging & Multi-UOM Multiplier Deductions (in App.tsx) │
└──────────────────────────────┬──────────────────────────────┘
                               │ Persistence Calls
┌──────────────────────────────▼──────────────────────────────┐
│                  Data Access & Cloud Layer                  │
│  - dbService.ts (Firestore CRUD & onSnapshot subscriptions) │
│  - firebase.ts (Firebase app & Firestore instance setup)    │
│  - Cloud Firestore Database (Remote document storage)       │
└─────────────────────────────────────────────────────────────┘
```

#### Layering Assessment:
* **OBSERVED**: The application layer (`src/App.tsx`) currently directly executes core domain logic (e.g. stock deduction calculations across packaging tiers, variant stock updates, customer loyalty points accrual, and audit log generation) before dispatching writes to `dbService.ts`.
* **RECOMMENDED**: Extract domain-specific operations (such as order processing, inventory deduction, and customer loyalty calculation) into standalone domain services (`src/domain/inventory/`, `src/domain/orders/`, `src/domain/pricing/`) so that both POS and E-Commerce consume identical, testable domain rules.

---

## 2. Frontend Architecture

### 2.1 File & Module Organization (OBSERVED)
* **Entry Point**: `src/main.tsx` mounts `<App />` inside React `StrictMode` with global CSS (`src/index.css`) utilizing Tailwind CSS 4.
* **Component Directory (`src/components/`)**:
  * **Top-level modules**: `DashboardOverview.tsx`, `InventoryModule.tsx`, `POSModule.tsx`, `CRMModule.tsx`, `InvoiceModule.tsx`, `ReportsModule.tsx`, `SecurityModule.tsx`, `SettingsModule.tsx`, `ECommerceStorefront.tsx`.
  * **Specialized sub-folders**:
    * `ecommerce/`: Sub-components for catalog cards, cart drawers, filter sections, checkout modals, and navigation.
    * `product-form/`: 8-step wizard components (`Step1BasicInfo.tsx` through `Step8Review.tsx`), `PackagingUOMBuilder.tsx`, `CompositeBOMBuilder.tsx`. Note: Legacy step files (`StepBasicInfo.tsx`, etc.) coexist alongside numbered step files.
    * `reports/`: Categorized drilldown views (`financial/`, `inventory/`, `sales/`) with executive summaries.
    * `settings/`: Sectional editors for business profiles, taxes, receipts, POS terminals, and integrations.
    * `hooks/`: Custom hooks (e.g. `useCamera.ts` for camera capture and media streams).
    * `validation/`: Optical scanner and catalog validation rules (`scannerRules.ts`).
* **Context Directory (`src/context/`)**:
  * `CurrencyContext.tsx`: Provides real-time currency switching, formatted currency display, and exchange rate calculations.
* **Services Directory (`src/services/`)**:
  * `dbService.ts`: Firestore persistence, real-time snapshot subscriptions, error logging, and mock data seeding.
  * `aiPhotoExtractor.ts`: Optical recognition and mock visual feature extraction for packaging images.

---

## 3. Data Architecture & Firestore Collections

The database layer utilizes Google Cloud Firestore. The collections, schemas, and current authorization semantics are documented below:

### 3.1 `products` Collection
* **Path**: `/products/{productId}`
* **Purpose**: Authoritative catalog items containing identity, pricing, stock levels, variants, packaging tiers, and e-commerce flags.
* **Primary Key**: `productId` (string, e.g. `prod-1`, `843100...`)
* **Major Fields**: `name`, `sku`, `price`, `cost`, `stock`, `category`, `location`, `reorderPoint`, `barcode`, `qrCode`, `variants[]`, `packaging`, `packagingUnits[]`, `compositeComponents[]`, `bundleKitItems[]`, `status`, `productType`, `salesCount`.
* **Consumers**: `InventoryModule`, `POSModule`, `ECommerceStorefront`, `ReportsModule`, `DashboardOverview`.
* **Security Sensitivity**: High (contains supplier costs, inventory quantities, wholesale margins).
* **Current Authorization**:
  * `allow read: if true;`
  * `allow write: if isValidId(productId);`
  * *Audit*: No authentication or role-based check in rules. Any client knowing a valid ID string can modify or overwrite products.

### 3.2 `customers` Collection
* **Path**: `/customers/{customerId}`
* **Purpose**: Customer Relationship Management (CRM) directory with contact information, loyalty points, customer tiering, and purchase history IDs.
* **Primary Key**: `customerId` (string, e.g. `cust-1`, `cust-2`)
* **Major Fields**: `name`, `email`, `phone`, `loyaltyPoints`, `segment`, `purchaseHistoryIds[]`, `address`, `totalSpent`, `loyaltyTier`.
* **Consumers**: `CRMModule`, `POSModule`, `ECommerceStorefront`, `CustomerDetailDrawer`.
* **Security Sensitivity**: Critical (Contains personally identifiable customer information [PII]).
* **Current Authorization**:
  * `allow read: if true;`
  * `allow write: if isValidId(customerId);`
  * *Audit*: Unrestricted public read/write access.

### 3.3 `staff` Collection
* **Path**: `/staff/{staffId}`
* **Purpose**: Employee accounts, operator roles, avatars, active status, and PIN credentials for terminal switching.
* **Primary Key**: `staffId` (string, e.g. `staff-1`, `staff-2`)
* **Major Fields**: `name`, `email`, `role`, `avatar`, `pin`, `status`, `department`, `permissionsOverride[]`.
* **Consumers**: `SecurityModule`, `App.tsx` (active operator switcher), `POSModule`.
* **Security Sensitivity**: Critical (Contains PIN authentication codes and operator access privileges).
* **Current Authorization**:
  * `allow read: if true;`
  * `allow write: if isValidId(staffId);`
  * *Audit*: PIN codes are stored as plain strings in document data without rule-level read restriction.

### 3.4 `orders` Collection
* **Path**: `/orders/{orderId}`
* **Purpose**: Historical sales receipts and orders generated through in-store POS, e-commerce storefront, or mobile channels.
* **Primary Key**: `orderId` (string, e.g. `ORD-84920`, `ord-1`)
* **Major Fields**: `date`, `items[]`, `subtotal`, `tax`, `discount`, `total`, `paymentMethod`, `channel`, `customerId`, `customerName`, `status`, `cashierId`, `cashierName`, `receiptSentToEmail`.
* **Consumers**: `POSModule`, `InvoiceModule`, `ReportsModule`, `ECommerceStorefront`, `CRMModule`.
* **Security Sensitivity**: Critical (Contains financial transaction details, customer names, payment records).
* **Current Authorization**:
  * `allow read: if true;`
  * `allow write: if isValidId(orderId);`
  * *Audit*: Orders can be updated or overwritten by any client if a valid document ID string is provided.

### 3.5 `audit_logs` Collection
* **Path**: `/audit_logs/{logId}`
* **Purpose**: Immutable security and operational audit trail recording operator actions across all modules.
* **Primary Key**: `logId` (string, e.g. `log-102`)
* **Major Fields**: `timestamp`, `staffName`, `role`, `action`, `module`, `details`.
* **Consumers**: `SecurityModule`, `DashboardOverview`, `App.tsx`.
* **Security Sensitivity**: Critical (Integrity verification and compliance ledger).
* **Current Authorization**:
  * `allow read: if true;`
  * `allow create: if isValidId(logId);`
  * `allow update, delete: if false;`
  * *Audit*: Write protection prevents updates and deletions, but creations are unauthenticated.

### 3.6 `settings` Collection
* **Path**: `/settings/{settingId}`
* **Purpose**: Global enterprise configuration (company details, currency, tax rates, POS terminal parameters, receipt templates).
* **Primary Key**: `settingId` (string, e.g. `system`)
* **Major Fields**: `currency`, `businessName`, `taxRate`, `business`, `currencyConfig`, `tax`, `receipt`, `invoiceNumbering`, `pos`, `inventoryRules`, `lowStock`.
* **Consumers**: `SettingsModule`, `CurrencyContext`, `App.tsx`, `POSReceiptModal`.
* **Security Sensitivity**: Critical (Controls pricing rules, tax rates, and security lockouts).
* **Current Authorization**:
  * `allow read: if true;`
  * `allow write: if isValidId(settingId);`
  * *Audit*: Unrestricted write access with valid document ID.

### 3.7 `shift_reports` Collection (OBSERVED IN CODE, UNMAPPED IN RULES)
* **Path**: `/shift_reports/{shiftId}`
* **Purpose**: POS cashier shift opening/closing summaries, cash floats, card totals, and cash drawer reconciliations.
* **Observation**: Defined in `COLLECTIONS.SHIFT_REPORTS` (`src/services/dbService.ts`), but **omitted from `firestore.rules`**.
* **Impact**: Under current rules, writes to `/shift_reports/{shiftId}` are rejected by the default deny rule (`match /{document=**} { allow read, write: if false; }`).

---

## 4. Product Domain Architecture

### 4.1 Current Product Model (`src/types.ts`)
The `Product` interface in `src/types.ts` is a broad, composite domain model encompassing attributes from multiple evolutionary stages:

1. **Identity & Core Attributes**: `id`, `name`, `sku`, `barcode`, `qrCode`, `category`, `brand`, `model`, `description`.
2. **Pricing Structure**: `price` (retail), `cost`, `wholesalePrice`, `minimumPrice`, `pricingTiers` (object).
3. **Inventory Fields**:
   * Direct stock quantity: `stock` (number).
   * Reorder thresholds: `reorderPoint` (number).
   * Storage location: `location` ('Warehouse' | 'Store Shelf' | 'Fulfillment Center').
   * Tracking flags: `trackInventory`, `trackStock`, `trackSerial`, `trackBatch`, `trackExpiry`.
   * Tracking mode enum: `inventoryTracking?: TrackingMode` ('QUANTITY' | 'SERIAL' | 'BATCH' | 'NONE').
   * Rotation method enum: `stockRotationMethod?: RotationMethod` ('FIFO' | 'FEFO' | 'LIFO' | 'MANUAL').
   * Serial/Batch strings & arrays: `serialNumber`, `serialNumbers[]`, `batchNumber`, `batchLot`, `expiryDate`.
4. **Variant Structure**:
   * `variants: ProductVariant[]` (array containing `sku`, `size`, `color`, `model`, `stock`, `costPrice`, `retailPrice`, `barcode`).
5. **Packaging & Multi-UOM Structure**:
   * `packaging?: ProductPackagingConfig` (`hasPackaging`, `unitsPerPackage`, `packageCost`, `calculatedUnitCost`, `baseSellingUnitName`, `inventoryTrackingMode: 'auto_depackage' | 'dual_stock'`, `sealedPackageStock`, `looseUnitStock`, `sellingTiers[]`).
   * `packagingUnits?: PackagingUnit[]` (`unitName`, `multiplier`, `base_unit`, `sellingPrice`, `costPrice`, `isDefaultSellingUnit`, `isPackUnit`, `sellingMode`).
   * `bulkPackaging?: BulkPackagingConfig` (legacy/alternative packaging representation).
6. **Composite & Bill of Materials (BOM)**:
   * `components?: ProductComponentItem[]`
   * `compositeComponents?: CompositeComponentItem[]`
   * `bundleKitItems?: BundleKitItem[]`
7. **E-Commerce Attributes**:
   * `publishOnline`, `ecommerceCategory`, `seoTitle`, `seoDescription`, `urlSlug`, `rating`, `reviewCount`, `reviews[]`, `mediaGallery[]`, `images[]`.

### 4.2 Architectural Assessment of Product Model
* **OBSERVED**: The model contains overlapping representations of similar concepts:
  * Packaging has three representations: `ProductPackagingConfig`, `PackagingUnitsConfig`, and `BulkPackagingConfig`.
  * Serial numbers are stored both as single strings (`serialNumber`), string arrays (`serialNumbers[]`), and embedded in `inventoryRules`.
  * Variants hold independent stock counts, but top-level `stock` also exists on the product root.
* **TARGET ARCHITECTURAL MODEL (RECOMMENDED)**:
  Future normalization (planned for `PROD-001`) will separate structural product definitions from SKU identities and inventory records:
  ```
  Product (Catalog Definition, Brand, Category, Marketing)
     └── Variant (Attribute Option Matrix: Size, Color)
            └── SKU (Authoritative Inventory Entity, Barcode)
                   └── Inventory Record (Stock by Location, Serials, Batches)
  ```

---

## 5. Product Classification Architecture

### 5.1 Structural Product Types (OBSERVED in `types.ts`)
* `Standard`: Standalone physical product with direct stock.
* `Composite`: Product assembled from underlying components (Bill of Materials).
* `Bundle`: Kit or collection of existing products sold together under a bundled price.
* `Service`: Non-physical service (no inventory deduction).
* `Digital`: Downloadable or virtual digital product.
* `Rental`: Time-allocated rental asset.
* `Variant`: Product belonging to a parent matrix.
* `Physical`: Explicit physical goods flag.

### 5.2 Product Capabilities (Decoupled Architectural Model)
To maintain clean separation between product types and inventory behavior, capabilities are modeled as orthogonal feature flags:
* **Inventory Tracking**: Can be enabled or disabled regardless of product type.
* **Serial Tracking**: Per-unit serial number lifecycle verification.
* **Batch / Lot Tracking**: Batch number tracking with manufacturing and expiration dates.
* **Multi-UOM / Packaging**: Unit multipliers for cartons, dozens, and retail pieces.
* **Channel Saleability**: Orthogonal toggles for `sellOnPOS` and `sellOnline`.
* **Returnability**: Policy toggle for `returnable`.

---

## 6. Inventory Architecture

### 6.1 Stock Tracking Mechanisms (OBSERVED)
1. **Single-Unit Stock**: `p.stock` directly decremented on sales.
2. **Dual-Stock Packaging**:
   * Sealed packages stored in `packaging.sealedPackageStock`.
   * Loose units stored in `packaging.looseUnitStock`.
   * When selling a pack, sealed boxes are deducted. If an order requests loose units exceeding shelf stock, the system automatically "breaks bulk" (opens sealed cartons to replenish loose units).
3. **Auto-Depackage Mode**:
   * Inbound shipments in cartons are automatically converted to total base units upon receiving (`unitsPerPackage * packages`).
4. **Variant Stock**:
   * When a variant SKU matches an order line item, variant stock (`v.stock`) is decremented in parallel with root stock.

### 6.2 Architectural Gaps in Inventory (OBSERVED)
* **Serial and Batch Tracking**: Present in interfaces and UI mock data, but sales deduction logic in `App.tsx` does not yet decrement specific serial instances or batch lots via FEFO/FIFO algorithms.
* **Location Allocation**: Multi-location fields exist (`location: 'Warehouse' | 'Store Shelf' | 'Fulfillment Center'`), but multi-location stock balances are not split into location-specific ledger rows.
* **RECOMMENDED**: Formalize the inventory engine in `INV-001` to introduce transaction-based stock movements (`StockMovementRecord`) as the source of truth rather than direct integer mutation.

---

## 7. POS and E-Commerce Architecture

### 7.1 Cross-Channel Integration (OBSERVED)

```
                 ┌────────────────────────────────┐
                 │       Firestore Products       │
                 │          Collection            │
                 └───────────────┬────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                     ▼
       ┌──────────────┐                      ┌──────────────┐
       │  POS Module  │                      │ E-Commerce   │
       │  (In-Store)  │                      │ (Storefront) │
       └──────┬───────┘                      └──────┬───────┘
              │ POS Sale                            │ Online Sale
              ▼                                     ▼
       ┌────────────────────────────────────────────────────┐
       │               App.tsx State Handlers               │
       │    - handleProcessOrder()  /  handlePlaceEcom()    │
       │    - Multiplier calculation & stock deduction      │
       │    - Customer loyalty points increment             │
       └─────────────────────────┬──────────────────────────┘
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │        Firestore Orders        │
                 │           Collection           │
                 └────────────────────────────────┘
```

* **Shared Catalog**: Both POS and E-Commerce consume the identical `products` collection. If stock changes in POS, real-time snapshot listeners immediately update availability in the e-commerce storefront.
* **Shared Customer Loyalty**: Both channels update the customer's loyalty balance and append order IDs to `purchaseHistoryIds[]`.
* **Separate Channel Identifiers**: Orders record `channel: 'In-Store POS'` vs. `channel: 'Online Storefront'`.
* **Duplicated Code Observation**: `handleProcessOrder` (POS) and `handlePlaceEcomOrder` (E-Commerce) in `src/App.tsx` contain nearly duplicate implementations of the stock multiplier deduction and loyalty calculations.
* **RECOMMENDED**: Unify checkout processing into a single domain handler (`OrderDomainService.processOrder()`).

---

## 8. Order & Invoice Architecture

### 8.1 Order Status & Lifecycles (OBSERVED)
* **Order Statuses**: `'Completed' | 'Pending' | 'Refunded' | 'Partially Refunded' | 'Outstanding'`.
* **Payment Methods**: `'Cash' | 'Credit/Debit Card' | 'Digital Wallet' | 'Mobile Pay' | 'Bank Transfer' | 'Installments (Klarna/Afterpay)'`.
* **Line Item Snapshots**: Order line items capture snapshot data at the time of purchase:
  * `productId`, `productName`, `quantity`, `price`, `cost`, `variantSku`, `packagingTierName`, `packagingUnitName`, `unitMultiplier`, `base_unit`, `sellingMode`, `baseUnitsDeducted`.
  * *Assessment*: Line item snapshots preserve historical prices and packaging unit names, protecting past receipts against subsequent product edits.

---

## 9. Security Architecture & Authorization

### 9.1 Authentication (OBSERVED)
* Firebase Auth is initialized (`getAuth(app)` in `src/lib/firebase.ts`).
* Currently, user sessions do not log in via Firebase Auth; the active user is maintained as an in-memory `activeStaff` object (`StaffMember`) in `App.tsx`.
* Terminal switches are verified using a 4-digit PIN in `SecurityModule.tsx`.

### 9.2 Client-Side RBAC (OBSERVED)
* Complete client-side RBAC engine implemented in `src/utils/permissions.ts`.
* 14 Staff Roles: `Super Admin`, `Business Owner`, `Inventory Manager`, `Warehouse Manager`, `Cashier`, `Sales Manager`, `Purchasing Officer`, `Accountant`, `Store Manager`, `E-commerce Manager`, `Admin`, `Manager`, `Warehouse Staff`, `Viewer`.
* 40+ granular permission keys categorized into `inventory`, `sales`, `purchase`, `finance`, `crm`, `ecommerce`, `users`, `system`.
* `hasPermission(role, permissionKey, overrides)` evaluates UI permissions.

### 9.3 Firestore Security Rules (OBSERVED P0 VULNERABILITY)
* Current `firestore.rules` rely on:
  ```javascript
  function isValidId(id) {
    return id is string && id.size() > 0 && id.size() <= 128;
  }
  ```
* All collections (`products`, `customers`, `staff`, `orders`, `settings`) allow public reads and writes as long as `isValidId` is true.
* **Critical Finding**: `isValidId` performs structural string length validation on the document ID, not user authorization. Anyone with the Firestore database URL can read and modify all customer PII, staff records, orders, and products.
* **Required Action**: Documented as **P0 Security Risk (RISK-001)** to be addressed in task `SEC-001`.

---

## 10. Inventory Domain Architecture & Authoritative Contracts (INV-001 / INV-001-F1.1)

### 10.1 Authoritative Quantity Contract (Option A: Discrete Integer Units)
* **Contract Specification**: All operational inventory quantities (`quantityOnHand`, `quantityReserved`, `reorderPoint`, `reorderQuantity`) are strictly non-negative discrete integers (`Number.isInteger(qty) && qty >= 0`).
* **Boundary Alignment**:
  * **TypeScript Domain Layer**: `src/domain/inventory/validation.ts` rejects non-integers, fractional values (e.g. 1.5), `NaN`, and `Infinity` with `INVALID_TYPE` validation errors.
  * **Firestore Persistence Rules**: `firestore.rules` enforces `data.quantityOnHand is int && data.quantityOnHand >= 0` and `data.quantityReserved is int && data.quantityReserved >= 0`.
  * **Schema Blueprint**: `firebase-blueprint.json` explicitly assigns `{ "type": "integer" }` to all inventory quantity attributes.
  * **User Interface Controls**: All stock and reorder input fields (`StepInventory.tsx`, `Step3Inventory.tsx`, `PackagingUOMBuilder.tsx`, `Step2Variants.tsx`) enforce `step="1"` and `parseInt(e.target.value, 10)`.
* **Rationale**: The catalog architecture handles fractional physical realities via discrete base units with explicit packaging multipliers (`PackagingUOMBuilder`, e.g. 1 box = 30 pieces). Any future continuous measurement (e.g., weighable bulk goods) must be introduced through fixed-point integer scaling (e.g., milligram or gram integers) or a formal fractional migration.

### 10.2 Tracking Mode Invariants

#### 10.2.1 SERIAL Tracking Mode
* **Scope**: High-value, individually serialized items (e.g. electronic devices, serialized assets).
* **Invariants**:
  1. `quantityOnHand == serialNumbers.length`: Exact one-to-one correspondence between on-hand quantity and registered serial numbers.
  2. Every serial number in `serialNumbers` must be a non-empty string.
  3. All serial numbers in `serialNumbers` must be unique (no duplicates within the record).
  4. Zero inventory (`quantityOnHand == 0`) requires an empty array (`serialNumbers: []`).
  5. Batch fields (`batchNumber`, `expiryDate`) are strictly forbidden when `trackingMode == 'SERIAL'`.

#### 10.2.2 BATCH Tracking Mode
* **Scope**: Perishable, lot-based, or pharmaceutical goods requiring lot traceability.
* **Invariants**:
  1. `batchNumber` is mandatory, non-empty, and constrained in size.
  2. `expiryDate` when provided must be a valid ISO 8601 string.
  3. `serialNumbers` is strictly forbidden when `trackingMode == 'BATCH'`.
  4. Multiple batches of the same SKU and location are first-class citizens and coexist concurrently as distinct inventory records.

#### 10.2.3 QUANTITY and NONE Modes
* **QUANTITY**: Standard tracked stock without serial or batch metadata (`serialNumbers`, `batchNumber`, and `expiryDate` are forbidden).
* **NONE**: Untracked virtual items or non-inventory services (`quantityOnHand == 0`, `quantityReserved == 0`, no serial/batch fields).

### 10.3 Logical Identity Rules
* Canonical inventory document identity is derived via `getInventoryRecordKey()`:
  * **Standard / Quantity / None**: `SKU::LOCATION` (e.g., `SKU-100::loc-warehouse`).
  * **Batch-Tracked Items**: `SKU::LOCATION::BATCH` (e.g., `SKU-100::loc-warehouse::LOT-2026-A`).
* Distinct locations for the same SKU (`SKU-A::LOC-1` vs `SKU-A::LOC-2`) and distinct batches for the same SKU at the same location (`SKU-A::LOC-1::BATCH-1` vs `SKU-A::LOC-1::BATCH-2`) generate non-colliding keys and independent Firestore records.

### 10.4 Enforcement Boundaries and Firestore Security Rules Capabilities & Limitations

The inventory architecture implements defense-in-depth across the TypeScript domain validation layer and Firestore Security Rules. However, due to the execution semantics of Firestore CEL (Common Expression Language), certain validations are partitioned:

#### 10.4.1 Enforced at the Firestore Security Rules Boundary
1. **Quantity Types & Invariants**: Enforces strict integer types (`int`), non-negativity (`>= 0`), and reservation ceiling (`quantityReserved <= quantityOnHand`).
2. **SERIAL Cardinality**: Enforces exact match between array size and on-hand stock (`serialNumbers.size() == quantityOnHand`).
3. **SERIAL Array-Wide Uniqueness**: Leverages `serialNumbers.toSet().size() == serialNumbers.size()` to reject duplicate serials across the entire array at the database engine level.
4. **SERIAL Array-Wide Non-Empty String Check**: Leverages `!serialNumbers.hasAny([''])` to reject empty string serials anywhere in the array.
5. **SERIAL Boundary Sizing**: Validates string type and size bounds on head and tail array elements (`[0]` and `[size() - 1]`).
6. **BATCH Structural Integrity**: Enforces mandatory non-empty `batchNumber` (`1 <= size <= 100`) and structural length bounds on `expiryDate` (`10 <= size <= 40`).
7. **Tracking Mode Isolation**: Forbids batch fields on serial records and forbids serial arrays on batch records.

#### 10.4.2 Firestore CEL Limitations (Authoritatively Enforced in TypeScript Domain)
1. **CEL Unbounded Loop Limitation**: Firestore Security Rules CEL does not possess unbounded loops (`for`, `while`) or list comprehension iteration macros over arbitrary collections. While array-wide uniqueness and non-empty checks are enforced in rules via `toSet()` and `hasAny()`, exhaustive per-element string sanitization and custom regex formatting on every individual serial are enforced authoritatively by `src/domain/inventory/validation.ts`.
2. **ISO 8601 Date Semantic Limitation**: Firestore Rules CEL lacks built-in regex pattern matching and string-to-timestamp parsing functions for arbitrary ISO strings. Rules enforces structural string bounds (`10 <= size <= 40`), while full calendar semantic validation (leap years, month/day boundaries, ISO 8601 formatting) is authoritatively enforced by `src/domain/inventory/validation.ts`.
3. **Public Product Availability**: In alignment with `PROD-001-F2.1` and `firebase-blueprint.json`, raw numeric stock is strictly prohibited from the public storefront projection (`/public_products`), requiring categorical availability (`availability.status`).

