import React from 'react';
import { 
  CreditCard, Bell, Shield, Cpu, 
  ToggleLeft, ToggleRight, ArrowRight, ArrowLeft, Lock
} from 'lucide-react';
import { SystemSettings, StaffMember, PaymentMethod, StaffRole } from '../../../types';
import { SettingsSection } from '../SettingsNav';

interface SystemAndSecuritySectionsProps {
  activeSection: SettingsSection;
  formData: SystemSettings;
  updateSection: <K extends keyof SystemSettings>(section: K, values: Partial<SystemSettings[K]>) => void;
  onNavigateSection: (nextSection: SettingsSection) => void;
  activeStaff: StaffMember;
}

export default function SystemAndSecuritySections({
  activeSection,
  formData,
  updateSection,
  onNavigateSection,
  activeStaff
}: SystemAndSecuritySectionsProps) {

  // ====================================================
  // 11. PAYMENT METHODS
  // ====================================================
  if (activeSection === 'payments') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-xs space-y-6" id="settings-section-payments">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Payment Methods & Surcharge Rules</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Activate accepted checkout tenders, contactless cards and mobile money.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Default Active POS Payment Tab</label>
            <select
              value={formData.paymentMethods.defaultMethod}
              onChange={(e) => updateSection('paymentMethods', { defaultMethod: e.target.value as PaymentMethod })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="Cash">Cash Currency Tender</option>
              <option value="Credit/Debit Card">Credit/Debit Card (POS Terminal)</option>
              <option value="Digital Wallet">Digital Wallet (Apple/Google Pay NFC)</option>
              <option value="Mobile Pay">Mobile Pay (Orange Money/Afrimoney)</option>
              <option value="Bank Transfer">Direct Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Credit Card Surcharge % (Optional)</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={formData.paymentMethods.cardSurchargePercent}
                onChange={(e) => updateSection('paymentMethods', { cardSurchargePercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">%</span>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Money Telecom Providers</label>
            <input
              type="text"
              value={formData.paymentMethods.mobileMoneyProvider}
              onChange={(e) => updateSection('paymentMethods', { mobileMoneyProvider: e.target.value })}
              placeholder="Orange Money / Afrimoney / M-Pesa / MoMo"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Tenders Matrix */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <label className="block text-xs font-bold text-slate-800">Accepted Payment Gateways & Rails</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { key: 'cashEnabled', title: 'Cash Physical Tender', desc: 'Accept notes and calculate automated change.' },
              { key: 'cardEnabled', title: 'Card / POS Chip & PIN', desc: 'Accept Visa, Mastercard and national chip cards.' },
              { key: 'digitalWalletEnabled', title: 'Contactless NFC Wallet', desc: 'Apple Pay, Google Pay and smartwatch tap.' },
              { key: 'mobileMoneyEnabled', title: 'Mobile Money Gateway', desc: 'Orange Money, Afrimoney, M-Pesa QR codes.' },
              { key: 'bankTransferEnabled', title: 'Wire & Bank Transfer', desc: 'Direct corporate B2B wire payment.' },
              { key: 'installmentsEnabled', title: 'Buy Now Pay Later (BNPL)', desc: 'Split payments via Klarna/Afterpay rails.' },
            ].map((p) => {
              const enabled = (formData.paymentMethods as any)[p.key] ?? true;
              return (
                <div 
                  key={p.key}
                  className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3 min-h-[56px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900">{p.title}</div>
                    <div className="text-[10px] text-gray-500 truncate">{p.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSection('paymentMethods', { [p.key]: !enabled })}
                    className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
                  >
                    {enabled ? (
                      <ToggleRight className="w-8 h-8 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-300" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigateSection('delivery')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('notifications')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next: Notifications</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // 12. NOTIFICATIONS & ALERTS
  // ====================================================
  if (activeSection === 'notifications') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-xs space-y-6" id="settings-section-notifications">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Notifications, Email & SMS Alerts</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Automated supervisor alerts, customer email receipts and daily closing digests.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Supervisor Notification Email</label>
            <input
              type="email"
              value={formData.notifications.notificationEmail}
              onChange={(e) => updateSection('notifications', { notificationEmail: e.target.value })}
              placeholder="manager@nexuscommerce.io"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Emergency SMS Broadcast Phone</label>
            <input
              type="text"
              value={formData.notifications.smsPhone}
              onChange={(e) => updateSection('notifications', { smsPhone: e.target.value })}
              placeholder="+232 (76) 555-0199"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <label className="block text-xs font-bold text-slate-800">Automated Dispatch Triggers</label>
          <div className="space-y-2">
            {[
              { key: 'emailNotificationsEnabled', label: 'Master Email System Dispatcher', desc: 'Enable central SMTP/Resend transactional email delivery pipeline.' },
              { key: 'notifyOnNewOrder', label: 'Instant New Order Notification', desc: 'Send email notification when an online or high-value order is completed.' },
              { key: 'notifyOnLowStock', label: 'Inventory Low-Stock Warning Alert', desc: 'Dispatch daily alert email when stock dips below critical thresholds.' },
              { key: 'notifyOnRefund', label: 'Merchandise Refund Security Alert', desc: 'Notify store owner when any cashier executes an order refund.' },
              { key: 'dailySalesReport', label: 'Automated Daily Sales Closing Report', desc: 'Email End-of-Day shift audit digest at 23:59 each evening.' },
              { key: 'smsAlertsEnabled', label: 'SMS Gateway Dispatch', desc: 'Send urgent SMS notifications via Twilio/AfricaTalking gateway.' },
            ].map((item) => {
              const active = (formData.notifications as any)[item.key] ?? false;
              return (
                <div key={item.key} className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3 min-h-[56px]">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900">{item.label}</div>
                    <div className="text-[11px] text-gray-500 truncate">{item.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSection('notifications', { [item.key]: !active })}
                    className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
                  >
                    {active ? (
                      <ToggleRight className="w-8 h-8 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-300" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigateSection('payments')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('security')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next: Security</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // 13. USER ROLES & SECURITY
  // ====================================================
  if (activeSection === 'security') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-xs space-y-6" id="settings-section-security">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>User Roles, PINs & Security Policies</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Master supervisor PIN, session auto-lock and role provisioning standards.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Master Supervisor Override PIN</label>
            <input
              type="password"
              maxLength={6}
              value={formData.userRolesSecurity.supervisorPin}
              onChange={(e) => updateSection('userRolesSecurity', { supervisorPin: e.target.value })}
              placeholder="1234"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono font-bold tracking-widest focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
            <p className="text-[10px] text-gray-400 mt-1">Used for approving discounts and refunds.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Session Inactivity Lockout</label>
            <select
              value={formData.userRolesSecurity.sessionTimeoutMinutes}
              onChange={(e) => updateSection('userRolesSecurity', { sessionTimeoutMinutes: parseInt(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value={5}>5 Minutes</option>
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={60}>60 Minutes</option>
              <option value={0}>Disabled (Never lock)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Default New Staff Role</label>
            <select
              value={formData.userRolesSecurity.defaultNewStaffRole}
              onChange={(e) => updateSection('userRolesSecurity', { defaultNewStaffRole: e.target.value as StaffRole })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="Cashier">Cashier</option>
              <option value="Inventory Manager">Inventory Manager</option>
              <option value="Store Manager">Store Manager</option>
              <option value="Warehouse Staff">Warehouse Staff</option>
              <option value="Accountant">Accountant</option>
              <option value="Viewer">Viewer (Read-Only)</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200 gap-3 min-h-[56px]">
            <div>
              <span className="text-xs font-bold text-slate-800">Require PIN Verification on Cashier Switch</span>
              <p className="text-[11px] text-gray-500">Staff members must enter their 4-digit PIN when switching active register operators.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSection('userRolesSecurity', { requirePinOnCashierSwitch: !formData.userRolesSecurity.requirePinOnCashierSwitch })}
              className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              {formData.userRolesSecurity.requirePinOnCashierSwitch ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200 gap-3 min-h-[56px]">
            <div>
              <span className="text-xs font-bold text-slate-800">Two-Factor Authentication (2FA) Enforcement</span>
              <p className="text-[11px] text-gray-500">Enforce OTP authenticator verification for Store Manager and Super Admin logins.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSection('userRolesSecurity', { twoFactorAuthEnforced: !formData.userRolesSecurity.twoFactorAuthEnforced })}
              className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              {formData.userRolesSecurity.twoFactorAuthEnforced ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigateSection('notifications')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('integrations')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next: Integrations</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // 14. INTEGRATIONS & APIS
  // ====================================================
  if (activeSection === 'integrations') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-xs space-y-6" id="settings-section-integrations">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Integrations, Hardware & Webhooks</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Barcode scanner interfaces, accounting format export, webhooks and AI.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Hardware Barcode Scanner Driver Mode</label>
            <select
              value={formData.integrations.barcodeScannerMode}
              onChange={(e) => updateSection('integrations', { barcodeScannerMode: e.target.value as any })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="hid_keyboard">USB / Bluetooth HID Keyboard Wedge (Default)</option>
              <option value="serial_usb">Serial COM / WebUSB Hardware Port</option>
              <option value="camera_optical">Camera Optical Laser Scanner (Built-in)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Accounting Export Data Format</label>
            <select
              value={formData.integrations.accountingExportFormat}
              onChange={(e) => updateSection('integrations', { accountingExportFormat: e.target.value as any })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="QuickBooks">Intuit QuickBooks Online (IIF / CSV)</option>
              <option value="Xero">Xero Accounting General Ledger</option>
              <option value="Generic CSV">Standard ERP Generic CSV Ledger</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Outbound Event Webhook Endpoint</label>
            <input
              type="url"
              value={formData.integrations.webhookUrl}
              onChange={(e) => updateSection('integrations', { webhookUrl: e.target.value })}
              placeholder="https://api.nexuscommerce.io/v1/webhooks/orders"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
            <p className="text-[10px] text-gray-400 mt-1">Sends JSON payloads on order checkout, stock replenishment and customer registration.</p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Network Thermal Printer IP / Port</label>
            <input
              type="text"
              value={formData.integrations.thermalPrinterIp}
              onChange={(e) => updateSection('integrations', { thermalPrinterIp: e.target.value })}
              placeholder="192.168.1.120:9100"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200 gap-3 min-h-[56px]">
            <div>
              <span className="text-xs font-bold text-slate-800">Cloud Firestore Live Replication</span>
              <p className="text-[11px] text-gray-500">Enable real-time distributed sync between offline local registers and central cloud.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSection('integrations', { cloudSyncEnabled: !formData.integrations.cloudSyncEnabled })}
              className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              {formData.integrations.cloudSyncEnabled ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200 gap-3 min-h-[56px]">
            <div>
              <span className="text-xs font-bold text-slate-800">Gemini AI Smart Commerce Assistant</span>
              <p className="text-[11px] text-gray-500">Power automated stock forecasts, smart discount suggestions and customer CRM insights.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSection('integrations', { geminiAiCommerceEnabled: !formData.integrations.geminiAiCommerceEnabled })}
              className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              {formData.integrations.geminiAiCommerceEnabled ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigateSection('security')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <div className="text-[11px] font-bold text-emerald-600">
            ✓ Final Section
          </div>
        </div>
      </div>
    );
  }

  return null;
}
