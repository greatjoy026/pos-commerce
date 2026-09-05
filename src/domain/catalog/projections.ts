/**
 * Catalog Domain Projections (PROD-001-F1 / SEC-001 / SEC-005)
 *
 * Provides safe public projections of catalog products for the e-commerce storefront.
 * Strictly enforces that internal cost prices, wholesale prices, supplier information,
 * internal serial tracking, batch numbers, and reorder thresholds are never exposed.
 */

export {
  toPublicCatalogProjection,
  toPOSProductView,
  computePublicAvailabilityStatus,
  DEFAULT_LOW_STOCK_THRESHOLD
} from '../product/projections';
