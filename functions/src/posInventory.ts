import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type DocumentData } from 'firebase-admin/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { calculateAvailableQuantity, type InventoryMovementRecord, type InventoryRecord } from '../../src/domain/inventory/types';
import { validateInventoryRecord } from '../../src/domain/inventory/validation';

const adminApp = getApps().length > 0 ? getApp() : initializeApp();
const db = getFirestore(adminApp, process.env.FIRESTORE_DATABASE_ID || 'ai-studio-nexusposcommerce-d2deaf29-88c9-4563-a26f-04f5e6504d77');
const INVENTORY = 'inventory';
const MOVEMENTS = 'inventory_movements';
const OPERATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const POS_ROLES = new Set(['Super Admin','Business Owner','Store Manager','Admin','Manager','Cashier','Sales Associate']);

interface PosSaleLine { sku: string; productId: string; variantId?: string; locationId: string; quantity: number; operationId: string; }
interface PosSaleRequest { orderId: string; lines: PosSaleLine[]; }
interface PosSaleLineResult { operationId: string; inventoryId: string; sku: string; quantity: number; quantityBefore: number; quantityAfter: number; availableQuantityAfter: number; movementId: string; }

function fail(message: string, code: 'invalid-argument' | 'failed-precondition' = 'invalid-argument'): never { throw new HttpsError(code, message); }
function assertString(value: unknown, field: string, max = 128): asserts value is string { if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) fail(`Invalid ${field}`); }
function assertPositiveInteger(value: unknown, field: string): asserts value is number { if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) fail(`${field} must be a positive integer`); }
function assertOperationId(value: unknown): asserts value is string { assertString(value, 'operationId', 100); if (!OPERATION_ID_PATTERN.test(value)) fail('Invalid operationId'); }
function assertOrderId(value: unknown): asserts value is string { assertString(value, 'orderId', 128); if (!/^[A-Za-z0-9_-]+$/.test(value)) fail('Invalid orderId'); }

async function getStaffActor(request: CallableRequest<unknown>): Promise<string> {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'An authenticated POS staff actor is required');
  if (auth.token.tenantId !== undefined && auth.token.tenantId !== 'nexus-enterprise') throw new HttpsError('permission-denied', 'Invalid enterprise scope');
  if (auth.token.admin === true || auth.token.isSuperAdmin === true || (typeof auth.token.role === 'string' && POS_ROLES.has(auth.token.role))) return auth.uid;
  const staff = await db.doc(`staff/${auth.uid}`).get();
  const role = staff.exists ? staff.data()?.role : undefined;
  if (typeof role !== 'string' || !POS_ROLES.has(role)) throw new HttpsError('permission-denied', 'POS staff authorization required');
  return auth.uid;
}

function parseInventory(data: DocumentData | undefined, id: string): InventoryRecord {
  const result = validateInventoryRecord({ ...(data ?? {}), id });
  if (!result.isValid || !result.record) throw new HttpsError('failed-precondition', `Stored inventory record ${id} is invalid`);
  return result.record;
}
function movementId(operationId: string): string { return `mov_${operationId}`; }
function sameMovement(existing: InventoryMovementRecord, expected: InventoryMovementRecord): boolean {
  return existing.inventoryId === expected.inventoryId && existing.movementType === expected.movementType && existing.quantityDelta === expected.quantityDelta && existing.performedBy === expected.performedBy && existing.referenceId === expected.referenceId;
}

/** Trusted POS sale boundary: the browser supplies SKU/product identity and quantity, never an inventory document ID or balance. */
export const recordPosSale = onCall<PosSaleRequest>(async (request) => {
  const actor = await getStaffActor(request);
  const data = request.data;
  if (!data || typeof data !== 'object') fail('Invalid POS sale request');
  assertOrderId(data.orderId);
  if (!Array.isArray(data.lines) || data.lines.length === 0 || data.lines.length > 100) fail('POS sale must contain between 1 and 100 lines');

  const lines = data.lines.map((line, index) => {
    if (!line || typeof line !== 'object') fail(`Invalid sale line ${index}`);
    assertString(line.sku, `lines[${index}].sku`, 128);
    assertString(line.productId, `lines[${index}].productId`, 128);
    assertString(line.locationId, `lines[${index}].locationId`, 128);
    assertPositiveInteger(line.quantity, `lines[${index}].quantity`);
    assertOperationId(line.operationId);
    if (line.variantId !== undefined) assertString(line.variantId, `lines[${index}].variantId`, 128);
    return line as PosSaleLine;
  });
  const operationIds = new Set<string>();
  for (const line of lines) { if (operationIds.has(line.operationId)) fail('Duplicate operationId in POS sale'); operationIds.add(line.operationId); }

  return db.runTransaction(async (tx) => {
    const results: PosSaleLineResult[] = [];
    for (const line of lines) {
      const inventoryQuery = db.collection(INVENTORY).where('sku', '==', line.sku).where('locationId', '==', line.locationId).limit(2);
      const inventorySnap = await tx.get(inventoryQuery);
      if (inventorySnap.empty) throw new HttpsError('not-found', `No inventory record exists for SKU ${line.sku} at ${line.locationId}`);
      if (inventorySnap.size !== 1) throw new HttpsError('failed-precondition', `Inventory resolution for SKU ${line.sku} is ambiguous`);
      const inventorySnapDoc = inventorySnap.docs[0];
      const inventory = parseInventory(inventorySnapDoc.data(), inventorySnapDoc.id);
      if (inventory.productId !== line.productId) throw new HttpsError('failed-precondition', `SKU ${line.sku} is not bound to the requested product`);
      if (line.variantId !== undefined && inventory.variantId !== line.variantId) throw new HttpsError('failed-precondition', `SKU ${line.sku} is not bound to the requested variant`);
      if (inventory.status !== 'ACTIVE') throw new HttpsError('failed-precondition', `Inventory for SKU ${line.sku} is inactive`);
      if (inventory.trackingMode === 'SERIAL' || inventory.trackingMode === 'BATCH') throw new HttpsError('failed-precondition', `${inventory.trackingMode} inventory requires its dedicated POS lifecycle engine`);
      if (inventory.trackingMode === 'NONE') {
        results.push({ operationId: line.operationId, inventoryId: inventory.id, sku: inventory.sku, quantity: 0, quantityBefore: inventory.quantityOnHand, quantityAfter: inventory.quantityOnHand, availableQuantityAfter: calculateAvailableQuantity(inventory), movementId: '' });
        continue;
      }
      const available = calculateAvailableQuantity(inventory);
      if (line.quantity > available) throw new HttpsError('failed-precondition', `Only ${available} units are available for SKU ${line.sku}`);
      const movementRef = db.doc(`${MOVEMENTS}/${movementId(line.operationId)}`);
      const existingSnap = await tx.get(movementRef);
      const expectedAfter = inventory.quantityOnHand - line.quantity;
      const expectedMovement: InventoryMovementRecord = { id: movementRef.id, inventoryId: inventory.id, sku: inventory.sku, locationId: inventory.locationId, movementType: 'SALE', quantityDelta: -line.quantity, quantityBefore: inventory.quantityOnHand, quantityAfter: expectedAfter, referenceId: data.orderId, performedBy: actor, timestamp: new Date().toISOString() };
      if (existingSnap.exists) {
        const existing = existingSnap.data() as InventoryMovementRecord;
        if (!sameMovement(existing, expectedMovement)) throw new HttpsError('already-exists', `operationId ${line.operationId} has already been used for another sale`);
        const availableAfter = calculateAvailableQuantity({ quantityOnHand: existing.quantityAfter, quantityReserved: inventory.quantityReserved });
        results.push({ operationId: line.operationId, inventoryId: inventory.id, sku: inventory.sku, quantity: line.quantity, quantityBefore: existing.quantityBefore, quantityAfter: existing.quantityAfter, availableQuantityAfter: availableAfter, movementId: existing.id });
        continue;
      }
      const updated: InventoryRecord = { ...inventory, quantityOnHand: expectedAfter, updatedAt: new Date().toISOString() };
      if (!validateInventoryRecord(updated).isValid) throw new HttpsError('failed-precondition', `Sale violates inventory invariants for SKU ${line.sku}`);
      tx.update(inventorySnapDoc.ref, { quantityOnHand: updated.quantityOnHand, updatedAt: updated.updatedAt });
      tx.create(movementRef, expectedMovement);
      results.push({ operationId: line.operationId, inventoryId: inventory.id, sku: inventory.sku, quantity: line.quantity, quantityBefore: inventory.quantityOnHand, quantityAfter: updated.quantityOnHand, availableQuantityAfter: calculateAvailableQuantity(updated), movementId: movementRef.id });
    }
    return { orderId: data.orderId, actorId: actor, lines: results };
  });
});
