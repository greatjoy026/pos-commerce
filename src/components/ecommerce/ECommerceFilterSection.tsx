import React from 'react';
import { 
  SlidersHorizontal, ArrowUpDown, X, Check, Star, Tag, Sparkles
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest' | 'bestsellers';

export interface FilterState {
  category: string;
  brand: string;
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  minRating: number;
}

interface ECommerceFilterSectionProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  categories: string[];
  brands: string[];
  totalResults: number;
  onResetFilters: () => void;
}

export default function ECommerceFilterSection({
  filters,
  onFilterChange,
  sortBy,
  onSortChange,
  categories,
  brands,
  totalResults,
  onResetFilters
}: ECommerceFilterSectionProps) {
  const { formatAmount } = useCurrency();
  const [isFilterPanelOpen, setIsFilterPanelOpen] = React.useState(false);

  const hasActiveFilters = 
    filters.category !== 'All' || 
    filters.brand !== '' || 
    filters.minPrice > 0 || 
    filters.maxPrice < 1000 || 
    filters.inStockOnly || 
    filters.onSaleOnly || 
    filters.minRating > 0;

  return (
    <div className="space-y-3" id="ecom-filter-sorting-bar">
      
      {/* 1. Bar with Results Count, Mobile Filter Toggle, and Sort Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        
        {/* Left: Total matching products & Quick Pills */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              isFilterPanelOpen || hasActiveFilters
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
            id="btn-toggle-filter-panel"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          <span className="text-xs text-slate-500 font-medium">
            Showing <strong className="font-mono text-slate-900 font-bold">{totalResults}</strong> product{totalResults === 1 ? '' : 's'}
          </span>
        </div>

        {/* Right: Sort By Dropdown */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-400 font-bold hidden sm:inline flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
          </span>

          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="px-3 py-2 bg-slate-100/90 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden cursor-pointer"
            id="ecom-sort-select"
          >
            <option value="featured">Featured & Recommended</option>
            <option value="bestsellers">Best Sellers</option>
            <option value="newest">Newest Arrivals</option>
            <option value="rating">Highest Customer Rating</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* 2. Collapsible Filter Control Panel */}
      {isFilterPanelOpen && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-md space-y-5 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Filter Product Catalog
            </h4>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Category Filter */}
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">Brand</label>
              <select
                value={filters.brand}
                onChange={(e) => onFilterChange({ ...filters, brand: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">All Brands</option>
                {brands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Price Range Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Max Price</label>
                <span className="text-xs font-mono font-bold text-indigo-600">{formatAmount(filters.maxPrice)}</span>
              </div>
              <input
                type="range"
                min={20}
                max={1000}
                step={10}
                value={filters.maxPrice}
                onChange={(e) => onFilterChange({ ...filters, maxPrice: Number(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>$20</span>
                <span>$1,000</span>
              </div>
            </div>

            {/* Toggle Toggles (In Stock, On Sale, 4+ Stars) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Special Attributes</label>
              
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.inStockOnly}
                  onChange={(e) => onFilterChange({ ...filters, inStockOnly: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
                <span>In Stock Only</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.onSaleOnly}
                  onChange={(e) => onFilterChange({ ...filters, onSaleOnly: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
                <span>Discounted / On Sale Only</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.minRating === 4.8}
                  onChange={(e) => onFilterChange({ ...filters, minRating: e.target.checked ? 4.8 : 0 })}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
                <span className="flex items-center gap-1">
                  <span>Top Rated (4.8+</span>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>)</span>
                </span>
              </label>
            </div>

          </div>
        </div>
      )}

      {/* 3. Active Filters Chips / Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Active:</span>

          {filters.category !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-xl text-xs font-medium border border-slate-200">
              <span>Category: {filters.category}</span>
              <button onClick={() => onFilterChange({ ...filters, category: 'All' })} className="hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.brand && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-xl text-xs font-medium border border-slate-200">
              <span>Brand: {filters.brand}</span>
              <button onClick={() => onFilterChange({ ...filters, brand: '' })} className="hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.maxPrice < 1000 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-xl text-xs font-medium border border-slate-200">
              <span>Max: {formatAmount(filters.maxPrice)}</span>
              <button onClick={() => onFilterChange({ ...filters, maxPrice: 1000 })} className="hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.inStockOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200">
              <span>In Stock</span>
              <button onClick={() => onFilterChange({ ...filters, inStockOnly: false })} className="hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.onSaleOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 rounded-xl text-xs font-medium border border-rose-200">
              <span>On Sale</span>
              <button onClick={() => onFilterChange({ ...filters, onSaleOnly: false })} className="hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.minRating > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-xl text-xs font-medium border border-amber-200">
              <span>4.8+ Stars</span>
              <button onClick={() => onFilterChange({ ...filters, minRating: 0 })} className="hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
