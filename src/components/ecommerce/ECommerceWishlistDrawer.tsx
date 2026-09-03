import React from 'react';
import { Product } from '../../types';
import { 
  X, Heart, ShoppingCart, Trash2, ArrowRight, Zap, Star
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

interface ECommerceWishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: Product[];
  onRemoveWishlist: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onMoveAllToCart: () => void;
  onOpenProduct: (product: Product) => void;
}

export default function ECommerceWishlistDrawer({
  isOpen,
  onClose,
  wishlist,
  onRemoveWishlist,
  onAddToCart,
  onMoveAllToCart,
  onOpenProduct
}: ECommerceWishlistDrawerProps) {
  const { formatAmount } = useCurrency();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200/80 animate-in slide-in-from-right duration-300 relative"
        id="ecommerce-wishlist-drawer"
      >
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-rose-600/20 text-rose-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                My Saved Wishlist
              </h2>
              <span className="text-xs text-slate-400">
                {wishlist.length} saved products
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wishlist Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 divide-y divide-slate-100">
          {wishlist.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-400">
                <Heart className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Your wishlist is empty</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Save products you like by clicking the heart icon on any card or product page.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            wishlist.map((prod) => (
              <div key={prod.id} className="pt-4 first:pt-0 flex gap-3 group">
                <img 
                  src={prod.imageUrl} 
                  alt={prod.name}
                  onClick={() => {
                    onOpenProduct(prod);
                    onClose();
                  }}
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-200 bg-slate-100 shrink-0 cursor-pointer group-hover:scale-105 transition-transform"
                />

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h4 
                        onClick={() => {
                          onOpenProduct(prod);
                          onClose();
                        }}
                        className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors cursor-pointer"
                      >
                        {prod.name}
                      </h4>
                      <button
                        type="button"
                        onClick={() => onRemoveWishlist(prod)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {formatAmount(prod.price)}
                      </span>
                      {prod.originalPrice && (
                        <span className="text-[11px] text-slate-400 line-through font-mono">
                          {formatAmount(prod.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={prod.stock <= 0}
                      onClick={() => onAddToCart(prod)}
                      className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 active:scale-95 disabled:opacity-50 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{prod.stock <= 0 ? 'Out of Stock' : 'Move to Cart'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {wishlist.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-2 z-10">
            <button
              type="button"
              onClick={onMoveAllToCart}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-indigo-400" />
              <span>Add All Available to Cart</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
