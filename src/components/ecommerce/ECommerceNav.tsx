import React, { useState } from 'react';
import { Customer, CartItem, Product } from '../../types';
import { 
  ShoppingBag, Search, Heart, User, Sparkles, Terminal, 
  Menu, X, Tag, Zap
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

interface ECommerceNavProps {
  cart: CartItem[];
  wishlist: Product[];
  activeCustomer: Customer | null;
  searchTerm: string;
  onSearchChange: (query: string) => void;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenAccount: () => void;
  onGoHome: () => void;
  onSwitchToAdmin?: () => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  categories: string[];
  onOpenDealOfTheDay?: () => void;
}

export default function ECommerceNav({
  cart,
  wishlist,
  activeCustomer,
  searchTerm,
  onSearchChange,
  onOpenCart,
  onOpenWishlist,
  onOpenAccount,
  onGoHome,
  onSwitchToAdmin,
  selectedCategory,
  onSelectCategory,
  categories,
  onOpenDealOfTheDay
}: ECommerceNavProps) {
  const { currentCurrency } = useCurrency();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchExpandedMobile, setIsSearchExpandedMobile] = useState(false);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all" id="ecom-main-header">
      
      {/* 1. Top Announcement / Sliding Flash Promo Bar */}
      <div className="bg-slate-900 text-white text-[11px] font-medium py-1.5 px-4 overflow-hidden" id="ecom-top-announcement">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-[10px] tracking-wide uppercase">
              <Zap className="w-3 h-3 text-amber-400" /> Flash Promo
            </span>
            <span className="hidden sm:inline">Use coupon <strong className="text-amber-300 font-mono font-bold">COUPON_15</strong> for 15% off cart orders!</span>
            <span className="sm:hidden text-[10px]">Code <strong className="text-amber-300 font-mono">COUPON_15</strong> = 15% OFF</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-300 ml-auto">
            {onOpenDealOfTheDay && (
              <button 
                onClick={onOpenDealOfTheDay}
                className="hidden md:inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-bold transition-colors cursor-pointer"
                id="btn-nav-deal-day"
              >
                <Tag className="w-3 h-3" /> Deal of the Day
              </button>
            )}
            <span className="hidden lg:inline text-slate-500">|</span>
            <span className="font-mono text-slate-300 text-[11px] hidden sm:inline">
              {currentCurrency.flag} {currentCurrency.code} ({currentCurrency.symbol})
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* Logo & Brand Identity */}
          <div 
            onClick={onGoHome}
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0 group"
            id="ecom-nav-logo"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600 group-hover:bg-indigo-700 text-white flex items-center justify-center font-black text-base shadow-sm shadow-indigo-500/30 transition-all">
              N
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                  Nexus<span className="text-indigo-600">Store</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider hidden xs:inline">
                  Live
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Customer Experience & Online Store</p>
            </div>
          </div>

          {/* Center: Search Bar (Desktop & Tablet) */}
          <div className="hidden md:flex flex-1 max-w-md lg:max-w-lg relative mx-2" id="ecom-nav-search-desktop">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search products, brands, tech, gear, SKU..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                id="ecom-desktop-search-input"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Action Icons: Admin Switch, Wishlist, Cart, Account */}
          <div className="flex items-center gap-1 sm:gap-2">
            
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setIsSearchExpandedMobile(!isSearchExpandedMobile)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Search"
              id="btn-mobile-search-toggle"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Switch to Staff Admin Workspace */}
            {onSwitchToAdmin && (
              <button
                type="button"
                onClick={onSwitchToAdmin}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Return to POS & Business Administration"
                id="ecom-btn-admin-console"
              >
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Admin Console</span>
              </button>
            )}

            {/* Wishlist Button with Badge */}
            <button
              onClick={onOpenWishlist}
              className="p-2 sm:p-2.5 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all relative cursor-pointer"
              title="Saved Wishlist"
              id="btn-open-wishlist"
            >
              <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'text-rose-500 fill-rose-500/20' : ''}`} />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Shopping Cart Drawer Button */}
            <button
              onClick={onOpenCart}
              className="p-2 sm:p-2.5 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all relative cursor-pointer flex items-center gap-2"
              title="Shopping Cart"
              id="btn-open-cart"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 text-slate-800" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white">
                    {totalCartCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-900 hidden lg:inline">Cart</span>
            </button>

            {/* Customer Account & Loyalty Button */}
            <button
              onClick={onOpenAccount}
              className="flex items-center gap-2 pl-2 pr-2.5 sm:pr-3 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-900 rounded-2xl transition-all cursor-pointer"
              id="btn-nav-account"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px]">
                {activeCustomer ? activeCustomer.name[0] : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left hidden xs:block">
                <span className="text-[11px] font-bold block leading-tight truncate max-w-[90px]">
                  {activeCustomer ? activeCustomer.name.split(' ')[0] : 'Sign In'}
                </span>
                <span className="text-[9px] text-indigo-600 font-semibold block leading-none">
                  {activeCustomer ? `${activeCustomer.loyaltyPoints} pts` : 'Account'}
                </span>
              </div>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
              id="btn-mobile-nav-toggle"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Expansion */}
        {isSearchExpandedMobile && (
          <div className="md:hidden pb-3 pt-1 animate-in slide-in-from-top-2">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search catalog, brands, SKU..."
                className="w-full pl-10 pr-9 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white focus:outline-hidden"
                id="ecom-mobile-search-input"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. Category Quick Bar Ribbon (Desktop & Mobile Scroll) */}
        <div className="border-t border-slate-100 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-2" id="ecom-category-ribbon">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 hidden sm:inline mr-1">
            Browse:
          </span>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100/80 hover:bg-slate-200/70 text-slate-600'
                }`}
                id={`cat-nav-pill-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white p-4 space-y-3 shadow-lg animate-in slide-in-from-top-4" id="ecom-mobile-menu-drawer">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Navigation</span>
            <button
              onClick={() => { onGoHome(); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 rounded-xl"
            >
              Storefront Home
            </button>
            <button
              onClick={() => { onOpenAccount(); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 rounded-xl flex items-center justify-between"
            >
              <span>Customer Account & Orders</span>
              {activeCustomer && <span className="text-[10px] font-mono text-indigo-600 font-bold">{activeCustomer.loyaltyPoints} pts</span>}
            </button>
            <button
              onClick={() => { onOpenWishlist(); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 rounded-xl flex items-center justify-between"
            >
              <span>My Saved Wishlist</span>
              <span className="text-[10px] font-mono bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">{wishlist.length}</span>
            </button>
          </div>

          {onSwitchToAdmin && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { onSwitchToAdmin(); setMobileMenuOpen(false); }}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs"
              >
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Open Staff Admin Console</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
