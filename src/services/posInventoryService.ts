import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';
import { buildPosInventorySaleLines } from '../domain/pos/inventoryResolution';
import type { Order, Product } from '../types';

export interface PosInventorySaleLine {
  sku: string;
  productId: string;
  variantId?: string;
  locationId?: string;
  quantity: number;
  operationId: string;
}

export interface PosInventorySaleResultLine {
  operationId: string;
  inventoryId: string;
  sku: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  availableQuantityAfter: number;
  movementId: string;
}

export interface PosInventorySaleResult {
  orderId: string;
  actorId: string;
  lines: PosInventorySaleResultLine[];
}

interface CallableRequest {
  orderId: string;
  lines: Array<PosInventorySaleLine & { locationId: string }>;
}

const functions = getFunctions(app);
const recordPosSale = httpsCallable<CallableRequest, PosInventorySaleResult>(functions, 'recordPosSale');

/**
 * Resolves a finalized POS order against the canonical catalog and records its
 * inventory SALE movements through the trusted server boundary.
 */
export async function recordPosInventorySale(
  orderId: string,
  lines: PosInventorySaleLine[],
): Promise<PosInventorySaleResult> {
  if (!orderId || !/^[A-Za-z0-9_-]+$/.test(orderId)) throw new Error('POS inventory sale requires a valid order ID');
  if (!Array.isArray(lines)) throw new Error('POS inventory sale requires inventory sale lines');
  if (lines.length === 0) return { orderId, actorId: 'non-inventory-sale', lines: [] };

  const normalizedLines = lines.map(line => ({ ...line, locationId: line.locationId?.trim() || 'loc-main-store' }));
  const response = await recordPosSale({ orderId, lines: normalizedLines });
  return response.data;
}

/**
 * Preferred POS integration entry point. It derives canonical SKU and base-unit
 * quantities from the same Product/Variant/Packaging model used by the POS.
 */
export async function recordPosOrderInventorySale(
  order: Order,
  products: Product[],
  locationId?: string,
): Promise<PosInventorySaleResult> {
  const lines = buildPosInventorySaleLines(order, products, locationId);
  return recordPosInventorySale(order.id, lines);
}
