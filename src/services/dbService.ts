import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  writeBatch,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Product, Customer, StaffMember, Order, AuditLog, SystemSettings } from '../types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_STAFF, 
  INITIAL_ORDERS, 
  INITIAL_AUDIT_LOGS 
} from '../data/mockData';

// Firestore collection names
export const COLLECTIONS = {
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  STAFF: 'staff',
  ORDERS: 'orders',
  AUDIT_LOGS: 'audit_logs',
  SETTINGS: 'settings',
  SHIFT_REPORTS: 'shift_reports'
} as const;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  // Transient tab state errors (iframe reloading, tab visibility toggles) are non-critical
  if (errMsg.includes('closing') || errMsg.includes('hidden') || errMsg.includes('IndexedDatabase')) {
    console.info('Firestore storage transition:', errMsg);
  } else {
    console.warn('Firestore Status:', JSON.stringify(errInfo));
  }
  return errInfo;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  currency: 'SLE',
  businessName: 'Nexus Enterprise Commerce',
  taxRate: 0.085,
  enableSoundEffects: true,
  lowStockThreshold: 10,

  business: {
    companyName: 'Nexus Enterprise Commerce',
    legalName: 'Nexus Retail & POS Global LLC',
    tagline: 'Point-of-Sale Terminal & Multi-Channel Commerce Suite',
    registrationNumber: 'REG-2026-994821',
    taxId: 'VAT-SL-88492019-TX',
    phone: '+232 (76) 555-NEXUS',
    email: 'support@nexuscommerce.io',
    website: 'https://nexuspos.io',
    address: '450 Rawdon Street, Suite 800',
    city: 'Freetown',
    state: 'Western Area',
    postalCode: '00232',
    country: 'Sierra Leone',
    logoUrl: '',
    timeZone: 'GMT (UTC+0)',
  },

  currencyConfig: {
    primaryCurrency: 'SLE',
    symbolPosition: 'prefix',
    spaceBetween: true,
    decimalPlaces: 2,
    multiCurrencyCheckout: true,
    autoUpdateRates: true,
  },

  tax: {
    defaultTaxRate: 8.5,
    taxName: 'GST / Sales Tax',
    taxCalculation: 'exclusive',
    allowTaxExemption: true,
    taxRegistrationNumber: 'VAT-SL-88492019-TX',
    enableSecondaryTax: false,
    secondaryTaxRate: 2.5,
    secondaryTaxName: 'Municipal Surcharge',
  },

  receipt: {
    printerType: 'thermal-80mm',
    headerText: 'THANK YOU FOR VISITING NEXUS',
    footerText: 'Please retain receipt for exchange within 30 days',
    returnPolicy: 'Items may be exchanged or returned with valid receipt within 30 days of purchase in original packaging.',
    showLogo: true,
    showCashierName: true,
    showCustomerInfo: true,
    showBarcode: true,
    showQrCode: true,
    autoPrintOnCheckout: true,
    autoEmailReceipt: true,
  },

  invoiceNumbering: {
    invoicePrefix: 'INV-',
    nextInvoiceNumber: 1001,
    digitPadding: 5,
    includeYearMonth: true,
    resetSequence: 'yearly',
    creditNotePrefix: 'CN-',
    quotePrefix: 'QTE-',
  },

  pos: {
    terminalName: 'Register #01 - Main Checkout Counter',
    enableSoundEffects: true,
    defaultCustomerName: 'Walk-in Guest',
    quickCashPresets: [10, 20, 50, 100, 500, 1000],
    requireManagerPinForDiscount: true,
    maxDiscountWithoutPin: 15,
    requireManagerPinForRefund: true,
    allowPriceOverride: false,
    autoOpenCashDrawer: true,
    fastBarcodeAdd: true,
    maxParkedCarts: 12,
  },

  inventoryRules: {
    preventNegativeStock: true,
    trackVariants: true,
    stockDeductionTiming: 'on_checkout',
    valuationMethod: 'FIFO',
    enforceStockAudit: true,
    autoBatchTracking: true,
  },

  lowStock: {
    globalLowStockThreshold: 10,
    criticalStockThreshold: 3,
    notifyOnLowStock: true,
    autoGenerateReorderDrafts: true,
    defaultReorderMultiplier: 2.5,
  },

  order: {
    orderPrefix: 'ORD-',
    minOrderValue: 0,
    enabledChannels: {
      pos: true,
      ecom: true,
      mobile: true,
      phone: true,
    },
    autoArchiveDays: 90,
    defaultOrderStatus: 'Completed',
    allowOrderNotes: true,
  },

  delivery: {
    enableLocalDelivery: true,
    enableStorePickup: true,
    defaultDeliveryFee: 15.00,
    freeDeliveryThreshold: 150.00,
    estimatedDeliveryDays: '1-2 Business Days',
    selectedCarrier: 'In-House Express Dispatch',
    deliveryZones: [
      { id: 'zone-1', name: 'Downtown / Central District', fee: 10.00, zipCodes: '00232, 00233' },
      { id: 'zone-2', name: 'Greater Metro Area', fee: 20.00, zipCodes: '00234, 00235, 00236' },
      { id: 'zone-3', name: 'Regional Express', fee: 35.00, zipCodes: '00240, 00250' },
    ],
  },

  paymentMethods: {
    cashEnabled: true,
    cardEnabled: true,
    digitalWalletEnabled: true,
    mobileMoneyEnabled: true,
    bankTransferEnabled: true,
    installmentsEnabled: false,
    defaultMethod: 'Cash',
    cardSurchargePercent: 0,
    mobileMoneyProvider: 'Orange Money / Afrimoney / M-Pesa',
  },

  notifications: {
    emailNotificationsEnabled: true,
    notificationEmail: 'manager@nexuscommerce.io',
    notifyOnNewOrder: true,
    notifyOnLowStock: true,
    notifyOnRefund: true,
    dailySalesReport: true,
    smsAlertsEnabled: false,
    smsPhone: '+232 (76) 555-0199',
  },

  userRolesSecurity: {
    supervisorPin: '1234',
    sessionTimeoutMinutes: 30,
    requirePinOnCashierSwitch: true,
    defaultNewStaffRole: 'Cashier',
    twoFactorAuthEnforced: false,
    lockoutAfterFailedAttempts: 5,
  },

  integrations: {
    barcodeScannerMode: 'hid_keyboard',
    accountingExportFormat: 'QuickBooks',
    cloudSyncEnabled: true,
    webhookUrl: 'https://api.nexuscommerce.io/v1/webhooks/orders',
    geminiAiCommerceEnabled: true,
    thermalPrinterIp: '192.168.1.120:9100',
  },
};

/**
 * Seeds initial database data into Firestore if collections are empty.
 */
export async function seedInitialFirestoreData(): Promise<{ seeded: boolean; message: string }> {
  try {
    const productsSnap = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
    if (!productsSnap.empty) {
      return { seeded: false, message: 'Firestore already populated.' };
    }

    console.info('Database ready. Seeding initial Firestore collections...');
    const batch = writeBatch(db);

    // Seed products
    INITIAL_PRODUCTS.forEach(p => {
      const pRef = doc(db, COLLECTIONS.PRODUCTS, p.id);
      batch.set(pRef, p);
    });

    // Seed customers
    INITIAL_CUSTOMERS.forEach(c => {
      const cRef = doc(db, COLLECTIONS.CUSTOMERS, c.id);
      batch.set(cRef, c);
    });

    // Seed staff
    INITIAL_STAFF.forEach(s => {
      const sRef = doc(db, COLLECTIONS.STAFF, s.id);
      batch.set(sRef, s);
    });

    // Seed initial orders
    INITIAL_ORDERS.forEach(o => {
      const oRef = doc(db, COLLECTIONS.ORDERS, o.id);
      batch.set(oRef, o);
    });

    // Seed audit logs
    INITIAL_AUDIT_LOGS.forEach(a => {
      const aRef = doc(db, COLLECTIONS.AUDIT_LOGS, a.id);
      batch.set(aRef, a);
    });

    // Seed settings (SLE default currency)
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'general');
    batch.set(settingsRef, {
      ...DEFAULT_SETTINGS,
      lastUpdated: new Date().toISOString()
    });

    await batch.commit();
    return { seeded: true, message: 'Initial data seeded into Firestore.' };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.PRODUCTS);
    return { seeded: false, message: `Local offline mode active.` };
  }
}

/**
 * Product Database Operations
 */
export function subscribeProducts(onUpdate: (products: Product[]) => void, onError?: (err: any) => void) {
  const colRef = collection(db, COLLECTIONS.PRODUCTS);
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const prods: Product[] = [];
      snapshot.forEach(docSnap => {
        prods.push(docSnap.data() as Product);
      });
      onUpdate(prods);
    } else {
      onUpdate([]);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.PRODUCTS);
    if (onError) onError(err);
  });
}

export async function saveProductToDB(product: Product): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.PRODUCTS, product.id);
    await setDoc(docRef, product, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.PRODUCTS}/${product.id}`);
  }
}

export async function deleteProductFromDB(productId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.PRODUCTS}/${productId}`);
  }
}

/**
 * Customer Database Operations
 */
export function subscribeCustomers(onUpdate: (customers: Customer[]) => void, onError?: (err: any) => void) {
  const colRef = collection(db, COLLECTIONS.CUSTOMERS);
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const custs: Customer[] = [];
      snapshot.forEach(docSnap => {
        custs.push(docSnap.data() as Customer);
      });
      onUpdate(custs);
    } else {
      onUpdate([]);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.CUSTOMERS);
    if (onError) onError(err);
  });
}

export async function saveCustomerToDB(customer: Customer): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, customer.id);
    await setDoc(docRef, customer, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.CUSTOMERS}/${customer.id}`);
  }
}

export async function deleteCustomerFromDB(customerId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, customerId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.CUSTOMERS}/${customerId}`);
  }
}

/**
 * Order Database Operations
 */
export function subscribeOrders(onUpdate: (orders: Order[]) => void, onError?: (err: any) => void) {
  const colRef = collection(db, COLLECTIONS.ORDERS);
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const ordersList: Order[] = [];
      snapshot.forEach(docSnap => {
        ordersList.push(docSnap.data() as Order);
      });
      // Sort newest first
      ordersList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(ordersList);
    } else {
      onUpdate([]);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.ORDERS);
    if (onError) onError(err);
  });
}

export async function saveOrderToDB(order: Order): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.ORDERS, order.id);
    await setDoc(docRef, order);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.ORDERS}/${order.id}`);
  }
}

/**
 * Staff Database Operations
 */
export function subscribeStaff(onUpdate: (staff: StaffMember[]) => void, onError?: (err: any) => void) {
  const colRef = collection(db, COLLECTIONS.STAFF);
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const staffList: StaffMember[] = [];
      snapshot.forEach(docSnap => {
        staffList.push(docSnap.data() as StaffMember);
      });
      onUpdate(staffList);
    } else {
      onUpdate([]);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.STAFF);
    if (onError) onError(err);
  });
}

export async function saveStaffToDB(staff: StaffMember): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.STAFF, staff.id);
    await setDoc(docRef, staff, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.STAFF}/${staff.id}`);
  }
}

export async function deleteStaffFromDB(staffId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.STAFF, staffId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.STAFF}/${staffId}`);
  }
}

/**
 * Audit Logs Database Operations
 */
export function subscribeAuditLogs(onUpdate: (logs: AuditLog[]) => void, onError?: (err: any) => void) {
  const colRef = collection(db, COLLECTIONS.AUDIT_LOGS);
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const logsList: AuditLog[] = [];
      snapshot.forEach(docSnap => {
        logsList.push(docSnap.data() as AuditLog);
      });
      logsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(logsList);
    } else {
      onUpdate([]);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.AUDIT_LOGS);
    if (onError) onError(err);
  });
}

export async function saveAuditLogToDB(log: AuditLog): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.AUDIT_LOGS, log.id);
    await setDoc(docRef, log);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.AUDIT_LOGS}/${log.id}`);
  }
}

/**
 * Settings & Currency Database Operations
 */
export function subscribeSettings(onUpdate: (settings: SystemSettings) => void, onError?: (err: any) => void) {
  const docRef = doc(db, COLLECTIONS.SETTINGS, 'general');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<SystemSettings>;
      const merged: SystemSettings = {
        ...DEFAULT_SETTINGS,
        ...data,
        business: { ...DEFAULT_SETTINGS.business, ...(data.business || {}) },
        currencyConfig: { ...DEFAULT_SETTINGS.currencyConfig, ...(data.currencyConfig || {}) },
        tax: { ...DEFAULT_SETTINGS.tax, ...(data.tax || {}) },
        receipt: { ...DEFAULT_SETTINGS.receipt, ...(data.receipt || {}) },
        invoiceNumbering: { ...DEFAULT_SETTINGS.invoiceNumbering, ...(data.invoiceNumbering || {}) },
        pos: { ...DEFAULT_SETTINGS.pos, ...(data.pos || {}) },
        inventoryRules: { ...DEFAULT_SETTINGS.inventoryRules, ...(data.inventoryRules || {}) },
        lowStock: { ...DEFAULT_SETTINGS.lowStock, ...(data.lowStock || {}) },
        order: { ...DEFAULT_SETTINGS.order, ...(data.order || {}) },
        delivery: { ...DEFAULT_SETTINGS.delivery, ...(data.delivery || {}) },
        paymentMethods: { ...DEFAULT_SETTINGS.paymentMethods, ...(data.paymentMethods || {}) },
        notifications: { ...DEFAULT_SETTINGS.notifications, ...(data.notifications || {}) },
        userRolesSecurity: { ...DEFAULT_SETTINGS.userRolesSecurity, ...(data.userRolesSecurity || {}) },
        integrations: { ...DEFAULT_SETTINGS.integrations, ...(data.integrations || {}) },
      };
      onUpdate(merged);
    } else {
      onUpdate(DEFAULT_SETTINGS);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, `${COLLECTIONS.SETTINGS}/general`);
    if (onError) onError(err);
  });
}

export async function saveSettingsToDB(settings: Partial<SystemSettings>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'general');
    await setDoc(docRef, {
      ...settings,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.SETTINGS}/general`);
  }
}
