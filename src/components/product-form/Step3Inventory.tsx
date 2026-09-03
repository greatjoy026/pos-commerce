import React, { useState } from 'react';
import { 
  Barcode, QrCode, Sparkles, ScanLine, Camera, ShieldCheck, 
  MapPin, AlertTriangle, Hash, Calendar, Layers, CheckSquare, 
  Square, PackageCheck, Info, Scale, Plus, X, Check, Boxes
} from 'lucide-react';
import { ProductPackagingConfig } from '../../types';
import PackagingUOMBuilder from './PackagingUOMBuilder';

interface Step3InventoryProps {
  sku: string;
  setSku: (v: string) => void;
  barcode: string;
  setBarcode: (v: string) => void;
  qrCode: string;
  setQrCode: (v: string) => void;
  trackInventory: boolean;
  setTrackInventory: (v: boolean) => void;
  trackSerial: boolean;
  setTrackSerial: (v: boolean) => void;
  trackBatch: boolean;
  setTrackBatch: (v: boolean) => void;
  trackExpiry: boolean;
  setTrackExpiry: (v: boolean) => void;
  unit: string;
  setUnit: (v: string) => void;
  stock: number;
  setStock: (v: number) => void;
  reorderPoint: number;
  setReorderPoint: (v: number) => void;
  location: 'Warehouse' | 'Store Shelf' | 'Fulfillment Center';
  setLocation: (v: 'Warehouse' | 'Store Shelf' | 'Fulfillment Center') => void;
  serialNumbers: string[];
  setSerialNumbers: (v: string[]) => void;
  batchLot: string;
  setBatchLot: (v: string) => void;
  expiryDate: string;
  setExpiryDate: (v: string) => void;
  hasVariants: boolean;
  variantCount: number;
  computedVariantStock: number;
  productName: string;
  category: string;
  onOpenLaserScanner: (target: 'barcode' | 'sku' | 'qr' | 'serial' | 'batch') => void;
  errors: Record<string, string>;
  packaging?: ProductPackagingConfig;
  setPackaging?: (cfg: ProductPackagingConfig | undefined | ((prev: ProductPackagingConfig | undefined) => ProductPackagingConfig | undefined)) => void;
  basePrice?: number;
  setBasePrice?: (p: number) => void;
  baseCost?: number;
  setBaseCost?: (c: number) => void;
}

const COMMON_UNITS = [
  'pcs', 'units', 'box', 'pack', 'pair', 'set', 'kg', 'g', 'l', 'm', 'bundle'
];

export default function Step3Inventory({
  sku,
  setSku,
  barcode,
  setBarcode,
  qrCode,
  setQrCode,
  trackInventory,
  setTrackInventory,
  trackSerial,
  setTrackSerial,
  trackBatch,
  setTrackBatch,
  trackExpiry,
  setTrackExpiry,
  unit,
  setUnit,
  stock,
  setStock,
  reorderPoint,
  setReorderPoint,
  location,
  setLocation,
  serialNumbers,
  setSerialNumbers,
  batchLot,
  setBatchLot,
  expiryDate,
  setExpiryDate,
  hasVariants,
  variantCount,
  computedVariantStock,
  productName,
  category,
  onOpenLaserScanner,
  errors,
  packaging,
  setPackaging,
  basePrice = 4.00,
  setBasePrice,
  baseCost = 2.50,
  setBaseCost
}: Step3InventoryProps) {
  const [newSerialInput, setNewSerialInput] = useState('');

  // Auto Generate SKU
  const handleAutoGenerateSku = () => {
    const prefix = (productName ? productName.substring(0, 3) : (category || 'PRD')).toUpperCase().replace(/[^A-Z]/g, '');
    const num = Math.floor(100 + Math.random() * 899);
    const newSku = `${prefix || 'SKU'}-${num}`;
    setSku(newSku);
    if (!qrCode || qrCode.startsWith('QR-')) {
      setQrCode(`QR-${newSku}`);
    }
  };

  // Auto Generate Barcode (EAN-13)
  const handleAutoGenerateBarcode = () => {
    const newBarcode = `${880000000000 + Math.floor(Math.random() * 9999999999)}`;
    setBarcode(newBarcode);
  };

  // Add Serial Number
  const handleAddSerial = () => {
    if (newSerialInput.trim() && !serialNumbers.includes(newSerialInput.trim())) {
      setSerialNumbers([...serialNumbers, newSerialInput.trim()]);
      setNewSerialInput('');
    }
  };

  // Remove Serial Number
  const handleRemoveSerial = (index: number) => {
    setSerialNumbers(serialNumbers.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="step-3-inventory">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-indigo-600" />
            <span>Inventory Identity & Tracking Rules</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Set unique stock keeping units (SKU), optical barcode symbology, serial numbers, lot batches, and inventory thresholds.
          </p>
        </div>

        {/* Optical Laser Sensor Fast Action */}
        <button
          type="button"
          onClick={() => onOpenLaserScanner('barcode')}
          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
          id="btn-laser-scan-inventory-step"
        >
          <ScanLine className="w-3.5 h-3.5" />
          <span>⚡ Optical Hardware Sensor</span>
        </button>
      </div>

      {/* Row 1: Master SKU & Barcode & QR */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Master SKU */}
        <div className="md:col-span-4 space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span>Master SKU Code</span>
              <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleAutoGenerateSku}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
              id="btn-gen-sku-step3"
            >
              <Sparkles className="w-3.5 h-3.5" /> Auto
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="e.g., EL-HP-001"
              className={`w-full pl-3.5 pr-9 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm font-mono font-bold uppercase focus:bg-white focus:ring-2 focus:ring-slate-950 focus:outline-hidden transition-all ${
                errors.sku ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
              }`}
              id="input-inventory-sku"
            />
            <button
              type="button"
              onClick={() => onOpenLaserScanner('sku')}
              className="absolute right-2 top-2.5 p-1 text-slate-400 hover:text-indigo-600 rounded-md"
              title="Scan SKU with Camera"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          {errors.sku && <p className="text-xs text-red-600 font-medium">{errors.sku}</p>}
        </div>

        {/* Barcode / UPC / EAN */}
        <div className="md:col-span-4 space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Barcode className="w-3.5 h-3.5 text-slate-400" />
              <span>Barcode / UPC / EAN-13</span>
            </label>
            <button
              type="button"
              onClick={handleAutoGenerateBarcode}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
              id="btn-gen-barcode-step3"
            >
              Auto EAN
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="880192837401"
              className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-semibold focus:bg-white focus:ring-2 focus:ring-slate-950 focus:outline-hidden transition-all"
              id="input-inventory-barcode"
            />
            <button
              type="button"
              onClick={() => onOpenLaserScanner('barcode')}
              className="absolute right-2 top-2.5 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
              title="Scan Barcode with Optical Sensor"
            >
              <ScanLine className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* QR Code Payload */}
        <div className="md:col-span-4 space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-slate-400" />
              <span>QR Code Payload Link</span>
            </label>
            <button
              type="button"
              onClick={() => setQrCode(`QR-${sku || 'ITEM'}`)}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
            >
              Reset to SKU
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              placeholder={`QR-${sku || 'ITEM'}`}
              className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-semibold focus:bg-white focus:ring-2 focus:ring-slate-950 focus:outline-hidden transition-all"
              id="input-inventory-qrcode"
            />
            <button
              type="button"
              onClick={() => onOpenLaserScanner('qr')}
              className="absolute right-2 top-2.5 p-1 text-indigo-500 hover:text-indigo-700 rounded-md"
              title="Scan QR with Camera"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Row 2: Stock Units, Unit of Measure, Reorder Point, Storage Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stock Units */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-800">
              On-Hand Stock Units *
            </label>
            {hasVariants && (
              <span className="text-[10px] text-indigo-600 font-bold">
                From {variantCount} variants
              </span>
            )}
          </div>
          <input
            type="number"
            min="0"
            disabled={hasVariants && variantCount > 0}
            value={hasVariants && variantCount > 0 ? computedVariantStock : stock}
            onChange={(e) => setStock(Math.max(0, Number(e.target.value)))}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 disabled:opacity-75 focus:outline-hidden focus:ring-2 focus:ring-slate-950"
            id="input-inventory-stock"
          />
          {hasVariants && variantCount > 0 ? (
            <p className="text-[10px] text-indigo-600">
              Aggregated dynamically across all {variantCount} variant rows.
            </p>
          ) : (
            <p className="text-[10px] text-slate-400">
              Initial physical stock count in inventory.
            </p>
          )}
        </div>

        {/* Unit of Measure */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-slate-400" />
            <span>Unit of Measurement</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g., pcs, box, kg"
              list="units-datalist"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-950"
              id="input-inventory-unit"
            />
            <datalist id="units-datalist">
              {COMMON_UNITS.map(u => <option key={u} value={u} />)}
            </datalist>
          </div>
          <div className="flex flex-wrap gap-1">
            {COMMON_UNITS.slice(0, 4).map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`text-[9px] px-1.5 py-0.5 rounded border transition-all ${
                  unit === u ? 'bg-slate-900 text-white border-slate-900 font-bold' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Low-Stock Reorder Point */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Reorder Alert Level</span>
            </label>
          </div>
          <input
            type="number"
            min="0"
            value={reorderPoint}
            onChange={(e) => setReorderPoint(Math.max(0, Number(e.target.value)))}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-950"
            id="input-inventory-reorder"
          />
          <p className="text-[10px] text-slate-400">
            Triggers low-stock warnings when inventory drops below this number.
          </p>
        </div>

        {/* Primary Storage Location */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
            <span>Primary Inventory Node</span>
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value as any)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-950"
            id="select-inventory-location"
          >
            <option value="Store Shelf">Store Shelf (Retail Floor)</option>
            <option value="Warehouse">Warehouse (Main Facility)</option>
            <option value="Fulfillment Center">Fulfillment Center (Depot)</option>
          </select>
          <p className="text-[10px] text-slate-400">
            Default picking and bin dispatch location.
          </p>
        </div>

      </div>

      {/* Row 2.5: Packaged Goods, Multi-UoM & Break-Bulk Conversion */}
      {setPackaging && (
        <PackagingUOMBuilder
          packaging={packaging}
          setPackaging={setPackaging}
          basePrice={basePrice}
          setBasePrice={setBasePrice}
          baseCost={baseCost}
          setBaseCost={setBaseCost}
          stock={stock}
          setStock={setStock}
          unit={unit}
          setUnit={setUnit}
        />
      )}

      {/* Row 3: Advanced Inventory Tracking Rules & Camera Scanners */}
      <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Advanced Tracking & Compliance Rules</span>
          </h4>
          <span className="text-[11px] text-slate-500">
            Enable granular tracking policies
          </span>
        </div>

        {/* 4 Feature Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Toggle 1: Track Inventory */}
          <div 
            onClick={() => setTrackInventory(!trackInventory)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              trackInventory 
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20' 
                : 'bg-white border-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Track Inventory</span>
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                trackInventory ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {trackInventory ? '✓' : ''}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Deducts stock automatically on POS checkout & e-commerce orders.
            </p>
          </div>

          {/* Toggle 2: Track Serial Numbers */}
          <div 
            onClick={() => setTrackSerial(!trackSerial)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              trackSerial 
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20' 
                : 'bg-white border-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Track Serial Numbers</span>
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                trackSerial ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {trackSerial ? '✓' : ''}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              For electronics & high-value equipment with unique serialized IDs.
            </p>
          </div>

          {/* Toggle 3: Track Batch / Lot */}
          <div 
            onClick={() => setTrackBatch(!trackBatch)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              trackBatch 
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20' 
                : 'bg-white border-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Track Batch / Lot #</span>
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                trackBatch ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {trackBatch ? '✓' : ''}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Trace supplier production runs and manufacturing batch codes.
            </p>
          </div>

          {/* Toggle 4: Track Expiry */}
          <div 
            onClick={() => setTrackExpiry(!trackExpiry)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              trackExpiry 
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20' 
                : 'bg-white border-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Track Expiry Date</span>
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                trackExpiry ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {trackExpiry ? '✓' : ''}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Triggers FEFO (First-Expired-First-Out) alerts for perishable goods.
            </p>
          </div>

        </div>

        {/* Dynamic Fields for Serial & Batch with CAMERA SCANNING */}
        <div className="space-y-3 pt-2">
           {/* If Track Serial is Enabled */}
          {trackSerial && (
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Serialized Unit Numbers ({serialNumbers.length} registered)</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  Type or scan barcode/QR on unit label
                </span>
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newSerialInput}
                    onChange={(e) => setNewSerialInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSerial(); } }}
                    placeholder="e.g., SN-89218201"
                    className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    id="input-manual-serial"
                  />
                  <button
                    type="button"
                    onClick={() => onOpenLaserScanner('serial')}
                    className="absolute right-2 top-2 p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                    title="Scan Serial with Camera"
                    id="btn-scan-serial-camera-inside"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAddSerial}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all shrink-0"
                >
                  + Add Serial
                </button>
              </div>

              {serialNumbers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1 max-h-28 overflow-y-auto">
                  {serialNumbers.map((sn, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 font-mono text-[11px] font-bold rounded-lg border border-slate-200">
                      <span>{sn}</span>
                      <button 
                        type="button"
                        onClick={() => handleRemoveSerial(idx)}
                        className="text-slate-400 hover:text-red-500 rounded p-0.5"
                        title="Remove Serial"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  No serial numbers registered yet. Type manually or use the camera scan icon inside the field.
                </p>
              )}
            </div>
          )}

          {/* If Batch or Expiry Enabled */}
          {(trackBatch || trackExpiry) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-white rounded-xl border border-slate-200 animate-in fade-in duration-150">
              {trackBatch && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    Batch / Lot Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={batchLot}
                      onChange={(e) => setBatchLot(e.target.value)}
                      placeholder="e.g. LOT-2026-AUG-88"
                      className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                      id="input-batch-lot-number"
                    />
                    <button
                      type="button"
                      onClick={() => onOpenLaserScanner('batch')}
                      className="absolute right-2 top-2 p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                      title="Scan Batch # with Camera"
                      id="btn-scan-batch-camera-inside"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {trackExpiry && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Expiry / Shelf-Life Date</span>
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
