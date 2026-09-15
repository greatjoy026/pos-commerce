"use strict";
/**
 * Authoritative Inventory Validation Engine (INV-001)
 *
 * Enforces strict validation rules and domain invariants for InventoryRecord.
 *
 * Invariants:
 * 1. quantityOnHand >= 0 (finite number)
 * 2. quantityReserved >= 0 (finite number)
 * 3. quantityReserved <= quantityOnHand
 * 4. availableQuantity = quantityOnHand - quantityReserved
 * 5. Inventory belongs to a SKU
 * 6. Inventory does not belong inside CanonicalProduct
 * 7. Inventory does not belong inside CanonicalVariant
 * 8. Inventory cannot redefine SKU identity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryDomainError = void 0;
exports.validateInventoryRecord = validateInventoryRecord;
exports.assertValidInventoryRecord = assertValidInventoryRecord;
exports.assertInventoryInvariants = assertInventoryInvariants;
exports.assertCanonicalProductHasNoInventoryState = assertCanonicalProductHasNoInventoryState;
exports.assertCanonicalVariantHasNoInventoryState = assertCanonicalVariantHasNoInventoryState;
exports.validateInventoryMovementRecord = validateInventoryMovementRecord;
exports.assertValidInventoryMovementRecord = assertValidInventoryMovementRecord;
const types_1 = require("./types");
class InventoryDomainError extends Error {
    errors;
    constructor(message, errors) {
        super(message);
        this.name = 'InventoryDomainError';
        this.errors = errors;
    }
}
exports.InventoryDomainError = InventoryDomainError;
const VALID_TRACKING_MODES = new Set([
    'QUANTITY',
    'SERIAL',
    'BATCH',
    'NONE'
]);
const VALID_STATUSES = new Set([
    'ACTIVE',
    'INACTIVE'
]);
/**
 * Strictly validates an unknown input object against the InventoryRecord contract.
 * Zero silent coercion: malformed values produce structured errors.
 */
function validateInventoryRecord(input) {
    const errors = [];
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return {
            isValid: false,
            errors: [{ field: 'root', message: 'Inventory record must be a non-null object', code: 'INVALID_TYPE' }]
        };
    }
    const raw = input;
    // 1. Identifier validation
    if (typeof raw.id !== 'string' || raw.id.trim().length === 0) {
        errors.push({ field: 'id', message: 'Inventory record id is required and must be a non-empty string', code: 'REQUIRED' });
    }
    // 2. SKU validation
    if (typeof raw.sku !== 'string' || raw.sku.trim().length === 0) {
        errors.push({ field: 'sku', message: 'SKU is required and must be a non-empty string', code: 'REQUIRED' });
    }
    // 3. Product ID validation
    if (typeof raw.productId !== 'string' || raw.productId.trim().length === 0) {
        errors.push({ field: 'productId', message: 'productId is required and must be a non-empty string', code: 'REQUIRED' });
    }
    // Variant ID (optional)
    if (raw.variantId !== undefined && (typeof raw.variantId !== 'string' || raw.variantId.trim().length === 0)) {
        errors.push({ field: 'variantId', message: 'variantId if provided must be a non-empty string', code: 'INVALID_TYPE' });
    }
    // 4. Location ID validation
    if (typeof raw.locationId !== 'string' || raw.locationId.trim().length === 0) {
        errors.push({ field: 'locationId', message: 'locationId is required and must be a non-empty string', code: 'REQUIRED' });
    }
    // 5. Quantity On Hand validation (Invariant 1: non-negative integer)
    if (typeof raw.quantityOnHand !== 'number' || !Number.isFinite(raw.quantityOnHand) || !Number.isInteger(raw.quantityOnHand)) {
        errors.push({ field: 'quantityOnHand', message: 'quantityOnHand must be a valid finite integer', code: 'INVALID_TYPE' });
    }
    else if (raw.quantityOnHand < 0) {
        errors.push({ field: 'quantityOnHand', message: 'quantityOnHand cannot be negative', code: 'OUT_OF_RANGE' });
    }
    // 6. Quantity Reserved validation (Invariant 2: non-negative integer)
    if (typeof raw.quantityReserved !== 'number' || !Number.isFinite(raw.quantityReserved) || !Number.isInteger(raw.quantityReserved)) {
        errors.push({ field: 'quantityReserved', message: 'quantityReserved must be a valid finite integer', code: 'INVALID_TYPE' });
    }
    else if (raw.quantityReserved < 0) {
        errors.push({ field: 'quantityReserved', message: 'quantityReserved cannot be negative', code: 'OUT_OF_RANGE' });
    }
    // 7. Reservation Invariant (Invariant 3: quantityReserved <= quantityOnHand)
    if (typeof raw.quantityOnHand === 'number' && Number.isFinite(raw.quantityOnHand) && Number.isInteger(raw.quantityOnHand) &&
        typeof raw.quantityReserved === 'number' && Number.isFinite(raw.quantityReserved) && Number.isInteger(raw.quantityReserved)) {
        if (raw.quantityReserved > raw.quantityOnHand) {
            errors.push({
                field: 'quantityReserved',
                message: `quantityReserved (${raw.quantityReserved}) cannot exceed quantityOnHand (${raw.quantityOnHand})`,
                code: 'INVARIANT_VIOLATION'
            });
        }
    }
    // 8. Reorder Point (optional non-negative integer)
    if (raw.reorderPoint !== undefined) {
        if (typeof raw.reorderPoint !== 'number' || !Number.isFinite(raw.reorderPoint) || !Number.isInteger(raw.reorderPoint)) {
            errors.push({ field: 'reorderPoint', message: 'reorderPoint must be a finite integer', code: 'INVALID_TYPE' });
        }
        else if (raw.reorderPoint < 0) {
            errors.push({ field: 'reorderPoint', message: 'reorderPoint cannot be negative', code: 'OUT_OF_RANGE' });
        }
    }
    // 9. Reorder Quantity (optional non-negative integer)
    if (raw.reorderQuantity !== undefined) {
        if (typeof raw.reorderQuantity !== 'number' || !Number.isFinite(raw.reorderQuantity) || !Number.isInteger(raw.reorderQuantity)) {
            errors.push({ field: 'reorderQuantity', message: 'reorderQuantity must be a finite integer', code: 'INVALID_TYPE' });
        }
        else if (raw.reorderQuantity < 0) {
            errors.push({ field: 'reorderQuantity', message: 'reorderQuantity cannot be negative', code: 'OUT_OF_RANGE' });
        }
    }
    // 10. Tracking Mode validation
    if (typeof raw.trackingMode !== 'string' || !VALID_TRACKING_MODES.has(raw.trackingMode)) {
        errors.push({
            field: 'trackingMode',
            message: `trackingMode must be one of: ${Array.from(VALID_TRACKING_MODES).join(', ')}`,
            code: 'INVALID_ENUM'
        });
    }
    // 11. Status validation
    if (typeof raw.status !== 'string' || !VALID_STATUSES.has(raw.status)) {
        errors.push({
            field: 'status',
            message: `status must be one of: ${Array.from(VALID_STATUSES).join(', ')}`,
            code: 'INVALID_ENUM'
        });
    }
    // 12. CreatedAt validation (Required ISO date string)
    if (typeof raw.createdAt !== 'string' || raw.createdAt.trim().length === 0) {
        errors.push({ field: 'createdAt', message: 'createdAt is required and must be a non-empty string', code: 'REQUIRED' });
    }
    else if (isNaN(Date.parse(raw.createdAt))) {
        errors.push({ field: 'createdAt', message: 'createdAt must be a valid ISO date timestamp string', code: 'INVALID_TYPE' });
    }
    // 13. UpdatedAt validation (Required ISO date string)
    if (typeof raw.updatedAt !== 'string' || raw.updatedAt.trim().length === 0) {
        errors.push({ field: 'updatedAt', message: 'updatedAt is required and must be a non-empty string', code: 'REQUIRED' });
    }
    else if (isNaN(Date.parse(raw.updatedAt))) {
        errors.push({ field: 'updatedAt', message: 'updatedAt must be a valid ISO date timestamp string', code: 'INVALID_TYPE' });
    }
    // 14. Tracking Mode Field Semantics & Contradiction Enforcements
    const trackingMode = raw.trackingMode;
    if (trackingMode === 'NONE') {
        // Non-stocked services / digital goods must not hold physical stock
        if (typeof raw.quantityOnHand === 'number' && raw.quantityOnHand > 0) {
            errors.push({
                field: 'quantityOnHand',
                message: 'Non-stocked inventory (trackingMode: NONE) cannot have quantityOnHand > 0',
                code: 'INVARIANT_VIOLATION'
            });
        }
        if (typeof raw.quantityReserved === 'number' && raw.quantityReserved > 0) {
            errors.push({
                field: 'quantityReserved',
                message: 'Non-stocked inventory (trackingMode: NONE) cannot have quantityReserved > 0',
                code: 'INVARIANT_VIOLATION'
            });
        }
        if (raw.serialNumbers !== undefined) {
            errors.push({
                field: 'serialNumbers',
                message: 'serialNumbers cannot be provided when trackingMode is NONE',
                code: 'INVARIANT_VIOLATION'
            });
        }
        if (raw.batchNumber !== undefined) {
            errors.push({
                field: 'batchNumber',
                message: 'batchNumber cannot be provided when trackingMode is NONE',
                code: 'INVARIANT_VIOLATION'
            });
        }
        if (raw.expiryDate !== undefined) {
            errors.push({
                field: 'expiryDate',
                message: 'expiryDate cannot be provided when trackingMode is NONE',
                code: 'INVARIANT_VIOLATION'
            });
        }
    }
    else if (trackingMode === 'QUANTITY') {
        // Standard quantity bulk/unit inventory
        if (raw.serialNumbers !== undefined) {
            errors.push({
                field: 'serialNumbers',
                message: 'serialNumbers cannot be provided when trackingMode is QUANTITY',
                code: 'INVARIANT_VIOLATION'
            });
        }
        if (raw.batchNumber !== undefined) {
            errors.push({
                field: 'batchNumber',
                message: 'batchNumber cannot be provided when trackingMode is QUANTITY',
                code: 'INVARIANT_VIOLATION'
            });
        }
        if (raw.expiryDate !== undefined) {
            errors.push({
                field: 'expiryDate',
                message: 'expiryDate cannot be provided when trackingMode is QUANTITY',
                code: 'INVARIANT_VIOLATION'
            });
        }
    }
    else if (trackingMode === 'SERIAL') {
        // Individual piece tracking with serial numbers
        if (raw.batchNumber !== undefined) {
            errors.push({
                field: 'batchNumber',
                message: 'batchNumber cannot be provided when trackingMode is SERIAL',
                code: 'INVARIANT_VIOLATION'
            });
        }
        if (raw.expiryDate !== undefined) {
            errors.push({
                field: 'expiryDate',
                message: 'expiryDate cannot be provided when trackingMode is SERIAL',
                code: 'INVARIANT_VIOLATION'
            });
        }
        if (raw.serialNumbers === undefined || raw.serialNumbers === null) {
            errors.push({
                field: 'serialNumbers',
                message: 'serialNumbers is required when trackingMode is SERIAL',
                code: 'REQUIRED'
            });
        }
        else if (!Array.isArray(raw.serialNumbers)) {
            errors.push({
                field: 'serialNumbers',
                message: 'serialNumbers must be an array of strings',
                code: 'INVALID_TYPE'
            });
        }
        else {
            // Invariant: serialNumbers.length === quantityOnHand
            if (typeof raw.quantityOnHand === 'number' && Number.isInteger(raw.quantityOnHand) && raw.quantityOnHand >= 0) {
                if (raw.serialNumbers.length !== raw.quantityOnHand) {
                    errors.push({
                        field: 'serialNumbers',
                        message: `serialNumbers count (${raw.serialNumbers.length}) must equal quantityOnHand (${raw.quantityOnHand}) for trackingMode SERIAL`,
                        code: 'INVARIANT_VIOLATION'
                    });
                }
            }
            const seenSerials = new Set();
            for (let i = 0; i < raw.serialNumbers.length; i++) {
                const sn = raw.serialNumbers[i];
                if (typeof sn !== 'string' || sn.trim().length === 0) {
                    errors.push({
                        field: `serialNumbers[${i}]`,
                        message: `serialNumber at index ${i} must be a non-empty string`,
                        code: 'INVALID_TYPE'
                    });
                }
                else {
                    const trimmed = sn.trim();
                    if (seenSerials.has(trimmed.toUpperCase())) {
                        errors.push({
                            field: `serialNumbers[${i}]`,
                            message: `Duplicate serial number '${trimmed}' found in serialNumbers`,
                            code: 'INVARIANT_VIOLATION'
                        });
                    }
                    seenSerials.add(trimmed.toUpperCase());
                }
            }
        }
    }
    else if (trackingMode === 'BATCH') {
        // Batch/lot tracking with expiration date
        if (raw.serialNumbers !== undefined) {
            errors.push({
                field: 'serialNumbers',
                message: 'serialNumbers cannot be provided when trackingMode is BATCH',
                code: 'INVARIANT_VIOLATION'
            });
        }
        if (raw.batchNumber === undefined || raw.batchNumber === null) {
            errors.push({
                field: 'batchNumber',
                message: 'batchNumber is required when trackingMode is BATCH',
                code: 'REQUIRED'
            });
        }
        else if (typeof raw.batchNumber !== 'string') {
            errors.push({
                field: 'batchNumber',
                message: 'batchNumber must be a string',
                code: 'INVALID_TYPE'
            });
        }
        else if (raw.batchNumber.trim().length === 0) {
            errors.push({
                field: 'batchNumber',
                message: 'batchNumber cannot be an empty string',
                code: 'OUT_OF_RANGE'
            });
        }
        if (raw.expiryDate !== undefined && raw.expiryDate !== null) {
            if (typeof raw.expiryDate !== 'string') {
                errors.push({
                    field: 'expiryDate',
                    message: 'expiryDate must be a string',
                    code: 'INVALID_TYPE'
                });
            }
            else if (raw.expiryDate.trim().length === 0 || isNaN(Date.parse(raw.expiryDate))) {
                errors.push({
                    field: 'expiryDate',
                    message: 'expiryDate must be a valid ISO date timestamp string',
                    code: 'INVALID_TYPE'
                });
            }
        }
    }
    if (errors.length > 0) {
        return { isValid: false, errors };
    }
    const record = {
        id: raw.id.trim(),
        sku: raw.sku.trim(),
        productId: raw.productId.trim(),
        variantId: raw.variantId ? raw.variantId.trim() : undefined,
        locationId: raw.locationId.trim(),
        quantityOnHand: raw.quantityOnHand,
        quantityReserved: raw.quantityReserved,
        reorderPoint: raw.reorderPoint !== undefined ? raw.reorderPoint : undefined,
        reorderQuantity: raw.reorderQuantity !== undefined ? raw.reorderQuantity : undefined,
        trackingMode: raw.trackingMode,
        status: raw.status,
        serialNumbers: Array.isArray(raw.serialNumbers) ? raw.serialNumbers.map(s => s.trim()) : undefined,
        batchNumber: typeof raw.batchNumber === 'string' ? raw.batchNumber.trim() : undefined,
        expiryDate: typeof raw.expiryDate === 'string' ? raw.expiryDate.trim() : undefined,
        createdAt: raw.createdAt.trim(),
        updatedAt: raw.updatedAt.trim()
    };
    return { isValid: true, errors: [], record };
}
/**
 * Asserts that an inventory record satisfies all validation rules and domain invariants.
 * Throws InventoryDomainError if invalid.
 */
function assertValidInventoryRecord(input) {
    const result = validateInventoryRecord(input);
    if (!result.isValid || !result.record) {
        throw new InventoryDomainError(`Inventory validation failed with ${result.errors.length} error(s): ${result.errors.map(e => `${e.field}: ${e.message}`).join(', ')}`, result.errors);
    }
}
/**
 * Enforces and verifies the 8 core Inventory Domain Invariants.
 */
function assertInventoryInvariants(record) {
    // Invariant 1: quantityOnHand >= 0 and is integer
    if (!Number.isFinite(record.quantityOnHand) || !Number.isInteger(record.quantityOnHand) || record.quantityOnHand < 0) {
        throw new InventoryDomainError('Invariant 1 violated: quantityOnHand must be an integer >= 0', [
            { field: 'quantityOnHand', message: 'quantityOnHand must be a non-negative integer', code: 'INVARIANT_VIOLATION' }
        ]);
    }
    // Invariant 2: quantityReserved >= 0 and is integer
    if (!Number.isFinite(record.quantityReserved) || !Number.isInteger(record.quantityReserved) || record.quantityReserved < 0) {
        throw new InventoryDomainError('Invariant 2 violated: quantityReserved must be an integer >= 0', [
            { field: 'quantityReserved', message: 'quantityReserved must be a non-negative integer', code: 'INVARIANT_VIOLATION' }
        ]);
    }
    // Invariant 3: quantityReserved <= quantityOnHand
    if (record.quantityReserved > record.quantityOnHand) {
        throw new InventoryDomainError('Invariant 3 violated: quantityReserved cannot exceed quantityOnHand', [
            { field: 'quantityReserved', message: 'quantityReserved > quantityOnHand', code: 'INVARIANT_VIOLATION' }
        ]);
    }
    // Invariant 4: availableQuantity = quantityOnHand - quantityReserved
    const derivedAvailable = (0, types_1.calculateAvailableQuantity)(record);
    const expectedAvailable = record.quantityOnHand - record.quantityReserved;
    if (derivedAvailable !== expectedAvailable) {
        throw new InventoryDomainError('Invariant 4 violated: availableQuantity calculation mismatch', [
            { field: 'availableQuantity', message: 'derivedAvailable !== expectedAvailable', code: 'INVARIANT_VIOLATION' }
        ]);
    }
    // Invariant 5: Inventory belongs to a SKU
    if (!record.sku || record.sku.trim().length === 0) {
        throw new InventoryDomainError('Invariant 5 violated: Inventory must belong to a SKU', [
            { field: 'sku', message: 'Inventory record missing SKU reference', code: 'INVARIANT_VIOLATION' }
        ]);
    }
    // Tracking Mode Semantic Invariants
    if (record.trackingMode === 'NONE') {
        if (record.quantityOnHand !== 0 || record.quantityReserved !== 0) {
            throw new InventoryDomainError('Tracking invariant violated: Non-stocked inventory (trackingMode: NONE) must have 0 quantities', [
                { field: 'quantityOnHand', message: 'quantityOnHand must be 0 for trackingMode NONE', code: 'INVARIANT_VIOLATION' }
            ]);
        }
    }
    else if (record.trackingMode === 'SERIAL') {
        if (!Array.isArray(record.serialNumbers) || record.serialNumbers.length !== record.quantityOnHand) {
            throw new InventoryDomainError(`Tracking invariant violated: SERIAL inventory serialNumbers count (${record.serialNumbers ? record.serialNumbers.length : 0}) must equal quantityOnHand (${record.quantityOnHand})`, [{ field: 'serialNumbers', message: 'serialNumbers.length !== quantityOnHand', code: 'INVARIANT_VIOLATION' }]);
        }
    }
    else if (record.trackingMode === 'BATCH') {
        if (!record.batchNumber || record.batchNumber.trim().length === 0) {
            throw new InventoryDomainError('Tracking invariant violated: BATCH inventory must have a non-empty batchNumber', [
                { field: 'batchNumber', message: 'batchNumber required for BATCH', code: 'INVARIANT_VIOLATION' }
            ]);
        }
    }
}
/**
 * Architectural Verification Helper:
 * Verifies that CanonicalProduct does NOT contain inventory state (Invariant 6).
 */
function assertCanonicalProductHasNoInventoryState(product) {
    const raw = product;
    const forbidden = ['stock', 'quantityOnHand', 'quantityReserved', 'reorderPoint', 'location', 'serialNumbers', 'batchNumber'];
    for (const field of forbidden) {
        if (field in raw && raw[field] !== undefined) {
            throw new InventoryDomainError(`Invariant 6 violated: CanonicalProduct contains forbidden inventory field '${field}'`, [
                { field, message: `Field '${field}' must not exist on CanonicalProduct`, code: 'INVARIANT_VIOLATION' }
            ]);
        }
    }
}
/**
 * Architectural Verification Helper:
 * Verifies that CanonicalVariant does NOT contain inventory state (Invariant 7).
 */
function assertCanonicalVariantHasNoInventoryState(variant) {
    const raw = variant;
    const forbidden = ['stock', 'quantityOnHand', 'quantityReserved', 'reorderPoint', 'location'];
    for (const field of forbidden) {
        if (field in raw && raw[field] !== undefined) {
            throw new InventoryDomainError(`Invariant 7 violated: CanonicalVariant contains forbidden inventory field '${field}'`, [
                { field, message: `Field '${field}' must not exist on CanonicalVariant`, code: 'INVARIANT_VIOLATION' }
            ]);
        }
    }
}
/**
 * Validates an unknown input object against the InventoryMovementRecord contract.
 */
function validateInventoryMovementRecord(input) {
    const errors = [];
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return {
            isValid: false,
            errors: [{ field: 'root', message: 'Movement record must be a non-null object', code: 'INVALID_TYPE' }]
        };
    }
    const raw = input;
    if (typeof raw.id !== 'string' || raw.id.trim().length === 0) {
        errors.push({ field: 'id', message: 'Movement id is required and must be a non-empty string', code: 'REQUIRED' });
    }
    if (typeof raw.inventoryId !== 'string' || raw.inventoryId.trim().length === 0) {
        errors.push({ field: 'inventoryId', message: 'inventoryId is required and must be a non-empty string', code: 'REQUIRED' });
    }
    if (typeof raw.sku !== 'string' || raw.sku.trim().length === 0) {
        errors.push({ field: 'sku', message: 'sku is required and must be a non-empty string', code: 'REQUIRED' });
    }
    if (typeof raw.locationId !== 'string' || raw.locationId.trim().length === 0) {
        errors.push({ field: 'locationId', message: 'locationId is required and must be a non-empty string', code: 'REQUIRED' });
    }
    const validMovementTypes = new Set(['PURCHASE_RECEIPT', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER']);
    if (typeof raw.movementType !== 'string' || !validMovementTypes.has(raw.movementType)) {
        errors.push({ field: 'movementType', message: `Invalid movementType: ${String(raw.movementType)}`, code: 'INVALID_ENUM' });
    }
    if (typeof raw.quantityDelta !== 'number' || !Number.isFinite(raw.quantityDelta) || !Number.isInteger(raw.quantityDelta)) {
        errors.push({ field: 'quantityDelta', message: 'quantityDelta must be a finite integer', code: 'INVALID_TYPE' });
    }
    if (typeof raw.quantityBefore !== 'number' || !Number.isFinite(raw.quantityBefore) || !Number.isInteger(raw.quantityBefore) || raw.quantityBefore < 0) {
        errors.push({ field: 'quantityBefore', message: 'quantityBefore must be a non-negative integer', code: 'OUT_OF_RANGE' });
    }
    if (typeof raw.quantityAfter !== 'number' || !Number.isFinite(raw.quantityAfter) || !Number.isInteger(raw.quantityAfter) || raw.quantityAfter < 0) {
        errors.push({ field: 'quantityAfter', message: 'quantityAfter must be a non-negative integer', code: 'OUT_OF_RANGE' });
    }
    if (typeof raw.performedBy !== 'string' || raw.performedBy.trim().length === 0) {
        errors.push({ field: 'performedBy', message: 'performedBy is required and must be a non-empty string', code: 'REQUIRED' });
    }
    if (typeof raw.timestamp !== 'string' || raw.timestamp.trim().length === 0) {
        errors.push({ field: 'timestamp', message: 'timestamp is required and must be a non-empty string', code: 'REQUIRED' });
    }
    if (errors.length > 0) {
        return { isValid: false, errors };
    }
    return {
        isValid: true,
        errors: [],
        record: {
            id: raw.id.trim(),
            inventoryId: raw.inventoryId.trim(),
            sku: raw.sku.trim(),
            productId: typeof raw.productId === 'string' ? raw.productId.trim() : '',
            variantId: typeof raw.variantId === 'string' ? raw.variantId.trim() : undefined,
            locationId: raw.locationId.trim(),
            movementType: raw.movementType,
            quantityDelta: raw.quantityDelta,
            quantityBefore: raw.quantityBefore,
            quantityAfter: raw.quantityAfter,
            referenceId: typeof raw.referenceId === 'string' ? raw.referenceId.trim() : undefined,
            performedBy: raw.performedBy.trim(),
            timestamp: raw.timestamp.trim(),
            reason: typeof raw.reason === 'string' ? raw.reason.trim() : undefined,
        }
    };
}
/**
 * Asserts that an inventory movement record satisfies all validation rules.
 */
function assertValidInventoryMovementRecord(input) {
    const result = validateInventoryMovementRecord(input);
    if (!result.isValid || !result.record) {
        throw new InventoryDomainError(`Inventory movement validation failed with ${result.errors.length} error(s): ${result.errors.map(e => `${e.field}: ${e.message}`).join(', ')}`, result.errors);
    }
}
//# sourceMappingURL=validation.js.map