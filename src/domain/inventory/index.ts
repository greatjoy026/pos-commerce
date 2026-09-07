/**
 * Authoritative Inventory Domain Module (INV-001)
 *
 * Public API for the Canonical Inventory Domain:
 * Product -> Variant -> SKU -> Inventory
 *
 * Owns operational stock state, on-hand balances, reservations, locations,
 * and operational thresholds independently from catalog merchandising entities.
 */

export * from './types';
export * from './validation';
export * from './projections';
export * from './adapters';
