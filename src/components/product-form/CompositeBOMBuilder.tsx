import React, { useState, useMemo } from 'react';
import { Product, ProductComponentItem } from '../../types';
import { 
  Package, Plus, Trash2, Search, AlertCircle, CheckCircle2, 
  Layers, ArrowRight, DollarSign, Calculator, Sparkles, Filter,
  Box, AlertTriangle, RefreshCw, X, Info, Tag
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

interface CompositeBOMBuilderProps {
  components: ProductComponentItem[];
  setComponents: (comps: ProductComponentItem[] | ((prev: ProductComponentItem[]) => ProductComponentItem[])) => void;
  availableProducts: Product[];
  currentProductId?: string;
  onSyncCost?: (totalCost: number) => void;
  onSyncStock?: (maxStock: number) => void;
  productType: 'Composite' | 'Bundle' | string;
}

export default function CompositeBOMBuilder({
  components,
  setComponents,
  availableProducts = [],
  currentProductId,
  onSyncCost,
  onSyncStock,
  productType
}: CompositeBOMBuilderProps) {
  const { currencySymbol, formatAmount } = useCurrency();

  // Search & Catalog Picker
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('All');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Eligible products to add as components (exclude the product being edited)
  const eligibleProducts = useMemo(() => {
    return availableProducts.filter(p => {
      if (currentProductId && p.id === currentProductId) return false;
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = selectedCatFilter === 'All' || p.category === selectedCatFilter;
      return matchesSearch && matchesCat;
    });
  }, [availableProducts, currentProductId, searchTerm, selectedCatFilter]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    availableProducts.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return ['All', ...Array.from(cats)];
  }, [availableProducts]);

  // Add a product to the BOM recipe
  const handleAddComponent = (product: Product) => {
    const existingIndex = components.findIndex(c => c.productId === product.id || c.sku === product.sku);
    if (existingIndex >= 0) {
      // Increment quantity
      const updated = [...components];
      updated[existingIndex].quantity += 1;
      setComponents(updated);
    } else {
      const newItem: ProductComponentItem = {
        id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: 1,
        unitCost: product.cost || 0,
        unitPrice: product.price || 0,
        currentStock: product.stock || 0,
        imageUrl: product.imageUrl
      };
      setComponents([...components, newItem]);
    }
  };

  // Update component quantity
  const handleUpdateQuantity = (index: number, newQty: number) => {
    const qty = Math.max(1, Math.floor(newQty || 1));
    const updated = [...components];
    updated[index] = { ...updated[index], quantity: qty };
    setComponents(updated);
  };

  // Remove component
  const handleRemoveComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  // Calculate Rollup Totals
  const totalRecipeCost = useMemo(() => {
    return components.reduce((sum, c) => sum + (c.unitCost * c.quantity), 0);
  }, [components]);

  const totalIndividualRetail = useMemo(() => {
    return components.reduce((sum, c) => sum + (c.unitPrice * c.quantity), 0);
  }, [components]);

  // Calculate Max Sellable / Assemble-able Packages
  const { maxAssembleableStock, bottleneckItem } = useMemo(() => {
    if (components.length === 0) return { maxAssembleableStock: 0, bottleneckItem: null };
    
    let minLimit = Infinity;
    let bottleneck: ProductComponentItem | null = null;

    components.forEach(c => {
      const possibleSets = Math.floor(c.currentStock / Math.max(1, c.quantity));
      if (possibleSets < minLimit) {
        minLimit = possibleSets;
        bottleneck = c;
      }
    });

    return {
      maxAssembleableStock: minLimit === Infinity ? 0 : Math.max(0, minLimit),
      bottleneckItem: bottleneck
    };
  }, [components]);

  const isBundle = productType === 'Bundle';

  return (
    <div className="space-y-6" id="composite-bom-builder">
      {/* Header Banner */}
      <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
              <span>{isBundle ? 'Bundle / Kit Composition' : 'Bill of Materials (BOM) & Recipe'}</span>
              <span className="px-2 py-0.5 bg-indigo-200/70 text-indigo-900 text-[10px] font-mono font-bold rounded-md">
                {productType.toUpperCase()} ARCHITECTURE
              </span>
            </h4>
            <p className="text-xs text-indigo-800/80 mt-0.5">
              {isBundle
                ? 'Attach existing catalog products sold together as a discounted commercial bundle. Stock decrements upon checkout.'
                : 'Define the sub-components and raw assemblies required to build this composite finished good.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsPickerOpen(!isPickerOpen)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          id="btn-open-component-picker"
        >
          <Plus className="w-4 h-4" />
          <span>{isPickerOpen ? 'Close Catalog Picker' : '+ Add Components'}</span>
        </button>
      </div>

      {/* Catalog Item Picker Drawer / Inline Panel */}
      {isPickerOpen && (
        <div className="p-4.5 bg-slate-900 text-white rounded-2xl shadow-xl space-y-4 border border-slate-800 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Select Components from Inventory Catalog
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPickerOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search and Category Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-8 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search component by name, SKU or keyword..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-4">
              <select
                value={selectedCatFilter}
                onChange={(e) => setSelectedCatFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Eligible items list */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {eligibleProducts.length > 0 ? (
              eligibleProducts.map(prod => {
                const isAlreadyIn = components.some(c => c.productId === prod.id || c.sku === prod.sku);
                return (
                  <div
                    key={prod.id}
                    className="p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover bg-slate-700 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 text-xs shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{prod.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                          <span>{prod.sku}</span>
                          <span>•</span>
                          <span>Cost: {formatAmount(prod.cost)}</span>
                          <span>•</span>
                          <span className={prod.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            Stock: {prod.stock}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddComponent(prod)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                        isAlreadyIn
                          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/50'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAlreadyIn ? '+ Add More' : '+ Add Item'}</span>
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                No catalog items match your search. Try a different query or category filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bill of Materials Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-indigo-600" />
            <span>Recipe Components Table ({components.length} items configured)</span>
          </h4>
          <span className="text-[11px] text-slate-500">
            Deducts each component's stock automatically when sold
          </span>
        </div>

        {components.length > 0 ? (
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3.5">Component Item & SKU</th>
                    <th className="py-3 px-3">Req. Qty / Unit</th>
                    <th className="py-3 px-3">Unit Cost</th>
                    <th className="py-3 px-3">Total Cost</th>
                    <th className="py-3 px-3">Unit Retail</th>
                    <th className="py-3 px-3">Current Stock</th>
                    <th className="py-3 px-3">Max Packages</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {components.map((comp, idx) => {
                    const lineCost = comp.unitCost * comp.quantity;
                    const lineRetail = comp.unitPrice * comp.quantity;
                    const maxSets = Math.floor(comp.currentStock / Math.max(1, comp.quantity));
                    const isBottleneck = bottleneckItem?.sku === comp.sku;

                    return (
                      <tr 
                        key={comp.id || idx}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          isBottleneck ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Name & SKU */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            {comp.imageUrl ? (
                              <img src={comp.imageUrl} alt="" className="w-7 h-7 rounded-md object-cover bg-slate-100 shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <Package className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{comp.name}</span>
                              <span className="font-mono text-[10px] text-slate-500 block">{comp.sku}</span>
                            </div>
                          </div>
                        </td>

                        {/* Quantity in recipe */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, comp.quantity - 1)}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={comp.quantity}
                              onChange={(e) => handleUpdateQuantity(idx, parseInt(e.target.value) || 1)}
                              className="w-12 py-1 px-1 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, comp.quantity + 1)}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Unit Cost */}
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {formatAmount(comp.unitCost)}
                        </td>

                        {/* Total Cost Contribution */}
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {formatAmount(lineCost)}
                        </td>

                        {/* Unit Retail */}
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {formatAmount(lineRetail)}
                        </td>

                        {/* Current Inventory Balance */}
                        <td className="py-3 px-3">
                          <span className={`font-mono text-xs font-bold ${
                            comp.currentStock <= 5 ? 'text-rose-600' : 'text-emerald-700'
                          }`}>
                            {comp.currentStock} in stock
                          </span>
                        </td>

                        {/* Max Packages supported by this component */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-800">
                              {maxSets}
                            </span>
                            {isBottleneck && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded-sm" title="Limiting inventory bottleneck">
                                Bottleneck
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Remove */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveComponent(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove Component"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3 bg-slate-50/50">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-800">No Recipe Components Configured</h5>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
                Click the "+ Add Components" button above to select raw parts or packaged items that make up this {productType.toLowerCase()}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 active:scale-95 transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Open Catalog Picker</span>
            </button>
          </div>
        )}
      </div>

      {/* Live Mathematical Telemetry Cards */}
      {components.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          {/* Card 1: Total BOM Cost */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Total Component Cost</span>
              <DollarSign className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-extrabold font-mono text-slate-900">
              {formatAmount(totalRecipeCost)}
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-[10px] text-slate-400">Sum of raw components</span>
              {onSyncCost && (
                <button
                  type="button"
                  onClick={() => onSyncCost(totalRecipeCost)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                  title="Apply this exact cost to the product Cost Price in Step 4"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Sync Cost</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Individual Retail Sum */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Separate Retail Value</span>
              <Tag className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold font-mono text-slate-900">
              {formatAmount(totalIndividualRetail)}
            </div>
            <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
              Value if customer purchased each item separately
            </p>
          </div>

          {/* Card 3: Real-Time Assembly Stock */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Sellable Stock Limit</span>
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-extrabold font-mono text-slate-900 flex items-center gap-2">
              <span>{maxAssembleableStock} units</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-[10px] text-amber-700 truncate max-w-[130px]" title={bottleneckItem ? `Limited by ${bottleneckItem.name}` : ''}>
                {bottleneckItem ? `Limited by ${bottleneckItem.sku}` : 'All components available'}
              </span>
              {onSyncStock && (
                <button
                  type="button"
                  onClick={() => onSyncStock(maxAssembleableStock)}
                  className="text-[11px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1"
                  title="Apply sellable stock limit to Master Stock"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync Stock</span>
                </button>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
