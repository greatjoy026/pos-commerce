/**
 * Authoritative POS Inventory Resolution Layer (POS-001)
 *
 * Implements canonical inventory line resolution for POS sales:
 * - POS product selection → Canonical Product / Variant / SKU resolution
 * - Multi-tier packaging / UOM unit conversion → base quantity calculation
 * - Store / location ID resolution (no arbitrary unsafe defaults)
 * - Custom & Service item discrimination (bypasses inventory deduction)
 * - Batch & Serial tracking validation
 * - Deterministic operation ID generation for atomic idempotency
 */

import { CartItem, Product, ProductVariant } from '../../types';
import { DEFAULT_LOCATION_ID } from '../inventory/types';
import { buildInventoryRecordId } from '../inventory/adapters';

export interface PosSaleLineRequest {
  sku: string;
  productId: string;
  variantId?: string;
  locationId: string;
  inventoryId?: string;
  quantity: number; // base inventory quantity
  operationId: string;
}

export interface RecordPosSaleRequest {
  orderId: string;
  storeLocationId: string;
  lines: PosSaleLineRequest[];
}

export interface PosSaleLineResult {
  operationId: string;
  movementId: string;
  inventoryId: string;
  sku: string;
  quantityBefore: number;
  quantityAfter: number;
}

export interface RecordPosSaleResult {
  orderId: string;
  success: boolean;
  lineResults: PosSaleLineResult[];
  timestamp: string;
}

export interface PosLineResolutionParams {
  cartItem: CartItem;
  orderId: string;
  lineIndex: number;
  storeLocationId?: string;
  catalogProducts?: Product[];
}

export interface ResolvedPosInventoryLine {
  /** Authoritative SKU identifier for inventory lookup */
  sku: string;
  /** Primary product aggregate ID */
  productId: string;
  /** Canonical variant ID if item is a variant */
  variantId?: string;
  /** Resolved inventory location ID */
  locationId: string;
  /** Inferred or explicit inventory document ID */
  inventoryId: string;
  /** Base inventory quantity to deduct (selling quantity × unitMultiplier) */
  quantity: number;
  /** Deterministic operation ID for idempotency: pos_<orderId>_<lineIndex> */
  operationId: string;
  /** Human-readable sellable title */
  sellableName?: string;
  /** Packaging multiplier used during conversion */
  unitMultiplier?: number;
  /** Original POS selling quantity */
  sellingQuantity?: number;
  /** Flag indicating item is a custom/ad-hoc or service line */
  isServiceOrCustom?: boolean;
}

export interface PosLineResolutionResult {
  isInventoryManaged: boolean;
  resolvedLine?: ResolvedPosInventoryLine;
  error?: string;
}

export interface PosCartResolutionResult {
  isValid: boolean;
  inventoryLines: ResolvedPosInventoryLine[];
  errors: string[];
}

/**
 * Normalizes user-facing location strings to standardized locationId format.
 */
export function normalizePosLocationId(locationString?: string, defaultLocation: string = DEFAULT_LOCATION_ID): string {
  if (!locationString || typeof locationString !== 'string') {
    return defaultLocation;
  }
  const trimmed = locationString.trim();
  if (trimmed.length === 0) {
    return defaultLocation;
  }
  
  // If location string is already formatted as loc-xxx
  if (trimmed.startsWith('loc-')) {
    return trimmed;
  }
  
  // Handle comma-separated location strings (e.g. "Store Shelf, Warehouse")
  const primary = trimmed.split(',')[0].trim();
  
  // Map standard display locations
  const lower = primary.toLowerCase();
  if (lower === 'store shelf' || lower === 'store') return 'loc-store-shelf';
  if (lower === 'warehouse') return 'loc-warehouse';
  if (lower === 'fulfillment center') return 'loc-fulfillment-center';
  if (lower === 'main store' || lower === 'downtown flagship store') return 'loc-main-store';
  
  // Clean custom location string into valid slug
  const cleanSlug = primary.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return cleanSlug ? `loc-${cleanSlug}` : defaultLocation;
}

/**
 * Discriminates custom, ad-hoc, or service items that do not track physical inventory.
 */
export function isCustomOrServiceItem(cartItem: CartItem): boolean {
  const { product, customPrice } = cartItem;
  
  // 1. Explicit custom item without catalog product
  if (!product || !product.id || product.id.startsWith('custom-')) {
    return true;
  }
  
  // 2. Custom price override on ad-hoc item without SKU
  if (customPrice !== undefined && (!product.sku || product.sku.trim().length === 0)) {
    return true;
  }
  
  // 3. Service or non-tracked catalog product types
  if (
    product.productType === 'Service' ||
    product.productType === 'Digital' ||
    product.category === 'Service' ||
    product.inventoryTracking === 'NONE' ||
    product.trackInventory === false
  ) {
    return true;
  }
  
  return false;
}

/**
 * Resolves a single POS CartItem into an authoritative inventory movement line.
 */
export function resolvePosInventoryLine(params: PosLineResolutionParams): PosLineResolutionResult {
  const { cartItem, orderId, lineIndex, storeLocationId } = params;
  
  // 1. Service / Custom Item Discrimination
  if (isCustomOrServiceItem(cartItem)) {
    return { isInventoryManaged: false };
  }
  
  const product = cartItem.product;
  if (!product || !product.id) {
    return {
      isInventoryManaged: true,
      error: `Line item at index ${lineIndex} does not reference a valid product`
    };
  }

  // 2. Canonical Variant & SKU Resolution
  let resolvedSku = product.sku ? product.sku.trim() : '';
  let variantId: string | undefined = undefined;
  
  if (cartItem.selectedVariantSku) {
    const requestedSku = cartItem.selectedVariantSku.trim();
    const variants: ProductVariant[] = product.variants || [];
    const matchedVariant = variants.find(
      v => v.sku && v.sku.trim().toLowerCase() === requestedSku.toLowerCase()
    );
    
    if (matchedVariant) {
      resolvedSku = matchedVariant.sku.trim();
      variantId = (matchedVariant as any).id || matchedVariant.sku.trim();
    } else {
      // REJECTION RULE: Never silently fall back to parent product SKU if selected variant fails!
      return {
        isInventoryManaged: true,
        error: `Variant SKU "${requestedSku}" was requested for product "${product.name}" but could not be resolved in variants catalog`
      };
    }
  } else if (product.variants && product.variants.length > 0) {
    // Check if product is multi-variant and has default variant
    const defaultVariant = product.variants.find(v => (v as any).isDefault || v.sku === product.sku);
    if (defaultVariant && defaultVariant.sku) {
      resolvedSku = defaultVariant.sku.trim();
      variantId = (defaultVariant as any).id || defaultVariant.sku.trim();
    } else if (product.sku) {
      resolvedSku = product.sku.trim();
    } else {
      return {
        isInventoryManaged: true,
        error: `Product "${product.name}" requires a variant selection before checkout`
      };
    }
  }
  
  if (!resolvedSku) {
    return {
      isInventoryManaged: true,
      error: `Product "${product.name}" has no valid SKU code`
    };
  }

  // 3. Packaging / Base-Unit Quantity Conversion
  const sellingQuantity = cartItem.quantity;
  if (typeof sellingQuantity !== 'number' || !Number.isFinite(sellingQuantity) || !Number.isInteger(sellingQuantity) || sellingQuantity <= 0) {
    return {
      isInventoryManaged: true,
      error: `Line quantity for "${product.name}" must be a positive integer, received ${sellingQuantity}`
    };
  }
  
  const multiplier = cartItem.unitMultiplier ?? cartItem.selectedPackagingUnit?.multiplier ?? 1;
  if (typeof multiplier !== 'number' || !Number.isFinite(multiplier) || !Number.isInteger(multiplier) || multiplier <= 0) {
    return {
      isInventoryManaged: true,
      error: `Packaging unit multiplier for "${product.name}" must be a positive integer, received ${multiplier}`
    };
  }
  
  const baseQuantity = sellingQuantity * multiplier;
  if (!Number.isSafeInteger(baseQuantity) || baseQuantity <= 0) {
    return {
      isInventoryManaged: true,
      error: `Calculated base inventory quantity for "${product.name}" must be a safe positive integer, received ${baseQuantity}`
    };
  }

  // 4. Store / Location Resolution
  const rawLocation = storeLocationId || product.location;
  const locationId = normalizePosLocationId(rawLocation, DEFAULT_LOCATION_ID);
  if (!locationId || locationId.trim().length === 0) {
    return {
      isInventoryManaged: true,
      error: `No valid store inventory location could be resolved for product "${product.name}"`
    };
  }

  // 5. Batch & Serial Lifecycle Engine Restrictions
  const trackingMode = product.inventoryTracking || (product.trackSerial ? 'SERIAL' : product.trackBatch ? 'BATCH' : 'QUANTITY');
  
  if (trackingMode === 'SERIAL' || product.trackSerial) {
    const serialNumbers = (cartItem as any).serialNumbers || (product.serialNumber ? [product.serialNumber] : undefined);
    if (!serialNumbers || !Array.isArray(serialNumbers) || serialNumbers.length !== baseQuantity) {
      return {
        isInventoryManaged: true,
        error: `SERIAL inventory item "${product.name}" requires exact serial number selection for ${baseQuantity} unit(s)`
      };
    }
  }

  if (trackingMode === 'BATCH' || product.trackBatch) {
    const batchNumber = (cartItem as any).batchNumber || product.batchNumber;
    if (!batchNumber || typeof batchNumber !== 'string' || batchNumber.trim().length === 0) {
      return {
        isInventoryManaged: true,
        error: `BATCH inventory item "${product.name}" requires batch identity selection`
      };
    }
  }

  // 6. Idempotent Operation ID & Inferred Inventory ID
  const cleanOrderId = orderId.replace(/[^A-Za-z0-9_-]/g, '_');
  const operationId = `pos_${cleanOrderId}_${lineIndex}`;
  const inventoryId = buildInventoryRecordId(resolvedSku, locationId);

  return {
    isInventoryManaged: true,
    resolvedLine: {
      sku: resolvedSku,
      productId: product.id,
      variantId,
      locationId,
      inventoryId,
      quantity: baseQuantity,
      operationId,
      sellableName: product.name,
      unitMultiplier: multiplier,
      sellingQuantity,
      isServiceOrCustom: false
    }
  };
}

/**
 * Resolves an entire POS Shopping Basket (cart) into validated inventory lines.
 */
export function resolvePosCartToInventoryLines(
  cart: CartItem[],
  orderId: string,
  storeLocationId?: string
): PosCartResolutionResult {
  const inventoryLines: ResolvedPosInventoryLine[] = [];
  const errors: string[] = [];

  if (!cart || cart.length === 0) {
    return { isValid: false, inventoryLines: [], errors: ['Shopping cart is empty'] };
  }

  cart.forEach((item, index) => {
    const res = resolvePosInventoryLine({
      cartItem: item,
      orderId,
      lineIndex: index,
      storeLocationId
    });

    if (res.error) {
      errors.push(res.error);
    } else if (res.isInventoryManaged && res.resolvedLine) {
      inventoryLines.push(res.resolvedLine);
    }
  });

  return {
    isValid: errors.length === 0,
    inventoryLines,
    errors
  };
}
