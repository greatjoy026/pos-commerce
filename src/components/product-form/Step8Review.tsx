import React, { useState } from 'react';
import { 
  ProductType, ProductStatus, ProductVariant, 
  ProductMediaItem, ProductSpecificationItem, ProductComponentItem 
} from '../../types';
import { 
  Eye, Monitor, Smartphone, ShoppingCart, Tag, 
  CheckCircle2, Sparkles, AlertTriangle, Layers, 
  Barcode, MapPin, DollarSign, Globe, Star, ShieldCheck,
  Package, Hash, Calendar, ArrowRight, Share2, Heart, Box, Wrench
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import ProductHierarchyDiagram from './ProductHierarchyDiagram';

interface Step8ReviewProps {
  name: string;
  brand: string;
  category: string;
  productType: ProductType;
  description: string;
  status: ProductStatus;
  hasVariants: boolean;
  variants: ProductVariant[];
  sku: string;
  barcode: string;
  qrCode: string;
  trackInventory: boolean;
  trackSerial: boolean;
  trackBatch: boolean;
  trackExpiry: boolean;
  unit: string;
  stock: number;
  reorderPoint: number;
  location: 'Warehouse' | 'Store Shelf' | 'Fulfillment Center';
  serialNumbers: string[];
  batchLot: string;
  expiryDate: string;
  price: number;
  cost: number;
  wholesalePrice: number;
  minimumPrice: number;
  mediaGallery: ProductMediaItem[];
  primaryImageUrl: string;
  specifications: ProductSpecificationItem[];
  publishOnline: boolean;
  ecommerceCategory: string;
  seoTitle: string;
  seoDescription: string;
  urlSlug: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  computedStock: number;
  components?: ProductComponentItem[];
}

type PreviewTab = 'all' | 'executive' | 'pos' | 'ecom' | 'architecture';

export default function Step8Review({
  name,
  brand,
  category,
  productType,
  description,
  status,
  hasVariants,
  variants,
  sku,
  barcode,
  qrCode,
  trackInventory,
  trackSerial,
  trackBatch,
  trackExpiry,
  unit,
  stock,
  reorderPoint,
  location,
  serialNumbers,
  batchLot,
  expiryDate,
  price,
  cost,
  wholesalePrice,
  minimumPrice,
  mediaGallery,
  primaryImageUrl,
  specifications,
  publishOnline,
  ecommerceCategory,
  seoTitle,
  seoDescription,
  urlSlug,
  isFeatured,
  isNewArrival,
  isBestSeller,
  computedStock,
  components = []
}: Step8ReviewProps) {
  const { currencySymbol, formatAmount } = useCurrency();
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTab>('all');
  
  // Ecom simulation state
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  const displayImage = mediaGallery.length > 0 
    ? (mediaGallery[selectedImageIndex]?.url || primaryImageUrl || mediaGallery[0]?.url)
    : (primaryImageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600');

  const unitProfit = price - cost;
  const marginPct = price > 0 ? (unitProfit / price) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="step-8-review">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Master Product Dossier & Multi-Channel Verification</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit catalog definitions, inspect live Point-of-Sale rendering, preview digital storefront cards, and verify inventory architecture.
          </p>
        </div>

        {/* Preview Perspective Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto overflow-x-auto max-w-full">
          {[
            { id: 'all', label: 'All Previews' },
            { id: 'executive', label: 'Dossier' },
            { id: 'pos', label: 'POS Terminal' },
            { id: 'ecom', label: 'E-commerce' },
            { id: 'architecture', label: 'Domain Model' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePreviewTab(tab.id as PreviewTab)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                activePreviewTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id={`btn-preview-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Domain Architecture Diagram */}
      {(activePreviewTab === 'all' || activePreviewTab === 'architecture') && (
        <ProductHierarchyDiagram
          productName={name}
          hasVariants={hasVariants}
          variantCount={variants.length}
          sku={sku}
          totalStock={computedStock}
          price={price}
          cost={cost}
          location={location}
        />
      )}

      {/* Executive Dossier Section */}
      {(activePreviewTab === 'all' || activePreviewTab === 'executive') && (
        <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-indigo-600" />
              <span>Catalog Dossier Summary</span>
            </h4>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                status === 'Draft' ? 'bg-amber-100 text-amber-800' :
                'bg-slate-100 text-slate-800'
              }`}>
                {status}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                {productType} Goods
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            
            {/* Thumbnail */}
            <div className="md:col-span-3">
              <div className="aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative shadow-2xs">
                <img 
                  src={displayImage} 
                  alt={name} 
                  className="w-full h-full object-cover" 
                />
                {isFeatured && (
                  <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                    Featured
                  </span>
                )}
              </div>
              <div className="text-center mt-2 text-[11px] text-slate-400 font-mono">
                {mediaGallery.length} Gallery Photos
              </div>
            </div>

            {/* Core Specs Grid */}
            <div className="md:col-span-9 space-y-3">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
                  {brand || 'Generic'} • {category || 'Uncategorized'}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {name || 'Untitled Product'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Retail MSRP</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{formatAmount(price)}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Cost Price</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{formatAmount(cost)}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Stock Quantity</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{computedStock} {unit}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Gross Margin</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">{marginPct.toFixed(1)}%</span>
                </div>
              </div>

              {/* Technical specs snapshot */}
              {specifications.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                    Specifications Snapshot ({specifications.length} attributes):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {specifications.slice(0, 5).map((s, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                        <strong>{s.key}:</strong> {s.value}
                      </span>
                    ))}
                    {specifications.length > 5 && (
                      <span className="text-[10px] text-slate-400 px-1 py-0.5">
                        +{specifications.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              {/* Bill of Materials / Component Recipe snapshot */}
              {components.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <Box className="w-3 h-3 text-indigo-600" />
                      <span>{productType || 'Composite'} Recipe ({components.length} parts attached):</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-indigo-700">
                      BOM Cost: {formatAmount(components.reduce((sum, c) => sum + (c.unitCost * c.quantity), 0))}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {components.map((c, idx) => (
                      <div key={idx} className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-800 truncate mr-2">{c.quantity}× {c.name}</span>
                        <span className="font-mono text-slate-500 shrink-0">{c.sku}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Side-by-Side POS & E-Commerce Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Perspective A: In-Store POS Touchscreen Preview */}
        {(activePreviewTab === 'all' || activePreviewTab === 'pos') && (
          <div className="p-4 sm:p-5 bg-slate-950 text-white rounded-2xl space-y-4 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Cashier POS Touchscreen Card Preview
                </h4>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-800">
                1-Tap Add Ready
              </span>
            </div>

            {/* Simulated POS Grid Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3 hover:border-slate-700 transition-all">
              <div className="flex gap-3 items-center">
                <img 
                  src={displayImage} 
                  alt={name} 
                  className="w-16 h-16 rounded-lg object-cover bg-slate-800 shrink-0 border border-slate-700" 
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">{sku || 'SKU-001'}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      computedStock <= reorderPoint ? 'bg-red-900/60 text-red-300' : 'bg-emerald-900/60 text-emerald-300'
                    }`}>
                      {computedStock} in stock
                    </span>
                  </div>
                  <h5 className="font-bold text-white text-xs truncate mt-0.5">
                    {name || 'Product Title'}
                  </h5>
                  <div className="text-emerald-400 font-mono font-bold text-sm mt-1">
                    {formatAmount(price)}
                  </div>
                </div>
              </div>

              {/* Barcode & Scan trigger line */}
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Barcode className="w-3.5 h-3.5 text-slate-500" />
                  <span>{barcode || '880192837401'}</span>
                </span>
                <span className="text-slate-500">{location}</span>
              </div>

              {/* Action Button */}
              <div className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-default">
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Add to POS Register Ticket ({formatAmount(price)})</span>
              </div>
            </div>

            {/* POS Variant Badges if any */}
            {hasVariants && variants.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Quick Cashier Variant Selectors ({variants.length}):
                </span>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {variants.map((v, i) => (
                    <span key={i} className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800 font-mono">
                      {v.size || ''} {v.color || ''} ({v.stock} pcs)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Perspective B: Online E-Commerce Storefront Card */}
        {(activePreviewTab === 'all' || activePreviewTab === 'ecom') && (
          <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Digital E-Commerce Card Preview
                </h4>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                publishOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {publishOnline ? 'Live Storefront' : 'Draft / Offline'}
              </span>
            </div>

            {/* Storefront Product Card */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
              
              {/* Product Card Image with Badges */}
              <div className="aspect-video bg-slate-100 relative overflow-hidden">
                <img 
                  src={displayImage} 
                  alt={name} 
                  className="w-full h-full object-cover" 
                />

                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                  {isNewArrival && (
                    <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                      NEW
                    </span>
                  )}
                  {isBestSeller && (
                    <span className="bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                      BEST SELLER
                    </span>
                  )}
                </div>

                <div className="absolute top-2.5 right-2.5 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-slate-600 shadow-xs">
                  <Heart className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">
                      {brand || 'Omni Store'}
                    </span>
                    <div className="flex items-center text-amber-500 text-xs">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="text-[11px] font-bold text-slate-700 ml-1">4.9</span>
                      <span className="text-[10px] text-slate-400 ml-0.5">(28)</span>
                    </div>
                  </div>

                  <h5 className="font-bold text-slate-900 text-sm mt-0.5 line-clamp-1">
                    {name || 'Product Title'}
                  </h5>
                </div>

                {/* Variant Swatches Simulation */}
                {hasVariants && variants.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Select Option:</span>
                    <div className="flex flex-wrap gap-1">
                      {variants.slice(0, 4).map((v, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedVariantIndex(i)}
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition-all ${
                            selectedVariantIndex === i
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {v.size || v.color || v.sku}
                        </button>
                      ))}
                      {variants.length > 4 && (
                        <span className="text-[10px] text-slate-400 self-center">+{variants.length - 4} more</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Price & Add to Cart */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Price</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {formatAmount(hasVariants && variants[selectedVariantIndex]?.retailPrice ? variants[selectedVariantIndex].retailPrice! : price)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Add to Cart</span>
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
