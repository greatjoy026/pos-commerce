import React from 'react';
import { 
  Package, Layers, Barcode, DollarSign, MapPin, 
  CheckCircle2, ArrowRight, ShieldCheck, Tag
} from 'lucide-react';

interface ProductHierarchyDiagramProps {
  productName: string;
  hasVariants: boolean;
  variantCount: number;
  sku: string;
  totalStock: number;
  price: number;
  cost: number;
  location: string;
}

export default function ProductHierarchyDiagram({
  productName,
  hasVariants,
  variantCount,
  sku,
  totalStock,
  price,
  cost,
  location
}: ProductHierarchyDiagramProps) {
  return (
    <div className="p-4 sm:p-5 bg-slate-900 text-white rounded-2xl space-y-4 border border-slate-800" id="product-hierarchy-architecture">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Architectural Domain Model: Product ≠ Stock Item ≠ SKU ≠ Price
          </h4>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          Enterprise Multi-Entity Separation
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        
        {/* Node 1: Product Master */}
        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-400 uppercase flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              <span>1. Product Master</span>
            </span>
            <span className="text-[9px] bg-indigo-900/60 text-indigo-300 px-1.5 py-0.5 rounded font-mono">Catalog</span>
          </div>
          <div className="font-bold text-white text-xs truncate">
            {productName || 'Untitled Product'}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>• Master merchandising item</div>
            <div>• Universal digital taxonomy</div>
          </div>
        </div>

        {/* Node 2: Variant / SKU */}
        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
              <Barcode className="w-3.5 h-3.5" />
              <span>2. SKU & Identifiers</span>
            </span>
            <span className="text-[9px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded font-mono">Unique ID</span>
          </div>
          <div className="font-mono font-bold text-emerald-300 text-xs truncate">
            {hasVariants ? `${variantCount} Variant SKUs` : sku || 'MASTER-SKU'}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>• Optical barcode / EAN</div>
            <div>• Scan & checkout trigger</div>
          </div>
        </div>

        {/* Node 3: Stock Item */}
        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>3. Stock Node</span>
            </span>
            <span className="text-[9px] bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded font-mono">{totalStock} Units</span>
          </div>
          <div className="font-bold text-white text-xs truncate">
            {location}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>• Physical warehouse bin</div>
            <div>• Serial & Batch audit trail</div>
          </div>
        </div>

        {/* Node 4: Pricing Layer */}
        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-400 uppercase flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              <span>4. Price Policies</span>
            </span>
            <span className="text-[9px] bg-purple-900/60 text-purple-300 px-1.5 py-0.5 rounded font-mono">Tiers</span>
          </div>
          <div className="font-mono font-bold text-white text-xs">
            ${price.toFixed(2)} Retail / ${cost.toFixed(2)} Cost
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>• Dynamic wholesale tiers</div>
            <div>• Cashier floor limit guard</div>
          </div>
        </div>

      </div>
    </div>
  );
}
