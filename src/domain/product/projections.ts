/**
 * Product Projections & Adapters (PROD-001)
 *
 * Implements the contract:
 * "One canonical product domain, multiple consumers."
 *
 * Provides safe projections for:
 * 1. Public E-Commerce Storefront (SEC-001 boundary: strips all costs, suppliers, internal serials, batches)
 * 2. POS Module (full operational data for cashier terminal)
 * 3. Inventory Module (stock, location, and reorder metrics)
 */

import { CanonicalProduct, CanonicalVariant } from './types';
import { Product, PublicProductProjection } from '../../types';

/**
 * Public Storefront Catalog Projection
 *
 * CRITICAL SECURITY INVARIANT:
 * This projection MUST NEVER contain:
 * - Wholesale cost prices (`cost`, `costPrice`, `packageCost`)
 * - Supplier details (`supplier`)
 * - Reorder points (`reorderPoint`, `reorderLevel`)
 * - Hardware / serial tracking data (`serialNumbers`, `serialNumber`, `batchNumber`, `batchLot`)
 * - Internal operational notes
 */
export function toPublicCatalogProjection(product: Product | CanonicalProduct): PublicProductProjection {
  const raw = product as any;

  // Extract merchandising values from either canonical structure or root properties
  const name = raw.merchandising?.name || raw.name || '';
  const description = raw.merchandising?.description || raw.description;
  const brand = raw.merchandising?.brand || raw.brand;
  const model = raw.merchandising?.model || raw.model;
  const imageUrl = raw.merchandising?.imageUrl || raw.imageUrl;
  const images = raw.merchandising?.images || raw.images;
  const rating = raw.merchandising?.rating ?? raw.rating;
  const reviewCount = raw.merchandising?.reviewCount ?? raw.reviewCount;
  const originalPrice = raw.merchandising?.originalPrice ?? raw.originalPrice;
  const discountPercent = raw.merchandising?.discountPercent ?? raw.discountPercent;
  const isFeatured = raw.merchandising?.isFeatured ?? raw.isFeatured;
  const isNewArrival = raw.merchandising?.isNewArrival ?? raw.isNewArrival;
  const isBestSeller = raw.merchandising?.isBestSeller ?? raw.isBestSeller;
  const specifications = raw.merchandising?.specifications || raw.specifications;

  const category = raw.classification?.category || raw.category || 'General';
  const price = typeof raw.price === 'number' ? raw.price : (raw.variants?.[0]?.pricing?.retailPrice || 0);
  const stock = typeof raw.stock === 'number' ? raw.stock : (raw.operational?.stock ?? 0);
  const publishOnline = raw.lifecycle?.visibility?.publishOnline ?? raw.publishOnline ?? true;

  // Safe public variant projection (strips costPrice and internal attributes)
  const variants = (raw.variants || []).map((v: any) => ({
    sku: v.sku,
    size: v.size || v.attributes?.size,
    color: v.color || v.attributes?.color,
    stock: typeof v.stock === 'number' ? v.stock : 0,
    retailPrice: v.pricing?.retailPrice ?? v.retailPrice ?? price,
    imageUrl: v.imageUrl,
    isActive: v.isActive !== false
  }));

  const projection: PublicProductProjection = {
    id: raw.id,
    name,
    sku: raw.sku,
    price,
    stock,
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
    unit: raw.operational?.unit || raw.unit,
    publishOnline: publishOnline !== false,
    variants: variants.length > 0 ? variants : undefined
  };

  return projection;
}

/**
 * POS Product View Adapter
 * Ensures the product possesses all standard runtime properties required by
 * cashiers and cart calculations.
 */
export function toPOSProductView(product: Product | CanonicalProduct): Product {
  const raw = product as any;

  // Return product with guaranteed shape
  return {
    ...raw,
    id: raw.id,
    name: raw.merchandising?.name || raw.name,
    sku: raw.sku,
    price: typeof raw.price === 'number' ? raw.price : (raw.variants?.[0]?.pricing?.retailPrice || 0),
    cost: raw.cost ?? raw.operational?.cost ?? 0,
    stock: raw.stock ?? raw.operational?.stock ?? 0,
    category: raw.classification?.category || raw.category || 'General',
    location: raw.operational?.location || raw.location || 'Store Shelf',
    reorderPoint: raw.operational?.reorderPoint ?? raw.reorderPoint ?? 0,
    barcode: raw.barcode || '',
    qrCode: raw.qrCode || '',
    variants: raw.variants || [],
    salesCount: raw.salesCount ?? 0,
    imageUrl: raw.merchandising?.imageUrl || raw.imageUrl,
    description: raw.merchandising?.description || raw.description,
    brand: raw.merchandising?.brand || raw.brand
  };
}
