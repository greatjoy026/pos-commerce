# Project Context — Nexus POS-Commerce Suite

## 1. Project Identification

* **Project Name**: Nexus POS-Commerce Suite
* **Repository**: `greatjoy026/pos-commerce`
* **Target Audience**: Retail businesses, omnichannel merchants, multi-branch store operators, and warehouse managers requiring integrated in-store POS, e-commerce storefront, inventory tracking, financial invoicing, and CRM loyalty.

---

## 2. Technology Stack (OBSERVED)

### 2.1 Core Framework & Runtime
* **Runtime**: Node.js (with browser execution via Vite bundle)
* **Frontend Framework**: React 19 (`react@19.0.1`, `react-dom@19.0.1`)
* **Language**: TypeScript 5.8 (`typescript@~5.8.2`, configured in `tsconfig.json` with strict type-checking and ESNext module resolution)
* **Build System & Bundler**: Vite 6 (`vite@^6.2.3`, `@vitejs/plugin-react@^5.0.4`)
* **Styling**: Tailwind CSS 4 (`tailwindcss@^4.1.14`, `@tailwindcss/vite@^4.1.14` directly integrated via `@import "tailwindcss";` in `src/index.css`)
* **Animation**: Motion (`motion@^12.23.24`)
* **Iconography**: Lucide React (`lucide-react@^0.546.0`)
* **Data Visualization**: Recharts (`recharts@^3.9.2`)
* **Barcode Rendering**: JsBarcode (`jsbarcode@^3.12.3`, `@types/jsbarcode@^3.11.4`)
* **Server & Dev Support**: Express 4.21 (`express@^4.21.2`), `tsx@^4.21.0`, `esbuild@^0.25.0`

### 2.2 Cloud Services & SDKs (OBSERVED)
* **Backend as a Service**: Firebase 12 (`firebase@^12.17.1`)
  * **Database**: Cloud Firestore (Database ID: `ai-studio-nexusposcommerce-d2deaf29-88c9-4563-a26f-04f5e6504d77`, Project: `gen-lang-client-0207800002`)
  * **Authentication**: Firebase Auth (Initialized via `getAuth(app)` in `src/lib/firebase.ts`, currently unauthenticated/anonymous)
  * **Configuration**: Defined in `firebase-applet-config.json` and `firebase-blueprint.json`
* **AI Capabilities**: Google GenAI SDK (`@google/genai@^2.4.0`)
  * Multi-angle packaging photo extraction and computer vision parsing in `src/services/aiPhotoExtractor.ts` and `src/components/services/productScanner.ts`

---

## 3. Architecture Overview

### 3.1 Frontend Architecture (OBSERVED)
* Single-Page Application (SPA) mounted at `src/main.tsx` and served via `index.html`.
* **State Management**: Centralized application state in `src/App.tsx` (`useState` hooks for products, customers, orders, staff, audit logs, system settings, cart, offline queue).
* **Persistence & Synchronization**: Dual-tier persistence:
  * Primary: Firestore real-time snapshot listeners (`onSnapshot` via `src/services/dbService.ts`).
  * Fallback: Browser `localStorage` (`nexus_products`, `nexus_customers`, `nexus_orders`, `nexus_audit_logs`, `nexus_system_settings`).
* **Context**: `CurrencyContext` (`src/context/CurrencyContext.tsx`) provides dynamic multi-currency formatting (Sierra Leone Leone `SLE`, USD, EUR, GBP, NGN, GHS, KES) and exchange rate calculation across all modules.

### 3.2 Navigation & Layout Structure (OBSERVED)
* **Master Header**: Real-time cloud sync telemetry indicator, active operator profile switcher, and dual-mode environment toggle between **Admin Suite** and **eCommerce Storefront**.
* **Admin Suite**: Fixed collapsible sidebar (`EnhancedSidebar.tsx`) hosting 8 primary operational modules:
  1. **Dashboard**: High-level telemetry, revenue, quick reorder shortcuts, and recent audit logs.
  2. **Inventory**: Catalog management, product hierarchy (8-step builder), bulk packaging / UOM configuration, and stock levels.
  3. **POS**: Barcode scanning, multi-tier selling units, cart management, parked tabs, payment tender, and receipt generation.
  4. **CRM**: Customer directories, purchase history, loyalty tiering, broadcast campaigns, and support tickets.
  5. **Invoices**: Tax invoice generation, payment status tracking, PDF printing, and credit notes.
  6. **Reports**: Detailed analytical drilldowns for Inventory, Sales, and Financial performance.
  7. **Security**: Staff directory, PIN-based switching, role-based permission matrix (14 roles, 40+ permissions), and immutable audit trail.
  8. **Settings**: Central enterprise configuration (tax, receipts, invoice sequence, hardware integrations, delivery zones).
* **eCommerce Storefront**: Customer-facing shopping interface with hero banners, category filters, wishlist drawer, product modal, customer account portal, and instant checkout.

---

## 4. Current Application Capabilities (OBSERVED)

### 4.1 Product Catalog & Packaging
* Supports `Product` entities with base attributes (SKU, barcode, price, cost, stock, location, reorder point).
* Supports rich product types: `Standard`, `Composite` (Bill of Materials), `Bundle` (Kits), `Service`, `Digital`, `Rental`.
* Supports packaging hierarchies: Single pieces, packs, boxes, cartons with `Dual Stock` and `Auto Depackage` tracking.
* AI packaging scanner (`AIProductPhotoScannerModal.tsx`) for automated SKU/barcode/spec extraction from camera capture.

### 4.2 Point of Sale (POS)
* Optical laser scanner simulation and camera barcode scanning.
* Dynamic unit picker (e.g. piece vs. carton selling with automatic price and multiplier resolution).
* Split payment tender (Cash, Card, Digital Wallet, Mobile Money).
* Parked orders / held tabs drawer.
* Thermal receipt modal (80mm, 58mm, standard A4) with barcode and QR verification.

### 4.3 E-Commerce Storefront
* Synchronized real-time catalog consumption from the same Firestore collection.
* Online customer checkout modal with delivery fee calculation, coupon redemption, and order dispatching.
* Customer profile registration and order history tracking.

### 4.4 Inventory & Stock Control
* Replenishment reorder handling (`handleQuickReorder` in `App.tsx`).
* Stock movement logging and stock adjustment variance tracking.
* Low-stock warnings and critical threshold indicators.

### 4.5 Financial & Shift Management
* Comprehensive financial reporting (Revenue, COGS, Gross Margin, Discounts, Refunds).
* Shift opening, cash float tracking, cash drawer reconciliation, and Z-report modal (`ShiftSummaryModal.tsx`).

---

## 5. Architectural Trajectory & Future Direction

* **OBSERVED**: Products, inventory, orders, and customer data are managed in client state in `src/App.tsx` and pushed to Firestore document-by-document.
* **INFERRED**: The application is intended to scale into an enterprise multi-branch, multi-tenant POS platform where POS registers and online storefronts share a unified backend service layer.
* **RECOMMENDED**:
  1. Decouple business logic and database writes from `App.tsx` into dedicated domain service handlers.
  2. Implement backend/rules-level multi-tenant isolation and security enforcement (SEC-001).
  3. Formalize the Product -> Variant -> SKU -> Inventory normalization pipeline (PROD-001 / INV-001).
