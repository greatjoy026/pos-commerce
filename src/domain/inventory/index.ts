/**
 * Authoritative Inventory Domain Module (INV-001 / INV-002)
 *
 * Product -> Variant -> SKU -> Inventory remains the ownership boundary.
 * InventoryRecord owns current stock state; InventoryMovementRecord records
 * immutable state changes produced by the transactional movement service.
 */

export * from './types';
export * from './validation';
export * from './projections';
export * from './adapters';
export * from './movements';
