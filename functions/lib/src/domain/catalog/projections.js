"use strict";
/**
 * Catalog Domain Projections (PROD-001-F1 / SEC-001 / SEC-005)
 *
 * Provides safe public projections of catalog products for the e-commerce storefront.
 * Strictly enforces that internal cost prices, wholesale prices, supplier information,
 * internal serial tracking, batch numbers, and reorder thresholds are never exposed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LOW_STOCK_THRESHOLD = exports.computePublicAvailabilityStatus = exports.toPOSProductView = exports.toPublicCatalogProjection = void 0;
var projections_1 = require("../product/projections");
Object.defineProperty(exports, "toPublicCatalogProjection", { enumerable: true, get: function () { return projections_1.toPublicCatalogProjection; } });
Object.defineProperty(exports, "toPOSProductView", { enumerable: true, get: function () { return projections_1.toPOSProductView; } });
Object.defineProperty(exports, "computePublicAvailabilityStatus", { enumerable: true, get: function () { return projections_1.computePublicAvailabilityStatus; } });
Object.defineProperty(exports, "DEFAULT_LOW_STOCK_THRESHOLD", { enumerable: true, get: function () { return projections_1.DEFAULT_LOW_STOCK_THRESHOLD; } });
//# sourceMappingURL=projections.js.map