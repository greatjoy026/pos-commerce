/**
 * Canonical Product Domain Types (PROD-001)
 *
 * Establishes the authoritative domain model:
 * Product -> Variant -> SKU -> Inventory (INV-001 is a separate future task)
 *
 * Follows the Single Source of Truth architectural principle:
 * One canonical product domain, multiple consumers (POS, E-Commerce, Reporting).
 */

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

/**
 * Authoritative SKU Identity Entity
 * Represents a uniquely identifiable, scannable, sellable stock keeping unit.
 */
export interface ProductSku {
  sku: string;
  barcode?: string;
  productId: string;
  variantId?: string;
  sellableName: string;
  price: number;
  cost?: number;
  attributes?: Record<string, string>;
  stock?: number;
}

/**
 * Authoritative Variant Entity
 * Represents a distinct physical or marketable variation of a parent product
 * (e.g. Size: Large, Color: Midnight Black).
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
  stock: number;
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
 * Operational & Inventory State (Transitional — Scheduled for decoupling in INV-001)
 * Preserved here with strict backward compatibility for existing POS/Inventory workflows.
 */
export interface ProductOperationalState {
  stock: number;
  cost: number;
  location: 'Warehouse' | 'Store Shelf' | 'Fulfillment Center';
  reorderPoint: number;
  trackingMode: CanonicalTrackingMode;
  stockRotationMethod: CanonicalRotationMethod;
  serialNumbers?: string[];
  batchNumber?: string;
  expiryDate?: string;
  unit: string;
}

/**
 * Canonical Product Entity
 * The root aggregate of the product/catalog domain.
 */
export interface CanonicalProduct {
  id: string;
  sku: string; // Primary base SKU reference
  barcode?: string;
  qrCode?: string;
  merchandising: ProductMerchandising;
  classification: ProductClassification;
  lifecycle: ProductLifecycle;
  variants: CanonicalVariant[];
  operational: ProductOperationalState;
  
  // Normalized multi-unit & packaging configuration (transitional)
  packagingUnits?: {
    id: string;
    unitName: string;
    multiplier: number;
    baseUnit: string;
    sellingPrice: number;
    barcode?: string;
    sku?: string;
    isDefaultSellingUnit?: boolean;
    isPackUnit?: boolean;
  }[];
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
