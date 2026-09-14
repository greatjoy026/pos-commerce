/**
 * Authoritative POS Inventory Service (POS-001)
 *
 * Client-side transaction adapter that proxies POS sales requests to the
 * server-side trusted Cloud Function `recordPosSale`.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';
import type { RecordPosSaleRequest, RecordPosSaleResult } from '../domain/pos/inventoryResolution';

export type { RecordPosSaleRequest, RecordPosSaleResult, PosSaleLineRequest, PosSaleLineResult } from '../domain/pos/inventoryResolution';

/**
 * Executes a multi-line POS inventory sale transaction through the server-side trusted boundary.
 */
export async function executePosSaleTransaction(
  request: RecordPosSaleRequest
): Promise<RecordPosSaleResult> {
  if (!request || !request.orderId || !Array.isArray(request.lines)) {
    throw new Error('Invalid POS sale request structure');
  }

  // If basket contains only custom / service items (0 physical inventory lines)
  if (request.lines.length === 0) {
    return {
      orderId: request.orderId,
      success: true,
      lineResults: [],
      timestamp: new Date().toISOString()
    };
  }

  const functionsInstance = getFunctions(app);
  const callable = httpsCallable<RecordPosSaleRequest, RecordPosSaleResult>(
    functionsInstance,
    'recordPosSale'
  );

  const response = await callable(request);
  return response.data;
}

