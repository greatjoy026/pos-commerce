import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type DocumentData } from 'firebase-admin/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { calculateAvailableQuantity, type InventoryMovementRecord, type InventoryRecord } from '../../src/domain/inventory/types';
import { validateInventoryRecord } from '../../src/domain/inventory/validation';
import { buildInventoryRecordId } from '../../src/domain/inventory/adapters';
import type { RecordPosSaleRequest, RecordPosSaleResult, PosSaleLineResult } from '../../src/domain/pos/inventoryResolution';

const adminApp = getApps().length > 0 ? getApp() : initializeApp();
const db = getFirestore(adminApp, process.env.FIRESTORE_DATABASE_ID || 'ai-studio-nexusposcommerce-d2deaf29-88c9-4563-a26f-04f5e6504d77');
const MOVEMENTS = 'inventory_movements';
const INVENTORY = 'inventory';
const OPERATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

const POS_STAFF_ROLES = new Set([
  'Super Admin', 'Business Owner', 'Store Manager', 'Admin', 'Manager',
  'Inventory Manager', 'Warehouse Manager', 'Purchasing Officer', 'Cashier',
  'Sales Associate', 'Sales Manager'
]);

function fail(message: string, code: 'invalid-argument' | 'failed-precondition' | 'not-found' = 'invalid-argument'): never {
  throw new HttpsError(code, message);
}

function assertPositiveInteger(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    fail(`${field} must be a positive integer`);
  }
}

function assertString(value: unknown, field: string, max = 128): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) {
    fail(`Invalid ${field}`);
  }
}

function assertOperationId(value: unknown): asserts value is string {
  assertString(value, 'operationId', 100);
  if (!OPERATION_ID_PATTERN.test(value)) {
    fail('Invalid operationId format');
  }
}

async function getPosStaffActor(request: CallableRequest<unknown>): Promise<string> {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'An authenticated staff actor is required for POS sale processing');
  }
  if (auth.token.tenantId !== undefined && auth.token.tenantId !== 'nexus-enterprise') {
    throw new HttpsError('permission-denied', 'Invalid enterprise scope');
  }
  if (auth.token.admin === true || auth.token.isSuperAdmin === true || (typeof auth.token.role === 'string' && POS_STAFF_ROLES.has(auth.token.role))) {
    return auth.uid;
  }
  const staff = await db.doc(`staff/${auth.uid}`).get();
  const role = staff.exists ? staff.data()?.role : undefined;
  if (typeof role !== 'string' || !POS_STAFF_ROLES.has(role)) {
    throw new HttpsError('permission-denied', 'POS staff authorization required');
  }
  return auth.uid;
}

function movementId(operationId: string): string {
  return `mov_${operationId}`;
}

function parseInventory(data: DocumentData | undefined, id: string): InventoryRecord {
  const result = validateInventoryRecord({ ...(data ?? {}), id });
  if (!result.isValid || !result.record) {
    throw new HttpsError('failed-precondition', `Stored inventory record ${id} is invalid`);
  }
  return result.record;
}

function assertAvailable(record: InventoryRecord, quantity: number): void {
  const available = calculateAvailableQuantity(record);
  if (quantity > available) {
    throw new HttpsError('failed-precondition', `Insufficient stock for SKU ${record.sku}: only ${available} unit(s) available, requested ${quantity}`);
  }
}

function assertSerialMovementSupported(record: InventoryRecord): void {
  if (record.trackingMode === 'SERIAL') {
    throw new HttpsError('failed-precondition', 'SERIAL inventory mutations require serial lifecycle engine');
  }
}

/**
 * Executes an atomic multi-line POS sale transaction.
 */
export const recordPosSale = onCall<RecordPosSaleRequest>(async request => {
  const actor = await getPosStaffActor(request);
  const data = request.data;

  if (!data || typeof data !== 'object') {
    fail('Invalid POS sale request payload');
  }

  assertString(data.orderId, 'orderId');
  assertString(data.storeLocationId, 'storeLocationId');
  if (!Array.isArray(data.lines)) {
    fail('lines must be an array of POS sale items');
  }

  // If no physical inventory lines (e.g., custom/service items only), return early success
  if (data.lines.length === 0) {
    return {
      orderId: data.orderId,
      success: true,
      lineResults: [],
      timestamp: new Date().toISOString()
    };
  }

  // Validate all lines prior to entering database transaction
  data.lines.forEach((line, idx) => {
    assertString(line.sku, `lines[${idx}].sku`);
    assertString(line.locationId, `lines[${idx}].locationId`);
    assertPositiveInteger(line.quantity, `lines[${idx}].quantity`);
    assertOperationId(line.operationId);
  });

  return db.runTransaction(async tx => {
    const lineResults: PosSaleLineResult[] = [];

    // Phase 1: Fetch all target inventory records & existing movement docs
    const reads = await Promise.all(data.lines.map(async line => {
      const invId = line.inventoryId || buildInventoryRecordId(line.sku, line.locationId);
      const inventoryRef = db.doc(`${INVENTORY}/${invId}`);
      const movementRef = db.doc(`${MOVEMENTS}/${movementId(line.operationId)}`);

      const [invSnap, movSnap] = await Promise.all([
        tx.get(inventoryRef),
        tx.get(movementRef)
      ]);

      return {
        line,
        inventoryRef,
        movementRef,
        invSnap,
        movSnap
      };
    }));

    // Phase 2: Validate state & construct mutations
    const updates: Array<{
      inventoryRef: any;
      updatedInventory: InventoryRecord;
      movementRef: any;
      movement: InventoryMovementRecord;
      lineResult: PosSaleLineResult;
    }> = [];

    for (const item of reads) {
      const { line, inventoryRef, movementRef, invSnap, movSnap } = item;

      if (!invSnap.exists) {
        throw new HttpsError('not-found', `Inventory record not found for SKU ${line.sku} at location ${line.locationId}`);
      }

      const inventory = parseInventory(invSnap.data(), invSnap.id);
      assertSerialMovementSupported(inventory);

      // Check Idempotency: If operationId movement already exists
      if (movSnap.exists) {
        const existingMov = movSnap.data() as InventoryMovementRecord;
        if (existingMov.referenceId === data.orderId && existingMov.quantityDelta === -line.quantity) {
          lineResults.push({
            operationId: line.operationId,
            movementId: existingMov.id,
            inventoryId: inventory.id,
            sku: inventory.sku,
            quantityBefore: existingMov.quantityBefore,
            quantityAfter: existingMov.quantityAfter
          });
          continue; // Already processed idempotently
        } else {
          throw new HttpsError('already-exists', `Operation ID ${line.operationId} was previously used for a different movement`);
        }
      }

      // Assert stock availability
      assertAvailable(inventory, line.quantity);

      const quantityAfter = inventory.quantityOnHand - line.quantity;
      const now = new Date().toISOString();

      const movement: InventoryMovementRecord = {
        id: movementRef.id,
        inventoryId: inventory.id,
        productId: inventory.productId,
        sku: inventory.sku,
        locationId: inventory.locationId,
        movementType: 'SALE',
        quantityDelta: -line.quantity,
        quantityBefore: inventory.quantityOnHand,
        quantityAfter,
        referenceId: data.orderId,
        performedBy: actor,
        timestamp: now,
        reason: `POS Sale Order ${data.orderId}`
      };

      const updatedInventory: InventoryRecord = {
        ...inventory,
        quantityOnHand: quantityAfter,
        updatedAt: now
      };

      const validation = validateInventoryRecord(updatedInventory);
      if (!validation.isValid) {
        throw new HttpsError('failed-precondition', `POS sale for SKU ${line.sku} violates inventory invariants: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      updates.push({
        inventoryRef,
        updatedInventory,
        movementRef,
        movement,
        lineResult: {
          operationId: line.operationId,
          movementId: movement.id,
          inventoryId: inventory.id,
          sku: inventory.sku,
          quantityBefore: inventory.quantityOnHand,
          quantityAfter
        }
      });
    }

    // Phase 3: Commit atomic updates to Firestore
    for (const u of updates) {
      tx.update(u.inventoryRef, {
        quantityOnHand: u.updatedInventory.quantityOnHand,
        updatedAt: u.updatedInventory.updatedAt
      });
      tx.create(u.movementRef, u.movement);
      lineResults.push(u.lineResult);
    }

    return {
      orderId: data.orderId,
      success: true,
      lineResults,
      timestamp: new Date().toISOString()
    };
  });
});
