import React from 'react';
import { Product } from '../../types';
import { 
  Heart, ShoppingCart, Eye, Star, Zap, Check, AlertTriangle
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

interface ECommerceProductCardProps {
  key?: React.Key;
  product: Product;
  isInWishlist: boolean;
  onToggleWishlist: (product: Product) => void;
  onAddToCart: (product: Product, variantSku?: string) => void;
  onBuyNow: (product: Product, variantSku?: string) => void;
  onQuickView: (product: Product) => void;
}

export default function ECommerceProductCard({
  product,
  isInWishlist,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
  onQuickView
}: ECommerceProductCardProps) {
  const { formatAmount } = useCurrency();

  const isLowStock = product.stock <= 5;
  const isOutOfStock = product.stock <= 0;
  const discount = product.discountPercent || (product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0);
  const rating = product.rating || 4.8;
  const reviewsCount = product.reviewCount || 48;

  return (
    <div 
      className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between group relative select-none"
      id={`product-card-${product.id}`}
    >
      {/* 1. Image Canvas & Badges */}
      <div className="relative aspect-square overflow-hidden bg-slate-100/70">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
          {discount > 0 && (
            <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-rose-600 text-white shadow-xs tracking-tight uppercase">
              -{discount}% OFF
            </span>
          )}
          {product.isNewArrival && (
            <span className="px-2 py-0.5 rounded-xl text-[9px] font-extrabold bg-indigo-600 text-white shadow-xs uppercase tracking-wider">
              New Arrival
            </span>
          )}
          {product.isBestSeller && (
            <span className="px-2 py-0.5 rounded-xl text-[9px] font-extrabold bg-amber-500 text-white shadow-xs uppercase tracking-wider">
              Best Seller
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md shadow-xs transition-all z-10 cursor-pointer ${
            isInWishlist
              ? 'bg-rose-50 text-rose-500'
              : 'bg-white/80 hover:bg-white text-slate-400 hover:text-rose-500'
          }`}
          title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          id={`wishlist-btn-${product.id}`}
        >
          <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Quick View Overlay Button (Hover Desktop) */}
        <div className="absolute inset-x-3 bottom-3 hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            type="button"
            onClick={() => onQuickView(product)}
            className="flex-1 py-2 bg-white/95 hover:bg-white text-slate-900 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer backdrop-blur-xs"
            id={`quickview-btn-${product.id}`}
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>Quick View</span>
          </button>
        </div>
      </div>

      {/* 2. Product Details Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Brand & Category */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span className="text-indigo-600 truncate">{product.brand || product.category}</span>
            <span className="font-mono text-slate-400">{product.sku}</span>
          </div>

          {/* Title */}
          <h3 
            onClick={() => onQuickView(product)}
            className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug cursor-pointer"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="flex items-center text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-3 h-3 ${i < Math.floor(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                />
              ))}
            </div>
            <span className="text-[11px] font-bold text-slate-700">{rating}</span>
            <span className="text-[10px] text-slate-400">({reviewsCount})</span>
          </div>

          {/* Stock state badge */}
          <div className="pt-1">
            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600">
                <AlertTriangle className="w-3 h-3" /> Out of stock
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600">
                <AlertTriangle className="w-3 h-3" /> Only {product.stock} left in stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                <Check className="w-3 h-3" /> In stock ({product.stock} available)
              </span>
            )}
          </div>
        </div>

        {/* 3. Pricing & Cart Action */}
        <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                {formatAmount(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-slate-400 line-through font-mono">
                  {formatAmount(product.originalPrice)}
                </span>
              )}
            </div>

            {product.variants && product.variants.length > 1 && (
              <span className="text-[10px] text-slate-400 font-semibold">
                {product.variants.length} options
              </span>
            )}
          </div>

          {/* Action buttons: Add to Cart + Buy Now */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => onAddToCart(product)}
              className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-50 text-slate-900 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              id={`add-cart-btn-${product.id}`}
            >
              <ShoppingCart className="w-3.5 h-3.5 text-slate-700" />
              <span>Add to Cart</span>
            </button>

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => onBuyNow(product)}
              className="py-2.5 px-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              id={`buy-now-btn-${product.id}`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
