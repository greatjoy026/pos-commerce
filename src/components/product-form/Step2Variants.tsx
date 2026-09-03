import React, { useState } from 'react';
import { ProductVariant, ProductComponentItem, Product, ProductType } from '../../types';
import { 
  Layers, Plus, Trash2, Sparkles, RefreshCw, Check, 
  HelpCircle, Sliders, ChevronDown, ChevronUp, AlertCircle, Copy,
  X, Palette, Ruler, Box, Tag, DollarSign, PackageCheck, Wrench
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import CompositeBOMBuilder from './CompositeBOMBuilder';

interface Step2VariantsProps {
  hasVariants: boolean;
  setHasVariants: (v: boolean) => void;
  variants: ProductVariant[];
  setVariants: (v: ProductVariant[]) => void;
  baseSku: string;
  basePrice: number;
  baseCost: number;
  selectedSizes: string[];
  setSelectedSizes: React.Dispatch<React.SetStateAction<string[]>>;
  customSizesList: string[];
  setCustomSizesList: React.Dispatch<React.SetStateAction<string[]>>;
  selectedColors: string[];
  setSelectedColors: React.Dispatch<React.SetStateAction<string[]>>;
  customColorsList: { name: string; hex: string }[];
  setCustomColorsList: React.Dispatch<React.SetStateAction<{ name: string; hex: string }[]>>;
  enableModels: boolean;
  setEnableModels: React.Dispatch<React.SetStateAction<boolean>>;
  selectedModels: string[];
  setSelectedModels: React.Dispatch<React.SetStateAction<string[]>>;
  customModelsList: string[];
  setCustomModelsList: React.Dispatch<React.SetStateAction<string[]>>;
  // Enhanced Composite / Bundle Props
  productType?: ProductType;
  components?: ProductComponentItem[];
  setComponents?: (comps: ProductComponentItem[] | ((prev: ProductComponentItem[]) => ProductComponentItem[])) => void;
  availableProducts?: Product[];
  currentProductId?: string;
  onSyncCost?: (totalCost: number) => void;
  onSyncStock?: (maxStock: number) => void;
}

const DEFAULT_PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'One Size', '38mm', '40mm', '42mm', '44mm', '64GB', '128GB', '256GB', '512GB', '1TB'];

const DEFAULT_PRESET_COLORS = [
  { name: 'Midnight Black', hex: '#1e293b' },
  { name: 'Platinum Silver', hex: '#94a3b8' },
  { name: 'Alpine White', hex: '#f8fafc', border: true },
  { name: 'Navy Blue', hex: '#1e3a8a' },
  { name: 'Crimson Red', hex: '#dc2626' },
  { name: 'Forest Green', hex: '#15803d' },
  { name: 'Rose Gold', hex: '#f43f5e' },
  { name: 'Space Gray', hex: '#475569' },
  { name: 'Charcoal', hex: '#334155' }
];

const DEFAULT_PRESET_MODELS = ['Standard', 'Pro', 'Titanium Edition', 'Max', 'Plus', 'Ultra', 'Leather Trim'];

export default function Step2Variants({
  hasVariants,
  setHasVariants,
  variants,
  setVariants,
  baseSku,
  basePrice,
  baseCost,
  selectedSizes,
  setSelectedSizes,
  customSizesList,
  setCustomSizesList,
  selectedColors,
  setSelectedColors,
  customColorsList,
  setCustomColorsList,
  enableModels,
  setEnableModels,
  selectedModels,
  setSelectedModels,
  customModelsList,
  setCustomModelsList,
  productType = 'Standard',
  components = [],
  setComponents,
  availableProducts = [],
  currentProductId,
  onSyncCost,
  onSyncStock
}: Step2VariantsProps) {
  const { currencySymbol, formatAmount } = useCurrency();

  // Mode: 'variants' | 'bom'
  const isCompositeOrBundle = productType === 'Composite' || productType === 'Bundle';
  const [activeTabMode, setActiveTabMode] = useState<'variants' | 'bom'>(
    isCompositeOrBundle ? 'bom' : 'variants'
  );

  // Input fields for adding new custom attributes
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#6366f1');
  const [customModelInput, setCustomModelInput] = useState('');

  // Single manual variant adder state
  const [singleSku, setSingleSku] = useState('');
  const [singleSize, setSingleSize] = useState('');
  const [singleColor, setSingleColor] = useState('');
  const [singleModel, setSingleModel] = useState('');
  const [singleStock, setSingleStock] = useState<number>(10);
  const [singlePrice, setSinglePrice] = useState<number>(basePrice);

  // Bulk tools state
  const [bulkStockValue, setBulkStockValue] = useState<number>(10);
  const [bulkPriceValue, setBulkPriceValue] = useState<number>(basePrice);

  // Add custom size
  const handleAddCustomSize = () => {
    if (!customSizeInput.trim()) return;
    const clean = customSizeInput.trim();
    if (!customSizesList.includes(clean) && !DEFAULT_PRESET_SIZES.includes(clean)) {
      setCustomSizesList(prev => [...prev, clean]);
    }
    if (!selectedSizes.includes(clean)) {
      setSelectedSizes(prev => [...prev, clean]);
    }
    setCustomSizeInput('');
  };

  const removeCustomSize = (sz: string) => {
    setCustomSizesList(prev => prev.filter(s => s !== sz));
    setSelectedSizes(prev => prev.filter(s => s !== sz));
  };

  // Toggle size selection
  const toggleSize = (sz: string) => {
    setSelectedSizes(prev => 
      prev.includes(sz) ? prev.filter(s => s !== sz) : [...prev, sz]
    );
  };

  // Add custom color
  const handleAddCustomColor = () => {
    if (!customColorName.trim()) return;
    const cleanName = customColorName.trim();
    const cleanHex = customColorHex || '#6366f1';
    
    if (!customColorsList.some(c => c.name.toLowerCase() === cleanName.toLowerCase())) {
      setCustomColorsList(prev => [...prev, { name: cleanName, hex: cleanHex }]);
    }
    if (!selectedColors.includes(cleanName)) {
      setSelectedColors(prev => [...prev, cleanName]);
    }
    setCustomColorName('');
  };

  const removeCustomColor = (colorName: string) => {
    setCustomColorsList(prev => prev.filter(c => c.name !== colorName));
    setSelectedColors(prev => prev.filter(c => c !== colorName));
  };

  // Toggle color selection
  const toggleColor = (col: string) => {
    setSelectedColors(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  // Add custom model
  const handleAddCustomModel = () => {
    if (!customModelInput.trim()) return;
    const clean = customModelInput.trim();
    if (!customModelsList.includes(clean) && !DEFAULT_PRESET_MODELS.includes(clean)) {
      setCustomModelsList(prev => [...prev, clean]);
    }
    if (!selectedModels.includes(clean)) {
      setSelectedModels(prev => [...prev, clean]);
    }
    setCustomModelInput('');
  };

  const removeCustomModel = (mod: string) => {
    setCustomModelsList(prev => prev.filter(m => m !== mod));
    setSelectedModels(prev => prev.filter(m => m !== mod));
  };

  // Toggle model selection
  const toggleModel = (mod: string) => {
    setSelectedModels(prev => 
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  // Generate Matrix Combinations
  const handleGenerateMatrix = () => {
    const sizes = selectedSizes.length > 0 ? selectedSizes : [''];
    const colors = selectedColors.length > 0 ? selectedColors : [''];
    const models = enableModels && selectedModels.length > 0 ? selectedModels : [''];

    const newVariants: ProductVariant[] = [];
    const prefix = baseSku || 'SKU';

    sizes.forEach(sz => {
      colors.forEach(col => {
        models.forEach(mod => {
          const parts = [prefix];
          if (sz) parts.push(sz.toUpperCase().replace(/[^A-Z0-9]/g, ''));
          if (col) parts.push(col.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3));
          if (mod) parts.push(mod.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3));
          
          const genSku = parts.join('-');
          const subBarcode = `${880000000000 + Math.floor(Math.random() * 9999999999)}`;

          newVariants.push({
            sku: genSku,
            size: sz || undefined,
            color: col || undefined,
            model: mod || undefined,
            stock: bulkStockValue > 0 ? bulkStockValue : 10,
            retailPrice: basePrice > 0 ? basePrice : 29.99,
            costPrice: baseCost > 0 ? baseCost : 12.00,
            barcode: subBarcode,
            isActive: true
          });
        });
      });
    });

    setVariants(newVariants);
  };

  // Add single manual variant
  const handleAddSingleVariant = () => {
    if (!singleSize.trim() && !singleColor.trim() && !singleModel.trim()) {
      alert('Please specify at least a Size, Color, or Model specification.');
      return;
    }

    const subParts = [baseSku || 'SKU'];
    if (singleSize) subParts.push(singleSize.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    if (singleColor) subParts.push(singleColor.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3));
    if (singleModel) subParts.push(singleModel.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3));

    const finalSku = singleSku.trim() || subParts.join('-');

    if (variants.some(v => v.sku === finalSku)) {
      alert(`A variant with SKU "${finalSku}" already exists in the matrix.`);
      return;
    }

    setVariants([
      ...variants,
      {
        sku: finalSku,
        size: singleSize.trim() || undefined,
        color: singleColor.trim() || undefined,
        model: singleModel.trim() || undefined,
        stock: Math.max(0, singleStock),
        retailPrice: singlePrice > 0 ? singlePrice : basePrice,
        costPrice: baseCost,
        barcode: `${880000000000 + Math.floor(Math.random() * 9999999999)}`,
        isActive: true
      }
    ]);

    setSingleSku('');
    setSingleSize('');
    setSingleColor('');
    setSingleModel('');
  };

  // Update variant row field
  const updateVariantRow = (index: number, key: keyof ProductVariant, val: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [key]: val };
    setVariants(updated);
  };

  // Delete variant row
  const deleteVariantRow = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // Bulk apply stock
  const applyStockToAll = () => {
    setVariants(variants.map(v => ({ ...v, stock: Math.max(0, bulkStockValue) })));
  };

  // Bulk apply price
  const applyPriceToAll = () => {
    setVariants(variants.map(v => ({ ...v, retailPrice: Math.max(0, bulkPriceValue) })));
  };

  // Permutation counts
  const totalSizesCount = selectedSizes.length || 1;
  const totalColorsCount = selectedColors.length || 1;
  const totalModelsCount = enableModels ? (selectedModels.length || 1) : 1;
  const totalCombinations = totalSizesCount * totalColorsCount * totalModelsCount;
  const totalVariantStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);

  const allAvailableSizes = [...DEFAULT_PRESET_SIZES, ...customSizesList];
  const allAvailableColors = [...DEFAULT_PRESET_COLORS, ...customColorsList];
  const allAvailableModels = [...DEFAULT_PRESET_MODELS, ...customModelsList];

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="step-2-variants">
      {/* Top Architecture Mode Selector: Variants vs Composite BOM */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTabMode('variants')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTabMode === 'variants'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Variant Matrix Configuration</span>
            {hasVariants && (
              <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 text-[10px] font-mono rounded-full">
                {variants.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTabMode('bom')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTabMode === 'bom'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-indigo-600" />
            <span>Bill of Materials (BOM) & Bundles</span>
            {components.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded-full font-bold">
                {components.length} parts
              </span>
            )}
          </button>
        </div>

        {activeTabMode === 'bom' && isCompositeOrBundle && (
          <span className="text-[11px] font-bold text-indigo-800 px-3 py-1 bg-indigo-50 rounded-xl hidden sm:inline">
            Active Architecture: {productType}
          </span>
        )}
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTabMode === 'bom' ? (
        <CompositeBOMBuilder
          components={components}
          setComponents={setComponents || (() => {})}
          availableProducts={availableProducts}
          currentProductId={currentProductId}
          onSyncCost={onSyncCost}
          onSyncStock={onSyncStock}
          productType={productType}
        />
      ) : (
        <>
          {/* Top Question: Does this product have variants? */}
          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Does this product have variants?
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Enable if this item is offered in multiple sizes, dimensions, colors, finishes, or editions with independent SKU stock pools.
              </p>
            </div>

            {/* Yes / No Toggle buttons */}
            <div className="flex items-center gap-2 bg-slate-200/80 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setHasVariants(true)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  hasVariants 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                id="btn-variants-yes"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Yes, Has Variants</span>
              </button>

              <button
                type="button"
                onClick={() => setHasVariants(false)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  !hasVariants 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                id="btn-variants-no"
              >
                <span>No, Single SKU</span>
              </button>
            </div>
          </div>

          {/* When NO: Informative banner */}
          {!hasVariants && (
            <div className="p-6 border border-dashed border-slate-200 rounded-2xl bg-white text-center space-y-2">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-500 font-bold">
                1
              </div>
              <h4 className="text-sm font-bold text-slate-900">Single Master Product Configuration</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                This item will operate as a single inventory SKU ({baseSku || 'SKU-001'}). You can manage its total inventory count, barcode symbology, and price directly in the next steps.
              </p>
            </div>
          )}

      {/* When YES: Matrix Generator & Table */}
      {hasVariants && (
        <div className="space-y-6">
          
          {/* Attribute Selection Section */}
          <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>Select & Configure Variant Attributes</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Current Selection: <strong className="text-indigo-600 font-mono">{totalCombinations} possible SKU combinations</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateMatrix}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                id="btn-generate-matrix"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ Generate ({totalCombinations}) Variants</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Attribute 1: SIZE / DIMENSION */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Size / Dimension</span>
                    </span>
                    <span className="text-[11px] font-mono text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
                      {selectedSizes.length} selected
                    </span>
                  </div>

                  {/* Preset & Custom size tags */}
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
                    {allAvailableSizes.map(sz => {
                      const isChecked = selectedSizes.includes(sz);
                      const isCustom = customSizesList.includes(sz);
                      return (
                        <span key={sz} className="inline-flex items-center">
                          <button
                            type="button"
                            onClick={() => toggleSize(sz)}
                            className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                              isChecked
                                ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {sz}
                          </button>
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => removeCustomSize(sz)}
                              className="ml-0.5 p-0.5 text-slate-400 hover:text-red-500 rounded"
                              title="Delete custom size"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Custom size input */}
                <div className="flex gap-1.5 pt-2 border-t border-slate-200/60">
                  <input
                    type="text"
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomSize(); } }}
                    placeholder="+ Add custom (e.g. 10x12in, 48mm, 2TB)"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSize}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shrink-0 transition-all"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Attribute 2: COLOR / FINISH */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Color / Finish</span>
                    </span>
                    <span className="text-[11px] font-mono text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
                      {selectedColors.length} selected
                    </span>
                  </div>

                  {/* Color swatches */}
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {allAvailableColors.map(col => {
                      const isChecked = selectedColors.includes(col.name);
                      const isCustom = customColorsList.some(c => c.name === col.name);
                      return (
                        <span key={col.name} className="inline-flex items-center">
                          <button
                            type="button"
                            onClick={() => toggleColor(col.name)}
                            className={`px-2 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                              isChecked
                                ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span 
                              className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" 
                              style={{ backgroundColor: col.hex }} 
                            />
                            <span>{col.name}</span>
                          </button>
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => removeCustomColor(col.name)}
                              className="ml-0.5 p-0.5 text-slate-400 hover:text-red-500 rounded"
                              title="Delete custom color"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Custom color input with swatch */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60">
                  <input
                    type="color"
                    value={customColorHex}
                    onChange={(e) => setCustomColorHex(e.target.value)}
                    className="w-7 h-7 p-0 border border-slate-300 rounded cursor-pointer shrink-0"
                    title="Pick Color Swatch"
                  />
                  <input
                    type="text"
                    value={customColorName}
                    onChange={(e) => setCustomColorName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomColor(); } }}
                    placeholder="+ Custom (e.g. Brushed Brass, Matte Black)"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomColor}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shrink-0 transition-all"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Attribute 3: MODEL / EDITION */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={enableModels}
                        onChange={(e) => setEnableModels(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Model / Edition</span>
                    </label>
                    {enableModels && (
                      <span className="text-[11px] font-mono text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
                        {selectedModels.length} selected
                      </span>
                    )}
                  </div>

                  {enableModels ? (
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
                      {allAvailableModels.map(mod => {
                        const isChecked = selectedModels.includes(mod);
                        const isCustom = customModelsList.includes(mod);
                        return (
                          <span key={mod} className="inline-flex items-center">
                            <button
                              type="button"
                              onClick={() => toggleModel(mod)}
                              className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                                isChecked
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {mod}
                            </button>
                            {isCustom && (
                              <button
                                type="button"
                                onClick={() => removeCustomModel(mod)}
                                className="ml-0.5 p-0.5 text-slate-400 hover:text-red-500 rounded"
                                title="Delete custom model"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 py-4 text-center">
                      Check box above to enable model or edition tiers (e.g. Standard, Pro, Titanium).
                    </p>
                  )}
                </div>

                {enableModels && (
                  <div className="flex gap-1.5 pt-2 border-t border-slate-200/60">
                    <input
                      type="text"
                      value={customModelInput}
                      onChange={(e) => setCustomModelInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomModel(); } }}
                      placeholder="+ Custom (e.g. Founder Edition)"
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomModel}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shrink-0 transition-all"
                    >
                      + Add
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Quick Manual Single Variant Adder */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Or Add a Specific Custom Variant Directly</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Size / Spec</label>
                <input
                  type="text"
                  placeholder="e.g. XL or 128GB"
                  value={singleSize}
                  onChange={(e) => setSingleSize(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Color / Finish</label>
                <input
                  type="text"
                  placeholder="e.g. Space Black"
                  value={singleColor}
                  onChange={(e) => setSingleColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Initial Stock</label>
                <input
                  type="number"
                  min="0"
                  value={singleStock}
                  onChange={(e) => setSingleStock(Math.max(0, Number(e.target.value)))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Price ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={singlePrice || ''}
                  onChange={(e) => setSinglePrice(Math.max(0, Number(e.target.value)))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div className="col-span-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddSingleVariant}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </button>
              </div>
            </div>
          </div>

          {/* Generated Variants Table */}
          {variants.length > 0 ? (
            <div className="space-y-3">
              {/* Batch Adjustment Bar */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-950">
                    Matrix Units ({variants.length} rows):
                  </span>
                  <span className="bg-white text-indigo-700 font-mono font-bold px-2 py-0.5 rounded-md border border-indigo-200">
                    Total: {totalVariantStock} Units
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 font-medium">Batch Stock:</span>
                    <input
                      type="number"
                      min="0"
                      value={bulkStockValue}
                      onChange={(e) => setBulkStockValue(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white border border-indigo-200 rounded text-xs font-mono font-bold text-center"
                    />
                    <button
                      type="button"
                      onClick={applyStockToAll}
                      className="px-2 py-1 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700"
                    >
                      Apply All
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setVariants([])}
                    className="text-red-500 hover:text-red-700 font-bold ml-2"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-2.5">Variant SKU</th>
                        <th className="px-3 py-2.5">Size / Spec</th>
                        <th className="px-3 py-2.5">Color / Finish</th>
                        <th className="px-3 py-2.5">Model</th>
                        <th className="px-3 py-2.5 w-24 text-right">Units</th>
                        <th className="px-3 py-2.5 w-28 text-right">Retail Price</th>
                        <th className="px-3 py-2.5 text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {variants.map((v, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 font-bold text-slate-800">
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) => updateVariantRow(idx, 'sku', e.target.value.toUpperCase())}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold uppercase"
                            />
                          </td>
                          <td className="px-3 py-2.5 font-sans font-medium text-slate-700">
                            {v.size || '—'}
                          </td>
                          <td className="px-3 py-2.5 font-sans font-medium text-slate-700">
                            {v.color || '—'}
                          </td>
                          <td className="px-3 py-2.5 font-sans font-medium text-slate-700">
                            {v.model || '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <input
                              type="number"
                              min="0"
                              value={v.stock}
                              onChange={(e) => updateVariantRow(idx, 'stock', Math.max(0, Number(e.target.value)))}
                              className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-right"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={v.retailPrice || ''}
                              onChange={(e) => updateVariantRow(idx, 'retailPrice', Math.max(0, Number(e.target.value)))}
                              className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-right"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center font-sans">
                            <button
                              type="button"
                              onClick={() => deleteVariantRow(idx)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
              <Layers className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-700">No Variants Generated Yet</div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Select your desired attributes above and click <strong>Generate Variant Matrix</strong>, or use the direct manual row adder.
              </p>
            </div>
          )}

        </div>
      )}
      </>
      )}
    </div>
  );
}
