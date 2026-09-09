import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recordAdjustment, recordSale } from '../src/domain/inventory/movements';
import { InventoryDomainError } from '../src/domain/inventory/validation';

describe('INV-002 — Inventory movement boundaries', () => {
  it('rejects fractional sale quantities before persistence', async () => {
    await assert.rejects(
      () => recordSale({ inventoryId: 'inv-1', operationId: 'sale-1', quantity: 1.5 }),
      (error: unknown) => error instanceof InventoryDomainError,
    );
  });

  it('rejects zero adjustments before persistence', async () => {
    await assert.rejects(
      async () => { await recordAdjustment({ inventoryId: 'inv-1', operationId: 'adjust-1', quantityDelta: 0 }); },
      (error: unknown) => error instanceof InventoryDomainError,
    );
  });

  it('rejects malformed operation IDs before persistence', async () => {
    await assert.rejects(
      () => recordSale({ inventoryId: 'inv-1', operationId: 'bad/id', quantity: 1 }),
      (error: unknown) => error instanceof InventoryDomainError,
    );
  });

  it('requires an authenticated actor before attempting a valid movement', async () => {
    await assert.rejects(
      () => recordSale({ inventoryId: 'inv-1', operationId: 'sale-auth', quantity: 1 }),
      (error: unknown) => error instanceof InventoryDomainError && error.errors.some(e => e.field === 'performedBy'),
    );
  });

  it('does not silently coerce invalid quantities', async () => {
    await assert.rejects(
      async () => { await recordAdjustment({ inventoryId: 'inv-1', operationId: 'adjust-negative', quantityDelta: -1.25 }); },
      (error: unknown) => error instanceof InventoryDomainError,
    );
    assert.ok(true);
  });
});
