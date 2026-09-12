/**
 * Authoritative Location & Multi-Location Utility Functions
 *
 * Provides normalized extraction and breakdown of stock across physical locations/facilities.
 */

export interface LocationStockDetail {
  location: string;
  stock: number;
  reorderPoint?: number;
}

/**
 * Extracts a deduplicated array of locations where a product is stocked.
 * Supports:
 * 1. Explicit `locations` array
 * 2. `locationStock` array of location items
 * 3. Comma-, slash-, or semicolon-separated `location` string (e.g. "Store Shelf, Warehouse")
 * 4. Single location string (e.g. "Warehouse")
 */
export function getProductLocations(product?: {
  location?: string;
  locations?: string[];
  locationStock?: LocationStockDetail[];
} | null): string[] {
  if (!product) return ['Store Shelf'];

  const foundLocations: string[] = [];

  // 1. Array of locations if provided
  if (Array.isArray(product.locations) && product.locations.length > 0) {
    product.locations.forEach(loc => {
      if (typeof loc === 'string' && loc.trim()) {
        foundLocations.push(loc.trim());
      }
    });
  }

  // 2. locationStock entries
  if (Array.isArray(product.locationStock) && product.locationStock.length > 0) {
    product.locationStock.forEach(item => {
      if (item?.location && typeof item.location === 'string' && item.location.trim()) {
        foundLocations.push(item.location.trim());
      }
    });
  }

  // 3. Delimited location string (e.g., "Store Shelf, Warehouse" or "Store Shelf / Warehouse")
  if (product.location && typeof product.location === 'string') {
    const parts = product.location.split(/[,/|;]/);
    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed) foundLocations.push(trimmed);
    });
  }

  const unique = Array.from(new Set(foundLocations));
  return unique.length > 0 ? unique : ['Store Shelf'];
}

/**
 * Returns inventory balance breakdown for each facility where a product is stored.
 * If granular `locationStock` is not provided, distributes the total stock proportionally
 * across all identified facilities.
 */
export function getProductLocationStock(product: {
  location?: string;
  locations?: string[];
  locationStock?: LocationStockDetail[];
  stock: number;
  reorderPoint?: number;
}): LocationStockDetail[] {
  if (Array.isArray(product.locationStock) && product.locationStock.length > 0) {
    return product.locationStock;
  }

  const locs = getProductLocations(product);
  if (locs.length <= 1) {
    return [
      {
        location: locs[0] || 'Store Shelf',
        stock: product.stock,
        reorderPoint: product.reorderPoint,
      },
    ];
  }

  // If multiple locations exist but no explicit breakdown is present,
  // distribute the total stock across locations.
  const total = Math.max(0, product.stock);
  const count = locs.length;
  const baseQty = Math.floor(total / count);
  const remainder = total % count;

  return locs.map((loc, index) => ({
    location: loc,
    stock: index === 0 ? baseQty + remainder : baseQty,
    reorderPoint: product.reorderPoint ? Math.ceil(product.reorderPoint / count) : undefined,
  }));
}

/**
 * Checks if a product is present in a given target location name (case-insensitive).
 */
export function isProductInLocation(
  product: {
    location?: string;
    locations?: string[];
    locationStock?: LocationStockDetail[];
  },
  targetLocation: string
): boolean {
  if (!targetLocation || targetLocation === 'All') return true;
  const locs = getProductLocations(product);
  const normTarget = targetLocation.toLowerCase().trim();
  return locs.some(loc => loc.toLowerCase().trim() === normTarget);
}
