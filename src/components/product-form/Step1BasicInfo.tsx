import React, { useState } from 'react';
import { ProductType, ProductStatus } from '../../types';
import { 
  Package, Tag, Building2, Layers, CheckCircle2, FileText, 
  Sparkles, Globe, Shield, Box, Sparkle, Plus, X, Wand2,
  RefreshCw, Check, Zap, AlertCircle
} from 'lucide-react';

interface Step1BasicInfoProps {
  name: string;
  setName: (v: string) => void;
  brand: string;
  setBrand: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  customCategory: string;
  setCustomCategory: (v: string) => void;
  isCustomCategory: boolean;
  setIsCustomCategory: (v: boolean) => void;
  productType: ProductType;
  setProductType: (v: ProductType) => void;
  description: string;
  setDescription: (v: string) => void;
  status: ProductStatus;
  setStatus: (v: ProductStatus) => void;
  existingCategories: string[];
  errors: Record<string, string>;
}

const DEFAULT_POPULAR_BRANDS = [
  'Sony', 'Apple', 'Logitech', 'Samsung', 'Nike', 'Anker', 'Bose', 'Dyson', 'Generic / In-House'
];

const PRODUCT_TYPE_OPTIONS: { type: ProductType; label: string; desc: string; icon: string }[] = [
  { type: 'Standard', label: 'Standard Item', desc: 'Single standalone SKU with physical inventory', icon: '📦' },
  { type: 'Variant', label: 'Variant Matrix', desc: 'Single product with sellable sizes, colors, models', icon: '🔀' },
  { type: 'Composite', label: 'Composite / BOM', desc: 'Manufactured from raw sub-components/parts', icon: '🛠️' },
  { type: 'Bundle', label: 'Bundle / Kit', desc: 'Commercial pack of multiple distinct products', icon: '🎁' },
  { type: 'Digital', label: 'Digital / Download', desc: 'E-books, software, serials & licenses', icon: '💾' },
  { type: 'Service', label: 'Service / Labor', desc: 'Hourly labor, repairs, installation & fees', icon: '⚡' },
];

const DESCRIPTION_PROMPT_PRESETS = [
  {
    id: 'ecom',
    label: '🚀 E-Commerce High-Converting',
    prompt: 'Compelling consumer sales copy with emotional hook, 3 key benefits, and retail call to action.'
  },
  {
    id: 'tech',
    label: '⚙️ Technical Specs & Warranty',
    prompt: 'Structured technical summary highlighting materials, precision tolerances, and 2-year warranty.'
  },
  {
    id: 'luxury',
    label: '💎 Luxury & Artisanal Story',
    prompt: 'Sophisticated narrative emphasizing artisanal craftsmanship, ergonomic feel, and premium aesthetics.'
  },
  {
    id: 'bullets',
    label: '📋 Scannable Bullet Points',
    prompt: 'Quick POS-friendly bullet list of specs, dimensions, compatibility, and package contents.'
  }
];

export default function Step1BasicInfo({
  name,
  setName,
  brand,
  setBrand,
  category,
  setCategory,
  customCategory,
  setCustomCategory,
  isCustomCategory,
  setIsCustomCategory,
  productType,
  setProductType,
  description,
  setDescription,
  status,
  setStatus,
  existingCategories,
  errors
}: Step1BasicInfoProps) {
  // Custom brand state
  const [isCustomBrandMode, setIsCustomBrandMode] = useState(false);
  const [customBrandInput, setCustomBrandInput] = useState('');
  const [savedCustomBrands, setSavedCustomBrands] = useState<string[]>([]);

  // AI Prompt generator state
  const [isAiPromptOpen, setIsAiPromptOpen] = useState(false);
  const [customAiPrompt, setCustomAiPrompt] = useState('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [lastGeneratedStatus, setLastGeneratedStatus] = useState<string | null>(null);

  // Add custom brand to pills and set active
  const handleAddCustomBrand = () => {
    if (!customBrandInput.trim()) return;
    const clean = customBrandInput.trim();
    if (!savedCustomBrands.includes(clean) && !DEFAULT_POPULAR_BRANDS.includes(clean)) {
      setSavedCustomBrands(prev => [...prev, clean]);
    }
    setBrand(clean);
    setCustomBrandInput('');
    setIsCustomBrandMode(false);
  };

  // Generate dynamic product description based on prompt / current fields
  const handleGenerateDescription = (presetType?: string, customInstruction?: string) => {
    setIsGeneratingCopy(true);

    setTimeout(() => {
      const pName = name.trim() || 'Premium Product Item';
      const pBrand = brand.trim() || 'OmniPOS Select';
      const pCat = isCustomCategory ? (customCategory.trim() || 'General') : category;
      const pType = productType || 'Physical Goods';

      let generated = '';

      if (presetType === 'ecom') {
        generated = `Elevate your everyday experience with the ${pBrand} ${pName}. Engineered with precision in the ${pCat} category, this ${pType.toLowerCase()} delivers uncompromising durability, streamlined ergonomics, and peak efficiency.\n\n• Advanced Architecture: Built from resilient, high-grade components for long-lasting commercial reliability.\n• Effortless Usability: Seamlessly integrates into your active routine with intuitive controls.\n• Guaranteed Satisfaction: Backed by our dedicated manufacturer warranty and expedited customer support.`;
      } else if (presetType === 'tech') {
        generated = `Technical Specification Brief — ${pBrand} ${pName}\n\n• Classification: ${pCat} (${pType})\n• Construction: Precision-milled chassis with industrial endurance rating.\n• Compatibility: Universal interoperability across standard POS networks and ecosystem accessories.\n• Operating Standards: Quality-tested to exceed international ISO manufacturing guidelines.\n• Warranty Coverage: 2-Year Manufacturer Replacement with registered serial tracking.`;
      } else if (presetType === 'luxury') {
        generated = `A masterclass in modern refinement, the ${pName} by ${pBrand} harmonizes artisanal aesthetics with high-performance utility. Every contour and surface texture has been meticulously sculpted to deliver a tactile, elevated user touchpoint.\n\nDesigned for those who demand excellence in the ${pCat} realm, each unit reflects uncompromising craftsmanship and enduring heritage.`;
      } else if (presetType === 'bullets') {
        generated = `• Master Item: ${pName}\n• Brand: ${pBrand}\n• Category Taxonomy: ${pCat}\n• Product Type: ${pType}\n• Key Feature 1: High-efficiency performance and instant deployment\n• Key Feature 2: Ergonomic lightweight construction with shock-absorbing casing\n• Package Includes: Master unit, rapid setup manual, and serial authenticity card`;
      } else if (customInstruction && customInstruction.trim()) {
        generated = `Specialized Merchandising Copy for ${pBrand} ${pName} (${pCat}):\n\n${customInstruction.trim()}\n\nEquipped with enterprise-grade durability and ergonomic refinement, this ${pType.toLowerCase()} is optimized for high-volume retail and digital storefront deployment.`;
      } else {
        // Auto general from metadata
        generated = `The ${pBrand} ${pName} is a top-tier ${pType.toLowerCase()} in the ${pCat} department. Engineered to deliver exceptional reliability, refined aesthetics, and seamless daily operation, it represents the gold standard in modern ${pCat.toLowerCase()} merchandising.`;
      }

      setDescription(generated);
      setIsGeneratingCopy(false);
      setLastGeneratedStatus('✨ Description generated successfully!');
      setTimeout(() => setLastGeneratedStatus(null), 3500);
    }, 450);
  };

  const allBrandPills = [...DEFAULT_POPULAR_BRANDS, ...savedCustomBrands];

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="step-1-basic-info">
      {/* Step Header info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-600" />
            <span>Product Master Identification</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Define high-level catalog metadata, merchandising brand, category taxonomy, and operational state.
          </p>
        </div>

        {/* Status Pill Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          {(['Active', 'Draft', 'Archived'] as ProductStatus[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatus(st)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                status === st
                  ? st === 'Active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : st === 'Draft'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id={`btn-status-${st.toLowerCase()}`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Product Name */}
        <div className="md:col-span-8 space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span>Product Title / Master Name</span>
              <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              {name.length}/120
            </span>
          </div>
          <div className="relative">
            <input
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., AeroSound Pro ANC Wireless Headphones"
              className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-950 focus:outline-hidden transition-all ${
                errors.name ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
              }`}
              id="input-product-name"
            />
          </div>
          {errors.name ? (
            <p className="text-xs text-red-600 font-medium">{errors.name}</p>
          ) : (
            <p className="text-[11px] text-slate-400">
              The primary title recognized across Point-of-Sale, e-commerce, and invoice documents.
            </p>
          )}
        </div>

        {/* Brand / Manufacturer with "+ Custom Brand" button */}
        <div className="md:col-span-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Brand / Manufacturer</span>
            </label>
            <button
              type="button"
              onClick={() => setIsCustomBrandMode(!isCustomBrandMode)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
              id="btn-toggle-custom-brand"
            >
              {isCustomBrandMode ? '← Brand List' : '+ Custom Brand'}
            </button>
          </div>

          {!isCustomBrandMode ? (
            <div className="relative">
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Sony, Apple, Nike"
                list="brands-datalist"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950 focus:outline-hidden transition-all"
                id="input-product-brand"
              />
              <datalist id="brands-datalist">
                {allBrandPills.map(b => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
          ) : (
            <div className="flex gap-1.5 animate-in fade-in duration-150">
              <input
                type="text"
                value={customBrandInput}
                onChange={(e) => setCustomBrandInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomBrand(); } }}
                placeholder="Type new brand name..."
                className="flex-1 px-3.5 py-3 bg-slate-50 border border-indigo-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                id="input-custom-brand-text"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddCustomBrand}
                className="px-3.5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                id="btn-save-custom-brand"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Set</span>
              </button>
            </div>
          )}

          {/* Quick Select Brand Pills */}
          <div className="flex flex-wrap gap-1 mt-1 max-h-16 overflow-y-auto">
            {allBrandPills.map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setBrand(b)}
                className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition-all ${
                  brand === b 
                    ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Category Taxonomy */}
        <div className="md:col-span-6 space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span>Category Taxonomy</span>
              <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsCustomCategory(!isCustomCategory)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
              id="btn-toggle-custom-category-step1"
            >
              {isCustomCategory ? '← Choose Standard' : '+ Custom Category'}
            </button>
          </div>

          {!isCustomCategory ? (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950 focus:outline-hidden transition-all"
              id="select-product-category"
            >
              {existingCategories.filter(c => c !== 'All').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              {!existingCategories.includes('Electronics') && <option value="Electronics">Electronics</option>}
              {!existingCategories.includes('Apparel & Fashion') && <option value="Apparel & Fashion">Apparel & Fashion</option>}
              {!existingCategories.includes('Home & Living') && <option value="Home & Living">Home & Living</option>}
              {!existingCategories.includes('Fitness & Outdoors') && <option value="Fitness & Outdoors">Fitness & Outdoors</option>}
              {!existingCategories.includes('Office Supplies') && <option value="Office Supplies">Office Supplies</option>}
            </select>
          ) : (
            <input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="e.g., Luxury Watches, Audio Equipment, Gourmet Spices"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950 focus:outline-hidden transition-all"
              id="input-custom-category-field"
            />
          )}
          {errors.category && <p className="text-xs text-red-600 font-medium">{errors.category}</p>}
        </div>

        {/* Product Classification / Type */}
        <div className="md:col-span-12 space-y-1.5">
          <label className="text-xs font-bold text-slate-800 block">
            Product Classification Architecture
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {PRODUCT_TYPE_OPTIONS.map((opt) => {
              const isSelected = productType === opt.type || (productType === 'Physical' && opt.type === 'Standard');
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setProductType(opt.type)}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                  id={`btn-product-type-${opt.type.toLowerCase()}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg shrink-0">{opt.icon}</span>
                    <span className={`text-xs font-bold block truncate ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                      {opt.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description Field with AI Auto-Generate & Prompt Assistant */}
        <div className="md:col-span-12 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Full Product Description & Merchandising Copy</span>
            </label>
            
            {/* AI Assistant Action Pill */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsAiPromptOpen(!isAiPromptOpen)}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                  isAiPromptOpen 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                }`}
                id="btn-toggle-ai-prompt-assistant"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>✨ AI Copy & Prompt Assistant</span>
              </button>

              <button
                type="button"
                onClick={() => handleGenerateDescription()}
                disabled={isGeneratingCopy}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all flex items-center gap-1"
                title="Auto-fill description from Title & Specs"
              >
                <RefreshCw className={`w-3 h-3 ${isGeneratingCopy ? 'animate-spin' : ''}`} />
                <span>Auto-Fill</span>
              </button>

              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                {description.length} chars
              </span>
            </div>
          </div>

          {/* Feedback banner */}
          {lastGeneratedStatus && (
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-in slide-in-from-top-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lastGeneratedStatus}</span>
            </div>
          )}

          {/* Expanded AI Copy Generator Assistant Drawer */}
          {isAiPromptOpen && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-950">
                    Smart Merchandising Copy Prompter
                  </span>
                </div>
                <span className="text-[10px] text-indigo-600 font-medium">
                  Select a prompt style or enter custom instructions
                </span>
              </div>

              {/* Preset Prompts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {DESCRIPTION_PROMPT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleGenerateDescription(preset.id)}
                    disabled={isGeneratingCopy}
                    className="p-2.5 bg-white hover:bg-indigo-100/60 border border-indigo-200/80 rounded-xl text-left transition-all group"
                  >
                    <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-900 block">
                      {preset.label}
                    </span>
                    <span className="text-[10px] text-slate-500 block line-clamp-2 mt-0.5">
                      {preset.prompt}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Prompt Input Box */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={customAiPrompt}
                  onChange={(e) => setCustomAiPrompt(e.target.value)}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter') { 
                      e.preventDefault(); 
                      handleGenerateDescription(undefined, customAiPrompt); 
                    } 
                  }}
                  placeholder="e.g. Highlight 40hr battery, IPX7 waterproof, travel pouch, and 2-year guarantee..."
                  className="flex-1 px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                  id="input-custom-ai-prompt"
                />
                <button
                  type="button"
                  onClick={() => handleGenerateDescription(undefined, customAiPrompt)}
                  disabled={isGeneratingCopy}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                  id="btn-run-custom-ai-prompt"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Copy</span>
                </button>
              </div>
            </div>
          )}

          {/* Description Textarea */}
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Studio-grade Active Noise Cancelling headphones with 40-hour battery life, plush memory foam earcups, and customizable sound profiles..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950 focus:outline-hidden transition-all placeholder:text-slate-400 font-sans"
            id="textarea-product-description"
          />
          <p className="text-[11px] text-slate-400">
            Displayed on digital storefronts, quote proposals, and cashier product lookup overlays.
          </p>
        </div>

      </div>
    </div>
  );
}
