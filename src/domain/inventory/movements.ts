import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from '../../lib/firebase';
import type { InventoryMovementRecord, InventoryMovementType, InventoryRecord } from './types';
import { InventoryDomainError } from './validation';

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
