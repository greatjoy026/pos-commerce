import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { initializeTestEnvironment, assertFails, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { setDoc, updateDoc, doc } from 'firebase/firestore';

const PROJECT_ID = 'nexus-pos-commerce-test';
const inventory = {
  id: 'inv-sec-1', sku: 'SEC-1', productId: 'prod-sec-1', locationId: 'loc-main-store',
  quantityOnHand: 10, quantityReserved: 0, trackingMode: 'QUANTITY', status: 'ACTIVE',
  createdAt: '2026-09-11T00:00:00.000Z', updatedAt: '2026-09-11T00:00:00.000Z'
};

describe('INV-002-F1 — trusted inventory mutation boundary', () => {
  let env: RulesTestEnvironment;
  before(async () => {
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 }
    });
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'inventory', inventory.id), inventory);
    });
  });
  after(async () => { await env.cleanup(); });

  it('rejects client creation of movement records even for inventory staff', async () => {
    const staff = env.authenticatedContext('staff-inv-1', { role: 'Inventory Manager', tenantId: 'nexus-enterprise' }).firestore();
    await assertFails(setDoc(doc(staff, 'inventory_movements', 'mov-forged'), {
      id: 'mov-forged', inventoryId: inventory.id, sku: 'SEC-1', locationId: 'loc-main-store',
      movementType: 'SALE', quantityDelta: -1, quantityBefore: 10, quantityAfter: 9,
      performedBy: 'staff-inv-1', timestamp: '2026-09-11T00:00:00.000Z'
    }));
  });

  it('rejects direct inventory balance mutation by inventory staff', async () => {
    const staff = env.authenticatedContext('staff-inv-1', { role: 'Inventory Manager', tenantId: 'nexus-enterprise' }).firestore();
    await assertFails(updateDoc(doc(staff, 'inventory', inventory.id), { quantityOnHand: 999 }));
  });

  it('rejects unauthenticated movement creation', async () => {
    const unauth = env.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(unauth, 'inventory_movements', 'mov-unauth'), { id: 'mov-unauth' }));
  });
});
