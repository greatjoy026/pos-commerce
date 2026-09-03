import React, { useState } from 'react';
import { Order } from '../types';
import { 
  FileText, Download, Send, Printer, Layout, ShieldCheck, 
  Settings, CheckCircle, HelpCircle, ArrowUpRight, CheckCircle2,
  AlertCircle, X, CheckSquare, Square, FileCheck
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface InvoiceModuleProps {
  orders: Order[];
}

export default function InvoiceModule({ orders }: InvoiceModuleProps) {
  const { formatAmount } = useCurrency();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null);
  
  // Custom Invoice Branding presets
  const [invoiceColorPreset, setInvoiceColorPreset] = useState<'midnight' | 'corporate' | 'emerald'>('midnight');
  const [companyTaxId, setCompanyTaxId] = useState('VAT-GB-283192083');
  const [companyPhone, setCompanyPhone] = useState('+1 (800) 555-NEXUS');

  // Pre-Print Tax Compliance Verification Dialog State
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [taxVerifications, setTaxVerifications] = useState({
    taxIdVerified: false,
    taxRateVerified: false,
    taxBaseVerified: false,
    fiscalAuditVerified: false,
  });
  const [printSuccessToast, setPrintSuccessToast] = useState(false);

  // Compute total VAT/GST collected
  const totalTaxCollected = orders
    .filter(o => o.status === 'Completed')
    .reduce((sum, o) => sum + o.tax, 0);

  const totalSalesRevenue = orders
    .filter(o => o.status === 'Completed')
    .reduce((sum, o) => sum + o.total, 0);

  const verifiedCount = Object.values(taxVerifications).filter(Boolean).length;
  const allTaxVerified = verifiedCount === 4;

  const handleToggleVerification = (field: keyof typeof taxVerifications) => {
    setTaxVerifications(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleVerifyAllTaxFields = () => {
    const nextState = !allTaxVerified;
    setTaxVerifications({
      taxIdVerified: nextState,
      taxRateVerified: nextState,
      taxBaseVerified: nextState,
      fiscalAuditVerified: nextState,
    });
  };

  const handleOpenTaxVerification = () => {
    if (!selectedOrder) return;
    setTaxVerifications({
      taxIdVerified: false,
      taxRateVerified: false,
      taxBaseVerified: false,
      fiscalAuditVerified: false,
    });
    setIsTaxModalOpen(true);
  };

  const handleConfirmAndPrint = () => {
    if (!allTaxVerified || !selectedOrder) return;
    
    // Close modal first
    setIsTaxModalOpen(false);

    // Provide immediate user feedback and trigger native browser print dialogue
    setPrintSuccessToast(true);
    setTimeout(() => setPrintSuccessToast(false), 4000);

    // Brief timeout to ensure DOM modal is unmounted before native print dialog captures page view
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleSimulateEmailDispatch = () => {
    if (!selectedOrder) return;
    alert(`Secure Invoice PDF INV-${selectedOrder.id.split('-').pop()} dispatched successfully to registered customer email: ${selectedOrder.customerName || 'walkin-guest@nexus.com'}`);
  };

  // Helper to compute BNPL installment plans
  const generateInstallments = (totalAmount: number) => {
    const installmentAmount = totalAmount / 4;
    const today = new Date();
    return [
      { id: 1, dueDate: today.toLocaleDateString(), amount: installmentAmount, status: 'Paid (Initial)' },
      { id: 2, dueDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(), amount: installmentAmount, status: 'Scheduled' },
      { id: 3, dueDate: new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString(), amount: installmentAmount, status: 'Scheduled' },
      { id: 4, dueDate: new Date(today.getTime() + 42 * 24 * 60 * 60 * 1000).toLocaleDateString(), amount: installmentAmount, status: 'Scheduled' }
    ];
  };

  // Color configurations based on branding selections
  const presetColors = {
    midnight: {
      bg: 'bg-slate-900',
      text: 'text-slate-900',
      border: 'border-slate-900',
      fill: 'fill-slate-900',
      accent: 'bg-slate-100'
    },
    corporate: {
      bg: 'bg-indigo-950',
      text: 'text-indigo-900',
      border: 'border-indigo-900',
      fill: 'fill-indigo-900',
      accent: 'bg-indigo-50'
    },
    emerald: {
      bg: 'bg-emerald-950',
      text: 'text-emerald-900',
      border: 'border-emerald-900',
      fill: 'fill-emerald-900',
      accent: 'bg-emerald-50'
    }
  };

  const currentTheme = presetColors[invoiceColorPreset];

  return (
    <div className="space-y-6" id="invoice-module-root">
      {/* Print Success Notification Toast */}
      {printSuccessToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs font-bold">Tax Fields Verified Successfully</p>
            <p className="text-[10px] text-emerald-200">Native browser print dialogue initiated for invoice.</p>
          </div>
        </div>
      )}

      {/* Title section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" id="invoice-header">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Invoice & Billing Terminal</h1>
          <p className="text-sm text-gray-500 mt-1">Audit billing files, customize brand themes, and export compliance-verified fiscal tax invoices.</p>
        </div>
      </div>

      {/* Stats summary boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5" id="billing-stats-grid">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-1" id="billing-stat-revenue">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gross Transaction Invoicing</span>
          <div className="text-xl font-bold text-slate-900 font-mono">{formatAmount(totalSalesRevenue)}</div>
          <p className="text-[10px] text-gray-400">Total volume processed through secure channels</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-1" id="billing-stat-tax">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">VAT / GST Compliance Ledger</span>
          <div className="text-xl font-bold text-slate-900 font-mono">{formatAmount(totalTaxCollected)}</div>
          <p className="text-[10px] text-gray-400">Aggregated sales tax audits (8.5% standard in-store)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-1" id="billing-stat-compliance">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Audit Security Level</span>
          <div className="text-xl font-bold text-emerald-600 flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5 text-emerald-500" /> PCI-DSS & Tax Verified
          </div>
          <p className="text-[10px] text-gray-400">Pre-print fiscal validation active on all registers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="invoice-stage-split">
        {/* Left Side: Order Invoices table list (5 cols) */}
        <div className="xl:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4" id="invoices-list-panel">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Billing Log Ledger ({orders.length})</span>
              <p className="text-[10px] text-gray-400">Select transaction to inspect tax breakdown</p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">REALTIME</span>
          </div>

          <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1" id="invoices-scroller">
            {orders.map(order => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-3.5 rounded-2xl cursor-pointer border transition-all text-xs flex justify-between items-center ${
                  selectedOrder?.id === order.id 
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs' 
                    : 'border-gray-150 hover:bg-slate-50/50 bg-white'
                }`}
                id={`ledger-item-${order.id}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-slate-900">INV-{order.id.split('-').pop()}</span>
                    <span className="text-slate-400 font-mono text-[10px]">{new Date(order.date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-gray-600 font-medium truncate max-w-[150px]">{order.customerName || 'Walk-in Guest'}</div>
                  <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">{order.paymentMethod.split(' ')[0]}</span>
                </div>
                <div className="text-right space-y-1">
                  <span className="font-bold text-slate-900 block font-mono">{formatAmount(order.total)}</span>
                  <span className="text-[9px] text-indigo-600 font-bold flex items-center gap-0.5 justify-end">Inspect <ArrowUpRight className="w-2.5 h-2.5" /></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Customizable Branding Template (8 cols) */}
        <div className="xl:col-span-8 space-y-5" id="invoice-branding-playground">
          {/* Controls Bar for Branding */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center" id="branding-toolbox">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Settings className="w-4 h-4 text-slate-500" /> Branding Template Settings:
            </div>
            <div className="flex gap-2 items-center flex-wrap" id="presets-triggers">
              {/* Preset buttons */}
              <button
                onClick={() => setInvoiceColorPreset('midnight')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  invoiceColorPreset === 'midnight' ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-200 bg-white text-slate-700'
                }`}
              >
                Theme: Midnight
              </button>
              <button
                onClick={() => setInvoiceColorPreset('corporate')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  invoiceColorPreset === 'corporate' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-slate-700'
                }`}
              >
                Theme: Corporate
              </button>
              <button
                onClick={() => setInvoiceColorPreset('emerald')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  invoiceColorPreset === 'emerald' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 bg-white text-slate-700'
                }`}
              >
                Theme: Emerald
              </button>
            </div>
          </div>

          {selectedOrder ? (
            /* High Fidelity Invoice Canvas mockup */
            <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden flex flex-col justify-between" id="invoice-sheet-box">
              {/* Simulated Sheet Canvas */}
              <div className="p-6 sm:p-8 space-y-6" id="printable-invoice-sheet">
                
                {/* Invoice Custom Theme header bar */}
                <div className={`p-4 rounded-2xl text-white ${currentTheme.bg} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`} id="sheet-header">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-white text-slate-900 font-extrabold rounded flex items-center justify-center text-xs">N</div>
                      <span className="text-sm font-black tracking-wider uppercase">NEXUS GLOBAL LOGISTICS</span>
                    </div>
                    <p className="text-[10px] opacity-75">Corporate HQ: 100 Enterprise Way, London</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="text-xs font-extrabold block">OFFICIAL TAX INVOICE</span>
                    <span className="text-[9px] opacity-75 font-mono">Invoice Ref: INV-{selectedOrder.id.split('-').pop()}</span>
                  </div>
                </div>

                {/* Company and Bill to details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs border-b border-gray-100 pb-5" id="sheet-meta-grid">
                  <div className="space-y-1.5" id="company-meta-details">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Sender Legal Entity</span>
                    <p className="font-bold text-slate-900">Nexus Logistics Retail Ltd.</p>
                    <p className="text-gray-500">VAT Reg: <span className="font-mono text-slate-700 font-semibold">{companyTaxId}</span></p>
                    <p className="text-gray-500">Support Line: <span className="text-slate-700 font-semibold">{companyPhone}</span></p>
                  </div>

                  <div className="space-y-1.5" id="customer-meta-details">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Billed Customer Entity</span>
                    <p className="font-bold text-slate-900">{selectedOrder.customerName || 'Walk-in Cash Customer'}</p>
                    <p className="text-gray-500">Channel Origin: <span className="font-semibold text-slate-700 uppercase">{selectedOrder.channel}</span></p>
                    <p className="text-gray-500">Issue Date: <span className="font-mono text-slate-700">{new Date(selectedOrder.date).toLocaleString()}</span></p>
                  </div>
                </div>

                {/* Items grid */}
                <div className="space-y-3" id="sheet-items-table">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Acquisition Breakdown</span>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-gray-100 font-bold text-slate-500 text-[10px] uppercase">
                          <th className="px-4 py-2.5">Item Telemetry</th>
                          <th className="px-4 py-2.5 text-center">Qty</th>
                          <th className="px-4 py-2.5 text-right">Unit Price</th>
                          <th className="px-4 py-2.5 text-right">Aggregate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-slate-700">
                        {selectedOrder.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/40">
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-900 block">{item.productName}</span>
                              {item.variantSku && <span className="text-[10px] text-gray-400 font-mono">SKU: {item.variantSku}</span>}
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">{item.quantity}</td>
                            <td className="px-4 py-3 text-right font-mono">{formatAmount(item.price)}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatAmount(item.price * item.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pricing totals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3" id="sheet-totals-section">
                  <div className="space-y-1 text-xs" id="compliance-notations">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Regulatory Compliance Notes</span>
                    <p className="text-gray-400 leading-relaxed text-[11px]">Tax invoice processed in accordance with local corporate codes. Tax represents GST/VAT assessments compiled automatically at checkout gateway. Digital audit copies archived securely.</p>
                  </div>

                  <div className="space-y-2 text-xs border-t border-gray-100 md:border-t-0 pt-4 md:pt-0" id="prices-math">
                    <div className="flex justify-between items-center text-gray-500">
                      <span>Subtotal</span>
                      <span className="font-mono font-semibold text-slate-950">{formatAmount(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-500">
                      <span>VAT / GST Collected (8.5%)</span>
                      <span className="font-mono font-semibold text-slate-950">{formatAmount(selectedOrder.tax)}</span>
                    </div>
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between items-center text-emerald-700 font-medium">
                        <span>Campaign Discount</span>
                        <span className="font-mono font-bold">-{formatAmount(selectedOrder.discount)}</span>
                      </div>
                    )}
                    <div className={`flex justify-between items-center text-sm font-black border-t border-gray-100 pt-3 ${currentTheme.text}`}>
                      <span>Grand Total</span>
                      <span className="font-mono text-base">{formatAmount(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>

                {/* BNPL Installments Payment Schedule Section */}
                {selectedOrder.paymentMethod === 'Installments (Klarna/Afterpay)' && (
                  <div className="bg-amber-50/55 p-4 rounded-2xl border border-amber-200/50 space-y-3" id="bnpl-schedule-box">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Split installment payment schedule (BNPL)</span>
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase">Klarna Active</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs" id="installment-cards">
                      {generateInstallments(selectedOrder.total).map(plan => (
                        <div key={plan.id} className="bg-white p-2.5 rounded-xl border border-amber-100/50 space-y-1" id={`plan-item-${plan.id}`}>
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">Part {plan.id}</span>
                          <span className="font-mono font-bold text-slate-950 block">{formatAmount(plan.amount)}</span>
                          <div className="flex justify-between items-center text-[10px] pt-1 border-t border-gray-100/50">
                            <span className="text-gray-400 font-medium">{plan.dueDate}</span>
                            <span className={`font-bold ${plan.status.includes('Paid') ? 'text-emerald-600' : 'text-amber-600'}`}>{plan.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sheet actions footer */}
              <div className="bg-slate-50 p-4 border-t border-gray-150 flex flex-col sm:flex-row gap-2 justify-end" id="sheet-actions">
                <button
                  onClick={handleOpenTaxVerification}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 justify-center transition-all shadow-xs"
                  id="btn-print-tax-verified-invoice"
                  title="Verify tax compliance and print invoice"
                >
                  <Printer className="w-4 h-4" /> 
                  Print Tax Invoice (Verified)
                </button>
                <button
                  onClick={handleSimulateEmailDispatch}
                  className="px-4 py-2 bg-white border border-gray-250 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 justify-center transition-all"
                  id="btn-dispatch-invoice"
                >
                  <Send className="w-4 h-4 text-slate-500" /> Dispatch Digital Receipt
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400 text-xs" id="invoice-select-placeholder">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-500" />
              Select an invoice from log history ledger on the left to review and print custom tax templates.
            </div>
          )}
        </div>
      </div>

      {/* Pre-Print Tax Compliance Verification Dialog Modal */}
      {isTaxModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="tax-verification-modal-root">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsTaxModalOpen(false)}
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Pre-Print Tax Verification
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/30">
                      INV-{selectedOrder.id.split('-').pop()}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Verify all fiscal and statutory tax fields before opening native print dialog.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsTaxModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* Summary Status Banner */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Fiscal Audit Verification Status</span>
                    <span className="text-[11px] text-gray-500">
                      {verifiedCount} of 4 mandatory fields checked
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyAllTaxFields}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all"
                >
                  {allTaxVerified ? 'Uncheck All' : 'Verify All Fields'}
                </button>
              </div>

              {/* Interactive Tax Field Checklists */}
              <div className="space-y-3">
                
                {/* 1. Tax ID Verification */}
                <div 
                  onClick={() => handleToggleVerification('taxIdVerified')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    taxVerifications.taxIdVerified
                      ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                  id="tax-verify-taxid"
                >
                  <div className="pt-0.5">
                    {taxVerifications.taxIdVerified ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900">1. Legal Entity & VAT Identification</span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {companyTaxId}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Verify that the registered company VAT / Tax registration number matches official records.
                    </p>
                  </div>
                </div>

                {/* 2. Tax Rate & Jurisdiction Verification */}
                <div 
                  onClick={() => handleToggleVerification('taxRateVerified')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    taxVerifications.taxRateVerified
                      ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                  id="tax-verify-taxrate"
                >
                  <div className="pt-0.5">
                    {taxVerifications.taxRateVerified ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900">2. Statutory Tax Rate & Computed Tax</span>
                      <span className="text-xs font-mono font-bold text-emerald-700">
                        {formatAmount(selectedOrder.tax)} (8.50%)
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Confirm the standard 8.5% VAT/GST sales tax rate and aggregate tax computation are accurate.
                    </p>
                  </div>
                </div>

                {/* 3. Taxable Base & Exemption Breakdown */}
                <div 
                  onClick={() => handleToggleVerification('taxBaseVerified')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    taxVerifications.taxBaseVerified
                      ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                  id="tax-verify-taxbase"
                >
                  <div className="pt-0.5">
                    {taxVerifications.taxBaseVerified ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900">3. Taxable Base & Item Line Deductions</span>
                      <span className="text-xs font-mono font-bold text-slate-800">
                        Net: {formatAmount(selectedOrder.subtotal - selectedOrder.discount)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Gross subtotal {formatAmount(selectedOrder.subtotal)} minus discounts ({formatAmount(selectedOrder.discount)}) correctly yields net taxable base.
                    </p>
                  </div>
                </div>

                {/* 4. Fiscal Audit Ledger & Customer Entity */}
                <div 
                  onClick={() => handleToggleVerification('fiscalAuditVerified')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    taxVerifications.fiscalAuditVerified
                      ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                  id="tax-verify-audit"
                >
                  <div className="pt-0.5">
                    {taxVerifications.fiscalAuditVerified ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900">4. Fiscal Audit Hash & Billed Entity</span>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase">
                        {selectedOrder.paymentMethod.split(' ')[0]}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Entity ({selectedOrder.customerName || 'Walk-in Cash Guest'}), channel origin ({selectedOrder.channel}), and digital audit hash validated.
                    </p>
                  </div>
                </div>

              </div>

              {/* Warning Notice if incomplete */}
              {!allTaxVerified && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-amber-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Please check and verify all 4 statutory tax compliance items to unlock native printing.</span>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsTaxModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAndPrint}
                disabled={!allTaxVerified}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm ${
                  allTaxVerified
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer hover:shadow-indigo-500/25'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
                id="btn-confirm-and-open-print-dialogue"
              >
                <Printer className="w-4 h-4" />
                {allTaxVerified ? 'Confirm & Open Native Print Dialogue' : `Verify All Fields (${verifiedCount}/4)`}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
