import React, { useState } from 'react';
import { 
  LayoutDashboard, Package, Smartphone, ShieldCheck, 
  Users, FileText, ShoppingBag, Terminal, Network, WifiOff, 
  ChevronLeft, ChevronRight, Coins, Database, RefreshCw, 
  CheckCircle2, AlertCircle, Sparkles, X, Menu, Settings,
  BarChart3
} from 'lucide-react';
import { StaffMember } from '../types';
import { useCurrency } from '../context/CurrencyContext';

export type AdminSubTab = 'Dashboard' | 'Inventory' | 'POS' | 'CRM' | 'Invoices' | 'Reports' | 'Security' | 'Settings';

interface EnhancedSidebarProps {
  currentView: 'Admin' | 'ECommerce';
  onSwitchView: (view: 'Admin' | 'ECommerce') => void;
  adminSubTab: AdminSubTab;
  onSelectSubTab: (tab: AdminSubTab) => void;
  activeStaff: StaffMember;
  dbStatus: 'connected' | 'syncing' | 'offline' | 'error';
  lastSynced: string;
  onManualSync: () => void;
  lowStockCount: number;
  totalOrdersCount: number;
  totalCustomersCount: number;
  deviceOffline: boolean;
  onToggleOfflineSim: () => void;
  offlineOrderCount: number;
  onOpenCurrencyModal: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function EnhancedSidebar({
  currentView,
  onSwitchView,
  adminSubTab,
  onSelectSubTab,
  activeStaff,
  dbStatus,
  lastSynced,
  onManualSync,
  lowStockCount,
  totalOrdersCount,
  totalCustomersCount,
  deviceOffline,
  onToggleOfflineSim,
  offlineOrderCount,
  onOpenCurrencyModal,
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}: EnhancedSidebarProps) {
  const { currentCurrency } = useCurrency();
  const [isSyncingSpin, setIsSyncingSpin] = useState(false);

  const handleManualSyncClick = () => {
    setIsSyncingSpin(true);
    onManualSync();
    setTimeout(() => setIsSyncingSpin(false), 800);
  };

  const navItems = [
    {
      id: 'Dashboard' as AdminSubTab,
      label: 'Command Center',
      icon: LayoutDashboard,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'Inventory' as AdminSubTab,
      label: 'Inventory Telemetry',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} low` : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    {
      id: 'POS' as AdminSubTab,
      label: 'POS Register Terminal',
      icon: Smartphone,
      badge: 'Live',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'CRM' as AdminSubTab,
      label: 'CRM Customer Directory',
      icon: Users,
      badge: totalCustomersCount > 0 ? `${totalCustomersCount}` : null,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'Invoices' as AdminSubTab,
      label: 'Invoicing & Tax Logs',
      icon: FileText,
      badge: totalOrdersCount > 0 ? `${totalOrdersCount}` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'Reports' as AdminSubTab,
      label: 'Reports & Analytics',
      icon: BarChart3,
      badge: '26 Reports',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'Security' as AdminSubTab,
      label: 'User & Staff Management',
      icon: ShieldCheck,
      badge: activeStaff.role,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'Settings' as AdminSubTab,
      label: 'System Settings',
      icon: Settings,
      badge: 'Core',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between select-none overflow-y-auto overflow-x-hidden no-scrollbar pr-0.5 space-y-4">
      
      {/* Top Section: Brand & Database Sync Status */}
      <div className="space-y-4">
        
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-900/40 shrink-0">
              N
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-extrabold text-white tracking-tight truncate">NEXUS ENTERPRISE</h1>
                </div>
                <p className="text-[10px] text-gray-400 font-mono truncate">POS & Commerce Suite</p>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Status Indicator Card */}
        {!isCollapsed ? (
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2 text-xs" id="sidebar-db-status">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    dbStatus === 'connected' ? 'bg-emerald-400' : dbStatus === 'syncing' ? 'bg-amber-400' : 'bg-rose-400'
                  }`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    dbStatus === 'connected' ? 'bg-emerald-500' : dbStatus === 'syncing' ? 'bg-amber-500' : 'bg-rose-500'
                  }`} />
                </span>
                <span className="font-bold text-white text-[11px] flex items-center gap-1">
                  <Database className="w-3 h-3 text-indigo-400" /> Firestore DB
                </span>
              </div>

              <button
                onClick={handleManualSyncClick}
                title="Sync database now"
                className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded-md transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingSpin ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>

            <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
              <span className="capitalize">{dbStatus === 'connected' ? 'Cloud Synced' : dbStatus}</span>
              <span>{lastSynced || 'Active'}</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Firestore Database Connected">
            <button 
              onClick={handleManualSyncClick}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-emerald-400 border border-white/10"
            >
              <Database className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Currency Quick Selector in Sidebar */}
        {!isCollapsed ? (
          <button
            onClick={onOpenCurrencyModal}
            className="w-full p-2.5 bg-gradient-to-r from-indigo-950/70 to-slate-900 border border-indigo-500/30 hover:border-indigo-400/50 rounded-2xl flex items-center justify-between text-left transition-all group"
            id="sidebar-currency-widget"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0">{currentCurrency.flag}</span>
              <div className="min-w-0">
                <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Currency</span>
                <span className="text-xs font-bold text-white truncate block">
                  {currentCurrency.code} ({currentCurrency.symbol})
                </span>
              </div>
            </div>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-lg font-mono font-bold group-hover:bg-indigo-500/30 transition-all">
              Change
            </span>
          </button>
        ) : (
          <button
            onClick={onOpenCurrencyModal}
            title={`Currency: ${currentCurrency.code} (${currentCurrency.symbol})`}
            className="w-10 h-10 mx-auto rounded-xl bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center text-lg"
          >
            {currentCurrency.flag}
          </button>
        )}

        {/* Navigation Mode Switcher: Admin vs Storefront */}
        {!isCollapsed ? (
          <div className="p-1 bg-black/30 rounded-2xl border border-white/5 grid grid-cols-2 gap-1 text-[11px] font-bold">
            <button
              onClick={() => {
                onSwitchView('Admin');
                onCloseMobile();
              }}
              className={`py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                currentView === 'Admin'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> Admin
            </button>
            <button
              onClick={() => {
                onSwitchView('ECommerce');
                onCloseMobile();
              }}
              className={`py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                currentView === 'ECommerce'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Storefront
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 items-center">
            <button
              onClick={() => onSwitchView('Admin')}
              title="Admin Workspace"
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                currentView === 'Admin' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white bg-white/5'
              }`}
            >
              <Terminal className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSwitchView('ECommerce')}
              title="Customer Storefront"
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                currentView === 'ECommerce' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white bg-white/5'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Subsystems Navigation */}
        <div className="space-y-1 pt-1" id="sidebar-subsystems-nav">
          {!isCollapsed && (
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-2 mb-2">
              Core Subsystems
            </span>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === 'Admin' && adminSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (currentView !== 'Admin') onSwitchView('Admin');
                  onSelectSubTab(item.id);
                  onCloseMobile();
                }}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center justify-between rounded-xl transition-all ${
                  isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2.5 text-xs font-semibold'
                } ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                id={`sidebar-tab-${item.id.toLowerCase()}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Operator info, Offline Simulator, Collapse Toggle */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        
        {/* Offline POS test toggle */}
        {!isCollapsed ? (
          <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5 space-y-1.5" id="sidebar-offline-box">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-gray-400 uppercase tracking-wider">Offline Cache Sync</span>
              {deviceOffline && (
                <span className="text-rose-400 font-mono font-bold animate-pulse">OFFLINE</span>
              )}
            </div>
            <button
              onClick={onToggleOfflineSim}
              className={`w-full py-1.5 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                deviceOffline 
                  ? 'bg-rose-600 text-white animate-pulse shadow-xs' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/15'
              }`}
            >
              {deviceOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" /> RECONNECT & SYNC ({offlineOrderCount})
                </>
              ) : (
                <>
                  <Network className="w-3.5 h-3.5" /> TEST OFFLINE POS
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={onToggleOfflineSim}
            title={deviceOffline ? 'Reconnect Offline POS' : 'Test Offline POS'}
            className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center ${
              deviceOffline ? 'bg-rose-600 text-white animate-pulse' : 'bg-white/5 hover:bg-white/10 text-gray-400'
            }`}
          >
            {deviceOffline ? <WifiOff className="w-4 h-4" /> : <Network className="w-4 h-4" />}
          </button>
        )}

        {/* Active Staff Operator Card */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2.5 bg-black/30 rounded-2xl border border-white/5 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={activeStaff.avatar}
                alt={activeStaff.name}
                className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/20 shrink-0"
              />
              <div className="min-w-0">
                <span className="font-bold text-white block truncate leading-tight">{activeStaff.name}</span>
                <span className="text-[10px] text-indigo-400 block font-mono">{activeStaff.role}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <img
              src={activeStaff.avatar}
              alt={activeStaff.name}
              title={`${activeStaff.name} (${activeStaff.role})`}
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-indigo-500/50"
            />
          </div>
        )}

        {/* Desktop Collapse / Expand Toggle Button */}
        <div className="hidden lg:flex justify-end pt-1">
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="w-full py-1.5 flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
            id="sidebar-collapse-toggle-btn"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[11px]">Collapse Rail</span>
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed / Sticky Sidebar */}
      <aside
        className={`hidden lg:flex fixed top-0 left-0 bottom-0 z-30 bg-slate-900 border-r border-white/5 p-4 text-white flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
        id="desktop-fixed-sidebar"
      >
        {sidebarContent}
      </aside>

      {/* 2. Mobile Drawer Sidebar (with backdrop overlay) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" id="mobile-sidebar-drawer">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-white/10 p-5 text-white flex flex-col h-full shadow-2xl animate-in slide-in-from-left duration-200 z-10">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* 3. Mobile Sticky Bottom Navigation Bar for ultra-fast thumb navigation */}
      <div 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-white/10 flex justify-around items-center py-2 px-2 shadow-2xl"
        id="mobile-bottom-nav"
      >
        <button
          onClick={() => {
            if (currentView !== 'Admin') onSwitchView('Admin');
            onSelectSubTab('Dashboard');
          }}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
            currentView === 'Admin' && adminSubTab === 'Dashboard'
              ? 'text-indigo-400'
              : 'text-gray-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Center</span>
        </button>

        <button
          onClick={() => {
            if (currentView !== 'Admin') onSwitchView('Admin');
            onSelectSubTab('Inventory');
          }}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-bold relative ${
            currentView === 'Admin' && adminSubTab === 'Inventory'
              ? 'text-indigo-400'
              : 'text-gray-400'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Stock</span>
          {lowStockCount > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-rose-500" />
          )}
        </button>

        <button
          onClick={() => {
            if (currentView !== 'Admin') onSwitchView('Admin');
            onSelectSubTab('POS');
          }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold ${
            currentView === 'Admin' && adminSubTab === 'POS'
              ? 'text-indigo-400 bg-indigo-500/10'
              : 'text-gray-400'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>POS</span>
        </button>

        <button
          onClick={() => {
            if (currentView !== 'Admin') onSwitchView('Admin');
            onSelectSubTab('CRM');
          }}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
            currentView === 'Admin' && adminSubTab === 'CRM'
              ? 'text-indigo-400'
              : 'text-gray-400'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>CRM</span>
        </button>

        <button
          onClick={() => onSwitchView(currentView === 'Admin' ? 'ECommerce' : 'Admin')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
            currentView === 'ECommerce' ? 'text-indigo-400' : 'text-gray-400'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Store</span>
        </button>
      </div>
    </>
  );
}
