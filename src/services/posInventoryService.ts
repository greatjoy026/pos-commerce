import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';
import { buildPosInventorySaleLines, type ResolvedPosInventoryLine } from '../domain/pos/inventoryResolution';
import type { Order, Product } from '../types';

export interface PosInventorySaleLine extends ResolvedPosInventoryLine {}

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
  lines: PosInventorySaleLine[];
}

const functions = getFunctions(app);
const recordPosSale = httpsCallable<CallableRequest, PosInventorySaleResult>(functions, 'recordPosSale');

/** Calls the trusted POS inventory boundary. The client never supplies a location or inventory document ID. */
export async function recordPosInventorySale(orderId: string, lines: PosInventorySaleLine[]): Promise<PosInventorySaleResult> {
  if (!orderId || !/^[A-Za-z0-9_-]+$/.test(orderId)) throw new Error('POS inventory sale requires a valid order ID');
  if (!Array.isArray(lines)) throw new Error('POS inventory sale requires inventory sale lines');
  if (lines.length === 0) return { orderId, actorId: 'non-inventory-sale', lines: [] };

  const response = await recordPosSale({ orderId, lines });
  return response.data;
}

/** Preferred POS integration entry point: canonical SKU/variant + catalog packaging conversion. */
export async function recordPosOrderInventorySale(order: Order, products: Product[]): Promise<PosInventorySaleResult> {
  const lines = buildPosInventorySaleLines(order, products);
  return recordPosInventorySale(order.id, lines);
}
