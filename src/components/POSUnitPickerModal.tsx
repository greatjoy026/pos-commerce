import React, { useState } from 'react';
import { Product, PackagingUnit } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { 
  Boxes, Package, CheckCircle2, AlertCircle, Sparkles, 
  X, Tag, Plus, ShoppingBag, ArrowRight, Layers, ShieldCheck
} from 'lucide-react';

interface POSUnitPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSelectUnit: (product: Product, packagingUnit: PackagingUnit, quantity: number) => void;
}

export default function POSUnitPickerModal({
  isOpen,
  onClose,
  product,
  onSelectUnit
}: POSUnitPickerModalProps) {
  const { formatAmount } = useCurrency();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  if (!isOpen || !product) return null;

  // Build the list of packaging units
  const units: PackagingUnit[] = [];

  if (product.packagingUnits && product.packagingUnits.length > 0) {
    units.push(...product.packagingUnits);
  } else if (product.packaging?.hasPackaging) {
    // Generate standard units from packaging config if packagingUnits not explicitly arrayed
    const baseUnitName = product.packaging.baseSellingUnitName || product.base_unit || 'piece';
    const packName = product.packaging.purchasePackagingName || 'Box';
    const multiplier = product.packaging.unitsPerPackage || 30;

    // 1. Retail single unit
    units.push({
      id: 'retail-single',
      unitName: `1 ${baseUnitName} (Retail Unit)`,
      multiplier: 1,
      base_unit: baseUnitName,
      sellingPrice: product.price,
      barcode: `${product.barcode}-1`,
      sellingMode: 'retail_unit',
      isDefaultSellingUnit: true
    });

    // 2. Full pack unit
    const packTier = product.packaging.sellingTiers?.find(t => t.unitQuantity === multiplier);
    const packPrice = packTier ? packTier.sellingPrice : Number((product.price * multiplier * 0.88).toFixed(2));
    units.push({
      id: 'pack-full',
      unitName: `${packName} of ${multiplier} ${baseUnitName}s`,
      multiplier: multiplier,
      base_unit: baseUnitName,
      sellingPrice: packPrice,
      barcode: `${product.barcode}-${multiplier}`,
      sellingMode: 'pack_selling',
      isPackUnit: true
    });

    // 3. Other selling tiers if defined
    if (product.packaging.sellingTiers) {
      product.packaging.sellingTiers.forEach(t => {
        if (t.unitQuantity !== 1 && t.unitQuantity !== multiplier) {
          units.push({
            id: t.id,
            unitName: t.name,
            multiplier: t.unitQuantity,
            base_unit: baseUnitName,
            sellingPrice: t.sellingPrice,
            barcode: t.barcode,
            sellingMode: t.unitQuantity > 1 ? 'pack_selling' : 'retail_unit'
          });
        }
      });
    }
  } else {
    // Standard single unit fallback
    units.push({
      id: 'standard-single',
      unitName: `1 ${product.base_unit || 'Unit'}`,
      multiplier: 1,
      base_unit: product.base_unit || 'unit',
      sellingPrice: product.price,
      sellingMode: 'retail_unit',
      isDefaultSellingUnit: true
    });
  }

  const baseUnit = product.base_unit || product.packaging?.baseSellingUnitName || 'unit';
  const totalBaseStock = product.stock;

  const getQty = (unitId: string) => quantities[unitId] || 1;
  const setQty = (unitId: string, val: number) => {
    setQuantities(prev => ({ ...prev, [unitId]: Math.max(1, val) }));
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-in fade-in duration-150"
      id="pos-unit-picker-modal"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Select Selling Unit & Packaging Tier
              </h3>
              <p className="text-xs text-gray-500">
                Choose how to ring up <span className="font-semibold text-slate-800">{product.name}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-all"
            id="btn-close-unit-picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Stock Summary Banner */}
        <div className="p-4 bg-indigo-50/60 border-b border-indigo-100/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" />
            <span className="text-indigo-950 font-semibold">
              Total On-Hand Inventory: <strong className="font-mono">{totalBaseStock}</strong> {baseUnit}s
            </span>
          </div>
          {product.packaging && product.packaging.inventoryTrackingMode === 'dual_stock' && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
              <span>Sealed: {product.packaging.sealedPackageStock || 0} {product.packaging.purchasePackagingName || 'Box'}s</span>
              <span>•</span>
              <span>Loose: {product.packaging.looseUnitStock || 0} {baseUnit}s</span>
            </div>
          )}
        </div>

        {/* Unit Options List */}
        <div className="p-5 space-y-3 max-h-[420px] overflow-y-auto" id="unit-options-list">
          {units.map((unit) => {
            const requiredBaseUnits = getQty(unit.id) * unit.multiplier;
            const canFulfill = totalBaseStock >= requiredBaseUnits;
            const isRetail = unit.sellingMode === 'retail_unit' || unit.multiplier === 1;
            const unitCost = product.cost * unit.multiplier;
            const profit = unit.sellingPrice - unitCost;
            const marginPct = unit.sellingPrice > 0 ? Math.round((profit / unit.sellingPrice) * 100) : 0;

            return (
              <div 
                key={unit.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  canFulfill 
                    ? isRetail 
                      ? 'bg-white hover:border-indigo-400 border-slate-200 shadow-2xs' 
                      : 'bg-indigo-50/30 hover:border-indigo-500 border-indigo-200/80 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
                id={`unit-tier-card-${unit.id}`}
              >
                {/* Left: Unit Description & Badges */}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{unit.unitName}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                      isRetail 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/80' 
                        : 'bg-purple-100 text-purple-800 border border-purple-300/80'
                    }`}>
                      {isRetail ? '🍬 Retail Unit' : '📦 Pack Selling'}
                    </span>
                    {unit.isDefaultSellingUnit && (
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">
                        Default
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="font-medium text-slate-700">
                      Multiplier: <strong className="font-mono text-indigo-700">×{unit.multiplier} {unit.base_unit}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">
                      Margin: {marginPct}% ({formatAmount(profit)})
                    </span>
                    {unit.barcode && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-gray-400">Barcode: {unit.barcode}</span>
                      </>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-600 flex items-center gap-1.5 mt-1 font-mono">
                    <ArrowRight className="w-3 h-3 text-indigo-600" />
                    <span>Reduces stock by: <strong>{unit.multiplier} {unit.base_unit}s</strong> per quantity unit</span>
                  </div>
                </div>

                {/* Right: Price & Quick Add Button */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-right">
                    <div className="text-base font-black font-mono text-slate-900">
                      {formatAmount(unit.sellingPrice)}
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono block">
                      {unit.multiplier > 1 ? `${formatAmount(unit.sellingPrice / unit.multiplier)} / ${unit.base_unit}` : 'each'}
                    </span>
                  </div>

                  {/* Quantity and Add to Cart */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center bg-white rounded-xl border border-slate-300 p-0.5">
                      <button
                        type="button"
                        onClick={() => setQty(unit.id, getQty(unit.id) - 1)}
                        className="px-2 py-1 hover:bg-slate-100 text-slate-600 font-bold rounded-lg"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-xs">{getQty(unit.id)}</span>
                      <button
                        type="button"
                        onClick={() => setQty(unit.id, getQty(unit.id) + 1)}
                        className="px-2 py-1 hover:bg-slate-100 text-slate-600 font-bold rounded-lg"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!canFulfill}
                      onClick={() => {
                        onSelectUnit(product, unit, getQty(unit.id));
                        onClose();
                      }}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all whitespace-nowrap"
                      id={`btn-add-unit-${unit.id}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Automatic bulk break & multiplier deduction enabled</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
