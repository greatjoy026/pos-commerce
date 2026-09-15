/**
 * Authoritative POS Inventory Resolution Layer (POS-001)
 *
 * Implements canonical inventory line resolution for POS sales:
 * - POS product selection → Canonical Product / Variant / SKU resolution
 * - Multi-tier packaging / UOM unit conversion → base quantity calculation
 * - Store / location ID resolution (strict validation: LOCATION_REQUIRED, LOCATION_AMBIGUOUS)
 * - Custom & Service item discrimination (bypasses inventory deduction)
 * - Batch & Serial tracking validation (SERIAL_SELECTION_REQUIRED, BATCH_SELECTION_REQUIRED)
 * - Deterministic operation ID generation for atomic idempotency
 */

import { CartItem, Product, ProductVariant, PackagingUnit } from '../../types';
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
 * Returns undefined if missing or invalid; returns 'AMBIGUOUS' if multiple locations are specified.
 */
export function normalizePosLocationId(locationString?: string): string | undefined {
  if (!locationString || typeof locationString !== 'string') {
    return undefined;
  }
  const trimmed = locationString.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  // Handle comma-separated location strings (e.g. "Store Shelf, Warehouse")
  const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return 'AMBIGUOUS';
  }
  
  const primary = parts[0];
  
  // If location string is already formatted as loc-xxx
  if (primary.startsWith('loc-')) {
    return primary;
  }
  
  // Map standard display locations
  const lower = primary.toLowerCase();
  if (lower === 'store shelf' || lower === 'store') return 'loc-store-shelf';
  if (lower === 'warehouse') return 'loc-warehouse';
  if (lower === 'fulfillment center') return 'loc-fulfillment-center';
  if (lower === 'main store' || lower === 'downtown flagship store') return 'loc-main-store';
  
  // Clean custom location string into valid slug
  const cleanSlug = primary.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return cleanSlug ? `loc-${cleanSlug}` : undefined;
}

/**
 * Discriminates custom, ad-hoc, or service items that do not track physical inventory.
 * Strictly uses structural domain properties — never regexes product display names.
 */
export function isCustomOrServiceItem(cartItem: CartItem): boolean {
  const { product, customPrice } = cartItem;
  
  if (!product || !product.id) {
    return true;
  }

  // 1. Explicit custom item flag or custom product ID prefix
  if (product.id.startsWith('custom-') || product.id.startsWith('prod-custom-') || (cartItem as any).isCustomItem === true) {
    return true;
  }

  // 2. Custom price override on ad-hoc item without SKU
  if (customPrice !== undefined && (!product.sku || product.sku.trim().length === 0)) {
    return true;
  }

  // 3. Structural domain properties on Product aggregate
  if (
    product.productType === 'Service' ||
    product.productType === 'Digital' ||
    product.category === 'Service' ||
    product.category === 'Services' ||
    product.inventoryTracking === 'NONE' ||
    product.trackInventory === false ||
    product.trackStock === false
  ) {
    return true;
  }

  return false;
}

/**
 * Helper to resolve packaging unit multiplier from canonical product catalog definition.
 */

function resolveCanonicalPackagingMultiplier(product: Product, cartItem: CartItem): { multiplier: number; error?: string } {
  const catalogUnits: PackagingUnit[] = [
    ...(product.packagingUnits || []),
    ...(product.packaging?.packagingUnits || []),
    ...(product.packaging?.sellingTiers?.map(t => ({
      id: t.id,
      unitName: t.name,
      multiplier: t.unitQuantity,
      sellingPrice: t.sellingPrice,
      base_unit: product.unit || 'Piece'
    })) || [])
  ];

  const requestedUnitId = cartItem.selectedPackagingTierId || cartItem.selectedPackagingUnit?.id;
  const requestedUnitName = cartItem.packagingUnitName || cartItem.selectedPackagingUnit?.unitName;

  if (requestedUnitId || requestedUnitName) {
    const matchedUnit = catalogUnits.find(u =>
      (requestedUnitId && u.id === requestedUnitId) ||
      (requestedUnitName && u.unitName?.toLowerCase() === requestedUnitName.toLowerCase())
    );

    if (matchedUnit) {
      if (typeof matchedUnit.multiplier === 'number' && Number.isFinite(matchedUnit.multiplier) && Number.isInteger(matchedUnit.multiplier) && matchedUnit.multiplier > 0) {
        return { multiplier: matchedUnit.multiplier };
      } else {
        return { multiplier: 1, error: `[PACKAGING_UNIT_INVALID] Packaging unit "${matchedUnit.unitName}" for product "${product.name}" has an invalid multiplier (${matchedUnit.multiplier})` };
      }
    } else {
      return { multiplier: 1, error: `[PACKAGING_UNIT_NOT_FOUND] Selected packaging unit "${requestedUnitId || requestedUnitName}" for product "${product.name}" was not found in canonical catalog` };
    }
  }

  // Single base-unit selling (no packaging unit requested)
  return { multiplier: 1 };
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
  let resolvedSku = '';
  let variantId: string | undefined = undefined;

  const requestedVariantSku = cartItem.selectedVariantSku?.trim();
  const requestedVariantId = (cartItem as any).selectedVariantId?.trim();
  const requestedVariantRef = requestedVariantSku || requestedVariantId;

  const catalogVariants: ProductVariant[] = product.variants || (product.canonical?.variants as any[]) || [];

  if (requestedVariantRef) {
    const matchedVariant = catalogVariants.find(
      v => (v.sku && v.sku.trim().toLowerCase() === requestedVariantRef.toLowerCase()) ||
           ((v as any).id && (v as any).id.trim().toLowerCase() === requestedVariantRef.toLowerCase())
    );

    if (matchedVariant && matchedVariant.sku) {
      resolvedSku = matchedVariant.sku.trim();
      variantId = (matchedVariant as any).id || matchedVariant.sku.trim();
    } else {
      // REJECTION RULE: Never silently fall back to parent product SKU if selected variant fails!
      return {
        isInventoryManaged: true,
        error: `[VARIANT_NOT_FOUND] Variant SKU/ID "${requestedVariantRef}" requested for product "${product.name}" could not be resolved in canonical catalog`
      };
    }
  } else if (catalogVariants.length > 0) {
    const defaultVariant = catalogVariants.find(v => (v as any).isDefault);
    if (defaultVariant && defaultVariant.sku) {
      resolvedSku = defaultVariant.sku.trim();
      variantId = (defaultVariant as any).id || defaultVariant.sku.trim();
    } else {
      return {
        isInventoryManaged: true,
        error: `[VARIANT_NOT_FOUND] Product "${product.name}" has variants but requires an explicit variant selection before checkout`
      };
    }
  } else {
    // Single-SKU product
    resolvedSku = product.sku ? product.sku.trim() : '';
    variantId = undefined;
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

  const packagingRes = resolveCanonicalPackagingMultiplier(product, cartItem);
  if (packagingRes.error) {
    return {
      isInventoryManaged: true,
      error: packagingRes.error
    };
  }

  const multiplier = packagingRes.multiplier;
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

  // 4. Store / Location Resolution (LOCATION_REQUIRED, LOCATION_AMBIGUOUS)
  const rawLocation = (storeLocationId && storeLocationId.trim().length > 0) ? storeLocationId.trim() : product.location;
  if (!rawLocation || rawLocation.trim().length === 0) {
    return {
      isInventoryManaged: true,
      error: `[LOCATION_REQUIRED] Location is required for POS inventory resolution of product "${product.name}"`
    };
  }

  const locationId = normalizePosLocationId(rawLocation);
  if (locationId === 'AMBIGUOUS') {
    return {
      isInventoryManaged: true,
      error: `[LOCATION_AMBIGUOUS] Location "${rawLocation}" is ambiguous for product "${product.name}". An explicit single location must be selected.`
    };
  }
  if (!locationId || locationId.trim().length === 0) {
    return {
      isInventoryManaged: true,
      error: `[LOCATION_REQUIRED] Location is required for POS inventory resolution of product "${product.name}"`
    };
  }

  // 5. Batch & Serial Lifecycle Engine Restrictions
  const trackingMode = product.inventoryTracking || (product.trackSerial ? 'SERIAL' : product.trackBatch ? 'BATCH' : 'QUANTITY');

  if (trackingMode === 'SERIAL' || product.trackSerial) {
    const serialNumbers = (cartItem as any).serialNumbers || (product.serialNumber ? [product.serialNumber] : undefined);
    if (!serialNumbers || !Array.isArray(serialNumbers) || serialNumbers.length !== baseQuantity) {
      return {
        isInventoryManaged: true,
        error: `[SERIAL_SELECTION_REQUIRED] SERIAL tracked item "${product.name}" requires explicit serial selection for ${baseQuantity} unit(s)`
      };
    }
  }

  if (trackingMode === 'BATCH' || product.trackBatch) {
    const batchNumber = (cartItem as any).batchNumber || product.batchNumber || product.batchLot;
    if (!batchNumber || typeof batchNumber !== 'string' || batchNumber.trim().length === 0) {
      return {
        isInventoryManaged: true,
        error: `[BATCH_SELECTION_REQUIRED] BATCH tracked item "${product.name}" requires explicit batch selection`
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
