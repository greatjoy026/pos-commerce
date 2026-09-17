import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveCatalogSku,
  toBaseUnitQuantity,
  toPublicCatalogProduct,
  toSharedCatalogProduct,
} from '../src/domain/catalog';
import type { CanonicalProduct } from '../src/domain/product/types';

const product: CanonicalProduct = {
  id: 'prod-1',
  sku: 'TEE-FAMILY',
  merchandising: {
    name: 'Classic Tee',
    description: 'A test product',
    images: [],
    rating: 5,
    reviewCount: 0,
  },
  classification: {
    category: 'Apparel',
    productType: 'Physical',
    tags: [],
  },
  lifecycle: {
    status: 'Active',
    visibility: { publishOnline: true, sellOnPOS: true, sellOnline: true },
    returnable: true,
  },
  variants: [
    {
      id: 'variant-m-blue',
      productId: 'prod-1',
      sku: 'TEE-M-BLU',
      name: 'Medium / Blue',
      attributes: { size: 'M', color: 'Blue' },
      pricing: { retailPrice: 100 },
      isActive: true,
      isDefault: true,
    },
    {
      id: 'variant-l-blue',
      productId: 'prod-1',
      sku: 'TEE-L-BLU',
      name: 'Large / Blue',
      attributes: { size: 'L', color: 'Blue' },
      pricing: { retailPrice: 100 },
      isActive: true,
    },
  ],
  packagingUnits: [
    {
      id: 'pack-6',
      unitName: 'Pack of 6',
      multiplier: 6,
      baseUnit: 'piece',
      sellingPrice: 570,
      isPackUnit: true,
    },
  ],
};

test('shared contract preserves Product → Variant → SKU identity', () => {
  const shared = toSharedCatalogProduct(product);
  const sku = resolveCatalogSku(shared, { variantId: 'variant-m-blue' });

  assert.equal(sku.productId, 'prod-1');
  assert.equal(sku.variantId, 'variant-m-blue');
  assert.equal(sku.sku, 'TEE-M-BLU');
});

test('invalid variant never falls back to the parent SKU', () => {
  const shared = toSharedCatalogProduct(product);
  assert.throws(() => resolveCatalogSku(shared, { variantId: 'missing-variant' }));
});

test('packaging conversion is catalog-defined', () => {
  const shared = toSharedCatalogProduct(product);
  assert.equal(toBaseUnitQuantity(shared, 2, 'pack-6'), 12);
  assert.equal(resolveCatalogSku(shared, { variantId: 'variant-m-blue', packagingUnitId: 'pack-6' }).price, 570);
});

test('unknown packaging unit is rejected', () => {
  const shared = toSharedCatalogProduct(product);
  assert.throws(() => toBaseUnitQuantity(shared, 1, 'unknown'));
});

test('public projection contains availability status but no exact stock or cost', () => {
  const publicProduct = toPublicCatalogProduct(product, 3);
  const serialized = JSON.stringify(publicProduct);

  assert.equal(publicProduct.availability.status, 'LOW_STOCK');
  assert.equal(Object.prototype.hasOwnProperty.call(publicProduct, 'stock'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(publicProduct, 'cost'), false);
  assert.equal(serialized.includes('"stock"'), false);
  assert.equal(serialized.includes('"costPrice"'), false);
});

test('invalid catalog packaging multiplier is rejected', () => {
  const invalid = structuredClone(product);
  invalid.packagingUnits = [{ ...product.packagingUnits![0], multiplier: 0 }];
  assert.throws(() => toSharedCatalogProduct(invalid));
});
