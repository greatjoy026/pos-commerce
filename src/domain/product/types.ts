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

import { ProductReview } from '../../types';

export type CanonicalProductStatus = 'Active' | 'Draft' | 'Archived';

export type CanonicalProductType =
  | 'Standard'
  | 'Composite'
  | 'Bundle'
  | 'Service'
  | 'Digital'
  | 'Rental'
  | 'Physical';

export type CanonicalTrackingMode = 'QUANTITY' | 'SERIAL' | 'BATCH' | 'NONE';
export type CanonicalRotationMethod = 'FIFO' | 'FEFO' | 'LIFO' | 'MANUAL';

export type SkuType = 'base' | 'variant' | 'packaging';

export type PublicAvailabilityStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface PublicAvailabilityInfo {
  status: PublicAvailabilityStatus;
}

export interface PublicVariantProjection {
  sku: string;
  size?: string;
  color?: string;
  availability: PublicAvailabilityInfo;
  retailPrice?: number;
  imageUrl?: string;
  isActive?: boolean;
}

export interface PublicProductProjection {
  id: string;
  name: string;
  sku: string;
  price: number;
  availability: PublicAvailabilityInfo;
  category: string;
  imageUrl?: string;
  description?: string;
  brand?: string;
  model?: string;
  rating?: number;
  reviewCount?: number;
  originalPrice?: number;
  discountPercent?: number;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  images?: string[];
  specifications?: Record<string, string>;
  reviews?: ProductReview[];
  unit?: string;
  publishOnline?: boolean;
  variants?: PublicVariantProjection[];
}

/**
 * Authoritative SKU Identity Entity
 * Represents a uniquely identifiable, scannable, sellable stock keeping unit.
 *
 * ARCHITECTURAL RULE:
 * A SKU identifies a sellable item. It must have one unambiguous meaning throughout the application.
 * ProductSku MUST NOT become an inventory model. It contains NO warehouse quantities,
 * stock balances, or inventory valuations.
 */
export interface ProductSku {
  sku: string;
  barcode?: string;
  productId: string;
  variantId?: string;
  packagingUnitId?: string;
  skuType: SkuType;
  sellableName: string;
  price: number;
  attributes?: Record<string, string>;
}

/**
 * Authoritative Variant Entity
 * Represents a distinct physical or marketable variation of a parent product
 * (e.g. Size: Large, Color: Midnight Black).
 *
 * ARCHITECTURAL INVARIANT:
 * Authoritative inventory quantities MUST NOT live inside the canonical Variant.
 * `variant.stock` is strictly removed from this canonical model.
 */
export interface CanonicalVariant {
  id: string;
  productId: string;
  sku: string;
  barcode?: string;
  name: string;
  attributes: Record<string, string>; // e.g. { size: 'Large', color: 'Midnight Black' }
  pricing: {
    retailPrice: number;
    costPrice?: number;
    wholesalePrice?: number;
    minimumPrice?: number;
  };
  isActive: boolean;
  imageUrl?: string;
  isDefault?: boolean;
}

/**
 * Product Merchandising & Media Information
 */
export interface ProductMerchandising {
  name: string;
  description: string;
  brand?: string;
  model?: string;
  imageUrl?: string;
  images: string[];
  rating: number;
  reviewCount: number;
  specifications: Record<string, string>;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  originalPrice?: number;
  discountPercent?: number;
}

/**
 * Product Classification
 */
export interface ProductClassification {
  category: string;
  productType: CanonicalProductType;
  tags: string[];
  taxCategory?: string;
  isTaxExempt?: boolean;
}

/**
 * Product Lifecycle & Channel Visibility
 */
export interface ProductLifecycle {
  status: CanonicalProductStatus;
  visibility: {
    publishOnline: boolean;
    sellOnPOS: boolean;
    sellOnline: boolean;
  };
  returnable: boolean;
  shippingEnabled?: boolean;
  storePickup?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Standardized Packaging Unit Configuration (Catalog Definition)
 * Defines alternative selling units (e.g. 6-Pack, Box of 24) with price multipliers.
 * Does NOT perform inventory deduction or warehouse calculations (deferred to INV-001).
 */
export interface PackagingUnitInfo {
  id: string;
  unitName: string;
  multiplier: number;
  baseUnit: string;
  sellingPrice: number;
  barcode?: string;
  sku?: string;
  isDefaultSellingUnit?: boolean;
  isPackUnit?: boolean;
}

/**
 * Canonical Product Entity
 * The root aggregate of the product/catalog domain.
 *
 * ARCHITECTURAL INVARIANT:
 * Contains ONLY product/catalog identity concerns.
 * Inventory state (stock, cost, reorderPoint, location, serial numbers, batches)
 * is strictly isolated in transitional compatibility adapters until INV-001.
 */
export interface CanonicalProduct {
  id: string;
  sku: string; // Authoritative base catalog SKU
  barcode?: string;
  qrCode?: string;
  merchandising: ProductMerchandising;
  classification: ProductClassification;
  lifecycle: ProductLifecycle;
  variants: CanonicalVariant[];
  packagingUnits?: PackagingUnitInfo[];
}

/**
 * Operational & Inventory State (Transitional — Scheduled for full decoupling in INV-001)
 * Preserved strictly in compatibility adapters for legacy UI, NOT in CanonicalProduct.
 */
export interface ProductOperationalState {
  stock: number;
  cost: number;
  location: 'Warehouse' | 'Store Shelf' | 'Fulfillment Center' | string;
  reorderPoint: number;
  trackingMode: CanonicalTrackingMode;
  stockRotationMethod: CanonicalRotationMethod;
  serialNumbers?: string[];
  batchNumber?: string;
  expiryDate?: string;
  unit: string;
}

/**
 * Typed inputs for untrusted / legacy product data (Section 7)
 */
export interface LegacyPackagingUnitInput {
  id?: string;
  unitName?: string;
  name?: string;
  multiplier?: number;
  unitQuantity?: number;
  base_unit?: string;
  baseUnit?: string;
  sellingPrice?: number;
  barcode?: string;
  sku?: string;
  isDefaultSellingUnit?: boolean;
  isPackUnit?: boolean;
  sellingMode?: string;
}

export interface LegacyVariantInput {
  id?: string;
  productId?: string;
  sku?: string;
  barcode?: string;
  name?: string;
  size?: string;
  color?: string;
  model?: string;
  optionName?: string;
  attributes?: Record<string, string>;
  pricing?: {
    retailPrice?: number;
    costPrice?: number;
    wholesalePrice?: number;
    minimumPrice?: number;
  };
  retailPrice?: number;
  costPrice?: number;
  wholesalePrice?: number;
  stock?: number;
  isActive?: boolean;
  imageUrl?: string;
  isDefault?: boolean;
}

export interface LegacyProductOperationalInput {
  stock?: number;
  cost?: number;
  location?: 'Warehouse' | 'Store Shelf' | 'Fulfillment Center' | string;
  reorderPoint?: number;
  trackingMode?: CanonicalTrackingMode;
  inventoryTracking?: string;
  trackStock?: boolean;
  trackSerial?: boolean;
  trackBatch?: boolean;
  stockRotationMethod?: CanonicalRotationMethod;
  serialNumbers?: string[];
  serialNumber?: string;
  batchNumber?: string;
  batchLot?: string;
  expiryDate?: string;
  unit?: string;
}

export interface LegacyProductInput extends LegacyProductOperationalInput {
  id?: string;
  name?: string;
  sku?: string;
  price?: number;
  category?: string;
  barcode?: string;
  qrCode?: string;
  brand?: string;
  model?: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  specifications?: Record<string, string>;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  originalPrice?: number;
  discountPercent?: number;
  productType?: CanonicalProductType;
  tags?: string[];
  taxCategory?: string;
  isTaxExempt?: boolean;
  status?: CanonicalProductStatus;
  publishOnline?: boolean;
  sellOnPOS?: boolean;
  sellOnline?: boolean;
  returnable?: boolean;
  shippingEnabled?: boolean;
  storePickup?: boolean;
  createdAt?: string;
  updatedAt?: string;
  variants?: LegacyVariantInput[];
  packagingUnits?: LegacyPackagingUnitInput[];
  packaging?: {
    baseSellingUnitName?: string;
    sellingTiers?: {
      id?: string;
      name?: string;
      unitQuantity?: number;
      sellingPrice?: number;
      barcode?: string;
      sku?: string;
      isDefaultSellingUnit?: boolean;
    }[];
    packagingUnits?: LegacyPackagingUnitInput[];
  };
  bulkPackaging?: unknown;
  merchandising?: Partial<ProductMerchandising>;
  classification?: Partial<ProductClassification>;
  lifecycle?: Partial<ProductLifecycle>;
  operational?: Partial<ProductOperationalState>;
  salesCount?: number;
  reviews?: ProductReview[];
}

/**
 * Product Validation Results
 */
export interface ProductValidationError {
  field: string;
  message: string;
}

export interface ProductValidationResult {
  isValid: boolean;
  errors: ProductValidationError[];
}
