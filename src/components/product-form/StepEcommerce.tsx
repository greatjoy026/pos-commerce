import React, { useEffect } from 'react';
import { 
  Globe, Search, Star, Sparkles, Flame, Tag, 
  ExternalLink, Copy, Check, ShieldCheck, ShoppingBag
} from 'lucide-react';
import { ProductEcommerce } from '../../types';

interface StepEcommerceProps {
  productName: string;
  category: string;
  ecommerce: ProductEcommerce;
  setEcommerce: (v: ProductEcommerce) => void;
}

export default function StepEcommerce({
  productName,
  category,
  ecommerce,
  setEcommerce
}: StepEcommerceProps) {
  const seoTitle = ecommerce.seoTitle || (productName ? `${productName} | Official Store` : '');
  const seoDescription = ecommerce.seoDescription || (ecommerce.summary || `Buy ${productName || 'product'} online at the best price with fast shipping and warranty.`);
  const slug = ecommerce.slug || productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const update = (key: keyof ProductEcommerce, value: any) => {
    setEcommerce({ ...ecommerce, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* E-Commerce Search & SEO */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-600" />
            Online Storefront & Search Engine Optimization (SEO)
          </h3>
          <p className="text-xs text-slate-500">Customize how this product appears on Google Search and e-commerce catalogs.</p>
        </div>

        <div className="space-y-4">
          {/* SEO Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Meta SEO Title</label>
              <span className={`text-[10px] font-semibold ${seoTitle.length > 60 ? 'text-amber-600' : 'text-slate-400'}`}>
                {seoTitle.length}/60 chars recommended
              </span>
            </div>
            <input
              type="text"
              value={ecommerce.seoTitle || ''}
              onChange={e => update('seoTitle', e.target.value)}
              placeholder={`${productName || 'Product Title'} | Official Store`}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* URL Slug */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">URL Slug / Web Address</label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
              <span className="px-3 py-2 text-xs font-medium text-slate-400 bg-slate-100 border-r border-slate-200">
                https://mystore.com/products/
              </span>
              <input
                type="text"
                value={ecommerce.slug || ''}
                onChange={e => update('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder={slug}
                className="w-full px-3 py-2 bg-transparent text-sm font-mono text-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Meta Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Meta Description</label>
              <span className={`text-[10px] font-semibold ${seoDescription.length > 160 ? 'text-amber-600' : 'text-slate-400'}`}>
                {seoDescription.length}/160 chars recommended
              </span>
            </div>
            <textarea
              rows={2}
              value={ecommerce.seoDescription || ''}
              onChange={e => update('seoDescription', e.target.value)}
              placeholder="Concise overview summarizing benefits and features for search result snippets..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition-all resize-y"
            />
          </div>
        </div>

        {/* Live Search Engine Snippet Preview */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-600 block mb-2">
            Google Search Snippet Preview:
          </span>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="text-[11px] text-emerald-800 font-mono flex items-center gap-1 truncate">
              https://mystore.com/products/{ecommerce.slug || slug || 'product-sku'}
            </div>
            <div className="text-sm font-bold text-indigo-700 hover:underline cursor-pointer truncate">
              {ecommerce.seoTitle || seoTitle || 'Product Name | Official Store'}
            </div>
            <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {ecommerce.seoDescription || seoDescription || 'Comprehensive product description and pricing.'}
            </div>
          </div>
        </div>
      </div>

      {/* Online Storefront Badges & Settings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
            Online Merchandising & Storefront Badges
          </h3>
          <p className="text-xs text-slate-500">Control promotional tags and customer review visibility on the e-commerce store.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all">
            <input
              type="checkbox"
              checked={Boolean(ecommerce.featured)}
              onChange={e => update('featured', e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Featured on Homepage
              </div>
              <div className="text-[11px] text-slate-500">Showcase this item in top banner collections.</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all">
            <input
              type="checkbox"
              checked={ecommerce.enableReviews !== false}
              onChange={e => update('enableReviews', e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500" /> Enable Verified Customer Reviews
              </div>
              <div className="text-[11px] text-slate-500">Allow customers to submit star ratings and feedback.</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
