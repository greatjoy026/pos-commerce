import React, { useEffect } from 'react';
import { 
  Globe, Search, Star, Sparkles, Flame, Tag, 
  ExternalLink, Copy, Check, ShieldCheck, ShoppingBag
} from 'lucide-react';

interface Step7EcommerceProps {
  publishOnline: boolean;
  setPublishOnline: (v: boolean) => void;
  ecommerceCategory: string;
  setEcommerceCategory: (v: string) => void;
  seoTitle: string;
  setSeoTitle: (v: string) => void;
  seoDescription: string;
  setSeoDescription: (v: string) => void;
  urlSlug: string;
  setUrlSlug: (v: string) => void;
  isFeatured: boolean;
  setIsFeatured: (v: boolean) => void;
  isNewArrival: boolean;
  setIsNewArrival: (v: boolean) => void;
  isBestSeller: boolean;
  setIsBestSeller: (v: boolean) => void;
  productName: string;
  productDescription: string;
  category: string;
  brand: string;
}

export default function Step7Ecommerce({
  publishOnline,
  setPublishOnline,
  ecommerceCategory,
  setEcommerceCategory,
  seoTitle,
  setSeoTitle,
  seoDescription,
  setSeoDescription,
  urlSlug,
  setUrlSlug,
  isFeatured,
  setIsFeatured,
  isNewArrival,
  setIsNewArrival,
  isBestSeller,
  setIsBestSeller,
  productName,
  productDescription,
  category,
  brand
}: Step7EcommerceProps) {

  // Auto-generate URL slug from Product Name if empty
  useEffect(() => {
    if (!urlSlug && productName) {
      const generated = productName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setUrlSlug(generated);
    }
  }, [productName]);

  // Auto-generate SEO Title if empty
  useEffect(() => {
    if (!seoTitle && productName) {
      setSeoTitle(`${productName} | ${brand || 'OmniPOS'} Official Store`);
    }
  }, [productName, brand]);

  // Auto-generate SEO Description if empty
  useEffect(() => {
    if (!seoDescription && productDescription) {
      setSeoDescription(productDescription.substring(0, 150));
    }
  }, [productDescription]);

  const handleRegenerateSlug = () => {
    const generated = (productName || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setUrlSlug(generated);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="step-7-ecommerce">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-600" />
            <span>Digital Storefront & SEO Discovery Engine</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure web catalog visibility, search engine optimization (SERP), URL slug routing, and merchandising promotion tags.
          </p>
        </div>

        {/* Publish Online Switch */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl self-start sm:self-auto">
          <span className="text-xs font-bold text-slate-700 px-1">Publish Online:</span>
          <button
            type="button"
            onClick={() => setPublishOnline(!publishOnline)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              publishOnline 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'bg-slate-300 text-slate-700'
            }`}
            id="btn-toggle-publish-online"
          >
            {publishOnline ? '✓ Live on Web' : 'Hidden from Web'}
          </button>
        </div>
      </div>

      {/* Online Visibility & Merchandising Badges */}
      <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-indigo-600" />
          <span>Merchandising & Storefront Badges</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Featured Product */}
          <div
            onClick={() => setIsFeatured(!isFeatured)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              isFeatured 
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20' 
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Star className={`w-3.5 h-3.5 ${isFeatured ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                <span>Featured Product</span>
              </span>
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                isFeatured ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {isFeatured ? '✓' : ''}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Pinned to homepage banners and hero showcase collections.
            </p>
          </div>

          {/* New Arrival */}
          <div
            onClick={() => setIsNewArrival(!isNewArrival)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              isNewArrival 
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20' 
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>New Arrival Badge</span>
              </span>
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                isNewArrival ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {isNewArrival ? '✓' : ''}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Renders "NEW" glowing badge on storefront catalog cards.
            </p>
          </div>

          {/* Best Seller */}
          <div
            onClick={() => setIsBestSeller(!isBestSeller)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              isBestSeller 
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20' 
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span>Best Seller Badge</span>
              </span>
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                isBestSeller ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {isBestSeller ? '✓' : ''}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Renders "POPULAR" flame badge to boost customer conversion.
            </p>
          </div>

        </div>
      </div>

      {/* SEO & Slug Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* URL Slug */}
        <div className="md:col-span-6 space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-800">
              Canonical URL Slug
            </label>
            <button
              type="button"
              onClick={handleRegenerateSlug}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
            >
              Regenerate Slug
            </button>
          </div>
          <div className="flex rounded-xl shadow-2xs">
            <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-500 font-mono text-xs">
              /products/
            </span>
            <input
              type="text"
              value={urlSlug}
              onChange={(e) => setUrlSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="aerosound-pro-anc-headphones"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-r-xl text-xs sm:text-sm font-mono font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950 focus:outline-hidden"
              id="input-ecommerce-slug"
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Clean SEO-friendly permalink for sharing and social graph embeds.
          </p>
        </div>

        {/* E-Commerce Category */}
        <div className="md:col-span-6 space-y-1.5">
          <label className="text-xs font-bold text-slate-800 block">
            Digital Storefront Taxonomy Category
          </label>
          <input
            type="text"
            value={ecommerceCategory || category}
            onChange={(e) => setEcommerceCategory(e.target.value)}
            placeholder="e.g., Electronics > Audio & Headphones"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950 focus:outline-hidden"
            id="input-ecommerce-category"
          />
          <p className="text-[10px] text-slate-400">
            Navigation breadcrumb category hierarchy for online shoppers.
          </p>
        </div>

        {/* SEO Meta Title */}
        <div className="md:col-span-12 space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Google SERP Page Title Tag</span>
            </label>
            <span className={`text-[11px] font-mono ${
              seoTitle.length >= 50 && seoTitle.length <= 60 ? 'text-emerald-600 font-bold' : 'text-slate-400'
            }`}>
              {seoTitle.length}/60 chars (ideal: 50-60)
            </span>
          </div>
          <input
            type="text"
            maxLength={75}
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            placeholder="AeroSound Pro Wireless ANC Headphones | Official Store"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950 focus:outline-hidden"
            id="input-seo-title"
          />
        </div>

        {/* SEO Meta Description */}
        <div className="md:col-span-12 space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-800">
              Google SERP Meta Description Snippet
            </label>
            <span className={`text-[11px] font-mono ${
              seoDescription.length >= 120 && seoDescription.length <= 160 ? 'text-emerald-600 font-bold' : 'text-slate-400'
            }`}>
              {seoDescription.length}/160 chars (ideal: 120-160)
            </span>
          </div>
          <textarea
            rows={2}
            maxLength={180}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            placeholder="Shop the AeroSound Pro with studio-grade Active Noise Cancellation, 40-hour battery life, and rapid USB-C charging. Free nationwide shipping on all orders."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950 focus:outline-hidden"
            id="textarea-seo-description"
          />
        </div>

      </div>

      {/* Live Google Search Preview (SERP Snippet) */}
      <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Search className="w-3.5 h-3.5 text-indigo-600" />
          <span>Live Search Engine Snippet Preview (Google SERP)</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1 font-sans">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">https://mystore.com</span>
            <span>› products › {urlSlug || 'product-slug'}</span>
          </div>
          <div className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer truncate">
            {seoTitle || `${productName || 'Product Title'} | Official Store`}
          </div>
          <div className="text-xs text-slate-600 line-clamp-2">
            {seoDescription || productDescription || 'Detailed product specifications, pricing, high-resolution photography, customer reviews, and fast checkout options.'}
          </div>
        </div>
      </div>

    </div>
  );
}
