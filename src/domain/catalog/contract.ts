/**
 * Shared Catalog Contract (ECOM-001)
 *
 * Single catalog contract consumed by POS and e-commerce:
 * Product -> Variant -> SKU -> Packaging/UOM.
 *
 * This module is intentionally inventory-free. Stock, cost, reservation state,
 * warehouse/location data, and payment state never belong to this contract.
 */

import type {
  CanonicalProduct,
  CanonicalVariant,
  PackagingUnitInfo,
  ProductSku,
  PublicAvailabilityStatus,
  PublicProductProjection,
} from '../product/types';
import { toPublicCatalogProjection } from '../product/projections';

export interface CatalogSkuContract extends Readonly<ProductSku> {
  readonly productId: string;
  readonly variantId?: string;
  readonly packagingUnitId?: string;
}

export interface CatalogVariantContract {
  readonly id: string;
  readonly productId: string;
  readonly sku: string;
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly retailPrice: number;
  readonly isActive: boolean;
  readonly imageUrl?: string;
}

export interface CatalogSellUnit {
  readonly id: string;
  readonly name: string;
  readonly multiplier: number;
  readonly baseUnit: string;
  readonly sellingPrice: number;
  readonly sku?: string;
  readonly barcode?: string;
  readonly isDefault: boolean;
}

export interface SharedCatalogProduct {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly category: string;
  readonly productType: CanonicalProduct['classification']['productType'];
  readonly status: CanonicalProduct['lifecycle']['status'];
  readonly visibility: Readonly<CanonicalProduct['lifecycle']['visibility']>;
  readonly variants: readonly CatalogVariantContract[];
  readonly sellUnits: readonly CatalogSellUnit[];
}

export interface PublicCatalogProduct extends Readonly<PublicProductProjection> {
  readonly availability: { readonly status: PublicAvailabilityStatus };
}

function requireFinitePositiveInteger(value: number, field: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer.`);
  }
  return value;
}

function requireNonEmpty(value: string | undefined, field: string): string {
  const normalized = value?.trim() ?? '';
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
}

/** Build the shared internal catalog contract from the canonical product aggregate. */
export function toSharedCatalogProduct(product: CanonicalProduct): SharedCatalogProduct {
  requireNonEmpty(product.id, 'product.id');
  requireNonEmpty(product.sku, 'product.sku');
  requireNonEmpty(product.merchandising.name, 'product.name');

  const variants = product.variants.map((variant: CanonicalVariant) => {
    requireNonEmpty(variant.id, 'variant.id');
    requireNonEmpty(variant.productId, 'variant.productId');
    requireNonEmpty(variant.sku, 'variant.sku');
    if (variant.productId !== product.id) {
      throw new Error(`Variant ${variant.id} does not belong to product ${product.id}.`);
    }
    if (!Number.isFinite(variant.pricing.retailPrice) || variant.pricing.retailPrice < 0) {
      throw new Error(`Variant ${variant.id} has an invalid retail price.`);
    }
    return {
      id: variant.id,
      productId: variant.productId,
      sku: variant.sku,
      name: variant.name,
      attributes: Object.freeze({ ...variant.attributes }),
      retailPrice: variant.pricing.retailPrice,
      isActive: variant.isActive,
      imageUrl: variant.imageUrl,
    };
  });

  const sellUnits = (product.packagingUnits ?? []).map((unit: PackagingUnitInfo) => {
    requireNonEmpty(unit.id, 'packagingUnit.id');
    requireNonEmpty(unit.unitName, 'packagingUnit.unitName');
    requireNonEmpty(unit.baseUnit, 'packagingUnit.baseUnit');
    requireFinitePositiveInteger(unit.multiplier, `packagingUnit ${unit.id}.multiplier`);
    if (!Number.isFinite(unit.sellingPrice) || unit.sellingPrice < 0) {
      throw new Error(`Packaging unit ${unit.id} has an invalid selling price.`);
    }
    return {
      id: unit.id,
      name: unit.unitName,
      multiplier: unit.multiplier,
      baseUnit: unit.baseUnit,
      sellingPrice: unit.sellingPrice,
      sku: unit.sku,
      barcode: unit.barcode,
      isDefault: unit.isDefaultSellingUnit === true,
    };
  });

  return {
    id: product.id,
    sku: product.sku,
    name: product.merchandising.name,
    category: product.classification.category,
    productType: product.classification.productType,
    status: product.lifecycle.status,
    visibility: Object.freeze({ ...product.lifecycle.visibility }),
    variants,
    sellUnits,
  };
}

/** Resolve a sellable SKU deterministically. No parent-SKU fallback for an invalid variant. */
export function resolveCatalogSku(
  product: SharedCatalogProduct,
  options: { variantId?: string; sku?: string; packagingUnitId?: string } = {},
): CatalogSkuContract {
  const requestedSku = options.sku?.trim();
  const variant = options.variantId
    ? product.variants.find(candidate => candidate.id === options.variantId)
    : requestedSku
      ? product.variants.find(candidate => candidate.sku === requestedSku)
      : product.variants.find(candidate => candidate.isActive);

  if (options.variantId && !variant) {
    throw new Error(`Variant ${options.variantId} is not part of product ${product.id}.`);
  }
  if (!variant) throw new Error(`No active sellable variant exists for product ${product.id}.`);
  if (!variant.isActive) throw new Error(`Variant ${variant.id} is inactive.`);
  if (requestedSku && variant.sku !== requestedSku) {
    throw new Error(`Requested SKU ${requestedSku} does not match variant ${variant.id}.`);
  }

  const sellUnit = options.packagingUnitId
    ? product.sellUnits.find(unit => unit.id === options.packagingUnitId)
    : undefined;
  if (options.packagingUnitId && !sellUnit) {
    throw new Error(`Packaging unit ${options.packagingUnitId} is not defined for product ${product.id}.`);
  }

  return {
    sku: sellUnit?.sku?.trim() || variant.sku,
    barcode: sellUnit?.barcode,
    productId: product.id,
    variantId: variant.id,
    packagingUnitId: sellUnit?.id,
    skuType: sellUnit ? 'packaging' : 'variant',
    sellableName: sellUnit ? `${variant.name} — ${sellUnit.name}` : variant.name,
    price: sellUnit?.sellingPrice ?? variant.retailPrice,
  };
}

/** Convert a sell-unit quantity into authoritative catalog base units. */
export function toBaseUnitQuantity(product: SharedCatalogProduct, quantity: number, packagingUnitId?: string): number {
  requireFinitePositiveInteger(quantity, 'quantity');
  const unit = packagingUnitId ? product.sellUnits.find(candidate => candidate.id === packagingUnitId) : undefined;
  if (packagingUnitId && !unit) {
    throw new Error(`Packaging unit ${packagingUnitId} is not defined for product ${product.id}.`);
  }
  const multiplier = unit?.multiplier ?? 1;
  const baseQuantity = quantity * multiplier;
  if (!Number.isSafeInteger(baseQuantity)) throw new Error('Base-unit quantity exceeds safe integer range.');
  return baseQuantity;
}

/**
 * Public storefront projection. Exact stock/cost/location data is intentionally omitted.
 * Availability is status-only: IN_STOCK | LOW_STOCK | OUT_OF_STOCK.
 */
export function toPublicCatalogProduct(product: CanonicalProduct, stockForProjection: number): PublicCatalogProduct {
  return toPublicCatalogProjection(product, stockForProjection);
}
