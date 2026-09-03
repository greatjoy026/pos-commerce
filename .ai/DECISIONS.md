# Architecture Decision Register (ADR) — Nexus POS-Commerce Suite

## Overview
This register records foundational architectural decisions for `greatjoy026/pos-commerce`. For every decision, the current state, target state, and implementation status are explicitly distinguished.

---

### ADR-001: Evolution Toward Shared Domain Architecture with Specialized Experiences

* **Status**: `PROPOSED / APPROVED IN PRINCIPLE`
* **Context**: The application currently concentrates state, handlers, and views within a single React SPA (`App.tsx`), handling in-store POS, warehouse inventory, financial invoicing, CRM, and an e-commerce storefront.
* **Decision**: Avoid both extremes:
  1. A monolithic super-app frontend where all operational logic is hardcoded into view components; and
  2. Disconnected, fragmented sub-systems with duplicated models.
  Instead, evolve toward a **shared domain core** (shared catalog, inventory, orders, customer CRM) with specialized UI surface experiences (Admin POS register, eCommerce storefront, Warehouse terminal).
* **Current State**: Monolithic state controller in `App.tsx` managing both POS and E-Commerce.
* **Target State**: Clean separation into a shared domain layer (`/src/domain/`) with dedicated presentation adapters.

---

### ADR-002: Shared Authoritative Catalog and Inventory Truth Between POS and E-Commerce

* **Status**: `IN PROGRESS`
* **Context**: Both in-store POS terminals and online storefronts sell from the same product catalog and physical stock pool.
* **Decision**: POS and e-commerce must share the exact same authoritative product, catalog, and inventory domain truth. Both channels must execute stock deductions against the same base units and synchronize in real-time via Firestore snapshot listeners.
* **Current State**: Both channels read from the same Firestore `products` collection, but checkout deduction logic is duplicated between `handleProcessOrder` and `handlePlaceEcomOrder` in `App.tsx`.
* **Target State**: A unified `OrderDomainService` processes order creation and stock decrement for all channels.

---

### ADR-003: Decoupling Structural Product Types from Inventory Capabilities

* **Status**: `PROPOSED`
* **Context**: `src/types.ts` contains `ProductType` ('Standard', 'Composite', 'Bundle', 'Service', 'Digital', 'Rental') intertwined with flags like `trackInventory`, `trackSerial`, `trackBatch`, `trackExpiry`.
* **Decision**: Model **Structural Product Types** (how an item is assembled or defined) orthogonally from **Inventory Capabilities** (how stock is tracked, rotated, or fulfilled).
* **Current State**: Product interface mixes structural types with tracking booleans and embedded arrays.
* **Target State**: Clean type discrimination where capabilities are defined as composable feature traits.

---

### ADR-004: SKU as the Authoritative Inventory Identity

* **Status**: `PROPOSED`
* **Context**: Currently, the product ID (`Product.id`) often doubles as the primary stock identifier, while `Product.variants[]` have their own nested `sku` and `stock`.
* **Decision**: SKU must become the single authoritative identifier for inventory tracking, purchasing, barcode scanning, and stock movement. A single Product may map to one or more SKUs (via variants or packaging units).
* **Current State**: Top-level `Product.stock` exists alongside `ProductVariant.stock`, occasionally requiring dual updates.
* **Target State**: Inventory balances are held strictly at the SKU level. Top-level product stock is derived as an aggregate.

---

### ADR-005: Decoupled Serial and Batch Records vs. Embedded Arrays

* **Status**: `PROPOSED`
* **Context**: Currently, serial numbers and batch lot details are defined as optional arrays inside the `Product` entity (`serialNumbers?: string[]`, `batchLot?: string`).
* **Decision**: Serials, lots, and batches must be stored as individual inventory tracking records in an inventory subcollection or dedicated ledger, rather than unbounded arrays embedded inside the product document.
* **Current State**: Embedded arrays in `Product` types and mock data.
* **Target State**: Separate `inventory_items` or `stock_batches` collection referencing the parent SKU.

---

### ADR-006: Authoritative Base Units with Consistent UOM Conversions

* **Status**: `PARTIALLY IMPLEMENTED (App.tsx)`
* **Context**: Items sold in packs, cartons, boxes, or retail units require consistent mathematical conversion back to the physical base unit (e.g. 1 box of 30 bars = 30 base units).
* **Decision**: Inventory quantities must always be accounted for in an **authoritative base unit**. All selling tiers and packaging units (dozen, carton, pack) must apply deterministic multiplier conversions at point of sale and receiving.
* **Current State**: Multipliers are calculated in `App.tsx` using `orderItem.unitMultiplier` or `packagingUnits` lookups with `dual_stock` / `auto_depackage` logic.
* **Target State**: Formalized in a dedicated `UOMConversionService` supporting custom purchase packaging and retail selling units.
