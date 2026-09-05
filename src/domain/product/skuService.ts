/**
 * Canonical SKU Service (PROD-001 / PROD-001-F1)
 *
 * Implements the authoritative SKU domain concepts:
 * - Unambiguous SKU Architecture: A SKU identifies a sellable unit.
 * - SKU Resolution: Resolving barcodes, QR codes, or SKU codes to sellable units.
 * - SKU Extraction: Authoritative extraction of all sellable SKUs (Base, Variant, Packaging).
 * - Catalog Uniqueness: Strict case-insensitive uniqueness across the entire catalog.
 *
 * ARCHITECTURAL INVARIANT:
 * ProductSku MUST NOT be an inventory model. It contains NO warehouse quantities,
 * stock balances, or inventory valuations.
 */

import {
  CanonicalProduct,
  CanonicalVariant,
  PackagingUnitInfo,
  ProductSku,
  SkuType,
  LegacyProductInput,
  LegacyVariantInput,
  LegacyPackagingUnitInput
} from './types';
import { Product } from '../../types';
import { hasCanonicalProduct, isCanonicalProduct } from './projections';

export interface SkuResolutionResult {
  found: boolean;
  matchType: 'base_sku' | 'variant_sku' | 'barcode' | 'variant_barcode' | 'packaging_unit';
  sku: string;
  barcode?: string;
  price: number;
  sellableName: string;
  productId: string;
  variantId?: string;
  variant?: CanonicalVariant;
  packagingUnitId?: string;
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
  const canonical: CanonicalProduct | undefined = hasCanonicalProduct(product)
    ? product.canonical
    : (isCanonicalProduct(product) ? product : undefined);
  const raw: LegacyProductInput = product as unknown as LegacyProductInput;

  const productId = product.id;
  const productName = canonical ? canonical.merchandising.name : (raw.name || '');
  const basePrice = typeof raw.price === 'number'
    ? raw.price
    : (canonical?.variants.find(v => v.isDefault)?.pricing.retailPrice ?? canonical?.variants[0]?.pricing.retailPrice ?? 0);

  // 1. Direct Base SKU match
  if (product.sku && product.sku.trim().toLowerCase() === query) {
    return {
      found: true,
      matchType: 'base_sku',
      sku: product.sku,
      barcode: canonical?.barcode || raw.barcode,
      price: basePrice,
      sellableName: productName,
      productId
    };
  }

  // 2. Direct Base Barcode / QR match
  const baseBarcode = canonical?.barcode || raw.barcode;
  const baseQr = canonical?.qrCode || raw.qrCode;
  if ((baseBarcode && baseBarcode.trim().toLowerCase() === query) || (baseQr && baseQr.trim().toLowerCase() === query)) {
    return {
      found: true,
      matchType: 'barcode',
      sku: product.sku,
      barcode: baseBarcode,
      price: basePrice,
      sellableName: productName,
      productId
    };
  }

  // 3. Variant SKU & Barcode match
  const variants: (CanonicalVariant | LegacyVariantInput)[] = canonical?.variants || raw.variants || [];
  for (const v of variants) {
    const vSku = (v.sku || '').trim().toLowerCase();
    const vBarcode = (v.barcode || '').trim().toLowerCase();
    const vRetailPrice = 'pricing' in v && v.pricing?.retailPrice !== undefined
      ? v.pricing.retailPrice
      : ('retailPrice' in v && typeof v.retailPrice === 'number' ? v.retailPrice : basePrice);
    const vSize = 'attributes' in v && v.attributes?.size ? v.attributes.size : ('size' in v ? v.size : undefined);
    const vColor = 'attributes' in v && v.attributes?.color ? v.attributes.color : ('color' in v ? v.color : undefined);
    const vModel = 'attributes' in v && v.attributes?.model ? v.attributes.model : ('model' in v ? v.model : undefined);
    const variantName = v.name || [vSize, vColor, vModel].filter(Boolean).join(' / ') || v.sku || '';

    if (vSku && vSku === query) {
      return {
        found: true,
        matchType: 'variant_sku',
        sku: v.sku || '',
        barcode: v.barcode,
        price: vRetailPrice,
        sellableName: `${productName} (${variantName})`,
        productId,
        variantId: v.id,
        variant: 'pricing' in v ? (v as CanonicalVariant) : undefined
      };
    }

    if (vBarcode && vBarcode === query) {
      return {
        found: true,
        matchType: 'variant_barcode',
        sku: v.sku || '',
        barcode: v.barcode,
        price: vRetailPrice,
        sellableName: `${productName} (${variantName})`,
        productId,
        variantId: v.id,
        variant: 'pricing' in v ? (v as CanonicalVariant) : undefined
      };
    }
  }

  // 4. Packaging Unit SKU / Barcode match
  const packagingUnits: (PackagingUnitInfo | LegacyPackagingUnitInput)[] =
    canonical?.packagingUnits || raw.packagingUnits || raw.packaging?.packagingUnits || [];
  for (const unit of packagingUnits) {
    const uSku = (unit.sku || '').trim().toLowerCase();
    const uBarcode = (unit.barcode || '').trim().toLowerCase();

    if ((uSku && uSku === query) || (uBarcode && uBarcode === query)) {
      const unitId = unit.id || 'default-pkg';
      const unitName = 'unitName' in unit && unit.unitName ? unit.unitName : ('name' in unit && unit.name ? unit.name : 'Packaging Unit');
      const unitMultiplier = unit.multiplier || 1;
      const sellingPrice = typeof unit.sellingPrice === 'number' ? unit.sellingPrice : basePrice;
      const unitSku = unit.sku || (product.sku ? `${product.sku}-PKG-${unitId}` : unitId);

      return {
        found: true,
        matchType: 'packaging_unit',
        sku: unitSku,
        barcode: unit.barcode,
        price: sellingPrice,
        sellableName: `${productName} (${unitName})`,
        productId,
        packagingUnitId: unitId,
        packagingUnit: {
          id: unitId,
          unitName,
          multiplier: unitMultiplier,
          sellingPrice
        }
      };
    }
  }

  return null;
}

/**
 * Extracts all authoritative sellable SKUs associated with a product.
 * Consistent with resolveProductSku and validateSkuUniqueness:
 * - Base SKU (for single-item or default sellable)
 * - Variant SKUs (all sellable configurations)
 * - Packaging SKUs (independently sellable pack units)
 */
export function extractAllProductSkus(product: Product | CanonicalProduct): ProductSku[] {
  const results: ProductSku[] = [];
  const canonical: CanonicalProduct | undefined = hasCanonicalProduct(product)
    ? product.canonical
    : (isCanonicalProduct(product) ? product : undefined);
  const raw: LegacyProductInput = product as unknown as LegacyProductInput;

  const productId = product.id;
  const productName = canonical ? canonical.merchandising.name : (raw.name || '');
  const basePrice = typeof raw.price === 'number'
    ? raw.price
    : (canonical?.variants.find(v => v.isDefault)?.pricing.retailPrice ?? canonical?.variants[0]?.pricing.retailPrice ?? 0);

  const seenSkus = new Set<string>();

  // 1. Base / Default SKU
  if (product.sku) {
    results.push({
      sku: product.sku,
      barcode: canonical?.barcode || raw.barcode,
      productId,
      skuType: 'base',
      sellableName: productName,
      price: basePrice
    });
    seenSkus.add(product.sku.toLowerCase());
  }

  // 2. Variant SKUs
  const variants: (CanonicalVariant | LegacyVariantInput)[] = canonical?.variants || raw.variants || [];
  for (const v of variants) {
    if (v.sku && !seenSkus.has(v.sku.toLowerCase())) {
      const vSize = 'attributes' in v && v.attributes?.size ? v.attributes.size : ('size' in v ? v.size : undefined);
      const vColor = 'attributes' in v && v.attributes?.color ? v.attributes.color : ('color' in v ? v.color : undefined);
      const vModel = 'attributes' in v && v.attributes?.model ? v.attributes.model : ('model' in v ? v.model : undefined);
      const variantName = v.name || [vSize, vColor, vModel].filter(Boolean).join(' / ') || v.sku;
      const vPrice = 'pricing' in v && v.pricing?.retailPrice !== undefined
        ? v.pricing.retailPrice
        : ('retailPrice' in v && typeof v.retailPrice === 'number' ? v.retailPrice : basePrice);

      const attributes = 'attributes' in v && v.attributes
        ? v.attributes
        : {
            ...(vSize ? { size: vSize } : {}),
            ...(vColor ? { color: vColor } : {})
          };

      results.push({
        sku: v.sku,
        barcode: v.barcode,
        productId,
        variantId: v.id,
        skuType: 'variant',
        sellableName: `${productName} (${variantName})`,
        price: vPrice,
        attributes
      });
      seenSkus.add(v.sku.toLowerCase());
    }
  }

  // 3. Packaging SKUs
  const packagingUnits: (PackagingUnitInfo | LegacyPackagingUnitInput)[] =
    canonical?.packagingUnits || raw.packagingUnits || raw.packaging?.packagingUnits || [];
  for (const unit of packagingUnits) {
    const pkgSku = unit.sku ? unit.sku.trim() : (unit.id ? (product.sku ? `${product.sku}-PKG-${unit.id}` : unit.id) : undefined);
    if (pkgSku && !seenSkus.has(pkgSku.toLowerCase())) {
      const unitName = 'unitName' in unit && unit.unitName ? unit.unitName : ('name' in unit && unit.name ? unit.name : 'Packaging Unit');
      const unitPrice = typeof unit.sellingPrice === 'number' ? unit.sellingPrice : basePrice;

      results.push({
        sku: pkgSku,
        barcode: unit.barcode ? String(unit.barcode).trim() : undefined,
        productId,
        packagingUnitId: unit.id,
        skuType: 'packaging',
        sellableName: `${productName} (${unitName})`,
        price: unitPrice
      });
      seenSkus.add(pkgSku.toLowerCase());
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
  const cleanPrefix = (basePrefix || 'SKU').trim().toUpperCase().replace(/[^A-Z0-9_.-]/g, '');
  if (!attributes || Object.keys(attributes).length === 0) {
    return cleanPrefix;
  }

  const parts = Object.values(attributes)
    .filter(Boolean)
    .map(val => String(val).trim().toUpperCase().replace(/[^A-Z0-9_.-]/g, ''))
    .filter(Boolean);

  return parts.length > 0 ? `${cleanPrefix}-${parts.join('-')}` : cleanPrefix;
}

/**
 * Validates SKU uniqueness across the entire product catalog.
 * Performs a deterministic, case-insensitive comparison across all sellable SKUs
 * (base SKUs, variant SKUs, and packaging SKUs).
 */
export function validateSkuUniqueness(
  products: (Product | CanonicalProduct)[],
  targetSku: string,
  excludeProductId?: string
): boolean {
  if (!targetSku || typeof targetSku !== 'string') return false;
  const cleanQuery = targetSku.trim().toLowerCase();
  if (!cleanQuery) return false;

  for (const p of products) {
    if (excludeProductId && p.id === excludeProductId) continue;
    const allSkus = extractAllProductSkus(p);
    if (allSkus.some(s => s.sku.toLowerCase() === cleanQuery)) {
      return false; // Collision detected (already exists)
    }
  }

  return true; // Unique
}

/**
 * Validates barcode uniqueness across the entire product catalog.
 */
export function validateBarcodeUniqueness(
  products: (Product | CanonicalProduct)[],
  targetBarcode: string,
  excludeProductId?: string
): boolean {
  if (!targetBarcode || typeof targetBarcode !== 'string') return true; // Optional barcode
  const cleanQuery = targetBarcode.trim().toLowerCase();
  if (!cleanQuery) return true;

  for (const p of products) {
    if (excludeProductId && p.id === excludeProductId) continue;
    const allSkus = extractAllProductSkus(p);
    if (allSkus.some(s => s.barcode && s.barcode.trim().toLowerCase() === cleanQuery)) {
      return false; // Collision detected
    }
  }

  return true; // Unique
}
