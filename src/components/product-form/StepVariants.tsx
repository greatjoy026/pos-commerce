import React, { useState } from 'react';
import { 
  Layers, Plus, Trash2, Sparkles, RefreshCw, Check, 
  HelpCircle, Sliders, ChevronDown, ChevronUp, AlertCircle, Copy,
  X, Palette, Ruler, Box, Tag, DollarSign, PackageCheck, Wrench,
  Boxes, ShieldCheck
} from 'lucide-react';
import { 
  ProductVariant, ProductType, CompositeComponentItem, BundleKitItem 
} from '../../types';

interface StepVariantsProps {
  hasVariants: boolean;
  setHasVariants: (v: boolean) => void;
  variants: ProductVariant[];
  setVariants: (v: ProductVariant[]) => void;
  parentSku: string;
  basePrice: number;
  baseCost: number;
  productType: ProductType;
  compositeComponents?: CompositeComponentItem[];
  setCompositeComponents?: (v: CompositeComponentItem[]) => void;
  bundleKitItems?: BundleKitItem[];
  setBundleKitItems?: (v: BundleKitItem[]) => void;
  setCost?: (v: number) => void;
  setPrice?: (v: number) => void;
  setWholesalePrice?: (v: number) => void;
  setMinimumPrice?: (v: number) => void;
  setOriginalPrice?: (v: number) => void;
}

const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL'];
const PRESET_COLORS = [
  { name: 'Midnight Black', hex: '#0f172a' },
  { name: 'Pure White', hex: '#f8fafc' },
  { name: 'Space Gray', hex: '#64748b' },
  { name: 'Navy Blue', hex: '#1e3a8a' },
  { name: 'Forest Green', hex: '#14532d' },
  { name: 'Crimson Red', hex: '#991b1b' },
];

export default function StepVariants({
  hasVariants,
  setHasVariants,
  variants,
  setVariants,
  parentSku,
  basePrice,
  baseCost,
  productType,
  compositeComponents = [],
  setCompositeComponents,
  bundleKitItems = [],
  setBundleKitItems,
  setCost,
  setPrice
}: StepVariantsProps) {
  // Variant Matrix Generator state
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [customOptionName, setCustomOptionName] = useState('');
  const [customOptionValues, setCustomOptionValues] = useState('');

  // Composite / BOM Component state
  const [compName, setCompName] = useState('');
  const [compSku, setCompSku] = useState('');
  const [compQty, setCompQty] = useState(1);
  const [compCost, setCompCost] = useState(0);

  // Bundle Item state
  const [bundleName, setBundleName] = useState('');
  const [bundleSku, setBundleSku] = useState('');
  const [bundleQty, setBundleQty] = useState(1);
  const [bundlePrice, setBundlePrice] = useState(0);

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const toggleColor = (colorName: string) => {
    setSelectedColors(prev => 
      prev.includes(colorName) ? prev.filter(c => c !== colorName) : [...prev, colorName]
    );
  };

  const handleGenerateMatrix = () => {
    const sizes = selectedSizes.length > 0 ? selectedSizes : [''];
    const colors = selectedColors.length > 0 ? selectedColors : [''];

    const newVariants: ProductVariant[] = [];
    const prefix = parentSku ? parentSku.trim() : 'SKU';

    sizes.forEach(sz => {
      colors.forEach(col => {
        if (!sz && !col) return;
        const codeParts = [prefix, sz, col ? col.slice(0, 3).toUpperCase() : '']
          .filter(Boolean)
          .join('-');
        
        newVariants.push({
          sku: codeParts,
          size: sz || undefined,
          color: col || undefined,
          optionName: sz && col ? `${sz} / ${col}` : sz || col,
          stock: 10,
          costPrice: baseCost,
          retailPrice: basePrice,
          isActive: true
        });
      });
    });

    if (newVariants.length > 0) {
      setVariants(newVariants);
    }
  };

  const handleAddManualVariant = () => {
    const nextIdx = variants.length + 1;
    const prefix = parentSku ? parentSku.trim() : 'SKU';
    const newVariant: ProductVariant = {
      sku: `${prefix}-VAR-${nextIdx}`,
      optionName: `Variant ${nextIdx}`,
      stock: 10,
      costPrice: baseCost,
      retailPrice: basePrice,
      isActive: true
    };
    setVariants([...variants, newVariant]);
  };

  const handleUpdateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleDeleteVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // Composite additions
  const handleAddCompositeComponent = () => {
    if (!compName.trim() || !setCompositeComponents) return;
    const newComp: CompositeComponentItem = {
      id: crypto.randomUUID(),
      productId: crypto.randomUUID(),
      name: compName.trim(),
      sku: compSku.trim() || `PART-${Math.floor(1000 + Math.random() * 9000)}`,
      quantity: compQty,
      unitCost: compCost,
      unitPrice: compCost * 1.5,
      currentStock: 100
    };
    const updated = [...compositeComponents, newComp];
    setCompositeComponents(updated);
    
    // Auto sync total cost if callback provided
    if (setCost) {
      const totalBOMCost = updated.reduce((acc, c) => acc + c.unitCost * c.quantity, 0);
      setCost(Math.round(totalBOMCost * 100) / 100);
    }

    setCompName('');
    setCompSku('');
    setCompQty(1);
    setCompCost(0);
  };

  const handleDeleteComposite = (id?: string) => {
    if (!setCompositeComponents) return;
    const updated = compositeComponents.filter(c => c.id !== id);
    setCompositeComponents(updated);
    if (setCost) {
      const totalBOMCost = updated.reduce((acc, c) => acc + c.unitCost * c.quantity, 0);
      setCost(Math.round(totalBOMCost * 100) / 100);
    }
  };

  // Bundle additions
  const handleAddBundleItem = () => {
    if (!bundleName.trim() || !setBundleKitItems) return;
    const newItem: BundleKitItem = {
      id: crypto.randomUUID(),
      productId: crypto.randomUUID(),
      name: bundleName.trim(),
      sku: bundleSku.trim() || `KIT-${Math.floor(1000 + Math.random() * 9000)}`,
      quantity: bundleQty,
      unitCost: bundlePrice * 0.6,
      unitPrice: bundlePrice,
      currentStock: 50
    };
    const updated = [...bundleKitItems, newItem];
    setBundleKitItems(updated);
    if (setPrice) {
      const totalBundleVal = updated.reduce((acc, b) => acc + b.unitPrice * b.quantity, 0);
      setPrice(Math.round(totalBundleVal * 0.9 * 100) / 100); // 10% bundle discount default
    }
    setBundleName('');
    setBundleSku('');
    setBundleQty(1);
    setBundlePrice(0);
  };

  const handleDeleteBundleItem = (id?: string) => {
    if (!setBundleKitItems) return;
    const updated = bundleKitItems.filter(b => b.id !== id);
    setBundleKitItems(updated);
  };

  return (
    <div className="space-y-6">
      {/* Composite / BOM mode */}
      {productType === 'Composite' && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-xs">
          <div className="border-b border-indigo-100 pb-3 mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-indigo-600" />
                Bill of Materials (BOM) & Components
              </h3>
              <p className="text-xs text-indigo-700">Define raw materials and sub-parts required to assemble this composite product.</p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg text-xs font-bold">
              {compositeComponents.length} sub-components
            </span>
          </div>

          {/* Add Component form */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-3 bg-white rounded-xl border border-indigo-100 mb-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Component Name</label>
              <input
                type="text"
                value={compName}
                onChange={e => setCompName(e.target.value)}
                placeholder="e.g. Lithium Battery Pack"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Part SKU</label>
              <input
                type="text"
                value={compSku}
                onChange={e => setCompSku(e.target.value)}
                placeholder="PART-BAT-01"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Qty / Unit Cost ($)</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min="1"
                  value={compQty}
                  onChange={e => setCompQty(Number(e.target.value) || 1)}
                  placeholder="Qty"
                  className="w-14 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={compCost}
                  onChange={e => setCompCost(Number(e.target.value) || 0)}
                  placeholder="Cost"
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddCompositeComponent}
                className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Part
              </button>
            </div>
          </div>

          {/* Component List */}
          {compositeComponents.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-indigo-100 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">Component / Part</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3 text-center">Required Qty</th>
                    <th className="p-3 text-right">Unit Cost</th>
                    <th className="p-3 text-right">Total Sub-Cost</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {compositeComponents.map(c => (
                    <tr key={c.id || c.sku} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{c.name}</td>
                      <td className="p-3 font-mono text-slate-600">{c.sku}</td>
                      <td className="p-3 text-center font-bold text-slate-800">{c.quantity}</td>
                      <td className="p-3 text-right text-slate-700">${c.unitCost.toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-indigo-600">
                        ${(c.unitCost * c.quantity).toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteComposite(c.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic text-center py-3">No components added yet.</p>
          )}
        </div>
      )}

      {/* Bundle / Kit mode */}
      {productType === 'Bundle' && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 shadow-xs">
          <div className="border-b border-purple-100 pb-3 mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-purple-600" />
                Bundle & Kit Packaged Items
              </h3>
              <p className="text-xs text-purple-700">Specify which catalog products are bundled together in this promotional kit.</p>
            </div>
            <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-bold">
              {bundleKitItems.length} kit items
            </span>
          </div>

          {/* Add Bundle item form */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-3 bg-white rounded-xl border border-purple-100 mb-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Item Title</label>
              <input
                type="text"
                value={bundleName}
                onChange={e => setBundleName(e.target.value)}
                placeholder="e.g. Ergonomic Mouse Pad"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">SKU</label>
              <input
                type="text"
                value={bundleSku}
                onChange={e => setBundleSku(e.target.value)}
                placeholder="KIT-ACC-01"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Qty / Price ($)</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min="1"
                  value={bundleQty}
                  onChange={e => setBundleQty(Number(e.target.value) || 1)}
                  placeholder="Qty"
                  className="w-14 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={bundlePrice}
                  onChange={e => setBundlePrice(Number(e.target.value) || 0)}
                  placeholder="Price"
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddBundleItem}
                className="w-full py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add to Kit
              </button>
            </div>
          </div>

          {/* Bundle items list */}
          {bundleKitItems.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-purple-100 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3 text-center">Pack Qty</th>
                    <th className="p-3 text-right">Individual Value</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bundleKitItems.map(b => (
                    <tr key={b.id || b.sku} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{b.name}</td>
                      <td className="p-3 font-mono text-slate-600">{b.sku}</td>
                      <td className="p-3 text-center font-bold text-slate-800">{b.quantity}</td>
                      <td className="p-3 text-right text-slate-700">${b.unitPrice.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteBundleItem(b.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic text-center py-3">No bundle items added yet.</p>
          )}
        </div>
      )}

      {/* Variants Toggle & Matrix Builder */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Variant Matrix & Option Attributes
            </h3>
            <p className="text-xs text-slate-500">Generate variants by combining size, color, storage, or custom options.</p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-bold text-slate-700">Enable Variants</span>
            <input
              type="checkbox"
              checked={hasVariants}
              onChange={e => setHasVariants(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        </div>

        {hasVariants && (
          <div className="space-y-5">
            {/* Quick Presets Generator */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Quick Attribute Matrix Generator
              </div>

              {/* Sizes */}
              <div>
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">Sizes:</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_SIZES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSize(s)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-semibold border transition-all ${
                        selectedSizes.includes(s)
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div>
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">Colors:</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => toggleColor(c.name)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-semibold border transition-all ${
                        selectedColors.includes(c.name)
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleGenerateMatrix}
                  disabled={selectedSizes.length === 0 && selectedColors.length === 0}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Generate Variant Matrix
                </button>

                <button
                  type="button"
                  onClick={handleAddManualVariant}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Single Variant
                </button>
              </div>
            </div>

            {/* Generated Variants Table */}
            {variants.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-3">Variant Option</th>
                      <th className="p-3">SKU Code</th>
                      <th className="p-3 text-center">Stock</th>
                      <th className="p-3 text-right">Cost ($)</th>
                      <th className="p-3 text-right">Retail ($)</th>
                      <th className="p-3 text-center">Active</th>
                      <th className="p-3 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {variants.map((variant, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3">
                          <input
                            type="text"
                            value={variant.optionName || ''}
                            onChange={e => handleUpdateVariant(idx, 'optionName', e.target.value)}
                            placeholder="e.g. M / Midnight Black"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-900"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={variant.sku}
                            onChange={e => handleUpdateVariant(idx, 'sku', e.target.value)}
                            placeholder="SKU"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-slate-800"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            value={variant.stock}
                            onChange={e => handleUpdateVariant(idx, 'stock', Number(e.target.value) || 0)}
                            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-center font-bold"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.costPrice ?? baseCost}
                            onChange={e => handleUpdateVariant(idx, 'costPrice', Number(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-right"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.retailPrice ?? basePrice}
                            onChange={e => handleUpdateVariant(idx, 'retailPrice', Number(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-right font-bold text-emerald-600"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={variant.isActive !== false}
                            onChange={e => handleUpdateVariant(idx, 'isActive', e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteVariant(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-600">No variants generated yet</p>
                <p className="text-[11px] text-slate-400">Select sizes/colors above or click 'Add Single Variant'.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
