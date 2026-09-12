import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type DocumentData } from 'firebase-admin/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { calculateAvailableQuantity, type InventoryMovementRecord, type InventoryMovementType, type InventoryRecord } from '../../src/domain/inventory/types';
import { validateInventoryRecord } from '../../src/domain/inventory/validation';

const adminApp = getApps().length > 0 ? getApp() : initializeApp();
const db = getFirestore(adminApp, process.env.FIRESTORE_DATABASE_ID || 'ai-studio-nexusposcommerce-d2deaf29-88c9-4563-a26f-04f5e6504d77');
const MOVEMENTS = 'inventory_movements';
const INVENTORY = 'inventory';
const OPERATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const INVENTORY_ROLES = new Set(['Super Admin','Business Owner','Store Manager','Admin','Manager','Inventory Manager','Warehouse Manager','Purchasing Officer']);

type NonTransferMovement = Exclude<InventoryMovementType, 'TRANSFER'>;
interface MovementRequest { inventoryId: string; operationId: string; quantity?: number; quantityDelta?: number; referenceId?: string; reason?: string; }
interface TransferRequest { sourceInventoryId: string; destinationInventoryId: string; operationId: string; quantity: number; referenceId?: string; reason?: string; }
interface MovementResult { movement: InventoryMovementRecord; inventory: InventoryRecord; }

function fail(message: string, code: 'invalid-argument' | 'failed-precondition' = 'invalid-argument'): never { throw new HttpsError(code, message); }
function assertPositiveInteger(value: unknown, field: string): asserts value is number { if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) fail(`${field} must be a positive integer`); }
function assertNonZeroInteger(value: unknown): asserts value is number { if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value === 0) fail('quantityDelta must be a non-zero integer'); }
function assertString(value: unknown, field: string, max = 128): asserts value is string { if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) fail(`Invalid ${field}`); }
function assertOptionalString(value: unknown, field: string, max = 128): void { if (value !== undefined && (typeof value !== 'string' || value.trim().length === 0 || value.length > max)) fail(`Invalid ${field}`); }
function assertOperationId(value: unknown): asserts value is string { assertString(value, 'operationId', 100); if (!OPERATION_ID_PATTERN.test(value)) fail('Invalid operationId'); }
async function getStaffActor(request: CallableRequest<unknown>): Promise<string> {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'An authenticated staff actor is required');
  if (auth.token.tenantId !== undefined && auth.token.tenantId !== 'nexus-enterprise') throw new HttpsError('permission-denied', 'Invalid enterprise scope');
  if (auth.token.admin === true || auth.token.isSuperAdmin === true || (typeof auth.token.role === 'string' && INVENTORY_ROLES.has(auth.token.role))) return auth.uid;
  const staff = await db.doc(`staff/${auth.uid}`).get();
  const role = staff.exists ? staff.data()?.role : undefined;
  if (typeof role !== 'string' || !INVENTORY_ROLES.has(role)) throw new HttpsError('permission-denied', 'Inventory staff authorization required');
  return auth.uid;
}
function movementId(operationId: string, suffix = ''): string { return `mov_${operationId}${suffix}`; }
function parseInventory(data: DocumentData | undefined, id: string): InventoryRecord { const result = validateInventoryRecord({ ...(data ?? {}), id }); if (!result.isValid || !result.record) throw new HttpsError('failed-precondition', `Stored inventory record ${id} is invalid`); return result.record; }
function assertAvailable(record: InventoryRecord, quantity: number): void { const available = calculateAvailableQuantity(record); if (quantity > available) throw new HttpsError('failed-precondition', `Only ${available} units are available`); }
function assertSerialMovementSupported(record: InventoryRecord): void { if (record.trackingMode === 'SERIAL') throw new HttpsError('failed-precondition', 'SERIAL inventory mutations require the future serial lifecycle engine'); }
function buildMovement(id: string, inventory: InventoryRecord, movementType: InventoryMovementType, delta: number, actor: string, referenceId?: string, reason?: string): InventoryMovementRecord { const after = inventory.quantityOnHand + delta; if (!Number.isInteger(after) || after < 0) throw new HttpsError('failed-precondition', 'Movement would produce an invalid balance'); if (movementType === 'ADJUSTMENT' && !reason?.trim()) throw new HttpsError('invalid-argument', 'An adjustment requires a reason'); return { id, inventoryId: inventory.id, sku: inventory.sku, locationId: inventory.locationId, movementType, quantityDelta: delta, quantityBefore: inventory.quantityOnHand, quantityAfter: after, referenceId: referenceId?.trim() || undefined, performedBy: actor, timestamp: new Date().toISOString(), reason: reason?.trim() || undefined }; }
function assertExisting(existing: InventoryMovementRecord, expected: InventoryMovementRecord): void { const same = existing.inventoryId === expected.inventoryId && existing.movementType === expected.movementType && existing.quantityDelta === expected.quantityDelta && existing.performedBy === expected.performedBy && existing.referenceId === expected.referenceId && existing.reason === expected.reason; if (!same) throw new HttpsError('already-exists', 'operationId has already been used for a different operation'); }
async function executeMovement(request: CallableRequest<MovementRequest>, movementType: NonTransferMovement): Promise<MovementResult> {
  const actor = await getStaffActor(request); const data = request.data;
  if (!data || typeof data !== 'object') fail('Invalid movement request');
  assertString(data.inventoryId, 'inventoryId'); assertOperationId(data.operationId); assertOptionalString(data.referenceId, 'referenceId'); assertOptionalString(data.reason, 'reason', 1000);
  let delta: number;
  let quantity: number | undefined;
  if (movementType === 'ADJUSTMENT') { assertNonZeroInteger(data.quantityDelta); delta = data.quantityDelta; }
  else { assertPositiveInteger(data.quantity, 'quantity'); quantity = data.quantity; delta = movementType === 'SALE' ? -quantity : quantity; }
  const movementRef = db.doc(`${MOVEMENTS}/${movementId(data.operationId)}`); const inventoryRef = db.doc(`${INVENTORY}/${data.inventoryId}`);
  return db.runTransaction(async tx => {
    const existingSnap = await tx.get(movementRef); const inventorySnap = await tx.get(inventoryRef);
    if (!inventorySnap.exists) throw new HttpsError('not-found', 'Inventory record not found');
    const inventory = parseInventory(inventorySnap.data(), inventorySnap.id);
    assertSerialMovementSupported(inventory);
    const candidate = buildMovement(movementRef.id, inventory, movementType, delta, actor, data.referenceId, data.reason);
    if (existingSnap.exists) { const existing = existingSnap.data() as InventoryMovementRecord; assertExisting(existing, candidate); return { movement: existing, inventory }; }
    if (movementType === 'SALE') assertAvailable(inventory, quantity!);
    const movement = candidate;
    const updated: InventoryRecord = { ...inventory, quantityOnHand: movement.quantityAfter, updatedAt: new Date().toISOString() };
    if (!validateInventoryRecord(updated).isValid) throw new HttpsError('failed-precondition', 'Movement violates inventory invariants');
    tx.update(inventoryRef, { quantityOnHand: updated.quantityOnHand, updatedAt: updated.updatedAt });
    tx.create(movementRef, movement);
    return { movement, inventory: updated };
  });
}
export const recordInventoryPurchaseReceipt = onCall<MovementRequest>(async request => executeMovement(request, 'PURCHASE_RECEIPT'));
export const recordInventorySale = onCall<MovementRequest>(async request => executeMovement(request, 'SALE'));
export const recordInventoryReturn = onCall<MovementRequest>(async request => executeMovement(request, 'RETURN'));
export const recordInventoryAdjustment = onCall<MovementRequest>(async request => executeMovement(request, 'ADJUSTMENT'));
export const recordInventoryTransfer = onCall<TransferRequest>(async request => {
  const actor = await getStaffActor(request); const data = request.data;
  if (!data || typeof data !== 'object') fail('Invalid transfer request');
  assertString(data.sourceInventoryId, 'sourceInventoryId'); assertString(data.destinationInventoryId, 'destinationInventoryId'); assertOperationId(data.operationId); assertPositiveInteger(data.quantity, 'quantity'); assertOptionalString(data.referenceId, 'referenceId'); assertOptionalString(data.reason, 'reason', 1000);
  if (data.sourceInventoryId === data.destinationInventoryId) fail('Source and destination must differ');
  const quantity = data.quantity;
  const sourceRef = db.doc(`${INVENTORY}/${data.sourceInventoryId}`); const destinationRef = db.doc(`${INVENTORY}/${data.destinationInventoryId}`); const outboundRef = db.doc(`${MOVEMENTS}/${movementId(data.operationId, '_out')}`); const inboundRef = db.doc(`${MOVEMENTS}/${movementId(data.operationId, '_in')}`);
  return db.runTransaction(async tx => {
    const outboundSnap = await tx.get(outboundRef); const inboundSnap = await tx.get(inboundRef); const sourceSnap = await tx.get(sourceRef); const destinationSnap = await tx.get(destinationRef);
    if (!sourceSnap.exists || !destinationSnap.exists) throw new HttpsError('not-found', 'Transfer inventory record not found');
    const source = parseInventory(sourceSnap.data(), sourceSnap.id); const destination = parseInventory(destinationSnap.data(), destinationSnap.id);
    assertSerialMovementSupported(source); assertSerialMovementSupported(destination);
    if (outboundSnap.exists || inboundSnap.exists) { if (!outboundSnap.exists || !inboundSnap.exists) throw new HttpsError('already-exists', 'Transfer idempotency state is incomplete'); const outbound = outboundSnap.data() as InventoryMovementRecord; const inbound = inboundSnap.data() as InventoryMovementRecord; assertExisting(outbound, buildMovement(outbound.id, source, 'TRANSFER', -quantity, actor, data.referenceId, data.reason)); assertExisting(inbound, buildMovement(inbound.id, destination, 'TRANSFER', quantity, actor, data.referenceId, data.reason)); return { outboundMovement: outbound, inboundMovement: inbound, sourceInventory: source, destinationInventory: destination }; }
    assertAvailable(source, quantity);
    const outbound = buildMovement(outboundRef.id, source, 'TRANSFER', -quantity, actor, data.referenceId, data.reason); const inbound = buildMovement(inboundRef.id, destination, 'TRANSFER', quantity, actor, data.referenceId, data.reason);
    const updatedSource: InventoryRecord = { ...source, quantityOnHand: outbound.quantityAfter, updatedAt: new Date().toISOString() }; const updatedDestination: InventoryRecord = { ...destination, quantityOnHand: inbound.quantityAfter, updatedAt: new Date().toISOString() };
    if (!validateInventoryRecord(updatedSource).isValid || !validateInventoryRecord(updatedDestination).isValid) throw new HttpsError('failed-precondition', 'Transfer violates inventory invariants');
    tx.update(sourceRef, { quantityOnHand: updatedSource.quantityOnHand, updatedAt: updatedSource.updatedAt }); tx.update(destinationRef, { quantityOnHand: updatedDestination.quantityOnHand, updatedAt: updatedDestination.updatedAt }); tx.create(outboundRef, outbound); tx.create(inboundRef, inbound);
    return { outboundMovement: outbound, inboundMovement: inbound, sourceInventory: updatedSource, destinationInventory: updatedDestination };
  });
});
