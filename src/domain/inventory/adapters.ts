/**
 * Authoritative Inventory Compatibility Adapters (INV-001)
 *
 * Provides bridge functions between Canonical Inventory state and existing legacy UI views.
 *
 * ARCHITECTURAL CONTRACT:
 * - Legacy Product.stock = READ-ONLY compatibility projection
 * - InventoryRecord.quantityOnHand = AUTHORITATIVE operational state
 *
 * The legacy `stock` property must NEVER be treated as an independent write authority.
 */

import {
  InventoryRecord,
  InventoryTrackingMode,
  InventoryStatus,
  DEFAULT_LOCATION_ID
} from './types';
import { CanonicalProduct } from '../product/types';
import { Product, ProductVariant } from '../../types';
import { toLegacyProduct } from '../product/normalization';
import { assertValidInventoryRecord } from './validation';

export interface CreateInventoryParams {
  id?: string;
  sku: string;
  productId: string;
  variantId?: string;
  locationId?: string;
  quantityOnHand: number;
  quantityReserved?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  trackingMode?: InventoryTrackingMode;
  status?: InventoryStatus;
  serialNumbers?: string[];
  batchNumber?: string;
  expiryDate?: string;
}

/**
 * Factory to create an authoritative InventoryRecord with strict validation.
 */
export function createInventoryRecord(params: CreateInventoryParams): InventoryRecord {
  const now = new Date().toISOString();
  const locationId = (params.locationId && params.locationId.trim().length > 0)
    ? params.locationId.trim()
    : DEFAULT_LOCATION_ID;

  const id = params.id && params.id.trim().length > 0
    ? params.id.trim()
    : `inv-${params.sku.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}-${locationId}`;

  const record: InventoryRecord = {
    id,
    sku: params.sku.trim(),
    productId: params.productId.trim(),
    variantId: params.variantId ? params.variantId.trim() : undefined,
    locationId,
    quantityOnHand: params.quantityOnHand,
    quantityReserved: params.quantityReserved ?? 0,
    reorderPoint: params.reorderPoint,
    reorderQuantity: params.reorderQuantity,
    trackingMode: params.trackingMode ?? 'QUANTITY',
    status: params.status ?? 'ACTIVE',
    serialNumbers: params.serialNumbers,
    batchNumber: params.batchNumber,
    expiryDate: params.expiryDate,
    createdAt: now,
    updatedAt: now
  };

  assertValidInventoryRecord(record);
  return record;
}

/**
 * Creates canonical InventoryRecord(s) from a legacy Product representation.
 *
 * For simple products:
 *   Product SKU -> Default Variant SKU -> InventoryRecord
 *
 * For multi-variant products:
 *   Product
 *     ├── Variant A -> SKU A -> InventoryRecord A
 *     ├── Variant B -> SKU B -> InventoryRecord B
 *     └── Variant C -> SKU C -> InventoryRecord C
 */
export function createInventoryRecordsFromLegacyProduct(
  product: Product,
  defaultLocationId: string = DEFAULT_LOCATION_ID
): InventoryRecord[] {
  const records: InventoryRecord[] = [];
  const location = typeof product.location === 'string' && product.location.trim().length > 0
    ? product.location.trim()
    : defaultLocationId;

  const trackingMode: InventoryTrackingMode = product.inventoryTracking === 'SERIAL'
    ? 'SERIAL'
    : product.inventoryTracking === 'BATCH'
    ? 'BATCH'
    : product.inventoryTracking === 'NONE'
    ? 'NONE'
    : 'QUANTITY';

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    for (const variant of product.variants) {
      if (variant.sku && variant.sku.trim().length > 0) {
        const vStock = typeof variant.stock === 'number' && Number.isFinite(variant.stock) && variant.stock >= 0
          ? variant.stock
          : 0;

        records.push(createInventoryRecord({
          sku: variant.sku,
          productId: product.id,
          variantId: variant.sku,
          locationId: location,
          quantityOnHand: vStock,
          quantityReserved: 0,
          reorderPoint: typeof product.reorderPoint === 'number' && product.reorderPoint >= 0 ? product.reorderPoint : undefined,
          trackingMode,
          status: 'ACTIVE'
        }));
      }
    }
  }

  // If no variant records were generated, generate for base SKU
  if (records.length === 0) {
    const baseStock = typeof product.stock === 'number' && Number.isFinite(product.stock) && product.stock >= 0
      ? product.stock
      : 0;

    records.push(createInventoryRecord({
      sku: product.sku,
      productId: product.id,
      locationId: location,
      quantityOnHand: baseStock,
      quantityReserved: 0,
      reorderPoint: typeof product.reorderPoint === 'number' && product.reorderPoint >= 0 ? product.reorderPoint : undefined,
      trackingMode,
      status: 'ACTIVE',
      serialNumbers: product.serialNumbers,
      batchNumber: product.batchNumber,
      expiryDate: product.expiryDate
    }));
  }

  return records;
}

/**
 * Bridges a CanonicalProduct and its associated InventoryRecords into a backward-compatible legacy Product.
 *
 * Invariant:
 * CanonicalProduct remains pristine without any inventory state.
 * The resulting Product.stock is a calculated projection from authoritative InventoryRecords.
 */
export function toLegacyProductWithInventory(
  canonical: CanonicalProduct,
  inventoryRecords: InventoryRecord[]
): Product {
  // Build a fast lookup of inventory records by SKU
  const inventoryBySku = new Map<string, InventoryRecord>();
  for (const record of inventoryRecords) {
    if (record.productId === canonical.id || record.sku === canonical.sku) {
      inventoryBySku.set(record.sku.toUpperCase(), record);
    }
  }

  // Derive legacy variants with updated stock projections
  let totalComputedStock = 0;
  let primaryLocation: string = DEFAULT_LOCATION_ID;
  let primaryReorderPoint: number = 10;

  const legacyVariants: ProductVariant[] = canonical.variants.map(variant => {
    const inv = inventoryBySku.get(variant.sku.toUpperCase());
    const vStock = inv ? inv.quantityOnHand : 0;
    if (inv) {
      totalComputedStock += vStock;
      primaryLocation = inv.locationId;
      if (inv.reorderPoint !== undefined) {
        primaryReorderPoint = inv.reorderPoint;
      }
    }

    return {
      sku: variant.sku,
      size: variant.attributes?.size,
      color: variant.attributes?.color,
      model: variant.attributes?.model,
      optionName: variant.attributes?.optionName || variant.name,
      stock: vStock,
      costPrice: variant.pricing?.costPrice,
      retailPrice: variant.pricing?.retailPrice,
      wholesalePrice: variant.pricing?.wholesalePrice,
      barcode: variant.barcode,
      imageUrl: variant.imageUrl,
      isActive: variant.isActive
    };
  });

  // If there were no multi-variant records contributing to total stock, check base SKU
  const baseInv = inventoryBySku.get(canonical.sku.toUpperCase());
  if (baseInv) {
    if (legacyVariants.length === 0 || totalComputedStock === 0) {
      totalComputedStock = baseInv.quantityOnHand;
    }
    primaryLocation = baseInv.locationId;
    if (baseInv.reorderPoint !== undefined) {
      primaryReorderPoint = baseInv.reorderPoint;
    }
  }

  // Produce base legacy product
  const baseLegacy = toLegacyProduct(canonical);

  return {
    ...baseLegacy,
    stock: totalComputedStock,
    location: primaryLocation,
    reorderPoint: primaryReorderPoint,
    variants: legacyVariants,
    canonical
  };
}
