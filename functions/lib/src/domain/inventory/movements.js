"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMovementOutcome = calculateMovementOutcome;
exports.recordPurchaseReceipt = recordPurchaseReceipt;
exports.recordSale = recordSale;
exports.recordReturn = recordReturn;
exports.recordAdjustment = recordAdjustment;
exports.recordTransfer = recordTransfer;
const functions_1 = require("firebase/functions");
const firebase_1 = require("../../lib/firebase");
const types_1 = require("./types");
const validation_1 = require("./validation");
function calculateMovementOutcome(record, params) {
    if (!params.performedBy || typeof params.performedBy !== 'string' || params.performedBy.trim().length === 0) {
        throw new validation_1.InventoryDomainError('performedBy is required and must be a non-empty string', [
            { field: 'performedBy', message: 'performedBy is required', code: 'REQUIRED' }
        ]);
    }
    const { movementType, quantityParam, performedBy, referenceId, reason, serialNumbers, movementId, timestamp } = params;
    let quantityDelta = 0;
    if (movementType === 'PURCHASE_RECEIPT' || movementType === 'SALE' || movementType === 'RETURN') {
        if (typeof quantityParam !== 'number' || !Number.isFinite(quantityParam) || !Number.isInteger(quantityParam) || quantityParam <= 0) {
            throw new validation_1.InventoryDomainError(`${movementType} quantityParam must be a valid finite integer strictly positive`, [
                { field: 'quantityParam', message: `${movementType} quantityParam must be a valid finite integer strictly positive`, code: 'OUT_OF_RANGE' }
            ]);
        }
        quantityDelta = movementType === 'SALE' ? -quantityParam : quantityParam;
    }
    else if (movementType === 'ADJUSTMENT') {
        if (typeof quantityParam !== 'number' || !Number.isFinite(quantityParam) || !Number.isInteger(quantityParam) || quantityParam === 0) {
            throw new validation_1.InventoryDomainError('ADJUSTMENT quantityParam cannot be zero and must be a non-zero finite integer', [
                { field: 'quantityParam', message: 'quantityParam cannot be zero', code: 'OUT_OF_RANGE' }
            ]);
        }
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            throw new validation_1.InventoryDomainError('ADJUSTMENT requires a non-empty reason', [
                { field: 'reason', message: 'ADJUSTMENT requires a non-empty reason', code: 'REQUIRED' }
            ]);
        }
        quantityDelta = quantityParam;
    }
    else if (movementType === 'TRANSFER') {
        if (typeof quantityParam !== 'number' || !Number.isFinite(quantityParam) || !Number.isInteger(quantityParam) || quantityParam === 0) {
            throw new validation_1.InventoryDomainError('TRANSFER quantityParam must be a non-zero finite integer', [
                { field: 'quantityParam', message: 'quantityParam cannot be zero', code: 'OUT_OF_RANGE' }
            ]);
        }
        quantityDelta = quantityParam;
    }
    else {
        throw new validation_1.InventoryDomainError(`Invalid movementType: ${String(movementType)}`, [
            { field: 'movementType', message: 'Invalid movementType', code: 'INVALID_ENUM' }
        ]);
    }
    const newQuantityOnHand = record.quantityOnHand + quantityDelta;
    if (!Number.isFinite(newQuantityOnHand) || !Number.isInteger(newQuantityOnHand) || newQuantityOnHand < 0) {
        throw new validation_1.InventoryDomainError(`INSUFFICIENT_STOCK: Movement outcome would result in negative quantityOnHand (${newQuantityOnHand})`, [
            { field: 'quantityOnHand', message: 'quantityOnHand cannot be negative', code: 'OUT_OF_RANGE' }
        ]);
    }
    if (quantityDelta < 0) {
        const requiredReduction = Math.abs(quantityDelta);
        const available = (0, types_1.calculateAvailableQuantity)(record);
        if (requiredReduction > available) {
            throw new validation_1.InventoryDomainError(`INSUFFICIENT_INVENTORY: Insufficient available inventory (${available}) for reduction (${requiredReduction})`, [
                { field: 'quantityOnHand', message: 'Insufficient available inventory', code: 'INVARIANT_VIOLATION' }
            ]);
        }
    }
    let updatedSerials = record.serialNumbers ? [...record.serialNumbers] : undefined;
    if (record.trackingMode === 'SERIAL') {
        if (!Array.isArray(serialNumbers)) {
            throw new validation_1.InventoryDomainError('SERIAL inventory movement requires serialNumbers array', [
                { field: 'serialNumbers', message: 'serialNumbers required for SERIAL trackingMode', code: 'REQUIRED' }
            ]);
        }
        const targetCount = Math.abs(quantityDelta);
        if (serialNumbers.length !== targetCount) {
            throw new validation_1.InventoryDomainError(`serialNumbers count (${serialNumbers.length}) must match quantity delta magnitude (${targetCount})`, [
                { field: 'serialNumbers', message: 'serialNumbers count mismatch', code: 'INVARIANT_VIOLATION' }
            ]);
        }
        if (quantityDelta > 0) {
            const currentSet = new Set((updatedSerials || []).map(s => s.toUpperCase()));
            for (const sn of serialNumbers) {
                if (currentSet.has(sn.trim().toUpperCase())) {
                    throw new validation_1.InventoryDomainError(`Serial number '${sn}' already exists in inventory`, [
                        { field: 'serialNumbers', message: `Serial ${sn} already exists`, code: 'INVARIANT_VIOLATION' }
                    ]);
                }
            }
            updatedSerials = [...(updatedSerials || []), ...serialNumbers.map(s => s.trim())];
        }
        else {
            const currentList = updatedSerials || [];
            for (const sn of serialNumbers) {
                const index = currentList.findIndex(existing => existing.toUpperCase() === sn.trim().toUpperCase());
                if (index === -1) {
                    throw new validation_1.InventoryDomainError(`Serial number '${sn}' not found in inventory`, [
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
    const movementRecord = {
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
    const updatedRecord = {
        ...record,
        quantityOnHand: newQuantityOnHand,
        serialNumbers: updatedSerials,
        updatedAt: now
    };
    return { updatedRecord, movementRecord };
}
const OPERATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
function fail(message, field, code) { throw new validation_1.InventoryDomainError(message, [{ field, message, code }]); }
function assertPositiveInteger(value, field) { if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0)
    fail(`${field} must be a positive integer`, field, 'OUT_OF_RANGE'); }
function assertNonZeroInteger(value) { if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value === 0)
    fail('quantityDelta must be a non-zero finite integer', 'quantityDelta', 'OUT_OF_RANGE'); }
function assertOperationId(value) { if (typeof value !== 'string' || !OPERATION_ID_PATTERN.test(value))
    fail('Invalid operationId', 'operationId', 'INVALID_TYPE'); }
function assertOptionalString(value, field, max = 128) { if (value !== undefined && (typeof value !== 'string' || value.trim().length === 0 || value.length > max))
    fail(`Invalid ${field}`, field, 'INVALID_TYPE'); }
function assertActor() { if (!firebase_1.auth.currentUser?.uid)
    fail('An authenticated staff actor is required for inventory movement', 'performedBy', 'REQUIRED'); }
const functions = (0, functions_1.getFunctions)(firebase_1.app);
const call = (name, request) => (0, functions_1.httpsCallable)(functions, name)(request).then(result => result.data);
function validateMovementRequest(request) {
    assertPositiveInteger(request.quantity, 'quantity');
    assertOperationId(request.operationId);
    assertOptionalString(request.referenceId, 'referenceId');
    assertOptionalString(request.reason, 'reason', 1000);
    assertActor();
}
function recordPurchaseReceipt(request) {
    validateMovementRequest(request);
    return call('recordInventoryPurchaseReceipt', request);
}
function recordSale(request) {
    validateMovementRequest(request);
    return call('recordInventorySale', request);
}
function recordReturn(request) {
    validateMovementRequest(request);
    return call('recordInventoryReturn', request);
}
function recordAdjustment(request) {
    assertNonZeroInteger(request.quantityDelta);
    assertOperationId(request.operationId);
    assertOptionalString(request.referenceId, 'referenceId');
    assertOptionalString(request.reason, 'reason', 1000);
    assertActor();
    return call('recordInventoryAdjustment', request);
}
function recordTransfer(request) {
    assertPositiveInteger(request.quantity, 'quantity');
    assertOperationId(request.operationId);
    assertOptionalString(request.referenceId, 'referenceId');
    assertOptionalString(request.reason, 'reason', 1000);
    assertActor();
    if (request.sourceInventoryId === request.destinationInventoryId)
        fail('Source and destination inventory records must be different', 'destinationInventoryId', 'INVARIANT_VIOLATION');
    return call('recordInventoryTransfer', request);
}
//# sourceMappingURL=movements.js.map