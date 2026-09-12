import type { Order, Product } from '../../types';
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
 * Inventory quantity is always expressed in base units. The catalog remains the
 * source for SKU identity; Product.stock is never read or mutated here.
 */
export function buildPosInventorySaleLines(order: Order, products: Product[], locationId = DEFAULT_LOCATION_ID): ResolvedPosInventoryLine[] {
  if (!order || typeof order.id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(order.id)) throw new Error('A valid POS order ID is required');
  if (!Array.isArray(order.items) || order.items.length === 0) throw new Error('A POS order must contain at least one item');
  if (!Array.isArray(products)) throw new Error('POS product catalog is required for SKU resolution');
  if (!locationId || locationId.trim().length === 0) throw new Error('A POS inventory location is required');

  return order.items.map((item, index) => {
    const product = products.find(p => p.id === item.productId);
    if (!product) throw new Error(`Product ${item.productId} could not be resolved for POS inventory`);

    const variant = item.variantSku ? product.variants.find(v => v.sku === item.variantSku) : undefined;
    const sku = variant?.sku || product.sku;
    if (!sku || sku.trim().length === 0) throw new Error(`Product ${item.productId} has no canonical SKU`);
    if (item.variantSku && !variant) throw new Error(`Variant SKU ${item.variantSku} could not be resolved for product ${item.productId}`);

    const multiplier = item.unitMultiplier ?? 1;
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new Error(`Invalid POS quantity for line ${index + 1}`);
    if (!Number.isInteger(multiplier) || multiplier <= 0) throw new Error(`Invalid packaging multiplier for line ${index + 1}`);

    const baseQuantity = item.quantity * multiplier;
    if (!Number.isSafeInteger(baseQuantity) || baseQuantity <= 0) throw new Error(`Invalid base-unit quantity for line ${index + 1}`);

    return {
      sku: sku.trim(),
      productId: product.id,
      locationId: locationId.trim(),
      quantity: baseQuantity,
      operationId: `pos_${order.id}_${index + 1}`,
    };
  });
}
