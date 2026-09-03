import React, { useState } from 'react';
import { Customer, Order } from '../../types';
import { 
  X, User, Sparkles, ShoppingBag, Award, CheckCircle, 
  Clock, Package, Receipt, Plus, LogOut, ArrowRight, 
  ShieldCheck, Phone, Mail, MapPin
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

interface ECommerceCustomerAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCustomer: Customer | null;
  customers: Customer[];
  onSelectCustomer: (customer: Customer | null) => void;
  onRegisterCustomer: (data: Omit<Customer, 'id' | 'createdAt'>) => void;
  customerOrders: any[];
}

export default function ECommerceCustomerAccountModal({
  isOpen,
  onClose,
  activeCustomer,
  customers,
  onSelectCustomer,
  onRegisterCustomer,
  customerOrders
}: ECommerceCustomerAccountModalProps) {
  const { formatAmount } = useCurrency();
  const [tab, setTab] = useState<'profile' | 'orders' | 'switch'>('profile');

  // Register New Customer Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');

  if (!isOpen) return null;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    onRegisterCustomer({
      name: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim() || '+1 (555) 000-0000',
      address: newAddress.trim() || 'Standard Delivery Address',
      loyaltyPoints: 100, // Welcome bonus points!
      totalSpent: 0,
      segment: 'New',
      purchaseHistoryIds: [],
      notes: 'Registered via Nexus Storefront Web Experience'
    });

    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewAddress('');
    setTab('profile');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200/80 relative flex flex-col no-scrollbar"
        id="ecommerce-account-modal"
      >
        
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-indigo-600/30">
              {activeCustomer ? activeCustomer.name[0] : <User className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                {activeCustomer ? activeCustomer.name : 'Customer Portal'}
              </h2>
              <span className="text-xs text-slate-400">
                {activeCustomer ? `${activeCustomer.email} • Tier: Gold Member` : 'Sign in or create customer profile'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="bg-slate-50 px-6 py-2 border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'profile'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            Member Profile & Points
          </button>

          <button
            type="button"
            onClick={() => setTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'orders'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <span>My Orders & History</span>
            {customerOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                {customerOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('switch')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ml-auto ${
              tab === 'switch'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            Switch / Register
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 lg:p-8 space-y-6">
          
          {/* TAB 1: Profile & Points */}
          {tab === 'profile' && (
            <div className="space-y-6">
              {activeCustomer ? (
                <>
                  {/* Loyalty Points Bento Banner */}
                  <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg">
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wide">
                            Nexus Elite Tier
                          </span>
                          <span className="text-xs text-slate-300">Member #{activeCustomer.id.slice(-6)}</span>
                        </div>
                        <h3 className="text-3xl font-black font-mono text-amber-300 mt-2">
                          {activeCustomer.loyaltyPoints} <span className="text-sm font-sans font-medium text-white">Loyalty Points</span>
                        </h3>
                        <p className="text-xs text-slate-300 mt-1">
                          Redeemable value: <strong className="font-mono text-white">{formatAmount(activeCustomer.loyaltyPoints * 0.05)}</strong> toward any cart purchase.
                        </p>
                      </div>

                      <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-xs text-xs space-y-1 text-slate-200 sm:max-w-xs">
                        <div className="flex items-center gap-1.5 font-bold text-amber-300">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Member Perks:</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">
                          Earn 10 points per $1 spent. Free express shipping on all orders over $100.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Contact Details</span>
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <Mail className="w-4 h-4 text-indigo-600" />
                        <span className="font-medium">{activeCustomer.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <Phone className="w-4 h-4 text-indigo-600" />
                        <span className="font-mono">{activeCustomer.phone}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Saved Default Address</span>
                      <div className="flex items-start gap-2 text-xs text-slate-700">
                        <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <span className="font-medium">{activeCustomer.address || '742 Evergreen Terrace, Springfield, OR'}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <User className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">No Customer Account Selected</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Sign in with an existing account or register a new customer profile to earn loyalty rewards and track online orders.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('switch')}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Select or Create Account
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Orders & History */}
          {tab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Recent Online Orders & Shipments</h3>
                <span className="text-xs text-slate-400 font-mono">{customerOrders.length} order(s) found</span>
              </div>

              {customerOrders.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-2">
                  <Package className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">No orders recorded in this session yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customerOrders.map((ord, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                        <div>
                          <span className="text-xs font-mono font-bold text-slate-900">{ord.orderNumber || ord.id}</span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">{ord.date}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Processing / Dispatched
                          </span>
                          <span className="text-xs font-mono font-black text-slate-900">
                            {formatAmount(ord.grandTotal || ord.total)}
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="text-xs text-slate-600 space-y-1">
                        {ord.items && ord.items.map((it: any, itemIdx: number) => (
                          <div key={itemIdx} className="flex items-center justify-between text-[11px]">
                            <span>{it.quantity}x {it.product ? it.product.name : it.productName}</span>
                            <span className="font-mono text-slate-800 font-medium">{formatAmount((it.product ? it.product.price : it.price || it.unitPrice) * it.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-mono">Tracking: {ord.trackingNumber || 'TRK-EXP-9921'}</span>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Receipt className="w-3 h-3" /> Print Invoice
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Switch or Register */}
          {tab === 'switch' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Existing Customers List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Select Existing Member</h4>
                <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                  {customers.map((c) => {
                    const isSelected = activeCustomer?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          onSelectCustomer(c);
                          setTab('profile');
                        }}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                            {c.name[0]}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900">{c.name}</h5>
                            <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">{c.email}</span>
                          </div>
                        </div>

                        <span className="text-xs font-mono font-bold text-indigo-600">
                          {c.loyaltyPoints} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Register New Customer Profile */}
              <form onSubmit={handleRegister} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Register New Member Profile</span>
                </h4>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Rachel Adams"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="rachel.adams@example.com"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Phone</label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+1 (555) 012-9988"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-0.5">City / Address</label>
                    <input
                      type="text"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder="Seattle, WA"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Create & Claim 100 Bonus Pts</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
