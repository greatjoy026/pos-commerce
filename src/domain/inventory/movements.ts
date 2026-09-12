import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from '../../lib/firebase';
import type { InventoryMovementRecord, InventoryMovementType, InventoryRecord } from './types';
import { InventoryDomainError } from './validation';

export interface InventoryMovementRequest { inventoryId: string; operationId: string; quantity: number; referenceId?: string; reason?: string; }
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
function validateMovementRequest(request: InventoryMovementRequest): void { assertPositiveInteger(request.quantity, 'quantity'); assertOperationId(request.operationId); assertOptionalString(request.referenceId, 'referenceId'); assertOptionalString(request.reason, 'reason', 1000); assertActor(); }
export function recordPurchaseReceipt(request: InventoryMovementRequest): Promise<InventoryMovementResult> { validateMovementRequest(request); return call('recordInventoryPurchaseReceipt', request); }
export function recordSale(request: InventoryMovementRequest): Promise<InventoryMovementResult> { validateMovementRequest(request); return call('recordInventorySale', request); }
export function recordReturn(request: InventoryMovementRequest): Promise<InventoryMovementResult> { validateMovementRequest(request); return call('recordInventoryReturn', request); }
export function recordAdjustment(request: InventoryAdjustmentRequest): Promise<InventoryMovementResult> { assertNonZeroInteger(request.quantityDelta); assertOperationId(request.operationId); assertOptionalString(request.referenceId, 'referenceId'); assertOptionalString(request.reason, 'reason', 1000); assertActor(); return call('recordInventoryAdjustment', request); }
export function recordTransfer(request: InventoryTransferRequest): Promise<InventoryTransferResult> { assertPositiveInteger(request.quantity, 'quantity'); assertOperationId(request.operationId); assertOptionalString(request.referenceId, 'referenceId'); assertOptionalString(request.reason, 'reason', 1000); assertActor(); if (request.sourceInventoryId === request.destinationInventoryId) fail('Source and destination inventory records must be different', 'destinationInventoryId', 'INVARIANT_VIOLATION'); return call('recordInventoryTransfer', request); }

export interface CalculateMovementParams { movementType: InventoryMovementType; quantityParam?: number; performedBy: string; referenceId?: string; reason?: string; movementId?: string; timestamp?: string; }
export interface MovementOutcome { updatedRecord: InventoryRecord; movementRecord: InventoryMovementRecord; }

/** Pure calculation only. It performs no persistence; authoritative writes belong to the trusted Functions boundary. */
export function calculateMovementOutcome(record: InventoryRecord, params: CalculateMovementParams): MovementOutcome {
  const raw = params.quantityParam ?? 1;
  if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw === 0) throw new InventoryDomainError('quantityParam must be a non-zero finite integer', [{ field: 'quantityParam', message: 'quantityParam must be a non-zero finite integer', code: 'OUT_OF_RANGE' }]);
  const delta = params.movementType === 'SALE' ? -Math.abs(raw) : params.movementType === 'PURCHASE_RECEIPT' || params.movementType === 'RETURN' ? Math.abs(raw) : raw;
  const available = record.quantityOnHand - record.quantityReserved;
  if (delta < 0 && Math.abs(delta) > available) throw new InventoryDomainError('Insufficient available inventory', [{ field: 'quantityParam', message: 'Movement exceeds available inventory', code: 'OUT_OF_RANGE' }]);
  const quantityAfter = record.quantityOnHand + delta;
  if (!Number.isInteger(quantityAfter) || quantityAfter < 0) throw new InventoryDomainError('Inventory quantity cannot become negative or fractional', [{ field: 'quantityAfter', message: 'Invalid resulting inventory quantity', code: 'INVARIANT_VIOLATION' }]);
  const timestamp = params.timestamp ?? new Date().toISOString();
  return {
    updatedRecord: { ...record, quantityOnHand: quantityAfter, updatedAt: timestamp },
    movementRecord: {
      id: params.movementId ?? `${record.id}-${params.movementType}-${Date.now()}`,
      inventoryId: record.id, sku: record.sku, productId: record.productId, variantId: record.variantId, locationId: record.locationId,
      movementType: params.movementType, quantityDelta: delta, quantityBefore: record.quantityOnHand, quantityAfter,
      referenceId: params.referenceId, performedBy: params.performedBy, timestamp, reason: params.reason
    }
  };
}

export interface InventoryMovementValidationResult { isValid: boolean; errors: Array<{ field: string; message: string; code: InventoryErrorCode }>; record?: InventoryMovementRecord; }
export function validateInventoryMovementRecord(input: unknown): InventoryMovementValidationResult {
  const errors: InventoryMovementValidationResult['errors'] = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { isValid: false, errors: [{ field: 'root', message: 'Movement record must be an object', code: 'INVALID_TYPE' }] };
  const raw = input as Record<string, unknown>;
  for (const field of ['id','inventoryId','sku','productId','locationId','performedBy','timestamp']) if (typeof raw[field] !== 'string' || !(raw[field] as string).trim()) errors.push({ field, message: `${field} is required`, code: 'REQUIRED' });
  if (typeof raw.movementType !== 'string' || !(['PURCHASE_RECEIPT','SALE','RETURN','ADJUSTMENT','TRANSFER'] as string[]).includes(raw.movementType)) errors.push({ field: 'movementType', message: 'Invalid movementType', code: 'INVALID_TYPE' });
  for (const field of ['quantityDelta','quantityBefore','quantityAfter']) if (typeof raw[field] !== 'number' || !Number.isFinite(raw[field]) || !Number.isInteger(raw[field])) errors.push({ field, message: `${field} must be a finite integer`, code: 'INVALID_TYPE' });
  if (errors.length) return { isValid: false, errors };
  const record: InventoryMovementRecord = { id: raw.id as string, inventoryId: raw.inventoryId as string, sku: raw.sku as string, productId: raw.productId as string, variantId: raw.variantId as string | undefined, locationId: raw.locationId as string, movementType: raw.movementType as InventoryMovementType, quantityDelta: raw.quantityDelta as number, quantityBefore: raw.quantityBefore as number, quantityAfter: raw.quantityAfter as number, referenceId: raw.referenceId as string | undefined, performedBy: raw.performedBy as string, timestamp: raw.timestamp as string, reason: raw.reason as string | undefined };
  if (record.quantityAfter !== record.quantityBefore + record.quantityDelta) errors.push({ field: 'quantityAfter', message: 'quantityAfter must equal quantityBefore + quantityDelta', code: 'INVARIANT_VIOLATION' });
  return errors.length ? { isValid: false, errors } : { isValid: true, errors: [], record };
}
export function assertValidInventoryMovementRecord(input: unknown): InventoryMovementRecord { const result = validateInventoryMovementRecord(input); if (!result.isValid || !result.record) throw new InventoryDomainError('Invalid inventory movement record', result.errors); return result.record; }

export type { InventoryMovementType };
