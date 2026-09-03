import React from 'react';
import { 
  Package, ShoppingCart, DollarSign, 
  TrendingUp, AlertTriangle, XCircle, Clock, Zap, 
  ArrowDownRight, RefreshCw, ClipboardCheck, CalendarClock,
  Calendar, BarChart, CalendarDays, Tag, Grid, Users, 
  Building2, CreditCard, Globe, PieChart, Percent, FileText, 
  Receipt, Landmark, ShieldAlert, ArrowUpRight
} from 'lucide-react';
import { 
  ReportCategory, 
  InventoryReportSubTab, 
  SalesReportSubTab, 
  FinancialReportSubTab 
} from '../../types';

interface ReportsNavProps {
  activeCategory: ReportCategory;
  onSelectCategory: (cat: ReportCategory) => void;
  inventorySubTab: InventoryReportSubTab;
  onSelectInventorySubTab: (tab: InventoryReportSubTab) => void;
  salesSubTab: SalesReportSubTab;
  onSelectSalesSubTab: (tab: SalesReportSubTab) => void;
  financialSubTab: FinancialReportSubTab;
  onSelectFinancialSubTab: (tab: FinancialReportSubTab) => void;
  counts: {
    lowStock: number;
    outOfStock: number;
    deadStock: number;
    expiring: number;
    outstanding: number;
    refunds: number;
  };
}

export const INVENTORY_REPORTS = [
  { id: 'valuation' as InventoryReportSubTab, label: 'Stock Valuation', icon: DollarSign, badge: null },
  { id: 'low_stock' as InventoryReportSubTab, label: 'Low Stock', icon: AlertTriangle, badge: 'lowStock', badgeColor: 'bg-amber-500 text-white' },
  { id: 'out_of_stock' as InventoryReportSubTab, label: 'Out of Stock', icon: XCircle, badge: 'outOfStock', badgeColor: 'bg-rose-600 text-white' },
  { id: 'dead_stock' as InventoryReportSubTab, label: 'Dead Stock', icon: Clock, badge: 'deadStock', badgeColor: 'bg-slate-600 text-white' },
  { id: 'fast_moving' as InventoryReportSubTab, label: 'Fast-Moving', icon: Zap, badge: 'Hot' },
  { id: 'slow_moving' as InventoryReportSubTab, label: 'Slow-Moving', icon: ArrowDownRight, badge: null },
  { id: 'stock_movement' as InventoryReportSubTab, label: 'Stock Movement', icon: RefreshCw, badge: 'Ledger' },
  { id: 'stock_adjustments' as InventoryReportSubTab, label: 'Stock Adjustments', icon: ClipboardCheck, badge: 'Audit' },
  { id: 'expiring_products' as InventoryReportSubTab, label: 'Expiring Products', icon: CalendarClock, badge: 'expiring', badgeColor: 'bg-rose-500 text-white' }
];

export const SALES_REPORTS = [
  { id: 'daily' as SalesReportSubTab, label: 'Daily Sales', icon: Calendar, badge: 'Hourly' },
  { id: 'weekly' as SalesReportSubTab, label: 'Weekly Sales', icon: BarChart, badge: null },
  { id: 'monthly' as SalesReportSubTab, label: 'Monthly Sales', icon: CalendarDays, badge: 'MoM' },
  { id: 'by_product' as SalesReportSubTab, label: 'Sales by Product', icon: Tag, badge: null },
  { id: 'by_category' as SalesReportSubTab, label: 'Sales by Category', icon: Grid, badge: null },
  { id: 'by_cashier' as SalesReportSubTab, label: 'Sales by Cashier', icon: Users, badge: 'Staff' },
  { id: 'by_branch' as SalesReportSubTab, label: 'Sales by Branch', icon: Building2, badge: 'Locations' },
  { id: 'by_payment_method' as SalesReportSubTab, label: 'Payment Methods', icon: CreditCard, badge: null },
  { id: 'online_vs_pos' as SalesReportSubTab, label: 'Online vs POS', icon: Globe, badge: 'Omnichannel' }
];

export const FINANCIAL_REPORTS = [
  { id: 'executive_summary' as FinancialReportSubTab, label: 'Executive P&L Summary', icon: PieChart, badge: 'Key' },
  { id: 'revenue' as FinancialReportSubTab, label: 'Revenue Deep Dive', icon: TrendingUp, badge: null },
  { id: 'gross_profit' as FinancialReportSubTab, label: 'Gross Profit & Margins', icon: Percent, badge: null },
  { id: 'cogs' as FinancialReportSubTab, label: 'COGS (Cost of Goods)', icon: DollarSign, badge: null },
  { id: 'discounts' as FinancialReportSubTab, label: 'Discounts & Promos', icon: Tag, badge: null },
  { id: 'refunds' as FinancialReportSubTab, label: 'Refunds & Returns', icon: ArrowUpRight, badge: 'refunds', badgeColor: 'bg-rose-500 text-white' },
  { id: 'tax' as FinancialReportSubTab, label: 'Tax & VAT Collection', icon: Receipt, badge: 'Audit' },
  { id: 'outstanding_payments' as FinancialReportSubTab, label: 'Outstanding Payments', icon: Landmark, badge: 'outstanding', badgeColor: 'bg-amber-600 text-white' }
];

export default function ReportsNav({
  activeCategory,
  onSelectCategory,
  inventorySubTab,
  onSelectInventorySubTab,
  salesSubTab,
  onSelectSalesSubTab,
  financialSubTab,
  onSelectFinancialSubTab,
  counts
}: ReportsNavProps) {
  
  const getSubBadgeCount = (badgeKey: string | null) => {
    if (!badgeKey) return null;
    if (badgeKey === 'lowStock') return counts.lowStock;
    if (badgeKey === 'outOfStock') return counts.outOfStock;
    if (badgeKey === 'deadStock') return counts.deadStock;
    if (badgeKey === 'expiring') return counts.expiring;
    if (badgeKey === 'outstanding') return counts.outstanding;
    if (badgeKey === 'refunds') return counts.refunds;
    return badgeKey; // String literal badge
  };

  return (
    <div className="space-y-2.5 sm:space-y-3" id="reports-navigation-root">
      
      {/* 1. Primary Category Selector (Inventory, Sales, Financial) */}
      <div className="bg-white rounded-2xl p-1 sm:p-1.5 border border-slate-200/80 shadow-2xs grid grid-cols-3 gap-1 sm:gap-1.5">
        
        {/* Inventory Category Button */}
        <button
          type="button"
          onClick={() => onSelectCategory('inventory')}
          className={`px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none ${
            activeCategory === 'inventory'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
          id="report-tab-inventory"
        >
          <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">
            <span className="inline sm:hidden">Inventory</span>
            <span className="hidden sm:inline">Inventory Reports</span>
          </span>
          <span className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono shrink-0 ${
            activeCategory === 'inventory' ? 'bg-indigo-700/80 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            9
          </span>
        </button>

        {/* Sales Category Button */}
        <button
          type="button"
          onClick={() => onSelectCategory('sales')}
          className={`px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none ${
            activeCategory === 'sales'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
          id="report-tab-sales"
        >
          <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">
            <span className="inline sm:hidden">Sales</span>
            <span className="hidden sm:inline">Sales Reports</span>
          </span>
          <span className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono shrink-0 ${
            activeCategory === 'sales' ? 'bg-indigo-700/80 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            9
          </span>
        </button>

        {/* Financial Category Button */}
        <button
          type="button"
          onClick={() => onSelectCategory('financial')}
          className={`px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none ${
            activeCategory === 'financial'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
          id="report-tab-financial"
        >
          <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">
            <span className="inline sm:hidden">Financial</span>
            <span className="hidden sm:inline">Financial Reports</span>
          </span>
          <span className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono shrink-0 ${
            activeCategory === 'financial' ? 'bg-indigo-700/80 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            8
          </span>
        </button>

      </div>

      {/* 2. Sub-Report Horizontal Carousel Ribbon - Edge-to-edge scroll on mobile */}
      <div className="bg-slate-100/80 p-1 sm:p-1.5 rounded-2xl border border-slate-200/60 overflow-x-auto no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-1.5">
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-max">
          
          {/* Active: Inventory Subtabs */}
          {activeCategory === 'inventory' && INVENTORY_REPORTS.map(sub => {
            const isActive = inventorySubTab === sub.id;
            const Icon = sub.icon;
            const badgeVal = getSubBadgeCount(sub.badge);
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSelectInventorySubTab(sub.id)}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                }`}
                id={`subtab-inventory-${sub.id}`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{sub.label}</span>
                {badgeVal !== null && badgeVal !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono font-bold shrink-0 ${
                    typeof badgeVal === 'number' && badgeVal > 0 && sub.badgeColor
                      ? sub.badgeColor
                      : 'bg-slate-200/80 text-slate-700'
                  }`}>
                    {badgeVal}
                  </span>
                )}
              </button>
            );
          })}

          {/* Active: Sales Subtabs */}
          {activeCategory === 'sales' && SALES_REPORTS.map(sub => {
            const isActive = salesSubTab === sub.id;
            const Icon = sub.icon;
            const badgeVal = getSubBadgeCount(sub.badge);
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSelectSalesSubTab(sub.id)}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                }`}
                id={`subtab-sales-${sub.id}`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{sub.label}</span>
                {badgeVal && (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono font-bold bg-slate-200/80 text-slate-700 shrink-0">
                    {badgeVal}
                  </span>
                )}
              </button>
            );
          })}

          {/* Active: Financial Subtabs */}
          {activeCategory === 'financial' && FINANCIAL_REPORTS.map(sub => {
            const isActive = financialSubTab === sub.id;
            const Icon = sub.icon;
            const badgeVal = getSubBadgeCount(sub.badge);
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSelectFinancialSubTab(sub.id)}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                }`}
                id={`subtab-financial-${sub.id}`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{sub.label}</span>
                {badgeVal !== null && badgeVal !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono font-bold shrink-0 ${
                    typeof badgeVal === 'number' && badgeVal > 0 && sub.badgeColor
                      ? sub.badgeColor
                      : 'bg-slate-200/80 text-slate-700'
                  }`}>
                    {badgeVal}
                  </span>
                )}
              </button>
            );
          })}

        </div>
      </div>

    </div>
  );
}
