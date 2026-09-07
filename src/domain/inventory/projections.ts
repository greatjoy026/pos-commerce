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

import {
  InventoryRecord,
  InventoryOperationalProjection,
  PublicInventoryAvailability,
  calculateAvailableQuantity
} from './types';
import {
  computePublicAvailabilityStatus,
  DEFAULT_LOW_STOCK_THRESHOLD
} from '../product/projections';

/**
 * Creates an internal operational projection from an authoritative InventoryRecord.
 * Safe for authenticated staff, cashiers, and warehouse operators.
 */
export function toOperationalInventoryProjection(record: InventoryRecord): InventoryOperationalProjection {
  const available = calculateAvailableQuantity(record);
  const threshold = typeof record.reorderPoint === 'number' && Number.isFinite(record.reorderPoint) && record.reorderPoint > 0
    ? record.reorderPoint
    : DEFAULT_LOW_STOCK_THRESHOLD;

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
export function toPublicAvailabilityFromInventory(
  record: InventoryRecord,
  lowStockThreshold?: number
): PublicInventoryAvailability {
  const available = calculateAvailableQuantity(record);
  const effectiveThreshold = lowStockThreshold ?? record.reorderPoint;
  const status = computePublicAvailabilityStatus(available, effectiveThreshold);

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
export function aggregateInventoryBalances(records: InventoryRecord[]): {
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  isAnyInStock: boolean;
} {
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
