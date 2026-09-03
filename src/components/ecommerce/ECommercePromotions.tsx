import React, { useState } from 'react';
import { Tag, Sparkles, Copy, Check, Zap, Gift } from 'lucide-react';
import { VALID_COUPONS } from './ECommerceCartDrawer';

interface ECommercePromotionsProps {
  onApplyCoupon: (code: string) => boolean;
  onOpenDealDay?: () => void;
}

export default function ECommercePromotions({
  onApplyCoupon,
  onOpenDealDay
}: ECommercePromotionsProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      onApplyCoupon(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  return (
    <section className="space-y-4" id="ecom-promotions-section">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-amber-600">
            <Zap className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">Active Vouchers</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Coupons & Seasonal Discounts
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {VALID_COUPONS.map((cp) => {
          const isCopied = copiedCode === cp.code;

          return (
            <div 
              key={cp.code}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between space-y-3 group"
            >
              {/* Dashed voucher outline */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-600" />
                    <span>{cp.discountType === 'percentage' ? `${cp.value}% OFF` : cp.discountType === 'fixed' ? `$${cp.value} OFF` : 'FREE SHIPPING'}</span>
                  </span>

                  <span className="text-[10px] text-slate-400 font-mono">Instant Voucher</span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 leading-snug">
                  {cp.description}
                </h4>
              </div>

              {/* Coupon Code Pill & Copy Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="px-2.5 py-1 bg-slate-100 rounded-xl border border-dashed border-slate-300 font-mono font-black text-xs text-slate-800 tracking-wider">
                  {cp.code}
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(cp.code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                  title="Copy code and apply to cart"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Applied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
