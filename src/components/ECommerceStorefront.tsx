import React, { useState, useMemo } from 'react';
import { Product, Customer, Order, CartItem, CouponCode } from '../types';
import { 
  Sparkles, Flame, Zap, Award, ShoppingBag, ShieldCheck, 
  Truck, ArrowRight, RefreshCw, Star, Heart, CheckCircle, 
  HelpCircle, ChevronRight, PhoneCall, Mail, CreditCard, Lock
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

// Child Storefront Components
import ECommerceNav from './ecommerce/ECommerceNav';
import ECommerceHero from './ecommerce/ECommerceHero';
import ECommerceCategories from './ecommerce/ECommerceCategories';
import ECommerceProductCard from './ecommerce/ECommerceProductCard';
import ECommerceProductDetailModal from './ecommerce/ECommerceProductDetailModal';
import ECommerceCartDrawer, { VALID_COUPONS } from './ecommerce/ECommerceCartDrawer';
import ECommerceCheckoutModal from './ecommerce/ECommerceCheckoutModal';
import ECommerceWishlistDrawer from './ecommerce/ECommerceWishlistDrawer';
import ECommerceCustomerAccountModal from './ecommerce/ECommerceCustomerAccountModal';
import ECommerceBrands from './ecommerce/ECommerceBrands';
import ECommercePromotions from './ecommerce/ECommercePromotions';
import ECommerceFilterSection, { FilterState, SortOption } from './ecommerce/ECommerceFilterSection';

interface ECommerceStorefrontProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  onPlaceEcomOrder: (order: Order) => void;
  activeCustomer: Customer | null;
  onLoginCustomer: (customerId: string) => void;
  onRegisterCustomer: (customer: Customer) => void;
  onSwitchToAdmin?: () => void;
}

export default function ECommerceStorefront({
  products,
  customers,
  orders,
  onPlaceEcomOrder,
  activeCustomer,
  onLoginCustomer,
  onRegisterCustomer,
  onSwitchToAdmin
}: ECommerceStorefrontProps) {
  const { formatAmount } = useCurrency();

  // Navigation & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'catalog' | 'bestsellers' | 'newarrivals' | 'deals'>('home');

  // Filter & Sort States
  const [filters, setFilters] = useState<FilterState>({
    category: 'All',
    brand: '',
    minPrice: 0,
    maxPrice: 1000,
    inStockOnly: false,
    onSaleOnly: false,
    minRating: 0
  });
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  // Shopping Bag & Wishlist
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponCode | null>(null);
  const [couponError, setCouponError] = useState('');
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);

  // Modals & Drawers States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Store placed orders in local state for immediate account display
  const [storeOrders, setStoreOrders] = useState<any[]>(() => {
    return orders.map(ord => ({
      orderNumber: ord.id,
      trackingNumber: `TRK-${ord.id.slice(-6).toUpperCase()}`,
      date: new Date(ord.date).toLocaleDateString(),
      items: ord.items,
      grandTotal: ord.total,
      total: ord.total
    }));
  });

  // Unique Categories & Brands
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  const brands = useMemo(() => {
    return Array.from(new Set(products.map(p => p.brand).filter(Boolean))) as string[];
  }, [products]);

  // Product Counts per category
  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'All': products.length
    };
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Featured, Best Sellers, New Arrivals subsets
  const bestSellers = useMemo(() => {
    return products.filter(p => p.isBestSeller || (p.salesCount && p.salesCount > 20)).slice(0, 8);
  }, [products]);

  const newArrivals = useMemo(() => {
    return products.filter(p => p.isNewArrival).slice(0, 8);
  }, [products]);

  const dealProducts = useMemo(() => {
    return products.filter(p => (p.discountPercent && p.discountPercent > 0) || (p.originalPrice && p.originalPrice > p.price)).slice(0, 8);
  }, [products]);

  // Filtered & Sorted Catalog Pipeline
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search query match
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesDesc = (p.description || '').toLowerCase().includes(query);
        const matchesBrand = (p.brand || '').toLowerCase().includes(query);
        const matchesCategory = (p.category || '').toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesBrand && !matchesCategory) {
          return false;
        }
      }

      // Category filter
      if (filters.category !== 'All' && p.category !== filters.category) {
        return false;
      }

      // Brand filter
      if (filters.brand && p.brand !== filters.brand) {
        return false;
      }

      // Price slider
      if (p.price > filters.maxPrice) {
        return false;
      }

      // In stock
      if (filters.inStockOnly && p.stock <= 0) {
        return false;
      }

      // On sale
      if (filters.onSaleOnly && (!p.discountPercent || p.discountPercent <= 0) && (!p.originalPrice || p.originalPrice <= p.price)) {
        return false;
      }

      // Rating
      if (filters.minRating > 0 && (p.rating || 4.5) < filters.minRating) {
        return false;
      }

      // Tab specific filters
      if (activeTab === 'bestsellers' && !p.isBestSeller && (!p.salesCount || p.salesCount <= 20)) {
        return false;
      }

      if (activeTab === 'newarrivals' && !p.isNewArrival) {
        return false;
      }

      if (activeTab === 'deals' && (!p.discountPercent || p.discountPercent <= 0) && (!p.originalPrice || p.originalPrice <= p.price)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') return (b.rating || 4.5) - (a.rating || 4.5);
      if (sortBy === 'newest') return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
      if (sortBy === 'bestsellers') return (b.salesCount || 0) - (a.salesCount || 0);
      return 0; // 'featured' keeps curated order
    });
  }, [products, searchTerm, filters, sortBy, activeTab]);

  // Cart operations
  const handleAddToCart = (product: Product, quantity = 1, variantSku?: string) => {
    const skuToUse = variantSku || (product.variants && product.variants.length > 0 ? product.variants[0].sku : undefined);

    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id && item.selectedVariantSku === skuToUse);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx].quantity += quantity;
        return updated;
      } else {
        return [...prev, { product, quantity, selectedVariantSku: skuToUse }];
      }
    });

    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number, variantSku?: string) => {
    setCart(prev => {
      if (quantity <= 0) {
        return prev.filter(item => !(item.product.id === productId && item.selectedVariantSku === variantSku));
      }
      return prev.map(item => {
        if (item.product.id === productId && item.selectedVariantSku === variantSku) {
          return { ...item, quantity };
        }
        return item;
      });
    });
  };

  const handleRemoveCartItem = (productId: string, variantSku?: string) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.selectedVariantSku === variantSku)));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Wishlist operations
  const handleToggleWishlist = (product: Product) => {
    setWishlist(prev => {
      if (prev.some(p => p.id === product.id)) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  };

  const handleMoveAllWishlistToCart = () => {
    wishlist.forEach(p => {
      if (p.stock > 0) {
        handleAddToCart(p);
      }
    });
    setWishlist([]);
    setIsWishlistOpen(false);
  };

  // Coupon handling
  const handleApplyCoupon = (code: string): boolean => {
    const match = VALID_COUPONS.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (match) {
      setAppliedCoupon(match);
      setCouponError('');
      return true;
    } else {
      setCouponError('Invalid promo code. Valid vouchers: COUPON_15, SAVE20, FREESHIP');
      return false;
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  // Checkout submission
  const handleOrderCompleted = (order: Order, orderDetails: any) => {
    onPlaceEcomOrder(order);
    setStoreOrders(prev => [orderDetails, ...prev]);
    setCart([]);
    setAppliedCoupon(null);
  };

  // Customer Account selection / registration
  const handleSelectCustomer = (customer: Customer | null) => {
    if (customer) {
      onLoginCustomer(customer.id);
    }
  };

  const handleRegisterNewCustomer = (data: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...data
    };
    onRegisterCustomer(newCustomer);
    onLoginCustomer(newCustomer.id);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white" id="ecommerce-storefront-root">
      
      {/* 1. Header Navigation */}
      <ECommerceNav
        cart={cart}
        wishlist={wishlist}
        activeCustomer={activeCustomer}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
        onGoHome={() => {
          setActiveTab('home');
          setSearchTerm('');
          setFilters(prev => ({ ...prev, category: 'All', brand: '' }));
        }}
        onSwitchToAdmin={onSwitchToAdmin}
        selectedCategory={filters.category}
        onSelectCategory={(cat) => {
          setFilters(prev => ({ ...prev, category: cat }));
          setActiveTab('catalog');
        }}
        categories={categories}
        onOpenDealOfTheDay={() => {
          setActiveTab('deals');
        }}
      />

      {/* 2. Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12">
        
        {/* HOMEPAGE VIEW */}
        {activeTab === 'home' && !searchTerm && (
          <div className="space-y-12 animate-in fade-in duration-300">
            
            {/* Hero Slider & Value Propositions */}
            <ECommerceHero
              onShopCategory={(cat) => {
                setFilters(prev => ({ ...prev, category: cat }));
                setActiveTab('catalog');
              }}
              onOpenProduct={(prod) => setDetailProduct(prod)}
              featuredProduct={products[0]}
              dealProduct={dealProducts[0]}
            />

            {/* Visual Categories Grid */}
            <ECommerceCategories
              categories={categories}
              selectedCategory={filters.category}
              onSelectCategory={(cat) => {
                setFilters(prev => ({ ...prev, category: cat }));
                setActiveTab('catalog');
              }}
              productCounts={productCounts}
            />

            {/* Featured & Recommended Products Carousel / Grid */}
            <section className="space-y-4" id="ecom-featured-section">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-indigo-600">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Editor's Choice</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                    Featured & Recommended
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {products.slice(0, 4).map(prod => (
                  <ECommerceProductCard
                    key={prod.id}
                    product={prod}
                    isInWishlist={wishlist.some(w => w.id === prod.id)}
                    onToggleWishlist={handleToggleWishlist}
                    onAddToCart={(p, sku) => handleAddToCart(p, 1, sku)}
                    onBuyNow={(p, sku) => {
                      handleAddToCart(p, 1, sku);
                      setIsCheckoutOpen(true);
                    }}
                    onQuickView={(p) => setDetailProduct(p)}
                  />
                ))}
              </div>
            </section>

            {/* Active Promotions & Voucher Codes */}
            <ECommercePromotions
              onApplyCoupon={(code) => {
                const success = handleApplyCoupon(code);
                if (success) {
                  setIsCartOpen(true);
                }
                return success;
              }}
            />

            {/* Best Sellers Grid */}
            {bestSellers.length > 0 && (
              <section className="space-y-4" id="ecom-bestsellers-section">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-amber-600">
                      <Flame className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Trending Now</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                      Best Sellers
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('bestsellers')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View More</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {bestSellers.slice(0, 4).map(prod => (
                    <ECommerceProductCard
                      key={prod.id}
                      product={prod}
                      isInWishlist={wishlist.some(w => w.id === prod.id)}
                      onToggleWishlist={handleToggleWishlist}
                      onAddToCart={(p, sku) => handleAddToCart(p, 1, sku)}
                      onBuyNow={(p, sku) => {
                        handleAddToCart(p, 1, sku);
                        setIsCheckoutOpen(true);
                      }}
                      onQuickView={(p) => setDetailProduct(p)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Authorized Brands Showcase */}
            <ECommerceBrands
              brands={brands}
              selectedBrand={filters.brand}
              onSelectBrand={(b) => {
                setFilters(prev => ({ ...prev, brand: b }));
                setActiveTab('catalog');
              }}
            />

            {/* New Arrivals Grid */}
            {newArrivals.length > 0 && (
              <section className="space-y-4" id="ecom-new-arrivals-section">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Just Dropped</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                      New Arrivals
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('newarrivals')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {newArrivals.slice(0, 4).map(prod => (
                    <ECommerceProductCard
                      key={prod.id}
                      product={prod}
                      isInWishlist={wishlist.some(w => w.id === prod.id)}
                      onToggleWishlist={handleToggleWishlist}
                      onAddToCart={(p, sku) => handleAddToCart(p, 1, sku)}
                      onBuyNow={(p, sku) => {
                        handleAddToCart(p, 1, sku);
                        setIsCheckoutOpen(true);
                      }}
                      onQuickView={(p) => setDetailProduct(p)}
                    />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}

        {/* CATALOG / SEARCH / FILTERED BROWSING VIEW */}
        {(activeTab !== 'home' || searchTerm) && (
          <div className="space-y-6 animate-in fade-in duration-200" id="ecom-catalog-view">
            
            {/* Catalog Header Banner */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
              <div className="space-y-1 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  Online Catalog
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {searchTerm ? `Search Results for "${searchTerm}"` : 
                   activeTab === 'bestsellers' ? 'Best Selling Products' :
                   activeTab === 'newarrivals' ? 'New Arrivals & Fresh Releases' :
                   activeTab === 'deals' ? 'Special Promotions & Flash Deals' :
                   filters.category !== 'All' ? `${filters.category} Collection` : 'All Products Catalog'}
                </h1>
                <p className="text-xs text-slate-300 max-w-xl">
                  High-performance inventory engineered for reliability, certified with comprehensive warranties and express dispatch.
                </p>
              </div>

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all self-start sm:self-center cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>

            {/* Filter & Sorting Controls */}
            <ECommerceFilterSection
              filters={filters}
              onFilterChange={setFilters}
              sortBy={sortBy}
              onSortChange={setSortBy}
              categories={categories}
              brands={brands}
              totalResults={filteredProducts.length}
              onResetFilters={() => {
                setFilters({
                  category: 'All',
                  brand: '',
                  minPrice: 0,
                  maxPrice: 1000,
                  inStockOnly: false,
                  onSaleOnly: false,
                  minRating: 0
                });
                setSearchTerm('');
              }}
            />

            {/* Product Cards Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 space-y-4 shadow-2xs">
                <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">No matching products found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Try adjusting your filters, clearing the search term, or browsing a different category.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFilters({
                      category: 'All',
                      brand: '',
                      minPrice: 0,
                      maxPrice: 1000,
                      inStockOnly: false,
                      onSaleOnly: false,
                      minRating: 0
                    });
                    setSearchTerm('');
                    setActiveTab('catalog');
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Reset Catalog Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredProducts.map(prod => (
                  <ECommerceProductCard
                    key={prod.id}
                    product={prod}
                    isInWishlist={wishlist.some(w => w.id === prod.id)}
                    onToggleWishlist={handleToggleWishlist}
                    onAddToCart={(p, sku) => handleAddToCart(p, 1, sku)}
                    onBuyNow={(p, sku) => {
                      handleAddToCart(p, 1, sku);
                      setIsCheckoutOpen(true);
                    }}
                    onQuickView={(p) => setDetailProduct(p)}
                  />
                ))}
              </div>
            )}

          </div>
        )}

      </main>

      {/* 3. Global Footer */}
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-16 pt-12 pb-8" id="ecom-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Top Value Assurance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Free Express Shipping</h4>
                <p className="text-[11px] text-slate-400">On all orders exceeding $150</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">2-Year Full Warranty</h4>
                <p className="text-[11px] text-slate-400">Certified genuine hardware</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">30-Day Hassle Returns</h4>
                <p className="text-[11px] text-slate-400">Instant prepaid return labels</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Secure PCI Payments</h4>
                <p className="text-[11px] text-slate-400">256-bit SSL encrypted checkout</p>
              </div>
            </div>
          </div>

          {/* Links & Newsletter */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-xs">
            <div className="md:col-span-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">
                  N
                </div>
                <span className="text-base font-black text-white tracking-tight">NEXUS STOREFRONT</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                The unified digital storefront for high-end consumer technology, precision accessories, and workplace ergonomics. Seamlessly connected to the Nexus POS Cloud Engine.
              </p>
            </div>

            <div className="md:col-span-2 space-y-2">
              <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">Quick Catalog</h5>
              <ul className="space-y-1.5 text-slate-400">
                <li><button onClick={() => { setActiveTab('catalog'); setFilters(p => ({ ...p, category: 'Electronics' })); }} className="hover:text-white">Electronics</button></li>
                <li><button onClick={() => { setActiveTab('catalog'); setFilters(p => ({ ...p, category: 'Wearables' })); }} className="hover:text-white">Wearables</button></li>
                <li><button onClick={() => { setActiveTab('catalog'); setFilters(p => ({ ...p, category: 'Furniture' })); }} className="hover:text-white">Ergonomics</button></li>
                <li><button onClick={() => { setActiveTab('catalog'); setFilters(p => ({ ...p, category: 'Apparel' })); }} className="hover:text-white">Apparel</button></li>
              </ul>
            </div>

            <div className="md:col-span-2 space-y-2">
              <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">Customer Care</h5>
              <ul className="space-y-1.5 text-slate-400">
                <li><button onClick={() => setIsAccountOpen(true)} className="hover:text-white">Track Order</button></li>
                <li><button onClick={() => setIsAccountOpen(true)} className="hover:text-white">Member Rewards</button></li>
                <li><a href="#help" className="hover:text-white">Shipping Policy</a></li>
                <li><a href="#help" className="hover:text-white">Privacy Terms</a></li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-3">
              <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">VIP Insider Perks</h5>
              <p className="text-slate-400 text-[11px]">
                Subscribe for private warehouse sales, early coupon drops, and hardware releases.
              </p>
              <form onSubmit={(e) => { e.preventDefault(); alert('Subscribed to VIP Newsletter!'); }} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="Enter email address"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Join
                </button>
              </form>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} Nexus POS-Commerce. All rights reserved.</p>
            {onSwitchToAdmin && (
              <button
                type="button"
                onClick={onSwitchToAdmin}
                className="text-slate-400 hover:text-indigo-400 font-bold underline cursor-pointer"
              >
                Switch to POS/Admin Back-Office
              </button>
            )}
          </div>

        </div>
      </footer>

      {/* 4. Product Detail Modal */}
      {detailProduct && (
        <ECommerceProductDetailModal
          product={detailProduct}
          isOpen={Boolean(detailProduct)}
          onClose={() => setDetailProduct(null)}
          isInWishlist={wishlist.some(w => w.id === detailProduct.id)}
          onToggleWishlist={handleToggleWishlist}
          onAddToCart={(p, qty, sku) => handleAddToCart(p, qty, sku)}
          onBuyNow={(p, qty, sku) => {
            handleAddToCart(p, qty, sku);
            setDetailProduct(null);
            setIsCheckoutOpen(true);
          }}
          relatedProducts={products.filter(p => p.category === detailProduct.category && p.id !== detailProduct.id).slice(0, 4)}
          onOpenProduct={(prod) => setDetailProduct(prod)}
          onAddReview={(productId, review) => {
            setDetailProduct(prev => {
              if (!prev || prev.id !== productId) return prev;
              const newReviews = [{ id: `rev-${Date.now()}`, date: new Date().toLocaleDateString(), ...review }, ...(prev.reviews || [])];
              const newRating = Number((newReviews.reduce((sum, r) => sum + r.rating, 0) / newReviews.length).toFixed(1));
              return {
                ...prev,
                reviews: newReviews,
                rating: newRating,
                reviewCount: newReviews.length
              };
            });
          }}
        />
      )}

      {/* 5. Cart Drawer */}
      <ECommerceCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
        couponError={couponError}
        activeCustomer={activeCustomer}
        useLoyaltyPoints={useLoyaltyPoints}
        onToggleLoyaltyPoints={setUseLoyaltyPoints}
      />

      {/* 6. Wishlist Drawer */}
      <ECommerceWishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlist={wishlist}
        onRemoveWishlist={handleToggleWishlist}
        onAddToCart={(prod) => handleAddToCart(prod, 1)}
        onMoveAllToCart={handleMoveAllWishlistToCart}
        onOpenProduct={(prod) => setDetailProduct(prod)}
      />

      {/* 7. Customer Account & Order History Portal */}
      <ECommerceCustomerAccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        activeCustomer={activeCustomer}
        customers={customers}
        onSelectCustomer={handleSelectCustomer}
        onRegisterCustomer={handleRegisterNewCustomer}
        customerOrders={storeOrders}
      />

      {/* 8. Checkout Modal */}
      <ECommerceCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        appliedCoupon={appliedCoupon}
        activeCustomer={activeCustomer}
        useLoyaltyPoints={useLoyaltyPoints}
        onOrderCompleted={handleOrderCompleted}
        customers={customers}
        onSelectCustomer={handleSelectCustomer}
      />

    </div>
  );
}
