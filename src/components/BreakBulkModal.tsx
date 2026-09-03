import React, { useState } from 'react';
import { 
  Boxes, Package, ArrowRight, ArrowDown, ArrowUp, CheckCircle2, 
  AlertTriangle, RefreshCw, X, Sparkles, Box, Layers, History
} from 'lucide-react';
import { Product, ProductPackagingConfig } from '../types';
import { useCurrency } from '../context/CurrencyContext';

interface BreakBulkModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSaveProduct: (updatedProduct: Product, auditNote: string) => void;
}

export default function BreakBulkModal({
  isOpen,
  onClose,
  product,
  onSaveProduct
}: BreakBulkModalProps) {
  const { currencySymbol, formatAmount } = useCurrency();
  const [activeTab, setActiveTab] = useState<'unpack' | 'repack'>('unpack');
  const [boxesToUnpack, setBoxesToUnpack] = useState<number>(1);
  const [boxesToRepack, setBoxesToRepack] = useState<number>(1);
  const [notes, setNotes] = useState<string>('Front store shelf replenishment');

  if (!isOpen || !product) return null;

  const packUnit = product.packagingUnits?.find(u => u.sellingMode === 'pack_selling' || (u.multiplier && u.multiplier > 1));
  const retailUnit = product.packagingUnits?.find(u => u.sellingMode === 'retail_unit' || u.multiplier === 1);

  const unitsPerBox = product.packaging?.unitsPerPackage || packUnit?.multiplier || 30;
  const currentSealed = product.packaging?.sealedPackageStock ?? Math.floor(product.stock / unitsPerBox);
  const currentLoose = product.packaging?.looseUnitStock ?? (product.stock % unitsPerBox);
  const boxName = product.packaging?.purchasePackagingName || packUnit?.unitName || 'Box';
  const unitName = product.packaging?.baseSellingUnitName || retailUnit?.base_unit || product.base_unit || 'Piece';

  const pkg: ProductPackagingConfig = product.packaging || {
    hasPackaging: true,
    purchasePackagingName: boxName,
    unitsPerPackage: unitsPerBox,
    packageCost: product.cost * unitsPerBox,
    calculatedUnitCost: product.cost,
    baseSellingUnitName: unitName,
    inventoryTrackingMode: 'dual_stock',
    sealedPackageStock: currentSealed,
    looseUnitStock: currentLoose,
    sellingTiers: []
  };

  // Calculate unbox preview
  const maxUnpack = currentSealed;
  const validUnpack = Math.min(Math.max(1, boxesToUnpack), Math.max(1, maxUnpack));
  const afterUnpackSealed = Math.max(0, currentSealed - validUnpack);
  const afterUnpackLoose = currentLoose + (validUnpack * unitsPerBox);

  // Calculate repack preview
  const maxRepack = Math.floor(currentLoose / unitsPerBox);
  const validRepack = Math.min(Math.max(1, boxesToRepack), Math.max(1, maxRepack));
  const afterRepackSealed = currentSealed + validRepack;
  const afterRepackLoose = Math.max(0, currentLoose - (validRepack * unitsPerBox));

  const handleExecute = () => {
    if (activeTab === 'unpack') {
      if (currentSealed < 1) return;
      const updatedPackaging: ProductPackagingConfig = {
        ...pkg,
        sealedPackageStock: afterUnpackSealed,
        looseUnitStock: afterUnpackLoose
      };
      const updatedProduct: Product = {
        ...product,
        packaging: updatedPackaging,
        stock: (afterUnpackSealed * unitsPerBox) + afterUnpackLoose
      };
      const log = `Break-Bulk: Unpacked ${validUnpack} sealed ${boxName}(es) into +${validUnpack * unitsPerBox} loose ${unitName}s. (${notes})`;
      onSaveProduct(updatedProduct, log);
    } else {
      if (maxRepack < 1) return;
      const updatedPackaging: ProductPackagingConfig = {
        ...pkg,
        sealedPackageStock: afterRepackSealed,
        looseUnitStock: afterRepackLoose
      };
      const updatedProduct: Product = {
        ...product,
        packaging: updatedPackaging,
        stock: (afterRepackSealed * unitsPerBox) + afterRepackLoose
      };
      const log = `Re-pack: Boxed ${validRepack * unitsPerBox} loose ${unitName}s into +${validRepack} sealed ${boxName}(es). (${notes})`;
      onSaveProduct(updatedProduct, log);
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-in fade-in duration-200"
      id="break-bulk-modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
        id="break-bulk-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Break-Bulk & Carton Unbox Studio</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-xs sm:max-w-sm">
                {product.name} ({product.sku})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-all"
            id="btn-close-break-bulk-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Stock Breakdown Ribbon */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-medium uppercase block">Sealed {boxName}es</span>
              <span className="font-mono font-bold text-amber-400 text-sm">{currentSealed} {boxName}s</span>
              <span className="text-[9px] text-slate-400 block">({currentSealed * unitsPerBox} pcs)</span>
            </div>
            <div className="text-slate-600 font-bold">+</div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium uppercase block">Loose Shelf Units</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{currentLoose} {unitName}s</span>
              <span className="text-[9px] text-slate-400 block">(Ready for sale)</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-medium uppercase block">Total On-Hand</span>
            <span className="font-mono font-extrabold text-white text-base">
              {(currentSealed * unitsPerBox) + currentLoose} {unitName}s
            </span>
          </div>
        </div>

        {/* Tab Toggle: Unpack vs Repack */}
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('unpack')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'unpack'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id="tab-unpack-carton"
            >
              <ArrowDown className="w-4 h-4 text-indigo-600" />
              <span>Unbox / Break Carton</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('repack')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'repack'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id="tab-repack-carton"
            >
              <ArrowUp className="w-4 h-4 text-indigo-600" />
              <span>Re-pack into {boxName}</span>
            </button>
          </div>

          {/* Tab 1: Unpack Carton */}
          {activeTab === 'unpack' ? (
            <div className="space-y-4">
              
              {currentSealed < 1 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-amber-900">No Sealed {boxName}es Available</h5>
                    <p className="text-xs text-amber-700 mt-0.5">
                      All inventory for this item is currently in loose shelf units. Receive new wholesale shipments to replenish sealed cartons.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        How many sealed {boxName}es to unbox?
                      </label>
                      <span className="text-xs font-mono font-bold text-indigo-600">
                        Max: {maxUnpack} {boxName}s
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max={maxUnpack}
                        value={boxesToUnpack}
                        onChange={(e) => setBoxesToUnpack(Math.min(maxUnpack, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-indigo-700 text-center"
                        id="input-unbox-count"
                      />
                      <div className="flex-1 text-xs text-slate-600">
                        = <strong>+{validUnpack * unitsPerBox} loose {unitName}s</strong> added to store shelf
                      </div>
                    </div>
                  </div>

                  {/* Flow Simulation Box */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Inventory State After Unbox:
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Warehouse Cartons</span>
                        <div className="font-mono font-bold text-slate-900">
                          {currentSealed} → <span className="text-amber-600">{afterUnpackSealed} {boxName}s</span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Store Shelf Units</span>
                        <div className="font-mono font-bold text-slate-900">
                          {currentLoose} → <span className="text-emerald-600 font-extrabold">{afterUnpackLoose} {unitName}s</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* Tab 2: Re-pack */
            <div className="space-y-4">
              {maxRepack < 1 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-amber-900">Not Enough Loose Units</h5>
                    <p className="text-xs text-amber-700 mt-0.5">
                      You have {currentLoose} loose units, but need at least {unitsPerBox} units to form 1 full sealed {boxName}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        How many {boxName}es to pack?
                      </label>
                      <span className="text-xs font-mono font-bold text-indigo-600">
                        Max: {maxRepack} {boxName}s ({maxRepack * unitsPerBox} units)
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max={maxRepack}
                        value={boxesToRepack}
                        onChange={(e) => setBoxesToRepack(Math.min(maxRepack, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-indigo-700 text-center"
                        id="input-repack-count"
                      />
                      <div className="flex-1 text-xs text-slate-600">
                        = <strong>-{validRepack * unitsPerBox} loose units</strong> converted into {validRepack} sealed {boxName}s
                      </div>
                    </div>
                  </div>

                  {/* Flow Simulation Box */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Inventory State After Re-pack:
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Warehouse Cartons</span>
                        <div className="font-mono font-bold text-slate-900">
                          {currentSealed} → <span className="text-indigo-600 font-extrabold">{afterRepackSealed} {boxName}s</span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Store Shelf Units</span>
                        <div className="font-mono font-bold text-slate-900">
                          {currentLoose} → <span className="text-slate-700">{afterRepackLoose} {unitName}s</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reason note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Audit Reason / Note:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Replenishing sales floor shelf"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              id="input-breakbulk-notes"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all"
            id="btn-cancel-break-bulk"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={activeTab === 'unpack' ? currentSealed < 1 : maxRepack < 1}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            id="btn-confirm-break-bulk"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{activeTab === 'unpack' ? `Confirm Unbox (+${validUnpack * unitsPerBox} Units)` : `Confirm Re-pack (+${validRepack} ${boxName}s)`}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
