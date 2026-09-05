/**
 * Product Projections & Adapters (PROD-001 / PROD-001-F1 / PROD-001-F2)
 *
 * Implements the Single Source of Truth architectural principle:
 * "One canonical product domain, multiple consumers."
 *
 * Consumer Projections:
 * 1. Public E-Commerce Storefront: Strict SEC-001 boundary. Strips all costs, suppliers,
 *    internal serials, batch numbers, and reorder metrics. Formats public availability status.
 *    STRICT INVARIANT: Does NOT expose exact stock quantities on product or variants.
 * 2. POS Module Adapter: Transitional compatibility layer mapping canonical products and
 *    operational state to the legacy Product interface for cashier and cart operations.
 */

import {
  CanonicalProduct,
  CanonicalVariant,
  ProductOperationalState,
  PublicAvailabilityStatus,
  PublicProductProjection,
  PublicVariantProjection,
  LegacyProductInput,
  LegacyVariantInput
} from './types';
import { Product } from '../../types';

/**
 * Type guard for CanonicalProduct
 */
export function isCanonicalProduct(p: unknown): p is CanonicalProduct {
  return typeof p === 'object' && p !== null && 'merchandising' in p && 'classification' in p && 'variants' in p;
}

/**
 * Type guard for legacy Product with attached canonical reference
 */
export function hasCanonicalProduct(p: unknown): p is { canonical: CanonicalProduct } {
  return typeof p === 'object' && p !== null && 'canonical' in p && isCanonicalProduct((p as { canonical: unknown }).canonical);
}

/**
 * Computes public availability status from operational stock.
 *
 * TRANSITIONAL ARCHITECTURAL NOTE (PROD-001-F2):
 * Authoritative stock balances and warehouse allocations are strictly excluded
 * from the public catalog. Public clients only receive discrete availability status:
 * - stock <= 0 => 'OUT_OF_STOCK'
 * - 0 < stock <= lowStockThreshold => 'LOW_STOCK'
 * - stock > lowStockThreshold => 'IN_STOCK'
 *
 * The underlying stock count remains private behind this projection boundary
 * until INV-001 establishes dedicated inventory ledgers and availability services.
 */
export function computePublicAvailabilityStatus(
  stock: number,
  lowStockThreshold: number = 5
): PublicAvailabilityStatus {
  if (typeof stock !== 'number' || isNaN(stock) || stock <= 0) {
    return 'OUT_OF_STOCK';
  }
  if (stock <= lowStockThreshold) {
    return 'LOW_STOCK';
  }
  return 'IN_STOCK';
}

/**
 * Public Storefront Catalog Projection
 *
 * CRITICAL SECURITY INVARIANT (SEC-001-R3, SEC-005, PROD-001-F2):
 * This projection MUST NEVER contain:
 * - Exact inventory stock quantities (`stock`, `variants[].stock`)
 * - Wholesale cost prices (`cost`, `costPrice`, `wholesalePrice`, `packageCost`)
 * - Supplier details (`supplier`, `vendor`)
 * - Reorder points (`reorderPoint`, `reorderLevel`)
 * - Internal hardware/serial tracking (`serialNumbers`, `serialNumber`, `batchNumber`, `batchLot`)
 * - Procurement or warehouse location data
 *
 * AVAILABILITY CONTRACT:
 * Provides public-safe `availability` status (`IN_STOCK` | `LOW_STOCK` | `OUT_OF_STOCK`).
 * Exact stock numbers are strictly hidden from the public contract.
 */
export function toPublicCatalogProjection(
  product: Product | CanonicalProduct,
  transitionalStockOverride?: number
): PublicProductProjection {
  const canonical: CanonicalProduct | undefined = hasCanonicalProduct(product)
    ? product.canonical
    : (isCanonicalProduct(product) ? product : undefined);
  const raw: LegacyProductInput = product as unknown as LegacyProductInput;

  // Merchandising attributes
  const name = canonical ? canonical.merchandising.name : (raw.merchandising?.name || raw.name || '');
  const description = canonical ? canonical.merchandising.description : (raw.merchandising?.description || raw.description);
  const brand = canonical ? canonical.merchandising.brand : (raw.merchandising?.brand || raw.brand);
  const model = canonical ? canonical.merchandising.model : (raw.merchandising?.model || raw.model);
  const imageUrl = canonical ? canonical.merchandising.imageUrl : (raw.merchandising?.imageUrl || raw.imageUrl);
  const images = canonical ? canonical.merchandising.images : (raw.merchandising?.images || raw.images);
  const rating = canonical ? canonical.merchandising.rating : (raw.merchandising?.rating ?? raw.rating ?? 0);
  const reviewCount = canonical ? canonical.merchandising.reviewCount : (raw.merchandising?.reviewCount ?? raw.reviewCount ?? 0);
  const originalPrice = canonical ? canonical.merchandising.originalPrice : (raw.merchandising?.originalPrice ?? raw.originalPrice);
  const discountPercent = canonical ? canonical.merchandising.discountPercent : (raw.merchandising?.discountPercent ?? raw.discountPercent);
  const isFeatured = canonical ? canonical.merchandising.isFeatured : Boolean(raw.merchandising?.isFeatured ?? raw.isFeatured);
  const isNewArrival = canonical ? canonical.merchandising.isNewArrival : Boolean(raw.merchandising?.isNewArrival ?? raw.isNewArrival);
  const isBestSeller = canonical ? canonical.merchandising.isBestSeller : Boolean(raw.merchandising?.isBestSeller ?? raw.isBestSeller);
  const specifications = canonical ? canonical.merchandising.specifications : (raw.merchandising?.specifications || raw.specifications);

  // Classification & Pricing
  const category = canonical ? canonical.classification.category : (raw.classification?.category || raw.category || '');
  const price = canonical
    ? (canonical.variants[0]?.pricing.retailPrice ?? 0)
    : (typeof raw.price === 'number' ? raw.price : 0);

  // Transitional Stock Level: Used internally to compute public availability status ONLY.
  // Never leaked in the projection output.
  const internalStock = typeof transitionalStockOverride === 'number'
    ? transitionalStockOverride
    : (typeof raw.stock === 'number' ? raw.stock : (raw.operational?.stock ?? 0));

  const publishOnline = canonical
    ? canonical.lifecycle.visibility.publishOnline
    : (raw.lifecycle?.visibility?.publishOnline ?? raw.publishOnline ?? true);

  // Safe public variant projection (availability status ONLY; NO stock, NO costPrice)
  const variants: PublicVariantProjection[] = (canonical?.variants || raw.variants || []).map((v: CanonicalVariant | LegacyVariantInput) => {
    const vStock = 'stock' in v && typeof v.stock === 'number' ? v.stock : internalStock;
    const vRetailPrice = 'pricing' in v && v.pricing?.retailPrice !== undefined
      ? v.pricing.retailPrice
      : ('retailPrice' in v && typeof v.retailPrice === 'number' ? v.retailPrice : price);
    const size = 'attributes' in v && v.attributes?.size ? v.attributes.size : ('size' in v ? v.size : undefined);
    const color = 'attributes' in v && v.attributes?.color ? v.attributes.color : ('color' in v ? v.color : undefined);

    return {
      sku: v.sku || '',
      size,
      color,
      availability: {
        status: computePublicAvailabilityStatus(vStock)
      },
      retailPrice: vRetailPrice,
      imageUrl: v.imageUrl,
      isActive: v.isActive !== false
    };
  });

  const projection: PublicProductProjection = {
    id: product.id,
    name,
    sku: product.sku,
    price,
    availability: {
      status: computePublicAvailabilityStatus(internalStock)
    },
    category,
    imageUrl,
    description,
    brand,
    model,
    rating,
    reviewCount,
    originalPrice,
    discountPercent,
    isNewArrival,
    isBestSeller,
    isFeatured,
    images,
    specifications,
    reviews: raw.reviews,
    unit: raw.unit || 'Piece',
    publishOnline: publishOnline !== false,
    variants: variants.length > 0 ? variants : undefined
  };

  return projection;
}

/**
 * POS Product View Compatibility Adapter
 *
 * Translates an authoritative CanonicalProduct (plus optional transitional operational state)
 * into the standard `Product` interface expected by existing POS modules, cart calculation,
 * barcode scanner, and receipt printers.
 *
 * NOTE: INV-001 will replace transitional operational parameters with authoritative inventory reads.
 */
export function toPOSProductView(
  product: Product | CanonicalProduct,
  operationalFallback?: Partial<ProductOperationalState>
): Product {
  const canonical: CanonicalProduct | undefined = hasCanonicalProduct(product)
    ? product.canonical
    : (isCanonicalProduct(product) ? product : undefined);
  const raw: LegacyProductInput = product as unknown as LegacyProductInput;
  const op = operationalFallback || raw.operational || {};

  const basePrice = canonical
    ? (canonical.variants[0]?.pricing.retailPrice ?? 0)
    : (typeof raw.price === 'number' ? raw.price : 0);

  const cost = typeof op.cost === 'number'
    ? op.cost
    : (typeof raw.cost === 'number' ? raw.cost : (canonical?.variants[0]?.pricing.costPrice ?? 0));

  const stock = typeof op.stock === 'number'
    ? op.stock
    : (typeof raw.stock === 'number' ? raw.stock : 0);

  const legacyProduct = product as unknown as Product;

  return {
    ...legacyProduct,
    id: product.id,
    name: canonical ? canonical.merchandising.name : (raw.name || ''),
    sku: product.sku,
    price: basePrice,
    cost,
    stock,
    category: canonical ? canonical.classification.category : (raw.category || ''),
    location: op.location || raw.location || 'Store Shelf',
    reorderPoint: op.reorderPoint ?? raw.reorderPoint ?? 0,
    barcode: canonical?.barcode || raw.barcode || '',
    qrCode: canonical?.qrCode || raw.qrCode || '',
    variants: legacyProduct.variants || [],
    salesCount: raw.salesCount ?? 0,
    imageUrl: canonical ? canonical.merchandising.imageUrl : raw.imageUrl,
    description: canonical ? canonical.merchandising.description : raw.description,
    brand: canonical ? canonical.merchandising.brand : raw.brand,
    status: canonical ? canonical.lifecycle.status : (raw.status || 'Active'),
    canonical: canonical || (hasCanonicalProduct(product) ? product.canonical : undefined)
  };
}
