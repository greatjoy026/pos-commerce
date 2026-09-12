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

import { PublicAvailabilityInfo, PublicAvailabilityStatus } from '../product/types';

/**
 * Supported stock tracking modes for inventory units.
 * - 'QUANTITY': Standard bulk/unit quantity tracking.
 * - 'SERIAL': Individual piece tracking with serial numbers.
 * - 'BATCH': Batch/lot tracking with expiration date.
 * - 'NONE': Non-stocked services, digital goods, or unmetered items.
 */
export type InventoryTrackingMode = 'QUANTITY' | 'SERIAL' | 'BATCH' | 'NONE';

/**
 * Lifecycle status of an inventory record.
 * - 'ACTIVE': Actively tracked and available for sales/replenishment.
 * - 'INACTIVE': Archived, deprecated, or deactivated inventory pool.
 */
export type InventoryStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Standard default location identifier.
 * Location management is planned for a future domain; locationId provides the architectural anchor.
 */
export const DEFAULT_LOCATION_ID = 'loc-main-store';

/**
 * Authoritative Canonical Inventory Record Entity.
 * Owns physical on-hand quantity, reservations, operational thresholds, and storage locations.
 */
export interface InventoryRecord {
  /** Unique inventory record identifier (e.g. "inv-bg-canvas-01-loc-main-store") */
  id: string;

  /**
   * The authoritative sellable SKU this inventory record is bound to.
   * Links directly to Product.sku or Variant.sku. Never creates a separate SKU identity.
   */
  sku: string;

  /** Reference to the parent CanonicalProduct ID */
  productId: string;

  /** Reference to the parent CanonicalVariant ID (if this SKU represents a variant) */
  variantId?: string;

  /** Standardized location identifier (e.g. "loc-main-store", "loc-warehouse-a") */
  locationId: string;

  /** Total physical quantity on-hand at this location (strictly non-negative integer: >= 0, integer) */
  quantityOnHand: number;

  /** Quantity allocated to active reservations/pending orders (strictly non-negative integer: >= 0, <= quantityOnHand, integer) */
  quantityReserved: number;

  /** Minimum threshold triggering reorder advisories (when set, strictly non-negative integer: >= 0, integer) */
  reorderPoint?: number;

  /** Suggested replenishment order batch quantity (when set, strictly non-negative integer: >= 0, integer) */
  reorderQuantity?: number;

  /** Stock tracking methodology */
  trackingMode: InventoryTrackingMode;

  /** Inventory record status */
  status: InventoryStatus;

  /**
   * Serial identifiers registered to this SKU/location (when trackingMode === 'SERIAL').
   * Cardinality invariant: serialNumbers.length === quantityOnHand.
   * Every serial number must be a non-empty string. Duplicates are strictly rejected.
   */
  serialNumbers?: string[];

  /**
   * Batch/lot identifier (when trackingMode === 'BATCH').
   * Mandatory non-empty string.
   */
  batchNumber?: string;

  /**
   * Expiration date in ISO 8601 format (when trackingMode === 'BATCH').
   * Note: Enforced with semantic ISO validation in TypeScript domain;
   * enforced structurally as bounded string in Firestore security rules.
   */
  expiryDate?: string;

  /** ISO timestamp when record was created */
  createdAt: string;

  /** ISO timestamp when record was last updated */
  updatedAt: string;
}

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
export function calculateAvailableQuantity(record: Pick<InventoryRecord, 'quantityOnHand' | 'quantityReserved'>): number {
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
export function getInventoryRecordKey(
  record: Pick<InventoryRecord, 'sku' | 'locationId'> & Partial<Pick<InventoryRecord, 'trackingMode' | 'batchNumber'>>
): string {
  const sku = typeof record.sku === 'string' ? record.sku.trim().toUpperCase() : '';
  const locationId = typeof record.locationId === 'string' ? record.locationId.trim().toLowerCase() : '';

  if (record.trackingMode === 'BATCH') {
    const batch = typeof record.batchNumber === 'string' ? record.batchNumber.trim().toUpperCase() : '';
    return `${sku}::${locationId}::${batch}`;
  }

  return `${sku}::${locationId}`;
}

/**
 * Internal Operational Inventory Projection.
 * Safe for internal staff, POS terminals, and inventory management views.
 */
export interface InventoryOperationalProjection {
  sku: string;
  productId: string;
  variantId?: string;
  locationId: string;
  /** Physical on-hand quantity (non-negative integer) */
  quantityOnHand: number;
  /** Reserved quantity (non-negative integer) */
  quantityReserved: number;
  /** Derived available quantity (non-negative integer: onHand - reserved) */
  availableQuantity: number;
  /** Reorder point threshold (when set, non-negative integer) */
  reorderPoint?: number;
  /** Reorder batch quantity (when set, non-negative integer) */
  reorderQuantity?: number;
  trackingMode: InventoryTrackingMode;
  status: InventoryStatus;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

/**
 * Public Inventory Availability Projection.
 * Safe for customer-facing e-commerce storefronts.
 *
 * SECURITY BOUNDARY:
 * Strictly exposes ONLY the categorical availability status.
 * NEVER exposes raw numbers: quantityOnHand, quantityReserved, availableQuantity,
 * reorderPoint, locationId, costs, or supplier info.
 */
export interface PublicInventoryAvailability {
  sku: string;
  availability: PublicAvailabilityInfo;
}

/**
 * Future Architecture Documentation:
 * Controlled Inventory Movements / Ledger Transactions.
 *
 * Inventory balance changes in future phases will be produced via immutable
 * ledger movements rather than arbitrary balance overwrite.
 */
export type InventoryMovementType =
  | 'PURCHASE_RECEIPT'  // Stock received from supplier
  | 'SALE'              // Stock consumed by customer purchase
  | 'RETURN'            // Stock returned to inventory
  | 'ADJUSTMENT'        // Cycle count / discrepancy correction
  | 'TRANSFER';         // Inter-location inventory movement

export interface InventoryMovementRecord {
  id: string;
  inventoryId: string;
  sku: string;
  productId: string;
  variantId?: string;
  locationId: string;
  movementType: InventoryMovementType;
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceId?: string; // Order ID, Purchase Order ID, Transfer ID
  performedBy: string;  // Staff ID
  timestamp: string;
  reason?: string;
}
