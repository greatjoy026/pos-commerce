import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';

const PROJECT_ID = 'nexus-pos-commerce-test';
const timestamp = '2026-09-12T00:00:00.000Z';

const zeroInventory = {
  id: 'inv-zero-1',
  sku: 'INV-002-1',
  productId: 'prod-inv-002',
  locationId: 'loc-main-store',
  quantityOnHand: 0,
  quantityReserved: 0,
  trackingMode: 'QUANTITY',
  status: 'ACTIVE',
  createdAt: timestamp,
  updatedAt: timestamp,
};

describe('INV-002 — Authoritative inventory mutation boundary', () => {
  let env: RulesTestEnvironment;

  before(async () => {
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'inventory', zeroInventory.id), zeroInventory);
      await setDoc(doc(db, 'products', 'prod-inv-002'), {
        id: 'prod-inv-002',
        name: 'Inventory Test Product',
        sku: 'INV-002-1',
        price: 100,
        stock: 0,
        category: 'Test',
      });
      await setDoc(doc(db, 'public_products', 'prod-inv-002'), {
        id: 'prod-inv-002',
        name: 'Inventory Test Product',
        sku: 'INV-002-1',
        price: 100,
        availability: { status: 'OUT_OF_STOCK' },
        category: 'Test',
      });
    });
  });

  after(async () => {
    await env.cleanup();
  });

  it('allows inventory staff to read authoritative inventory', async () => {
    const staff = env.authenticatedContext('staff-inv-1', {
      role: 'Inventory Manager',
      tenantId: 'nexus-enterprise',
    }).firestore();
    await assertSucceeds(getDoc(doc(staff, 'inventory', zeroInventory.id)));
  });

  it('allows inventory staff to create a zero-balance inventory record', async () => {
    const staff = env.authenticatedContext('staff-inv-1', {
      role: 'Inventory Manager',
      tenantId: 'nexus-enterprise',
    }).firestore();
    await assertSucceeds(setDoc(doc(staff, 'inventory', 'inv-new-zero'), {
      ...zeroInventory,
      id: 'inv-new-zero',
    }));
  });

  it('rejects client creation of an inventory record with a nonzero opening balance', async () => {
    const staff = env.authenticatedContext('staff-inv-1', {
      role: 'Inventory Manager',
      tenantId: 'nexus-enterprise',
    }).firestore();
    await assertFails(setDoc(doc(staff, 'inventory', 'inv-forged-opening'), {
      ...zeroInventory,
      id: 'inv-forged-opening',
      quantityOnHand: 10,
    }));
  });

  it('rejects direct inventory balance mutation by inventory staff', async () => {
    const staff = env.authenticatedContext('staff-inv-1', {
      role: 'Inventory Manager',
      tenantId: 'nexus-enterprise',
    }).firestore();
    await assertFails(updateDoc(doc(staff, 'inventory', zeroInventory.id), {
      quantityOnHand: 10,
    }));
  });

  it('rejects direct inventory deletion even for a Store Manager', async () => {
    const manager = env.authenticatedContext('staff-mgr-1', {
      role: 'Store Manager',
      tenantId: 'nexus-enterprise',
    }).firestore();
    await assertFails(deleteDoc(doc(manager, 'inventory', zeroInventory.id)));
  });

  it('rejects direct creation of movement records even for inventory staff', async () => {
    const staff = env.authenticatedContext('staff-inv-1', {
      role: 'Inventory Manager',
      tenantId: 'nexus-enterprise',
    }).firestore();
    await assertFails(setDoc(doc(staff, 'inventory_movements', 'mov-forged'), {
      id: 'mov-forged',
      inventoryId: zeroInventory.id,
      sku: zeroInventory.sku,
      locationId: zeroInventory.locationId,
      movementType: 'PURCHASE_RECEIPT',
      quantityDelta: 10,
      quantityBefore: 0,
      quantityAfter: 10,
      performedBy: 'staff-inv-1',
      timestamp,
    }));
  });

  it('rejects movement updates and deletes from the client boundary', async () => {
    const staff = env.authenticatedContext('staff-inv-1', {
      role: 'Inventory Manager',
      tenantId: 'nexus-enterprise',
    }).firestore();
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'inventory_movements', 'mov-server-seeded'), {
        id: 'mov-server-seeded',
        inventoryId: zeroInventory.id,
        sku: zeroInventory.sku,
        locationId: zeroInventory.locationId,
        movementType: 'PURCHASE_RECEIPT',
        quantityDelta: 1,
        quantityBefore: 0,
        quantityAfter: 1,
        performedBy: 'staff-inv-1',
        timestamp,
      });
    });
    await assertFails(updateDoc(doc(staff, 'inventory_movements', 'mov-server-seeded'), { reason: 'tampered' }));
    await assertFails(deleteDoc(doc(staff, 'inventory_movements', 'mov-server-seeded')));
  });

  it('rejects unauthenticated inventory and movement writes', async () => {
    const unauth = env.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(unauth, 'inventory', 'inv-unauth'), zeroInventory));
    await assertFails(setDoc(doc(unauth, 'inventory_movements', 'mov-unauth'), { id: 'mov-unauth' }));
  });

  it('rejects foreign-tenant inventory access', async () => {
    const foreign = env.authenticatedContext('foreign-1', {
      role: 'Inventory Manager',
      tenantId: 'foreign-enterprise',
    }).firestore();
    await assertFails(getDoc(doc(foreign, 'inventory', zeroInventory.id)));
    await assertFails(updateDoc(doc(foreign, 'inventory', zeroInventory.id), { quantityOnHand: 1 }));
  });

  it('preserves the public product projection boundary', async () => {
    const publicDb = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(publicDb, 'public_products', 'prod-inv-002')));
    await assertFails(updateDoc(doc(publicDb, 'public_products', 'prod-inv-002'), {
      availability: { status: 'IN_STOCK' },
    }));
  });

  it('enforces SERIAL and BATCH invariants for zero-balance client-created records', async () => {
    const staff = env.authenticatedContext('staff-inv-1', {
      role: 'Inventory Manager',
      tenantId: 'nexus-enterprise',
    }).firestore();

    await assertSucceeds(setDoc(doc(staff, 'inventory', 'inv-serial-zero'), {
      ...zeroInventory,
      id: 'inv-serial-zero',
      sku: 'SERIAL-1',
      trackingMode: 'SERIAL',
      serialNumbers: [],
    }));

    await assertSucceeds(setDoc(doc(staff, 'inventory', 'inv-batch-zero'), {
      ...zeroInventory,
      id: 'inv-batch-zero',
      sku: 'BATCH-1',
      trackingMode: 'BATCH',
      batchNumber: 'LOT-001',
      expiryDate: '2027-12-31T00:00:00.000Z',
    }));

    await assertFails(setDoc(doc(staff, 'inventory', 'inv-batch-invalid'), {
      ...zeroInventory,
      id: 'inv-batch-invalid',
      sku: 'BATCH-2',
      trackingMode: 'BATCH',
      batchNumber: '',
    }));
  });
});
