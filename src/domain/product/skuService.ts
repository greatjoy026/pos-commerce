/**
 * Canonical SKU Service (PROD-001)
 *
 * Implements the authoritative SKU domain concept:
 * - SKU resolution (identifying a sellable unit from scanned barcode or typed SKU)
 * - Extraction of all sellable SKUs for a product
 * - Standardization and uniqueness checks across the catalog
 */

import { CanonicalProduct, CanonicalVariant, ProductSku } from './types';
import { Product } from '../../types';

export interface SkuResolutionResult {
  found: boolean;
  matchType: 'base_sku' | 'variant_sku' | 'barcode' | 'variant_barcode' | 'packaging_unit';
  sku: string;
  barcode?: string;
  price: number;
  cost?: number;
  variantId?: string;
  variant?: CanonicalVariant;
  packagingUnit?: {
    id: string;
    unitName: string;
    multiplier: number;
    sellingPrice: number;
  };
}

/**
 * Resolves an identifier (SKU string, barcode, or QR code) against a product's
 * base definition, variants, and packaging units.
 */
export function resolveProductSku(
  product: Product | CanonicalProduct,
  identifier: string
): SkuResolutionResult | null {
  if (!product || !identifier) return null;

  const query = identifier.trim().toLowerCase();
  const raw = product as any;

  // 1. Direct Base SKU match
  if (product.sku && product.sku.trim().toLowerCase() === query) {
    return {
      found: true,
      matchType: 'base_sku',
      sku: product.sku,
      barcode: raw.barcode,
      price: typeof raw.price === 'number' ? raw.price : (raw.variants?.[0]?.pricing?.retailPrice || 0),
      cost: raw.cost ?? raw.operational?.cost
    };
  }

  // 2. Direct Base Barcode match
  if (raw.barcode && raw.barcode.trim().toLowerCase() === query) {
    return {
      found: true,
      matchType: 'barcode',
      sku: product.sku,
      barcode: raw.barcode,
      price: typeof raw.price === 'number' ? raw.price : (raw.variants?.[0]?.pricing?.retailPrice || 0),
      cost: raw.cost ?? raw.operational?.cost
    };
  }

  // 3. Variant SKU match
  if (raw.variants && Array.isArray(raw.variants)) {
    for (const v of raw.variants) {
      const vSku = (v.sku || '').trim().toLowerCase();
      if (vSku === query) {
        return {
          found: true,
          matchType: 'variant_sku',
          sku: v.sku,
          barcode: v.barcode,
          price: v.pricing?.retailPrice ?? v.retailPrice ?? raw.price ?? 0,
          cost: v.pricing?.costPrice ?? v.costPrice ?? raw.cost,
          variantId: v.id,
          variant: v
        };
      }

      // Variant Barcode match
      const vBarcode = (v.barcode || '').trim().toLowerCase();
      if (vBarcode && vBarcode === query) {
        return {
          found: true,
          matchType: 'variant_barcode',
          sku: v.sku,
          barcode: v.barcode,
          price: v.pricing?.retailPrice ?? v.retailPrice ?? raw.price ?? 0,
          cost: v.pricing?.costPrice ?? v.costPrice ?? raw.cost,
          variantId: v.id,
          variant: v
        };
      }
    }
  }

  // 4. Packaging Unit SKU / Barcode match
  const packagingUnits = raw.packagingUnits || raw.packaging?.packagingUnits;
  if (packagingUnits && Array.isArray(packagingUnits)) {
    for (const unit of packagingUnits) {
      const uSku = (unit.sku || '').trim().toLowerCase();
      const uBarcode = (unit.barcode || '').trim().toLowerCase();

      if ((uSku && uSku === query) || (uBarcode && uBarcode === query)) {
        return {
          found: true,
          matchType: 'packaging_unit',
          sku: unit.sku || product.sku,
          barcode: unit.barcode,
          price: unit.sellingPrice,
          cost: unit.costPrice,
          packagingUnit: {
            id: unit.id,
            unitName: unit.unitName,
            multiplier: unit.multiplier || 1,
            sellingPrice: unit.sellingPrice
          }
        };
      }
    }
  }

  return null;
}

/**
 * Extracts all authoritative sellable SKUs associated with a product.
 */
export function extractAllProductSkus(product: Product | CanonicalProduct): ProductSku[] {
  const results: ProductSku[] = [];
  const raw = product as any;
  const productName = raw.merchandising?.name || raw.name || 'Unnamed Product';
  const basePrice = raw.price ?? raw.variants?.[0]?.pricing?.retailPrice ?? 0;
  const baseCost = raw.cost ?? raw.operational?.cost;

  // Base SKU
  if (product.sku) {
    results.push({
      sku: product.sku,
      barcode: raw.barcode,
      productId: product.id,
      sellableName: productName,
      price: basePrice,
      cost: baseCost,
      stock: raw.stock ?? raw.operational?.stock
    });
  }

  // Variant SKUs
  if (raw.variants && Array.isArray(raw.variants)) {
    for (const v of raw.variants) {
      if (v.sku && v.sku !== product.sku) {
        const variantName = v.name || [v.size, v.color].filter(Boolean).join(' / ') || v.sku;
        results.push({
          sku: v.sku,
          barcode: v.barcode,
          productId: product.id,
          variantId: v.id,
          sellableName: `${productName} (${variantName})`,
          price: v.pricing?.retailPrice ?? v.retailPrice ?? basePrice,
          cost: v.pricing?.costPrice ?? v.costPrice ?? baseCost,
          attributes: v.attributes || { size: v.size, color: v.color },
          stock: v.stock
        });
      }
    }
  }

  return results;
}

/**
 * Generates a clean, normalized SKU string from a prefix and attribute options.
 * Example: generateCanonicalSku('AP-TS', { size: 'L', color: 'BLK' }) -> 'AP-TS-L-BLK'
 */
export function generateCanonicalSku(
  basePrefix: string,
  attributes?: Record<string, string>
): string {
  const cleanPrefix = (basePrefix || 'SKU').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!attributes || Object.keys(attributes).length === 0) {
    return cleanPrefix;
  }

  const parts = Object.values(attributes)
    .filter(Boolean)
    .map(val => val.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
    .filter(Boolean);

  return parts.length > 0 ? `${cleanPrefix}-${parts.join('-')}` : cleanPrefix;
}

/**
 * Validates SKU uniqueness across the entire product catalog.
 */
export function validateSkuUniqueness(
  products: (Product | CanonicalProduct)[],
  targetSku: string,
  excludeProductId?: string
): boolean {
  if (!targetSku) return false;
  const cleanQuery = targetSku.trim().toLowerCase();

  for (const p of products) {
    if (excludeProductId && p.id === excludeProductId) continue;
    const allSkus = extractAllProductSkus(p);
    if (allSkus.some(s => s.sku.toLowerCase() === cleanQuery)) {
      return false; // Not unique (already exists)
    }
  }

  return true; // Unique
}
