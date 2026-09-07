/**
 * INV-001 — Authoritative Inventory Domain Test Suite
 *
 * Verifies the foundational Inventory Domain Architecture:
 * Product -> Variant -> SKU -> Inventory
 *
 * Test Suites:
 * 1. Authoritative Inventory Record Creation & Structure
 * 2. Strict Numeric Validation & Anti-Coercion (Number.isFinite)
 * 3. Domain Invariants (Invariants 1 through 8)
 * 4. Internal Operational vs. Public Catalog Projections (Security Boundary)
 * 5. Legacy Compatibility Adapters (Single-SKU & Multi-Variant)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  InventoryRecord,
  validateInventoryRecord,
  assertValidInventoryRecord,
  assertInventoryInvariants,
  assertCanonicalProductHasNoInventoryState,
  assertCanonicalVariantHasNoInventoryState,
  calculateAvailableQuantity,
  getInventoryRecordKey,
  createInventoryRecord,
  createInventoryRecordsFromLegacyProduct,
  createInventoryRecordsFromCanonicalProduct,
  parseLegacyStock,
  toLegacyProductWithInventory,
  toOperationalInventoryProjection,
  toPublicAvailabilityFromInventory,
  aggregateInventoryBalances,
  DEFAULT_LOCATION_ID
} from '../src/domain/inventory';

import {
  normalizeProduct,
  CanonicalProduct,
  CanonicalVariant
} from '../src/domain/product';

import { Product } from '../src/types';

describe('INV-001 — Authoritative Inventory Domain Architecture', () => {

  // ==========================================================================
  // 1. Authoritative Inventory Record Creation & Structure
  // ==========================================================================
  describe('1. Authoritative Inventory Record Creation & Structure', () => {
    it('creates a valid inventory record for a standard SKU with valid defaults', () => {
      const record = createInventoryRecord({
        sku: 'SKU-COFFEE-01',
        productId: 'prod-coffee-1',
        quantityOnHand: 45,
        quantityReserved: 5,
        reorderPoint: 10,
        reorderQuantity: 50,
        trackingMode: 'QUANTITY',
        status: 'ACTIVE'
      });

      assert.strictEqual(record.sku, 'SKU-COFFEE-01');
      assert.strictEqual(record.productId, 'prod-coffee-1');
      assert.strictEqual(record.quantityOnHand, 45);
      assert.strictEqual(record.quantityReserved, 5);
      assert.strictEqual(record.locationId, DEFAULT_LOCATION_ID);
      assert.strictEqual(record.trackingMode, 'QUANTITY');
      assert.strictEqual(record.status, 'ACTIVE');
      assert.strictEqual(typeof record.createdAt, 'string');
      assert.strictEqual(typeof record.updatedAt, 'string');
    });

    it('creates a valid inventory record with custom location and variant reference', () => {
      const record = createInventoryRecord({
        id: 'inv-tee-blk-m-loc-wh',
        sku: 'TSHIRT-BLK-M',
        productId: 'prod-apparel-1',
        variantId: 'var-tee-blk-m-01',
        locationId: 'loc-warehouse-central',
        quantityOnHand: 100,
        quantityReserved: 12,
        trackingMode: 'QUANTITY',
        status: 'ACTIVE'
      });

      assert.strictEqual(record.id, 'inv-tee-blk-m-loc-wh');
      assert.strictEqual(record.sku, 'TSHIRT-BLK-M');
      assert.strictEqual(record.variantId, 'var-tee-blk-m-01');
      assert.strictEqual(record.locationId, 'loc-warehouse-central');
      assert.strictEqual(record.quantityOnHand, 100);
      assert.strictEqual(record.quantityReserved, 12);
    });

    it('creates a valid serial-tracked inventory record', () => {
      const record = createInventoryRecord({
        sku: 'SCAN-ZEBRA-01',
        productId: 'prod-hardware-1',
        quantityOnHand: 3,
        quantityReserved: 0,
        trackingMode: 'SERIAL',
        status: 'ACTIVE',
        serialNumbers: ['SN-10001', 'SN-10002', 'SN-10003']
      });

      assert.strictEqual(record.trackingMode, 'SERIAL');
      assert.strictEqual(record.serialNumbers?.length, 3);
      assert.strictEqual(record.serialNumbers?.[0], 'SN-10001');
    });

    it('creates a valid batch-tracked inventory record with expiry', () => {
      const record = createInventoryRecord({
        sku: 'MILK-ORG-1L',
        productId: 'prod-dairy-1',
        quantityOnHand: 24,
        quantityReserved: 0,
        trackingMode: 'BATCH',
        status: 'ACTIVE',
        batchNumber: 'BATCH-2026-09A',
        expiryDate: '2026-10-15T00:00:00.000Z'
      });

      assert.strictEqual(record.trackingMode, 'BATCH');
      assert.strictEqual(record.batchNumber, 'BATCH-2026-09A');
      assert.strictEqual(record.expiryDate, '2026-10-15T00:00:00.000Z');
    });
  });

  // ==========================================================================
  // 2. Strict Numeric Validation & Anti-Coercion (Number.isFinite)
  // ==========================================================================
  describe('2. Strict Numeric Validation & Anti-Coercion', () => {
    const validBase = {
      id: 'inv-test-1',
      sku: 'SKU-TEST',
      productId: 'prod-test',
      locationId: 'loc-test',
      quantityOnHand: 10,
      quantityReserved: 2,
      trackingMode: 'QUANTITY' as const,
      status: 'ACTIVE' as const,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    };

    it('rejects negative quantityOnHand', () => {
      const res = validateInventoryRecord({ ...validBase, quantityOnHand: -1 });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some(e => e.field === 'quantityOnHand' && e.code === 'OUT_OF_RANGE'));
    });

    it('rejects negative quantityReserved', () => {
      const res = validateInventoryRecord({ ...validBase, quantityReserved: -5 });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some(e => e.field === 'quantityReserved' && e.code === 'OUT_OF_RANGE'));
    });

    it('rejects quantityReserved greater than quantityOnHand (Invariant 3)', () => {
      const res = validateInventoryRecord({ ...validBase, quantityOnHand: 5, quantityReserved: 10 });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some(e => e.field === 'quantityReserved' && e.code === 'INVARIANT_VIOLATION'));
    });

    it('rejects non-finite numbers (NaN, Infinity, -Infinity) in quantityOnHand', () => {
      for (const badValue of [NaN, Infinity, -Infinity]) {
        const res = validateInventoryRecord({ ...validBase, quantityOnHand: badValue });
        assert.strictEqual(res.isValid, false, `Should reject ${badValue}`);
        assert.ok(res.errors.some(e => e.field === 'quantityOnHand' && e.code === 'INVALID_TYPE'));
      }
    });

    it('rejects non-finite numbers (NaN, Infinity, -Infinity) in quantityReserved', () => {
      for (const badValue of [NaN, Infinity, -Infinity]) {
        const res = validateInventoryRecord({ ...validBase, quantityReserved: badValue });
        assert.strictEqual(res.isValid, false, `Should reject ${badValue}`);
        assert.ok(res.errors.some(e => e.field === 'quantityReserved' && e.code === 'INVALID_TYPE'));
      }
    });

    it('rejects non-finite numbers and negative values in reorderPoint', () => {
      assert.strictEqual(validateInventoryRecord({ ...validBase, reorderPoint: -1 }).isValid, false);
      assert.strictEqual(validateInventoryRecord({ ...validBase, reorderPoint: Infinity }).isValid, false);
      assert.strictEqual(validateInventoryRecord({ ...validBase, reorderPoint: NaN }).isValid, false);
      assert.strictEqual(validateInventoryRecord({ ...validBase, reorderPoint: 5 }).isValid, true);
    });

    it('rejects empty or whitespace-only SKU', () => {
      assert.strictEqual(validateInventoryRecord({ ...validBase, sku: '' }).isValid, false);
      assert.strictEqual(validateInventoryRecord({ ...validBase, sku: '   ' }).isValid, false);
    });

    it('rejects empty or whitespace-only productId', () => {
      assert.strictEqual(validateInventoryRecord({ ...validBase, productId: '' }).isValid, false);
      assert.strictEqual(validateInventoryRecord({ ...validBase, productId: '   ' }).isValid, false);
    });

    it('rejects empty or whitespace-only locationId', () => {
      assert.strictEqual(validateInventoryRecord({ ...validBase, locationId: '' }).isValid, false);
      assert.strictEqual(validateInventoryRecord({ ...validBase, locationId: '   ' }).isValid, false);
    });

    it('rejects empty or whitespace-only id', () => {
      assert.strictEqual(validateInventoryRecord({ ...validBase, id: '' }).isValid, false);
      assert.strictEqual(validateInventoryRecord({ ...validBase, id: '   ' }).isValid, false);
    });

    it('rejects invalid trackingMode enum', () => {
      assert.strictEqual(validateInventoryRecord({ ...validBase, trackingMode: 'INVALID_MODE' }).isValid, false);
      assert.strictEqual(validateInventoryRecord({ ...validBase, trackingMode: '' }).isValid, false);
    });

    it('rejects invalid status enum', () => {
      assert.strictEqual(validateInventoryRecord({ ...validBase, status: 'PENDING' }).isValid, false);
      assert.strictEqual(validateInventoryRecord({ ...validBase, status: '' }).isValid, false);
    });

    it('accepts zero values for on-hand and reserved', () => {
      const res = validateInventoryRecord({ ...validBase, quantityOnHand: 0, quantityReserved: 0 });
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.record?.quantityOnHand, 0);
      assert.strictEqual(res.record?.quantityReserved, 0);
    });

    it('strictly requires valid createdAt timestamp (no silent generation)', () => {
      const missingCreatedAt = { ...validBase, createdAt: undefined };
      const res1 = validateInventoryRecord(missingCreatedAt);
      assert.strictEqual(res1.isValid, false);
      assert.ok(res1.errors.some(e => e.field === 'createdAt' && e.code === 'REQUIRED'));

      const invalidCreatedAt = { ...validBase, createdAt: 'not-a-valid-date' };
      const res2 = validateInventoryRecord(invalidCreatedAt);
      assert.strictEqual(res2.isValid, false);
      assert.ok(res2.errors.some(e => e.field === 'createdAt' && e.code === 'INVALID_TYPE'));
    });

    it('strictly requires valid updatedAt timestamp (no silent generation)', () => {
      const missingUpdatedAt = { ...validBase, updatedAt: undefined };
      const res1 = validateInventoryRecord(missingUpdatedAt);
      assert.strictEqual(res1.isValid, false);
      assert.ok(res1.errors.some(e => e.field === 'updatedAt' && e.code === 'REQUIRED'));

      const invalidUpdatedAt = { ...validBase, updatedAt: 'not-a-valid-date' };
      const res2 = validateInventoryRecord(invalidUpdatedAt);
      assert.strictEqual(res2.isValid, false);
      assert.ok(res2.errors.some(e => e.field === 'updatedAt' && e.code === 'INVALID_TYPE'));
    });

    it('enforces trackingMode === NONE semantics (non-stocked items have 0 stock and no serial/batch fields)', () => {
      const validNone = {
        ...validBase,
        trackingMode: 'NONE' as const,
        quantityOnHand: 0,
        quantityReserved: 0
      };
      assert.strictEqual(validateInventoryRecord(validNone).isValid, true);

      // Rejects quantityOnHand > 0 for NONE
      const illegalOnHand = { ...validNone, quantityOnHand: 10 };
      const res1 = validateInventoryRecord(illegalOnHand);
      assert.strictEqual(res1.isValid, false);
      assert.ok(res1.errors.some(e => e.field === 'quantityOnHand' && e.code === 'INVARIANT_VIOLATION'));

      // Rejects quantityReserved > 0 for NONE
      const illegalReserved = { ...validNone, quantityReserved: 5 };
      const res2 = validateInventoryRecord(illegalReserved);
      assert.strictEqual(res2.isValid, false);

      // Rejects serialNumbers for NONE
      const illegalSerials = { ...validNone, serialNumbers: ['SN-1'] };
      assert.strictEqual(validateInventoryRecord(illegalSerials).isValid, false);

      // Rejects batchNumber for NONE
      const illegalBatch = { ...validNone, batchNumber: 'LOT-99' };
      assert.strictEqual(validateInventoryRecord(illegalBatch).isValid, false);

      // Rejects expiryDate for NONE
      const illegalExpiry = { ...validNone, expiryDate: '2026-10-15T00:00:00.000Z' };
      assert.strictEqual(validateInventoryRecord(illegalExpiry).isValid, false);
    });

    it('enforces trackingMode === QUANTITY semantics (no serialNumbers, batchNumber, or expiryDate)', () => {
      const withSerials = { ...validBase, serialNumbers: ['SN-1'] };
      assert.strictEqual(validateInventoryRecord(withSerials).isValid, false);

      const withBatch = { ...validBase, batchNumber: 'BATCH-1' };
      assert.strictEqual(validateInventoryRecord(withBatch).isValid, false);

      const withExpiry = { ...validBase, expiryDate: '2026-10-15T00:00:00.000Z' };
      assert.strictEqual(validateInventoryRecord(withExpiry).isValid, false);
    });

    it('enforces trackingMode === SERIAL semantics (valid non-empty string serials, no batch fields, no duplicates)', () => {
      const validSerial = {
        ...validBase,
        trackingMode: 'SERIAL' as const,
        quantityOnHand: 2,
        quantityReserved: 0,
        serialNumbers: ['SN-AAA-01', 'SN-AAA-02']
      };
      assert.strictEqual(validateInventoryRecord(validSerial).isValid, true);

      // Rejects batch fields
      assert.strictEqual(validateInventoryRecord({ ...validSerial, batchNumber: 'B1' }).isValid, false);
      assert.strictEqual(validateInventoryRecord({ ...validSerial, expiryDate: '2026-10-15T00:00:00.000Z' }).isValid, false);

      // Rejects non-string serials (e.g. numbers)
      const numberSerial = { ...validSerial, serialNumbers: [123 as unknown as string] };
      assert.strictEqual(validateInventoryRecord(numberSerial).isValid, false);

      // Rejects null in serials
      const nullSerial = { ...validSerial, serialNumbers: [null as unknown as string] };
      assert.strictEqual(validateInventoryRecord(nullSerial).isValid, false);

      // Rejects empty or whitespace serials
      const emptySerial = { ...validSerial, serialNumbers: ['', 'ABC'] };
      assert.strictEqual(validateInventoryRecord(emptySerial).isValid, false);

      // Rejects duplicate serials
      const dupSerial = { ...validSerial, serialNumbers: ['SN-01', 'sn-01'] };
      const resDup = validateInventoryRecord(dupSerial);
      assert.strictEqual(resDup.isValid, false);
      assert.ok(resDup.errors.some(e => e.code === 'INVARIANT_VIOLATION' && e.message.includes('Duplicate serial')));
    });

    it('enforces trackingMode === BATCH semantics (valid non-empty batchNumber, valid ISO expiry, no serialNumbers)', () => {
      const validBatch = {
        ...validBase,
        trackingMode: 'BATCH' as const,
        batchNumber: 'LOT-2026-09X',
        expiryDate: '2026-11-20T00:00:00.000Z'
      };
      assert.strictEqual(validateInventoryRecord(validBatch).isValid, true);

      // Rejects serialNumbers
      assert.strictEqual(validateInventoryRecord({ ...validBatch, serialNumbers: ['SN-1'] }).isValid, false);

      // Rejects empty batchNumber
      assert.strictEqual(validateInventoryRecord({ ...validBatch, batchNumber: '' }).isValid, false);
      assert.strictEqual(validateInventoryRecord({ ...validBatch, batchNumber: '   ' }).isValid, false);

      // Rejects malformed expiryDate
      assert.strictEqual(validateInventoryRecord({ ...validBatch, expiryDate: 'not-a-date' }).isValid, false);
      assert.strictEqual(validateInventoryRecord({ ...validBatch, expiryDate: '2025-99-99' }).isValid, false);
    });
  });

  // ==========================================================================
  // 3. Domain Invariants (Invariants 1 through 8)
  // ==========================================================================
  describe('3. Domain Invariants (Invariants 1 through 8)', () => {
    it('Invariant 1 & 2: quantityOnHand >= 0 and quantityReserved >= 0', () => {
      const record = createInventoryRecord({
        sku: 'SKU-INV-1',
        productId: 'prod-inv-1',
        quantityOnHand: 25,
        quantityReserved: 5
      });
      assert.ok(record.quantityOnHand >= 0);
      assert.ok(record.quantityReserved >= 0);
      assert.doesNotThrow(() => assertInventoryInvariants(record));
    });

    it('Invariant 3: quantityReserved <= quantityOnHand is strictly enforced', () => {
      assert.throws(() => {
        createInventoryRecord({
          sku: 'SKU-INV-2',
          productId: 'prod-inv-2',
          quantityOnHand: 10,
          quantityReserved: 11 // VIOLATION
        });
      }, /Invariant 3 violated|quantityReserved.*cannot exceed/);
    });

    it('Invariant 4: availableQuantity = quantityOnHand - quantityReserved (deterministic derivation)', () => {
      const record = createInventoryRecord({
        sku: 'SKU-INV-4',
        productId: 'prod-inv-4',
        quantityOnHand: 40,
        quantityReserved: 15
      });

      const available = calculateAvailableQuantity(record);
      assert.strictEqual(available, 25);
      assert.strictEqual(available, record.quantityOnHand - record.quantityReserved);
    });

    it('Invariant 4 edge cases: availableQuantity when reserved equals on-hand is 0', () => {
      const record = createInventoryRecord({
        sku: 'SKU-INV-4B',
        productId: 'prod-inv-4',
        quantityOnHand: 10,
        quantityReserved: 10
      });
      assert.strictEqual(calculateAvailableQuantity(record), 0);
    });

    it('Invariant 4 strictness: calculateAvailableQuantity strictly rejects non-finite, negative, and reserved > onHand', () => {
      // 1. Valid finite values
      assert.strictEqual(calculateAvailableQuantity({ quantityOnHand: 10, quantityReserved: 3 }), 7);
      assert.strictEqual(calculateAvailableQuantity({ quantityOnHand: 0, quantityReserved: 0 }), 0);

      // 2. Rejects NaN
      assert.throws(() => calculateAvailableQuantity({ quantityOnHand: NaN, quantityReserved: 0 }), /quantityOnHand must be a finite number/);
      assert.throws(() => calculateAvailableQuantity({ quantityOnHand: 10, quantityReserved: NaN }), /quantityReserved must be a finite number/);

      // 3. Rejects Infinity
      assert.throws(() => calculateAvailableQuantity({ quantityOnHand: Infinity, quantityReserved: 0 }), /quantityOnHand must be a finite number/);
      assert.throws(() => calculateAvailableQuantity({ quantityOnHand: 10, quantityReserved: Infinity }), /quantityReserved must be a finite number/);

      // 4. Rejects negative quantities
      assert.throws(() => calculateAvailableQuantity({ quantityOnHand: -5, quantityReserved: 0 }), /quantityOnHand cannot be negative/);
      assert.throws(() => calculateAvailableQuantity({ quantityOnHand: 10, quantityReserved: -2 }), /quantityReserved cannot be negative/);

      // 5. Rejects reserved > onHand without silently returning zero
      assert.throws(() => calculateAvailableQuantity({ quantityOnHand: 5, quantityReserved: 8 }), /quantityReserved \(8\) cannot exceed quantityOnHand \(5\)/);
    });

    it('Logical Identity: getInventoryRecordKey establishes SKU + locationId boundary', () => {
      const key1 = getInventoryRecordKey({ sku: 'tshirt-blk-m', locationId: 'LOC-WAREHOUSE-A' });
      const key2 = getInventoryRecordKey({ sku: 'TSHIRT-BLK-M', locationId: 'loc-warehouse-a' });
      const keyDiffLoc = getInventoryRecordKey({ sku: 'TSHIRT-BLK-M', locationId: 'loc-store-front' });
      const keyDiffSku = getInventoryRecordKey({ sku: 'TSHIRT-RED-M', locationId: 'loc-warehouse-a' });

      // Deterministic case-insensitive normalization
      assert.strictEqual(key1, 'TSHIRT-BLK-M::loc-warehouse-a');
      assert.strictEqual(key1, key2);

      // Distinguishes location and SKU boundaries
      assert.notStrictEqual(key1, keyDiffLoc);
      assert.notStrictEqual(key1, keyDiffSku);
    });

    it('Invariant 5: Inventory belongs to an authoritative SKU', () => {
      const record = createInventoryRecord({
        sku: 'SKU-AUTH-001',
        productId: 'prod-auth-1',
        quantityOnHand: 50
      });
      assert.strictEqual(record.sku, 'SKU-AUTH-001');
      assert.ok(record.sku.length > 0);
    });

    it('Invariant 6: Inventory does not belong inside CanonicalProduct', () => {
      const canonical = normalizeProduct({
        id: 'prod-clean-1',
        name: 'Clean Domain Product',
        sku: 'SKU-CLEAN-1',
        price: 50.00,
        category: 'Apparel',
        variants: []
      });

      // CanonicalProduct must NOT have stock, location, or reorderPoint
      assert.doesNotThrow(() => assertCanonicalProductHasNoInventoryState(canonical));

      const raw = canonical as unknown as Record<string, unknown>;
      assert.strictEqual(raw.stock, undefined);
      assert.strictEqual(raw.quantityOnHand, undefined);
      assert.strictEqual(raw.location, undefined);
      assert.strictEqual(raw.reorderPoint, undefined);
    });

    it('Invariant 7: Inventory does not belong inside CanonicalVariant', () => {
      const canonical = normalizeProduct({
        id: 'prod-variants-1',
        name: 'Variant Product',
        sku: 'SKU-VAR-BASE',
        price: 35.00,
        category: 'Shoes',
        variants: [
          { sku: 'SHOE-RED-42', stock: 15, retailPrice: 35.00 },
          { sku: 'SHOE-RED-43', stock: 20, retailPrice: 35.00 }
        ]
      });

      for (const variant of canonical.variants) {
        assert.doesNotThrow(() => assertCanonicalVariantHasNoInventoryState(variant));
        const rawVar = variant as unknown as Record<string, unknown>;
        assert.strictEqual(rawVar.stock, undefined);
        assert.strictEqual(rawVar.quantityOnHand, undefined);
      }
    });

    it('Invariant 8: Inventory references authoritative SKU identity without redefining it', () => {
      const canonical = normalizeProduct({
        id: 'prod-sku-test',
        name: 'T-Shirt',
        sku: 'TSHIRT-BASE',
        price: 20,
        category: 'Apparel',
        variants: [
          { sku: 'TSHIRT-BLK-S', stock: 10 },
          { sku: 'TSHIRT-BLK-M', stock: 25 }
        ]
      });

      const invS = createInventoryRecord({
        sku: canonical.variants[0].sku,
        productId: canonical.id,
        variantId: canonical.variants[0].id,
        quantityOnHand: 10
      });

      const invM = createInventoryRecord({
        sku: canonical.variants[1].sku,
        productId: canonical.id,
        variantId: canonical.variants[1].id,
        quantityOnHand: 25
      });

      assert.strictEqual(invS.sku, 'TSHIRT-BLK-S');
      assert.strictEqual(invM.sku, 'TSHIRT-BLK-M');
    });
  });

  // ==========================================================================
  // 4. Internal Operational vs. Public Catalog Projections (Security Boundary)
  // ==========================================================================
  describe('4. Internal Operational vs. Public Catalog Projections (Security Boundary)', () => {
    const internalRecord = createInventoryRecord({
      sku: 'SKU-SECRET-01',
      productId: 'prod-secret-1',
      locationId: 'loc-vault-7',
      quantityOnHand: 18,
      quantityReserved: 3,
      reorderPoint: 5,
      reorderQuantity: 30,
      trackingMode: 'QUANTITY',
      status: 'ACTIVE'
    });

    it('internal operational projection provides detailed stock metrics for staff', () => {
      const operational = toOperationalInventoryProjection(internalRecord);

      assert.strictEqual(operational.sku, 'SKU-SECRET-01');
      assert.strictEqual(operational.quantityOnHand, 18);
      assert.strictEqual(operational.quantityReserved, 3);
      assert.strictEqual(operational.availableQuantity, 15);
      assert.strictEqual(operational.reorderPoint, 5);
      assert.strictEqual(operational.locationId, 'loc-vault-7');
      assert.strictEqual(operational.isLowStock, false);
      assert.strictEqual(operational.isOutOfStock, false);
    });

    it('internal operational projection correctly flags low stock', () => {
      const lowStockRecord = createInventoryRecord({
        sku: 'SKU-LOW',
        productId: 'prod-low',
        quantityOnHand: 4,
        quantityReserved: 1,
        reorderPoint: 5
      });

      const operational = toOperationalInventoryProjection(lowStockRecord);
      assert.strictEqual(operational.availableQuantity, 3);
      assert.strictEqual(operational.isLowStock, true);
      assert.strictEqual(operational.isOutOfStock, false);
    });

    it('internal operational projection correctly flags out of stock', () => {
      const outOfStockRecord = createInventoryRecord({
        sku: 'SKU-OOS',
        productId: 'prod-oos',
        quantityOnHand: 5,
        quantityReserved: 5,
        reorderPoint: 5
      });

      const operational = toOperationalInventoryProjection(outOfStockRecord);
      assert.strictEqual(operational.availableQuantity, 0);
      assert.strictEqual(operational.isLowStock, false);
      assert.strictEqual(operational.isOutOfStock, true);
    });

    it('public catalog projection strictly exposes categorical availability only (NO stock leakage)', () => {
      const publicProj = toPublicAvailabilityFromInventory(internalRecord);

      assert.strictEqual(publicProj.sku, 'SKU-SECRET-01');
      assert.strictEqual(publicProj.availability.status, 'IN_STOCK');

      // VERIFY STRICT SECURITY BOUNDARY:
      // Operational and financial quantities MUST NOT exist in public projection
      const raw = publicProj as unknown as Record<string, unknown>;
      assert.strictEqual('quantityOnHand' in raw, false, 'quantityOnHand must not leak');
      assert.strictEqual('quantityReserved' in raw, false, 'quantityReserved must not leak');
      assert.strictEqual('availableQuantity' in raw, false, 'availableQuantity must not leak');
      assert.strictEqual('reorderPoint' in raw, false, 'reorderPoint must not leak');
      assert.strictEqual('locationId' in raw, false, 'locationId must not leak');
      assert.strictEqual('cost' in raw, false, 'cost must not leak');
      assert.strictEqual('supplier' in raw, false, 'supplier must not leak');
    });

    it('public availability projection accurately reflects LOW_STOCK and OUT_OF_STOCK without leaking numbers', () => {
      const lowStock = createInventoryRecord({
        sku: 'SKU-L',
        productId: 'prod-l',
        quantityOnHand: 2,
        reorderPoint: 5
      });
      const oos = createInventoryRecord({
        sku: 'SKU-O',
        productId: 'prod-o',
        quantityOnHand: 0,
        reorderPoint: 5
      });

      assert.strictEqual(toPublicAvailabilityFromInventory(lowStock).availability.status, 'LOW_STOCK');
      assert.strictEqual(toPublicAvailabilityFromInventory(oos).availability.status, 'OUT_OF_STOCK');
    });
  });

  // ==========================================================================
  // 5. Legacy Compatibility Adapters (Single-SKU & Multi-Variant)
  // ==========================================================================
  describe('5. Legacy Compatibility Adapters', () => {
    it('creates authoritative inventory records from a single-SKU legacy product', () => {
      const rawLegacy: Product = {
        id: 'prod-leg-1',
        name: 'Single SKU Legacy Product',
        sku: 'LEG-SKU-01',
        price: 25.00,
        cost: 10.00,
        stock: 35,
        location: 'Store Shelf',
        reorderPoint: 10,
        category: 'Accessories',
        barcode: '123456789012',
        qrCode: 'qr-1',
        variants: [],
        salesCount: 0
      };

      const records = createInventoryRecordsFromLegacyProduct(rawLegacy);
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0].sku, 'LEG-SKU-01');
      assert.strictEqual(records[0].productId, 'prod-leg-1');
      assert.strictEqual(records[0].quantityOnHand, 35);
      assert.strictEqual(records[0].quantityReserved, 0);
      assert.strictEqual(records[0].locationId, 'Store Shelf');
      assert.strictEqual(records[0].reorderPoint, 10);
    });

    it('creates authoritative inventory records per variant from a multi-variant legacy product', () => {
      const rawLegacy: Product = {
        id: 'prod-leg-multi',
        name: 'Multi-Variant Shirt',
        sku: 'SHIRT-BASE',
        price: 45.00,
        cost: 20.00,
        stock: 60,
        location: 'Warehouse B',
        reorderPoint: 15,
        category: 'Apparel',
        barcode: '987654321098',
        qrCode: 'qr-multi',
        salesCount: 0,
        variants: [
          { sku: 'SHIRT-S', stock: 15, retailPrice: 45.00 },
          { sku: 'SHIRT-M', stock: 25, retailPrice: 45.00 },
          { sku: 'SHIRT-L', stock: 20, retailPrice: 45.00 }
        ]
      };

      const records = createInventoryRecordsFromLegacyProduct(rawLegacy);
      assert.strictEqual(records.length, 3);
      assert.strictEqual(records[0].sku, 'SHIRT-S');
      assert.strictEqual(records[0].quantityOnHand, 15);
      assert.strictEqual(records[1].sku, 'SHIRT-M');
      assert.strictEqual(records[1].quantityOnHand, 25);
      assert.strictEqual(records[2].sku, 'SHIRT-L');
      assert.strictEqual(records[2].quantityOnHand, 20);
    });

    it('adapts CanonicalProduct + InventoryRecords into backward-compatible legacy Product view without modifying CanonicalProduct', () => {
      const canonical = normalizeProduct({
        id: 'prod-clean-tote',
        name: 'Classic Canvas Tote',
        sku: 'TOTE-CANVAS-01',
        price: 29.99,
        category: 'Bags',
        variants: []
      });

      const inventory = [
        createInventoryRecord({
          sku: 'TOTE-CANVAS-01',
          productId: 'prod-clean-tote',
          locationId: 'Aisle 3',
          quantityOnHand: 42,
          reorderPoint: 8
        })
      ];

      const legacyView = toLegacyProductWithInventory(canonical, inventory);

      // Legacy view receives stock projection
      assert.strictEqual(legacyView.stock, 42);
      assert.strictEqual(legacyView.location, 'Aisle 3');
      assert.strictEqual(legacyView.reorderPoint, 8);
      assert.strictEqual(legacyView.id, 'prod-clean-tote');
      assert.strictEqual(legacyView.name, 'Classic Canvas Tote');

      // CanonicalProduct itself remains pristine without stock (Invariant 6)
      assert.doesNotThrow(() => assertCanonicalProductHasNoInventoryState(canonical));
      const rawCanonical = canonical as unknown as Record<string, unknown>;
      assert.strictEqual(rawCanonical.stock, undefined);
    });

    it('adapts multi-variant CanonicalProduct + InventoryRecords correctly aggregating total stock and variant stocks', () => {
      const canonical = normalizeProduct({
        id: 'prod-running-shoes',
        name: 'Speed Runner Pro',
        sku: 'SHOES-BASE',
        price: 120.00,
        category: 'Footwear',
        variants: [
          { sku: 'SHOES-41', retailPrice: 120 },
          { sku: 'SHOES-42', retailPrice: 120 },
          { sku: 'SHOES-43', retailPrice: 120 }
        ]
      });

      const inventory = [
        createInventoryRecord({ sku: 'SHOES-41', productId: 'prod-running-shoes', quantityOnHand: 10, locationId: 'Shelf 1' }),
        createInventoryRecord({ sku: 'SHOES-42', productId: 'prod-running-shoes', quantityOnHand: 15, locationId: 'Shelf 1' }),
        createInventoryRecord({ sku: 'SHOES-43', productId: 'prod-running-shoes', quantityOnHand: 8, locationId: 'Shelf 1' })
      ];

      const legacyView = toLegacyProductWithInventory(canonical, inventory);

      // Total computed stock = 10 + 15 + 8 = 33
      assert.strictEqual(legacyView.stock, 33);
      assert.strictEqual(legacyView.variants.length, 3);
      assert.strictEqual(legacyView.variants[0].stock, 10);
      assert.strictEqual(legacyView.variants[1].stock, 15);
      assert.strictEqual(legacyView.variants[2].stock, 8);
    });

    it('calculates aggregate inventory balances accurately', () => {
      const records = [
        createInventoryRecord({ sku: 'SKU-1', productId: 'p-1', quantityOnHand: 50, quantityReserved: 10 }),
        createInventoryRecord({ sku: 'SKU-2', productId: 'p-1', quantityOnHand: 30, quantityReserved: 5 }),
        createInventoryRecord({ sku: 'SKU-3', productId: 'p-1', quantityOnHand: 20, quantityReserved: 0, status: 'INACTIVE' })
      ];

      const agg = aggregateInventoryBalances(records);
      // SKU-3 is INACTIVE, so active totalOnHand = 50 + 30 = 80
      assert.strictEqual(agg.totalOnHand, 80);
      // totalReserved = 10 + 5 = 15
      assert.strictEqual(agg.totalReserved, 15);
      // totalAvailable = 80 - 15 = 65
      assert.strictEqual(agg.totalAvailable, 65);
      assert.strictEqual(agg.isAnyInStock, true);
    });

    it('legacy migration policy: missing stock defaults to 0, invalid stock throws explicit error', () => {
      // 1. parseLegacyStock missing values
      assert.strictEqual(parseLegacyStock(undefined, 'test.missing'), 0);
      assert.strictEqual(parseLegacyStock(null, 'test.null'), 0);
      assert.strictEqual(parseLegacyStock(15, 'test.valid'), 15);

      // 2. parseLegacyStock invalid values throw InventoryDomainError
      assert.throws(() => parseLegacyStock(NaN, 'test.nan'), /stock must be a finite number or omitted, received NaN/);
      assert.throws(() => parseLegacyStock(Infinity, 'test.inf'), /stock must be a finite number or omitted, received Infinity/);
      assert.throws(() => parseLegacyStock(-Infinity, 'test.-inf'), /stock must be a finite number or omitted, received -Infinity/);
      assert.throws(() => parseLegacyStock(-10, 'test.neg'), /stock cannot be negative, received -10/);
      assert.throws(() => parseLegacyStock('invalid-str', 'test.str'), /stock must be a finite number or omitted, received invalid-str/);

      // 3. createInventoryRecordsFromLegacyProduct with missing stock succeeds with 0
      const missingStockProd = {
        id: 'prod-no-stock',
        name: 'Product with Missing Stock',
        sku: 'SKU-NO-STOCK',
        price: 10,
        cost: 5,
        category: 'General',
        location: 'A1',
        reorderPoint: 2,
        barcode: '12345',
        qrCode: 'qr-12345',
        variants: [],
        salesCount: 0
      } as unknown as Product;
      const records = createInventoryRecordsFromLegacyProduct(missingStockProd);
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0].quantityOnHand, 0);

      // 4. createInventoryRecordsFromLegacyProduct with NaN stock throws explicit error
      const nanStockProd = {
        ...missingStockProd,
        stock: NaN
      } as unknown as Product;
      assert.throws(() => createInventoryRecordsFromLegacyProduct(nanStockProd), /stock must be a finite number or omitted, received NaN/);

      // 5. createInventoryRecordsFromLegacyProduct with negative variant stock throws explicit error
      const negativeVariantProd = {
        ...missingStockProd,
        variants: [{ sku: 'VAR-1', stock: -5 }]
      } as unknown as Product;
      assert.throws(() => createInventoryRecordsFromLegacyProduct(negativeVariantProd), /stock cannot be negative, received -5/);
    });

    it('legacy migration policy: trackingMode NONE forces quantityOnHand to 0', () => {
      const nonStockedService = {
        id: 'prod-service-1',
        name: 'Installation Service',
        sku: 'SVC-INSTALL',
        price: 75.00,
        cost: 0,
        category: 'Services',
        location: 'N/A',
        reorderPoint: 0,
        barcode: 'SVC-1',
        qrCode: 'qr-svc-1',
        inventoryTracking: 'NONE' as const,
        stock: 50, // Historical legacy field had dummy stock
        variants: [],
        salesCount: 0
      } as unknown as Product;

      const records = createInventoryRecordsFromLegacyProduct(nonStockedService);
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0].trackingMode, 'NONE');
      assert.strictEqual(records[0].quantityOnHand, 0);
      assert.strictEqual(records[0].quantityReserved, 0);
    });

    it('Variant Identity: does NOT use SKU as variantId in legacy adapter; preserves genuine IDs in canonical adapter', () => {
      // 1. Legacy ProductVariant has only SKU (no primary id)
      const legacyWithVariants = {
        id: 'prod-shirt-legacy',
        name: 'Classic Tee',
        sku: 'TEE-BASE',
        price: 20,
        cost: 8,
        category: 'Apparel',
        location: 'Shelf 1',
        reorderPoint: 5,
        barcode: 'TEE-BAR',
        qrCode: 'qr-tee',
        variants: [
          { sku: 'TEE-S', stock: 10 },
          { sku: 'TEE-M', stock: 20 }
        ],
        salesCount: 0
      } as unknown as Product;

      const legacyRecords = createInventoryRecordsFromLegacyProduct(legacyWithVariants);
      assert.strictEqual(legacyRecords.length, 2);
      // Crucial verification: variantId must NOT equal variant.sku!
      assert.strictEqual(legacyRecords[0].variantId, undefined, 'variantId must not be set to variant.sku');
      assert.strictEqual(legacyRecords[0].sku, 'TEE-S');
      assert.strictEqual(legacyRecords[1].variantId, undefined, 'variantId must not be set to variant.sku');
      assert.strictEqual(legacyRecords[1].sku, 'TEE-M');

      // 2. Legacy variant with genuine id property preserves it
      const legacyWithGenuineId = {
        id: 'prod-jacket-legacy',
        name: 'Winter Jacket',
        sku: 'JKT-BASE',
        price: 150,
        cost: 70,
        category: 'Outerwear',
        location: 'Shelf 2',
        reorderPoint: 3,
        barcode: 'JKT-BAR',
        qrCode: 'qr-jkt',
        variants: [
          { sku: 'JKT-BLK-L', stock: 5, id: 'var-genuine-jkt-01' }
        ],
        salesCount: 0
      } as unknown as Product;
      const genuineRecords = createInventoryRecordsFromLegacyProduct(legacyWithGenuineId);
      assert.strictEqual(genuineRecords[0].variantId, 'var-genuine-jkt-01');
      assert.strictEqual(genuineRecords[0].sku, 'JKT-BLK-L');
      assert.notStrictEqual(genuineRecords[0].variantId, genuineRecords[0].sku);

      // 3. CanonicalProduct hierarchy: Product ID -> Variant ID -> SKU -> Inventory Record
      const canonical = normalizeProduct({
        id: 'prod-canon-100',
        name: 'Canonical Sneaker',
        sku: 'SNK-BASE',
        price: 90,
        category: 'Footwear',
        variants: [
          { sku: 'SNK-42', retailPrice: 90 },
          { sku: 'SNK-43', retailPrice: 90 }
        ]
      });

      const canonicalRecords = createInventoryRecordsFromCanonicalProduct(canonical, 'loc-main', 15);
      assert.strictEqual(canonicalRecords.length, 2);

      // Verify complete hierarchy mapping
      const rec42 = canonicalRecords[0];
      const variant42 = canonical.variants[0];
      assert.strictEqual(rec42.productId, canonical.id);
      assert.strictEqual(rec42.variantId, variant42.id); // CanonicalVariant.id
      assert.strictEqual(rec42.sku, variant42.sku);       // CanonicalVariant.sku
      assert.notStrictEqual(rec42.variantId, rec42.sku);  // Proof that variantId !== sku
      assert.strictEqual(rec42.quantityOnHand, 15);
    });
  });
});
