/**
 * Authoritative Inventory Transaction Service (INV-002)
 *
 * Executes atomic inventory balance mutations and writes immutable movement records via Firestore transactions.
 */

import {
  runTransaction,
  doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS, handleFirestoreError, OperationType } from './dbService';
import {
  InventoryRecord,
  InventoryMovementRecord
} from '../domain/inventory/types';
import {
  calculateMovementOutcome,
  CalculateMovementParams
} from '../domain/inventory/movements';
import {
  validateInventoryRecord,
  InventoryDomainError
} from '../domain/inventory/validation';

export interface ExecuteMovementRequest extends CalculateMovementParams {
  inventoryId: string;
}

export interface ExecuteTransferRequest {
  sourceInventoryId: string;
  destinationInventoryId: string;
  quantity: number;
  performedBy: string;
  referenceId?: string;
  reason?: string;
  sourceMovementId?: string;
  destinationMovementId?: string;
  timestamp?: string;
}

export interface TransferOutcome {
  sourceInventoryRecord: InventoryRecord;
  destinationInventoryRecord: InventoryRecord;
  sourceMovementRecord: InventoryMovementRecord;
  destinationMovementRecord: InventoryMovementRecord;
}

export interface MovementTransactionOutcome {
  updatedRecord: InventoryRecord;
  movementRecord: InventoryMovementRecord;
}

/**
 * Executes a single inventory balance mutation atomically inside a Firestore transaction.
 *
 * Atomicity Invariant:
 * 1. Reads current InventoryRecord document inside transaction.
 * 2. Checks idempotency (verifies movement ID does not already exist).
 * 3. Calculates domain movement outcome (enforces non-negative balances, discrete integers, available stock).
 * 4. Writes updated InventoryRecord to `/inventory/{inventoryId}`.
 * 5. Writes immutable InventoryMovementRecord to `/inventory_movements/{movementId}`.
 * If any step fails or invariant is violated, transaction aborts completely with no balance change.
 */
export async function executeInventoryMovement(
  request: ExecuteMovementRequest
): Promise<MovementTransactionOutcome> {
  const { inventoryId } = request;
  if (!inventoryId || typeof inventoryId !== 'string' || inventoryId.trim().length === 0) {
    throw new InventoryDomainError('inventoryId is required for movement execution', [
      { field: 'inventoryId', message: 'inventoryId is required', code: 'REQUIRED' }
    ]);
  }

  const cleanInventoryId = inventoryId.trim();

  try {
    const outcome = await runTransaction(db, async (transaction) => {
      const invRef = doc(db, COLLECTIONS.INVENTORY, cleanInventoryId);
      const invSnap = await transaction.get(invRef);

      if (!invSnap.exists()) {
        throw new InventoryDomainError(`InventoryRecord not found: ${cleanInventoryId}`, [
          { field: 'inventoryId', message: `InventoryRecord not found for id ${cleanInventoryId}`, code: 'OUT_OF_RANGE' }
        ]);
      }

      const val = validateInventoryRecord(invSnap.data());
      if (!val.isValid || !val.record) {
        throw new InventoryDomainError(`Stored inventory record ${cleanInventoryId} is invalid`, val.errors);
      }

      const currentRecord = val.record;

      // Compute domain outcome
      const outcome = calculateMovementOutcome(currentRecord, request);

      // Check idempotency if movementId is provided
      const movRef = doc(db, 'inventory_movements', outcome.movementRecord.id);
      const movSnap = await transaction.get(movRef);
      if (movSnap.exists()) {
        throw new InventoryDomainError(`Movement record with id ${outcome.movementRecord.id} already exists`, [
          { field: 'movementId', message: 'Duplicate movement ID (idempotency check)', code: 'INVARIANT_VIOLATION' }
        ]);
      }

      // Write updated inventory record
      transaction.set(invRef, outcome.updatedRecord);

      // Write immutable movement record
      transaction.set(movRef, outcome.movementRecord);

      return outcome;
    });

    return outcome;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.INVENTORY}/${cleanInventoryId}`);
    throw error;
  }
}

/**
 * Executes an atomic inventory transfer between source and destination locations.
 *
 * Atomicity Invariant:
 * Both source deduction (delta < 0) and destination addition (delta > 0) are evaluated,
 * validated, and saved in a SINGLE Firestore transaction.
 */
export async function executeInventoryTransfer(
  request: ExecuteTransferRequest
): Promise<TransferOutcome> {
  const {
    sourceInventoryId,
    destinationInventoryId,
    quantity,
    performedBy,
    referenceId,
    reason,
    sourceMovementId,
    destinationMovementId,
    timestamp
  } = request;

  if (!sourceInventoryId || !destinationInventoryId) {
    throw new InventoryDomainError('Both sourceInventoryId and destinationInventoryId are required for transfer', [
      { field: 'sourceInventoryId', message: 'Source and destination inventory IDs are required', code: 'REQUIRED' }
    ]);
  }

  if (sourceInventoryId === destinationInventoryId) {
    throw new InventoryDomainError('Source and destination inventory records cannot be identical', [
      { field: 'destinationInventoryId', message: 'Source and destination cannot be the same', code: 'INVARIANT_VIOLATION' }
    ]);
  }

  try {
    const outcome = await runTransaction(db, async (transaction) => {
      const srcRef = doc(db, COLLECTIONS.INVENTORY, sourceInventoryId.trim());
      const destRef = doc(db, COLLECTIONS.INVENTORY, destinationInventoryId.trim());

      const [srcSnap, destSnap] = await Promise.all([
        transaction.get(srcRef),
        transaction.get(destRef)
      ]);

      if (!srcSnap.exists()) {
        throw new InventoryDomainError(`Source inventory record not found: ${sourceInventoryId}`, [
          { field: 'sourceInventoryId', message: 'Source inventory not found', code: 'OUT_OF_RANGE' }
        ]);
      }
      if (!destSnap.exists()) {
        throw new InventoryDomainError(`Destination inventory record not found: ${destinationInventoryId}`, [
          { field: 'destinationInventoryId', message: 'Destination inventory not found', code: 'OUT_OF_RANGE' }
        ]);
      }

      const srcVal = validateInventoryRecord(srcSnap.data());
      const destVal = validateInventoryRecord(destSnap.data());

      if (!srcVal.isValid || !srcVal.record) {
        throw new InventoryDomainError(`Invalid source inventory record`, srcVal.errors);
      }
      if (!destVal.isValid || !destVal.record) {
        throw new InventoryDomainError(`Invalid destination inventory record`, destVal.errors);
      }

      const srcRecord = srcVal.record;
      const destRecord = destVal.record;

      if (srcRecord.sku !== destRecord.sku) {
        throw new InventoryDomainError(`Transfer SKU mismatch: source SKU (${srcRecord.sku}) !== destination SKU (${destRecord.sku})`, [
          { field: 'sku', message: 'Transfer must be between records of the same SKU', code: 'INVARIANT_VIOLATION' }
        ]);
      }

      const commonRefId = referenceId || `trf-${Date.now()}`;
      const commonReason = reason || `Transfer from ${srcRecord.locationId} to ${destRecord.locationId}`;

      // Calculate source deduction
      const srcOutcome = calculateMovementOutcome(srcRecord, {
        movementType: 'TRANSFER',
        quantityParam: -Math.abs(quantity), // negative delta for source
        performedBy,
        referenceId: commonRefId,
        reason: commonReason,
        movementId: sourceMovementId,
        timestamp
      });

      // Calculate destination addition
      const destOutcome = calculateMovementOutcome(destRecord, {
        movementType: 'TRANSFER',
        quantityParam: Math.abs(quantity), // positive delta for destination
        performedBy,
        referenceId: commonRefId,
        reason: commonReason,
        movementId: destinationMovementId,
        timestamp
      });

      const srcMovRef = doc(db, 'inventory_movements', srcOutcome.movementRecord.id);
      const destMovRef = doc(db, 'inventory_movements', destOutcome.movementRecord.id);

      // Save all in transaction
      transaction.set(srcRef, srcOutcome.updatedRecord);
      transaction.set(destRef, destOutcome.updatedRecord);
      transaction.set(srcMovRef, srcOutcome.movementRecord);
      transaction.set(destMovRef, destOutcome.movementRecord);

      return {
        sourceInventoryRecord: srcOutcome.updatedRecord,
        destinationInventoryRecord: destOutcome.updatedRecord,
        sourceMovementRecord: srcOutcome.movementRecord,
        destinationMovementRecord: destOutcome.movementRecord
      };
    });

    return outcome;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `inventory_transfer/${sourceInventoryId}->${destinationInventoryId}`);
    throw error;
  }
}

// Convenience Helpers
export function recordPurchaseReceipt(params: Omit<ExecuteMovementRequest, 'movementType'>) {
  return executeInventoryMovement({ ...params, movementType: 'PURCHASE_RECEIPT' });
}

export function recordSale(params: Omit<ExecuteMovementRequest, 'movementType'>) {
  return executeInventoryMovement({ ...params, movementType: 'SALE' });
}

export function recordReturn(params: Omit<ExecuteMovementRequest, 'movementType'>) {
  return executeInventoryMovement({ ...params, movementType: 'RETURN' });
}

export function recordAdjustment(params: Omit<ExecuteMovementRequest, 'movementType'>) {
  return executeInventoryMovement({ ...params, movementType: 'ADJUSTMENT' });
}
