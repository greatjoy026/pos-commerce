/**
 * Canonical Product Normalization Engine (PROD-001 / PROD-001-F1)
 *
 * Provides authoritative normalization between untrusted/legacy inputs and the
 * Canonical Product domain representation.
 *
 * Architectural Invariants:
 * 1. Strict Normalization: NEVER silently invent business identifiers (e.g. `SKU-${id}`)
 *    or fallback names (e.g. `'Unnamed Product'`). Missing identifiers MUST produce validation errors.
 * 2. Canonical Isolation: CanonicalProduct represents catalog identity only. Operational inventory
 *    fields (stock, cost, location) are isolated in compatibility adapters (`toLegacyProduct`).
 * 3. Variant Boundary: CanonicalVariant does not contain stock quantities.
 * 4. Explicit Typing: Replaces unchecked `any` casts with structured `LegacyProductInput` and type guards.
 */

import {
  CanonicalProduct,
  CanonicalVariant,
  PackagingUnitInfo,
  ProductClassification,
  ProductLifecycle,
  ProductMerchandising,
  ProductOperationalState,
  ProductValidationError,
  LegacyProductInput,
  LegacyVariantInput,
  LegacyPackagingUnitInput
} from './types';
import { Product, ProductVariant, PackagingUnit } from '../../types';

/**
 * Structured Normalization Error
 */
export class ProductNormalizationError extends Error {
  public readonly errors: ProductValidationError[];

  constructor(errors: ProductValidationError[]) {
    const errorDetails = errors.map(e => `[${e.field}] ${e.message}`).join('; ');
    super(`Product normalization failed: ${errorDetails}`);
    this.name = 'ProductNormalizationError';
    this.errors = errors;
  }
}

/**
 * Type guard for legacy or untrusted product input
 */
export function isLegacyProductInput(data: unknown): data is LegacyProductInput {
  return typeof data === 'object' && data !== null;
}

export type TryNormalizeResult =
  | { success: true; product: CanonicalProduct }
  | { success: false; errors: ProductValidationError[] };

/**
 * Validates untrusted input and produces a CanonicalProduct, or returns structured errors.
 * Never silently fabricates missing SKUs or names.
 */
export function tryNormalizeProduct(raw: unknown): TryNormalizeResult {
  if (!isLegacyProductInput(raw)) {
    return {
      success: false,
      errors: [{ field: 'root', message: 'Product input must be a non-null object.' }]
    };
  }

  const errors: ProductValidationError[] = [];

  // 1. Mandatory Identity Fields
  const rawId = raw.id ? String(raw.id).trim() : '';
  if (!rawId) {
    errors.push({ field: 'id', message: 'Product ID is required.' });
  }

  const rawSku = raw.sku ? String(raw.sku).trim() : '';
  if (!rawSku) {
    errors.push({ field: 'sku', message: 'Product SKU is required and cannot be silently generated.' });
  }

  const rawName = (raw.merchandising?.name || raw.name || '').trim();
  if (!rawName) {
    errors.push({ field: 'name', message: 'Product name is required and cannot be silently defaulted.' });
  }

  const barcode = raw.barcode ? String(raw.barcode).trim() : undefined;
  const qrCode = raw.qrCode ? String(raw.qrCode).trim() : undefined;

  // 2. Merchandising
  const merchandising: ProductMerchandising = {
    name: rawName,
    description: String(raw.description || raw.merchandising?.description || ''),
    brand: raw.brand || raw.merchandising?.brand || undefined,
    model: raw.model || raw.merchandising?.model || undefined,
    imageUrl: raw.imageUrl || raw.merchandising?.imageUrl || raw.images?.[0] || undefined,
    images: Array.isArray(raw.images) ? raw.images : (raw.imageUrl ? [raw.imageUrl] : []),
    rating: typeof raw.rating === 'number' ? raw.rating : (raw.merchandising?.rating ?? 5.0),
    reviewCount: typeof raw.reviewCount === 'number' ? raw.reviewCount : (raw.merchandising?.reviewCount ?? 0),
    specifications: raw.specifications || raw.merchandising?.specifications || {},
    isFeatured: Boolean(raw.isFeatured ?? raw.merchandising?.isFeatured),
    isNewArrival: Boolean(raw.isNewArrival ?? raw.merchandising?.isNewArrival),
    isBestSeller: Boolean(raw.isBestSeller ?? raw.merchandising?.isBestSeller),
    originalPrice: typeof raw.originalPrice === 'number' ? raw.originalPrice : raw.merchandising?.originalPrice,
    discountPercent: typeof raw.discountPercent === 'number' ? raw.discountPercent : raw.merchandising?.discountPercent
  };

  // 3. Classification
  const classification: ProductClassification = {
    category: String(raw.category || raw.classification?.category || 'General').trim(),
    productType: raw.productType || raw.classification?.productType || 'Standard',
    tags: Array.isArray(raw.tags) ? raw.tags : (raw.classification?.tags || []),
    taxCategory: raw.taxCategory || raw.classification?.taxCategory,
    isTaxExempt: Boolean(raw.isTaxExempt || raw.classification?.isTaxExempt)
  };

  // 4. Lifecycle
  const lifecycle: ProductLifecycle = {
    status: raw.status || raw.lifecycle?.status || 'Active',
    visibility: {
      publishOnline: raw.publishOnline !== false && raw.lifecycle?.visibility?.publishOnline !== false,
      sellOnPOS: raw.sellOnPOS !== false && raw.lifecycle?.visibility?.sellOnPOS !== false,
      sellOnline: raw.sellOnline !== false && raw.lifecycle?.visibility?.sellOnline !== false
    },
    returnable: raw.returnable !== false,
    shippingEnabled: raw.shippingEnabled !== false,
    storePickup: raw.storePickup !== false,
    createdAt: raw.createdAt || raw.lifecycle?.createdAt,
    updatedAt: raw.updatedAt || raw.lifecycle?.updatedAt
  };

  // 5. Pricing Base
  const basePrice = typeof raw.price === 'number' && !isNaN(raw.price) && raw.price >= 0
    ? raw.price
    : (raw.variants?.[0]?.pricing?.retailPrice ?? raw.variants?.[0]?.retailPrice ?? 0);

  // 6. Variants Normalization (Strict variant SKU validation, NO stock in canonical variant)
  const canonicalVariants: CanonicalVariant[] = [];
  const rawVariants = Array.isArray(raw.variants) ? raw.variants : [];

  if (rawVariants.length > 0) {
    const seenVariantSkus = new Set<string>();

    rawVariants.forEach((v: LegacyVariantInput, index: number) => {
      const vSku = v.sku ? String(v.sku).trim() : '';
      if (!vSku) {
        errors.push({
          field: `variants[${index}].sku`,
          message: `Variant at index ${index} is missing a required SKU.`
        });
        return;
      }

      const lowerSku = vSku.toLowerCase();
      if (seenVariantSkus.has(lowerSku)) {
        errors.push({
          field: `variants[${index}].sku`,
          message: `Duplicate variant SKU "${vSku}" detected within the same product.`
        });
      }
      seenVariantSkus.add(lowerSku);

      const vRetailPrice = typeof v.pricing?.retailPrice === 'number'
        ? v.pricing.retailPrice
        : (typeof v.retailPrice === 'number' ? v.retailPrice : basePrice);

      const vCostPrice = typeof v.pricing?.costPrice === 'number'
        ? v.pricing.costPrice
        : (typeof v.costPrice === 'number' ? v.costPrice : undefined);

      const variantName = v.name || [v.size, v.color, v.model].filter(Boolean).join(' / ') || `Variant ${index + 1}`;

      const canonicalVar: CanonicalVariant = {
        id: v.id || `${rawId}-var-${vSku}`,
        productId: rawId,
        sku: vSku,
        barcode: v.barcode ? String(v.barcode).trim() : undefined,
        name: variantName,
        attributes: v.attributes || {
          ...(v.size ? { size: v.size } : {}),
          ...(v.color ? { color: v.color } : {}),
          ...(v.model ? { model: v.model } : {})
        },
        pricing: {
          retailPrice: vRetailPrice,
          costPrice: vCostPrice,
          wholesalePrice: v.wholesalePrice,
          minimumPrice: v.pricing?.minimumPrice
        },
        isActive: v.isActive !== false,
        imageUrl: v.imageUrl,
        isDefault: index === 0
      };

      canonicalVariants.push(canonicalVar);
    });
  } else {
    // Single-SKU product: normalize into exactly one default canonical variant matching base product
    const defaultVar: CanonicalVariant = {
      id: `${rawId}-var-default`,
      productId: rawId,
      sku: rawSku,
      barcode,
      name: rawName,
      attributes: {},
      pricing: {
        retailPrice: basePrice
      },
      isActive: true,
      imageUrl: merchandising.imageUrl,
      isDefault: true
    };
    canonicalVariants.push(defaultVar);
  }

  // 7. Packaging Units Consolidation (Catalog definition only, no inventory logic)
  const packagingUnits: PackagingUnitInfo[] = [];

  if (Array.isArray(raw.packagingUnits)) {
    raw.packagingUnits.forEach((u: LegacyPackagingUnitInput) => {
      if (u.unitName) {
        packagingUnits.push({
          id: u.id || `pkg-${u.unitName.toLowerCase().replace(/\s+/g, '-')}`,
          unitName: u.unitName,
          multiplier: typeof u.multiplier === 'number' && u.multiplier > 0 ? u.multiplier : 1,
          baseUnit: u.base_unit || u.baseUnit || 'Piece',
          sellingPrice: typeof u.sellingPrice === 'number' ? u.sellingPrice : basePrice,
          barcode: u.barcode ? String(u.barcode).trim() : undefined,
          sku: u.sku ? String(u.sku).trim() : undefined,
          isDefaultSellingUnit: Boolean(u.isDefaultSellingUnit),
          isPackUnit: Boolean(u.isPackUnit ?? (u.multiplier && u.multiplier > 1))
        });
      }
    });
  } else if (raw.packaging?.sellingTiers && Array.isArray(raw.packaging.sellingTiers)) {
    raw.packaging.sellingTiers.forEach((tier) => {
      if (tier.name) {
        packagingUnits.push({
          id: tier.id || `tier-${tier.unitQuantity}`,
          unitName: tier.name,
          multiplier: tier.unitQuantity && tier.unitQuantity > 0 ? tier.unitQuantity : 1,
          baseUnit: raw.packaging?.baseSellingUnitName || 'Piece',
          barcode: tier.barcode ? String(tier.barcode).trim() : undefined,
          sku: tier.sku ? String(tier.sku).trim() : undefined,
          sellingPrice: typeof tier.sellingPrice === 'number' ? tier.sellingPrice : basePrice,
          isDefaultSellingUnit: Boolean(tier.isDefaultSellingUnit),
          isPackUnit: (tier.unitQuantity ?? 1) > 1
        });
      }
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const canonical: CanonicalProduct = {
    id: rawId,
    sku: rawSku,
    barcode,
    qrCode,
    merchandising,
    classification,
    lifecycle,
    variants: canonicalVariants,
    packagingUnits: packagingUnits.length > 0 ? packagingUnits : undefined
  };

  return { success: true, product: canonical };
}

/**
 * Normalizes any untrusted or legacy product record into an authoritative CanonicalProduct.
 * Throws ProductNormalizationError if the input lacks mandatory identity fields (id, name, sku).
 */
export function normalizeProduct(raw: unknown): CanonicalProduct {
  const result = tryNormalizeProduct(raw);
  if (result.success === false) {
    throw new ProductNormalizationError(result.errors);
  }
  return result.product;
}

/**
 * Compatibility Adapter: Converts an authoritative CanonicalProduct back into the
 * legacy Product representation expected by existing POS and UI components.
 *
 * Operational / inventory state (stock, cost, location, serial numbers) is supplied
 * via `legacyOperational` to preserve backward compatibility until INV-001.
 */
export function toLegacyProduct(
  canonical: CanonicalProduct,
  legacyOperational?: Partial<ProductOperationalState & LegacyProductInput>
): Product & { canonical: CanonicalProduct } {
  const op = legacyOperational || {};
  const basePrice = typeof op.price === 'number' && !isNaN(op.price) && op.price >= 0
    ? op.price
    : (canonical.variants[0]?.pricing.retailPrice ?? 0);

  const rawVariants = Array.isArray(op.variants) ? op.variants : undefined;

  // Extract operational state (Transitional)
  const stock = typeof op.stock === 'number' && !isNaN(op.stock) && op.stock >= 0
    ? op.stock
    : (rawVariants
        ? rawVariants.reduce((sum, v) => sum + (Number((v as any).stock) || 0), 0)
        : 0);

  const cost = typeof op.cost === 'number' && !isNaN(op.cost) && op.cost >= 0
    ? op.cost
    : (canonical.variants[0]?.pricing.costPrice ?? 0);

  const location = typeof op.location === 'string' && op.location.trim().length > 0
    ? op.location
    : 'Store Shelf';
  const reorderPoint = typeof op.reorderPoint === 'number' ? op.reorderPoint : 0;
  const unit = op.unit || 'Piece';

  // Map canonical variants to legacy ProductVariant structure
  const legacyVariants: ProductVariant[] = canonical.variants.map((v) => {
    // Find matching legacy variant for transitional stock
    const legacyMatch = rawVariants
      ? rawVariants.find(lv => lv.sku === v.sku || (lv as any).id === v.id)
      : undefined;

    const vStock = legacyMatch && typeof (legacyMatch as any).stock === 'number'
      ? (legacyMatch as any).stock
      : (canonical.variants.length === 1 ? stock : 0);

    return {
      sku: v.sku,
      size: v.attributes?.size,
      color: v.attributes?.color,
      model: v.attributes?.model,
      optionName: v.name,
      stock: vStock,
      costPrice: v.pricing.costPrice,
      retailPrice: v.pricing.retailPrice,
      wholesalePrice: v.pricing.wholesalePrice,
      barcode: v.barcode,
      imageUrl: v.imageUrl,
      isActive: v.isActive
    };
  });

  // Map packaging units to legacy PackagingUnit structure
  const legacyPackagingUnits: PackagingUnit[] | undefined = canonical.packagingUnits?.map(u => ({
    id: u.id,
    unitName: u.unitName,
    multiplier: u.multiplier,
    base_unit: u.baseUnit,
    sellingPrice: u.sellingPrice,
    barcode: u.barcode,
    sku: u.sku,
    isDefaultSellingUnit: u.isDefaultSellingUnit,
    isPackUnit: u.isPackUnit,
    sellingMode: u.isPackUnit ? 'pack_selling' : 'retail_unit'
  }));

  const legacyProduct: Product & { canonical: CanonicalProduct } = {
    id: canonical.id,
    name: canonical.merchandising.name,
    sku: canonical.sku,
    price: basePrice,
    cost,
    stock,
    category: canonical.classification.category,
    location,
    reorderPoint,
    barcode: canonical.barcode || '',
    qrCode: canonical.qrCode || '',
    variants: legacyVariants,
    salesCount: typeof (op as any).salesCount === 'number' ? (op as any).salesCount : 0,
    imageUrl: canonical.merchandising.imageUrl,
    images: canonical.merchandising.images,
    description: canonical.merchandising.description,
    brand: canonical.merchandising.brand,
    model: canonical.merchandising.model,
    rating: canonical.merchandising.rating,
    reviewCount: canonical.merchandising.reviewCount,
    specifications: canonical.merchandising.specifications,
    reviews: (op as any).reviews,
    isFeatured: canonical.merchandising.isFeatured,
    isNewArrival: canonical.merchandising.isNewArrival,
    isBestSeller: canonical.merchandising.isBestSeller,
    originalPrice: canonical.merchandising.originalPrice,
    discountPercent: canonical.merchandising.discountPercent,
    status: canonical.lifecycle.status,
    productType: canonical.classification.productType,
    publishOnline: canonical.lifecycle.visibility.publishOnline,
    sellOnPOS: canonical.lifecycle.visibility.sellOnPOS,
    sellOnline: canonical.lifecycle.visibility.sellOnline,
    returnable: canonical.lifecycle.returnable,
    unit,
    packagingUnits: legacyPackagingUnits,
    canonical
  };

  return legacyProduct;
}

/**
 * Convenience Pipeline: Validates untrusted raw data into CanonicalProduct,
 * then maps it through the legacy compatibility adapter.
 */
export function normalizeToLegacyProduct(raw: unknown): Product & { canonical: CanonicalProduct } {
  const canonical = normalizeProduct(raw);
  return toLegacyProduct(canonical, isLegacyProductInput(raw) ? raw : undefined);
}
