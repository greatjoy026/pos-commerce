import React, { useState } from 'react';
import { Product, ProductVariant } from '../types';
import { 
  X, Barcode, QrCode, MapPin, DollarSign, Package, AlertTriangle, 
  CheckCircle2, TrendingUp, Printer, Edit2, Copy, Check, Plus,
  Layers, Info, ArrowUpRight, ShieldAlert, Sparkles, ExternalLink, Boxes
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { useCurrency } from '../context/CurrencyContext';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEditProduct?: (product: Product) => void;
  onOpenBarcodeModal?: (product: Product, sku?: string) => void;
  onQuickReorder?: (productId: string, amount: number) => void;
  canEdit?: boolean;
}

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onEditProduct,
  onOpenBarcodeModal,
  onQuickReorder,
  canEdit = true
}: ProductDetailModalProps) {
  const { formatAmount } = useCurrency();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [reorderSuccess, setReorderSuccess] = useState<number | null>(null);

  if (!isOpen || !product) return null;

  const isLowStock = product.stock <= product.reorderPoint;
  const isOutOfStock = product.stock === 0;

  // Financial calculations
  const profitMarginPerUnit = product.price - product.cost;
  const marginPercentage = product.price > 0 ? (profitMarginPerUnit / product.price) * 100 : 0;
  const totalCostValuation = product.stock * product.cost;
  const totalRetailValuation = product.stock * product.price;

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Quick reorder trigger
  const handleReorder = (amount: number) => {
    if (onQuickReorder) {
      onQuickReorder(product.id, amount);
      setReorderSuccess(amount);
      setTimeout(() => setReorderSuccess(null), 2500);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto"
      id="product-detail-modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
        id="product-detail-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-150 flex justify-between items-center bg-slate-50/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold font-mono text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                  {product.sku}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {product.category}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5 line-clamp-1" id="product-detail-title">
                {product.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && onEditProduct && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditProduct(product);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all"
                id="btn-detail-edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Item</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-all"
              id="btn-close-product-detail"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Top Section: Media & Primary Overview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Image & Quick Barcode Preview (4 cols) */}
            <div className="md:col-span-5 space-y-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs group">
                <img 
                  src={product.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600'} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3">
                  {isOutOfStock ? (
                    <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                      <AlertTriangle className="w-3 h-3" /> Out of Stock
                    </span>
                  ) : isLowStock ? (
                    <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                      <ShieldAlert className="w-3 h-3" /> Low Stock Warning
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                      <CheckCircle2 className="w-3 h-3" /> In Stock ({product.stock})
                    </span>
                  )}
                </div>
                <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-lg font-bold">
                  {formatAmount(product.price)} MSRP
                </div>
              </div>

              {/* Barcode & QR code quick card */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5 text-indigo-600" />
                    Symbology & Identifiers
                  </span>
                  {onOpenBarcodeModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenBarcodeModal(product);
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                      id="btn-detail-open-barcode-studio"
                    >
                      <Printer className="w-3 h-3" /> Studio
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Barcode / UPC</span>
                    <div className="font-mono text-[11px] font-bold text-slate-800 mt-0.5 truncate flex items-center justify-between">
                      <span className="truncate">{product.barcode}</span>
                      <button 
                        onClick={() => handleCopy(product.barcode, 'barcode')}
                        className="text-gray-400 hover:text-indigo-600 ml-1 p-0.5"
                        title="Copy Barcode"
                      >
                        {copiedField === 'barcode' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">QR Link Code</span>
                    <div className="font-mono text-[11px] font-bold text-slate-800 mt-0.5 truncate flex items-center justify-between">
                      <span className="truncate">{product.qrCode}</span>
                      <button 
                        onClick={() => handleCopy(product.qrCode, 'qrcode')}
                        className="text-gray-400 hover:text-indigo-600 ml-1 p-0.5"
                        title="Copy QR Code"
                      >
                        {copiedField === 'qrcode' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Telemetry Cards (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Available Stock */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Total On-Hand</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{product.stock}</span>
                    <span className="text-xs text-gray-500">units</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    Safety limit: <strong className="text-slate-700">{product.reorderPoint}</strong>
                  </div>
                </div>

                {/* Retail MSRP */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Unit Retail</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{formatAmount(product.price)}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    Cost: <strong className="text-slate-700">{formatAmount(product.cost)}</strong>
                  </div>
                </div>

                {/* Gross Margin */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Gross Margin</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-xl font-bold font-mono text-emerald-600">
                      {marginPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-1 font-semibold">
                    +{formatAmount(profitMarginPerUnit)} / unit profit
                  </div>
                </div>
              </div>

              {/* Valuation & Location summary */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Storage Distribution</span>
                    <span className="text-xs font-bold text-slate-800">{product.location}</span>
                    <p className="text-[10px] text-gray-500 mt-0.5">Primary designated inventory node.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Inventory Valuation</span>
                    <span className="text-xs font-bold text-slate-800">
                      {formatAmount(totalCostValuation)} <span className="text-[10px] font-normal text-gray-400">(Cost)</span>
                    </span>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Potential retail: {formatAmount(totalRetailValuation)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/70 space-y-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-gray-400" />
                    Product Description
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Packaged Goods Architecture & Breakdown */}
              {product.packaging?.hasPackaging && (
                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-amber-700" />
                      Bulk Packaging & Unit of Measure (UOM)
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      product.packaging.inventoryTrackingMode === 'dual_stock'
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {product.packaging.inventoryTrackingMode === 'dual_stock' ? 'Dual Stock (Sealed + Loose)' : 'Auto-Depackage (Loose Only)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-amber-100">
                      <span className="text-[10px] font-bold text-amber-700 uppercase block">Bulk Packaging</span>
                      <span className="font-bold text-slate-900">{product.packaging.purchasePackagingName || 'Box'}</span>
                      <span className="text-[10px] text-gray-400 block font-mono">1 pkg = {product.packaging.unitsPerPackage} {product.packaging.baseSellingUnitName || 'pcs'}</span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-amber-100">
                      <span className="text-[10px] font-bold text-amber-700 uppercase block">Package Cost</span>
                      <span className="font-bold text-slate-900">{formatAmount(product.packaging.packageCost || 0)}</span>
                      <span className="text-[10px] text-gray-400 block">Unit Cost: {formatAmount(product.packaging.calculatedUnitCost || ((product.packaging.packageCost || 0) / (product.packaging.unitsPerPackage || 1)))}</span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-amber-100">
                      <span className="text-[10px] font-bold text-amber-700 uppercase block">Sealed Stock</span>
                      <span className="font-bold text-slate-900">{product.packaging.sealedPackageStock || 0} {product.packaging.purchasePackagingName || 'Box'}(s)</span>
                      <span className="text-[10px] text-gray-400 block font-mono">= {(product.packaging.sealedPackageStock || 0) * (product.packaging.unitsPerPackage || 1)} base units</span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-amber-100">
                      <span className="text-[10px] font-bold text-amber-700 uppercase block">Loose Stock</span>
                      <span className="font-bold text-slate-900">{product.packaging.looseUnitStock ?? product.stock} {product.packaging.baseSellingUnitName || 'pcs'}</span>
                      <span className="text-[10px] text-emerald-600 block font-bold">Ready for POS</span>
                    </div>
                  </div>

                  {product.packaging.sellingTiers && product.packaging.sellingTiers.length > 0 && (
                    <div className="pt-2 border-t border-amber-200/60">
                      <span className="text-[10px] font-bold text-amber-800 block mb-1">Multi-Tier Packaging Hierarchy & Retail Pricing:</span>
                      <div className="flex flex-wrap gap-2">
                        {product.packaging.sellingTiers.map((tier, idx) => (
                          <span key={tier.id || idx} className="text-[10px] bg-white border border-amber-200 text-amber-900 px-2.5 py-1 rounded-lg font-mono flex items-center gap-1.5 shadow-2xs">
                            <span className="font-bold">{tier.name}</span>
                            <span className="text-gray-400">({tier.unitQuantity} units)</span>
                            <span className="font-bold text-emerald-700">{formatAmount(tier.sellingPrice)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Replenishment Action */}
              {canEdit && onQuickReorder && (
                <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-indigo-900 block">Quick Replenish Stock</span>
                    <span className="text-[11px] text-indigo-700">Add physical units directly to catalog.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleReorder(10)}
                      className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-all"
                      id="btn-reorder-10"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(25)}
                      className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-all"
                      id="btn-reorder-25"
                    >
                      +25
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(50)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                      id="btn-reorder-50"
                    >
                      +50
                    </button>
                  </div>
                </div>
              )}

              {reorderSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Successfully replenished +{reorderSuccess} units to {product.name}!</span>
                </div>
              )}
            </div>

          </div>

          {/* Bottom Section: Product Variants Matrix Table */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-gray-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Product Variants Matrix ({product.variants.length} variations)
                </span>
                <span className="text-[11px] font-mono text-gray-500">
                  Combined Stock: {product.variants.reduce((sum, v) => sum + v.stock, 0)} units
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-2.5">Variant SKU</th>
                        <th className="px-4 py-2.5">Size</th>
                        <th className="px-4 py-2.5">Color / Finish</th>
                        <th className="px-4 py-2.5 text-right">In Stock</th>
                        <th className="px-4 py-2.5 text-right">Stock Share</th>
                        <th className="px-4 py-2.5 text-center">Label</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {product.variants.map((variant, index) => {
                        const totalVarStock = product.variants.reduce((s, v) => s + v.stock, 0);
                        const sharePercent = totalVarStock > 0 ? (variant.stock / totalVarStock) * 100 : 0;
                        return (
                          <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-2.5 font-mono font-semibold text-slate-800">
                              {variant.sku}
                            </td>
                            <td className="px-4 py-2.5 font-medium">
                              {variant.size || <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              {variant.color ? (
                                <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-slate-300"></span>
                                  {variant.color}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                              {variant.stock}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-gray-500">
                              {sharePercent.toFixed(0)}%
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {onOpenBarcodeModal && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onOpenBarcodeModal(product, variant.sku);
                                  }}
                                  className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-all"
                                  title={`Print Barcode for ${variant.sku}`}
                                  id={`btn-variant-print-${index}`}
                                >
                                  <Printer className="w-3.5 h-3.5" />
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
            </div>
          )}

        </div>

        {/* Modal Action Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-gray-150 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(product.sku, 'sku-btn')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-2xs"
              id="btn-copy-product-sku"
            >
              {copiedField === 'sku-btn' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SKU</span>
                </>
              )}
            </button>

            {onOpenBarcodeModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBarcodeModal(product);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-indigo-700 rounded-xl text-xs font-semibold transition-all shadow-2xs"
                id="btn-detail-print-barcode"
              >
                <Barcode className="w-3.5 h-3.5" />
                <span>Barcode Studio</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canEdit && onEditProduct && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditProduct(product);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                id="btn-detail-edit-footer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Product</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-xl text-xs font-semibold transition-all"
              id="btn-detail-close-footer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
