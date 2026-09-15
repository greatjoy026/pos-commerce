"use strict";
/**
 * Authoritative Inventory Domain Types (INV-001 / INV-001-F1.1)
 *
 * Architectural Boundary:
 * Product -> Variant -> SKU -> Inventory
 *
 * Where:
 * - Product = catalog identity / merchandising (CanonicalProduct)
 * - Variant = sellable configuration (CanonicalVariant)
 * - SKU = uniquely identifiable sellable unit (sku: string)
 * - Inventory = operational stock state for that SKU (InventoryRecord)
 *
 * Core Rule:
 * Inventory quantity has EXACTLY ONE authoritative owner: InventoryRecord.
 * CanonicalProduct and CanonicalVariant do NOT own stock state.
 * Legacy Product.stock is strictly a read-only compatibility projection.
 *
 * AUTHORITATIVE QUANTITY CONTRACT (Option A - Discrete Integer Inventory):
 * - All physical on-hand, reserved, and reorder quantities are strictly non-negative discrete integers:
 *   `Number.isInteger(qty) && qty >= 0`.
 * - Fractional quantities (e.g. 1.5), NaN, and Infinity are strictly rejected at all system boundaries.
 * - UOM conversions (e.g. wholesale carton of 24 pieces) are expressed via base unit multipliers,
 *   preserving discrete integer counts at the inventory layer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LOCATION_ID = void 0;
exports.calculateAvailableQuantity = calculateAvailableQuantity;
exports.getInventoryRecordKey = getInventoryRecordKey;
/**
 * Standard default location identifier.
 * Location management is planned for a future domain; locationId provides the architectural anchor.
 */
exports.DEFAULT_LOCATION_ID = 'loc-main-store';
/**
 * Deterministically derives available quantity from on-hand and reserved amounts.
 *
 * Invariant: availableQuantity = quantityOnHand - quantityReserved
 *
 * CRITICAL: availableQuantity is a derived calculation, NOT an independently
 * mutable source of truth.
 *
 * ARCHITECTURAL CONTRACT (Option A - Integer Inventory):
 * - Operates ONLY on validated finite non-negative integer values.
 * - Invariant: availableQuantity = quantityOnHand - quantityReserved
 * - Never uses Math.max(0, ...) to hide invalid domain state.
 * - If inputs are invalid, non-finite, non-integer, negative, or if reserved > onHand,
 *   throws an explicit error rather than silently returning zero.
 */
function calculateAvailableQuantity(record) {
    const onHand = record.quantityOnHand;
    const reserved = record.quantityReserved;
    if (typeof onHand !== 'number' || !Number.isFinite(onHand) || !Number.isInteger(onHand)) {
        throw new Error(`calculateAvailableQuantity: quantityOnHand must be a finite integer, received ${String(onHand)}`);
    }
    if (typeof reserved !== 'number' || !Number.isFinite(reserved) || !Number.isInteger(reserved)) {
        throw new Error(`calculateAvailableQuantity: quantityReserved must be a finite integer, received ${String(reserved)}`);
    }
    if (onHand < 0) {
        throw new Error(`calculateAvailableQuantity: quantityOnHand cannot be negative, received ${onHand}`);
    }
    if (reserved < 0) {
        throw new Error(`calculateAvailableQuantity: quantityReserved cannot be negative, received ${reserved}`);
    }
    if (reserved > onHand) {
        throw new Error(`calculateAvailableQuantity: quantityReserved (${reserved}) cannot exceed quantityOnHand (${onHand})`);
    }
    return onHand - reserved;
}
/**
 * Deterministically derives the logical inventory identity key.
 *
 * LOGICAL IDENTITY BOUNDARY (INV-001-F1.1):
 * - For standard quantity inventory (QUANTITY, NONE) and aggregate serial pools:
 *   SKU + locationId -> `SKU::LOCATION`
 * - For batch-tracked inventory (BATCH):
 *   SKU + locationId + batchNumber -> `SKU::LOCATION::BATCH`
 *   This explicitly allows multiple batches of the same SKU to coexist at the same location.
 *
 * FUTURE SERIAL ARCHITECTURE:
 * When item-level serialized ledgering is introduced in subsequent phases, individual
 * serial identities (e.g. `SKU::LOCATION::SERIAL`) will represent single physical items.
 *
 * NOTE: This domain helper represents logical identity semantics. It does not alone
 * provide database concurrency protection or distributed locking (which belong to
 * transactional persistence layers).
 */
function getInventoryRecordKey(record) {
    const sku = typeof record.sku === 'string' ? record.sku.trim().toUpperCase() : '';
    const locationId = typeof record.locationId === 'string' ? record.locationId.trim().toLowerCase() : '';
    if (record.trackingMode === 'BATCH') {
        const batch = typeof record.batchNumber === 'string' ? record.batchNumber.trim().toUpperCase() : '';
        return `${sku}::${locationId}::${batch}`;
    }
    return `${sku}::${locationId}`;
}
//# sourceMappingURL=types.js.map