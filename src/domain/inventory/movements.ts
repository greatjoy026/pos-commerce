import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from '../../lib/firebase';
import { calculateAvailableQuantity, type InventoryMovementRecord, type InventoryMovementType, type InventoryRecord } from './types';
import { InventoryDomainError } from './validation';

export interface CalculateMovementParams {
  movementType: InventoryMovementType;
  quantityParam: number;
  performedBy: string;
  referenceId?: string;
  reason?: string;
  serialNumbers?: string[];
  movementId?: string;
  timestamp?: string;
}

export interface MovementOutcome {
  updatedRecord: InventoryRecord;
  movementRecord: InventoryMovementRecord;
}

export function calculateMovementOutcome(
  record: InventoryRecord,
  params: CalculateMovementParams
): MovementOutcome {
  if (!params.performedBy || typeof params.performedBy !== 'string' || params.performedBy.trim().length === 0) {
    throw new InventoryDomainError('performedBy is required and must be a non-empty string', [
      { field: 'performedBy', message: 'performedBy is required', code: 'REQUIRED' }
    ]);
  }

  const { movementType, quantityParam, performedBy, referenceId, reason, serialNumbers, movementId, timestamp } = params;
  let quantityDelta = 0;

  if (movementType === 'PURCHASE_RECEIPT' || movementType === 'SALE' || movementType === 'RETURN') {
    if (typeof quantityParam !== 'number' || !Number.isFinite(quantityParam) || !Number.isInteger(quantityParam) || quantityParam <= 0) {
      throw new InventoryDomainError(`${movementType} quantityParam must be a valid finite integer strictly positive`, [
        { field: 'quantityParam', message: `${movementType} quantityParam must be a valid finite integer strictly positive`, code: 'OUT_OF_RANGE' }
      ]);
    }
    quantityDelta = movementType === 'SALE' ? -quantityParam : quantityParam;
  } else if (movementType === 'ADJUSTMENT') {
    if (typeof quantityParam !== 'number' || !Number.isFinite(quantityParam) || !Number.isInteger(quantityParam) || quantityParam === 0) {
      throw new InventoryDomainError('ADJUSTMENT quantityParam cannot be zero and must be a non-zero finite integer', [
        { field: 'quantityParam', message: 'quantityParam cannot be zero', code: 'OUT_OF_RANGE' }
      ]);
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new InventoryDomainError('ADJUSTMENT requires a non-empty reason', [
        { field: 'reason', message: 'ADJUSTMENT requires a non-empty reason', code: 'REQUIRED' }
      ]);
    }
    quantityDelta = quantityParam;
  } else if (movementType === 'TRANSFER') {
    if (typeof quantityParam !== 'number' || !Number.isFinite(quantityParam) || !Number.isInteger(quantityParam) || quantityParam === 0) {
      throw new InventoryDomainError('TRANSFER quantityParam must be a non-zero finite integer', [
        { field: 'quantityParam', message: 'quantityParam cannot be zero', code: 'OUT_OF_RANGE' }
      ]);
    }
    quantityDelta = quantityParam;
  } else {
    throw new InventoryDomainError(`Invalid movementType: ${String(movementType)}`, [
      { field: 'movementType', message: 'Invalid movementType', code: 'INVALID_ENUM' }
    ]);
  }

  const newQuantityOnHand = record.quantityOnHand + quantityDelta;
  if (!Number.isFinite(newQuantityOnHand) || !Number.isInteger(newQuantityOnHand) || newQuantityOnHand < 0) {
    throw new InventoryDomainError(`INSUFFICIENT_STOCK: Movement outcome would result in negative quantityOnHand (${newQuantityOnHand})`, [
      { field: 'quantityOnHand', message: 'quantityOnHand cannot be negative', code: 'OUT_OF_RANGE' }
    ]);
  }

  if (quantityDelta < 0) {
    const requiredReduction = Math.abs(quantityDelta);
    const available = calculateAvailableQuantity(record);
    if (requiredReduction > available) {
      throw new InventoryDomainError(`INSUFFICIENT_INVENTORY: Insufficient available inventory (${available}) for reduction (${requiredReduction})`, [
        { field: 'quantityOnHand', message: 'Insufficient available inventory', code: 'INVARIANT_VIOLATION' }
      ]);
    }
  }

  let updatedSerials: string[] | undefined = record.serialNumbers ? [...record.serialNumbers] : undefined;

  if (record.trackingMode === 'SERIAL') {
    if (!Array.isArray(serialNumbers)) {
      throw new InventoryDomainError('SERIAL inventory movement requires serialNumbers array', [
        { field: 'serialNumbers', message: 'serialNumbers required for SERIAL trackingMode', code: 'REQUIRED' }
      ]);
    }
    const targetCount = Math.abs(quantityDelta);
    if (serialNumbers.length !== targetCount) {
      throw new InventoryDomainError(`serialNumbers count (${serialNumbers.length}) must match quantity delta magnitude (${targetCount})`, [
        { field: 'serialNumbers', message: 'serialNumbers count mismatch', code: 'INVARIANT_VIOLATION' }
      ]);
    }

    if (quantityDelta > 0) {
      const currentSet = new Set((updatedSerials || []).map(s => s.toUpperCase()));
      for (const sn of serialNumbers) {
        if (currentSet.has(sn.trim().toUpperCase())) {
          throw new InventoryDomainError(`Serial number '${sn}' already exists in inventory`, [
            { field: 'serialNumbers', message: `Serial ${sn} already exists`, code: 'INVARIANT_VIOLATION' }
          ]);
        }
      }
      updatedSerials = [...(updatedSerials || []), ...serialNumbers.map(s => s.trim())];
    } else {
      const currentList = updatedSerials || [];
      for (const sn of serialNumbers) {
        const index = currentList.findIndex(existing => existing.toUpperCase() === sn.trim().toUpperCase());
        if (index === -1) {
          throw new InventoryDomainError(`Serial number '${sn}' not found in inventory`, [
            { field: 'serialNumbers', message: `Serial number '${sn}' not found in inventory`, code: 'INVARIANT_VIOLATION' }
          ]);
        }
        currentList.splice(index, 1);
      }
      updatedSerials = currentList;
    }
  }

  const now = timestamp || new Date().toISOString();
  const id = movementId || `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const movementRecord: InventoryMovementRecord = {
    id,
    inventoryId: record.id,
    sku: record.sku,
    productId: record.productId,
    variantId: record.variantId,
    locationId: record.locationId,
    movementType,
    quantityDelta,
    quantityBefore: record.quantityOnHand,
    quantityAfter: newQuantityOnHand,
    referenceId: referenceId?.trim() || undefined,
    performedBy: performedBy.trim(),
    timestamp: now,
    reason: reason?.trim() || undefined
  };

  const updatedRecord: InventoryRecord = {
    ...record,
    quantityOnHand: newQuantityOnHand,
    serialNumbers: updatedSerials,
    updatedAt: now
  };

  return { updatedRecord, movementRecord };
}

export interface InventoryMovementRequest {
  inventoryId: string;
  operationId: string;
  quantity: number;
  referenceId?: string;
  reason?: string;
}
export interface InventoryAdjustmentRequest extends Omit<InventoryMovementRequest, 'quantity'> { quantityDelta: number; }
export interface InventoryTransferRequest { sourceInventoryId: string; destinationInventoryId: string; operationId: string; quantity: number; referenceId?: string; reason?: string; }
export interface InventoryMovementResult { movement: InventoryMovementRecord; inventory: InventoryRecord; }
export interface InventoryTransferResult { outboundMovement: InventoryMovementRecord; inboundMovement: InventoryMovementRecord; sourceInventory: InventoryRecord; destinationInventory: InventoryRecord; }

type InventoryErrorCode = 'REQUIRED' | 'INVALID_TYPE' | 'OUT_OF_RANGE' | 'INVARIANT_VIOLATION';
const OPERATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

function fail(message: string, field: string, code: InventoryErrorCode): never { throw new InventoryDomainError(message, [{ field, message, code }]); }
function assertPositiveInteger(value: number, field: string): void { if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) fail(`${field} must be a positive integer`, field, 'OUT_OF_RANGE'); }
function assertNonZeroInteger(value: number): void { if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value === 0) fail('quantityDelta must be a non-zero finite integer', 'quantityDelta', 'OUT_OF_RANGE'); }
function assertOperationId(value: string): void { if (typeof value !== 'string' || !OPERATION_ID_PATTERN.test(value)) fail('Invalid operationId', 'operationId', 'INVALID_TYPE'); }
function assertOptionalString(value: string | undefined, field: string, max = 128): void { if (value !== undefined && (typeof value !== 'string' || value.trim().length === 0 || value.length > max)) fail(`Invalid ${field}`, field, 'INVALID_TYPE'); }
function assertActor(): void { if (!auth.currentUser?.uid) fail('An authenticated staff actor is required for inventory movement', 'performedBy', 'REQUIRED'); }

const functions = getFunctions(app);
const call = <TRequest, TResult>(name: string, request: TRequest) => httpsCallable<TRequest, TResult>(functions, name)(request).then(result => result.data);

function validateMovementRequest(request: InventoryMovementRequest): void {
  assertPositiveInteger(request.quantity, 'quantity'); assertOperationId(request.operationId); assertOptionalString(request.referenceId, 'referenceId'); assertOptionalString(request.reason, 'reason', 1000); assertActor();
}

export function recordPurchaseReceipt(request: InventoryMovementRequest): Promise<InventoryMovementResult> {
  validateMovementRequest(request);
  return call('recordInventoryPurchaseReceipt', request);
}
export function recordSale(request: InventoryMovementRequest): Promise<InventoryMovementResult> {
  validateMovementRequest(request);
  return call('recordInventorySale', request);
}
export function recordReturn(request: InventoryMovementRequest): Promise<InventoryMovementResult> {
  validateMovementRequest(request);
  return call('recordInventoryReturn', request);
}
export function recordAdjustment(request: InventoryAdjustmentRequest): Promise<InventoryMovementResult> {
  assertNonZeroInteger(request.quantityDelta); assertOperationId(request.operationId); assertOptionalString(request.referenceId, 'referenceId'); assertOptionalString(request.reason, 'reason', 1000); assertActor();
  return call('recordInventoryAdjustment', request);
}
export function recordTransfer(request: InventoryTransferRequest): Promise<InventoryTransferResult> {
  assertPositiveInteger(request.quantity, 'quantity'); assertOperationId(request.operationId); assertOptionalString(request.referenceId, 'referenceId'); assertOptionalString(request.reason, 'reason', 1000); assertActor();
  if (request.sourceInventoryId === request.destinationInventoryId) fail('Source and destination inventory records must be different', 'destinationInventoryId', 'INVARIANT_VIOLATION');
  return call('recordInventoryTransfer', request);
}

export type { InventoryMovementType };
