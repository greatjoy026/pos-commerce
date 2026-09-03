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
