/**
 * Canonical Product Normalization Engine (PROD-001)
 *
 * Provides bidirectional normalization between legacy/Firestore documents and
 * the Canonical Product domain representation.
 *
 * Solves:
 * - Single-SKU vs. Multi-Variant normalization
 * - Packaging & Multi-UOM consolidation
 * - Legacy field mapping without destructive changes
 */

import {
  CanonicalProduct,
  CanonicalVariant,
  ProductClassification,
  ProductLifecycle,
  ProductMerchandising,
  ProductOperationalState
} from './types';
import { Product, ProductVariant, PackagingUnit } from '../../types';

/**
 * Normalizes any legacy or Firestore product record into a unified CanonicalProduct
 * while preserving full backward compatibility with the legacy `Product` interface.
 */
export function normalizeProduct(raw: any): Product & { canonical: CanonicalProduct } {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cannot normalize non-object product data');
  }

  const id = String(raw.id || '').trim();
  const sku = String(raw.sku || '').trim() || `SKU-${id}`;
  const name = String(raw.name || raw.merchandising?.name || 'Unnamed Product').trim();
  const price = typeof raw.price === 'number' && !isNaN(raw.price) && raw.price >= 0
    ? raw.price
    : (raw.variants?.[0]?.pricing?.retailPrice ?? raw.variants?.[0]?.retailPrice ?? 0);
  const cost = typeof raw.cost === 'number' && !isNaN(raw.cost) && raw.cost >= 0
    ? raw.cost
    : (raw.variants?.[0]?.pricing?.costPrice ?? raw.variants?.[0]?.costPrice ?? 0);
  const stock = typeof raw.stock === 'number' && !isNaN(raw.stock) && raw.stock >= 0
    ? raw.stock
    : (raw.variants?.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0) ?? 0);
  const category = String(raw.category || raw.classification?.category || 'General').trim();
  const barcode = raw.barcode ? String(raw.barcode).trim() : undefined;
  const qrCode = raw.qrCode ? String(raw.qrCode).trim() : undefined;

  // 1. Merchandising
  const merchandising: ProductMerchandising = {
    name,
    description: String(raw.description || raw.merchandising?.description || ''),
    brand: raw.brand || raw.merchandising?.brand || undefined,
    model: raw.model || raw.merchandising?.model || undefined,
    imageUrl: raw.imageUrl || raw.merchandising?.imageUrl || raw.images?.[0] || undefined,
    images: Array.isArray(raw.images) ? raw.images : (raw.imageUrl ? [raw.imageUrl] : []),
    rating: typeof raw.rating === 'number' ? raw.rating : 5.0,
    reviewCount: typeof raw.reviewCount === 'number' ? raw.reviewCount : 0,
    specifications: raw.specifications || raw.merchandising?.specifications || {},
    isFeatured: Boolean(raw.isFeatured ?? raw.merchandising?.isFeatured),
    isNewArrival: Boolean(raw.isNewArrival ?? raw.merchandising?.isNewArrival),
    isBestSeller: Boolean(raw.isBestSeller ?? raw.merchandising?.isBestSeller),
    originalPrice: typeof raw.originalPrice === 'number' ? raw.originalPrice : undefined,
    discountPercent: typeof raw.discountPercent === 'number' ? raw.discountPercent : undefined
  };

  // 2. Classification
  const classification: ProductClassification = {
    category,
    productType: raw.productType || raw.classification?.productType || 'Standard',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    taxCategory: raw.taxCategory || raw.classification?.taxCategory,
    isTaxExempt: Boolean(raw.isTaxExempt || raw.classification?.isTaxExempt)
  };

  // 3. Lifecycle
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
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt
  };

  // 4. Variants Normalization
  const canonicalVariants: CanonicalVariant[] = [];
  const legacyVariants: ProductVariant[] = [];

  if (Array.isArray(raw.variants) && raw.variants.length > 0) {
    raw.variants.forEach((v: any, index: number) => {
      const vSku = String(v.sku || `${sku}-${index + 1}`).trim();
      const vRetailPrice = typeof v.pricing?.retailPrice === 'number'
        ? v.pricing.retailPrice
        : (typeof v.retailPrice === 'number' ? v.retailPrice : price);
      const vCostPrice = typeof v.pricing?.costPrice === 'number'
        ? v.pricing.costPrice
        : (typeof v.costPrice === 'number' ? v.costPrice : cost);
      const vStock = typeof v.stock === 'number' && !isNaN(v.stock) ? v.stock : 0;

      const variantName = v.name || [v.size, v.color, v.model].filter(Boolean).join(' / ') || `Variant ${index + 1}`;

      const canonicalVar: CanonicalVariant = {
        id: v.id || `${id}-var-${vSku}`,
        productId: id,
        sku: vSku,
        barcode: v.barcode,
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
          minimumPrice: v.minimumPrice
        },
        stock: vStock,
        isActive: v.isActive !== false,
        imageUrl: v.imageUrl,
        isDefault: index === 0
      };

      canonicalVariants.push(canonicalVar);

      // Legacy variant structure for backwards compatibility
      legacyVariants.push({
        sku: vSku,
        size: v.size || canonicalVar.attributes.size,
        color: v.color || canonicalVar.attributes.color,
        model: v.model || canonicalVar.attributes.model,
        optionName: v.optionName || variantName,
        stock: vStock,
        costPrice: vCostPrice,
        retailPrice: vRetailPrice,
        wholesalePrice: v.wholesalePrice,
        barcode: v.barcode,
        imageUrl: v.imageUrl,
        isActive: v.isActive !== false
      });
    });
  } else {
    // Single-SKU product: normalize into one default canonical variant
    const defaultVar: CanonicalVariant = {
      id: `${id}-var-default`,
      productId: id,
      sku,
      barcode,
      name: 'Standard Unit',
      attributes: {},
      pricing: {
        retailPrice: price,
        costPrice: cost
      },
      stock,
      isActive: true,
      imageUrl: merchandising.imageUrl,
      isDefault: true
    };
    canonicalVariants.push(defaultVar);
  }

  // 5. Operational State
  const operational: ProductOperationalState = {
    stock,
    cost,
    location: raw.location || raw.operational?.location || 'Store Shelf',
    reorderPoint: typeof raw.reorderPoint === 'number' ? raw.reorderPoint : 0,
    trackingMode: raw.inventoryTracking || raw.trackingMode || (raw.trackSerial ? 'SERIAL' : raw.trackBatch ? 'BATCH' : 'QUANTITY'),
    stockRotationMethod: raw.stockRotationMethod || 'FIFO',
    serialNumbers: raw.serialNumbers || (raw.serialNumber ? [raw.serialNumber] : undefined),
    batchNumber: raw.batchNumber || raw.batchLot,
    expiryDate: raw.expiryDate,
    unit: raw.unit || raw.operational?.unit || 'Piece'
  };

  // 6. Packaging Units Consolidation
  const packagingUnits: PackagingUnit[] = [];
  if (Array.isArray(raw.packagingUnits)) {
    packagingUnits.push(...raw.packagingUnits);
  } else if (raw.packaging?.sellingTiers && Array.isArray(raw.packaging.sellingTiers)) {
    raw.packaging.sellingTiers.forEach((tier: any) => {
      packagingUnits.push({
        id: tier.id || `tier-${tier.unitQuantity}`,
        unitName: tier.name,
        multiplier: tier.unitQuantity || 1,
        base_unit: raw.packaging?.baseSellingUnitName || 'Piece',
        barcode: tier.barcode,
        sellingPrice: tier.sellingPrice,
        isDefaultSellingUnit: Boolean(tier.isDefaultSellingUnit),
        isPackUnit: tier.unitQuantity > 1,
        sellingMode: tier.unitQuantity > 1 ? 'pack_selling' : 'retail_unit'
      });
    });
  }

  // Build CanonicalProduct aggregate
  const canonical: CanonicalProduct = {
    id,
    sku,
    barcode,
    qrCode,
    merchandising,
    classification,
    lifecycle,
    variants: canonicalVariants,
    operational,
    packagingUnits: packagingUnits.length > 0 ? packagingUnits.map(u => ({
      id: u.id,
      unitName: u.unitName,
      multiplier: u.multiplier,
      baseUnit: u.base_unit,
      sellingPrice: u.sellingPrice,
      barcode: u.barcode,
      sku: u.sku,
      isDefaultSellingUnit: u.isDefaultSellingUnit,
      isPackUnit: u.isPackUnit
    })) : undefined
  };

  // Return hybrid satisfying both Product and { canonical: CanonicalProduct }
  const normalized: Product & { canonical: CanonicalProduct } = {
    ...raw,
    id,
    name,
    sku,
    price,
    cost,
    stock,
    category,
    location: operational.location,
    reorderPoint: operational.reorderPoint,
    barcode: barcode || '',
    qrCode: qrCode || '',
    variants: legacyVariants,
    salesCount: typeof raw.salesCount === 'number' ? raw.salesCount : 0,
    imageUrl: merchandising.imageUrl,
    images: merchandising.images,
    description: merchandising.description,
    brand: merchandising.brand,
    model: merchandising.model,
    rating: merchandising.rating,
    reviewCount: merchandising.reviewCount,
    specifications: merchandising.specifications,
    reviews: raw.reviews,
    isFeatured: merchandising.isFeatured,
    isNewArrival: merchandising.isNewArrival,
    isBestSeller: merchandising.isBestSeller,
    originalPrice: merchandising.originalPrice,
    discountPercent: merchandising.discountPercent,
    status: lifecycle.status,
    productType: classification.productType,
    publishOnline: lifecycle.visibility.publishOnline,
    sellOnPOS: lifecycle.visibility.sellOnPOS,
    sellOnline: lifecycle.visibility.sellOnline,
    returnable: lifecycle.returnable,
    unit: operational.unit,
    packagingUnits: packagingUnits.length > 0 ? packagingUnits : raw.packagingUnits,
    packaging: raw.packaging,
    bulkPackaging: raw.bulkPackaging,
    canonical
  };

  return normalized;
}
