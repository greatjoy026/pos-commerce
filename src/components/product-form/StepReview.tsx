import React, { useState } from 'react';
import { 
  Eye, Monitor, Smartphone, ShoppingCart, Tag, 
  CheckCircle2, Sparkles, AlertTriangle, Layers, 
  Barcode, MapPin, DollarSign, Globe, Star, ShieldCheck,
  Package, Hash, Calendar, ArrowRight, Share2, Heart, Box, Wrench,
  Boxes, Edit2, Cpu, RotateCcw, Check, Sparkle
} from 'lucide-react';
import { 
  ProductType, ProductStatus, ProductVariant, TrackingMode, RotationMethod,
  CompositeComponentItem, BundleKitItem, BulkPackagingConfig, ProductEcommerce 
} from '../../types';

interface ProductReviewData {
  name: string;
  brand: string;
  category: string;
  description: string;
  productType: ProductType;
  status: ProductStatus;
  hasVariants: boolean;
  variants: ProductVariant[];
  inventoryTracking?: TrackingMode;
  stockRotationMethod?: RotationMethod;
  hasMultiUOM?: boolean;
  returnable?: boolean;
  compositeComponents?: CompositeComponentItem[];
  bundleKitItems?: BundleKitItem[];
  bulkPackaging?: BulkPackagingConfig;
  sku: string;
  barcode: string;
  qrCode: string;
  stock: number;
  reorderPoint: number;
  unit: string;
  location: string;
  trackStock: boolean;
  trackSerial: boolean;
  serialNumber?: string;
  trackBatch: boolean;
  batchNumber?: string;
  trackExpiry: boolean;
  expiryDate?: string;
  cost: number;
  price: number;
  wholesalePrice: number;
  minimumPrice: number;
  originalPrice: number;
  imageUrl: string;
  images: string[];
  specifications: Record<string, string>;
  ecommerce: ProductEcommerce;
}

interface StepReviewProps {
  productData: ProductReviewData;
  publishToStore: boolean;
  setPublishToStore: (v: boolean) => void;
  onJumpToStep: (step: number) => void;
  onSave: (status: 'Active' | 'Draft') => void;
}

type PreviewTab = 'pos' | 'store' | 'specs';

export default function StepReview({
  productData,
  publishToStore,
  setPublishToStore,
  onJumpToStep,
  onSave
}: StepReviewProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('pos');
  const p = productData;

  const grossMargin = p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0;
  const markup = p.cost > 0 ? ((p.price - p.cost) / p.cost) * 100 : 0;
  const coverImage = p.imageUrl || p.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600';

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Check */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-white p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              p.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {p.status}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold">
              {p.productType} Product
            </span>
            <span className="text-xs text-slate-500 font-semibold">{p.category}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">{p.name || 'Untitled Product'}</h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">SKU: {p.sku || 'N/A'} · Barcode: {p.barcode || 'N/A'}</p>
        </div>

        {/* Live Preview Switcher */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'pos' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> POS Card
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('store')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'store' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Web Store
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'specs' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Specs
          </button>
        </div>
      </div>

      {/* Active Architectural Blueprint Strip */}
      <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/50">
        <div className="text-xs font-bold text-indigo-950 mb-2 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-indigo-600" />
          Active Architectural Capabilities:
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-2xs">
            {p.productType} Product
          </span>
          {p.hasVariants && (
            <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-xs font-bold shadow-2xs">
              ⚡ {p.variants?.length || 0} Sellable Variants
            </span>
          )}
          {p.trackSerial && (
            <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-2xs">
              🏷️ Serial Number Tracking
            </span>
          )}
          {p.trackBatch && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-xs font-bold shadow-2xs">
              📦 Batch & Lot Tracking
            </span>
          )}
          {p.trackExpiry && (
            <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold shadow-2xs">
              ⏳ {p.stockRotationMethod || 'FEFO'} Expiry Controlled
            </span>
          )}
          {p.hasMultiUOM && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-2xs">
              📐 Multi-UOM Pack Breakdown ({p.bulkPackaging?.itemsPerPackage || 1} {p.unit}/pack)
            </span>
          )}
          {p.productType === 'Composite' && (
            <span className="px-2.5 py-1 rounded-lg bg-cyan-700 text-white text-xs font-bold shadow-2xs">
              🛠️ BOM Assembly ({p.compositeComponents?.length || 0} parts)
            </span>
          )}
          {p.productType === 'Bundle' && (
            <span className="px-2.5 py-1 rounded-lg bg-pink-700 text-white text-xs font-bold shadow-2xs">
              🎁 Bundle / Kit ({p.bundleKitItems?.length || 0} items)
            </span>
          )}
          {p.returnable && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-800 text-xs font-semibold">
              ✓ Customer Returnable
            </span>
          )}
        </div>
      </div>

      {/* Main Preview Container */}
      {activeTab === 'pos' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col md:flex-row items-center justify-center gap-8">
          <div className="text-center md:text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
              Point-of-Sale Live Tile Preview
            </span>
            <h4 className="text-sm font-bold text-slate-800 mb-2">How cashiers see this item on the terminal</h4>
            <p className="text-xs text-slate-500 max-w-sm">
              Displays instant tap tile with on-hand quantity, price, barcode shortcut, and category tag.
            </p>
          </div>

          {/* POS Tile mockup */}
          <div className="w-56 rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden hover:shadow-lg transition-all flex flex-col">
            <div className="h-32 bg-slate-100 relative overflow-hidden">
              <img src={coverImage} alt={p.name} className="w-full h-full object-cover" />
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-bold">
                {p.stock} {p.unit}
              </span>
              {p.hasVariants && (
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-purple-600/90 text-white text-[9px] font-bold">
                  {p.variants.length} Options
                </span>
              )}
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{p.category}</span>
                <h5 className="text-xs font-bold text-slate-900 line-clamp-1">{p.name || 'Product Title'}</h5>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                <span className="text-sm font-extrabold text-indigo-600">${p.price.toFixed(2)}</span>
                <span className="p-1.5 bg-indigo-600 text-white rounded-lg text-[11px] font-bold">
                  + Add
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'store' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col md:flex-row items-center justify-center gap-8">
          <div className="w-full max-w-md bg-slate-50 rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex gap-4">
              <img src={coverImage} alt={p.name} className="w-28 h-28 rounded-xl object-cover border border-slate-200" />
              <div className="flex-1 space-y-1">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">{p.brand || p.category}</span>
                <h4 className="text-sm font-bold text-slate-900">{p.name || 'Untitled Product'}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-slate-900">${p.price.toFixed(2)}</span>
                  {p.originalPrice > p.price && (
                    <span className="text-xs text-slate-400 line-through">${p.originalPrice.toFixed(2)}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                  <Star className="w-3 h-3 fill-current" /> 5.0 (New Release)
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
              {p.description || 'No description provided.'}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'specs' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Attributes Datasheet</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(p.specifications || {}).map(([k, v]) => (
              <div key={k} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-semibold text-slate-400 block">{k}</span>
                <span className="text-xs font-bold text-slate-800">{v}</span>
              </div>
            ))}
            {Object.keys(p.specifications || {}).length === 0 && (
              <p className="text-xs text-slate-400 col-span-4 italic">No custom specifications defined.</p>
            )}
          </div>
        </div>
      )}

      {/* Summary Matrix Cards with Direct Jump Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Basic Info */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-600" /> 1. Identity & Type
            </span>
            <button
              type="button"
              onClick={() => onJumpToStep(1)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          </div>
          <div className="text-xs space-y-1 text-slate-600">
            <div><span className="font-semibold text-slate-800">Type:</span> {p.productType}</div>
            <div><span className="font-semibold text-slate-800">Brand:</span> {p.brand || 'Generic'}</div>
            <div><span className="font-semibold text-slate-800">Category:</span> {p.category}</div>
          </div>
        </div>

        {/* Inventory & Tracking */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-indigo-600" /> 2. Inventory & Stock
            </span>
            <button
              type="button"
              onClick={() => onJumpToStep(2)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          </div>
          <div className="text-xs space-y-1 text-slate-600">
            <div><span className="font-semibold text-slate-800">SKU:</span> {p.sku}</div>
            <div><span className="font-semibold text-slate-800">Stock:</span> {p.stock} {p.unit}</div>
            <div><span className="font-semibold text-slate-800">Tracking:</span> {p.inventoryTracking || (p.trackSerial ? 'SERIAL' : p.trackBatch ? 'BATCH' : 'QUANTITY')}</div>
          </div>
        </div>

        {/* Variations / Architecture */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> 3. Variants & BOM
            </span>
            <button
              type="button"
              onClick={() => onJumpToStep(3)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          </div>
          <div className="text-xs space-y-1 text-slate-600">
            <div><span className="font-semibold text-slate-800">Variants:</span> {p.hasVariants ? `${p.variants.length} SKUs` : 'Single Item'}</div>
            {p.productType === 'Composite' && (
              <div><span className="font-semibold text-slate-800">BOM Parts:</span> {p.compositeComponents?.length || 0} attached</div>
            )}
            {p.productType === 'Bundle' && (
              <div><span className="font-semibold text-slate-800">Kit Items:</span> {p.bundleKitItems?.length || 0} items</div>
            )}
            <div><span className="font-semibold text-slate-800">Multi-UOM:</span> {p.hasMultiUOM ? 'Enabled' : 'Disabled'}</div>
          </div>
        </div>

        {/* Pricing & Profit */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-indigo-600" /> 4. Pricing & Margin
            </span>
            <button
              type="button"
              onClick={() => onJumpToStep(4)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          </div>
          <div className="text-xs space-y-1 text-slate-600">
            <div><span className="font-semibold text-slate-800">Unit Cost:</span> ${p.cost.toFixed(2)}</div>
            <div><span className="font-semibold text-slate-800">Retail:</span> ${p.price.toFixed(2)}</div>
            <div><span className="font-semibold text-slate-800">Gross Margin:</span> {grossMargin.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Storefront Publishing Toggle */}
      <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-xl">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Publish Immediately to E-Commerce Storefront</div>
            <div className="text-[11px] text-slate-500">Item will be visible for customer online orders immediately upon publishing.</div>
          </div>
        </div>

        <input
          type="checkbox"
          checked={publishToStore}
          onChange={e => setPublishToStore(e.target.checked)}
          className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
        />
      </div>
    </div>
  );
}
