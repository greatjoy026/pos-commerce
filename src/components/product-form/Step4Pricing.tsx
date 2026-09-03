import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, ShieldAlert, Percent, 
  HelpCircle, ArrowUpRight, CheckCircle2, Calculator, Info,
  Sparkles, Sliders, Zap, Check, Lock, Unlock, Layers, Box, Boxes
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { ProductComponentItem, ProductType, ProductPackagingConfig } from '../../types';

interface Step4PricingProps {
  price: number;
  setPrice: (v: number) => void;
  cost: number;
  setCost: (v: number) => void;
  wholesalePrice: number;
  setWholesalePrice: (v: number) => void;
  minimumPrice: number;
  setMinimumPrice: (v: number) => void;
  stock: number;
  errors: Record<string, string>;
  productType?: ProductType;
  components?: ProductComponentItem[];
  packaging?: ProductPackagingConfig;
  setPackaging?: (cfg: ProductPackagingConfig | undefined | ((prev: ProductPackagingConfig | undefined) => ProductPackagingConfig | undefined)) => void;
}

const MARGIN_PRESETS = [
  { label: '25% High Volume', margin: 25 },
  { label: '35% Grocery / FMCG', margin: 35 },
  { label: '50% Keystoning (2x)', margin: 50 },
  { label: '60% Tech & Consumer', margin: 60 },
  { label: '75% Luxury / Apparel', margin: 75 }
];

export default function Step4Pricing({
  price,
  setPrice,
  cost,
  setCost,
  wholesalePrice,
  setWholesalePrice,
  minimumPrice,
  setMinimumPrice,
  stock,
  errors,
  productType,
  components = [],
  packaging,
  setPackaging
}: Step4PricingProps) {
  const { currencySymbol, formatAmount } = useCurrency();

  // Calculate BOM rollup cost if available
  const totalBOMCost = components.reduce((sum, c) => sum + (c.unitCost * c.quantity), 0);
  const totalBOMRetail = components.reduce((sum, c) => sum + (c.unitPrice * c.quantity), 0);

  // Target profit margin state
  const [targetMarginPct, setTargetMarginPct] = useState<number>(() => {
    if (price > 0 && cost > 0 && price > cost) {
      return Number((((price - cost) / price) * 100).toFixed(1));
    }
    return 50; // Default 50% keystoning
  });

  const [autoCalculatePrice, setAutoCalculatePrice] = useState<boolean>(true);
  const [useCharmPricing, setUseCharmPricing] = useState<boolean>(true); // .99 ending
  const [autoSyncTiers, setAutoSyncTiers] = useState<boolean>(true); // sync wholesale & floor

  // Recalculate retail price when cost or target margin changes if autoCalculate is on
  const calculateRetailFromMargin = (costVal: number, marginVal: number, charm: boolean) => {
    if (costVal <= 0) return 0;
    if (marginVal >= 100) return costVal * 2;
    
    // Formula: Price = Cost / (1 - Margin%)
    let rawPrice = costVal / (1 - (marginVal / 100));
    
    if (charm && rawPrice >= 5) {
      // Convert to .99 ending (e.g. 29.99, 49.99)
      rawPrice = Math.floor(rawPrice) + 0.99;
    } else {
      rawPrice = Number(rawPrice.toFixed(2));
    }

    return rawPrice;
  };

  // Handle Cost Change with Auto Retail Price calculation
  const handleCostChange = (newCost: number) => {
    setCost(newCost);
    if (autoCalculatePrice && newCost > 0 && targetMarginPct > 0) {
      const calculatedRetail = calculateRetailFromMargin(newCost, targetMarginPct, useCharmPricing);
      setPrice(calculatedRetail);
      
      if (autoSyncTiers) {
        setWholesalePrice(Number((calculatedRetail * 0.70).toFixed(2)));
        setMinimumPrice(Number((calculatedRetail * 0.85).toFixed(2)));
      }
    }
  };

  // Handle Target Margin Change
  const handleTargetMarginChange = (newMargin: number) => {
    const clamped = Math.min(95, Math.max(1, newMargin));
    setTargetMarginPct(clamped);
    if (cost > 0) {
      const calculatedRetail = calculateRetailFromMargin(cost, clamped, useCharmPricing);
      setPrice(calculatedRetail);

      if (autoSyncTiers) {
        setWholesalePrice(Number((calculatedRetail * 0.70).toFixed(2)));
        setMinimumPrice(Number((calculatedRetail * 0.85).toFixed(2)));
      }
    }
  };

  // Manual Retail Price edit updates live margin state
  const handleRetailPriceChange = (newPrice: number) => {
    setPrice(newPrice);
    if (newPrice > 0 && cost > 0 && newPrice > cost) {
      const liveMargin = ((newPrice - cost) / newPrice) * 100;
      setTargetMarginPct(Number(liveMargin.toFixed(1)));
    }
    if (autoSyncTiers && newPrice > 0) {
      if (!wholesalePrice || wholesalePrice === 0) {
        setWholesalePrice(Number((newPrice * 0.70).toFixed(2)));
      }
      if (!minimumPrice || minimumPrice === 0) {
        setMinimumPrice(Number((newPrice * 0.85).toFixed(2)));
      }
    }
  };

  // Metrics Calculations
  const unitProfit = price - cost;
  const currentMarginPct = price > 0 ? (unitProfit / price) * 100 : 0;
  const currentMarkupPct = cost > 0 ? ((price - cost) / cost) * 100 : 0;
  const totalCostValuation = stock * cost;
  const totalRetailValuation = stock * price;
  const potentialGrossProfit = totalRetailValuation - totalCostValuation;

  // Wholesale margin
  const wholesaleProfit = wholesalePrice > 0 ? wholesalePrice - cost : 0;
  const wholesaleMarginPct = wholesalePrice > 0 ? (wholesaleProfit / wholesalePrice) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="step-4-pricing">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-600" />
            <span>Multi-Tier Pricing & Custom Profit Margin Engine</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure acquisition cost, target profit margin %, retail MSRP, B2B wholesale rates, and minimum floor protection.
          </p>
        </div>

        {/* Live Status Badge */}
        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 self-start sm:self-auto ${
          currentMarginPct >= 30 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          currentMarginPct >= 10 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Realized Margin: {currentMarginPct.toFixed(1)}%</span>
        </div>
      </div>

      {/* If Composite / Bundle: Show BOM Rollup Card */}
      {components.length > 0 && (
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                <span>{productType || 'Composite'} Recipe Cost Rollup: {formatAmount(totalBOMCost)}</span>
                <span className="px-2 py-0.2 bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded-md">
                  {components.length} components
                </span>
              </div>
              <p className="text-[11px] text-emerald-800/80 mt-0.5">
                Total separate retail component value is <strong>{formatAmount(totalBOMRetail)}</strong>. You can automatically apply this exact raw cost to compute margins.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => handleCostChange(totalBOMCost)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply {formatAmount(totalBOMCost)} Cost</span>
            </button>
          </div>
        </div>
      )}

      {/* If Packaged Goods Enabled: Show Wholesale Pack to Unit Breakdown Card */}
      {packaging?.hasPackaging && (
        <div className="p-4 bg-indigo-50/90 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                <span>Wholesale {packaging.purchasePackagingName || 'Box'} Cost: {formatAmount(packaging.packageCost)} ({packaging.unitsPerPackage} pcs)</span>
                <span className="px-2 py-0.2 bg-indigo-200 text-indigo-900 text-[10px] font-bold rounded-md font-mono">
                  {formatAmount(packaging.calculatedUnitCost)} / pc
                </span>
              </div>
              <p className="text-[11px] text-indigo-800/80 mt-0.5">
                Multi-UoM pricing active with <strong>{packaging.sellingTiers.length} selling tiers</strong> (Single, Half Dozen, Dozen, Full Box). Unit cost is synchronized with master pricing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => handleCostChange(packaging.calculatedUnitCost)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sync {formatAmount(packaging.calculatedUnitCost)}/pc Cost</span>
            </button>
          </div>
        </div>
      )}

      {/* Target Profit Margin Configuration Box */}
      <div className="p-4 sm:p-5 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
              Target Profit Margin Auto-Determination
            </h4>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-Calculate Toggle */}
            <label className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCalculatePrice}
                onChange={(e) => setAutoCalculatePrice(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Auto-Compute Retail Price from Cost</span>
            </label>

            {/* Charm Pricing Toggle */}
            <label className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useCharmPricing}
                onChange={(e) => {
                  setUseCharmPricing(e.target.checked);
                  if (cost > 0 && autoCalculatePrice) {
                    const rec = calculateRetailFromMargin(cost, targetMarginPct, e.target.checked);
                    setPrice(rec);
                  }
                }}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>.99 Charm Pricing</span>
            </label>
          </div>
        </div>

        {/* Target Margin Input & Slider */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          <div className="md:col-span-4 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 shrink-0">
              Desired Margin:
            </span>
            <div className="relative flex-1">
              <input
                type="number"
                min="1"
                max="95"
                step="0.5"
                value={targetMarginPct}
                onChange={(e) => handleTargetMarginChange(Number(e.target.value))}
                className="w-full pl-3 pr-7 py-2 bg-white border border-indigo-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                id="input-target-margin-pct"
              />
              <span className="absolute right-2.5 top-2.5 text-xs text-indigo-600 font-bold">%</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (cost > 0) {
                  const calculated = calculateRetailFromMargin(cost, targetMarginPct, useCharmPricing);
                  setPrice(calculated);
                }
              }}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0"
              id="btn-recalculate-price-from-margin"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="md:col-span-8 flex flex-wrap gap-1.5">
            {MARGIN_PRESETS.map((preset) => (
              <button
                key={preset.margin}
                type="button"
                onClick={() => handleTargetMarginChange(preset.margin)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  Math.abs(targetMarginPct - preset.margin) < 0.5
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-indigo-200 hover:bg-indigo-100/60'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* 4 Pricing Tier Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Tier 1: Cost Price (COGS) */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 focus-within:ring-2 focus-within:ring-indigo-600 focus-within:bg-white transition-all">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1">
              <span>Cost Price (COGS)</span>
              <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
              Expense
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold font-mono">
              {currencySymbol}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={cost || ''}
              onChange={(e) => handleCostChange(Math.max(0, Number(e.target.value)))}
              placeholder="0.00"
              className={`w-full pl-7 pr-3 py-2 bg-white border rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-hidden ${
                errors.cost ? 'border-red-400' : 'border-slate-200'
              }`}
              id="input-cost-price"
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Supplier purchase price. Drives auto-retail calculation with target margin.
          </p>
          {errors.cost && <p className="text-[11px] text-red-600 font-medium">{errors.cost}</p>}
        </div>

        {/* Tier 2: Retail Price (MSRP) */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 focus-within:ring-2 focus-within:ring-indigo-600 focus-within:bg-white transition-all">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1">
              <span>Retail Price (MSRP)</span>
              <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              Standard
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold font-mono">
              {currencySymbol}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={price || ''}
              onChange={(e) => handleRetailPriceChange(Math.max(0, Number(e.target.value)))}
              placeholder="0.00"
              className={`w-full pl-7 pr-3 py-2 bg-white border rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-hidden ${
                errors.price ? 'border-red-400' : 'border-slate-200'
              }`}
              id="input-retail-price"
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Standard customer checkout price across POS and online storefront.
          </p>
          {errors.price && <p className="text-[11px] text-red-600 font-medium">{errors.price}</p>}
        </div>

        {/* Tier 3: Wholesale Price */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 focus-within:ring-2 focus-within:ring-indigo-600 focus-within:bg-white transition-all">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-900">
              Wholesale Price
            </label>
            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              B2B Tier
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold font-mono">
              {currencySymbol}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={wholesalePrice || ''}
              onChange={(e) => setWholesalePrice(Math.max(0, Number(e.target.value)))}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-hidden"
              id="input-wholesale-price"
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Bulk trade discount rate for corporate clients and distributors.
          </p>
        </div>

        {/* Tier 4: Minimum Selling Floor Price */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 focus-within:ring-2 focus-within:ring-indigo-600 focus-within:bg-white transition-all">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1">
              <span>Minimum Floor Price</span>
              <ShieldAlert className="w-3 h-3 text-amber-600" />
            </label>
            <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              Safety Guard
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold font-mono">
              {currencySymbol}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={minimumPrice || ''}
              onChange={(e) => setMinimumPrice(Math.max(0, Number(e.target.value)))}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-hidden"
              id="input-minimum-price"
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Prevents cashiers from discounting below this threshold.
          </p>
        </div>

      </div>

      {/* Live Financial Telemetry & Profit Analysis */}
      <div className="p-4 sm:p-5 bg-slate-900 text-white rounded-2xl space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Live Profitability & Margin Telemetry
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Inventory Units: {stock}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Unit Profit */}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Profit / Unit</span>
            <span className={`text-base font-bold font-mono ${unitProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatAmount(unitProfit)}
            </span>
          </div>

          {/* Gross Margin % */}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Gross Margin %</span>
            <span className={`text-base font-bold font-mono ${currentMarginPct >= 30 ? 'text-emerald-400' : currentMarginPct >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
              {currentMarginPct.toFixed(1)}%
            </span>
          </div>

          {/* Markup % */}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Markup %</span>
            <span className="text-base font-bold font-mono text-indigo-300">
              {currentMarkupPct.toFixed(1)}%
            </span>
          </div>

          {/* Wholesale Margin */}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">B2B Margin</span>
            <span className="text-base font-bold font-mono text-cyan-300">
              {wholesaleMarginPct.toFixed(1)}%
            </span>
          </div>

          {/* Inventory Cost Valuation */}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Cost Basis</span>
            <span className="text-base font-bold font-mono text-slate-200">
              {formatAmount(totalCostValuation)}
            </span>
          </div>

          {/* Potential Gross Profit */}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Gross Yield</span>
            <span className={`text-base font-bold font-mono ${potentialGrossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatAmount(potentialGrossProfit)}
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}
