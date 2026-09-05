/**
 * PROD-001 / PROD-001-F1: Canonical Product Domain Test Suite
 *
 * Verifies the corrected Product Domain Architecture:
 * 1. Canonical Product Normalization:
 *    - Strict normalization: Missing identifiers (id, name, sku) produce errors; NO silent invention.
 *    - Domain boundaries: CanonicalProduct and CanonicalVariant represent catalog identity only.
 *    - Inventory isolation: No operational stock or cost fields in CanonicalProduct or CanonicalVariant.
 *    - Single-SKU vs. Multi-variant normalization.
 * 2. Legacy Compatibility Adapters:
 *    - `toLegacyProduct` maps CanonicalProduct + transitional operational state to legacy Product.
 *    - `normalizeToLegacyProduct` provides an end-to-end bridge for legacy stores.
 * 3. Authoritative SKU Architecture:
 *    - SKU resolution (base SKU, barcodes, variant SKU, variant barcode, packaging unit).
 *    - SKU extraction consistency across sellable units.
 *    - Catalog-wide case-insensitive uniqueness validation.
 * 4. Public Catalog Projection Security Boundary (SEC-001 & SEC-005):
 *    - Strictly omits costs, suppliers, serial numbers, batches, reorder points.
 * 5. POS Adapter:
 *    - Provides backward-compatible cart view without polluting canonical domain.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeProduct,
  tryNormalizeProduct,
  toLegacyProduct,
  normalizeToLegacyProduct,
  ProductNormalizationError,
  resolveProductSku,
  extractAllProductSkus,
  validateCanonicalProduct,
  validateSkuFormat,
  validateSkuUniqueness,
  validateBarcodeUniqueness,
  toPublicCatalogProjection,
  computePublicAvailabilityStatus,
  toPOSProductView,
  generateCanonicalSku
} from '../src/domain/product';

describe('PROD-001-F1 — Product Domain Boundary & SKU Architecture', () => {

  describe('1. Canonical Product Normalization & Inventory Isolation', () => {
    it('normalizes a single-SKU product into a CanonicalProduct with 1 default variant and NO inventory state in domain', () => {
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
        variants: []
      };

      const canonical = normalizeProduct(rawLegacy);

      // Verify canonical identity & merchandising
      assert.equal(canonical.id, 'prod-single-001');
      assert.equal(canonical.sku, 'BG-CANVAS-01');
      assert.equal(canonical.merchandising.name, 'Classic Canvas Tote Bag');
      assert.equal(canonical.classification.category, 'Accessories');
      assert.equal(canonical.barcode, '123456789012');

      // INVENTORY ISOLATION: CanonicalProduct MUST NOT contain operational inventory state
      const canonicalAny = canonical as any;
      assert.equal('operational' in canonicalAny, false, 'CanonicalProduct must not contain operational state');
      assert.equal('stock' in canonicalAny, false, 'CanonicalProduct must not contain root stock');
      assert.equal('cost' in canonicalAny, false, 'CanonicalProduct must not contain root cost');

      // Exactly 1 default variant representing the single-item SKU
      assert.equal(canonical.variants.length, 1);
      const defaultVar = canonical.variants[0];
      assert.equal(defaultVar.sku, 'BG-CANVAS-01');
      assert.equal(defaultVar.pricing.retailPrice, 29.99);
      assert.equal(defaultVar.isDefault, true);

      // INVENTORY ISOLATION: CanonicalVariant MUST NOT contain stock quantity
      assert.equal('stock' in (defaultVar as any), false, 'CanonicalVariant must not contain stock');
    });

    it('normalizes a multi-variant product into CanonicalVariants with unique SKUs and no variant stock', () => {
      const rawMulti = {
        id: 'prod-multi-002',
        name: 'Technical Running Tee',
        sku: 'APP-TEE-01',
        price: 45.00,
        cost: 18.00,
        stock: 60,
        category: 'Apparel',
        variants: [
          { sku: 'APP-TEE-01-S-BLK', size: 'Small', color: 'Black', stock: 20, retailPrice: 45.00 },
          { sku: 'APP-TEE-01-M-BLK', size: 'Medium', color: 'Black', stock: 25, retailPrice: 45.00 },
          { sku: 'APP-TEE-01-L-BLU', size: 'Large', color: 'Blue', stock: 15, retailPrice: 48.00 }
        ]
      };

      const canonical = normalizeProduct(rawMulti);

      assert.equal(canonical.variants.length, 3);
      assert.equal(canonical.variants[0].sku, 'APP-TEE-01-S-BLK');
      assert.equal(canonical.variants[0].attributes?.size, 'Small');
      assert.equal(canonical.variants[0].attributes?.color, 'Black');
      assert.equal(canonical.variants[0].isDefault, true);
      assert.equal('stock' in (canonical.variants[0] as any), false, 'Variant 0 must not contain stock');

      assert.equal(canonical.variants[2].sku, 'APP-TEE-01-L-BLU');
      assert.equal(canonical.variants[2].pricing.retailPrice, 48.00);
      assert.equal(canonical.variants[2].isDefault, false);
      assert.equal('stock' in (canonical.variants[2] as any), false, 'Variant 2 must not contain stock');
    });

    it('normalizes packaging units without inventory calculations', () => {
      const rawWithPackaging = {
        id: 'prod-pack-003',
        name: 'Energy Drink 250ml',
        sku: 'BV-EN-01',
        price: 2.50,
        stock: 120,
        category: 'Beverages',
        packagingUnits: [
          { id: 'u1', unitName: 'Single Can', multiplier: 1, baseUnit: 'Can', sellingPrice: 2.50, barcode: '990001' },
          { id: 'u2', unitName: '6-Pack Box', multiplier: 6, baseUnit: 'Can', sellingPrice: 13.50, barcode: '990006', sku: 'BV-EN-01-6PK' }
        ]
      };

      const canonical = normalizeProduct(rawWithPackaging);
      assert.ok(canonical.packagingUnits);
      assert.equal(canonical.packagingUnits.length, 2);
      assert.equal(canonical.packagingUnits[1].unitName, '6-Pack Box');
      assert.equal(canonical.packagingUnits[1].multiplier, 6);
      assert.equal(canonical.packagingUnits[1].sku, 'BV-EN-01-6PK');
    });
  });

  describe('2. Strict Normalization Validation (Anti-Silent Fallback Rule)', () => {
    it('rejects input with missing SKU without inventing silent placeholders', () => {
      const rawMissingSku = {
        id: 'prod-no-sku',
        name: 'Valid Product Name',
        price: 25.00
      };

      const result = tryNormalizeProduct(rawMissingSku);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.errors.some(e => e.field === 'sku'));
      }

      assert.throws(
        () => normalizeProduct(rawMissingSku),
        ProductNormalizationError
      );
    });

    it('rejects input with missing name without inventing silent placeholders', () => {
      const rawMissingName = {
        id: 'prod-no-name',
        sku: 'SKU-TEST-99',
        price: 25.00
      };

      const result = tryNormalizeProduct(rawMissingName);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.errors.some(e => e.field === 'name'));
      }

      assert.throws(
        () => normalizeProduct(rawMissingName),
        ProductNormalizationError
      );
    });

    it('rejects input with duplicate variant SKUs within the same product', () => {
      const rawDuplicateVariantSkus = {
        id: 'prod-dup-var',
        name: 'Duplicate SKU Shirt',
        sku: 'SHIRT-01',
        price: 30.00,
        category: 'Apparel',
        variants: [
          { sku: 'SHIRT-01-RED', size: 'M', color: 'Red' },
          { sku: 'SHIRT-01-RED', size: 'L', color: 'Red' } // Duplicate!
        ]
      };

      const result = tryNormalizeProduct(rawDuplicateVariantSkus);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.errors.some(e => e.message.includes('Duplicate variant SKU')));
      }

      assert.throws(
        () => normalizeProduct(rawDuplicateVariantSkus),
        ProductNormalizationError
      );
    });

    it('validates packaging unit multiplier with strict finite number checks (PROD-001-F2.1)', () => {
      // Reject: 0, -1, NaN, Infinity, -Infinity
      const invalidMultipliers = [0, -1, NaN, Infinity, -Infinity];
      for (const m of invalidMultipliers) {
        const raw = {
          id: `prod-m-${m}`,
          name: 'Invalid Multiplier Product',
          sku: `SKU-M-${m}`,
          price: 10.00,
          category: 'Beverages',
          packagingUnits: [
            { id: 'u1', unitName: 'Pack', multiplier: m, sellingPrice: 20.00 }
          ]
        };
        const result = tryNormalizeProduct(raw);
        assert.equal(result.success, false, `Multiplier ${m} must be rejected`);
        if (!result.success) {
          assert.ok(result.errors.some(e => e.field.includes('multiplier')));
        }
      }

      // Accept: 0.1, 1, 6, 24
      const validMultipliers = [0.1, 1, 6, 24];
      for (const m of validMultipliers) {
        const raw = {
          id: `prod-m-valid-${m}`,
          name: 'Valid Multiplier Product',
          sku: `SKU-MV-${m}`,
          price: 10.00,
          category: 'Beverages',
          packagingUnits: [
            { id: 'u1', unitName: 'Pack', multiplier: m, sellingPrice: 20.00 }
          ]
        };
        const result = tryNormalizeProduct(raw);
        assert.equal(result.success, true, `Multiplier ${m} must be accepted`);
        if (result.success) {
          assert.equal(result.product.packagingUnits?.[0].multiplier, m);
        }
      }
    });

    it('validates packaging unit selling price with strict finite number checks (PROD-001-F2.1)', () => {
      // Reject: -1, NaN, Infinity, -Infinity
      const invalidPrices = [-1, NaN, Infinity, -Infinity];
      for (const p of invalidPrices) {
        const raw = {
          id: `prod-p-${p}`,
          name: 'Invalid Price Product',
          sku: `SKU-P-${p}`,
          price: 10.00,
          category: 'Snacks',
          packagingUnits: [
            { id: 'u1', unitName: 'Box', multiplier: 6, sellingPrice: p }
          ]
        };
        const result = tryNormalizeProduct(raw);
        assert.equal(result.success, false, `Selling price ${p} must be rejected`);
        if (!result.success) {
          assert.ok(result.errors.some(e => e.field.includes('sellingPrice')));
        }
      }

      // Accept: 0, 1, 10.50
      const validPrices = [0, 1, 10.50];
      for (const p of validPrices) {
        const raw = {
          id: `prod-p-valid-${p}`,
          name: 'Valid Price Product',
          sku: `SKU-PV-${p}`,
          price: 10.00,
          category: 'Snacks',
          packagingUnits: [
            { id: 'u1', unitName: 'Box', multiplier: 6, sellingPrice: p }
          ]
        };
        const result = tryNormalizeProduct(raw);
        assert.equal(result.success, true, `Selling price ${p} must be accepted`);
        if (result.success) {
          assert.equal(result.product.packagingUnits?.[0].sellingPrice, p);
        }
      }
    });

    it('rejects input with missing category without inventing silent defaults (PROD-001-F2)', () => {
      const rawNoCategory = {
        id: 'prod-no-cat',
        name: 'Uncategorized Gadget',
        sku: 'GADGET-01',
        price: 49.99
      };

      const result = tryNormalizeProduct(rawNoCategory);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.errors.some(e => e.field === 'category'));
      }

      assert.throws(
        () => normalizeProduct(rawNoCategory),
        ProductNormalizationError
      );
    });

    it('defaults rating to 0 (unrated) and lifecycle status to Draft when omitted (PROD-001-F2)', () => {
      const rawDefaults = {
        id: 'prod-def-01',
        name: 'Brand New Item',
        sku: 'NEW-ITEM-01',
        price: 19.99,
        category: 'General Goods'
      };

      const canonical = normalizeProduct(rawDefaults);
      // Rating must default to 0 (unrated), NOT 5.0
      assert.equal(canonical.merchandising.rating, 0);
      assert.equal(canonical.merchandising.reviewCount, 0);
      // Status must default to 'Draft' for conservative inventory safety, NOT 'Active'
      assert.equal(canonical.lifecycle.status, 'Draft');
    });
  });

  describe('3. Legacy Compatibility Adapters', () => {
    it('toLegacyProduct bridges CanonicalProduct with transitional operational state for existing UI', () => {
      const raw = {
        id: 'prod-bridge-001',
        name: 'Bridged Running Shoes',
        sku: 'SH-RUN-01',
        price: 120.00,
        cost: 50.00,
        stock: 35,
        category: 'Footwear',
        location: 'Warehouse B',
        reorderPoint: 5
      };

      const canonical = normalizeProduct(raw);
      const legacy = toLegacyProduct(canonical, raw);

      assert.equal(legacy.id, 'prod-bridge-001');
      assert.equal(legacy.name, 'Bridged Running Shoes');
      assert.equal(legacy.sku, 'SH-RUN-01');
      assert.equal(legacy.price, 120.00);
      assert.equal(legacy.cost, 50.00);
      assert.equal(legacy.stock, 35);
      assert.equal(legacy.location, 'Warehouse B');
      assert.equal(legacy.reorderPoint, 5);
      assert.ok(legacy.canonical);
      assert.equal(legacy.canonical.id, 'prod-bridge-001');
    });

    it('normalizeToLegacyProduct executes complete validation and attaches canonical reference', () => {
      const raw = {
        id: 'prod-bridge-002',
        name: 'Bridged Smart Watch',
        sku: 'WT-SMART-01',
        price: 250.00,
        cost: 110.00,
        stock: 20,
        category: 'Electronics'
      };

      const legacy = normalizeToLegacyProduct(raw);
      assert.equal(legacy.sku, 'WT-SMART-01');
      assert.equal(legacy.stock, 20);
      assert.ok(legacy.canonical);
      assert.equal(legacy.canonical.merchandising.name, 'Bridged Smart Watch');
    });
  });

  describe('4. Authoritative SKU Resolution & Extraction Engine', () => {
    const rawData = {
      id: 'prod-res-001',
      name: 'Wireless Gaming Mouse',
      sku: 'EL-GM-100',
      barcode: '880011223344',
      price: 79.99,
      cost: 35.00,
      stock: 30,
      category: 'Electronics',
      variants: [
        { sku: 'EL-GM-100-BLK', color: 'Matte Black', stock: 18, retailPrice: 79.99, costPrice: 35.00, barcode: '880011223366' },
        { sku: 'EL-GM-100-WHT', color: 'White', stock: 12, retailPrice: 84.99, costPrice: 37.00, barcode: '880011223355' }
      ],
      packagingUnits: [
        { id: 'pack-5', unitName: '5-Pack Bundle', multiplier: 5, baseUnit: 'Piece', sellingPrice: 360.00, barcode: '880011223399', sku: 'EL-GM-100-5PK' }
      ]
    };

    const canonical = normalizeProduct(rawData);
    const legacy = toLegacyProduct(canonical, rawData);

    it('resolves product by base SKU string', () => {
      const res = resolveProductSku(canonical, 'EL-GM-100');
      assert.ok(res);
      assert.equal(res.found, true);
      assert.equal(res.matchType, 'base_sku');
      assert.equal(res.sku, 'EL-GM-100');
      assert.equal(res.price, 79.99);
    });

    it('resolves product by base barcode', () => {
      const res = resolveProductSku(canonical, '880011223344');
      assert.ok(res);
      assert.equal(res.found, true);
      assert.equal(res.matchType, 'barcode');
      assert.equal(res.sku, 'EL-GM-100');
    });

    it('resolves specific variant by variant SKU', () => {
      const res = resolveProductSku(canonical, 'EL-GM-100-WHT');
      assert.ok(res);
      assert.equal(res.found, true);
      assert.equal(res.matchType, 'variant_sku');
      assert.equal(res.sku, 'EL-GM-100-WHT');
      assert.equal(res.price, 84.99);
    });

    it('resolves specific variant by variant barcode', () => {
      const res = resolveProductSku(canonical, '880011223366');
      assert.ok(res);
      assert.equal(res.found, true);
      assert.equal(res.matchType, 'variant_barcode');
      assert.equal(res.sku, 'EL-GM-100-BLK');
      assert.equal(res.price, 79.99);
    });

    it('resolves packaging unit by packaging barcode with multiplier', () => {
      const res = resolveProductSku(canonical, '880011223399');
      assert.ok(res);
      assert.equal(res.found, true);
      assert.equal(res.matchType, 'packaging_unit');
      assert.equal(res.packagingUnit?.unitName, '5-Pack Bundle');
      assert.equal(res.packagingUnit?.multiplier, 5);
      assert.equal(res.packagingUnit?.sellingPrice, 360.00);
    });

    it('extractAllProductSkus extracts Base, Variant, and Packaging SKUs', () => {
      const skus = extractAllProductSkus(canonical);
      // Base (EL-GM-100) + 2 variants + 1 packaging SKU = 4 SKUs
      assert.equal(skus.length, 4);
      assert.ok(skus.some(s => s.sku === 'EL-GM-100' && s.skuType === 'base'));
      assert.ok(skus.some(s => s.sku === 'EL-GM-100-WHT' && s.skuType === 'variant'));
      assert.ok(skus.some(s => s.sku === 'EL-GM-100-BLK' && s.skuType === 'variant'));
      assert.ok(skus.some(s => s.sku === 'EL-GM-100-5PK' && s.skuType === 'packaging'));

      // ARCHITECTURAL INVARIANT: ProductSku contains NO stock or cost
      for (const s of skus) {
        assert.equal('stock' in (s as any), false, 'ProductSku must not contain stock');
        assert.equal('cost' in (s as any), false, 'ProductSku must not contain cost');
      }
    });

    it('returns null for uncataloged barcode/SKU', () => {
      const res = resolveProductSku(canonical, 'NON-EXISTENT-SKU');
      assert.equal(res, null);
    });
  });

  describe('5. Product Validation Rules & SKU Constraints', () => {
    it('validates SKU string format', () => {
      assert.equal(validateSkuFormat('SKU-1001'), true);
      assert.equal(validateSkuFormat('APP.TEE.BLK_01'), true);
      assert.equal(validateSkuFormat('A'), false); // Too short
      assert.equal(validateSkuFormat('SKU 123 with spaces!'), false); // Invalid characters
      assert.equal(validateSkuFormat(''), false);
    });

    it('validates canonical product structure without requiring inventory fields', () => {
      const canonical = normalizeProduct({
        id: 'prod-valid',
        name: 'Organic Cotton Polo',
        sku: 'POLO-001',
        price: 34.99,
        category: 'Apparel',
        variants: [
          { sku: 'POLO-001-M-WHT', size: 'M', color: 'White', retailPrice: 34.99 },
          { sku: 'POLO-001-L-WHT', size: 'L', color: 'White', retailPrice: 34.99 }
        ]
      });

      const result = validateCanonicalProduct(canonical);
      assert.equal(result.isValid, true);
      assert.equal(result.errors.length, 0);
    });
  });

  describe('6. Catalog-wide SKU & Barcode Uniqueness Engine', () => {
    const catalog = [
      normalizeProduct({
        id: 'p1',
        name: 'Product 1',
        sku: 'CAT-001',
        category: 'Hardware',
        price: 10,
        variants: [
          { sku: 'CAT-001-A', retailPrice: 10 },
          { sku: 'CAT-001-B', retailPrice: 10 }
        ],
        packagingUnits: [
          { id: 'u1', unitName: '10-Pack Box', multiplier: 10, sellingPrice: 90, sku: 'CAT-001-BOX', barcode: '770099' }
        ]
      }),
      normalizeProduct({
        id: 'p2',
        name: 'Product 2',
        sku: 'CAT-002',
        category: 'Hardware',
        price: 20
      })
    ];

    it('validates SKU uniqueness across catalog', () => {
      assert.equal(validateSkuUniqueness(catalog, 'NEW-SKU-999'), true);
      assert.equal(validateSkuUniqueness(catalog, 'CAT-001'), false);
      assert.equal(validateSkuUniqueness(catalog, 'cat-001-a'), false); // Case-insensitive
      // Exclude p1 when editing p1: CAT-001 is allowed for p1 itself
      assert.equal(validateSkuUniqueness(catalog, 'CAT-001', 'p1'), true);
    });

    it('detects cross-type SKU collisions across base, variant, and packaging units (PROD-001-F2)', () => {
      // Base vs Variant collision
      assert.equal(validateSkuUniqueness(catalog, 'CAT-001-A'), false, 'Variant SKU must collide');
      // Variant vs Packaging collision
      assert.equal(validateSkuUniqueness(catalog, 'CAT-001-BOX'), false, 'Packaging SKU must collide');
      // Case insensitive check on packaging unit SKU
      assert.equal(validateSkuUniqueness(catalog, 'cat-001-box'), false, 'Packaging SKU case-insensitive collision');
    });

    it('validates barcode uniqueness across catalog including packaging units (PROD-001-F2)', () => {
      const catalogWithBarcodes = [
        normalizeProduct({
          id: 'p1',
          name: 'Item 1',
          sku: 'BAR-001',
          category: 'Hardware',
          barcode: '770001',
          price: 10,
          variants: [
            { sku: 'BAR-001-V', barcode: '770002', retailPrice: 10 }
          ],
          packagingUnits: [
            { id: 'pu1', unitName: 'Case', multiplier: 24, sellingPrice: 200, barcode: '770003' }
          ]
        })
      ];

      assert.equal(validateBarcodeUniqueness(catalogWithBarcodes, '770001'), false, 'Base barcode collides');
      assert.equal(validateBarcodeUniqueness(catalogWithBarcodes, '770002'), false, 'Variant barcode collides');
      assert.equal(validateBarcodeUniqueness(catalogWithBarcodes, '770003'), false, 'Packaging barcode collides');
      assert.equal(validateBarcodeUniqueness(catalogWithBarcodes, '770999'), true, 'Unused barcode is unique');
      assert.equal(validateBarcodeUniqueness(catalogWithBarcodes, '770001', 'p1'), true, 'Self barcode excluded');
    });

    it('generates canonical SKUs with standardized format', () => {
      assert.equal(generateCanonicalSku('AP-TS', { size: 'L', color: 'BLK' }), 'AP-TS-L-BLK');
      assert.equal(generateCanonicalSku('EL_CAM', { model: '4K' }), 'EL_CAM-4K');
      assert.equal(generateCanonicalSku('RAW'), 'RAW');
    });
  });

  describe('7. Public Catalog Projection Security Boundary (SEC-001 & SEC-005)', () => {
    it('strictly omits wholesale costs, suppliers, serials, and internal reorder points from public projections', () => {
      const rawSensitive = {
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
      };

      const publicProjection = toPublicCatalogProjection(rawSensitive as any, 50);

      // Verify essential storefront fields exist
      assert.equal(publicProjection.id, 'prod-sec-999');
      assert.equal(publicProjection.name, 'Enterprise Security Router');
      assert.equal(publicProjection.sku, 'NET-RTR-01');
      assert.equal(publicProjection.price, 499.99);

      // CRITICAL DOMAIN BOUNDARY (PROD-001-F2): Stock MUST NOT be exposed in public projection!
      const raw = publicProjection as unknown as Record<string, unknown>;
      assert.equal('stock' in raw, false, 'stock leaked into public projection root');
      assert.equal(publicProjection.availability.status, 'IN_STOCK');

      // STRICT SECURITY ASSERTIONS: Forbidden internal fields MUST NOT exist
      assert.equal('cost' in raw, false, 'cost leaked into public projection');
      assert.equal('costPrice' in raw, false, 'costPrice leaked into public projection');
      assert.equal('supplier' in raw, false, 'supplier leaked into public projection');
      assert.equal('reorderPoint' in raw, false, 'reorderPoint leaked into public projection');
      assert.equal('serialNumbers' in raw, false, 'serialNumbers leaked into public projection');
      assert.equal('batchNumber' in raw, false, 'batchNumber leaked into public projection');

      // Check variant projection omits costPrice and stock as well
      assert.ok(publicProjection.variants);
      assert.equal(publicProjection.variants.length, 1);
      const varRaw = publicProjection.variants[0] as unknown as Record<string, unknown>;
      assert.equal('costPrice' in varRaw, false, 'variant costPrice leaked into public projection');
      assert.equal('stock' in varRaw, false, 'variant stock leaked into public projection');
      assert.equal(publicProjection.variants[0].availability.status, 'IN_STOCK');
    });

    it('verifies public projection always contains availability and availability.status without exposing numeric stock (PROD-001-F2.1)', () => {
      const canonical = normalizeProduct({
        id: 'p-pub-contract',
        name: 'Organic Honey',
        sku: 'HNY-01',
        price: 15.00,
        category: 'Pantry',
        variants: [
          { sku: 'HNY-01-500G', retailPrice: 15.00 },
          { sku: 'HNY-01-1KG', retailPrice: 28.00 }
        ]
      });

      const projection = toPublicCatalogProjection(canonical, 12);

      // Root public contract
      assert.ok(projection.availability, 'projection must contain availability');
      assert.ok(projection.availability.status, 'projection must contain availability.status');
      assert.ok(
        ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'].includes(projection.availability.status),
        'status must be valid enum'
      );
      assert.equal((projection as any).stock, undefined, 'projection.stock must be undefined');

      // Variant public contract
      assert.ok(projection.variants && projection.variants.length === 2);
      for (const v of projection.variants) {
        assert.ok(v.availability, 'variant must contain availability');
        assert.ok(v.availability.status, 'variant must contain availability.status');
        assert.ok(
          ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'].includes(v.availability.status),
          'variant status must be valid enum'
        );
        assert.equal((v as any).stock, undefined, 'variant.stock must be undefined');
      }
    });

    it('computes public availability status correctly and handles threshold edge cases deterministically (PROD-001-F2, PROD-001-F2.1)', () => {
      // Standard threshold is 5
      // stock = 0 → OUT_OF_STOCK
      assert.equal(computePublicAvailabilityStatus(0), 'OUT_OF_STOCK');
      assert.equal(computePublicAvailabilityStatus(-3), 'OUT_OF_STOCK');
      assert.equal(computePublicAvailabilityStatus(-Infinity), 'OUT_OF_STOCK');
      assert.equal(computePublicAvailabilityStatus(Infinity), 'OUT_OF_STOCK');
      assert.equal(computePublicAvailabilityStatus(NaN), 'OUT_OF_STOCK');

      // Low stock (threshold default is 5)
      // stock = 1 → LOW_STOCK (1 <= 5)
      assert.equal(computePublicAvailabilityStatus(1), 'LOW_STOCK');
      assert.equal(computePublicAvailabilityStatus(3), 'LOW_STOCK');
      // stock = 5 → LOW_STOCK (5 <= 5)
      assert.equal(computePublicAvailabilityStatus(5), 'LOW_STOCK');

      // In stock (threshold default is 5)
      // stock = 6 → IN_STOCK (6 > 5)
      assert.equal(computePublicAvailabilityStatus(6), 'IN_STOCK');
      assert.equal(computePublicAvailabilityStatus(100), 'IN_STOCK');

      // Invalid threshold values (must safely and deterministically default to 5)
      const invalidThresholds = [NaN, Infinity, -Infinity, -5, 0, undefined as any];
      for (const thresh of invalidThresholds) {
        assert.equal(
          computePublicAvailabilityStatus(1, thresh),
          'LOW_STOCK',
          `stock=1 with threshold=${thresh} should default to 5 and yield LOW_STOCK`
        );
        assert.equal(
          computePublicAvailabilityStatus(5, thresh),
          'LOW_STOCK',
          `stock=5 with threshold=${thresh} should default to 5 and yield LOW_STOCK`
        );
        assert.equal(
          computePublicAvailabilityStatus(6, thresh),
          'IN_STOCK',
          `stock=6 with threshold=${thresh} should default to 5 and yield IN_STOCK`
        );
        assert.equal(
          computePublicAvailabilityStatus(0, thresh),
          'OUT_OF_STOCK',
          `stock=0 with threshold=${thresh} should yield OUT_OF_STOCK`
        );
      }

      // Valid custom threshold
      assert.equal(computePublicAvailabilityStatus(8, 10), 'LOW_STOCK'); // 8 <= 10
      assert.equal(computePublicAvailabilityStatus(12, 10), 'IN_STOCK'); // 12 > 10
    });
  });

  describe('8. POS View Adapter', () => {
    it('produces compliant POS product view preserving cart requirements', () => {
      const raw = {
        id: 'pos-view-1',
        name: 'Espresso Roast Beans',
        sku: 'CF-ESP-01',
        price: 18.00,
        cost: 7.50,
        stock: 40,
        category: 'Groceries'
      };

      const canonical = normalizeProduct(raw);
      const posView = toPOSProductView(canonical, raw);

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
