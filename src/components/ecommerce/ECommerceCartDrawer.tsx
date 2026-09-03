import React, { useState } from 'react';
import { CartItem, CouponCode, Customer } from '../../types';
import { 
  X, ShoppingBag, Trash2, ArrowRight, Tag, Truck, Check, 
  Sparkles, ShieldCheck, Zap, AlertCircle
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

interface ECommerceCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number, variantSku?: string) => void;
  onRemoveItem: (productId: string, variantSku?: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  appliedCoupon: CouponCode | null;
  onApplyCoupon: (code: string) => boolean;
  onRemoveCoupon: () => void;
  couponError?: string;
  activeCustomer: Customer | null;
  useLoyaltyPoints: boolean;
  onToggleLoyaltyPoints: (use: boolean) => void;
}

export const VALID_COUPONS: CouponCode[] = [
  {
    code: 'COUPON_15',
    discountType: 'percentage',
    value: 15,
    description: '15% Off Your Entire Cart Order'
  },
  {
    code: 'SAVE20',
    discountType: 'percentage',
    value: 20,
    minSpend: 200,
    description: '20% Off Orders Over $200'
  },
  {
    code: 'FREESHIP',
    discountType: 'free_shipping',
    value: 15,
    description: 'Free Nationwide Express Shipping'
  },
  {
    code: 'WELCOME10',
    discountType: 'fixed',
    value: 10,
    description: '$10 Off First Online Order'
  }
];

export default function ECommerceCartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  couponError,
  activeCustomer,
  useLoyaltyPoints,
  onToggleLoyaltyPoints
}: ECommerceCartDrawerProps) {
  const { formatAmount } = useCurrency();
  const [couponInput, setCouponInput] = useState('');
  const [inputError, setInputError] = useState('');

  if (!isOpen) return null;

  const FREE_SHIPPING_THRESHOLD = 150;
  const rawSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  
  // Calculate Coupon Discount
  let couponDiscountAmount = 0;
  let hasFreeShippingFromCoupon = false;

  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      couponDiscountAmount = (rawSubtotal * appliedCoupon.value) / 100;
    } else if (appliedCoupon.discountType === 'fixed') {
      couponDiscountAmount = Math.min(rawSubtotal, appliedCoupon.value);
    } else if (appliedCoupon.discountType === 'free_shipping') {
      hasFreeShippingFromCoupon = true;
    }
  }

  // Loyalty points discount (1 point = $0.05)
  const loyaltyPointsDiscount = (useLoyaltyPoints && activeCustomer) 
    ? Math.min(rawSubtotal - couponDiscountAmount, (activeCustomer.loyaltyPoints * 0.05))
    : 0;

  const isFreeShipping = rawSubtotal >= FREE_SHIPPING_THRESHOLD || hasFreeShippingFromCoupon;
  const shippingCost = isFreeShipping ? 0 : 15.00;
  const taxAmount = (rawSubtotal - couponDiscountAmount - loyaltyPointsDiscount) * 0.08; // 8% standard tax
  const finalTotal = Math.max(0, rawSubtotal - couponDiscountAmount - loyaltyPointsDiscount + shippingCost + taxAmount);

  const freeShippingProgress = Math.min(100, Math.round((rawSubtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - rawSubtotal);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError('');
    if (!couponInput.trim()) return;

    const success = onApplyCoupon(couponInput.trim().toUpperCase());
    if (success) {
      setCouponInput('');
    } else {
      setInputError('Invalid or expired coupon code. Try COUPON_15 or FREESHIP');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200/80 animate-in slide-in-from-right duration-300 relative"
        id="ecommerce-cart-drawer"
      >
        
        {/* 1. Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Shopping Cart
              </h2>
              <span className="text-xs text-slate-400">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items in bag
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-xs text-slate-400 hover:text-rose-600 transition-colors px-2 py-1"
                title="Clear Cart"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Free Shipping Progress Bar */}
        <div className="bg-indigo-50/70 px-4 py-3 border-b border-indigo-100">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-950 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isFreeShipping ? 'You unlocked FREE Express Shipping!' : `Add ${formatAmount(amountToFreeShipping)} more for FREE Shipping`}</span>
            </div>
            <span className="font-mono text-indigo-600">{freeShippingProgress}%</span>
          </div>
          <div className="w-full bg-indigo-200/60 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* 3. Cart Items Scroll List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Your bag is currently empty</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Browse our high-performance inventory and add items to your cart to begin checkout.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Explore Products
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const itemTotal = item.product.price * item.quantity;
              const selectedVar = item.selectedVariantSku 
                ? item.product.variants?.find(v => v.sku === item.selectedVariantSku)
                : undefined;

              return (
                <div key={`${item.product.id}-${item.selectedVariantSku || 'default'}`} className="pt-4 first:pt-0 flex gap-3 group">
                  {/* Thumbnail */}
                  <img 
                    src={item.product.imageUrl} 
                    alt={item.product.name}
                    className="w-20 h-20 rounded-2xl object-cover border border-slate-200 bg-slate-100 shrink-0"
                  />

                  {/* Info & Quantity */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">
                          {item.product.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.product.id, item.selectedVariantSku)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {selectedVar && (
                        <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">
                          {selectedVar.color} • {selectedVar.size}
                        </span>
                      )}

                      <span className="text-xs font-mono font-bold text-slate-600 mt-0.5 block">
                        {formatAmount(item.product.price)}
                      </span>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1, item.selectedVariantSku)}
                          className="w-6 h-6 rounded-lg bg-white text-slate-700 flex items-center justify-center font-bold text-xs shadow-2xs hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-xs text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, item.selectedVariantSku)}
                          className="w-6 h-6 rounded-lg bg-white text-slate-700 flex items-center justify-center font-bold text-xs shadow-2xs hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-xs font-mono font-black text-slate-900">
                        {formatAmount(itemTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. Footer Summary & Coupon & Checkout */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-3 z-10">
            
            {/* Coupon input */}
            <div className="space-y-1">
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Coupon <strong>{appliedCoupon.code}</strong> applied (-{formatAmount(couponDiscountAmount)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={onRemoveCoupon}
                    className="text-emerald-700 hover:text-emerald-900 font-bold text-[11px] underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value);
                        setInputError('');
                      }}
                      placeholder="Promo code (e.g. COUPON_15)"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs uppercase font-mono tracking-wider focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
              )}

              {(inputError || couponError) && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{inputError || couponError}</span>
                </p>
              )}
            </div>

            {/* Loyalty points toggle if customer logged in */}
            {activeCustomer && activeCustomer.loyaltyPoints > 0 && (
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="font-bold text-slate-900">Redeem Points</span>
                    <span className="text-[10px] text-slate-500 block">
                      {activeCustomer.loyaltyPoints} available (${(activeCustomer.loyaltyPoints * 0.05).toFixed(2)})
                    </span>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  checked={useLoyaltyPoints}
                  onChange={(e) => onToggleLoyaltyPoints(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-slate-600 pt-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-slate-900">{formatAmount(rawSubtotal)}</span>
              </div>

              {couponDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount</span>
                  <span className="font-mono font-bold">-{formatAmount(couponDiscountAmount)}</span>
                </div>
              )}

              {loyaltyPointsDiscount > 0 && (
                <div className="flex justify-between text-amber-600 font-medium">
                  <span>Loyalty Points Applied</span>
                  <span className="font-mono font-bold">-{formatAmount(loyaltyPointsDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Estimated Shipping</span>
                <span className="font-mono font-bold text-slate-900">
                  {isFreeShipping ? (
                    <span className="text-emerald-600">FREE</span>
                  ) : (
                    formatAmount(shippingCost)
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Estimated Tax (8%)</span>
                <span className="font-mono font-bold text-slate-900">{formatAmount(taxAmount)}</span>
              </div>

              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Estimated Total</span>
                <span className="font-mono text-base text-indigo-600">{formatAmount(finalTotal)}</span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              onClick={onProceedToCheckout}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              id="btn-cart-checkout-proceed"
            >
              <span>Proceed to Secure Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 font-medium pt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> 256-bit Encrypted
              </span>
              <span>•</span>
              <span>Instant Confirmation</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
