import type { Order } from '../../types';
import { DEFAULT_LOCATION_ID } from '../inventory';

export interface ResolvedPosInventoryLine {
  sku: string;
  productId: string;
  variantId?: string;
  locationId: string;
  quantity: number;
  operationId: string;
}

/**
 * Resolves a finalized POS order into authoritative inventory sale instructions.
 *
 * Inventory quantity is expressed in base units. Packaging multipliers are already
 * persisted on the POS order line, so this layer validates and converts the selling
 * quantity without consulting or mutating the legacy Product.stock projection.
 */
export function buildPosInventorySaleLines(order: Order, locationId = DEFAULT_LOCATION_ID): ResolvedPosInventoryLine[] {
  if (!order || typeof order.id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(order.id)) {
    throw new Error('A valid POS order ID is required');
  }
  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new Error('A POS order must contain at least one item');
  }
  if (!locationId || locationId.trim().length === 0) {
    throw new Error('A POS inventory location is required');
  }

  return order.items.map((item, index) => {
    const sku = typeof item.variantSku === 'string' && item.variantSku.trim().length > 0
      ? item.variantSku.trim()
      : resolveBaseSku(item.productId, item.productName);
    const multiplier = item.unitMultiplier ?? 1;

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`Invalid POS quantity for line ${index + 1}`);
    }
    if (!Number.isInteger(multiplier) || multiplier <= 0) {
      throw new Error(`Invalid packaging multiplier for line ${index + 1}`);
    }

    const baseQuantity = item.quantity * multiplier;
    if (!Number.isSafeInteger(baseQuantity) || baseQuantity <= 0) {
      throw new Error(`Invalid base-unit quantity for line ${index + 1}`);
    }

    const operationId = `pos_${order.id}_${index + 1}`;
    return {
      sku,
      productId: item.productId,
      locationId: locationId.trim(),
      quantity: baseQuantity,
      operationId,
    };
  });
}

/**
 * Legacy Product has historically stored the sellable SKU at Product.sku, while
 * OrderItem only guarantees productId/productName plus optional variantSku.
 * The server re-resolves the actual inventory SKU; this fallback is deliberately
 * rejected here because productId is not a SKU identity.
 */
function resolveBaseSku(productId: string, productName: string): string {
  throw new Error(
    `POS inventory resolution requires an explicit canonical SKU for product ${productId} (${productName}); product ID/name cannot authorize inventory deduction`,
  );
}
