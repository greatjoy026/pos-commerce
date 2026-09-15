"use strict";
/**
 * Controlled Inventory Projections (INV-001)
 *
 * Implements controlled views of inventory state for internal staff and public consumers.
 *
 * Architecture:
 * Inventory -> Availability Projection -> Public Product
 *
 * Security Boundary:
 * Internal consumers (POS, Inventory Module) receive detailed operational metrics.
 * Public consumers (E-Commerce Storefront) receive strictly categorical availability status.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toOperationalInventoryProjection = toOperationalInventoryProjection;
exports.toPublicAvailabilityFromInventory = toPublicAvailabilityFromInventory;
exports.aggregateInventoryBalances = aggregateInventoryBalances;
const types_1 = require("./types");
const projections_1 = require("../product/projections");
/**
 * Creates an internal operational projection from an authoritative InventoryRecord.
 * Safe for authenticated staff, cashiers, and warehouse operators.
 */
function toOperationalInventoryProjection(record) {
    const available = (0, types_1.calculateAvailableQuantity)(record);
    const threshold = typeof record.reorderPoint === 'number' && Number.isFinite(record.reorderPoint) && record.reorderPoint > 0
        ? record.reorderPoint
        : projections_1.DEFAULT_LOW_STOCK_THRESHOLD;
    const isOutOfStock = available <= 0;
    const isLowStock = !isOutOfStock && available <= threshold;
    return {
        sku: record.sku,
        productId: record.productId,
        variantId: record.variantId,
        locationId: record.locationId,
        quantityOnHand: record.quantityOnHand,
        quantityReserved: record.quantityReserved,
        availableQuantity: available,
        reorderPoint: record.reorderPoint,
        reorderQuantity: record.reorderQuantity,
        trackingMode: record.trackingMode,
        status: record.status,
        isLowStock,
        isOutOfStock
    };
}
/**
 * Creates a public availability projection from an authoritative InventoryRecord.
 * Safe for unauthenticated customer storefronts.
 *
 * SECURITY INVARIANT:
 * This function guarantees that:
 * - NO quantityOnHand, quantityReserved, or availableQuantity
 * - NO locationId or warehouse references
 * - NO reorderPoint or reorderQuantity
 * - NO wholesale costs or supplier identities
 * are ever exposed to the public storefront.
 */
function toPublicAvailabilityFromInventory(record, lowStockThreshold) {
    const available = (0, types_1.calculateAvailableQuantity)(record);
    const effectiveThreshold = lowStockThreshold ?? record.reorderPoint;
    const status = (0, projections_1.computePublicAvailabilityStatus)(available, effectiveThreshold);
    return {
        sku: record.sku,
        availability: {
            status
        }
    };
}
/**
 * Calculates aggregate inventory metrics across multiple records (e.g. all variants of a product).
 */
function aggregateInventoryBalances(records) {
    let totalOnHand = 0;
    let totalReserved = 0;
    for (const r of records) {
        if (r.status === 'ACTIVE') {
            totalOnHand += r.quantityOnHand;
            totalReserved += r.quantityReserved;
        }
    }
    const totalAvailable = Math.max(0, totalOnHand - totalReserved);
    return {
        totalOnHand,
        totalReserved,
        totalAvailable,
        isAnyInStock: totalAvailable > 0
    };
}
//# sourceMappingURL=projections.js.map