import React from 'react';
import { 
  DollarSign, TrendingUp, ShieldAlert, Percent, 
  HelpCircle, ArrowUpRight, CheckCircle2, Calculator, Info,
  Sparkles, Sliders, Zap, Check, Lock, Unlock, Layers, Box, Boxes
} from 'lucide-react';
import { ProductType, BulkPackagingConfig, CompositeComponentItem, BundleKitItem } from '../../types';

interface StepPricingProps {
  cost: number;
  setCost: (v: number) => void;
  price: number;
  setPrice: (v: number) => void;
  wholesalePrice: number;
  setWholesalePrice: (v: number) => void;
  minimumPrice: number;
  setMinimumPrice: (v: number) => void;
  originalPrice: number;
  setOriginalPrice: (v: number) => void;
  productType: ProductType;
  compositeComponents?: CompositeComponentItem[];
  bundleKitItems?: BundleKitItem[];
  bulkPackaging?: BulkPackagingConfig;
  setBulkPackaging?: (v: BulkPackagingConfig) => void;
  errors: Record<string, string>;
}

const MARGIN_PRESETS = [
  { label: '25% High Volume', margin: 25 },
  { label: '35% FMCG / Retail', margin: 35 },
  { label: '50% Keystoning (2x)', margin: 50 },
  { label: '60% Tech & Hardware', margin: 60 },
  { label: '75% Luxury / Apparel', margin: 75 },
];

export default function StepPricing({
  cost,
  setCost,
  price,
  setPrice,
  wholesalePrice,
  setWholesalePrice,
  minimumPrice,
  setMinimumPrice,
  originalPrice,
  setOriginalPrice,
  productType,
  compositeComponents = [],
  bulkPackaging,
  errors
}: StepPricingProps) {
  // Calculations
  const grossProfit = Math.max(0, price - cost);
  const profitMarginPercent = price > 0 ? ((price - cost) / price) * 100 : 0;
  const markupPercent = cost > 0 ? ((price - cost) / cost) * 100 : 0;

  const applyMarginPreset = (targetMargin: number) => {
    if (cost <= 0) return;
    const calculatedPrice = cost / (1 - targetMargin / 100);
    setPrice(Math.round(calculatedPrice * 100) / 100);
  };

  return (
    <div className="space-y-6">
      {/* Primary Retail & Cost Structure */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              Core Unit Pricing & Margin Analysis
            </h3>
            <p className="text-xs text-slate-500">Configure acquisition cost, retail POS price, and inspect profit margins.</p>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            Gross Margin: {profitMarginPercent.toFixed(1)}% (${grossProfit.toFixed(2)}/unit)
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Unit Cost */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Unit Cost ($) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={e => setCost(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0.00"
                className={`w-full pl-8 pr-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  errors.cost ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                }`}
              />
            </div>
            {errors.cost && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.cost}</p>}
          </div>

          {/* Retail Selling Price */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Retail Price (MSRP) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={e => setPrice(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0.00"
                className={`w-full pl-8 pr-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  errors.price ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                }`}
              />
            </div>
            {errors.price && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.price}</p>}
          </div>

          {/* Wholesale B2B Price */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Wholesale Price ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={wholesalePrice}
                onChange={e => setWholesalePrice(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>

          {/* Minimum Floor Price */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Minimum Floor Price ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={minimumPrice}
                onChange={e => setMinimumPrice(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0.00"
                className={`w-full pl-8 pr-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  errors.minimumPrice ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                }`}
              />
            </div>
            {errors.minimumPrice && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.minimumPrice}</p>}
          </div>
        </div>

        {/* Quick Margin Presets */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-600 block mb-2">
            Target Margin Auto-Calculation (from unit cost):
          </span>
          <div className="flex flex-wrap gap-2">
            {MARGIN_PRESETS.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyMarginPreset(preset.margin)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Promotional / Strikethrough Price */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Percent className="w-4 h-4 text-amber-600" />
            Promotional & Original Strikethrough Pricing
          </h3>
          <p className="text-xs text-slate-500">Display a higher comparison price to highlight discounts and promotional savings.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Original / Compare-At Price ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={originalPrice}
                onChange={e => setOriginalPrice(Math.max(0, Number(e.target.value) || 0))}
                placeholder="e.g. 129.99"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center">
            {originalPrice > price && price > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <span className="font-bold">Discount Badge:</span> Customers save{' '}
                <span className="font-bold text-amber-900">${(originalPrice - price).toFixed(2)}</span> ({Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF)
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Enter an original price higher than the retail price to display a sale badge.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
