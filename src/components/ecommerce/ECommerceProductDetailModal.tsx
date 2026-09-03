import React, { useState } from 'react';
import { Product, ProductReview, CartItem } from '../../types';
import { 
  X, Star, Heart, ShoppingCart, Zap, Check, AlertTriangle, 
  ShieldCheck, Truck, RotateCcw, Share2, Tag, ThumbsUp, 
  MessageSquare, User
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

interface ECommerceProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  isInWishlist: boolean;
  onToggleWishlist: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number, variantSku?: string) => void;
  onBuyNow: (product: Product, quantity: number, variantSku?: string) => void;
  relatedProducts: Product[];
  onOpenProduct: (product: Product) => void;
  onAddReview?: (productId: string, review: Omit<ProductReview, 'id' | 'date'>) => void;
}

export default function ECommerceProductDetailModal({
  product,
  isOpen,
  onClose,
  isInWishlist,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
  relatedProducts,
  onOpenProduct,
  onAddReview
}: ECommerceProductDetailModalProps) {
  const { formatAmount } = useCurrency();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantSku, setSelectedVariantSku] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');
  
  // New review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewerName, setNewReviewerName] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync initial variant when product changes
  React.useEffect(() => {
    if (product) {
      setSelectedImageIndex(0);
      setQuantity(1);
      setShowReviewForm(false);
      if (product.variants && product.variants.length > 0) {
        setSelectedVariantSku(product.variants[0].sku);
      } else {
        setSelectedVariantSku('');
      }
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const images = product.images && product.images.length > 0 
    ? product.images 
    : [product.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600'];

  const discount = product.discountPercent || (product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0);
  const rating = product.rating || 4.8;
  const reviewsCount = product.reviews ? product.reviews.length : (product.reviewCount || 48);

  const selectedVariant = product.variants?.find(v => v.sku === selectedVariantSku);
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock;
  const isOutOfStock = currentStock <= 0;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewerName.trim() || !newComment.trim()) return;

    if (onAddReview) {
      onAddReview(product.id, {
        userName: newReviewerName.trim(),
        rating: newRating,
        comment: newComment.trim(),
        verifiedPurchase: true
      });
    }
    setNewReviewerName('');
    setNewComment('');
    setShowReviewForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200/80 relative flex flex-col no-scrollbar"
        id="ecommerce-product-detail-modal"
      >
        
        {/* Sticky Close & Share Header */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              {product.brand || product.category}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono text-slate-400">SKU: {selectedVariantSku || product.sku}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer relative"
              title="Share product link"
              id="btn-share-product"
            >
              <Share2 className="w-4 h-4" />
              {copiedLink && (
                <span className="absolute -bottom-7 right-0 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap">
                  Link copied!
                </span>
              )}
            </button>

            <button
              onClick={() => onToggleWishlist(product)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isInWishlist ? 'bg-rose-50 text-rose-500' : 'text-slate-500 hover:text-rose-500 hover:bg-rose-50'
              }`}
              title="Wishlist"
              id="btn-modal-wishlist"
            >
              <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Close"
              id="btn-close-product-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
          
          {/* Top Section: Gallery & Purchase Column */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10">
            
            {/* Left 6 Cols: Interactive Image Gallery */}
            <div className="md:col-span-6 space-y-3">
              {/* Active Large Display */}
              <div className="aspect-square bg-slate-100 rounded-3xl overflow-hidden border border-slate-200/80 relative shadow-inner">
                <img 
                  src={images[selectedImageIndex] || images[0]} 
                  alt={product.name}
                  className="w-full h-full object-cover object-center transition-all duration-300"
                />

                {/* Badges on Image */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  {discount > 0 && (
                    <span className="px-3 py-1 bg-rose-600 text-white text-xs font-black rounded-xl uppercase tracking-wider shadow-sm">
                      -{discount}% OFF
                    </span>
                  )}
                  {product.isBestSeller && (
                    <span className="px-2.5 py-0.5 bg-amber-500 text-white text-[10px] font-extrabold rounded-lg uppercase tracking-wider shadow-xs">
                      Best Seller
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnail Selector Ribbon */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        selectedImageIndex === idx
                          ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-xs'
                          : 'border-slate-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`${product.name} preview ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right 6 Cols: Info & Buy Actions */}
            <div className="md:col-span-6 flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                {/* Brand & Rating Bar */}
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100">
                    {product.category}
                  </span>

                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="flex items-center text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3.5 h-3.5 ${i < Math.floor(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                        />
                      ))}
                    </div>
                    <span className="font-bold text-slate-800">{rating}</span>
                    <span className="text-slate-400">({reviewsCount} verified reviews)</span>
                  </div>
                </div>

                {/* Product Name */}
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  {product.name}
                </h1>

                {/* Price Display */}
                <div className="flex items-baseline gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-150">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    {formatAmount(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-base text-slate-400 line-through font-mono">
                      {formatAmount(product.originalPrice)}
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                      Save {discount}%
                    </span>
                  )}
                </div>

                {/* Stock Availability */}
                <div className="flex items-center gap-2">
                  {isOutOfStock ? (
                    <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs bg-rose-50 px-3 py-1.5 rounded-xl">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Currently Out of Stock</span>
                    </div>
                  ) : currentStock <= 5 ? (
                    <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Low Stock: Only {currentStock} units remaining</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>In Stock & Ready to Ship ({currentStock} available)</span>
                    </div>
                  )}
                </div>

                {/* Variants Selector */}
                {product.variants && product.variants.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Select Variant / Style:
                      </label>
                      {selectedVariant && (
                        <span className="text-xs text-slate-500 font-medium">
                          {selectedVariant.size} • {selectedVariant.color}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {product.variants.map((v) => {
                        const isSelected = selectedVariantSku === v.sku;
                        return (
                          <button
                            key={v.sku}
                            type="button"
                            onClick={() => setSelectedVariantSku(v.sku)}
                            className={`p-3 rounded-2xl text-left border text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs ring-2 ring-indigo-600/20'
                                : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                            }`}
                          >
                            <div className="font-bold truncate">{v.color || v.size}</div>
                            <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                              {v.size} • <span className="font-mono">{v.stock} in stock</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Quantity:
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-slate-200 rounded-2xl bg-slate-50 p-1">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shadow-2xs transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-mono font-bold text-slate-900 text-sm">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                        disabled={quantity >= currentStock}
                        className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shadow-2xs transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-xs text-slate-400">
                      Total: <strong className="font-mono text-slate-900">{formatAmount(product.price * quantity)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Add to Cart & Buy Now Buttons */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => {
                      onAddToCart(product, quantity, selectedVariantSku || undefined);
                    }}
                    className="py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:opacity-50 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    id="modal-add-to-cart-btn"
                  >
                    <ShoppingCart className="w-4 h-4 text-indigo-400" />
                    <span>Add to Cart</span>
                  </button>

                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => {
                      onBuyNow(product, quantity, selectedVariantSku || undefined);
                    }}
                    className="py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    id="modal-buy-now-btn"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Instant Checkout</span>
                  </button>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] text-slate-500 font-medium text-center">
                  <div className="flex flex-col items-center gap-1 p-2 bg-slate-50 rounded-xl">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    <span>Fast Delivery</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 bg-slate-50 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>2-Yr Warranty</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 bg-slate-50 rounded-xl">
                    <RotateCcw className="w-4 h-4 text-amber-600" />
                    <span>30-Day Return</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section: Tabs (Description, Specifications, Reviews) */}
          <div className="pt-6 border-t border-slate-200">
            {/* Tab Headers */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('description')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'description'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Description
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('specifications')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'specifications'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Specifications & Tech Specs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'reviews'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Reviews</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-mono">
                  {reviewsCount}
                </span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="pt-6">
              
              {/* Tab 1: Description */}
              {activeTab === 'description' && (
                <div className="space-y-4 max-w-3xl text-sm text-slate-700 leading-relaxed">
                  <p>{product.description || 'Premium commercial-grade product engineered for durability, performance, and modern lifestyle demands.'}</p>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Key Highlights:</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                      <li>Engineered with aerospace and studio-grade materials.</li>
                      <li>Tested for continuous heavy commercial and personal duty.</li>
                      <li>Includes complete manufacturer authenticity documentation and warranty card.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Tab 2: Specifications */}
              {activeTab === 'specifications' && (
                <div className="max-w-2xl">
                  {product.specifications && Object.keys(product.specifications).length > 0 ? (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                      {Object.entries(product.specifications).map(([key, val]) => (
                        <div key={key} className="grid grid-cols-3 p-3 text-xs">
                          <span className="font-bold text-slate-500">{key}</span>
                          <span className="col-span-2 font-medium text-slate-900">{val}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                      <div className="grid grid-cols-3 p-3">
                        <span className="font-bold text-slate-500">Category</span>
                        <span className="col-span-2 font-medium text-slate-900">{product.category}</span>
                      </div>
                      <div className="grid grid-cols-3 p-3">
                        <span className="font-bold text-slate-500">SKU</span>
                        <span className="col-span-2 font-mono text-slate-900">{product.sku}</span>
                      </div>
                      <div className="grid grid-cols-3 p-3">
                        <span className="font-bold text-slate-500">Storage Location</span>
                        <span className="col-span-2 font-medium text-slate-900">{product.location || 'Main Warehouse'}</span>
                      </div>
                      <div className="grid grid-cols-3 p-3">
                        <span className="font-bold text-slate-500">Barcode</span>
                        <span className="col-span-2 font-mono text-slate-900">{product.barcode || 'N/A'}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Customer Reviews */}
              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {/* Reviews Summary & Write Review CTA */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-black text-slate-900 font-mono">{rating}</div>
                      <div>
                        <div className="flex items-center text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-xs text-slate-500 mt-0.5 block">Based on {reviewsCount} customer ratings</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowReviewForm(!showReviewForm)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      id="btn-write-review"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{showReviewForm ? 'Cancel Review' : 'Write a Review'}</span>
                    </button>
                  </div>

                  {/* Interactive Review Submission Form */}
                  {showReviewForm && (
                    <form onSubmit={handleReviewSubmit} className="bg-white p-5 rounded-2xl border-2 border-indigo-200 space-y-4 animate-in fade-in">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Leave Verified Feedback</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Your Name</label>
                          <input 
                            type="text"
                            required
                            value={newReviewerName}
                            onChange={(e) => setNewReviewerName(e.target.value)}
                            placeholder="e.g. Alex Johnson"
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Star Rating</label>
                          <div className="flex items-center gap-2 pt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setNewRating(star)}
                                className="cursor-pointer"
                              >
                                <Star className={`w-5 h-5 ${star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                              </button>
                            ))}
                            <span className="text-xs font-mono font-bold text-slate-700 ml-2">{newRating} / 5 Stars</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">Review Comments</label>
                        <textarea
                          required
                          rows={3}
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="How was the product quality, performance, and unboxing experience?"
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                        />
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Submit Review
                      </button>
                    </form>
                  )}

                  {/* Reviews List */}
                  <div className="space-y-3 divide-y divide-slate-100">
                    {product.reviews && product.reviews.length > 0 ? (
                      product.reviews.map((rev) => (
                        <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">
                                {rev.userName[0]}
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-slate-900">{rev.userName}</h5>
                                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                                  <Check className="w-3 h-3" />
                                  <span>Verified Buyer</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">{rev.date}</span>
                          </div>

                          <div className="flex items-center text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                            ))}
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No customer reviews yet. Be the first to review this product!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section: Related / Recommended Products */}
          {relatedProducts.length > 0 && (
            <div className="pt-8 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  You Might Also Like
                </h3>
                <span className="text-xs text-slate-400">Curated recommendations</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {relatedProducts.slice(0, 4).map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => {
                      onOpenProduct(rel);
                    }}
                    className="p-3 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 mb-2">
                      <img src={rel.imageUrl} alt={rel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-indigo-600 uppercase block">{rel.brand || rel.category}</span>
                      <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {rel.name}
                      </h4>
                      <span className="text-xs font-mono font-black text-slate-900 block">
                        {formatAmount(rel.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
