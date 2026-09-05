/**
 * Canonical Product Validation Engine (PROD-001 / PROD-001-F1)
 *
 * Provides centralized, reusable domain validation rules for products,
 * variants, SKUs, and pricing.
 *
 * ARCHITECTURAL INVARIANT:
 * CanonicalProduct and CanonicalVariant represent product/catalog identity ONLY.
 * Validation of canonical entities does NOT require inventory stock or operational fields.
 */

import {
  CanonicalProduct,
  CanonicalVariant,
  ProductValidationResult,
  ProductValidationError,
  ProductOperationalState
} from './types';

/**
 * Validates the formatting of a SKU string.
 * Must be alphanumeric with dashes, underscores, dots, and colons (length 2-100).
 */
export function validateSkuFormat(sku: string): boolean {
  if (!sku || typeof sku !== 'string') return false;
  const trimmed = sku.trim();
  return trimmed.length >= 2 && trimmed.length <= 100 && /^[A-Za-z0-9_.:-]+$/.test(trimmed);
}

/**
 * Validates an authoritative CanonicalVariant.
 * Does NOT require or inspect inventory stock (INV-001 separation).
 */
export function validateVariant(
  variant: CanonicalVariant,
  parentSku?: string
): { isValid: boolean; errors: ProductValidationError[] } {
  const errors: ProductValidationError[] = [];

  if (!variant.id || typeof variant.id !== 'string') {
    errors.push({ field: 'variant.id', message: 'Variant ID is required.' });
  }

  if (!variant.sku || typeof variant.sku !== 'string') {
    errors.push({ field: 'variant.sku', message: 'Variant SKU is required.' });
  } else if (!validateSkuFormat(variant.sku)) {
    errors.push({
      field: 'variant.sku',
      message: `Variant SKU "${variant.sku}" contains invalid characters. Use alphanumeric, dashes, dots, or underscores.`
    });
  }

  if (typeof variant.pricing?.retailPrice !== 'number' || isNaN(variant.pricing.retailPrice) || variant.pricing.retailPrice < 0) {
    errors.push({ field: 'variant.pricing.retailPrice', message: 'Variant retail price must be a non-negative number.' });
  }

  if (variant.pricing?.costPrice !== undefined && (typeof variant.pricing.costPrice !== 'number' || isNaN(variant.pricing.costPrice) || variant.pricing.costPrice < 0)) {
    errors.push({ field: 'variant.pricing.costPrice', message: 'Variant cost price cannot be negative.' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates an authoritative CanonicalProduct entity.
 * Checks identity, merchandising, classification, SKU format, and variant consistency.
 */
export function validateCanonicalProduct(
  product: Partial<CanonicalProduct> & { id?: string; name?: string; price?: number }
): ProductValidationResult {
  const errors: ProductValidationError[] = [];

  // 1. Identity Validation
  const id = product.id?.trim();
  if (!id) {
    errors.push({ field: 'id', message: 'Product ID is required.' });
  } else if (id.length > 128) {
    errors.push({ field: 'id', message: 'Product ID cannot exceed 128 characters.' });
  }

  // 2. Merchandising Validation
  const name = product.merchandising?.name?.trim() || product.name?.trim();
  if (!name) {
    errors.push({ field: 'name', message: 'Product name is required.' });
  } else if (name.length > 200) {
    errors.push({ field: 'name', message: 'Product name cannot exceed 200 characters.' });
  }

  // 3. Classification Validation
  const category = product.classification?.category?.trim();
  if (category !== undefined && category.length > 100) {
    errors.push({ field: 'category', message: 'Category name cannot exceed 100 characters.' });
  }

  // 4. Base SKU Validation
  const sku = product.sku?.trim();
  if (!sku) {
    errors.push({ field: 'sku', message: 'Base product SKU is required.' });
  } else if (!validateSkuFormat(sku)) {
    errors.push({
      field: 'sku',
      message: `Product SKU "${sku}" contains invalid characters. Use alphanumeric, dashes, dots, or underscores.`
    });
  }

  // 5. Pricing Validation
  const retailPrice = product.variants?.[0]?.pricing?.retailPrice ?? (product as any).price;
  if (retailPrice === undefined || typeof retailPrice !== 'number' || isNaN(retailPrice) || retailPrice < 0) {
    errors.push({ field: 'price', message: 'Product retail price must be a non-negative number.' });
  }

  // 6. Lifecycle Validation
  if (product.lifecycle?.status) {
    const validStatuses = ['Active', 'Draft', 'Archived'];
    if (!validStatuses.includes(product.lifecycle.status)) {
      errors.push({
        field: 'lifecycle.status',
        message: `Invalid product status "${product.lifecycle.status}". Must be one of: ${validStatuses.join(', ')}.`
      });
    }
  }

  // 7. Variant Consistency & SKU Uniqueness
  if (product.variants && Array.isArray(product.variants)) {
    const seenSkus = new Set<string>();
    if (sku) seenSkus.add(sku.toLowerCase());

    product.variants.forEach((v, index) => {
      const vResult = validateVariant(v, sku);
      if (!vResult.isValid) {
        vResult.errors.forEach(err => {
          errors.push({
            field: `variants[${index}].${err.field}`,
            message: err.message
          });
        });
      }

      if (v.sku) {
        const lowerSku = v.sku.toLowerCase();
        if (seenSkus.has(lowerSku)) {
          // Single default variant sharing the parent base SKU is allowed
          if (!(product.variants!.length === 1 && lowerSku === sku?.toLowerCase())) {
            errors.push({
              field: `variants[${index}].sku`,
              message: `Duplicate SKU detected: "${v.sku}". Every variant must possess a unique SKU.`
            });
          }
        } else {
          seenSkus.add(lowerSku);
        }
      }
    });
  }

  // 8. Packaging Unit SKU Uniqueness
  if (product.packagingUnits && Array.isArray(product.packagingUnits)) {
    const seenPkgSkus = new Set<string>();
    product.packagingUnits.forEach((u, index) => {
      if (u.sku) {
        const lowerSku = u.sku.toLowerCase();
        if (seenPkgSkus.has(lowerSku)) {
          errors.push({
            field: `packagingUnits[${index}].sku`,
            message: `Duplicate packaging SKU detected: "${u.sku}".`
          });
        }
        seenPkgSkus.add(lowerSku);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Transitional Validator for Legacy Operational State
 * Used in legacy form validation until INV-001 decouples inventory management.
 */
export function validateOperationalState(
  op: Partial<ProductOperationalState>
): ProductValidationResult {
  const errors: ProductValidationError[] = [];

  if (typeof op.cost === 'number' && op.cost < 0) {
    errors.push({ field: 'cost', message: 'Cost price cannot be negative.' });
  }
  if (typeof op.stock === 'number' && op.stock < 0) {
    errors.push({ field: 'stock', message: 'Stock level cannot be negative.' });
  }
  if (typeof op.reorderPoint === 'number' && op.reorderPoint < 0) {
    errors.push({ field: 'reorderPoint', message: 'Reorder point cannot be negative.' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
