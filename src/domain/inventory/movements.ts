import { doc, runTransaction, type DocumentData, type Firestore, type Transaction } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { calculateAvailableQuantity, type InventoryMovementRecord, type InventoryMovementType, type InventoryRecord } from './types';
import { InventoryDomainError, validateInventoryRecord } from './validation';

export interface InventoryMovementRequest {
  inventoryId: string;
  operationId: string;
  quantity: number;
  referenceId?: string;
  reason?: string;
}

export interface InventoryAdjustmentRequest extends Omit<InventoryMovementRequest, 'quantity'> { quantityDelta: number; }
export interface InventoryTransferRequest {
  sourceInventoryId: string;
  destinationInventoryId: string;
  operationId: string;
  quantity: number;
  referenceId?: string;
  reason?: string;
}
export interface InventoryMovementResult { movement: InventoryMovementRecord; inventory: InventoryRecord; }
export interface InventoryTransferResult {
  outboundMovement: InventoryMovementRecord;
  inboundMovement: InventoryMovementRecord;
  sourceInventory: InventoryRecord;
  destinationInventory: InventoryRecord;
}

const MOVEMENT_TYPES: readonly InventoryMovementType[] = ['PURCHASE_RECEIPT','SALE','RETURN','ADJUSTMENT','TRANSFER'];
const OPERATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

type NonTransferMovement = Exclude<InventoryMovementType, 'TRANSFER'>;

function fail(message: string, field: string, code: string): never {
  throw new InventoryDomainError(message, [{ field, message, code }]);
}
function assertPositiveInteger(value: number, field: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) fail(`${field} must be a positive integer`, field, 'OUT_OF_RANGE');
}
function assertIntegerDelta(value: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value === 0) fail('quantityDelta must be a non-zero finite integer', 'quantityDelta', 'OUT_OF_RANGE');
}
function assertOperationId(value: string): void {
  if (typeof value !== 'string' || !OPERATION_ID_PATTERN.test(value)) fail('Invalid operationId', 'operationId', 'INVALID_TYPE');
}
function assertOptionalString(value: string | undefined, field: string): void {
  if (value !== undefined && (typeof value !== 'string' || value.trim().length === 0 || value.length > 128)) fail(`Invalid ${field}`, field, 'INVALID_TYPE');
}
function assertMovementType(value: InventoryMovementType): void {
  if (!MOVEMENT_TYPES.includes(value)) fail(`Unsupported inventory movement type: ${value}`, 'movementType', 'INVALID_ENUM');
}
function movementId(operationId: string, suffix = ''): string { assertOperationId(operationId); return `mov_${operationId}${suffix}`; }
function actorUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) fail('An authenticated staff actor is required for inventory movement', 'performedBy', 'REQUIRED');
  return uid;
}
function parseInventory(data: DocumentData, id: string): InventoryRecord {
  const result = validateInventoryRecord({ ...data, id });
  if (!result.isValid || !result.record) throw new InventoryDomainError(`Stored inventory record ${id} is invalid`, result.errors);
  return result.record;
}
function assertAvailable(record: InventoryRecord, quantity: number): void {
  const available = calculateAvailableQuantity(record);
  if (quantity > available) fail(`Requested ${quantity} but only ${available} units are available`, 'quantity', 'OUT_OF_RANGE');
}
function buildMovement(id: string, inventory: InventoryRecord, movementType: InventoryMovementType, delta: number, actor: string, referenceId?: string, reason?: string): InventoryMovementRecord {
  assertMovementType(movementType); assertIntegerDelta(delta);
  const after = inventory.quantityOnHand + delta;
  if (!Number.isInteger(after) || after < 0) fail('Inventory movement would produce an invalid balance', 'quantityAfter', 'INVARIANT_VIOLATION');
  if (movementType === 'ADJUSTMENT' && !reason?.trim()) fail('An adjustment requires a reason', 'reason', 'REQUIRED');
  return { id, inventoryId: inventory.id, sku: inventory.sku, locationId: inventory.locationId, movementType, quantityDelta: delta, quantityBefore: inventory.quantityOnHand, quantityAfter: after, referenceId: referenceId?.trim() || undefined, performedBy: actor, timestamp: new Date().toISOString(), reason: reason?.trim() || undefined };
}
function assertExisting(existing: InventoryMovementRecord, expected: Pick<InventoryMovementRecord,'inventoryId'|'movementType'|'quantityDelta'|'performedBy'>): void {
  if (existing.inventoryId !== expected.inventoryId || existing.movementType !== expected.movementType || existing.quantityDelta !== expected.quantityDelta || existing.performedBy !== expected.performedBy) fail('operationId has already been used for a different inventory operation', 'operationId', 'INVARIANT_VIOLATION');
}

async function runMovement(firestore: Firestore, request: InventoryMovementRequest, movementType: NonTransferMovement, delta: number): Promise<InventoryMovementResult> {
  assertPositiveInteger(request.quantity, 'quantity'); assertOperationId(request.operationId); assertOptionalString(request.referenceId,'referenceId'); assertOptionalString(request.reason,'reason');
  const actor = actorUid();
  const movementRef = doc(firestore, 'inventory_movements', movementId(request.operationId));
  const inventoryRef = doc(firestore, 'inventory', request.inventoryId);
  return runTransaction(firestore, async (tx: Transaction) => {
    const existingSnap = await tx.get(movementRef);
    if (existingSnap.exists()) {
      const existing = existingSnap.data() as InventoryMovementRecord;
      assertExisting(existing, { inventoryId: request.inventoryId, movementType, quantityDelta: delta, performedBy: actor });
      const current = await tx.get(inventoryRef);
      if (!current.exists()) fail('Inventory record not found', 'inventoryId', 'REQUIRED');
      return { movement: existing, inventory: parseInventory(current.data(), current.id) };
    }
    const current = await tx.get(inventoryRef);
    if (!current.exists()) fail('Inventory record not found', 'inventoryId', 'REQUIRED');
    const inventory = parseInventory(current.data(), current.id);
    if (movementType === 'SALE') assertAvailable(inventory, request.quantity);
    const movement = buildMovement(movementId(request.operationId), inventory, movementType, delta, actor, request.referenceId, request.reason);
    const updated: InventoryRecord = { ...inventory, quantityOnHand: movement.quantityAfter, updatedAt: new Date().toISOString() };
    const validation = validateInventoryRecord(updated);
    if (!validation.isValid) throw new InventoryDomainError('Inventory movement would violate inventory invariants', validation.errors);
    tx.set(inventoryRef, updated);
    tx.set(movementRef, movement);
    return { movement, inventory: updated };
  });
}

export function recordPurchaseReceipt(request: InventoryMovementRequest, firestore: Firestore = db): Promise<InventoryMovementResult> { return runMovement(firestore, request, 'PURCHASE_RECEIPT', request.quantity); }
export function recordSale(request: InventoryMovementRequest, firestore: Firestore = db): Promise<InventoryMovementResult> { return runMovement(firestore, request, 'SALE', -request.quantity); }
export function recordReturn(request: InventoryMovementRequest, firestore: Firestore = db): Promise<InventoryMovementResult> { return runMovement(firestore, request, 'RETURN', request.quantity); }
export function recordAdjustment(request: InventoryAdjustmentRequest, firestore: Firestore = db): Promise<InventoryMovementResult> { assertIntegerDelta(request.quantityDelta); return runMovement(firestore, { ...request, quantity: Math.abs(request.quantityDelta) }, 'ADJUSTMENT', request.quantityDelta); }

export async function recordTransfer(request: InventoryTransferRequest, firestore: Firestore = db): Promise<InventoryTransferResult> {
  assertPositiveInteger(request.quantity,'quantity'); assertOperationId(request.operationId); assertOptionalString(request.referenceId,'referenceId'); assertOptionalString(request.reason,'reason');
  if (request.sourceInventoryId === request.destinationInventoryId) fail('Source and destination inventory records must be different','destinationInventoryId','INVARIANT_VIOLATION');
  const actor = actorUid();
  const sourceRef = doc(firestore,'inventory',request.sourceInventoryId);
  const destinationRef = doc(firestore,'inventory',request.destinationInventoryId);
  const outboundRef = doc(firestore,'inventory_movements',movementId(request.operationId,'_out'));
  const inboundRef = doc(firestore,'inventory_movements',movementId(request.operationId,'_in'));
  return runTransaction(firestore, async (tx: Transaction) => {
    const outboundSnap = await tx.get(outboundRef); const inboundSnap = await tx.get(inboundRef);
    const sourceSnap = await tx.get(sourceRef); const destinationSnap = await tx.get(destinationRef);
    if (outboundSnap.exists() || inboundSnap.exists()) {
      if (!outboundSnap.exists() || !inboundSnap.exists()) fail('Transfer idempotency state is incomplete','operationId','INVARIANT_VIOLATION');
      const outbound = outboundSnap.data() as InventoryMovementRecord; const inbound = inboundSnap.data() as InventoryMovementRecord;
      assertExisting(outbound,{inventoryId:request.sourceInventoryId,movementType:'TRANSFER',quantityDelta:-request.quantity,performedBy:actor});
      assertExisting(inbound,{inventoryId:request.destinationInventoryId,movementType:'TRANSFER',quantityDelta:request.quantity,performedBy:actor});
      if (!sourceSnap.exists() || !destinationSnap.exists()) fail('Transfer inventory record not found','inventoryId','REQUIRED');
      return { outboundMovement: outbound, inboundMovement: inbound, sourceInventory: parseInventory(sourceSnap.data(),sourceSnap.id), destinationInventory: parseInventory(destinationSnap.data(),destinationSnap.id) };
    }
    if (!sourceSnap.exists() || !destinationSnap.exists()) fail('Transfer inventory record not found','inventoryId','REQUIRED');
    const source = parseInventory(sourceSnap.data(),sourceSnap.id); const destination = parseInventory(destinationSnap.data(),destinationSnap.id);
    assertAvailable(source,request.quantity);
    const outbound = buildMovement(movementId(request.operationId,'_out'),source,'TRANSFER',-request.quantity,actor,request.referenceId,request.reason);
    const inbound = buildMovement(movementId(request.operationId,'_in'),destination,'TRANSFER',request.quantity,actor,request.referenceId,request.reason);
    const updatedSource: InventoryRecord = {...source,quantityOnHand:outbound.quantityAfter,updatedAt:new Date().toISOString()};
    const updatedDestination: InventoryRecord = {...destination,quantityOnHand:inbound.quantityAfter,updatedAt:new Date().toISOString()};
    const sourceValidation = validateInventoryRecord(updatedSource); const destinationValidation = validateInventoryRecord(updatedDestination);
    if (!sourceValidation.isValid || !destinationValidation.isValid) throw new InventoryDomainError('Transfer would violate inventory invariants',[...sourceValidation.errors,...destinationValidation.errors]);
    tx.set(sourceRef,updatedSource); tx.set(destinationRef,updatedDestination); tx.set(outboundRef,outbound); tx.set(inboundRef,inbound);
    return {outboundMovement:outbound,inboundMovement:inbound,sourceInventory:updatedSource,destinationInventory:updatedDestination};
  });
}
