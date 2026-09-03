import React, { useState } from 'react';
import { CartItem, CouponCode, Customer, Order, PaymentMethod } from '../../types';
import { 
  X, CheckCircle, ShieldCheck, Truck, CreditCard, Lock, 
  MapPin, User, Mail, Phone, ChevronRight, ArrowLeft, 
  Receipt, Download, Sparkles, Building, Check
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

interface ECommerceCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  appliedCoupon: CouponCode | null;
  activeCustomer: Customer | null;
  useLoyaltyPoints: boolean;
  onOrderCompleted: (order: Order, orderDetails: any) => void;
  customers: Customer[];
  onSelectCustomer?: (customer: Customer) => void;
}

export default function ECommerceCheckoutModal({
  isOpen,
  onClose,
  cart,
  appliedCoupon,
  activeCustomer,
  useLoyaltyPoints,
  onOrderCompleted,
  customers,
  onSelectCustomer
}: ECommerceCheckoutModalProps) {
  const { formatAmount } = useCurrency();

  const [step, setStep] = useState<'info' | 'shipping' | 'payment' | 'confirmation'>('info');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  // Form State
  const [isGuest, setIsGuest] = useState(!activeCustomer);
  const [customerName, setCustomerName] = useState(activeCustomer ? activeCustomer.name : '');
  const [customerEmail, setCustomerEmail] = useState(activeCustomer ? activeCustomer.email : '');
  const [customerPhone, setCustomerPhone] = useState(activeCustomer ? activeCustomer.phone : '');

  // Address
  const [addressLine1, setAddressLine1] = useState('742 Evergreen Terrace');
  const [addressLine2, setAddressLine2] = useState('Suite 400');
  const [city, setCity] = useState('Springfield');
  const [stateProvince, setStateProvince] = useState('OR');
  const [postalCode, setPostalCode] = useState('97477');
  const [country, setCountry] = useState('United States');

  // Shipping Method
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express' | 'pickup'>('standard');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit/Debit Card');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');

  // Sync customer if provided
  React.useEffect(() => {
    if (activeCustomer) {
      setCustomerName(activeCustomer.name);
      setCustomerEmail(activeCustomer.email);
      setCustomerPhone(activeCustomer.phone);
      setIsGuest(false);
    }
  }, [activeCustomer]);

  if (!isOpen) return null;

  // Order Calculation
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  let couponDiscount = 0;
  let isFreeShippingFromCoupon = false;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      couponDiscount = (subtotal * appliedCoupon.value) / 100;
    } else if (appliedCoupon.discountType === 'fixed') {
      couponDiscount = Math.min(subtotal, appliedCoupon.value);
    } else if (appliedCoupon.discountType === 'free_shipping') {
      isFreeShippingFromCoupon = true;
    }
  }

  const loyaltyDiscount = (useLoyaltyPoints && activeCustomer)
    ? Math.min(subtotal - couponDiscount, activeCustomer.loyaltyPoints * 0.05)
    : 0;

  let shippingCost = 0;
  if (shippingMethod === 'standard') {
    shippingCost = (subtotal >= 150 || isFreeShippingFromCoupon) ? 0 : 15.00;
  } else if (shippingMethod === 'express') {
    shippingCost = 25.00;
  } else if (shippingMethod === 'pickup') {
    shippingCost = 0;
  }

  const tax = (subtotal - couponDiscount - loyaltyDiscount) * 0.08;
  const grandTotal = Math.max(0, subtotal - couponDiscount - loyaltyDiscount + shippingCost + tax);

  const handlePlaceOrder = async () => {
    setIsProcessing(true);

    try {
      const orderNumber = `ORD-EC-${Date.now().toString().slice(-6)}`;
      const trackingNumber = `TRK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      // Build order item records
      const orderItems = cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        cost: item.product.cost,
        variantSku: item.selectedVariantSku
      }));

      const newOrderRecord: Order = {
        id: orderNumber,
        date: new Date().toISOString(),
        items: orderItems,
        subtotal,
        discount: couponDiscount + loyaltyDiscount,
        tax,
        total: grandTotal,
        paymentMethod: paymentMethod,
        channel: 'Online Storefront',
        customerId: activeCustomer ? activeCustomer.id : undefined,
        customerName: customerName || 'Guest Shopper',
        customerEmail: customerEmail || 'guest@example.com',
        status: 'Completed',
        deliveryAddress: `${addressLine1}, ${addressLine2 ? addressLine2 + ', ' : ''}${city}, ${stateProvince} ${postalCode}`,
        notes: `Storefront Web Order. Tracking: ${trackingNumber}. Delivery: ${shippingMethod.toUpperCase()}`
      };

      const orderSummaryData = {
        orderNumber,
        trackingNumber,
        date: new Date().toLocaleDateString('en-US', { dateStyle: 'full' }),
        order: newOrderRecord,
        shippingAddress: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          addressLine1,
          addressLine2,
          city,
          stateProvince,
          postalCode,
          country,
          shippingMethod
        },
        items: cart,
        subtotal,
        discount: couponDiscount + loyaltyDiscount,
        shippingCost,
        tax,
        grandTotal,
        paymentMethod
      };

      // Mock slight network transit for realism
      await new Promise(r => setTimeout(r, 800));

      setCompletedOrder(orderSummaryData);
      setStep('confirmation');
      onOrderCompleted(newOrderRecord, orderSummaryData);
    } catch (err) {
      console.error('Order checkout failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[94vh] overflow-y-auto shadow-2xl border border-slate-200/80 relative flex flex-col no-scrollbar"
        id="ecommerce-checkout-modal"
      >
        
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
              N
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                {step === 'confirmation' ? 'Order Confirmed!' : 'Secure Checkout'}
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {step === 'confirmation' ? `Order ID: ${completedOrder?.orderNumber}` : '256-bit Encrypted Checkout'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            id="btn-close-checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator (when not confirmed) */}
        {step !== 'confirmation' && (
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold">
            <button
              onClick={() => setStep('info')}
              className={`flex items-center gap-1.5 cursor-pointer ${step === 'info' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center text-[10px]">1</span>
              <span>Contact & Account</span>
            </button>
            <ChevronRight className="w-4 h-4 text-slate-300" />

            <button
              onClick={() => setStep('shipping')}
              className={`flex items-center gap-1.5 cursor-pointer ${step === 'shipping' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center text-[10px]">2</span>
              <span>Shipping & Delivery</span>
            </button>
            <ChevronRight className="w-4 h-4 text-slate-300" />

            <button
              onClick={() => setStep('payment')}
              className={`flex items-center gap-1.5 cursor-pointer ${step === 'payment' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center text-[10px]">3</span>
              <span>Payment & Review</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 lg:p-8">
          
          {/* STEP 1: Contact & Account Information */}
          {step === 'info' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">Contact Information</h3>
                <p className="text-xs text-slate-500">We will send your order confirmation and dispatch tracking details here.</p>
              </div>

              {/* Customer quick select or guest toggle */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-900">Checkout Mode:</span>
                  <p className="text-[11px] text-slate-500">
                    {activeCustomer ? `Signed in as ${activeCustomer.name}` : 'Checking out as Guest (or select member account)'}
                  </p>
                </div>

                {customers.length > 0 && onSelectCustomer && (
                  <select
                    value={activeCustomer ? activeCustomer.id : ''}
                    onChange={(e) => {
                      const found = customers.find(c => c.id === e.target.value);
                      if (found) {
                        onSelectCustomer(found);
                        setCustomerName(found.name);
                        setCustomerEmail(found.email);
                        setCustomerPhone(found.phone);
                        setIsGuest(false);
                      }
                    }}
                    className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">-- Guest Checkout --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.loyaltyPoints} pts)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Legal Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="jane.doe@example.com"
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+1 (555) 019-2834"
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end">
                <button
                  type="button"
                  disabled={!customerName.trim() || !customerEmail.trim()}
                  onClick={() => setStep('shipping')}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Shipping</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Shipping Address & Method */}
          {step === 'shipping' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">Shipping & Delivery Details</h3>
                <p className="text-xs text-slate-500">Provide destination address for standard carrier or freight dispatch.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Street Address *</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="e.g. 742 Evergreen Terrace"
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Apartment, Suite, Unit (Optional)</label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Apt 4B, Building 2"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">State / Province *</label>
                    <input
                      type="text"
                      required
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-700 block mb-1">Postal Code *</label>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Shipping Method Selector */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Select Delivery Speed:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setShippingMethod('standard')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      shippingMethod === 'standard'
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Truck className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-mono font-bold">
                        {subtotal >= 150 || isFreeShippingFromCoupon ? 'FREE' : formatAmount(15.00)}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-2">Standard Ground</h4>
                    <p className="text-[11px] text-slate-500">3-5 Business Days</p>
                  </div>

                  <div
                    onClick={() => setShippingMethod('express')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      shippingMethod === 'express'
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Truck className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-mono font-bold">{formatAmount(25.00)}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-2">Express Priority</h4>
                    <p className="text-[11px] text-slate-500">1-2 Business Days</p>
                  </div>

                  <div
                    onClick={() => setShippingMethod('pickup')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      shippingMethod === 'pickup'
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Building className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-mono font-bold text-emerald-600">FREE</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-2">Store Pickup</h4>
                    <p className="text-[11px] text-slate-500">Ready in 2 Hours</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('info')}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={!addressLine1.trim() || !city.trim() || !postalCode.trim()}
                  onClick={() => setStep('payment')}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Payment</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment & Final Review */}
          {step === 'payment' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
              
              {/* Payment Details (7 Cols) */}
              <div className="md:col-span-7 space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900">Payment Method</h3>
                  <p className="text-xs text-slate-500">All transactions are encrypted with PCI-DSS 256-bit protocol.</p>
                </div>

                {/* Payment Option Tabs */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Credit/Debit Card')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      paymentMethod === 'Credit/Debit Card'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Digital Wallet')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      paymentMethod === 'Digital Wallet'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span>Apple / Mobile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      paymentMethod === 'Cash'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>Cash on Delivery</span>
                  </button>
                </div>

                {/* Card input mockup */}
                {paymentMethod === 'Credit/Debit Card' && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="•••• •••• •••• ••••"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono tracking-wider focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Expiration Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Security Code (CVC)</label>
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="CVC"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivery destination recap */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>Delivering To:</span>
                    <button onClick={() => setStep('shipping')} className="text-indigo-600 hover:underline">Edit</button>
                  </div>
                  <p className="text-slate-600">{customerName} ({customerPhone})</p>
                  <p className="text-slate-500">{addressLine1}, {city}, {stateProvince} {postalCode}</p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep('shipping')}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handlePlaceOrder}
                    className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
                    id="btn-place-order-confirm"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Authorizing & Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Place Order • {formatAmount(grandTotal)}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Order Summary (5 Cols) */}
              <div className="md:col-span-5 bg-slate-50 p-5 rounded-3xl border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Order Summary ({cart.reduce((s, i) => s + i.quantity, 0)} items)
                </h4>

                {/* Items preview */}
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar divide-y divide-slate-200">
                  {cart.map(item => (
                    <div key={`${item.product.id}-${item.selectedVariantSku || 'def'}`} className="pt-2 first:pt-0 flex items-center gap-3">
                      <img src={item.product.imageUrl} alt={item.product.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-slate-900 truncate">{item.product.name}</h5>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>Qty: {item.quantity}</span>
                          <span className="font-bold text-slate-900">{formatAmount(item.product.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Breakdown totals */}
                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono font-bold text-slate-900">{formatAmount(subtotal)}</span>
                  </div>

                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Coupon Discount</span>
                      <span className="font-mono font-bold">-{formatAmount(couponDiscount)}</span>
                    </div>
                  )}

                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-amber-600 font-medium">
                      <span>Loyalty Points Discount</span>
                      <span className="font-mono font-bold">-{formatAmount(loyaltyDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Shipping ({shippingMethod.toUpperCase()})</span>
                    <span className="font-mono font-bold text-slate-900">
                      {shippingCost === 0 ? <span className="text-emerald-600">FREE</span> : formatAmount(shippingCost)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Sales Tax (8%)</span>
                    <span className="font-mono font-bold text-slate-900">{formatAmount(tax)}</span>
                  </div>

                  <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total Amount</span>
                    <span className="font-mono text-base text-indigo-600">{formatAmount(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Celebratory Confirmation */}
          {step === 'confirmation' && completedOrder && (
            <div className="text-center space-y-6 max-w-lg mx-auto py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-in zoom-in">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200 uppercase tracking-wide">
                  Order Successfully Placed
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                  Thank You, {customerName.split(' ')[0]}!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  We sent a receipt and tracking updates to <strong className="text-slate-800">{customerEmail}</strong>.
                </p>
              </div>

              {/* Order Card Info */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Order Number:</span>
                  <span className="font-mono font-bold text-slate-900">{completedOrder.orderNumber}</span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Tracking Code:</span>
                  <span className="font-mono font-bold text-indigo-600">{completedOrder.trackingNumber}</span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Delivery Address:</span>
                  <span className="text-slate-900 truncate max-w-[200px]">{addressLine1}, {city}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-mono font-black text-sm text-slate-900">{formatAmount(completedOrder.grandTotal)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
