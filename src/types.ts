import type { CanonicalProduct, CanonicalVariant, ProductSku, PackagingUnitInfo, LegacyProductInput } from './domain/product/types';
export type { CanonicalProduct, CanonicalVariant, ProductSku, PackagingUnitInfo, LegacyProductInput };

export type StaffRole = 
  | 'Super Admin'
  | 'Business Owner'
  | 'Inventory Manager'
  | 'Warehouse Manager'
  | 'Cashier'
  | 'Sales Manager'
  | 'Purchasing Officer'
  | 'Accountant'
  | 'Store Manager'
  | 'E-commerce Manager'
  | 'Admin'
  | 'Manager'
  | 'Warehouse Staff'
  | 'Viewer';

export type PermissionCategory = 
  | 'inventory'
  | 'sales'
  | 'purchase'
  | 'finance'
  | 'crm'
  | 'ecommerce'
  | 'users'
  | 'system';

export type PermissionKey =
  // Inventory
  | 'inventory.view'
  | 'inventory.create'
  | 'inventory.edit'
  | 'inventory.delete'
  | 'inventory.adjust'
  | 'inventory.transfer'
  | 'inventory.reorder'
  // Sales & POS
  | 'sales.view'
  | 'sales.create'
  | 'sales.discount'
  | 'sales.refund'
  | 'sales.hold'
  | 'sales.shift'
  // Purchasing
  | 'purchase.view'
  | 'purchase.create'
  | 'purchase.approve'
  | 'purchase.receive'
  // Finance & Invoicing
  | 'finance.view'
  | 'finance.invoices'
  | 'finance.export'
  | 'finance.reports'
  // CRM & Customers
  | 'crm.view'
  | 'crm.manage'
  | 'crm.loyalty'
  | 'crm.marketing'
  | 'crm.support'
  // E-commerce
  | 'ecommerce.view'
  | 'ecommerce.manage'
  | 'ecommerce.fulfillment'
  // Users & Staff
  | 'users.view'
  | 'users.manage'
  | 'users.roles'
  | 'users.audit'
  | 'users.unlock'
  // System & Settings
  | 'system.settings'
  | 'system.sync';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  category: PermissionCategory;
  description: string;
  isDestructive?: boolean;
}

export interface RoleConfig {
  role: StaffRole;
  title: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  defaultPermissions: PermissionKey[];
}

export interface ProductVariant {
  sku: string;
  size?: string;
  color?: string;
  model?: string;
  optionName?: string;
  stock: number;
  costPrice?: number;
  retailPrice?: number;
  wholesalePrice?: number;
  barcode?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface ProductReview {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
  verifiedPurchase?: boolean;
}

export interface CouponCode {
  code: string;
  discountType: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minSpend?: number;
  description: string;
}

export type ProductType = 'Standard' | 'Composite' | 'Bundle' | 'Service' | 'Digital' | 'Rental' | 'Variant' | 'Physical';
export type ProductStatus = 'Active' | 'Draft' | 'Archived';
export type TrackingMode = 'QUANTITY' | 'SERIAL' | 'BATCH' | 'NONE';
export type RotationMethod = 'FIFO' | 'FEFO' | 'LIFO' | 'MANUAL';

export interface CompositeComponentItem {
  id?: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  currentStock: number;
  imageUrl?: string;
}

export interface BundleKitItem {
  id?: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  currentStock: number;
  imageUrl?: string;
}

export interface BulkPackagingConfig {
  outerPackageType: string;
  itemsPerPackage: number;
  outerPackageCost: number;
  unitCost: number;
  unitRetailPrice: number;
  dozenRetailPrice: number;
  outerPackageRetailPrice: number;
  allowDozenSale?: boolean;
  allowPackageSale?: boolean;
}

export interface PackagingUnitsConfig {
  base_unit: string;
  multiplier: number;
  outerPackageType?: string;
  outerPackageCost?: number;
  units?: PackagingUnit[];
}

export interface ProductEcommerce {
  published?: boolean;
  category?: string;
  seoTitle?: string;
  seoDescription?: string;
  slug?: string;
  featured?: boolean;
  enableReviews?: boolean;
  summary?: string;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
}

export interface ExtractedProductInfo {
  name?: string;
  brand?: string;
  model?: string;
  category?: string;
  description?: string;
  shortSummary?: string;
  sku?: string;
  barcode?: string;
  countryOfOrigin?: string;
  confidenceScore?: number;
  features?: string[];
  detectedTextRaw?: string[];
  suggestedCost?: number;
  suggestedPrice?: number;
  suggestedWholesalePrice?: number;
  suggestedStock?: number;
  specifications?: Record<string, string>;
  variants?: any[];
  unit?: string;
}

export interface ProductPhotoAngle {
  id: string;
  side: string;
  label: string;
  dataUrl: string;
  base64: string;
  mimeType: string;
  fileName: string;
  capturedAt: string;
}

export interface ProductComponentItem {
  id?: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  currentStock: number;
  imageUrl?: string;
}

export interface PackagingTier {
  id: string;
  name: string; // e.g. "Single Piece", "Half Dozen", "One Dozen", "Full Box / Carton"
  unitQuantity: number; // e.g. 1, 6, 12, 30
  barcode?: string;
  sellingPrice: number; // e.g. 4, 23, 45, 105
  isDefaultPurchaseUnit?: boolean;
  isDefaultSellingUnit?: boolean;
}

export interface PackagingUnit {
  id: string;
  unitName: string; // e.g. "box_of_30_bars", "Box of 30", "Piece (Retail Unit)"
  multiplier: number; // e.g. 30, 1
  base_unit: string; // e.g. "piece", "bar", "can", "bottle"
  barcode?: string;
  sku?: string;
  sellingPrice: number; // Retail selling price for this pack or unit (e.g. 105.00 for box, 4.00 for piece)
  costPrice?: number;
  isDefaultSellingUnit?: boolean; // Default for Retail Unit
  isPackUnit?: boolean; // Identifies full package/carton pack
  sellingMode?: 'retail_unit' | 'pack_selling';
}

export interface ProductPackagingConfig {
  hasPackaging: boolean;
  purchasePackagingName: string; // e.g. "Box", "Carton", "Pack", "Case", "Sack", "Crate"
  unitsPerPackage: number; // e.g. 30 pcs per box
  packageCost: number; // e.g. 75.00
  calculatedUnitCost: number; // e.g. 2.50
  baseSellingUnitName: string; // e.g. "Piece", "Bar", "Can", "Bottle", "Unit"
  base_unit?: string; // alias/standard field for base unit (e.g. "piece")
  multiplier?: number; // alias/standard multiplier (e.g. 30)
  
  // The Two Primary Inventory Management Methods:
  // 'auto_depackage': Automatic de-packaging (auto-unpack on receipt). All cartons converted directly into total loose units.
  // 'dual_stock': Dual Stocking (Sealed Cartons in warehouse + Loose Units on shelf).
  inventoryTrackingMode: 'auto_depackage' | 'dual_stock';
  
  // For dual_stock mode:
  sealedPackageStock: number; // e.g. 10 Boxes
  looseUnitStock: number; // e.g. 15 Pieces
  
  // Multi-tier selling packages:
  sellingTiers: PackagingTier[];

  // Explicit PackagingUnits definition supporting multiplier & base_unit
  packagingUnits?: PackagingUnit[];
}

export interface ProductMediaItem {
  id: string;
  url: string;
  isPrimary: boolean;
  variantTag?: string;
  caption?: string;
}

export interface ProductSpecificationItem {
  id: string;
  key: string;
  value: string;
}

export interface ProductPricingTiers {
  costPrice: number;
  retailPrice: number;
  wholesalePrice?: number;
  minimumPrice?: number;
}

export interface ProductInventoryRules {
  trackInventory: boolean;
  trackSerial: boolean;
  trackBatch: boolean;
  trackExpiry: boolean;
  unit: string;
  reorderLevel: number;
  serialNumbers?: string[];
  batchLot?: string;
  expiryDate?: string;
}

export interface ProductEcommerceConfig {
  publishOnline: boolean;
  category?: string;
  seoTitle?: string;
  seoDescription?: string;
  urlSlug?: string;
  isFeatured?: boolean;
  allowReviews?: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  location: 'Warehouse' | 'Store Shelf' | 'Fulfillment Center' | string;
  reorderPoint: number;
  barcode: string;
  qrCode: string;
  variants: ProductVariant[];
  salesCount: number;
  imageUrl?: string;
  description?: string;
  brand?: string;
  model?: string;
  rating?: number;
  reviewCount?: number;
  originalPrice?: number;
  discountPercent?: number;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  images?: string[];
  specifications?: Record<string, string>;
  reviews?: ProductReview[];

  // Enhanced 8-Step Hierarchy Properties
  productType?: ProductType;
  status?: ProductStatus;
  unit?: string;
  wholesalePrice?: number;
  minimumPrice?: number;
  trackInventory?: boolean;
  trackStock?: boolean;
  trackSerial?: boolean;
  trackBatch?: boolean;
  trackExpiry?: boolean;
  serialNumber?: string;
  serialNumbers?: string[];
  batchNumber?: string;
  batchLot?: string;
  expiryDate?: string;
  mediaGallery?: ProductMediaItem[];
  specificationList?: ProductSpecificationItem[];
  publishOnline?: boolean;
  ecommerceCategory?: string;
  seoTitle?: string;
  seoDescription?: string;
  urlSlug?: string;
  hasVariants?: boolean;
  inventoryTracking?: TrackingMode;
  stockRotationMethod?: RotationMethod;
  hasMultiUOM?: boolean;
  returnable?: boolean;
  sellOnPOS?: boolean;
  sellOnline?: boolean;
  shippingEnabled?: boolean;
  storePickup?: boolean;
  components?: ProductComponentItem[];
  compositeComponents?: CompositeComponentItem[];
  bundleKitItems?: BundleKitItem[];
  packaging?: ProductPackagingConfig;
  bulkPackaging?: BulkPackagingConfig;
  packagingUnits?: PackagingUnit[] | any;
  base_unit?: string;
  pricingTiers?: ProductPricingTiers;
  inventoryRules?: ProductInventoryRules;
  ecommerce?: ProductEcommerce | ProductEcommerceConfig;
  /** Canonical Product domain aggregate representation (PROD-001) */
  canonical?: CanonicalProduct;
}

export type PublicAvailabilityStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface PublicAvailabilityInfo {
  status: PublicAvailabilityStatus;
}

export interface PublicVariantProjection {
  sku: string;
  size?: string;
  color?: string;
  availability: PublicAvailabilityInfo;
  retailPrice?: number;
  imageUrl?: string;
  isActive?: boolean;
}

export interface PublicProductProjection {
  id: string;
  name: string;
  sku: string;
  price: number;
  availability: PublicAvailabilityInfo;
  category: string;
  imageUrl?: string;
  description?: string;
  brand?: string;
  model?: string;
  rating?: number;
  reviewCount?: number;
  originalPrice?: number;
  discountPercent?: number;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  images?: string[];
  specifications?: Record<string, string>;
  reviews?: ProductReview[];
  unit?: string;
  publishOnline?: boolean;
  variants?: PublicVariantProjection[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  parentId?: string;
  description?: string;
  color?: string;
  children?: Category[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariantSku?: string;
  selectedPackagingTierId?: string;
  selectedPackagingUnit?: PackagingUnit;
  packagingTierName?: string;
  packagingUnitName?: string;
  unitMultiplier?: number;
  base_unit?: string;
  sellingMode?: 'retail_unit' | 'pack_selling';
  customPrice?: number;
}

export type PaymentMethod = 'Cash' | 'Credit/Debit Card' | 'Digital Wallet' | 'Mobile Pay' | 'Bank Transfer' | 'Installments (Klarna/Afterpay)';

export interface Order {
  id: string;
  date: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    cost?: number;
    variantSku?: string;
    packagingTierName?: string;
    packagingUnitName?: string;
    unitMultiplier?: number;
    base_unit?: string;
    sellingMode?: 'retail_unit' | 'pack_selling';
    baseUnitsDeducted?: number;
  }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  channel: 'Online Storefront' | 'In-Store POS' | 'Mobile App';
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  status: 'Completed' | 'Pending' | 'Refunded' | 'Partially Refunded' | 'Outstanding';
  notes?: string;
  source?: string;
  deliveryAddress?: string;
  cashTendered?: number;
  cashChange?: number;
  receiptSentToEmail?: string;
  receiptSentAt?: string;
  taxExempt?: boolean;
  loyaltyPointsEarned?: number;
  cashierId?: string;
  cashierName?: string;
  branchId?: string;
  branchName?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string;
  cogs?: number;
  outstandingBalance?: number;
  dueDate?: string;
}

export interface ParkedOrder {
  id: string;
  heldAt: string;
  customerName: string;
  customerEmail?: string;
  customerId?: string;
  items: {
    product: Product;
    quantity: number;
    selectedVariantSku?: string;
  }[];
  subtotal: number;
  appliedCoupon: Coupon | null;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  notes?: string;
  segment: 'VIP' | 'Regular' | 'New' | 'Inactive';
  purchaseHistoryIds: string[];
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  avatar?: string;
  tags?: string[];
  createdAt?: string;
  preferredChannel?: 'In-Store POS' | 'Online Storefront' | 'Omnichannel';
  marketingOptIn?: boolean;
  birthday?: string;
  loyaltyTier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  totalSpent?: number;
}

export interface SupportTicket {
  id: string;
  customerId: string;
  customerName: string;
  subject: string;
  category: 'Order Issue' | 'Product Inquiry' | 'Loyalty Redemption' | 'Billing & Refund' | 'General';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'Pending' | 'Resolved' | 'Closed';
  date: string;
  description?: string;
  assignedStaff?: string;
  messages?: {
    id: string;
    sender: 'customer' | 'staff';
    senderName: string;
    text: string;
    timestamp: string;
  }[];
}

export interface CampaignLog {
  id: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'push';
  targetType: 'single' | 'segment' | 'selected' | 'all';
  targetLabel: string;
  subject?: string;
  message: string;
  recipientCount: number;
  timestamp: string;
  status: 'Delivered' | 'Scheduled' | 'Sent';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  staffName: string;
  role: StaffRole;
  action: string;
  module: 'Inventory' | 'POS' | 'CRM' | 'User Management' | 'Billing';
  details: string;
}

export interface ShiftTransaction {
  id: string;
  time: string;
  total: number;
  paymentMethod: PaymentMethod;
  itemsCount: number;
  customerName?: string;
  cashTendered?: number;
  cashChange?: number;
  tax?: number;
  discount?: number;
}

export interface CashMovement {
  id: string;
  time: string;
  type: 'cash_in' | 'cash_out' | 'safe_drop';
  amount: number;
  category: string;
  reason: string;
  staffName: string;
}

export interface ShiftReportData {
  reportId: string;
  reportType: 'X_READING' | 'Z_READING';
  timestamp: string;
  shiftStartTime: string;
  staffName: string;
  terminalId: string;
  openingFloat: number;
  totalSales: number;
  grossSales: number;
  totalTax: number;
  totalDiscounts: number;
  totalTransactions: number;
  cashSales: number;
  cardSales: number;
  digitalWalletSales: number;
  otherSales: number;
  cashInTotal: number;
  cashOutTotal: number;
  safeDropsTotal: number;
  expectedDrawerCash: number;
  actualDrawerCash: number;
  variance: number;
  varianceReason?: string;
  supervisorSignature?: string;
  notes: string;
  cashMovements: CashMovement[];
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  avatar: string;
  pin: string;
  status: 'Active' | 'Inactive' | 'On Leave';
  department?: string;
  phone?: string;
  permissionsOverride?: PermissionKey[];
  lastActive?: string;
  notes?: string;
}

export interface Coupon {
  code: string;
  discountType: 'Percentage' | 'Fixed';
  value: number;
  minSpend?: number;
}

// ==========================================
// Central System Configuration Types
// ==========================================

export interface BusinessSettings {
  companyName: string;
  legalName: string;
  tagline: string;
  registrationNumber: string;
  taxId: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  logoUrl: string;
  timeZone: string;
}

export interface CurrencySettings {
  primaryCurrency: string;
  symbolPosition: 'prefix' | 'suffix';
  spaceBetween: boolean;
  decimalPlaces: number;
  multiCurrencyCheckout: boolean;
  autoUpdateRates: boolean;
}

export interface TaxSettings {
  defaultTaxRate: number; // percentage, e.g. 8.5
  taxName: string; // e.g. 'VAT', 'Sales Tax', 'GST'
  taxCalculation: 'exclusive' | 'inclusive';
  allowTaxExemption: boolean;
  taxRegistrationNumber: string;
  enableSecondaryTax: boolean;
  secondaryTaxRate: number;
  secondaryTaxName: string;
}

export interface ReceiptSettings {
  printerType: 'thermal-80mm' | 'thermal-58mm' | 'standard-a4';
  headerText: string;
  footerText: string;
  returnPolicy: string;
  showLogo: boolean;
  showCashierName: boolean;
  showCustomerInfo: boolean;
  showBarcode: boolean;
  showQrCode: boolean;
  autoPrintOnCheckout: boolean;
  autoEmailReceipt: boolean;
}

export interface InvoiceNumberingSettings {
  invoicePrefix: string;
  nextInvoiceNumber: number;
  digitPadding: number;
  includeYearMonth: boolean;
  resetSequence: 'never' | 'yearly' | 'monthly';
  creditNotePrefix: string;
  quotePrefix: string;
}

export interface POSSettings {
  terminalName: string;
  enableSoundEffects: boolean;
  defaultCustomerName: string;
  quickCashPresets: number[];
  requireManagerPinForDiscount: boolean;
  maxDiscountWithoutPin: number; // %
  requireManagerPinForRefund: boolean;
  allowPriceOverride: boolean;
  autoOpenCashDrawer: boolean;
  fastBarcodeAdd: boolean;
  maxParkedCarts: number;
}

export interface InventoryRulesSettings {
  preventNegativeStock: boolean;
  trackVariants: boolean;
  stockDeductionTiming: 'on_checkout' | 'on_fulfillment' | 'on_invoice';
  valuationMethod: 'FIFO' | 'LIFO' | 'Weighted Average';
  enforceStockAudit: boolean;
  autoBatchTracking: boolean;
}

export interface LowStockSettings {
  globalLowStockThreshold: number;
  criticalStockThreshold: number;
  notifyOnLowStock: boolean;
  autoGenerateReorderDrafts: boolean;
  defaultReorderMultiplier: number;
}

export interface OrderSettings {
  orderPrefix: string;
  minOrderValue: number;
  enabledChannels: {
    pos: boolean;
    ecom: boolean;
    mobile: boolean;
    phone: boolean;
  };
  autoArchiveDays: number;
  defaultOrderStatus: 'Completed' | 'Pending';
  allowOrderNotes: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  zipCodes: string;
}

export interface DeliverySettings {
  enableLocalDelivery: boolean;
  enableStorePickup: boolean;
  defaultDeliveryFee: number;
  freeDeliveryThreshold: number;
  estimatedDeliveryDays: string;
  selectedCarrier: string;
  deliveryZones: DeliveryZone[];
}

export interface PaymentMethodsSettings {
  cashEnabled: boolean;
  cardEnabled: boolean;
  digitalWalletEnabled: boolean;
  mobileMoneyEnabled: boolean;
  bankTransferEnabled: boolean;
  installmentsEnabled: boolean;
  defaultMethod: PaymentMethod;
  cardSurchargePercent: number;
  mobileMoneyProvider: string;
}

export interface NotificationSettings {
  emailNotificationsEnabled: boolean;
  notificationEmail: string;
  notifyOnNewOrder: boolean;
  notifyOnLowStock: boolean;
  notifyOnRefund: boolean;
  dailySalesReport: boolean;
  smsAlertsEnabled: boolean;
  smsPhone: string;
}

export interface UserRolesSecuritySettings {
  supervisorPin: string;
  sessionTimeoutMinutes: number;
  requirePinOnCashierSwitch: boolean;
  defaultNewStaffRole: StaffRole;
  twoFactorAuthEnforced: boolean;
  lockoutAfterFailedAttempts: number;
}

export interface IntegrationSettings {
  barcodeScannerMode: 'hid_keyboard' | 'serial_usb' | 'camera_optical';
  accountingExportFormat: 'QuickBooks' | 'Xero' | 'Generic CSV';
  cloudSyncEnabled: boolean;
  webhookUrl: string;
  geminiAiCommerceEnabled: boolean;
  thermalPrinterIp: string;
}

export interface PublicSettingsProjection {
  currency: string;
  businessName: string;
  taxRate: number;
  lastUpdated?: string;
  business?: {
    companyName?: string;
    tagline?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    logoUrl?: string;
  };
  currencyConfig?: {
    primaryCurrency?: string;
    symbolPosition?: 'prefix' | 'suffix';
    spaceBetween?: boolean;
    decimalPlaces?: number;
  };
  delivery?: {
    enableStorePickup?: boolean;
    enableLocalDelivery?: boolean;
    defaultDeliveryFee?: number;
    freeDeliveryThreshold?: number;
  };
}

export interface SystemSettings {
  // Legacy / Direct access properties
  currency: string;
  businessName: string;
  taxRate: number;
  enableSoundEffects: boolean;
  lowStockThreshold: number;
  lastUpdated?: string;

  // Granular Modular Configuration Sections
  business: BusinessSettings;
  currencyConfig: CurrencySettings;
  tax: TaxSettings;
  receipt: ReceiptSettings;
  invoiceNumbering: InvoiceNumberingSettings;
  pos: POSSettings;
  inventoryRules: InventoryRulesSettings;
  lowStock: LowStockSettings;
  order: OrderSettings;
  delivery: DeliverySettings;
  paymentMethods: PaymentMethodsSettings;
  notifications: NotificationSettings;
  userRolesSecurity: UserRolesSecuritySettings;
  integrations: IntegrationSettings;
}

// ----------------------------------------------------------------------
// Reports & Analytics Domain Types
// ----------------------------------------------------------------------

export type ReportCategory = 'inventory' | 'sales' | 'financial';

export type InventoryReportSubTab = 
  | 'valuation'
  | 'low_stock'
  | 'out_of_stock'
  | 'dead_stock'
  | 'fast_moving'
  | 'slow_moving'
  | 'stock_movement'
  | 'stock_adjustments'
  | 'expiring_products';

export type SalesReportSubTab =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'by_product'
  | 'by_category'
  | 'by_cashier'
  | 'by_branch'
  | 'by_payment_method'
  | 'online_vs_pos';

export type FinancialReportSubTab =
  | 'executive_summary'
  | 'revenue'
  | 'gross_profit'
  | 'cogs'
  | 'discounts'
  | 'refunds'
  | 'tax'
  | 'outstanding_payments';

export type ReportSubTab = 
  | InventoryReportSubTab 
  | SalesReportSubTab 
  | FinancialReportSubTab
  | string;

export type ReportDatePreset = 
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'year_to_date'
  | 'all_time'
  | 'custom';

export interface BranchLocation {
  id: string;
  name: string;
  code: string;
  address: string;
  manager: string;
  phone: string;
  isActive: boolean;
  city?: string;
  type?: string;
}

export interface StockMovementRecord {
  id: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  type: 
    | 'PO Received'
    | 'POS Sale'
    | 'Online Sale'
    | 'Inter-Branch Transfer'
    | 'Damage Write-Off'
    | 'Return to Inventory'
    | 'Audit Adjustment'
    | 'Manual Correction';
  quantityChange: number; // positive for addition, negative for deduction
  quantityBefore: number;
  quantityAfter: number;
  unitCost: number;
  totalCostImpact: number;
  location: string;
  referenceDoc?: string;
  performedBy: string;
  notes?: string;
}

export interface StockAdjustmentRecord {
  id: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  location: string;
  systemQuantity: number;
  physicalQuantity: number;
  varianceQuantity: number;
  unitCost: number;
  varianceCost: number;
  reason: 
    | 'Physical Count Discrepancy'
    | 'Damaged Stock'
    | 'Shrinkage/Theft'
    | 'Expired Goods'
    | 'Vendor Packing Error'
    | 'System Calibration';
  adjustedBy: string;
  status: 'Approved' | 'Pending Review' | 'Draft';
  notes?: string;
}

export interface InventoryBatch {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  batchNumber: string;
  quantity: number;
  initialQuantity?: number;
  remainingQuantity?: number;
  manufacturingDate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  status: 'Expired' | 'Critical (<30d)' | 'Warning (<90d)' | 'Good';
  location: string;
  unitCost: number;
  costPerUnit?: number;
  totalCostValue: number;
  retailPrice: number;
  totalRetailValue: number;
  supplierName?: string;
}

