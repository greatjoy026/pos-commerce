import type { Order, Product } from '../../types';
import type { CanonicalProduct, CanonicalVariant, PackagingUnitInfo } from '../product/types';
import { hasCanonicalProduct } from '../product/projections';

export interface ResolvedPosInventoryLine {
  sku: string;
  productId: string;
  variantId?: string;
  quantity: number;
  operationId: string;
}

type LegacyPackagingUnit = { id?: string; unitName?: string; name?: string; multiplier?: number; sku?: string };

function getCanonicalProduct(product: Product): CanonicalProduct | undefined {
  return hasCanonicalProduct(product) ? product.canonical : undefined;
}

function getVariant(product: Product, variantSku?: string): CanonicalVariant | Product['variants'][number] | undefined {
  if (!variantSku) return undefined;
  const canonical = getCanonicalProduct(product);
  if (canonical) return canonical.variants.find(v => v.sku.trim().toLowerCase() === variantSku.trim().toLowerCase());
  return product.variants.find(v => v.sku.trim().toLowerCase() === variantSku.trim().toLowerCase());
}

function getPackagingUnits(product: Product): Array<PackagingUnitInfo | LegacyPackagingUnit> {
  const canonical = getCanonicalProduct(product);
  if (canonical) return canonical.packagingUnits || [];
  if (Array.isArray(product.packagingUnits)) return product.packagingUnits as LegacyPackagingUnit[];
  if (Array.isArray(product.packaging?.packagingUnits)) return product.packaging.packagingUnits as LegacyPackagingUnit[];
  return [];
}

function resolvePackagingMultiplier(product: Product, item: Order['items'][number], lineIndex: number): number {
  const requestedMultiplier = item.unitMultiplier;
  const packagingName = item.packagingUnitName?.trim();
  let catalogMultiplier = 1;

  if (packagingName) {
    const unit = getPackagingUnits(product).find(candidate => {
      const name = 'unitName' in candidate ? candidate.unitName : candidate.name;
      return typeof name === 'string' && name.trim().toLowerCase() === packagingName.toLowerCase();
    });
    if (!unit) throw new Error(`Packaging unit ${packagingName} could not be resolved for product ${product.id}`);
    catalogMultiplier = Number('multiplier' in unit ? unit.multiplier : 1);
    if (!Number.isInteger(catalogMultiplier) || catalogMultiplier <= 0) throw new Error(`Invalid catalog packaging multiplier for line ${lineIndex + 1}`);
  }

  if (requestedMultiplier !== undefined && (!Number.isInteger(requestedMultiplier) || requestedMultiplier <= 0)) throw new Error(`Invalid POS packaging multiplier for line ${lineIndex + 1}`);
  if (requestedMultiplier !== undefined && requestedMultiplier !== catalogMultiplier) throw new Error(`POS packaging multiplier does not match the catalog for line ${lineIndex + 1}`);
  return catalogMultiplier;
}

/** Resolves POS inventory identity and base-unit quantity. Location is server-authoritative. */
export function buildPosInventorySaleLines(order: Order, products: Product[]): ResolvedPosInventoryLine[] {
  if (!order || typeof order.id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(order.id)) throw new Error('A valid POS order ID is required');
  if (!Array.isArray(order.items) || order.items.length === 0) throw new Error('A POS order must contain at least one item');
  if (!Array.isArray(products)) throw new Error('POS product catalog is required for SKU resolution');

  return order.items.map((item, index) => {
    const product = products.find(p => p.id === item.productId);
    if (!product && item.productId.startsWith('prod-custom-')) return null;
    if (!product) throw new Error(`Product ${item.productId} could not be resolved for POS inventory`);
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new Error(`Invalid POS quantity for line ${index + 1}`);

    const variant = getVariant(product, item.variantSku);
    if (item.variantSku && !variant) throw new Error(`Variant SKU ${item.variantSku} could not be resolved for product ${product.id}`);

    const canonical = getCanonicalProduct(product);
    const canonicalVariant = variant && 'attributes' in variant && 'productId' in variant ? variant as CanonicalVariant : undefined;
    const sku = canonicalVariant?.sku?.trim() || variant?.sku?.trim() || (item.variantSku ? '' : canonical?.sku?.trim() || product.sku?.trim());
    if (!sku) throw new Error(`Product ${product.id} has no canonical SKU for the selected sellable unit`);

    const multiplier = resolvePackagingMultiplier(product, item, index);
    const baseQuantity = item.quantity * multiplier;
    if (!Number.isSafeInteger(baseQuantity) || baseQuantity <= 0) throw new Error(`Invalid base-unit quantity for line ${index + 1}`);

    const variantId = canonicalVariant?.id || (variant && 'id' in variant ? variant.id : undefined);
    return { sku, productId: canonical?.id || product.id, ...(variantId ? { variantId } : {}), quantity: baseQuantity, operationId: `pos_${order.id}_${index + 1}` };
  }).filter((line): line is ResolvedPosInventoryLine => line !== null);
}
