import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPosInventorySaleLines } from '../src/domain/pos/inventoryResolution';
import type { Order, Product } from '../src/types';

const product = {
  id: 'prod-1',
  name: 'Crispy Bars',
  sku: 'BAR-001',
  price: 10,
  stock: 100,
  category: 'Food',
  location: 'Aisle 1',
  reorderPoint: 5,
  barcode: '123',
  variants: [{ sku: 'BAR-001-CHOC', stock: 50 }],
  salesCount: 0,
} as Product;

const order = (item: Order['items'][number]): Order => ({
  id: 'ord-pos-1001',
  date: new Date().toISOString(),
  items: [item],
  subtotal: 20,
  tax: 0,
  discount: 0,
  total: 20,
  paymentMethod: 'Cash',
  channel: 'In-Store POS',
  status: 'Completed',
});

describe('POS inventory resolution', () => {
  it('resolves a standard product SKU and base quantity', () => {
    const result = buildPosInventorySaleLines(order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 2, price: 10 }), [product]);
    assert.deepEqual(result[0], {
      sku: 'BAR-001',
      productId: 'prod-1',
      locationId: 'loc-main-store',
      quantity: 2,
      operationId: 'pos_ord-pos-1001_1',
    });
  });

  it('multiplies selling quantity by the canonical packaging multiplier', () => {
    const result = buildPosInventorySaleLines(order({
      productId: 'prod-1',
      productName: 'Crispy Bars',
      quantity: 2,
      price: 25,
      unitMultiplier: 12,
      packagingUnitName: 'Box of 12',
      base_unit: 'piece',
    }), [product]);
    assert.equal(result[0].quantity, 24);
  });

  it('resolves a selected variant SKU', () => {
    const result = buildPosInventorySaleLines(order({
      productId: 'prod-1',
      productName: 'Crispy Bars',
      quantity: 1,
      price: 10,
      variantSku: 'BAR-001-CHOC',
    }), [product]);
    assert.equal(result[0].sku, 'BAR-001-CHOC');
  });

  it('rejects unknown products and variants instead of guessing', () => {
    assert.throws(() => buildPosInventorySaleLines(order({ productId: 'missing', productName: 'Unknown', quantity: 1, price: 10 }), [product]), /could not be resolved/);
    assert.throws(() => buildPosInventorySaleLines(order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 1, price: 10, variantSku: 'BAD' }), [product]), /could not be resolved/);
  });

  it('rejects fractional quantities and multipliers', () => {
    assert.throws(() => buildPosInventorySaleLines(order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 1.5, price: 10 }), [product]), /Invalid POS quantity/);
    assert.throws(() => buildPosInventorySaleLines(order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 1, price: 10, unitMultiplier: 1.5 }), [product]), /Invalid packaging multiplier/);
  });
});
