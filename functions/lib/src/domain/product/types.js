"use strict";
/**
 * Canonical Product Domain Types (PROD-001 / PROD-001-F1 / PROD-001-F2)
 *
 * Architectural Principle:
 * The canonical Product domain represents product/catalog identity ONLY.
 * It does NOT contain authoritative inventory, stock ledgers, or warehouse state.
 *
 * Formal Domain Hierarchy (ADR-015):
 * Product
 *     ↓
 * Variant
 *     ↓
 * SKU
 *     ↓
 * Inventory (Operational state belonging to INV-001)
 *
 * Definitions:
 * - Product: Catalog-level product identity and merchandising concept. It is not inventory.
 * - Variant: Distinct sellable configuration of a Product (e.g. Size: Medium / Color: Black).
 * - SKU: Uniquely sellable unit identifier with unambiguous meaning across the catalog.
 * - Inventory: Operational quantity/balance/state of a SKU (strictly isolated from Product/Variant/SKU).
 *
 * Product.sku Semantics:
 * - Simple Product: Single-SKU product where CanonicalProduct.sku matches the single default
 *   variant's SKU for backward compatibility.
 * - Multi-Variant Product: CanonicalProduct.sku is the base family/model catalog identifier,
 *   while each CanonicalVariant has its own distinct sellable SKU (e.g., APP-TEE-01 vs APP-TEE-01-S-BLK).
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=types.js.map