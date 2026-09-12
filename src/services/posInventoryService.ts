import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';
import { DEFAULT_LOCATION_ID } from '../domain/inventory';

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
 * Resolves POS sale lines to authoritative inventory and records the SALE movement.
 *
 * The browser intentionally does not supply an inventory document ID or stock
 * balance. Location defaults to the single currently supported POS location until
 * the Location/Store domain provides an explicit terminal location binding.
 */
export async function recordPosInventorySale(
  orderId: string,
  lines: PosInventorySaleLine[],
): Promise<PosInventorySaleResult> {
  if (!orderId || !/^[A-Za-z0-9_-]+$/.test(orderId)) {
    throw new Error('POS inventory sale requires a valid order ID');
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error('POS inventory sale requires at least one line');
  }

  const normalizedLines = lines.map((line) => ({
    ...line,
    locationId: line.locationId?.trim() || DEFAULT_LOCATION_ID,
  }));

  const response = await recordPosSale({ orderId, lines: normalizedLines });
  return response.data;
}
