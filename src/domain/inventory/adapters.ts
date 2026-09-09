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
import { assertValidInventoryRecord, InventoryDomainError } from './validation';

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
 * Migration Policy Helper: Parses and validates legacy stock values.
 *
 * MIGRATION POLICY:
 * - Missing legacy stock (undefined or null): Allowed and defaults to 0.
 * - Invalid legacy stock (NaN, Infinity, -Infinity, negative numbers, non-numeric):
 *   Throws an explicit InventoryDomainError. Never silently coerces to zero.
 */
export function parseLegacyStock(stock: unknown, context: string): number {
  if (stock === undefined || stock === null) {
    // Documented migration policy: missing legacy stock defaults to 0
    return 0;
  }
  if (typeof stock !== 'number' || !Number.isFinite(stock) || !Number.isInteger(stock)) {
    throw new InventoryDomainError(
      `Legacy migration failed for ${context}: stock must be a finite integer or omitted, received ${String(stock)}`,
      [{ field: `${context}.stock`, message: `Invalid legacy stock value: ${String(stock)}`, code: 'INVALID_TYPE' }]
    );
  }
  if (stock < 0) {
    throw new InventoryDomainError(
      `Legacy migration failed for ${context}: stock cannot be negative, received ${stock}`,
      [{ field: `${context}.stock`, message: `Negative legacy stock value: ${stock}`, code: 'OUT_OF_RANGE' }]
    );
  }
  return stock;
}

/**
 * Factory to create an authoritative InventoryRecord with strict validation.
 */
export function createInventoryRecord(params: CreateInventoryParams): InventoryRecord {
  const now = new Date().toISOString();
  const locationId = (params.locationId && params.locationId.trim().length > 0)
    ? params.locationId.trim()
    : DEFAULT_LOCATION_ID;

  const trackingMode = params.trackingMode ?? 'QUANTITY';
  const cleanSku = params.sku ? params.sku.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'sku';
  const cleanBatch = params.batchNumber ? params.batchNumber.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : '';
  const defaultId = (trackingMode === 'BATCH' && cleanBatch)
    ? `inv-${cleanSku}-${locationId}-${cleanBatch}`
    : `inv-${cleanSku}-${locationId}`;

  const id = params.id && params.id.trim().length > 0
    ? params.id.trim()
    : defaultId;

  // For SERIAL tracking: if on-hand is 0 and serialNumbers is omitted, default to empty array
  const serialNumbers = trackingMode === 'SERIAL'
    ? (params.serialNumbers ?? (params.quantityOnHand === 0 ? [] : undefined))
    : undefined;

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
    trackingMode,
    status: params.status ?? 'ACTIVE',
    serialNumbers,
    batchNumber: trackingMode === 'BATCH' ? params.batchNumber : undefined,
    expiryDate: trackingMode === 'BATCH' ? params.expiryDate : undefined,
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
 *
 * VARIANT IDENTITY ARCHITECTURE (INV-001-F1):
 * In the legacy ProductVariant model, only `sku` was defined without a dedicated primary `id`.
 * We strictly DO NOT invent a fake variant ID or set `variantId = variant.sku`.
 * If an explicit `id` exists on the legacy variant object, it is used; otherwise `variantId`
 * is left undefined to preserve architectural integrity.
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
    for (let i = 0; i < product.variants.length; i++) {
      const variant = product.variants[i];
      if (variant.sku && variant.sku.trim().length > 0) {
        const rawStock = parseLegacyStock(variant.stock, `product(${product.id}).variants[${i}]`);
        const vStock = trackingMode === 'NONE' ? 0 : rawStock;

        // Extract genuine variant ID if present on legacy object; NEVER use SKU as variant ID
        const rawVariant = variant as unknown as Record<string, unknown>;
        const genuineVariantId = (typeof rawVariant.id === 'string' && rawVariant.id.trim().length > 0)
          ? rawVariant.id.trim()
          : undefined;

        records.push(createInventoryRecord({
          sku: variant.sku,
          productId: product.id,
          variantId: genuineVariantId,
          locationId: location,
          quantityOnHand: vStock,
          quantityReserved: 0,
          reorderPoint: typeof product.reorderPoint === 'number' && Number.isInteger(product.reorderPoint) && product.reorderPoint >= 0 ? product.reorderPoint : undefined,
          trackingMode,
          status: 'ACTIVE'
        }));
      }
    }
  }

  // If no variant records were generated, generate for base SKU
  if (records.length === 0) {
    const rawStock = parseLegacyStock(product.stock, `product(${product.id})`);
    const baseStock = trackingMode === 'NONE' ? 0 : rawStock;

    records.push(createInventoryRecord({
      sku: product.sku,
      productId: product.id,
      locationId: location,
      quantityOnHand: baseStock,
      quantityReserved: 0,
      reorderPoint: typeof product.reorderPoint === 'number' && Number.isInteger(product.reorderPoint) && product.reorderPoint >= 0 ? product.reorderPoint : undefined,
      trackingMode,
      status: 'ACTIVE',
      serialNumbers: trackingMode === 'SERIAL' ? product.serialNumbers : undefined,
      batchNumber: trackingMode === 'BATCH' ? product.batchNumber : undefined,
      expiryDate: trackingMode === 'BATCH' ? product.expiryDate : undefined
    }));
  }

  return records;
}

/**
 * Creates canonical InventoryRecord(s) from a CanonicalProduct.
 * Demonstrates the full authoritative domain hierarchy:
 *   Product ID
 *       ↓
 *   Variant ID (CanonicalVariant.id)
 *       ↓
 *   SKU (CanonicalVariant.sku)
 *       ↓
 *   Inventory Record
 */
export function createInventoryRecordsFromCanonicalProduct(
  canonical: CanonicalProduct,
  defaultLocationId: string = DEFAULT_LOCATION_ID,
  initialStock: number = 0
): InventoryRecord[] {
  const records: InventoryRecord[] = [];

  if (Array.isArray(canonical.variants) && canonical.variants.length > 0) {
    for (const variant of canonical.variants) {
      records.push(createInventoryRecord({
        sku: variant.sku,
        productId: canonical.id,
        variantId: variant.id, // Genuine CanonicalVariant ID distinct from SKU!
        locationId: defaultLocationId,
        quantityOnHand: initialStock,
        quantityReserved: 0,
        trackingMode: 'QUANTITY',
        status: 'ACTIVE'
      }));
    }
  } else {
    records.push(createInventoryRecord({
      sku: canonical.sku,
      productId: canonical.id,
      variantId: undefined, // Simple single-SKU product has no variant
      locationId: defaultLocationId,
      quantityOnHand: initialStock,
      quantityReserved: 0,
      trackingMode: 'QUANTITY',
      status: 'ACTIVE'
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
