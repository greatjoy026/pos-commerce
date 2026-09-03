import React, { useState } from 'react';
import { 
  Package, Boxes, ArrowRight, DollarSign, Calculator, Sparkles, 
  Plus, Trash2, CheckCircle2, AlertCircle, Info, ShieldCheck,
  TrendingUp, Barcode, Layers, Box, RefreshCw, Check, Percent
} from 'lucide-react';
import { ProductPackagingConfig, PackagingTier } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';

interface PackagingUOMBuilderProps {
  packaging?: ProductPackagingConfig;
  setPackaging: (cfg: ProductPackagingConfig | undefined | ((prev: ProductPackagingConfig | undefined) => ProductPackagingConfig | undefined)) => void;
  basePrice: number;
  setBasePrice?: (p: number) => void;
  baseCost: number;
  setBaseCost?: (c: number) => void;
  stock: number;
  setStock?: (s: number) => void;
  unit: string;
  setUnit?: (u: string) => void;
}

const COMMON_PURCHASE_UNITS = ['Box', 'Carton', 'Packet', 'Case', 'Crate', 'Sack', 'Pallet', 'Bundle'];
const COMMON_SELLING_UNITS = ['Piece', 'Bar', 'Bottle', 'Can', 'Pair', 'Bag', 'Roll', 'Unit'];

export default function PackagingUOMBuilder({
  packaging,
  setPackaging,
  basePrice,
  setBasePrice,
  baseCost,
  setBaseCost,
  stock,
  setStock,
  unit,
  setUnit
}: PackagingUOMBuilderProps) {
  const { currencySymbol, formatAmount } = useCurrency();

  const isEnabled = packaging?.hasPackaging ?? false;

  // Local helper to initialize or toggle packaging
  const handleTogglePackaging = (enable: boolean) => {
    if (!enable) {
      setPackaging(undefined);
      return;
    }

    const defaultPackageCost = baseCost > 0 ? Number((baseCost * 30).toFixed(2)) : 75;
    const defaultUnitsPerPack = 30;
    const derivedUnitCost = Number((defaultPackageCost / defaultUnitsPerPack).toFixed(2));
    const currentPrice = basePrice > 0 ? basePrice : 4.00;

    const initialTiers: PackagingTier[] = [
      {
        id: 'tier-single',
        name: 'Single Unit',
        unitQuantity: 1,
        sellingPrice: currentPrice,
        isDefaultSellingUnit: true
      },
      {
        id: 'tier-half-dozen',
        name: 'Half Dozen (6 pcs)',
        unitQuantity: 6,
        sellingPrice: Number((currentPrice * 6 * 0.95).toFixed(2))
      },
      {
        id: 'tier-dozen',
        name: 'One Dozen (12 pcs)',
        unitQuantity: 12,
        sellingPrice: Number((currentPrice * 12 * 0.92).toFixed(2))
      },
      {
        id: 'tier-box',
        name: `Full Sealed Box (${defaultUnitsPerPack} pcs)`,
        unitQuantity: defaultUnitsPerPack,
        sellingPrice: Number((currentPrice * defaultUnitsPerPack * 0.88).toFixed(2)),
        isDefaultPurchaseUnit: true
      }
    ];

    const newConfig: ProductPackagingConfig = {
      hasPackaging: true,
      purchasePackagingName: 'Box',
      unitsPerPackage: defaultUnitsPerPack,
      packageCost: defaultPackageCost,
      calculatedUnitCost: derivedUnitCost,
      baseSellingUnitName: unit || 'Piece',
      inventoryTrackingMode: 'dual_stock',
      sealedPackageStock: Math.floor(stock / defaultUnitsPerPack) || 10,
      looseUnitStock: (stock % defaultUnitsPerPack) || 15,
      sellingTiers: initialTiers
    };

    setPackaging(newConfig);
    if (setBaseCost) setBaseCost(derivedUnitCost);
    if (setUnit) setUnit('pcs');
  };

  if (!isEnabled || !packaging) {
    return (
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 transition-all" id="packaging-uom-disabled-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-white text-indigo-600 rounded-xl border border-slate-200 shadow-2xs shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">
                  Packaged Goods & Unit of Measure (UoM) Conversion
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                  Optional
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Do you purchase this product in wholesale packets, cartons, crates, or boxes (e.g. <strong>30 pcs per box for Le 75</strong>) and sell as individual units, dozens, or full sealed packs?
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleTogglePackaging(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 whitespace-nowrap self-start sm:self-center"
            id="btn-enable-packaging-uom"
          >
            <Plus className="w-4 h-4" />
            <span>Enable Pack-to-Piece Conversion</span>
          </button>
        </div>
      </div>
    );
  }

  // Active Packaging Config State Handlers
  const {
    purchasePackagingName,
    unitsPerPackage,
    packageCost,
    calculatedUnitCost,
    baseSellingUnitName,
    inventoryTrackingMode,
    sealedPackageStock,
    looseUnitStock,
    sellingTiers
  } = packaging;

  const totalEffectiveUnits = inventoryTrackingMode === 'dual_stock'
    ? (sealedPackageStock * unitsPerPackage) + looseUnitStock
    : stock;

  const updateConfig = (updates: Partial<ProductPackagingConfig>) => {
    const updated = { ...packaging, ...updates };
    
    // Auto-recalculate unit cost if package cost or units change
    if (updates.packageCost !== undefined || updates.unitsPerPackage !== undefined) {
      const pCost = updates.packageCost !== undefined ? updates.packageCost : updated.packageCost;
      const uCount = updates.unitsPerPackage !== undefined ? updates.unitsPerPackage : updated.unitsPerPackage;
      if (uCount > 0) {
        updated.calculatedUnitCost = Number((pCost / uCount).toFixed(2));
        if (setBaseCost) setBaseCost(updated.calculatedUnitCost);
      }
    }

    // Auto-sync total stock if in dual_stock mode
    if (updated.inventoryTrackingMode === 'dual_stock' && setStock) {
      const calcStock = (updated.sealedPackageStock * updated.unitsPerPackage) + updated.looseUnitStock;
      setStock(calcStock);
    }

    setPackaging(updated);
  };

  // Selling tier management
  const handleUpdateTier = (id: string, updates: Partial<PackagingTier>) => {
    const newTiers = sellingTiers.map(t => t.id === id ? { ...t, ...updates } : t);
    updateConfig({ sellingTiers: newTiers });
  };

  const handleAddTier = (name: string, qty: number) => {
    const singlePrice = basePrice > 0 ? basePrice : 4.00;
    const discountedPrice = Number((singlePrice * qty * 0.92).toFixed(2));
    const newTier: PackagingTier = {
      id: `tier-${Date.now()}`,
      name,
      unitQuantity: qty,
      sellingPrice: discountedPrice
    };
    updateConfig({ sellingTiers: [...sellingTiers, newTier] });
  };

  const handleRemoveTier = (id: string) => {
    updateConfig({ sellingTiers: sellingTiers.filter(t => t.id !== id) });
  };

  // Economics calculations
  const singleSellPrice = basePrice > 0 ? basePrice : 4.00;
  const unitProfit = singleSellPrice - calculatedUnitCost;
  const unitMarginPct = singleSellPrice > 0 ? (unitProfit / singleSellPrice) * 100 : 0;
  const boxPotentialRevenue = unitsPerPackage * singleSellPrice;
  const boxPotentialProfit = boxPotentialRevenue - packageCost;
  const boxROI = packageCost > 0 ? (boxPotentialProfit / packageCost) * 100 : 0;

  return (
    <div className="bg-white border-2 border-indigo-200/80 rounded-2xl p-4 sm:p-5 md:p-6 space-y-6 shadow-xs" id="packaging-uom-configured-card">
      
      {/* Card Header & Disable Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-slate-900">
                Packaged Goods & UoM Conversion Engine
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                Active Break-Bulk
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Wholesale purchasing pack breakdown, multi-UoM pricing & inventory tracking
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleTogglePackaging(false)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl text-xs font-semibold transition-all self-start sm:self-center flex items-center gap-1.5"
          id="btn-disable-packaging-uom"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Disable Packaging</span>
        </button>
      </div>

      {/* 1. Purchasing Pack to Base Selling Unit Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-600" />
          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            1. Purchase Packaging & Base Unit Definition
          </h5>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          
          {/* Purchase Packaging Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Purchased In (Outer Pack)
            </label>
            <input
              type="text"
              value={purchasePackagingName}
              onChange={(e) => updateConfig({ purchasePackagingName: e.target.value })}
              placeholder="e.g. Box, Carton, Crate"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              id="input-purchase-package-name"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {COMMON_PURCHASE_UNITS.slice(0, 4).map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => updateConfig({ purchasePackagingName: u })}
                  className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${
                    purchasePackagingName === u ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Units Per Pack */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Units Per {purchasePackagingName || 'Pack'}
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={unitsPerPackage}
                onChange={(e) => updateConfig({ unitsPerPackage: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                id="input-units-per-package"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">
                pcs / {purchasePackagingName || 'pack'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500">e.g. 30 pieces inside 1 box</p>
          </div>

          {/* Purchase Package Cost */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Wholesale Purchase Cost
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={packageCost}
                onChange={(e) => updateConfig({ packageCost: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                id="input-package-cost"
              />
            </div>
            <p className="text-[10px] text-slate-500">Invoice cost per sealed {purchasePackagingName || 'box'}</p>
          </div>

          {/* Base Unit & Auto-Calculated Unit Cost */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Derived Unit Cost
            </label>
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Cost Per Piece:</span>
                <span className="text-sm font-mono font-extrabold text-emerald-700">
                  {formatAmount(calculatedUnitCost)}
                </span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                Auto
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              {formatAmount(packageCost)} ÷ {unitsPerPackage} = {formatAmount(calculatedUnitCost)}/pc
            </p>
          </div>

        </div>
      </div>

      {/* 2. The Two Primary Inventory Management Methods */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              2. Inventory Stocking & Break-Bulk Method
            </h5>
          </div>
          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            Choose how inventory is tracked in the system
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Method A: Automatic De-packaging */}
          <div
            onClick={() => updateConfig({ inventoryTrackingMode: 'auto_depackage' })}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              inventoryTrackingMode === 'auto_depackage'
                ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
            id="method-auto-depackage-card"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    inventoryTrackingMode === 'auto_depackage' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                  }`}>
                    {inventoryTrackingMode === 'auto_depackage' && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    Method A: Automatic De-packaging
                  </span>
                </div>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  1-Pool Unified
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                When purchase shipments arrive, received {purchasePackagingName}es are <strong>instantly converted into total loose units</strong> ({unitsPerPackage} pcs each).
              </p>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 font-medium">
                💡 <strong>Best for:</strong> Convenience stores & single-shelf kiosks where all stock is immediately unpacked for sale.
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Total On-Hand Units:</span>
              <span className="font-mono font-bold text-slate-900">{stock} {unit || 'pcs'}</span>
            </div>
          </div>

          {/* Method B: Dual Stock (Sealed Cartons + Loose Units) */}
          <div
            onClick={() => updateConfig({ inventoryTrackingMode: 'dual_stock' })}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              inventoryTrackingMode === 'dual_stock'
                ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
            id="method-dual-stock-card"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    inventoryTrackingMode === 'dual_stock' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                  }`}>
                    {inventoryTrackingMode === 'dual_stock' && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    Method B: Dual Stocking
                  </span>
                </div>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                  Warehouse + Shelf
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Maintains separate counts for <strong>Sealed {purchasePackagingName}es</strong> (in warehouse/backroom) and <strong>Loose Units</strong> (on retail shelf). Use 1-click &quot;Break-Bulk&quot; to unpack.
              </p>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 font-medium">
                💡 <strong>Best for:</strong> Supermarkets, wholesalers & pharmacies managing backroom cases and retail front shelves.
              </div>
            </div>

            {/* Dual Stock Inputs */}
            {inventoryTrackingMode === 'dual_stock' && (
              <div className="mt-3 pt-3 border-t border-indigo-200 grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 block">
                    Sealed {purchasePackagingName}es:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={sealedPackageStock}
                    onChange={(e) => updateConfig({ sealedPackageStock: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                    id="input-sealed-stock"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">
                    = {sealedPackageStock * unitsPerPackage} pcs
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 block">
                    Loose Shelf Units:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={looseUnitStock}
                    onChange={(e) => updateConfig({ looseUnitStock: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                    id="input-loose-stock"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">
                    = {looseUnitStock} pcs
                  </span>
                </div>
              </div>
            )}

            <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Total Effective Stock:</span>
              <span className="font-mono font-extrabold text-indigo-700">
                {totalEffectiveUnits} {unit || 'pcs'}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Multi-Tier Selling Packages Matrix */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-600" />
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              3. Multi-Tier Selling Packages & POS Price Tiers
            </h5>
          </div>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleAddTier('Half Dozen (6 pcs)', 6)}
              className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg font-bold border border-slate-200 transition-all"
            >
              + Half Dozen (6)
            </button>
            <button
              type="button"
              onClick={() => handleAddTier('One Dozen (12 pcs)', 12)}
              className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg font-bold border border-slate-200 transition-all"
            >
              + One Dozen (12)
            </button>
            <button
              type="button"
              onClick={() => handleAddTier(`Full ${purchasePackagingName} (${unitsPerPackage} pcs)`, unitsPerPackage)}
              className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg font-bold border border-slate-200 transition-all"
            >
              + Full {purchasePackagingName} ({unitsPerPackage})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2.5">Selling Pack Name</th>
                <th className="px-3 py-2.5">Quantity</th>
                <th className="px-3 py-2.5">Pack Cost</th>
                <th className="px-3 py-2.5">Selling Price</th>
                <th className="px-3 py-2.5">Unit Rate</th>
                <th className="px-3 py-2.5">Profit & Margin</th>
                <th className="px-3 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sellingTiers.map((tier) => {
                const tierCost = tier.unitQuantity * calculatedUnitCost;
                const tierProfit = tier.sellingPrice - tierCost;
                const tierMargin = tier.sellingPrice > 0 ? (tierProfit / tier.sellingPrice) * 100 : 0;
                const unitEquiv = tier.unitQuantity > 0 ? tier.sellingPrice / tier.unitQuantity : 0;
                const savingsFromSingle = (singleSellPrice * tier.unitQuantity) - tier.sellingPrice;

                return (
                  <tr key={tier.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Pack Name */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => handleUpdateTier(tier.id, { name: e.target.value })}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-semibold text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Unit Quantity */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={tier.unitQuantity}
                          onChange={(e) => handleUpdateTier(tier.id, { unitQuantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono font-bold text-indigo-700 text-center"
                        />
                        <span className="text-[10px] text-slate-400">pcs</span>
                      </div>
                    </td>

                    {/* Pack Cost */}
                    <td className="px-3 py-2 font-mono text-slate-500">
                      {formatAmount(tierCost)}
                    </td>

                    {/* Selling Price */}
                    <td className="px-3 py-2">
                      <div className="relative w-28">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">
                          {currencySymbol}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.sellingPrice}
                          onChange={(e) => {
                            const newPrice = Math.max(0, parseFloat(e.target.value) || 0);
                            handleUpdateTier(tier.id, { sellingPrice: newPrice });
                            if (tier.unitQuantity === 1 && setBasePrice) {
                              setBasePrice(newPrice);
                            }
                          }}
                          className="w-full pl-5 pr-2 py-1 bg-white border border-slate-300 rounded-md font-mono font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      {savingsFromSingle > 0 && (
                        <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">
                          Save {formatAmount(savingsFromSingle)} ({((savingsFromSingle / (singleSellPrice * tier.unitQuantity)) * 100).toFixed(0)}% off)
                        </span>
                      )}
                    </td>

                    {/* Unit Equivalent Rate */}
                    <td className="px-3 py-2 font-mono text-slate-700">
                      {formatAmount(unitEquiv)}/pc
                    </td>

                    {/* Profit & Margin */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-emerald-700">
                          +{formatAmount(tierProfit)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono font-bold border border-emerald-200">
                          {tierMargin.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-3 py-2 text-center">
                      {sellingTiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTier(tier.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                          title="Remove tier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Unit Economics & ROI Simulator */}
      <div className="p-4 bg-gradient-to-br from-indigo-900 to-slate-950 text-white rounded-xl space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-indigo-800/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-300" />
            <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-100">
              Unit Economics & {purchasePackagingName || 'Box'} Yield Simulator
            </h5>
          </div>
          <span className="text-[10px] bg-indigo-800 text-indigo-200 px-2 py-0.5 rounded-full font-mono">
            {unitsPerPackage} units @ {formatAmount(singleSellPrice)}/pc
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <div className="bg-indigo-950/60 p-2.5 rounded-lg border border-indigo-800/50">
            <span className="text-[10px] uppercase font-bold text-indigo-300 block">Purchase Cost</span>
            <div className="text-sm font-mono font-bold text-white mt-0.5">
              {formatAmount(packageCost)}
            </div>
            <span className="text-[9px] text-indigo-300">for 1 {purchasePackagingName || 'box'}</span>
          </div>

          <div className="bg-indigo-950/60 p-2.5 rounded-lg border border-indigo-800/50">
            <span className="text-[10px] uppercase font-bold text-indigo-300 block">Potential Revenue</span>
            <div className="text-sm font-mono font-bold text-emerald-300 mt-0.5">
              {formatAmount(boxPotentialRevenue)}
            </div>
            <span className="text-[9px] text-indigo-300">if sold as single pieces</span>
          </div>

          <div className="bg-indigo-950/60 p-2.5 rounded-lg border border-indigo-800/50">
            <span className="text-[10px] uppercase font-bold text-indigo-300 block">Gross Profit / {purchasePackagingName || 'Box'}</span>
            <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
              +{formatAmount(boxPotentialProfit)}
            </div>
            <span className="text-[9px] text-emerald-300">+{boxROI.toFixed(1)}% Return on Cost</span>
          </div>

          <div className="bg-indigo-950/60 p-2.5 rounded-lg border border-indigo-800/50">
            <span className="text-[10px] uppercase font-bold text-indigo-300 block">Single Unit Margin</span>
            <div className="text-sm font-mono font-bold text-white mt-0.5">
              {unitMarginPct.toFixed(1)}%
            </div>
            <span className="text-[9px] text-indigo-300">+{formatAmount(unitProfit)} / piece</span>
          </div>

        </div>
      </div>

    </div>
  );
}
