import React, { useState, useMemo } from 'react';
import { Customer, Order, SupportTicket, CampaignLog } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import CustomerFormModal from './CustomerFormModal';
import CustomerDetailDrawer from './CustomerDetailDrawer';
import CustomerImportExportModal from './CustomerImportExportModal';
import CampaignBroadcastModal from './CampaignBroadcastModal';
import { 
  Users, UserPlus, Search, Mail, Phone, Tag, Award, 
  MessageSquare, Send, Sparkles, AlertCircle, CheckCircle2, 
  Trash2, Edit2, Eye, Upload, Download, Filter, 
  ArrowUpDown, SlidersHorizontal, LayoutGrid, List, 
  CheckSquare, Square, ShieldCheck, DollarSign, Clock, 
  Plus, RefreshCw, Smartphone, Layers, HelpCircle, Check, 
  TrendingUp, Star, ChevronRight, X
} from 'lucide-react';

interface CRMModuleProps {
  customers: Customer[];
  orders?: Order[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (customerId: string) => void;
  staffRole: string;
  activeStaffName?: string;
}

export default function CRMModule({
  customers,
  orders = [],
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  staffRole,
  activeStaffName = 'Elena Rostova'
}: CRMModuleProps) {
  const { formatAmount } = useCurrency();

  // Active view: 'directory' | 'tickets' | 'campaigns'
  const [activeMainTab, setActiveMainTab] = useState<'directory' | 'tickets' | 'campaigns'>('directory');

  // Search, Segment & Tier Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('All');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [optInFilter, setOptInFilter] = useState<'All' | 'OptedIn' | 'OptedOut'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'spent' | 'orders' | 'recent'>('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Multi-Selection State
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Modal / Drawer States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [inspectingCustomer, setInspectingCustomer] = useState<Customer | null>(null);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);

  // Tickets State
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([
    {
      id: 'tkt-401',
      customerId: 'cust-201',
      customerName: 'Sarah Connor',
      subject: 'Inquire about AeroSound ANC size fits & warranty',
      category: 'Product Inquiry',
      priority: 'Medium',
      status: 'Open',
      date: '2026-08-14T11:20:00-07:00',
      description: 'Customer asked whether the ANC earcups fit comfortably for continuous long flights.',
      assignedStaff: activeStaffName
    },
    {
      id: 'tkt-402',
      customerId: 'cust-202',
      customerName: 'Miles Dyson',
      subject: 'Invoice tax breakdown on smartwatch purchase',
      category: 'Billing & Refund',
      priority: 'High',
      status: 'Pending',
      date: '2026-08-15T14:10:00-07:00',
      description: 'Requesting updated tax-exempt receipt for corporate tech expenditure.',
      assignedStaff: activeStaffName
    }
  ]);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('All');
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState<string>('All');

  // Campaign Dispatches Log State
  const [campaignLogs, setCampaignLogs] = useState<CampaignLog[]>([
    {
      id: 'cmp-101',
      channel: 'email',
      targetType: 'segment',
      targetLabel: 'VIP Segment Audience',
      subject: 'Exclusive VIP Double Loyalty Weekend',
      message: 'Hi {{customer_name}}, enjoy double points on all store items this Saturday & Sunday!',
      recipientCount: customers.filter(c => c.segment === 'VIP').length || 1,
      timestamp: '2026-08-12T09:30:00-07:00',
      status: 'Delivered'
    },
    {
      id: 'cmp-102',
      channel: 'sms',
      targetType: 'all',
      targetLabel: 'Complete Customer Directory',
      message: 'Nexus Flash Alert: New outdoor gear catalog just dropped in showroom! Use code FLASH15.',
      recipientCount: customers.length,
      timestamp: '2026-08-14T16:00:00-07:00',
      status: 'Delivered'
    }
  ]);

  // Compute spend stats mapping per customer for rapid lookup
  const customerSpendMap = useMemo(() => {
    const map: { [key: string]: { totalSpent: number; orderCount: number; lastDate?: string } } = {};
    orders.forEach(o => {
      const custId = o.customerId || '';
      const custName = (o.customerName || '').toLowerCase();
      
      const key = custId || custName;
      if (!key) return;

      if (!map[key]) {
        map[key] = { totalSpent: 0, orderCount: 0 };
      }
      if (o.status === 'Completed') {
        map[key].totalSpent += o.total;
      }
      map[key].orderCount += 1;
      if (!map[key].lastDate || new Date(o.date) > new Date(map[key].lastDate!)) {
        map[key].lastDate = o.date;
      }
    });
    return map;
  }, [orders]);

  const getCustomerMetrics = (c: Customer) => {
    const byId = customerSpendMap[c.id];
    const byName = customerSpendMap[c.name.toLowerCase()];
    const totalSpent = (byId?.totalSpent || 0) + (byName?.totalSpent || 0);
    const orderCount = Math.max(byId?.orderCount || 0, byName?.orderCount || 0, c.purchaseHistoryIds?.length || 0);
    return { totalSpent, orderCount };
  };

  // KPI Calculations
  const totalContacts = customers.length;
  const vipCount = customers.filter(c => c.segment === 'VIP').length;
  const vipPercentage = totalContacts > 0 ? Math.round((vipCount / totalContacts) * 100) : 0;
  
  const totalLifetimeRevenue = orders
    .filter(o => o.status === 'Completed')
    .reduce((sum, o) => sum + o.total, 0);

  const totalLoyaltyLiability = customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);
  const avgLTV = totalContacts > 0 ? totalLifetimeRevenue / totalContacts : 0;

  // Filter & Sort Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        c.name.toLowerCase().includes(search) || 
        c.email.toLowerCase().includes(search) || 
        c.phone.includes(search) ||
        (c.city && c.city.toLowerCase().includes(search)) ||
        (c.tags && c.tags.some(t => t.toLowerCase().includes(search))) ||
        c.id.toLowerCase().includes(search);

      // Segment
      const matchesSegment = selectedSegment === 'All' || c.segment === selectedSegment;

      // Tier
      const tier = c.loyaltyTier || (c.loyaltyPoints >= 1000 ? 'Diamond' : c.loyaltyPoints >= 500 ? 'Platinum' : c.loyaltyPoints >= 250 ? 'Gold' : c.loyaltyPoints >= 100 ? 'Silver' : 'Bronze');
      const matchesTier = selectedTier === 'All' || tier === selectedTier;

      // Marketing Opt-In
      const matchesOptIn = 
        optInFilter === 'All' ? true :
        optInFilter === 'OptedIn' ? c.marketingOptIn !== false :
        c.marketingOptIn === false;

      return matchesSearch && matchesSegment && matchesTier && matchesOptIn;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'points') {
        comparison = (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0);
      } else if (sortBy === 'spent') {
        const spentA = getCustomerMetrics(a).totalSpent;
        const spentB = getCustomerMetrics(b).totalSpent;
        comparison = spentB - spentA;
      } else if (sortBy === 'orders') {
        const ordersA = getCustomerMetrics(a).orderCount;
        const ordersB = getCustomerMetrics(b).orderCount;
        comparison = ordersB - ordersA;
      } else if (sortBy === 'recent') {
        comparison = (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });
  }, [customers, searchTerm, selectedSegment, selectedTier, optInFilter, sortBy, sortOrder, customerSpendMap]);

  // Multi-Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedCustomerIds.length === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(filteredCustomers.map(c => c.id));
    }
  };

  const handleToggleSelectCustomer = (id: string) => {
    if (selectedCustomerIds.includes(id)) {
      setSelectedCustomerIds(selectedCustomerIds.filter(i => i !== id));
    } else {
      setSelectedCustomerIds([...selectedCustomerIds, id]);
    }
  };

  // Bulk Operations
  const handleBulkChangeSegment = (newSegment: 'VIP' | 'Regular' | 'New' | 'Inactive') => {
    if (!onUpdateCustomer || selectedCustomerIds.length === 0) return;
    selectedCustomerIds.forEach(id => {
      const found = customers.find(c => c.id === id);
      if (found) {
        onUpdateCustomer({ ...found, segment: newSegment });
      }
    });
    alert(`Updated segment to "${newSegment}" for ${selectedCustomerIds.length} customer records.`);
    setSelectedCustomerIds([]);
  };

  const handleBulkAwardPoints = (points: number) => {
    if (!onUpdateCustomer || selectedCustomerIds.length === 0) return;
    selectedCustomerIds.forEach(id => {
      const found = customers.find(c => c.id === id);
      if (found) {
        onUpdateCustomer({ 
          ...found, 
          loyaltyPoints: (found.loyaltyPoints || 0) + points 
        });
      }
    });
    alert(`Credited ${points} bonus loyalty points to ${selectedCustomerIds.length} customer accounts!`);
    setSelectedCustomerIds([]);
  };

  const handleBulkDelete = () => {
    if (!onDeleteCustomer || selectedCustomerIds.length === 0) return;
    if (window.confirm(`Are you sure you want to permanently delete ${selectedCustomerIds.length} customer records?`)) {
      selectedCustomerIds.forEach(id => onDeleteCustomer(id));
      setSelectedCustomerIds([]);
    }
  };

  // Customer Actions
  const handleSaveCustomer = (cust: Customer) => {
    if (customers.some(c => c.id === cust.id)) {
      if (onUpdateCustomer) onUpdateCustomer(cust);
    } else {
      onAddCustomer(cust);
    }
    if (inspectingCustomer && inspectingCustomer.id === cust.id) {
      setInspectingCustomer(cust);
    }
  };

  const handleQuickAdjustPoints = (customerId: string, newPoints: number, reason: string) => {
    const found = customers.find(c => c.id === customerId);
    if (found && onUpdateCustomer) {
      const updated = { ...found, loyaltyPoints: newPoints };
      onUpdateCustomer(updated);
      if (inspectingCustomer && inspectingCustomer.id === customerId) {
        setInspectingCustomer(updated);
      }
    }
  };

  const handleImportCustomers = (imported: Customer[]) => {
    imported.forEach(c => onAddCustomer(c));
    alert(`Successfully imported ${imported.length} new customer accounts into CRM!`);
  };

  const handleDispatchCampaign = (log: CampaignLog) => {
    setCampaignLogs([log, ...campaignLogs]);
  };

  const handleDirectSendMessage = (customer: Customer, channel: 'email' | 'sms' | 'whatsapp', subject: string, message: string) => {
    const log: CampaignLog = {
      id: `cmp-direct-${Date.now()}`,
      channel,
      targetType: 'single',
      targetLabel: `${customer.name} (${customer.email || customer.phone})`,
      subject: channel === 'email' ? subject : undefined,
      message,
      recipientCount: 1,
      timestamp: new Date().toISOString(),
      status: 'Delivered'
    };
    setCampaignLogs([log, ...campaignLogs]);
    alert(`DISPATCH CONFIRMED!\n\nChannel: ${channel.toUpperCase()}\nRecipient: ${customer.name}\nMessage: ${message.slice(0, 100)}...`);
  };

  const handleCreateSupportTicket = (customerId: string, subject: string, category: any, priority: any, description: string) => {
    const cust = customers.find(c => c.id === customerId);
    const newTkt: SupportTicket = {
      id: `tkt-${Math.floor(400 + Math.random() * 999)}`,
      customerId,
      customerName: cust?.name || 'Walk-in Guest',
      subject,
      category,
      priority,
      status: 'Open',
      date: new Date().toISOString(),
      description,
      assignedStaff: activeStaffName
    };
    setSupportTickets([newTkt, ...supportTickets]);
    alert('Support inquiry logged on customer timeline!');
  };

  const handleResolveSupportTicket = (ticketId: string) => {
    setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'Resolved' } : t));
  };

  // Filter Support Tickets
  const filteredTickets = supportTickets.filter(t => {
    const matchesSearch = 
      t.subject.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.customerName.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.id.toLowerCase().includes(ticketSearch.toLowerCase());
    const matchesStatus = ticketStatusFilter === 'All' || t.status === ticketStatusFilter;
    const matchesCat = ticketCategoryFilter === 'All' || t.category === ticketCategoryFilter;
    return matchesSearch && matchesStatus && matchesCat;
  });

  return (
    <div className="space-y-6" id="crm-module-root">
      
      {/* Top Header & Global Actions Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs" id="crm-top-bar">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Customer Relationship Management</h1>
              <p className="text-xs text-slate-500">
                Unified directory, VIP tier tracking, omni-channel campaigns & client inquiries.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Trigger Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-end">
          <button
            onClick={() => setIsImportExportModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            id="btn-crm-import-export"
          >
            <Upload className="w-4 h-4" /> CSV Hub
          </button>

          <button
            onClick={() => setIsCampaignModalOpen(true)}
            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            id="btn-crm-broadcast-campaign"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" /> Campaign Studio
          </button>

          <button
            onClick={() => {
              setEditingCustomer(null);
              setIsFormModalOpen(true);
            }}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            id="btn-crm-add-customer"
          >
            <UserPlus className="w-4 h-4" /> Register Client
          </button>
        </div>
      </div>

      {/* Real-Time Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="crm-telemetry-kpis">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total CRM Profiles</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{totalContacts} Accounts</h3>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="w-3 h-3" /> {customers.filter(c => c.segment === 'New').length} new this month
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Lifetime Gross Revenue</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{formatAmount(totalLifetimeRevenue)}</h3>
            <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
              Avg LTV: {formatAmount(avgLTV)}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">VIP Tier Share</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{vipCount} Clients</h3>
            <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
              {vipPercentage}% of active client base
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Loyalty Points Pool</p>
            <h3 className="text-xl font-black text-indigo-700 mt-0.5">{totalLoyaltyLiability.toLocaleString()} Pts</h3>
            <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
              Est. Value: {formatAmount(totalLoyaltyLiability * 0.05)} Credit
            </span>
          </div>
        </div>
      </div>

      {/* Main View Mode Selector Tabs (Directory vs Support Tickets vs Past Campaigns) */}
      <div className="flex border-b border-slate-200 bg-white p-2 rounded-2xl shadow-xs gap-1.5" id="crm-main-tabs">
        <button
          onClick={() => setActiveMainTab('directory')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeMainTab === 'directory'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" /> Customer Directory ({filteredCustomers.length})
        </button>

        <button
          onClick={() => setActiveMainTab('tickets')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeMainTab === 'tickets'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertCircle className="w-4 h-4" /> Support & Inquiries Hub ({supportTickets.filter(t => t.status !== 'Resolved').length} Open)
        </button>

        <button
          onClick={() => setActiveMainTab('campaigns')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeMainTab === 'campaigns'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Dispatched Campaigns ({campaignLogs.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CUSTOMER DIRECTORY */}
      {/* ========================================================================= */}
      {activeMainTab === 'directory' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Filtering & Search Toolbar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3" id="crm-directory-filters">
            {/* Row 1: Search & Controls */}
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative w-full md:flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search clients by name, email, phone, city, tags, or ID..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-slate-950 focus:outline-hidden transition-all"
                  id="crm-search-input"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] uppercase font-bold text-slate-400">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-hidden"
                  >
                    <option value="points">Loyalty Points</option>
                    <option value="spent">Total Spent</option>
                    <option value="orders">Orders Count</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="recent">Date Added</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-1 hover:bg-slate-200 rounded text-slate-600 font-bold"
                    title={`Sort Order: ${sortOrder.toUpperCase()}`}
                  >
                    {sortOrder === 'desc' ? '↓' : '↑'}
                  </button>
                </div>

                {/* Table vs Grid toggle */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg transition-all ${
                      viewMode === 'table' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Table View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-all ${
                      viewMode === 'grid' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Grid Card View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Segment & Tier Filter Pills */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
              {/* Segment Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 shrink-0">Segment:</span>
                {['All', 'VIP', 'Regular', 'New', 'Inactive'].map(seg => {
                  const count = seg === 'All' ? customers.length : customers.filter(c => c.segment === seg).length;
                  const isSelected = selectedSegment === seg;
                  return (
                    <button
                      key={seg}
                      onClick={() => setSelectedSegment(seg)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {seg} <span className="opacity-70 text-[10px]">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Tier Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-[10px] uppercase font-bold text-slate-400">Tier:</span>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden"
                >
                  <option value="All">All Tiers</option>
                  <option value="Bronze">Bronze</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                  <option value="Diamond">Diamond</option>
                </select>

                <select
                  value={optInFilter}
                  onChange={(e) => setOptInFilter(e.target.value as any)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden"
                >
                  <option value="All">All Marketing Status</option>
                  <option value="OptedIn">Subscribed (SMS/Email)</option>
                  <option value="OptedOut">Opted Out</option>
                </select>
              </div>
            </div>
          </div>

          {/* Floating Multi-Select Actions Toolbar */}
          {selectedCustomerIds.length > 0 && (
            <div className="sticky top-20 z-30 bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 bg-indigo-600 rounded-lg text-xs font-black">
                  {selectedCustomerIds.length} Selected
                </span>
                <span className="text-xs text-slate-300">Bulk Client Batch Actions</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Change Segment dropdown */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkChangeSegment(e.target.value as any);
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="">Move Segment...</option>
                  <option value="VIP">⭐ Promote to VIP</option>
                  <option value="Regular">👤 Set to Regular</option>
                  <option value="New">✨ Mark as New</option>
                  <option value="Inactive">⏸️ Mark Inactive</option>
                </select>

                <button
                  onClick={() => handleBulkAwardPoints(50)}
                  className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white rounded-xl text-xs font-bold border border-emerald-500/30 transition-all"
                >
                  +50 Points
                </button>

                <button
                  onClick={() => setIsCampaignModalOpen(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Campaign
                </button>

                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white rounded-xl text-xs font-bold border border-rose-500/30 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 inline" />
                </button>

                <button
                  onClick={() => setSelectedCustomerIds([])}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                  title="Clear Selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden" id="crm-table-container">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3.5 w-10 text-center">
                        <button onClick={handleToggleSelectAll} className="text-slate-500 hover:text-slate-900">
                          {selectedCustomerIds.length === filteredCustomers.length && filteredCustomers.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3.5">Customer Profile</th>
                      <th className="px-4 py-3.5">Segment & Tier</th>
                      <th className="px-4 py-3.5">Contact Details</th>
                      <th className="px-4 py-3.5">Total Spent & Orders</th>
                      <th className="px-4 py-3.5">Loyalty Points</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredCustomers.map(cust => {
                      const metrics = getCustomerMetrics(cust);
                      const isSelected = selectedCustomerIds.includes(cust.id);
                      const tier = cust.loyaltyTier || (cust.loyaltyPoints >= 1000 ? 'Diamond' : cust.loyaltyPoints >= 500 ? 'Platinum' : cust.loyaltyPoints >= 250 ? 'Gold' : cust.loyaltyPoints >= 100 ? 'Silver' : 'Bronze');

                      return (
                        <tr 
                          key={cust.id} 
                          className={`hover:bg-slate-50/70 transition-all ${isSelected ? 'bg-indigo-50/40' : ''}`}
                          id={`crm-row-${cust.id}`}
                        >
                          {/* Checkbox */}
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleToggleSelectCustomer(cust.id)} className="text-slate-400 hover:text-slate-900">
                              {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                            </button>
                          </td>

                          {/* Profile & Avatar */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                                {cust.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="space-y-0.5">
                                <button
                                  onClick={() => setInspectingCustomer(cust)}
                                  className="font-bold text-slate-900 hover:text-indigo-600 text-left transition-colors flex items-center gap-1"
                                >
                                  {cust.name}
                                </button>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  {cust.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Segment & Tier Badges */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                                cust.segment === 'VIP' ? 'bg-amber-100 text-amber-900 font-black' :
                                cust.segment === 'Regular' ? 'bg-blue-50 text-blue-700' :
                                cust.segment === 'New' ? 'bg-emerald-50 text-emerald-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                <Tag className="w-2.5 h-2.5" /> {cust.segment}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700">
                                <Award className="w-2.5 h-2.5" /> {tier}
                              </span>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="px-4 py-3">
                            <div className="space-y-0.5 text-[11px] text-slate-600">
                              <span className="flex items-center gap-1 text-slate-800 font-medium">
                                <Mail className="w-3 h-3 text-slate-400" /> {cust.email}
                              </span>
                              <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                                <Phone className="w-3 h-3 text-slate-400" /> {cust.phone}
                              </span>
                            </div>
                          </td>

                          {/* Financials & Orders */}
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              <span className="font-extrabold font-mono text-slate-900 text-xs block">
                                {formatAmount(metrics.totalSpent)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold block">
                                {metrics.orderCount} orders registered
                              </span>
                            </div>
                          </td>

                          {/* Loyalty Points */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1">
                                <Award className="w-3.5 h-3.5 text-indigo-600" />
                                {cust.loyaltyPoints || 0} pts
                              </span>
                              <button
                                onClick={() => handleQuickAdjustPoints(cust.id, (cust.loyaltyPoints || 0) + 25, 'Quick 25 pts boost')}
                                className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold"
                                title="Quick +25 Points"
                              >
                                +25
                              </button>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setInspectingCustomer(cust)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Inspect 360° Profile"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setEditingCustomer(cust);
                                  setIsFormModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit Customer Profile"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {onDeleteCustomer && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete record for ${cust.name}?`)) {
                                      onDeleteCustomer(cust.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Customer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 space-y-2">
                          <Users className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-xs font-bold text-slate-700">No Customers Matched Query</p>
                          <p className="text-[11px] text-slate-400">Try adjusting search keywords or clearing segment filters.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GRID CARD VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="crm-grid-container">
              {filteredCustomers.map(cust => {
                const metrics = getCustomerMetrics(cust);
                const isSelected = selectedCustomerIds.includes(cust.id);
                const tier = cust.loyaltyTier || (cust.loyaltyPoints >= 1000 ? 'Diamond' : cust.loyaltyPoints >= 500 ? 'Platinum' : cust.loyaltyPoints >= 250 ? 'Gold' : cust.loyaltyPoints >= 100 ? 'Silver' : 'Bronze');

                return (
                  <div 
                    key={cust.id} 
                    className={`bg-white p-5 rounded-3xl border transition-all space-y-4 hover:shadow-md ${
                      isSelected ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                          {cust.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 
                            onClick={() => setInspectingCustomer(cust)}
                            className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer text-sm"
                          >
                            {cust.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-mono block">{cust.id}</span>
                        </div>
                      </div>

                      <button onClick={() => handleToggleSelectCustomer(cust.id)} className="text-slate-400 hover:text-slate-900">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                      </button>
                    </div>

                    {/* Segment & Tier Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                        cust.segment === 'VIP' ? 'bg-amber-100 text-amber-900 font-black' :
                        cust.segment === 'Regular' ? 'bg-blue-50 text-blue-700' :
                        cust.segment === 'New' ? 'bg-emerald-50 text-emerald-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        <Tag className="w-2.5 h-2.5" /> {cust.segment}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700">
                        <Award className="w-2.5 h-2.5" /> {tier} Tier
                      </span>
                      {cust.marketingOptIn !== false && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-semibold">
                          <ShieldCheck className="w-2.5 h-2.5" /> Opted In
                        </span>
                      )}
                    </div>

                    {/* Contact details */}
                    <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="flex items-center gap-1.5 text-[11px] truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {cust.email}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {cust.phone}
                      </span>
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-2 gap-2 text-center bg-slate-50/70 p-2.5 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Spent</span>
                        <span className="font-mono font-black text-slate-900 text-xs">
                          {formatAmount(metrics.totalSpent)}
                        </span>
                      </div>
                      <div className="border-l border-slate-200">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Loyalty</span>
                        <span className="font-mono font-black text-indigo-600 text-xs">
                          {cust.loyaltyPoints || 0} pts
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <button
                        onClick={() => setInspectingCustomer(cust)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        Inspect 360° <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCustomer(cust);
                            setIsFormModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {onDeleteCustomer && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete record for ${cust.name}?`)) {
                                onDeleteCustomer(cust.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SUPPORT & INQUIRIES HUB */}
      {/* ========================================================================= */}
      {activeMainTab === 'tickets' && (
        <div className="space-y-4 animate-in fade-in" id="crm-tickets-container">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Search ticket subject or customer..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <select
                value={ticketStatusFilter}
                onChange={(e) => setTicketStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="All">All Ticket Statuses</option>
                <option value="Open">Open</option>
                <option value="Pending">Pending</option>
                <option value="Resolved">Resolved</option>
              </select>

              <select
                value={ticketCategoryFilter}
                onChange={(e) => setTicketCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="All">All Categories</option>
                <option value="Order Issue">Order Issue</option>
                <option value="Product Inquiry">Product Inquiry</option>
                <option value="Loyalty Redemption">Loyalty Redemption</option>
                <option value="Billing & Refund">Billing & Refund</option>
              </select>

              <button
                onClick={() => {
                  if (customers[0]) {
                    handleCreateSupportTicket(
                      customers[0].id,
                      'Client Inquired on Order Status',
                      'Order Issue',
                      'Medium',
                      'Customer followed up regarding store pickup timeline.'
                    );
                  }
                }}
                className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Quick Log Ticket
              </button>
            </div>
          </div>

          {/* Tickets Grid / List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTickets.map(ticket => (
              <div key={ticket.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3" id={`ticket-card-${ticket.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">{ticket.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        ticket.priority === 'Urgent' ? 'bg-rose-500 text-white' :
                        ticket.priority === 'High' ? 'bg-amber-500 text-white' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {ticket.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold">
                        {ticket.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm pt-0.5">{ticket.subject}</h3>
                    <p className="text-xs text-slate-500 font-medium">Customer: <strong>{ticket.customerName}</strong></p>
                  </div>

                  {ticket.status === 'Resolved' ? (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-bold flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                    </span>
                  ) : (
                    <button
                      onClick={() => handleResolveSupportTicket(ticket.id)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-emerald-600 hover:text-white text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all shrink-0"
                    >
                      Resolve
                    </button>
                  )}
                </div>

                {ticket.description && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {ticket.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2.5">
                  <span>Logged: {new Date(ticket.date).toLocaleString()}</span>
                  <span>Assigned: <strong>{ticket.assignedStaff || activeStaffName}</strong></span>
                </div>
              </div>
            ))}

            {filteredTickets.length === 0 && (
              <div className="md:col-span-2 bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No Support Tickets Found</p>
                <p className="text-[11px] text-slate-400">All customer inquiries are resolved or no tickets match the filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DISPATCHED CAMPAIGNS LOG */}
      {/* ========================================================================= */}
      {activeMainTab === 'campaigns' && (
        <div className="space-y-4 animate-in fade-in" id="crm-campaigns-container">
          <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Campaign Broadcast Dispatch Log</h3>
              <p className="text-xs text-slate-400">Historical delivery telemetry for SMS, Email, and Push broadcasts</p>
            </div>
            <button
              onClick={() => setIsCampaignModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Launch Campaign
            </button>
          </div>

          <div className="space-y-3">
            {campaignLogs.map(camp => (
              <div key={camp.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`p-2 rounded-xl text-xs font-black uppercase flex items-center gap-1 ${
                      camp.channel === 'email' ? 'bg-blue-50 text-blue-700' :
                      camp.channel === 'sms' ? 'bg-indigo-50 text-indigo-700' :
                      'bg-emerald-50 text-emerald-700'
                    }`}>
                      {camp.channel === 'email' ? <Mail className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                      {camp.channel.toUpperCase()}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">
                        {camp.subject || camp.targetLabel}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        Target: <strong>{camp.targetLabel}</strong> ({camp.recipientCount} recipients)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {camp.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(camp.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans whitespace-pre-wrap">
                  {camp.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS & DRAWERS */}
      {/* ========================================================================= */}

      {/* 1. Add / Edit Customer Modal */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCustomer(null);
        }}
        onSubmit={handleSaveCustomer}
        initialCustomer={editingCustomer}
      />

      {/* 2. Customer 360° Inspector Drawer */}
      <CustomerDetailDrawer
        isOpen={Boolean(inspectingCustomer)}
        customer={inspectingCustomer}
        orders={orders}
        tickets={supportTickets}
        onClose={() => setInspectingCustomer(null)}
        onEdit={(cust) => {
          setEditingCustomer(cust);
          setIsFormModalOpen(true);
        }}
        onDelete={(id) => {
          if (onDeleteCustomer) onDeleteCustomer(id);
          setInspectingCustomer(null);
        }}
        onUpdatePoints={handleQuickAdjustPoints}
        onSendMessage={handleDirectSendMessage}
        onCreateTicket={handleCreateSupportTicket}
        onResolveTicket={handleResolveSupportTicket}
      />

      {/* 3. CSV Import & Export Modal */}
      <CustomerImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        customers={customers}
        onImportCustomers={handleImportCustomers}
      />

      {/* 4. Campaign Studio Modal */}
      <CampaignBroadcastModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        customers={customers}
        selectedCustomerIds={selectedCustomerIds}
        onDispatchCampaign={handleDispatchCampaign}
      />

    </div>
  );
}
