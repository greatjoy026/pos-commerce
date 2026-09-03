import React, { useState } from 'react';
import { 
  Package, Tag, Building2, Layers, CheckCircle2, FileText, 
  Sparkles, Globe, Shield, Box, Sparkle, Plus, X, Wand2,
  RefreshCw, Check, Zap, AlertCircle, RotateCcw, Boxes, Calendar,
  Store, ShoppingCart, Truck, MapPin, Hash, QrCode, Cpu, Gift,
  FileCheck, ShieldAlert
} from 'lucide-react';
import { ProductType, ProductStatus, TrackingMode, RotationMethod, Category } from '../../types';

interface StepBasicInfoProps {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  brand: string;
  setBrand: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  existingCategories: string[];
  categoriesList?: Category[];
  existingBrands?: string[];
  productType: ProductType;
  setProductType: (v: ProductType) => void;
  hasVariants: boolean;
  setHasVariants: (v: boolean) => void;
  inventoryTracking: TrackingMode;
  setInventoryTracking: (v: TrackingMode) => void;
  trackExpiry: boolean;
  setTrackExpiry: (v: boolean) => void;
  stockRotationMethod: RotationMethod;
  setStockRotationMethod: (v: RotationMethod) => void;
  hasMultiUOM: boolean;
  setHasMultiUOM: (v: boolean) => void;
  returnable: boolean;
  setReturnable: (v: boolean) => void;
  sellOnPOS?: boolean;
  setSellOnPOS?: (v: boolean) => void;
  publishToStore?: boolean;
  setPublishToStore?: (v: boolean) => void;
  shippingEnabled?: boolean;
  setShippingEnabled?: (v: boolean) => void;
  storePickup?: boolean;
  setStorePickup?: (v: boolean) => void;
  status: ProductStatus;
  setStatus: (v: ProductStatus) => void;
  errors: Record<string, string>;
}

const DEFAULT_POPULAR_BRANDS = [
  'Sony', 'Apple', 'Logitech', 'Samsung', 'Nike', 'Anker', 'Bose', 'Dyson', 'Generic / In-House'
];

interface ProductTypeDefinition {
  type: ProductType;
  label: string;
  category: string;
  desc: string;
  badge: string;
  icon: string;
}

const PRODUCT_TYPE_DEFINITIONS: ProductTypeDefinition[] = [
  {
    type: 'Standard',
    label: 'Standard Product',
    category: 'Physical Goods',
    desc: 'Normal standalone product with direct physical inventory count.',
    badge: 'Standalone SKU',
    icon: '📦',
  },
  {
    type: 'Composite',
    label: 'Composite Product',
    category: 'BOM / Assembly',
    desc: 'Assembled or manufactured from child parts / Bill of Materials (BOM).',
    badge: 'Recipe / Assembly',
    icon: '🛠️',
  },
  {
    type: 'Bundle',
    label: 'Bundle / Kit',
    category: 'Commercial Kit',
    desc: 'Commercial pack of multiple distinct products sold together.',
    badge: 'Pack Bundle',
    icon: '🎁',
  },
  {
    type: 'Service',
    label: 'Service',
    category: 'Non-Inventory',
    desc: 'Labor, installation, repair, consulting or hourly fee (no physical stock).',
    badge: 'Labor / Fee',
    icon: '⚡',
  },
  {
    type: 'Digital',
    label: 'Digital Product',
    category: 'Electronic',
    desc: 'Digitally delivered software, licenses, eBooks, or download links.',
    badge: 'Digital Asset',
    icon: '💾',
  },
  {
    type: 'Rental',
    label: 'Rental Product',
    category: 'Asset / Equipment',
    desc: 'Temporarily leased or rented equipment, gear, tools, or vehicles.',
    badge: 'Lease / Return',
    icon: '🔄',
  },
];

export default function StepBasicInfo({
  name,
  setName,
  description,
  setDescription,
  brand,
  setBrand,
  category,
  setCategory,
  existingCategories,
  categoriesList = [],
  existingBrands = [],
  productType,
  setProductType,
  hasVariants,
  setHasVariants,
  inventoryTracking,
  setInventoryTracking,
  trackExpiry,
  setTrackExpiry,
  stockRotationMethod,
  setStockRotationMethod,
  hasMultiUOM,
  setHasMultiUOM,
  returnable,
  setReturnable,
  sellOnPOS = true,
  setSellOnPOS,
  publishToStore = true,
  setPublishToStore,
  shippingEnabled = true,
  setShippingEnabled,
  storePickup = true,
  setStorePickup,
  status,
  setStatus,
  errors
}: StepBasicInfoProps) {
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const allCategoryNames = Array.from(
    new Set([
      ...(categoriesList?.map(c => c.name) || []),
      ...existingCategories
    ].filter(Boolean))
  );

  const allBrandSuggestions = Array.from(
    new Set([...existingBrands, ...DEFAULT_POPULAR_BRANDS].filter(Boolean))
  );

  const handleApplyAiPreset = (presetType: 'coke' | 'iphone' | 'nike' | 'pc' | 'bundle' | 'pharma') => {
    if (presetType === 'coke') {
      setName('Coca-Cola Original 330ml Can (Pack of 24)');
      setBrand('Coca-Cola');
      setCategory('Beverages & Groceries');
      setDescription('Refreshing sparkling cola in recyclable aluminum cans. Suitable for retail loose piece sale or full carton wholesale.');
      setProductType('Standard');
      setHasVariants(false);
      setInventoryTracking('BATCH');
      setTrackExpiry(true);
      setStockRotationMethod('FEFO');
      setHasMultiUOM(true);
      setReturnable(false);
    } else if (presetType === 'iphone') {
      setName('Apple iPhone 17 Pro Max Titanium');
      setBrand('Apple');
      setCategory('Electronics & Mobile');
      setDescription('Flagship A19 Pro powerhouse with ProMotion Super Retina XDR display and advanced optical zoom.');
      setProductType('Standard');
      setHasVariants(true);
      setInventoryTracking('SERIAL');
      setTrackExpiry(false);
      setStockRotationMethod('FIFO');
      setHasMultiUOM(false);
      setReturnable(true);
    } else if (presetType === 'nike') {
      setName('Nike Air Max 270 React Running Shoes');
      setBrand('Nike');
      setCategory('Footwear & Apparel');
      setDescription('Responsive lightweight running shoes featuring maximum Air unit cushioning and breathable knit upper.');
      setProductType('Standard');
      setHasVariants(true);
      setInventoryTracking('QUANTITY');
      setTrackExpiry(false);
      setStockRotationMethod('FIFO');
      setHasMultiUOM(false);
      setReturnable(true);
    } else if (presetType === 'pc') {
      setName('OmniPro Creator Workstation PC (Intel Core i9 + RTX 4080)');
      setBrand('OmniTech Custom');
      setCategory('Computers & Hardware');
      setDescription('Pre-assembled high performance workstation built from premium selected components.');
      setProductType('Composite');
      setHasVariants(false);
      setInventoryTracking('SERIAL');
      setTrackExpiry(false);
      setStockRotationMethod('FIFO');
      setHasMultiUOM(false);
      setReturnable(true);
    } else if (presetType === 'bundle') {
      setName('Back-To-School Complete Student Starter Pack');
      setBrand('Generic / In-House');
      setCategory('Office & Stationery');
      setDescription('Curated commercial kit containing 5 exercise books, 3 ballpoint pens, 2 pencils, ruler, and backpack.');
      setProductType('Bundle');
      setHasVariants(false);
      setInventoryTracking('QUANTITY');
      setTrackExpiry(false);
      setStockRotationMethod('FIFO');
      setHasMultiUOM(false);
      setReturnable(true);
    } else if (presetType === 'pharma') {
      setName('BioHealth Vitamin C 1000mg + Zinc (100 Tablets)');
      setBrand('BioHealth');
      setCategory('Health & Wellness');
      setDescription('Immune support dietary supplement with high-potency antioxidant formula.');
      setProductType('Standard');
      setHasVariants(false);
      setInventoryTracking('BATCH');
      setTrackExpiry(true);
      setStockRotationMethod('FEFO');
      setHasMultiUOM(true);
      setReturnable(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Blueprint Presets */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-slate-50 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold tracking-wide uppercase">
                Step 1: Product Architecture
              </span>
              <span className="text-xs text-indigo-700 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Decoupled Product & Behavior Engine
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              General Information & Inventory Capabilities
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Define the primary catalog type and combine coexisting capabilities (Multi-UOM, Batch, Serial, FEFO Expiry, Variants).
            </p>
          </div>

          {/* Publishing Status Toggle */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs self-start md:self-auto">
            {(['Active', 'Draft', 'Archived'] as ProductStatus[]).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  status === st
                    ? st === 'Active'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : st === 'Draft'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Architectural Example Presets */}
        <div className="mt-4 pt-3 border-t border-indigo-100/70">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
            Quick Example Architectures:
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleApplyAiPreset('coke')}
              className="px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50/50 transition-all shadow-2xs"
            >
              🥤 <b>Coca-Cola:</b> Standard + Multi-UOM + Batch + FEFO
            </button>
            <button
              type="button"
              onClick={() => handleApplyAiPreset('iphone')}
              className="px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50/50 transition-all shadow-2xs"
            >
              📱 <b>iPhone 17:</b> Standard + Variants + Serialized
            </button>
            <button
              type="button"
              onClick={() => handleApplyAiPreset('nike')}
              className="px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50/50 transition-all shadow-2xs"
            >
              👟 <b>Nike Shoes:</b> Standard + Variants (Size/Color)
            </button>
            <button
              type="button"
              onClick={() => handleApplyAiPreset('pc')}
              className="px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50/50 transition-all shadow-2xs"
            >
              🖥️ <b>Workstation PC:</b> Composite (BOM) + Serial
            </button>
            <button
              type="button"
              onClick={() => handleApplyAiPreset('bundle')}
              className="px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50/50 transition-all shadow-2xs"
            >
              🎒 <b>School Pack:</b> Bundle / Kit (Child components)
            </button>
            <button
              type="button"
              onClick={() => handleApplyAiPreset('pharma')}
              className="px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50/50 transition-all shadow-2xs"
            >
              💊 <b>Pharma:</b> Standard + Batch + FEFO Expiry
            </button>
          </div>
        </div>
      </div>

      {/* Core Identification */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-600" />
            Product Identity & Categorization
          </h3>
          <p className="text-xs text-slate-500">Provide naming, brand, and master taxonomy category.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Product Name */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Product Title / Commercial Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Coca-Cola 330ml Can, iPhone 17 Pro 256GB, Nike Air Max 270"
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                errors.name ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.name}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Master Catalog Category <span className="text-rose-500">*</span>
            </label>
            {!isCustomCategory ? (
              <div className="flex gap-2">
                <select
                  value={category}
                  onChange={e => {
                    if (e.target.value === '__new__') {
                      setIsCustomCategory(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                    errors.category ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                  }`}
                >
                  {allCategoryNames.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__new__">+ Create New Category...</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCategoryInput}
                  onChange={e => setCustomCategoryInput(e.target.value)}
                  placeholder="Enter custom category..."
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customCategoryInput.trim()) {
                      setCategory(customCategoryInput.trim());
                      setIsCustomCategory(false);
                      setCustomCategoryInput('');
                    }
                  }}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(false)}
                  className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {errors.category && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.category}</p>}
          </div>

          {/* Brand */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Brand / Manufacturer
            </label>
            <input
              type="text"
              list="brand-suggestions"
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder="e.g. Sony, Apple, Coca-Cola, Nike, Generic"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            <datalist id="brand-suggestions">
              {allBrandSuggestions.map(b => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Product Description & Sales Highlights
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe technical features, warranty, in-the-box items, storage recommendations, and promotional highlights..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition-all resize-y"
            />
          </div>
        </div>
      </div>

      {/* 1. Primary Product Type (What is the product?) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              1. Product Type <span className="text-xs font-normal text-slate-500">(What is the product?)</span>
            </h3>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Primary Architecture
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Select the fundamental nature of this catalog item. Features like Variants, Serialization, Batching, and Multi-UOM are configured below.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRODUCT_TYPE_DEFINITIONS.map(opt => {
            const isSelected = productType === opt.type;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => setProductType(opt.type)}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-200 shadow-xs'
                    : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {opt.badge}
                    </span>
                    {isSelected && (
                      <span className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-900 mt-2">{opt.label}</div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Product Features & Inventory Behaviors (Coexisting capabilities) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              2. Product Behaviors & Capabilities <span className="text-xs font-normal text-slate-500">(How does the product behave?)</span>
            </h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Combinable Features
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Enable any combination of inventory tracking, multi-UOM pack breakdown, variant matrices, and sales channels.
          </p>
        </div>

        {/* Behavioral Section A: Variations & Multi-SKU */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasVariants}
              onChange={e => setHasVariants(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Product Variations & Multi-SKU Matrix</span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                  {hasVariants ? 'Variants Active' : 'Single SKU'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Product has sellable options (e.g. Size, Color, Storage capacity). Each variant generates an independent sellable SKU with custom price, barcode, and inventory.
              </p>
            </div>
          </label>
        </div>

        {/* Behavioral Section B: Inventory Tracking Mode */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              Inventory Tracking Method
            </label>
            <span className="text-[11px] text-slate-500 font-mono">
              Active: <b>{inventoryTracking}</b>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              { 
                id: 'QUANTITY', 
                label: 'Quantity Stock', 
                icon: '📊', 
                desc: 'Standard quantity counts on hand and reorder points' 
              },
              { 
                id: 'SERIAL', 
                label: 'Serial / IMEI', 
                icon: '🏷️', 
                desc: 'Unique unit tracking per item with warranty & IMEI records' 
              },
              { 
                id: 'BATCH', 
                label: 'Batch / Lot Controlled', 
                icon: '📦', 
                desc: 'Manufacturing lots, production batches & received dates' 
              },
              { 
                id: 'NONE', 
                label: 'No Inventory Tracking', 
                icon: '⚡', 
                desc: 'Services, digital downloads, or unlimited catalog stock' 
              },
            ].map(mode => {
              const isModeSelected = inventoryTracking === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setInventoryTracking(mode.id as TrackingMode)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    isModeSelected
                      ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-300 font-bold text-indigo-950 shadow-2xs'
                      : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg">{mode.icon}</span>
                    {isModeSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </div>
                  <div className="font-bold text-slate-900">{mode.label}</div>
                  <div className="text-[11px] text-slate-500 font-normal mt-0.5 leading-snug">{mode.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Behavioral Section C: Expiry Tracking & Stock Rotation Policies */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={trackExpiry}
              onChange={e => {
                const next = e.target.checked;
                setTrackExpiry(next);
                if (next && stockRotationMethod === 'FIFO') {
                  setStockRotationMethod('FEFO');
                }
              }}
              className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-rose-600" />
                  Expiry Date Tracking & Perishable Quality Control
                </span>
                {trackExpiry && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                    Expiry Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Enables product expiration dates and auto-alerts. Essential for food, beverages, cosmetics, and pharmaceuticals.
              </p>
            </div>
          </label>

          {/* Stock Rotation Methods */}
          <div className="pt-2 border-t border-slate-200/80">
            <div className="text-xs font-bold text-slate-800 mb-2">
              Stock Rotation Method / Inventory Policy:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { 
                  id: 'FEFO', 
                  label: 'FEFO', 
                  tag: 'First Expired, First Out', 
                  desc: 'Auto-consumes nearest expiring batch first (Recommended for perishables)' 
                },
                { 
                  id: 'FIFO', 
                  label: 'FIFO', 
                  tag: 'First In, First Out', 
                  desc: 'Consumes oldest received stock first (Standard retail)' 
                },
                { 
                  id: 'LIFO', 
                  label: 'LIFO', 
                  tag: 'Last In, First Out', 
                  desc: 'Consumes newest received stock first' 
                },
                { 
                  id: 'MANUAL', 
                  label: 'MANUAL', 
                  tag: 'Manual Lot Selection', 
                  desc: 'Cashier/warehouse operator manually picks batch' 
                },
              ].map(rot => {
                const isRotSelected = stockRotationMethod === rot.id;
                return (
                  <button
                    key={rot.id}
                    type="button"
                    onClick={() => {
                      setStockRotationMethod(rot.id as RotationMethod);
                      if (rot.id === 'FEFO') {
                        setTrackExpiry(true);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      isRotSelected
                        ? 'border-indigo-600 bg-white ring-1 ring-indigo-300 font-bold text-indigo-950 shadow-2xs'
                        : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900">{rot.label}</div>
                      {isRotSelected && <Check className="w-3 h-3 text-indigo-600" />}
                    </div>
                    <div className="text-[10px] text-indigo-700 font-medium">{rot.tag}</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">{rot.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Behavioral Section D: Multi-UOM / Bulk Packaging */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasMultiUOM}
              onChange={e => setHasMultiUOM(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                  Multiple Units of Measure (Multi-UOM / Pack Breakdown)
                </span>
                {hasMultiUOM && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                    Multi-UOM Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Sell in loose pieces or full bulk packs (e.g. 1 Piece = Base UOM, 1 Dozen = 12 Pieces, 1 Box = 30 Pieces, 1 Carton = 300 Pieces). Inventory is converted automatically at POS.
              </p>
            </div>
          </label>
        </div>

        {/* Behavioral Section E: Sales Channels & Policies */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
          <div className="text-xs font-bold text-slate-800">
            Sales Channels, Fulfillment & Policies
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {setSellOnPOS && (
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={sellOnPOS}
                  onChange={e => setSellOnPOS(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-indigo-600" /> Sell on POS Terminal
                  </div>
                  <div className="text-[10px] text-slate-500">Available at physical cashier registers.</div>
                </div>
              </label>
            )}

            {setPublishToStore && (
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={publishToStore}
                  onChange={e => setPublishToStore(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-purple-600" /> Online Storefront
                  </div>
                  <div className="text-[10px] text-slate-500">Visible on web & mobile commerce.</div>
                </div>
              </label>
            )}

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={returnable}
                onChange={e => setReturnable(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600" /> Customer Returnable
                </div>
                <div className="text-[10px] text-slate-500">Refunds allowed under store policy.</div>
              </div>
            </label>
          </div>
        </div>

        {/* Real-time Dynamic Architecture Summary Badge Strip */}
        <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50">
          <div className="text-xs font-bold text-indigo-950 mb-2 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            Active Product Architectural Combination:
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-2xs">
              {productType} Product
            </span>
            {hasVariants && (
              <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-xs font-bold shadow-2xs">
                + Variant Matrix
              </span>
            )}
            {inventoryTracking === 'SERIAL' && (
              <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-2xs">
                + Serial Number Tracking
              </span>
            )}
            {inventoryTracking === 'BATCH' && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-xs font-bold shadow-2xs">
                + Batch / Lot Controlled
              </span>
            )}
            {inventoryTracking === 'QUANTITY' && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-700 text-white text-xs font-bold shadow-2xs">
                + Quantity Stock
              </span>
            )}
            {inventoryTracking === 'NONE' && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-500 text-white text-xs font-bold shadow-2xs">
                + Non-Inventory Stock
              </span>
            )}
            {trackExpiry && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold shadow-2xs">
                + {stockRotationMethod} Expiry Control
              </span>
            )}
            {hasMultiUOM && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-2xs">
                + Multi-UOM Pack Breakdown
              </span>
            )}
            {productType === 'Composite' && (
              <span className="px-2.5 py-1 rounded-lg bg-cyan-700 text-white text-xs font-bold shadow-2xs">
                + BOM Assembly Recipe
              </span>
            )}
            {productType === 'Bundle' && (
              <span className="px-2.5 py-1 rounded-lg bg-pink-700 text-white text-xs font-bold shadow-2xs">
                + Bundle Kit
              </span>
            )}
            {returnable && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-800 text-xs font-semibold">
                ✓ Returnable
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
