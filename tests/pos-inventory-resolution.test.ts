import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPosInventorySaleLines } from '../src/domain/pos/inventoryResolution';
import { calculateMovementOutcome } from '../src/domain/inventory/movements';
import type { Order, Product } from '../src/types';

const product = {
  id: 'prod-1', name: 'Crispy Bars', sku: 'BAR-001', price: 10, stock: 100,
  category: 'Food', location: 'Aisle 1', reorderPoint: 5, barcode: '123',
  variants: [{ sku: 'BAR-001-CHOC', stock: 50 }],
  packagingUnits: [{ id: 'box12', unitName: 'Box of 12', multiplier: 12, base_unit: 'piece', sellingPrice: 25 }],
  salesCount: 0,
} as Product;

const canonicalVariantProduct = {
  ...product,
  canonical: {
    id: 'prod-1', sku: 'BAR-001',
    merchandising: { name: 'Crispy Bars', description: '', images: [], rating: 0, reviewCount: 0, specifications: {} },
    classification: { category: 'Food', productType: 'Standard', tags: [] },
    lifecycle: { status: 'Active', visibility: { publishOnline: false, sellOnPOS: true, sellOnline: false }, returnable: true },
    variants: [{ id: 'variant-choc', productId: 'prod-1', sku: 'BAR-001-CHOC', name: 'Chocolate', attributes: { flavor: 'Chocolate' }, pricing: { retailPrice: 10 }, isActive: true }],
  },
} as Product;

const order = (item: Order['items'][number]): Order => ({
  id: 'ord-pos-1001', date: new Date().toISOString(), items: [item], subtotal: 20, tax: 0, discount: 0, total: 20,
  paymentMethod: 'Cash', channel: 'In-Store POS', status: 'Completed',
});

describe('POS inventory resolution', () => {
  it('resolves a standard product SKU without inventing a client location', () => {
    const result = buildPosInventorySaleLines(order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 2, price: 10 }), [product]);
    assert.deepEqual(result[0], { sku: 'BAR-001', productId: 'prod-1', quantity: 2, operationId: 'pos_ord-pos-1001_1' });
  });
  it('preserves the canonical variant ID', () => {
    const result = buildPosInventorySaleLines(order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 1, price: 10, variantSku: 'BAR-001-CHOC' }), [canonicalVariantProduct]);
    assert.equal(result[0].sku, 'BAR-001-CHOC'); assert.equal(result[0].variantId, 'variant-choc');
  });
  it('uses the catalog packaging multiplier', () => {
    const result = buildPosInventorySaleLines(order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 2, price: 25, packagingUnitName: 'Box of 12', unitMultiplier: 12 }), [product]);
    assert.equal(result[0].quantity, 24);
  });
  it('rejects a client multiplier that disagrees with the catalog', () => {
    assert.throws(() => buildPosInventorySaleLines(order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 2, price: 25, packagingUnitName: 'Box of 12', unitMultiplier: 99 }), [product]), /does not match the catalog/);
  });
  it('rejects an unknown packaging unit', () => {
    assert.throws(() => buildPosInventorySaleLines(order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 1, price: 25, packagingUnitName: 'Box of 99' }), [product]), /Packaging unit .* could not be resolved/);
  });
  it('rejects unknown products and variants instead of guessing', () => {
    assert.throws(() => buildPosInventorySaleLines(order({ productId: 'missing', productName: 'Unknown', quantity: 1, price: 10 }), [product]), /could not be resolved/);
    assert.throws(() => buildPosInventorySaleLines(order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 1, price: 10, variantSku: 'BAD' }), [product]), /could not be resolved/);
  });
  it('rejects fractional or non-positive POS quantities', () => {
    assert.throws(() => buildPosInventorySaleLines(order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 1.5, price: 10 }), [product]), /Invalid POS quantity/);
    assert.throws(() => buildPosInventorySaleLines(order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 0, price: 10 }), [product]), /Invalid POS quantity/);
  });
  it('rejects fractional or non-positive packaging multipliers', () => {
    assert.throws(() => buildPosInventorySaleLines(order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 1, price: 10, unitMultiplier: 1.5 }), [product]), /Invalid POS packaging multiplier/);
    assert.throws(() => buildPosInventorySaleLines(order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 1, price: 10, unitMultiplier: 0 }), [product]), /Invalid POS packaging multiplier/);
  });
  it('does not trust the display name to classify a missing product as custom', () => {
    assert.throws(() => buildPosInventorySaleLines(order({ productId: 'missing', productName: 'Custom / Service', quantity: 1, price: 20 }), [product]), /could not be resolved/);
  });
  it('allows only structurally identified ad-hoc custom lines to bypass inventory', () => {
    assert.deepEqual(buildPosInventorySaleLines(order({ productId: 'prod-custom-123', productName: 'Anything', quantity: 1, price: 20 }), [product]), []);
  });
  it('rejects an invalid order ID', () => {
    assert.throws(() => buildPosInventorySaleLines({ ...order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 1, price: 10 }), id: 'bad id' }, [product]), /valid POS order ID/);
  });
  it('rejects an empty POS order', () => {
    assert.throws(() => buildPosInventorySaleLines({ ...order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: 1, price: 10 }), items: [] }, [product]), /at least one item/);
  });
  it('rejects unsafe base-unit multiplication overflow', () => {
    assert.throws(() => buildPosInventorySaleLines(order({ productId: 'prod-1', productName: 'Crispy Bars', quantity: Number.MAX_SAFE_INTEGER, price: 10, packagingUnitName: 'Box of 12', unitMultiplier: 12 }), [product]), /Invalid base-unit quantity/);
  });
  it('requires an explicit movement quantity', () => {
    const record = { id: 'inv-1', sku: 'BAR-001', productId: 'prod-1', locationId: 'loc-1', quantityOnHand: 10, quantityReserved: 0, trackingMode: 'QUANTITY' as const, status: 'ACTIVE' as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    assert.throws(() => calculateMovementOutcome(record, { movementType: 'SALE', performedBy: 'staff-1' }), /quantityParam must be a non-zero finite integer/);
  });
});
