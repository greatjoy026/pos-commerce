import React, { useState } from 'react';
import { 
  Barcode, QrCode, Sparkles, ScanLine, Camera, ShieldCheck, 
  MapPin, AlertTriangle, Hash, Calendar, Layers, CheckSquare, 
  Square, PackageCheck, Info, Scale, Plus, X, Check, Boxes,
  DollarSign
} from 'lucide-react';
import { 
  ProductType, BulkPackagingConfig, PackagingUnitsConfig, 
  CompositeComponentItem, BundleKitItem 
} from '../../types';

interface StepInventoryProps {
  sku: string;
  setSku: (v: string) => void;
  barcode: string;
  setBarcode: (v: string) => void;
  qrCode: string;
  setQrCode: (v: string) => void;
  stock: number;
  setStock: (v: number) => void;
  reorderPoint: number;
  setReorderPoint: (v: number) => void;
  location: 'Warehouse' | 'Store Shelf' | 'Fulfillment Center';
  setLocation: (v: 'Warehouse' | 'Store Shelf' | 'Fulfillment Center') => void;
  unit: string;
  setUnit: (v: string) => void;
  trackStock: boolean;
  setTrackStock: (v: boolean) => void;
  trackSerial: boolean;
  setTrackSerial: (v: boolean) => void;
  serialNumber?: string;
  setSerialNumber: (v: string) => void;
  trackBatch: boolean;
  setTrackBatch: (v: boolean) => void;
  batchNumber?: string;
  setBatchNumber: (v: string) => void;
  trackExpiry: boolean;
  setTrackExpiry: (v: boolean) => void;
  expiryDate?: string;
  setExpiryDate: (v: string) => void;
  onOpenLaserScanner: (target: 'barcode' | 'sku' | 'qr' | 'serial' | 'batch') => void;
  productType: ProductType;
  hasMultiUOM: boolean;
  setHasMultiUOM: (v: boolean) => void;
  packagingUnits?: PackagingUnitsConfig;
  setPackagingUnits?: (v: PackagingUnitsConfig) => void;
  compositeComponents?: CompositeComponentItem[];
  bundleKitItems?: BundleKitItem[];
  bulkPackaging?: BulkPackagingConfig;
  setBulkPackaging?: (v: BulkPackagingConfig) => void;
  cost?: number;
  setCost?: (v: number) => void;
  price?: number;
  setPrice?: (v: number) => void;
  errors: Record<string, string>;
}

const COMMON_UNITS = [
  'pcs', 'units', 'box', 'pack', 'pair', 'set', 'kg', 'g', 'l', 'm', 'bundle'
];

export default function StepInventory({
  sku,
  setSku,
  barcode,
  setBarcode,
  qrCode,
  setQrCode,
  stock,
  setStock,
  reorderPoint,
  setReorderPoint,
  location,
  setLocation,
  unit,
  setUnit,
  trackStock,
  setTrackStock,
  trackSerial,
  setTrackSerial,
  serialNumber = '',
  setSerialNumber,
  trackBatch,
  setTrackBatch,
  batchNumber = '',
  setBatchNumber,
  trackExpiry,
  setTrackExpiry,
  expiryDate = '',
  setExpiryDate,
  onOpenLaserScanner,
  productType,
  hasMultiUOM,
  setHasMultiUOM,
  bulkPackaging,
  setBulkPackaging,
  cost = 0,
  price = 0,
  errors
}: StepInventoryProps) {
  const generateRandomSku = () => {
    const prefix = 'SKU';
    const rand = Math.floor(100000 + Math.random() * 900000);
    setSku(`${prefix}-${rand}`);
  };

  const generateRandomBarcode = () => {
    const randomEan = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    setBarcode(randomEan);
  };

  const generateRandomQrCode = () => {
    setQrCode(sku ? `PROD-${sku}` : `QR-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  return (
    <div className="space-y-6">
      {/* Primary Identifiers */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Barcode className="w-4 h-4 text-indigo-600" />
            Product Identifiers & Scannables
          </h3>
          <p className="text-xs text-slate-500">Assign standard unique SKU, optical barcode, or QR for point-of-sale lookup.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SKU */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Stock Keeping Unit (SKU) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={generateRandomSku}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Auto
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. ELEC-HP-001"
                className={`w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm font-mono font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  errors.sku ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                }`}
              />
              <button
                type="button"
                onClick={() => onOpenLaserScanner('sku')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600"
                title="Scan SKU with camera/laser"
              >
                <ScanLine className="w-4 h-4" />
              </button>
            </div>
            {errors.sku && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.sku}</p>}
          </div>

          {/* Barcode / UPC */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Barcode / UPC / EAN
              </label>
              <button
                type="button"
                onClick={generateRandomBarcode}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Auto
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                placeholder="e.g. 793573189201"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              <button
                type="button"
                onClick={() => onOpenLaserScanner('barcode')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600"
                title="Scan Barcode with camera"
              >
                <ScanLine className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* QR Code */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                QR Code / 2D Matrix
              </label>
              <button
                type="button"
                onClick={generateRandomQrCode}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Auto
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={qrCode}
                onChange={e => setQrCode(e.target.value)}
                placeholder="e.g. PROD-HP-001"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              <button
                type="button"
                onClick={() => onOpenLaserScanner('qr')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600"
                title="Scan QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Level, Reorder Point & Location */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-indigo-600" />
            Stock Counts & Physical Storage
          </h3>
          <p className="text-xs text-slate-500">Set opening on-hand inventory, minimum reorder alerts, and physical storage zone.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Opening Stock */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Opening Stock Quantity
            </label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
              <input
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={e => setStock(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-transparent text-sm font-bold text-slate-900 focus:outline-hidden"
              />
              <span className="px-2.5 py-2 text-xs font-semibold text-slate-500 bg-slate-100 border-l border-slate-200">
                {unit}
              </span>
            </div>
          </div>

          {/* Reorder Point */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Low Stock Alert (Reorder Point)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={reorderPoint}
              onChange={e => setReorderPoint(Math.max(0, Number(e.target.value) || 0))}
              placeholder="10"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Primary Location
            </label>
            <select
              value={location}
              onChange={e => setLocation(e.target.value as any)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition-all"
            >
              <option value="Store Shelf">Store Shelf (Front-of-house)</option>
              <option value="Warehouse">Warehouse (Backroom)</option>
              <option value="Fulfillment Center">Fulfillment Center</option>
            </select>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Base Unit of Measure (UOM)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                list="common-uom-units"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="pcs"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              <datalist id="common-uom-units">
                {COMMON_UNITS.map(u => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
          </div>
        </div>
      </div>

      {/* Serialization & Batch Numbers (if enabled) */}
      {(trackSerial || trackBatch || trackExpiry) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Serial, Batch & Expiration Data
            </h3>
            <p className="text-xs text-slate-500">Fill in tracking information for serialized units, manufacturing batches, or expiry.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trackSerial && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Serial Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={e => setSerialNumber(e.target.value)}
                    placeholder="SN-8921-99201"
                    className={`w-full pl-3.5 pr-10 py-2 bg-slate-50 border rounded-xl text-sm font-mono font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                      errors.serialNumber ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => onOpenLaserScanner('serial')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600"
                  >
                    <ScanLine className="w-4 h-4" />
                  </button>
                </div>
                {errors.serialNumber && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.serialNumber}</p>}
              </div>
            )}

            {trackBatch && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Batch / Lot Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={e => setBatchNumber(e.target.value)}
                    placeholder="LOT-2026-08A"
                    className={`w-full pl-3.5 pr-10 py-2 bg-slate-50 border rounded-xl text-sm font-mono font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                      errors.batchNumber ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => onOpenLaserScanner('batch')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600"
                  >
                    <ScanLine className="w-4 h-4" />
                  </button>
                </div>
                {errors.batchNumber && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.batchNumber}</p>}
              </div>
            )}

            {trackExpiry && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expiration Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                    errors.expiryDate ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                  }`}
                />
                {errors.expiryDate && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.expiryDate}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Packaging Config (if hasMultiUOM is enabled) */}
      {hasMultiUOM && bulkPackaging && setBulkPackaging && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-xs">
          <div className="border-b border-indigo-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-indigo-600" />
              Packaging Multipliers & Bulk Units
            </h3>
            <p className="text-xs text-indigo-700">Configure how cases/boxes break down into sellable loose pieces and multi-tier prices.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Outer Package Type</label>
              <input
                type="text"
                value={bulkPackaging.outerPackageType}
                onChange={e => setBulkPackaging({ ...bulkPackaging, outerPackageType: e.target.value })}
                placeholder="Box / Carton"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Items Per Package</label>
              <input
                type="number"
                min="1"
                value={bulkPackaging.itemsPerPackage}
                onChange={e => setBulkPackaging({ ...bulkPackaging, itemsPerPackage: Math.max(1, Number(e.target.value) || 1) })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Outer Package Cost ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={bulkPackaging.outerPackageCost}
                onChange={e => setBulkPackaging({ ...bulkPackaging, outerPackageCost: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Outer Package Retail ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={bulkPackaging.outerPackageRetailPrice}
                onChange={e => setBulkPackaging({ ...bulkPackaging, outerPackageRetailPrice: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
