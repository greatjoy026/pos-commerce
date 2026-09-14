/**
 * POS-001: POS Inventory Resolution Layer Test Suite
 *
 * Verifies the authoritative inventory resolution flow for POS checkout:
 * 1. Canonical Variant Resolution:
 *    - Resolves via Product → Variant → Variant SKU + Variant ID.
 *    - Rejects invalid variant SKUs without silent fallback to base SKU.
 * 2. Multi-tier Packaging / UOM Conversion:
 *    - Converts selling quantity × packaging multiplier to base units.
 *    - Rejects fractional, negative, or zero quantities/multipliers.
 * 3. Location Resolution:
 *    - Derives store location ID from POS context / primary product location.
 * 4. Custom & Service Item Discrimination:
 *    - Bypasses inventory deduction for service, digital, or custom ad-hoc items.
 * 5. Serial & Batch Tracking Restrictions:
 *    - Rejects SERIAL/BATCH items when required metadata is missing.
 * 6. Atomic Idempotency:
 *    - Generates deterministic operation IDs (pos_<orderId>_<lineIndex>).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolvePosInventoryLine,
  resolvePosCartToInventoryLines,
  isCustomOrServiceItem,
  normalizePosLocationId
} from '../src/domain/pos/inventoryResolution';
import { Product, CartItem } from '../src/types';

describe('POS-001 — POS Inventory Resolution Layer', () => {

  const standardProduct: Product = {
    id: 'prod-headphone-01',
    name: 'Wireless Headphones',
    sku: 'SKU-HDPH-01',
    price: 189.00,
    cost: 95.00,
    stock: 25,
    category: 'Electronics',
    location: 'Store Shelf',
    reorderPoint: 5,
    barcode: '8849201901',
    qrCode: '',
    variants: [],
    salesCount: 15
  };

  const variantProduct: Product = {
    id: 'prod-shirt-01',
    name: 'Cotton Polo Shirt',
    sku: 'SKU-SHIRT-BASE',
    price: 35.00,
    cost: 15.00,
    stock: 50,
    category: 'Apparel',
    location: 'Warehouse',
    reorderPoint: 10,
    barcode: '773910283',
    qrCode: '',
    variants: [
      {
        sku: 'SKU-SHIRT-S-RED',
        size: 'Small',
        color: 'Red',
        stock: 20,
        retailPrice: 35.00,
        barcode: '773910283-S-RED'
      },
      {
        sku: 'SKU-SHIRT-M-BLU',
        size: 'Medium',
        color: 'Blue',
        stock: 30,
        retailPrice: 35.00,
        barcode: '773910283-M-BLU'
      }
    ],
    salesCount: 40
  };

  const serviceProduct: Product = {
    id: 'prod-service-screen-repair',
    name: 'Screen Repair Service',
    sku: 'SKU-SRV-REPAIR',
    price: 85.00,
    cost: 20.00,
    stock: 0,
    category: 'Service',
    productType: 'Service',
    location: 'Store Shelf',
    reorderPoint: 0,
    barcode: '',
    qrCode: '',
    variants: [],
    salesCount: 100
  };

  describe('1. Canonical Variant Resolution', () => {
    it('resolves standard single-SKU product to base SKU', () => {
      const cartItem: CartItem = {
        product: standardProduct,
        quantity: 2
      };

      const res = resolvePosInventoryLine({
        cartItem,
        orderId: 'ord-1001',
        lineIndex: 0,
        storeLocationId: 'loc-main-store'
      });

      assert.strictEqual(res.isInventoryManaged, true);
      assert.strictEqual(res.error, undefined);
      assert.strictEqual(res.resolvedLine?.sku, 'SKU-HDPH-01');
      assert.strictEqual(res.resolvedLine?.productId, 'prod-headphone-01');
      assert.strictEqual(res.resolvedLine?.variantId, undefined);
      assert.strictEqual(res.resolvedLine?.quantity, 2);
      assert.strictEqual(res.resolvedLine?.operationId, 'pos_ord-1001_0');
    });

    it('resolves variant product to selected variant SKU and variantId', () => {
      const cartItem: CartItem = {
        product: variantProduct,
        quantity: 1,
        selectedVariantSku: 'SKU-SHIRT-M-BLU'
      };

      const res = resolvePosInventoryLine({
        cartItem,
        orderId: 'ord-1002',
        lineIndex: 1,
        storeLocationId: 'loc-main-store'
      });

      assert.strictEqual(res.isInventoryManaged, true);
      assert.strictEqual(res.error, undefined);
      assert.strictEqual(res.resolvedLine?.sku, 'SKU-SHIRT-M-BLU');
      assert.strictEqual(res.resolvedLine?.productId, 'prod-shirt-01');
      assert.strictEqual(res.resolvedLine?.variantId, 'SKU-SHIRT-M-BLU');
      assert.strictEqual(res.resolvedLine?.quantity, 1);
    });

    it('rejects invalid selected variant SKU without silently falling back to base SKU', () => {
      const cartItem: CartItem = {
        product: variantProduct,
        quantity: 1,
        selectedVariantSku: 'SKU-INVALID-VARIANT-XYZ'
      };

      const res = resolvePosInventoryLine({
        cartItem,
        orderId: 'ord-1003',
        lineIndex: 0
      });

      assert.strictEqual(res.isInventoryManaged, true);
      assert.ok(res.error?.includes('could not be resolved'));
      assert.strictEqual(res.resolvedLine, undefined);
    });
  });

  describe('2. Multi-tier Packaging / UOM Conversion', () => {
    it('converts selling quantity and packaging multiplier into base inventory quantity', () => {
      const cartItem: CartItem = {
        product: standardProduct,
        quantity: 3,
        unitMultiplier: 6,
        packagingUnitName: '6-Pack Box'
      };

      const res = resolvePosInventoryLine({
        cartItem,
        orderId: 'ord-2001',
        lineIndex: 0
      });

      assert.strictEqual(res.isInventoryManaged, true);
      assert.strictEqual(res.resolvedLine?.quantity, 18); // 3 * 6 = 18 base units
      assert.strictEqual(res.resolvedLine?.unitMultiplier, 6);
      assert.strictEqual(res.resolvedLine?.sellingQuantity, 3);
    });

    it('rejects zero or negative selling quantity', () => {
      const cartItem: CartItem = {
        product: standardProduct,
        quantity: 0
      };

      const res = resolvePosInventoryLine({
        cartItem,
        orderId: 'ord-2002',
        lineIndex: 0
      });

      assert.strictEqual(res.isInventoryManaged, true);
      assert.ok(res.error?.includes('must be a positive integer'));
    });

    it('rejects fractional quantity', () => {
      const cartItem: CartItem = {
        product: standardProduct,
        quantity: 1.5
      };

      const res = resolvePosInventoryLine({
        cartItem,
        orderId: 'ord-2003',
        lineIndex: 0
      });

      assert.strictEqual(res.isInventoryManaged, true);
      assert.ok(res.error?.includes('must be a positive integer'));
    });
  });

  describe('3. Location Resolution', () => {
    it('normalizes location IDs correctly', () => {
      assert.strictEqual(normalizePosLocationId('loc-warehouse'), 'loc-warehouse');
      assert.strictEqual(normalizePosLocationId('Store Shelf'), 'loc-store-shelf');
      assert.strictEqual(normalizePosLocationId('Warehouse'), 'loc-warehouse');
      assert.strictEqual(normalizePosLocationId('Store Shelf, Warehouse'), 'loc-store-shelf');
    });

    it('uses explicit storeLocationId from POS context when supplied', () => {
      const cartItem: CartItem = {
        product: standardProduct,
        quantity: 1
      };

      const res = resolvePosInventoryLine({
        cartItem,
        orderId: 'ord-3001',
        lineIndex: 0,
        storeLocationId: 'loc-flagship-store'
      });

      assert.strictEqual(res.resolvedLine?.locationId, 'loc-flagship-store');
    });
  });

  describe('4. Service & Custom Item Discrimination', () => {
    it('identifies service products and bypasses inventory line creation', () => {
      const cartItem: CartItem = {
        product: serviceProduct,
        quantity: 1
      };

      assert.strictEqual(isCustomOrServiceItem(cartItem), true);

      const res = resolvePosInventoryLine({
        cartItem,
        orderId: 'ord-4001',
        lineIndex: 0
      });

      assert.strictEqual(res.isInventoryManaged, false);
      assert.strictEqual(res.resolvedLine, undefined);
    });

    it('identifies custom ad-hoc items and bypasses inventory line creation', () => {
      const cartItem: CartItem = {
        product: {
          id: 'custom-1234',
          name: 'Custom Service Fee',
          sku: '',
          price: 25.00,
          cost: 0,
          stock: 0,
          category: 'Custom',
          location: 'Store Shelf',
          reorderPoint: 0,
          barcode: '',
          qrCode: '',
          variants: [],
          salesCount: 0
        },
        quantity: 1,
        customPrice: 25.00
      };

      assert.strictEqual(isCustomOrServiceItem(cartItem), true);

      const res = resolvePosInventoryLine({
        cartItem,
        orderId: 'ord-4002',
        lineIndex: 0
      });

      assert.strictEqual(res.isInventoryManaged, false);
    });
  });

  describe('5. Serial & Batch Restrictions', () => {
    it('rejects SERIAL tracked product when serial number selection is missing', () => {
      const serialProduct: Product = {
        ...standardProduct,
        id: 'prod-laptop-serial',
        inventoryTracking: 'SERIAL',
        trackSerial: true
      };

      const cartItem: CartItem = {
        product: serialProduct,
        quantity: 1
      };

      const res = resolvePosInventoryLine({
        cartItem,
        orderId: 'ord-5001',
        lineIndex: 0
      });

      assert.strictEqual(res.isInventoryManaged, true);
      assert.ok(res.error?.includes('SERIAL inventory item'));
    });
  });

  describe('6. Cart Batch Resolution', () => {
    it('resolves a multi-item cart containing both inventory products and service items', () => {
      const cart: CartItem[] = [
        { product: standardProduct, quantity: 2 },
        { product: variantProduct, quantity: 1, selectedVariantSku: 'SKU-SHIRT-S-RED' },
        { product: serviceProduct, quantity: 1 }
      ];

      const res = resolvePosCartToInventoryLines(cart, 'ord-6001', 'loc-main-store');

      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.inventoryLines.length, 2); // 2 inventory items, service item omitted
      assert.strictEqual(res.inventoryLines[0].sku, 'SKU-HDPH-01');
      assert.strictEqual(res.inventoryLines[0].quantity, 2);
      assert.strictEqual(res.inventoryLines[0].operationId, 'pos_ord-6001_0');
      assert.strictEqual(res.inventoryLines[1].sku, 'SKU-SHIRT-S-RED');
      assert.strictEqual(res.inventoryLines[1].quantity, 1);
      assert.strictEqual(res.inventoryLines[1].operationId, 'pos_ord-6001_1');
    });

    it('returns valid=false and collects error messages when any cart item resolution fails', () => {
      const cart: CartItem[] = [
        { product: standardProduct, quantity: 2 },
        { product: variantProduct, quantity: 1, selectedVariantSku: 'SKU-NON-EXISTENT' }
      ];

      const res = resolvePosCartToInventoryLines(cart, 'ord-6002', 'loc-main-store');

      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.inventoryLines.length, 1);
      assert.strictEqual(res.errors.length, 1);
      assert.ok(res.errors[0].includes('could not be resolved'));
    });
  });
});
