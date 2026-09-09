import {
  doc,
  runTransaction,
  type DocumentData,
  type Firestore,
  type Transaction,
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { calculateAvailableQuantity, InventoryMovementRecord, InventoryMovementType, InventoryRecord } from './types';
import { validateInventoryRecord, InventoryDomainError } from './validation';

export interface InventoryMovementRequest {
  inventoryId: string;
  operationId: string;
  quantity: number;
  referenceId?: string;
  reason?: string;
}

export interface InventoryAdjustmentRequest extends Omit<InventoryMovementRequest, 'quantity'> {
  quantityDelta: number;
}

export interface InventoryTransferRequest {
  sourceInventoryId: string;
  destinationInventoryId: string;
  operationId: string;
  quantity: number;
  referenceId?: string;
  reason?: string;
}

export interface InventoryMovementResult {
  movement: InventoryMovementRecord;
  inventory: InventoryRecord;
}

export interface InventoryTransferResult {
  outboundMovement: InventoryMovementRecord;
  inboundMovement: InventoryMovementRecord;
  sourceInventory: InventoryRecord;
  destinationInventory: InventoryRecord;
}

const MOVEMENT_TYPES: readonly InventoryMovementType[] = [
  'PURCHASE_RECEIPT',
  'SALE',
  'RETURN',
  'ADJUSTMENT',
  'TRANSFER',
];

const OPERATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

function assertPositiveInteger(value: number, field: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new InventoryDomainError(`${field} must be a positive integer`, [
      { field, message: `${field} must be a positive integer`, code: 'OUT_OF_RANGE' },
    ]);
  }
}

function assertIntegerDelta(value: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value === 0) {
    throw new InventoryDomainError('quantityDelta must be a non-zero finite integer', [
      { field: 'quantityDelta', message: 'quantityDelta must be a non-zero finite integer', code: 'OUT_OF_RANGE' },
    ]);
  }
}

function assertOperationId(operationId: string): void {
  if (typeof operationId !== 'string' || !OPERATION_ID_PATTERN.test(operationId)) {
    throw new InventoryDomainError('operationId must contain only letters, numbers, underscores, or hyphens and be 1-100 characters', [
      { field: 'operationId', message: 'Invalid operationId', code: 'INVALID_TYPE' },
    ]);
  }
}

function assertMovementType(type: InventoryMovementType): void {
  if (!MOVEMENT_TYPES.includes(type)) {
    throw new InventoryDomainError(`Unsupported inventory movement type: ${type}`, [
      { field: 'movementType', message: 'Unsupported inventory movement type', code: 'INVALID_ENUM' },
    ]);
  }
}

function getMovementId(operationId: string, suffix = ''): string {
  assertOperationId(operationId);
  return `mov_${operationId}${suffix}`;
}

function movementDocIdFor(type: InventoryMovementType, operationId: string): string {
  return getMovementId(operationId, type === 'TRANSFER' ? '' : '');
}

function requireActor(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new InventoryDomainError('An authenticated staff actor is required for inventory movement', [
      { field: 'performedBy', message: 'Authenticated user is required', code: 'REQUIRED' },
    ]);
  }
  return uid;
}

function assertReference(value: string | undefined, field: string): void {
  if (value !== undefined && (typeof value !== 'string' || value.trim().length === 0 || value.length > 128)) {
    throw new InventoryDomainError(`${field} must be a non-empty string of at most 128 characters when provided`, [
      { field, message: `Invalid ${field}`, code: 'INVALID_TYPE' },
    ]);
  }
}

function parseInventory(snapshot: DocumentData, id: string): InventoryRecord {
  const result = validateInventoryRecord({ ...snapshot, id });
  if (!result.isValid || !result.record) {
    throw new InventoryDomainError(`Stored inventory record ${id} is invalid`, result.errors);
  }
  return result.record;
}

function assertAvailableForSale(record: InventoryRecord, quantity: number): void {
  const available = calculateAvailableQuantity(record);
  if (quantity > available) {
    throw new InventoryDomainError('Insufficient inventory', [
      {
        field: 'quantity',
        message: `Requested ${quantity} but only ${available} units are available`,
        code: 'OUT_OF_RANGE',
      },
    ]);
  }
}

function buildMovement(
  id: string,
  inventory: InventoryRecord,
  movementType: InventoryMovementType,
  quantityDelta: number,
  actor: string,
  referenceId?: string,
  reason?: string,
): InventoryMovementRecord {
  assertMovementType(movementType);
  assertIntegerDelta(quantityDelta);

  const quantityAfter = inventory.quantityOnHand + quantityDelta;
  if (!Number.isInteger(quantityAfter) || quantityAfter < 0) {
    throw new InventoryDomainError('Inventory movement would produce an invalid balance', [
      { field: 'quantityAfter', message: 'Inventory quantity cannot become negative or non-integer', code: 'INVARIANT_VIOLATION' },
    ]);
  }

  if (movementType === 'ADJUSTMENT' && (!reason || reason.trim().length === 0)) {
    throw new InventoryDomainError('An adjustment requires a reason', [
      { field: 'reason', message: 'Adjustment reason is required', code: 'REQUIRED' },
    ]);
  }

  const movement: InventoryMovementRecord = {
    id,
    inventoryId: inventory.id,
    sku: inventory.sku,
    locationId: inventory.locationId,
    movementType,
    quantityDelta,
    quantityBefore: inventory.quantityOnHand,
    quantityAfter,
    referenceId: referenceId?.trim() || undefined,
    performedBy: actor,
    timestamp: new Date().toISOString(),
    reason: reason?.trim() || undefined,
  };

  return movement;
}

function assertExistingMovementMatches(
  existing: InventoryMovementRecord,
  expected: Pick<InventoryMovementRecord, 'inventoryId' | 'movementType' | 'quantityDelta' | 'performedBy'>,
): void {
  if (
    existing.inventoryId !== expected.inventoryId ||
    existing.movementType !== expected.movementType ||
    existing.quantityDelta !== expected.quantityDelta ||
    existing.performedBy !== expected.performedBy
  ) {
    throw new InventoryDomainError('operationId has already been used for a different inventory operation', [
      { field: 'operationId', message: 'Idempotency conflict', code: 'INVARIANT_VIOLATION' },
    ]);
  }
}

async function runMovement(
  firestore: Firestore,
  request: InventoryMovementRequest,
  movementType: Exclude<InventoryMovementType, 'TRANSFER'>,
  quantityDelta: number,
): Promise<InventoryMovementResult> {
  assertPositiveInteger(request.quantity, 'quantity');
  assertOperationId(request.operationId);
  assertReference(request.referenceId, 'referenceId');
  assertReference(request.reason, 'reason');
  const actor = requireActor();
  const movementId = movementDocIdFor(movementType, request.operationId);
  const movementRef = doc(firestore, 'inventory_movements', movementId);
  const inventoryRef = doc(firestore, 'inventory', request.inventoryId);

  return runTransaction(firestore, async (transaction: Transaction) => {
    const movementSnap = await transaction.get(movementRef);
    if (movementSnap.exists()) {
      const existing = movementSnap.data() as InventoryMovementRecord;
      assertExistingMovementMatches(existing, {
        inventoryId: request.inventoryId,
        movementType,
        quantityDelta,
        performedBy: actor,
      });
      const inventorySnap = await transaction.get(inventoryRef);
      if (!inventorySnap.exists()) {
        throw new InventoryDomainError('Inventory record referenced by idempotent movement no longer exists', [
          { field: 'inventoryId', message: 'Inventory record not found', code: 'REQUIRED' },
        ]);
      }
      return { movement: existing, inventory: parseInventory(inventorySnap.data(), inventorySnap.id) };
    }

    const inventorySnap = await transaction.get(inventoryRef);
    if (!inventorySnap.exists()) {
      throw new InventoryDomainError('Inventory record not found', [
        { field: 'inventoryId', message: 'Inventory record not found', code: 'REQUIRED' },
      ]);
    }

    const inventory = parseInventory(inventorySnap.data(), inventorySnap.id);
    if (movementType === 'SALE') {
      assertAvailableForSale(inventory, request.quantity);
    }

    const movement = buildMovement(
      movementId,
      inventory,
      movementType,
      quantityDelta,
      actor,
      request.referenceId,
      request.reason,
    );

    const updatedInventory: InventoryRecord = {
      ...inventory,
      quantityOnHand: movement.quantityAfter,
      updatedAt: new Date().toISOString(),
    };

    const validation = validateInventoryRecord(updatedInventory);
    if (!validation.isValid) {
      throw new InventoryDomainError('Inventory movement would violate inventory invariants', validation.errors);
    }

    transaction.set(inventoryRef, updatedInventory);
    transaction.create(movementRef, movement);
    return { movement, inventory: updatedInventory };
  });
}

export function recordPurchaseReceipt(request: InventoryMovementRequest, firestore: Firestore = db): Promise<InventoryMovementResult> {
  return runMovement(firestore, request, 'PURCHASE_RECEIPT', request.quantity);
}

export function recordSale(request: InventoryMovementRequest, firestore: Firestore = db): Promise<InventoryMovementResult> {
  return runMovement(firestore, request, 'SALE', -request.quantity);
}

export function recordReturn(request: InventoryMovementRequest, firestore: Firestore = db): Promise<InventoryMovementResult> {
  return runMovement(firestore, request, 'RETURN', request.quantity);
}

export function recordAdjustment(request: InventoryAdjustmentRequest, firestore: Firestore = db): Promise<InventoryMovementResult> {
  assertIntegerDelta(request.quantityDelta);
  const magnitude = Math.abs(request.quantityDelta);
  return runMovement(firestore, { ...request, quantity: magnitude }, 'ADJUSTMENT', request.quantityDelta);
}

export async function recordTransfer(
  request: InventoryTransferRequest,
  firestore: Firestore = db,
): Promise<InventoryTransferResult> {
  assertPositiveInteger(request.quantity, 'quantity');
  assertOperationId(request.operationId);
  assertReference(request.referenceId, 'referenceId');
  assertReference(request.reason, 'reason');
  if (request.sourceInventoryId === request.destinationInventoryId) {
    throw new InventoryDomainError('Source and destination inventory records must be different', [
      { field: 'destinationInventoryId', message: 'Transfer endpoints must differ', code: 'INVARIANT_VIOLATION' },
    ]);
  }

  const actor = requireActor();
  const outboundRef = doc(firestore, 'inventory_movements', getMovementId(request.operationId, '_out'));
  const inboundRef = doc(firestore, 'inventory_movements', getMovementId(request.operationId, '_in'));
  const sourceRef = doc(firestore, 'inventory', request.sourceInventoryId);
  const destinationRef = doc(firestore, 'inventory', request.destinationInventoryId);

  return runTransaction(firestore, async (transaction: Transaction) => {
    const [outboundSnap, inboundSnap, sourceSnap, destinationSnap] = await Promise.all([
      transaction.get(outboundRef),
      transaction.get(inboundRef),
      transaction.get(sourceRef),
      transaction.get(destinationRef),
    ]);

    if (outboundSnap.exists() || inboundSnap.exists()) {
      if (!outboundSnap.exists() || !inboundSnap.exists()) {
        throw new InventoryDomainError('Transfer idempotency state is incomplete', [
          { field: 'operationId', message: 'Transfer has only one movement leg; manual reconciliation is required', code: 'INVARIANT_VIOLATION' },
        ]);
      }
      const outbound = outboundSnap.data() as InventoryMovementRecord;
      const inbound = inboundSnap.data() as InventoryMovementRecord;
      assertExistingMovementMatches(outbound, {
        inventoryId: request.sourceInventoryId,
        movementType: 'TRANSFER',
        quantityDelta: -request.quantity,
        performedBy: actor,
      });
      assertExistingMovementMatches(inbound, {
        inventoryId: request.destinationInventoryId,
        movementType: 'TRANSFER',
        quantityDelta: request.quantity,
        performedBy: actor,
      });
      if (!sourceSnap.exists() || !destinationSnap.exists()) {
        throw new InventoryDomainError('Transfer inventory record not found', [
          { field: 'inventoryId', message: 'Transfer inventory record not found', code: 'REQUIRED' },
        ]);
      }
      return {
        outboundMovement: outbound,
        inboundMovement: inbound,
        sourceInventory: parseInventory(sourceSnap.data(), sourceSnap.id),
        destinationInventory: parseInventory(destinationSnap.data(), destinationSnap.id),
      };
    }

    if (!sourceSnap.exists() || !destinationSnap.exists()) {
      throw new InventoryDomainError('Transfer inventory record not found', [
        { field: 'inventoryId', message: 'Transfer inventory record not found', code: 'REQUIRED' },
      ]);
    }

    const source = parseInventory(sourceSnap.data(), sourceSnap.id);
    const destination = parseInventory(destinationSnap.data(), destinationSnap.id);
    assertAvailableForSale(source, request.quantity);

    const outbound = buildMovement(
      getMovementId(request.operationId, '_out'),
      source,
      'TRANSFER',
      -request.quantity,
      actor,
      request.referenceId,
      request.reason,
    );
    const inbound = buildMovement(
      getMovementId(request.operationId, '_in'),
      destination,
      'TRANSFER',
      request.quantity,
      actor,
      request.referenceId,
      request.reason,
    );

    const updatedSource: InventoryRecord = {
      ...source,
      quantityOnHand: outbound.quantityAfter,
      updatedAt: new Date().toISOString(),
    };
    const updatedDestination: InventoryRecord = {
      ...destination,
      quantityOnHand: inbound.quantityAfter,
      updatedAt: new Date().toISOString(),
    };

    const sourceValidation = validateInventoryRecord(updatedSource);
    const destinationValidation = validateInventoryRecord(updatedDestination);
    if (!sourceValidation.isValid || !destinationValidation.isValid) {
      throw new InventoryDomainError('Transfer would violate inventory invariants', [
        ...sourceValidation.errors,
        ...destinationValidation.errors,
      ]);
    }

    transaction.set(sourceRef, updatedSource);
    transaction.set(destinationRef, updatedDestination);
    transaction.create(outboundRef, outbound);
    transaction.create(inboundRef, inbound);

    return {
      outboundMovement: outbound,
      inboundMovement: inbound,
      sourceInventory: updatedSource,
      destinationInventory: updatedDestination,
    };
  });
}
