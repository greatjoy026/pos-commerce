import React, { useState, useMemo } from 'react';
import { Product, Order, AuditLog, Customer } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { 
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, 
  BarChart, Bar, Cell, PieChart, Pie, Legend, CartesianGrid
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, Users, Package, ShoppingBag, 
  Clock, DollarSign, ArrowUpRight, Activity, Calendar, Download,
  RefreshCw, CheckCircle2, ChevronRight, ChevronDown, Zap, Bell, ArrowRight,
  Layers, BarChart3, Sparkles, Plus, Check, ShieldAlert, Sliders,
  X, AlertCircle, Volume2, VolumeX, Eye
} from 'lucide-react';

interface DashboardOverviewProps {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  auditLogs: AuditLog[];
  onQuickReorder: (productId: string, amount: number) => void;
  onNavigateToTab: (tabId: string) => void;
}

export default function DashboardOverview({
  products,
  orders,
  customers,
  auditLogs,
  onQuickReorder,
  onNavigateToTab
}: DashboardOverviewProps) {
  const { formatAmount, currentCurrency } = useCurrency();
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d' | 'all'>('7d');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders' | 'avgOrder'>('revenue');
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [recentlyReorderedIds, setRecentlyReorderedIds] = useState<{ [key: string]: boolean }>({});
  
  // Configurable Stock Alert Threshold State
  const [thresholdMode, setThresholdMode] = useState<'custom' | 'reorderPoint'>('custom');
  const [customThreshold, setCustomThreshold] = useState<number>(10);
  const [isToastDismissed, setIsToastDismissed] = useState<boolean>(false);
  const [showThresholdConfig, setShowThresholdConfig] = useState<boolean>(false);
  const [reorderAmountBatch, setReorderAmountBatch] = useState<number>(50);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefreshTelemetry = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Compute low stock items based on configurable threshold
  const lowStockItems = useMemo(() => {
    return products.filter(p => {
      const limit = thresholdMode === 'custom' ? customThreshold : p.reorderPoint;
      return p.stock <= limit;
    });
  }, [products, thresholdMode, customThreshold]);

  // Out of stock items (0 stock)
  const outOfStockItems = useMemo(() => {
    return products.filter(p => p.stock === 0);
  }, [products]);

  // Overall Financial Metrics from Orders
  const completedOrders = useMemo(() => {
    return orders.filter(o => o.status === 'Completed');
  }, [orders]);

  const totalRevenue = useMemo(() => {
    return completedOrders.reduce((sum, o) => sum + o.total, 0);
  }, [completedOrders]);

  const totalStockValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  }, [products]);

  const averageOrderValue = useMemo(() => {
    if (completedOrders.length === 0) return 0;
    return totalRevenue / completedOrders.length;
  }, [completedOrders, totalRevenue]);

  // Handle single product quick restock with feedback
  const handleSingleReorder = (productId: string, amount: number) => {
    onQuickReorder(productId, amount);
    setRecentlyReorderedIds(prev => ({ ...prev, [productId]: true }));
    setTimeout(() => {
      setRecentlyReorderedIds(prev => ({ ...prev, [productId]: false }));
    }, 2500);
  };

  // Handle batch reorder of all low stock products
  const handleReorderAllLowStock = () => {
    if (lowStockItems.length === 0) return;
    lowStockItems.forEach(item => {
      onQuickReorder(item.id, reorderAmountBatch);
      setRecentlyReorderedIds(prev => ({ ...prev, [item.id]: true }));
    });
    setTimeout(() => {
      setRecentlyReorderedIds({});
    }, 3000);
  };

  // Process Daily Sales Trend Line Graph Data from live orders state
  const salesTrendData = useMemo(() => {
    const dailyMap: { [key: string]: { revenue: number; orderCount: number; rawDate: Date } } = {};
    
    // Sort orders by timestamp ascending
    const sortedOrders = [...completedOrders].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedOrders.forEach(order => {
      const orderDate = new Date(order.date);
      // Normalized date key
      const key = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!dailyMap[key]) {
        dailyMap[key] = { revenue: 0, orderCount: 0, rawDate: orderDate };
      }
      dailyMap[key].revenue += order.total;
      dailyMap[key].orderCount += 1;
    });

    // Convert to chart array
    let chartPoints = Object.keys(dailyMap).map(key => {
      const rev = dailyMap[key].revenue;
      const count = dailyMap[key].orderCount;
      return {
        date: key,
        Revenue: parseFloat(rev.toFixed(2)),
        Orders: count,
        AvgOrder: parseFloat((rev / (count || 1)).toFixed(2)),
        rawDate: dailyMap[key].rawDate
      };
    });

    // If there are few orders or single day, generate date points so chart looks continuous
    if (chartPoints.length === 0) {
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const k = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        chartPoints.push({
          date: k,
          Revenue: 0,
          Orders: 0,
          AvgOrder: 0,
          rawDate: d
        });
      }
    }

    // Filter by timeRange
    if (timeRange === '7d') {
      chartPoints = chartPoints.slice(-7);
    } else if (timeRange === '14d') {
      chartPoints = chartPoints.slice(-14);
    } else if (timeRange === '30d') {
      chartPoints = chartPoints.slice(-30);
    }

    return chartPoints;
  }, [completedOrders, timeRange]);

  // Compute Trend Highlights
  const trendStats = useMemo(() => {
    if (salesTrendData.length === 0) {
      return { total: 0, avgDaily: 0, peakDay: { date: 'N/A', revenue: 0 }, totalOrders: 0 };
    }
    const total = salesTrendData.reduce((sum, d) => sum + d.Revenue, 0);
    const totalOrders = salesTrendData.reduce((sum, d) => sum + d.Orders, 0);
    const avgDaily = total / salesTrendData.length;
    let peakDay = salesTrendData[0];
    salesTrendData.forEach(d => {
      if (d.Revenue > peakDay.Revenue) peakDay = d;
    });
    return {
      total,
      avgDaily,
      peakDay,
      totalOrders
    };
  }, [salesTrendData]);

  // Process Category-based Revenue Pie Chart Data
  const categoryPieData = useMemo(() => {
    const categoryTotals: { [key: string]: { revenue: number; unitsSold: number } } = {};

    completedOrders.forEach(order => {
      order.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const catName = prod ? prod.category : 'Uncategorized';
        
        if (!categoryTotals[catName]) {
          categoryTotals[catName] = { revenue: 0, unitsSold: 0 };
        }
        categoryTotals[catName].revenue += (item.price * item.quantity);
        categoryTotals[catName].unitsSold += item.quantity;
      });
    });

    const totalCatRevenue = Object.values(categoryTotals).reduce((sum, v) => sum + v.revenue, 0) || 1;

    const data = Object.keys(categoryTotals).map(catName => ({
      name: catName,
      value: parseFloat(categoryTotals[catName].revenue.toFixed(2)),
      units: categoryTotals[catName].unitsSold,
      percentage: parseFloat(((categoryTotals[catName].revenue / totalCatRevenue) * 100).toFixed(1))
    })).sort((a, b) => b.value - a.value);

    return data;
  }, [completedOrders, products]);

  // Refined color palette for charts
  const PIE_COLORS = [
    '#4F46E5', // Indigo 600
    '#059669', // Emerald 600
    '#D97706', // Amber 600
    '#2563EB', // Blue 600
    '#7C3AED', // Violet 600
    '#DB2777', // Pink 600
    '#0891B2'  // Cyan 600
  ];

  // Channel Breakdown
  const channelBreakdownData = useMemo(() => {
    const channelMap: { [key: string]: number } = {
      'Online Storefront': 0,
      'In-Store POS': 0,
      'Mobile App': 0
    };
    completedOrders.forEach(order => {
      if (channelMap[order.channel] !== undefined) {
        channelMap[order.channel] += order.total;
      }
    });

    return Object.keys(channelMap).map(channel => ({
      name: channel,
      Revenue: parseFloat(channelMap[channel].toFixed(2))
    }));
  }, [completedOrders]);

  return (
    <div className="space-y-6 relative" id="dashboard-overview-container">
      
      {/* ========================================================================= */}
      {/* 1. FLOATING TOAST NOTIFICATION FOR LOW STOCK ALERT                        */}
      {/* ========================================================================= */}
      {lowStockItems.length > 0 && !isToastDismissed && (
        <div 
          className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-[92vw] sm:w-auto bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-rose-500/40 animate-in slide-in-from-top-4 duration-300"
          id="stock-alert-toast"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl shrink-0 mt-0.5 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm text-rose-300">
                    Stock Depletion Alert
                  </span>
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-mono font-bold rounded-full">
                    {lowStockItems.length} {lowStockItems.length === 1 ? 'Item' : 'Items'}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {lowStockItems.length === 1 ? (
                    <span><strong>{lowStockItems[0].name}</strong> has only <strong>{lowStockItems[0].stock}</strong> units remaining.</span>
                  ) : (
                    <span>{lowStockItems.length} catalog products dropped below the <strong>{thresholdMode === 'custom' ? `${customThreshold} units` : 'reorder point'}</strong> threshold.</span>
                  )}
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={handleReorderAllLowStock}
                    className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                    id="toast-btn-restock-all"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Restock All (+{reorderAmountBatch})</span>
                  </button>
                  <button
                    onClick={() => {
                      const el = document.getElementById('realtime-low-stock-banner');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            </div>

            {/* Dismiss Toast Button */}
            <button
              onClick={() => setIsToastDismissed(true)}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all shrink-0"
              title="Dismiss toast"
              id="toast-btn-dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CONFIGURABLE THRESHOLD & HIGHLIGHTED VISUAL ALERT BANNER                */}
      {/* ========================================================================= */}
      <div 
        className={`relative overflow-hidden rounded-2xl border transition-all ${
          lowStockItems.length > 0 
            ? 'border-amber-200/90 bg-gradient-to-b from-amber-50/80 via-white to-amber-50/30 shadow-xs' 
            : 'border-emerald-200/70 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/20 shadow-xs'
        }`}
        id="realtime-low-stock-banner"
      >
        {/* Accent top stripe */}
        <div className={`h-1.5 w-full ${lowStockItems.length > 0 ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600' : 'bg-emerald-500'}`} />

        <div className="p-4 sm:p-5 space-y-4">
          
          {/* Main Alert Header Row */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                {lowStockItems.length > 0 ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-600 text-white shadow-xs animate-pulse" id="low-stock-badge-indicator">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      INVENTORY ALERT: {lowStockItems.length} LOW STOCK
                    </span>
                    {outOfStockItems.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-rose-300 border border-rose-500/30">
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                        {outOfStockItems.length} OUT OF STOCK
                      </span>
                    )}
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs" id="nominal-stock-badge-indicator">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ALL INVENTORY LEVELS HEALTHY
                  </span>
                )}

                {/* Toast status button if user dismissed it */}
                {lowStockItems.length > 0 && isToastDismissed && (
                  <button
                    onClick={() => setIsToastDismissed(false)}
                    className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 underline"
                  >
                    <Bell className="w-3 h-3" /> Re-open Toast
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-600">
                {lowStockItems.length > 0 ? (
                  <span>
                    Products configured below threshold limit (<strong>{thresholdMode === 'custom' ? `≤ ${customThreshold} units` : 'per-product safety point'}</strong>). Reorder stock to prevent sales interruption.
                  </span>
                ) : (
                  <span>
                    All {products.length} catalog items are stocked safely above the active threshold.
                  </span>
                )}
              </p>
            </div>

            {/* Threshold Configurator & Batch Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
              
              {/* Toggle Configurator Drawer */}
              <button
                onClick={() => setShowThresholdConfig(!showThresholdConfig)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  showThresholdConfig
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-gray-200 shadow-xs'
                }`}
                id="btn-toggle-threshold-config"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                <span>Threshold: <strong>{thresholdMode === 'custom' ? `${customThreshold} units` : 'Reorder Point'}</strong></span>
              </button>

              {/* Master Batch Reorder Button */}
              {lowStockItems.length > 0 && (
                <button
                  onClick={handleReorderAllLowStock}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                  id="btn-reorder-all-low-stock"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Restock All ({lowStockItems.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CONFIGURABLE THRESHOLD TOOLBOX (SLIDER / PRESETS)                          */}
          {/* ========================================================================= */}
          {showThresholdConfig && (
            <div className="p-4 bg-white rounded-xl border border-indigo-100 shadow-sm space-y-3 animate-in fade-in duration-200" id="threshold-config-box">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    Configure Inventory Alert Trigger
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Adjust when the dashboard triggers low-stock badges, toast notifications, and supplier warnings.
                  </p>
                </div>

                {/* Mode Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setThresholdMode('custom')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      thresholdMode === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'text-gray-500 hover:text-slate-900'
                    }`}
                  >
                    Global Threshold
                  </button>
                  <button
                    onClick={() => setThresholdMode('reorderPoint')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      thresholdMode === 'reorderPoint' ? 'bg-white text-slate-900 shadow-xs' : 'text-gray-500 hover:text-slate-900'
                    }`}
                  >
                    Per-Product Reorder Point
                  </button>
                </div>
              </div>

              {thresholdMode === 'custom' && (
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Threshold Limit:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCustomThreshold(Math.max(1, customThreshold - 1))}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={customThreshold}
                        onChange={(e) => setCustomThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 px-2 py-1 text-center font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-indigo-600 font-mono"
                      />
                      <button
                        onClick={() => setCustomThreshold(customThreshold + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs text-gray-500">units</span>
                  </div>

                  {/* Preset chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-gray-400 font-semibold">Quick Presets:</span>
                    {[5, 10, 15, 20, 30].map(val => (
                      <button
                        key={val}
                        onClick={() => setCustomThreshold(val)}
                        className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold transition-all ${
                          customThreshold === val
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {val} units
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cards for each low-stock product with One-Click Reordering */}
          {lowStockItems.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 pt-1" id="low-stock-products-grid">
              {lowStockItems.map(prod => {
                const isReordered = recentlyReorderedIds[prod.id];
                const targetLimit = thresholdMode === 'custom' ? customThreshold : prod.reorderPoint;
                const stockRatio = Math.min(100, Math.round((prod.stock / (targetLimit || 1)) * 100));
                const isOut = prod.stock === 0;

                return (
                  <div 
                    key={prod.id}
                    className={`bg-white/95 p-3 sm:p-3.5 rounded-xl border shadow-xs flex flex-col justify-between space-y-2.5 sm:space-y-3 transition-all ${
                      isOut 
                        ? 'border-rose-300 ring-1 ring-rose-200' 
                        : 'border-amber-200/90 hover:border-amber-300'
                    }`}
                    id={`low-stock-item-${prod.id}`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate" title={prod.name}>
                          {prod.name}
                        </h4>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded shrink-0">
                          {prod.category}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-[10px] text-gray-400 truncate">SKU: {prod.sku}</span>
                        <span className={`font-bold font-mono px-1.5 py-0.2 rounded text-[10px] shrink-0 ${
                          isOut 
                            ? 'bg-rose-100 text-rose-800 animate-pulse' 
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {isOut ? 'OUT' : `${prod.stock}/${targetLimit}`}
                        </span>
                      </div>

                      {/* Mini Stock Visual Bar */}
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${isOut ? 'bg-rose-600' : 'bg-amber-500'}`}
                          style={{ width: `${Math.max(5, stockRatio)}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Restock Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSingleReorder(prod.id, 25)}
                        disabled={isReordered}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                          isReordered
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                        }`}
                        id={`btn-reorder-single-${prod.id}`}
                      >
                        {isReordered ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>Done</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>+25</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleSingleReorder(prod.id, 50)}
                        disabled={isReordered}
                        className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 transition-all shrink-0"
                        title="Restock +50 units"
                        id={`btn-reorder-50-${prod.id}`}
                      >
                        +50
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Top Header & Range Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5" id="dash-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="dash-title">Command Center</h1>
          <p className="text-sm text-gray-500 mt-1" id="dash-desc">Real-time enterprise metrics, sales velocity trends, and category performance analytics.</p>
        </div>

        {/* Days Filter, Report, and Refresh buttons all in the SAME ROW on mobile/tablet/desktop */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0" id="dash-header-actions-row">
          
          {/* Days Filter Drop-down menu */}
          <div className="relative inline-flex items-center" id="dash-time-dropdown-container">
            <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-gray-200 hover:border-slate-300 rounded-xl shadow-2xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer appearance-none"
              id="dash-time-range-dropdown"
              aria-label="Select Days Range"
            >
              <option value="7d">Last 7 Days</option>
              <option value="14d">Last 14 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All History</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>

          {/* Report Button */}
          <button
            type="button"
            onClick={() => onNavigateToTab('Reports')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-gray-200 text-slate-800 text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 whitespace-nowrap active:scale-95"
            id="dash-btn-report"
            title="Open Analytics & Performance Reports"
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Report</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefreshTelemetry}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 whitespace-nowrap"
            id="dash-btn-refresh"
            title="Refresh Command Center Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </button>

        </div>
      </div>

      {/* Grid of Key Metrics with Highlighted Badges (2 columns per row on mobile/tablet) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5" id="kpi-grid">
        
        {/* KPI 1: Gross Sales */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-slate-200 transition-all" id="kpi-card-revenue">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider block truncate">Gross Sales</span>
            <div className="text-lg sm:text-2xl font-bold text-slate-900 truncate">{formatAmount(totalRevenue)}</div>
            <div className="flex items-center gap-1 text-[11px] sm:text-xs text-emerald-600 font-medium truncate">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{completedOrders.length} orders</span>
            </div>
          </div>
          <div className="p-2 sm:p-3 bg-emerald-50 rounded-xl text-emerald-600 self-start sm:self-center shrink-0">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* KPI 2: Inventory Asset Value */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-slate-200 transition-all" id="kpi-card-inventory">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider block truncate">Asset Value</span>
            <div className="text-lg sm:text-2xl font-bold text-slate-900 truncate">{formatAmount(totalStockValue)}</div>
            <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 font-medium truncate">
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{products.reduce((acc, p) => acc + p.stock, 0)} units</span>
            </div>
          </div>
          <div className="p-2 sm:p-3 bg-indigo-50 rounded-xl text-indigo-600 self-start sm:self-center shrink-0">
            <Package className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* KPI 3: Stock Alert Status (Highlighted Visual Badge) */}
        <div 
          onClick={() => {
            const el = document.getElementById('realtime-low-stock-banner');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`p-3.5 sm:p-5 rounded-2xl shadow-xs border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all cursor-pointer ${
            lowStockItems.length > 0 
              ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300' 
              : 'bg-white border-gray-100 hover:border-slate-200'
          }`} 
          id="kpi-card-alerts"
        >
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">Stock Alerts</span>
              {lowStockItems.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              )}
            </div>
            <div className={`text-lg sm:text-2xl font-bold truncate ${lowStockItems.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {lowStockItems.length}
            </div>
            <div className={`flex items-center gap-1 text-[11px] sm:text-xs font-medium truncate ${lowStockItems.length > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{lowStockItems.length > 0 ? `${lowStockItems.length} items low` : 'All healthy'}</span>
            </div>
          </div>
          <div className={`p-2 sm:p-3 rounded-xl self-start sm:self-center shrink-0 ${lowStockItems.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* KPI 4: Average Order Value */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-slate-200 transition-all" id="kpi-card-crm">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider block truncate">Avg Order</span>
            <div className="text-lg sm:text-2xl font-bold text-slate-900 truncate">{formatAmount(averageOrderValue)}</div>
            <div className="flex items-center gap-1 text-[11px] sm:text-xs text-indigo-600 font-medium truncate">
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{customers.length} clients</span>
            </div>
          </div>
          <div className="p-2 sm:p-3 bg-blue-50 rounded-xl text-blue-600 self-start sm:self-center shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DATA VISUALIZATION MODULE (RECHARTS LINE & PIE CHARTS)                */}
      {/* ========================================================================= */}
      <div className="space-y-6" id="data-visualization-module">
        
        {/* Main Grid: Daily Sales Trend Line Graph + Category Revenue Pie Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* A. RECHARTS DAILY REVENUE TRENDS LINE GRAPH (7 Cols on LG) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-xs border border-gray-100 space-y-4" id="sales-trend-graph-card">
            
            {/* Header & Metric Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Daily Revenue Trends & Sales Velocity
                  </h2>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase">
                    Live Telemetry
                  </span>
                </div>
                <p className="text-xs text-gray-400">Day-by-day revenue growth and transaction volume computed from order ledger</p>
              </div>

              {/* Metric Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs" id="trend-metric-toggle">
                <button
                  onClick={() => setChartMetric('revenue')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    chartMetric === 'revenue' 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-gray-500 hover:text-slate-900'
                  }`}
                  id="btn-metric-revenue"
                >
                  Revenue ({currentCurrency.symbol})
                </button>
                <button
                  onClick={() => setChartMetric('orders')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    chartMetric === 'orders' 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-gray-500 hover:text-slate-900'
                  }`}
                  id="btn-metric-orders"
                >
                  Orders (#)
                </button>
                <button
                  onClick={() => setChartMetric('avgOrder')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    chartMetric === 'avgOrder' 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-gray-500 hover:text-slate-900'
                  }`}
                  id="btn-metric-avg"
                >
                  Avg Ticket
                </button>
              </div>
            </div>

            {/* Quick KPI stats strip */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-gray-100 text-xs" id="trend-stats-strip">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Period Revenue</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{formatAmount(trendStats.total)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Avg Daily Sales</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">{formatAmount(trendStats.avgDaily)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Peak Day Velocity</span>
                <span className="font-bold text-indigo-700 font-mono text-sm">{trendStats.peakDay.date}</span>
              </div>
            </div>

            {/* Recharts Area / Line Graph Container */}
            <div className="h-[290px]" id="line-chart-container">
              {salesTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrendData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D97706" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }} 
                      tickLine={false} 
                      axisLine={{ stroke: '#E2E8F0' }} 
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#94A3B8' }} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => {
                        if (chartMetric === 'orders') return `${val}`;
                        return formatAmount(val, { compact: true });
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0F172A', 
                        borderRadius: '12px', 
                        border: '1px solid #334155', 
                        color: '#F8FAFC',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' 
                      }}
                      labelStyle={{ fontWeight: 'bold', fontSize: '12px', color: '#CBD5E1', marginBottom: '4px' }}
                      formatter={(val: any, name: any) => [
                        name === 'Revenue' || name === 'AvgOrder' ? formatAmount(Number(val)) : `${val} orders`,
                        name === 'Revenue' ? 'Daily Revenue' : name === 'AvgOrder' ? 'Average Ticket' : 'Transactions'
                      ]}
                    />
                    
                    {chartMetric === 'revenue' && (
                      <Area 
                        type="monotone" 
                        dataKey="Revenue" 
                        stroke="#059669" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)"
                        dot={{ r: 4, fill: '#059669', stroke: '#FFFFFF', strokeWidth: 2 }}
                        activeDot={{ r: 7, fill: '#047857', stroke: '#FFFFFF', strokeWidth: 3 }}
                      />
                    )}

                    {chartMetric === 'orders' && (
                      <Area 
                        type="monotone" 
                        dataKey="Orders" 
                        stroke="#4F46E5" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorOrders)"
                        dot={{ r: 4, fill: '#4F46E5', stroke: '#FFFFFF', strokeWidth: 2 }}
                        activeDot={{ r: 7, fill: '#4338CA', stroke: '#FFFFFF', strokeWidth: 3 }}
                      />
                    )}

                    {chartMetric === 'avgOrder' && (
                      <Area 
                        type="monotone" 
                        dataKey="AvgOrder" 
                        stroke="#D97706" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorAvg)"
                        dot={{ r: 4, fill: '#D97706', stroke: '#FFFFFF', strokeWidth: 2 }}
                        activeDot={{ r: 7, fill: '#B45309', stroke: '#FFFFFF', strokeWidth: 3 }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                  No sales transactions logged for the selected period.
                </div>
              )}
            </div>
          </div>

          {/* B. CATEGORY-BASED REVENUE PIE CHART (5 Cols on LG) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-xs border border-gray-100 space-y-4" id="category-pie-chart-card">
            
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Category Revenue Distribution
                </h2>
                <span className="text-[10px] font-bold text-gray-400 font-mono uppercase">
                  {categoryPieData.length} Categories
                </span>
              </div>
              <p className="text-xs text-gray-400">Share of total sales revenue by product classification</p>
            </div>

            {/* Recharts Pie Chart & Breakdown container */}
            <div className="h-[210px]" id="pie-chart-container">
              {categoryPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      onMouseEnter={(_, index) => setActivePieIndex(index)}
                      onMouseLeave={() => setActivePieIndex(null)}
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={PIE_COLORS[index % PIE_COLORS.length]} 
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0F172A', 
                        borderRadius: '12px', 
                        border: '1px solid #334155', 
                        color: '#F8FAFC' 
                      }}
                      formatter={(val: any, name: any) => [
                        formatAmount(Number(val)),
                        `${name}`
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                  No category sales recorded yet.
                </div>
              )}
            </div>

            {/* Category breakdown item list with progress bars */}
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 text-xs no-scrollbar" id="category-items-legend">
              {categoryPieData.map((cat, idx) => (
                <div 
                  key={cat.name} 
                  className={`p-2 rounded-xl border transition-all flex items-center justify-between ${
                    activePieIndex === idx ? 'bg-slate-50 border-slate-300 shadow-xs' : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="font-semibold text-slate-800 truncate max-w-[120px]">{cat.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 font-mono text-[10px]">{cat.units} sold</span>
                    <span className="font-bold text-slate-900 font-mono">{formatAmount(cat.value)}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[10px]">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Channel Breakdown & Top Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="secondary-analytics-grid">
          
          {/* Channel Sales Bar Chart */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 space-y-4" id="channel-performance-card">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-slate-900">Sales Channel Breakdown</h3>
              <p className="text-xs text-gray-400">Revenue split across Point of Sale, Online, and Mobile</p>
            </div>

            <div className="h-[220px]" id="bar-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatAmount(v, { compact: true })} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff' }}
                    formatter={(val: any) => [formatAmount(Number(val)), 'Revenue']}
                  />
                  <Bar dataKey="Revenue" radius={[8, 8, 0, 0]}>
                    {channelBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Moving Products by Velocity */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 space-y-4" id="top-moving-products-card">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-slate-900">Top Moving Catalog Items</h3>
              <p className="text-xs text-gray-400">Ranked by historical volume and sales velocity</p>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 no-scrollbar" id="top-products-list">
              {[...products].sort((a, b) => b.salesCount - a.salesCount).slice(0, 4).map((p, rank) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-slate-50/70 rounded-xl border border-gray-100 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center font-mono">
                      #{rank + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-slate-900 truncate max-w-[130px]">{p.name}</h4>
                      <span className="text-[10px] text-gray-400 font-mono">SKU: {p.sku}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block font-mono">{p.salesCount} sold</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">{formatAmount(p.salesCount * p.price)} vol</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Telemetry & Audit Logs */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 space-y-4 flex flex-col justify-between" id="telemetry-logs-card">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-slate-900">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold">Security & Audit Trail</h3>
                </div>
                <p className="text-xs text-gray-400">Live operational ledger</p>
              </div>
              <button 
                onClick={() => onNavigateToTab('Security')} 
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-all flex items-center gap-0.5"
                id="btn-goto-security"
              >
                Ledger <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 no-scrollbar" id="log-feed-container">
              {auditLogs.slice(0, 5).map((log, index) => (
                <div key={log.id || index} className="p-2.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-start text-xs transition-all" id={`audit-log-item-${log.id}`}>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800">{log.staffName}</span>
                      <span className="px-1.5 py-0.2 bg-slate-200/80 rounded text-[9px] text-slate-600 font-mono font-bold uppercase">{log.role}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-tight">{log.details}</p>
                  </div>
                  <div className="text-[9px] text-gray-400 font-mono text-right flex flex-col items-end flex-shrink-0">
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
