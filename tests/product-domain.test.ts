/**
 * PROD-001: Product Domain Normalization Test Suite
 *
 * Verifies:
 * 1. Canonical normalization (Product -> Variant -> SKU -> Inventory boundary)
 * 2. Single-SKU vs. Multi-variant normalization
 * 3. Authoritative SKU resolution engine (exact SKU, barcode, variant SKU/barcode, packaging unit)
 * 4. Product, variant, and pricing validation rules
 * 5. Public storefront projection security boundary (prohibiting cost/supplier/internal data leakage)
 * 6. Catalog-wide SKU uniqueness verification
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeProduct,
  resolveProductSku,
  extractAllProductSkus,
  validateCanonicalProduct,
  validateSkuFormat,
  validateSkuUniqueness,
  toPublicCatalogProjection,
  toPOSProductView,
  generateCanonicalSku
} from '../src/domain/product';

describe('PROD-001 — Product Domain Normalization', () => {

  describe('1. Canonical Product Normalization', () => {
    it('normalizes a legacy single-SKU product into a canonical product with 1 default variant', () => {
      const rawLegacy = {
        id: 'prod-single-001',
        name: 'Classic Canvas Tote Bag',
        sku: 'BG-CANVAS-01',
        price: 29.99,
        cost: 12.00,
        stock: 50,
        category: 'Accessories',
        barcode: '123456789012',
        location: 'Store Shelf',
        reorderPoint: 10,
        variants: [] // empty
      };

      const normalized = normalizeProduct(rawLegacy);

      // Verify backwards-compatible root properties
      assert.equal(normalized.id, 'prod-single-001');
      assert.equal(normalized.name, 'Classic Canvas Tote Bag');
      assert.equal(normalized.sku, 'BG-CANVAS-01');
      assert.equal(normalized.price, 29.99);
      assert.equal(normalized.cost, 12.00);
      assert.equal(normalized.stock, 50);

      // Verify canonical aggregate
      assert.ok(normalized.canonical);
      assert.equal(normalized.canonical.id, 'prod-single-001');
      assert.equal(normalized.canonical.sku, 'BG-CANVAS-01');
      assert.equal(normalized.canonical.merchandising.name, 'Classic Canvas Tote Bag');
      assert.equal(normalized.canonical.operational.cost, 12.00);
      assert.equal(normalized.canonical.operational.stock, 50);

      // Canonical variants: exactly 1 default variant representing the single-item SKU
      assert.equal(normalized.canonical.variants.length, 1);
      const defaultVar = normalized.canonical.variants[0];
      assert.equal(defaultVar.sku, 'BG-CANVAS-01');
      assert.equal(defaultVar.pricing.retailPrice, 29.99);
      assert.equal(defaultVar.pricing.costPrice, 12.00);
      assert.equal(defaultVar.stock, 50);
      assert.equal(defaultVar.isDefault, true);
    });

    it('normalizes a multi-variant product into canonical variants with authoritative SKUs and attributes', () => {
      const rawMulti = {
        id: 'prod-multi-002',
        name: 'Technical Running Tee',
        sku: 'APP-TEE-01',
        price: 45.00,
        cost: 18.00,
        stock: 60,
        category: 'Apparel',
        variants: [
          { sku: 'APP-TEE-01-S-BLK', size: 'Small', color: 'Black', stock: 20, retailPrice: 45.00, costPrice: 18.00 },
          { sku: 'APP-TEE-01-M-BLK', size: 'Medium', color: 'Black', stock: 25, retailPrice: 45.00, costPrice: 18.00 },
          { sku: 'APP-TEE-01-L-BLU', size: 'Large', color: 'Blue', stock: 15, retailPrice: 48.00, costPrice: 19.00 }
        ]
      };

      const normalized = normalizeProduct(rawMulti);

      assert.equal(normalized.canonical.variants.length, 3);
      assert.equal(normalized.canonical.variants[0].sku, 'APP-TEE-01-S-BLK');
      assert.equal(normalized.canonical.variants[0].attributes.size, 'Small');
      assert.equal(normalized.canonical.variants[0].attributes.color, 'Black');
      assert.equal(normalized.canonical.variants[0].isDefault, true);

      assert.equal(normalized.canonical.variants[2].sku, 'APP-TEE-01-L-BLU');
      assert.equal(normalized.canonical.variants[2].pricing.retailPrice, 48.00);
      assert.equal(normalized.canonical.variants[2].isDefault, false);

      // Backwards compatible variants array
      assert.equal(normalized.variants.length, 3);
      assert.equal(normalized.variants[0].sku, 'APP-TEE-01-S-BLK');
    });

    it('consolidates legacy packaging selling tiers into standardized packaging units', () => {
      const rawWithPackaging = {
        id: 'prod-pack-003',
        name: 'Energy Drink 250ml',
        sku: 'BV-EN-01',
        price: 2.50,
        stock: 120,
        category: 'Groceries',
        packaging: {
          hasPackaging: true,
          baseSellingUnitName: 'Can',
          sellingTiers: [
            { id: 'tier-1', name: 'Single Can', unitQuantity: 1, sellingPrice: 2.50, barcode: '990001' },
            { id: 'tier-6', name: '6-Pack Box', unitQuantity: 6, sellingPrice: 13.50, barcode: '990006' },
            { id: 'tier-24', name: 'Case 24', unitQuantity: 24, sellingPrice: 48.00, barcode: '990024' }
          ]
        }
      };

      const normalized = normalizeProduct(rawWithPackaging);
      assert.ok(normalized.canonical.packagingUnits);
      assert.equal(normalized.canonical.packagingUnits.length, 3);
      assert.equal(normalized.canonical.packagingUnits[1].unitName, '6-Pack Box');
      assert.equal(normalized.canonical.packagingUnits[1].multiplier, 6);
      assert.equal(normalized.canonical.packagingUnits[1].sellingPrice, 13.50);
      assert.equal(normalized.canonical.packagingUnits[1].barcode, '990006');
    });
  });

  describe('2. Authoritative SKU Resolution Engine', () => {
    const testProduct = normalizeProduct({
      id: 'prod-res-001',
      name: 'Wireless Gaming Mouse',
      sku: 'EL-GM-100',
      barcode: '880011223344',
      price: 79.99,
      cost: 35.00,
      stock: 30,
      variants: [
        { sku: 'EL-GM-100-WHT', color: 'White', stock: 12, retailPrice: 84.99, costPrice: 37.00, barcode: '880011223355' },
        { sku: 'EL-GM-100-BLK', color: 'Matte Black', stock: 18, retailPrice: 79.99, costPrice: 35.00, barcode: '880011223366' }
      ],
      packagingUnits: [
        { id: 'pack-5', unitName: '5-Pack Bundle', multiplier: 5, base_unit: 'Piece', sellingPrice: 360.00, barcode: '880011223399' }
      ]
    });

    it('resolves product by base SKU string', () => {
      const res = resolveProductSku(testProduct, 'EL-GM-100');
      assert.ok(res);
      assert.equal(res.found, true);
      assert.equal(res.matchType, 'base_sku');
      assert.equal(res.sku, 'EL-GM-100');
      assert.equal(res.price, 79.99);
    });

    it('resolves product by base barcode', () => {
      const res = resolveProductSku(testProduct, '880011223344');
      assert.ok(res);
      assert.equal(res.found, true);
      assert.equal(res.matchType, 'barcode');
      assert.equal(res.sku, 'EL-GM-100');
    });

    it('resolves specific variant by variant SKU', () => {
      const res = resolveProductSku(testProduct, 'EL-GM-100-WHT');
      assert.ok(res);
      assert.equal(res.found, true);
      assert.equal(res.matchType, 'variant_sku');
      assert.equal(res.sku, 'EL-GM-100-WHT');
      assert.equal(res.price, 84.99);
      assert.equal(res.cost, 37.00);
    });

    it('resolves specific variant by variant barcode', () => {
      const res = resolveProductSku(testProduct, '880011223366');
      assert.ok(res);
      assert.equal(res.found, true);
      assert.equal(res.matchType, 'variant_barcode');
      assert.equal(res.sku, 'EL-GM-100-BLK');
      assert.equal(res.price, 79.99);
    });

    it('resolves packaging unit by packaging barcode with multiplier', () => {
      const res = resolveProductSku(testProduct, '880011223399');
      assert.ok(res);
      assert.equal(res.found, true);
      assert.equal(res.matchType, 'packaging_unit');
      assert.equal(res.packagingUnit?.unitName, '5-Pack Bundle');
      assert.equal(res.packagingUnit?.multiplier, 5);
      assert.equal(res.packagingUnit?.sellingPrice, 360.00);
    });

    it('returns null for uncataloged barcode/SKU', () => {
      const res = resolveProductSku(testProduct, 'NON-EXISTENT-SKU');
      assert.equal(res, null);
    });
  });

  describe('3. Product Validation Rules & SKU Constraints', () => {
    it('validates SKU string format', () => {
      assert.equal(validateSkuFormat('SKU-1001'), true);
      assert.equal(validateSkuFormat('APP.TEE.BLK_01'), true);
      assert.equal(validateSkuFormat('A'), false); // Too short
      assert.equal(validateSkuFormat('SKU 123 with spaces!'), false); // Invalid characters
      assert.equal(validateSkuFormat(''), false);
    });

    it('rejects product with missing name, missing SKU, or negative pricing', () => {
      const invalidProduct = {
        id: 'prod-err',
        name: '', // Missing
        sku: 'INV@LID SKU', // Invalid format
        price: -10, // Negative
        operational: { cost: -5, stock: -1, reorderPoint: 0, location: 'Store Shelf', trackingMode: 'QUANTITY', stockRotationMethod: 'FIFO', unit: 'Piece' }
      };

      const result = validateCanonicalProduct(invalidProduct as any);
      assert.equal(result.isValid, false);
      const fields = result.errors.map(e => e.field);
      assert.ok(fields.includes('name'));
      assert.ok(fields.includes('sku'));
      assert.ok(fields.includes('price'));
      assert.ok(fields.includes('operational.cost'));
      assert.ok(fields.includes('operational.stock'));
    });

    it('detects duplicate variant SKUs within the same product', () => {
      const dupVariantProduct = normalizeProduct({
        id: 'prod-dup',
        name: 'Duplicate Test Hoodie',
        sku: 'HD-001',
        price: 59.99,
        variants: [
          { sku: 'HD-001-RED', size: 'M', color: 'Red', stock: 10, retailPrice: 59.99 },
          { sku: 'HD-001-RED', size: 'L', color: 'Red', stock: 10, retailPrice: 59.99 } // Duplicate SKU!
        ]
      });

      const result = validateCanonicalProduct(dupVariantProduct.canonical);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some(e => e.message.includes('Duplicate SKU detected')));
    });

    it('approves a fully valid product with multiple unique variants', () => {
      const validProduct = normalizeProduct({
        id: 'prod-valid',
        name: 'Organic Cotton Polo',
        sku: 'POLO-001',
        price: 34.99,
        cost: 14.50,
        stock: 50,
        category: 'Apparel',
        variants: [
          { sku: 'POLO-001-M-WHT', size: 'M', color: 'White', stock: 25, retailPrice: 34.99, costPrice: 14.50 },
          { sku: 'POLO-001-L-WHT', size: 'L', color: 'White', stock: 25, retailPrice: 34.99, costPrice: 14.50 }
        ]
      });

      const result = validateCanonicalProduct(validProduct.canonical);
      assert.equal(result.isValid, true);
      assert.equal(result.errors.length, 0);
    });
  });

  describe('4. Public Catalog Projection Security Boundary (SEC-001 & SEC-005)', () => {
    it('strictly omits wholesale costs, suppliers, serials, and internal reorder points from public projections', () => {
      const sensitiveProduct = normalizeProduct({
        id: 'prod-sec-999',
        name: 'Enterprise Security Router',
        sku: 'NET-RTR-01',
        price: 499.99,
        cost: 210.00, // SENSITIVE
        supplier: 'Shenzhen Apex Networks Ltd', // SENSITIVE
        reorderPoint: 25, // SENSITIVE
        serialNumbers: ['SN-998811', 'SN-998812'], // SENSITIVE
        batchNumber: 'LOT-2026-X', // SENSITIVE
        stock: 50,
        category: 'Networking',
        variants: [
          {
            sku: 'NET-RTR-01-AC',
            stock: 30,
            retailPrice: 499.99,
            costPrice: 210.00 // SENSITIVE
          }
        ]
      });

      const publicProjection = toPublicCatalogProjection(sensitiveProduct);

      // Verify essential storefront fields exist
      assert.equal(publicProjection.id, 'prod-sec-999');
      assert.equal(publicProjection.name, 'Enterprise Security Router');
      assert.equal(publicProjection.sku, 'NET-RTR-01');
      assert.equal(publicProjection.price, 499.99);
      assert.equal(publicProjection.stock, 50);

      // STRICT SECURITY ASSERTIONS: Forbidden internal fields MUST NOT exist
      const raw = publicProjection as unknown as Record<string, unknown>;
      assert.equal('cost' in raw, false, 'cost leaked into public projection');
      assert.equal('costPrice' in raw, false, 'costPrice leaked into public projection');
      assert.equal('supplier' in raw, false, 'supplier leaked into public projection');
      assert.equal('reorderPoint' in raw, false, 'reorderPoint leaked into public projection');
      assert.equal('serialNumbers' in raw, false, 'serialNumbers leaked into public projection');
      assert.equal('batchNumber' in raw, false, 'batchNumber leaked into public projection');

      // Check variant projection omits costPrice as well
      assert.ok(publicProjection.variants);
      assert.equal(publicProjection.variants.length, 1);
      const varRaw = publicProjection.variants[0] as unknown as Record<string, unknown>;
      assert.equal('costPrice' in varRaw, false, 'variant costPrice leaked into public projection');
    });
  });

  describe('5. Catalog-wide SKU Extraction and Uniqueness Engine', () => {
    const catalog = [
      normalizeProduct({
        id: 'p1',
        name: 'Product 1',
        sku: 'CAT-001',
        price: 10,
        variants: [
          { sku: 'CAT-001-A', stock: 5, retailPrice: 10 },
          { sku: 'CAT-001-B', stock: 5, retailPrice: 10 }
        ]
      }),
      normalizeProduct({
        id: 'p2',
        name: 'Product 2',
        sku: 'CAT-002',
        price: 20
      })
    ];

    it('extracts all sellable SKUs from products', () => {
      const p1Skus = extractAllProductSkus(catalog[0]);
      // Base SKU + 2 variants
      assert.equal(p1Skus.length, 3);
      assert.ok(p1Skus.some(s => s.sku === 'CAT-001'));
      assert.ok(p1Skus.some(s => s.sku === 'CAT-001-A'));
      assert.ok(p1Skus.some(s => s.sku === 'CAT-001-B'));

      const p2Skus = extractAllProductSkus(catalog[1]);
      assert.equal(p2Skus.length, 1);
      assert.equal(p2Skus[0].sku, 'CAT-002');
    });

    it('validates SKU uniqueness across catalog', () => {
      // Existing SKUs: CAT-001, CAT-001-A, CAT-001-B, CAT-002
      assert.equal(validateSkuUniqueness(catalog, 'NEW-SKU-999'), true);
      assert.equal(validateSkuUniqueness(catalog, 'CAT-001'), false);
      assert.equal(validateSkuUniqueness(catalog, 'cat-001-a'), false); // Case-insensitive
      // Exclude p1 when editing p1: CAT-001 is allowed for p1 itself
      assert.equal(validateSkuUniqueness(catalog, 'CAT-001', 'p1'), true);
    });

    it('generates canonical SKUs with standardized format', () => {
      assert.equal(generateCanonicalSku('AP-TS', { size: 'L', color: 'BLK' }), 'AP-TS-L-BLK');
      assert.equal(generateCanonicalSku('EL_CAM', { model: '4K' }), 'EL_CAM-4K');
      assert.equal(generateCanonicalSku('RAW'), 'RAW');
    });
  });

  describe('6. POS & Consumer View Adapters', () => {
    it('produces compliant POS product view preserving cart requirements', () => {
      const prod = normalizeProduct({
        id: 'pos-view-1',
        name: 'Espresso Roast Beans',
        sku: 'CF-ESP-01',
        price: 18.00,
        cost: 7.50,
        stock: 40,
        category: 'Groceries'
      });

      const posView = toPOSProductView(prod);
      assert.equal(posView.id, 'pos-view-1');
      assert.equal(posView.name, 'Espresso Roast Beans');
      assert.equal(posView.sku, 'CF-ESP-01');
      assert.equal(posView.price, 18.00);
      assert.equal(posView.cost, 7.50);
      assert.equal(posView.stock, 40);
      assert.equal(posView.category, 'Groceries');
    });
  });
});
