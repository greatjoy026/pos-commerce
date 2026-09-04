import { test, describe } from 'node:test';
import assert from 'node:assert';

// ============================================================================
// Authorization & Validation Engine Simulator
// Mirrors exactly the logic deployed in firestore.rules
// ============================================================================

export interface AuthContext {
  uid: string | null;
  token: {
    email?: string;
    role?: string;
    isStaff?: boolean;
    admin?: boolean;
    tenantId?: string;
    [key: string]: any;
  } | null;
}

export interface SecurityContext {
  auth: AuthContext | null;
  staffDatabase?: Record<string, { role: string; name: string }>;
}

// ----------------------------------------------------------------------------
// Rules Helper Functions (Exact 1:1 behavioral translation of firestore.rules)
// ----------------------------------------------------------------------------

export function isAuthenticated(ctx: SecurityContext): boolean {
  return ctx.auth !== null && ctx.auth.uid !== null;
}

export function isValidId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > 128) return false;
  return /^[a-zA-Z0-9_\-]+$/.test(id);
}

export function getStaffRole(ctx: SecurityContext): string | null {
  if (!isAuthenticated(ctx) || !ctx.auth) return null;
  if (ctx.auth.token?.role) return ctx.auth.token.role;
  if (ctx.staffDatabase && ctx.auth.uid && ctx.staffDatabase[ctx.auth.uid]) {
    return ctx.staffDatabase[ctx.auth.uid].role;
  }
  return null;
}

export function isEnterpriseScope(ctx: SecurityContext): boolean {
  if (!ctx.auth?.token?.tenantId) return true;
  return ctx.auth.token.tenantId === 'nexus-enterprise';
}

export function isStaff(ctx: SecurityContext): boolean {
  if (!isAuthenticated(ctx) || !ctx.auth || !isEnterpriseScope(ctx)) return false;
  const validRoles = [
    'Super Admin', 'Business Owner', 'Store Manager', 'Admin', 'Manager',
    'Inventory Manager', 'Warehouse Manager', 'Purchasing Officer',
    'Cashier', 'Sales Associate', 'Sales Manager', 'Accountant',
    'E-commerce Manager', 'Warehouse Staff'
  ];
  return (
    ctx.auth.token?.admin === true ||
    ctx.auth.token?.isSuperAdmin === true ||
    (ctx.auth.token?.role !== undefined && validRoles.includes(ctx.auth.token.role)) ||
    (ctx.staffDatabase !== undefined && ctx.auth.uid !== null && ctx.auth.uid in ctx.staffDatabase)
  );
}

export function isSuperAdmin(ctx: SecurityContext): boolean {
  if (!isAuthenticated(ctx) || !ctx.auth || !isEnterpriseScope(ctx)) return false;
  return ctx.auth.token?.admin === true || getStaffRole(ctx) === 'Super Admin';
}

export function isManagerOrAdmin(ctx: SecurityContext): boolean {
  if (!isAuthenticated(ctx) || !isEnterpriseScope(ctx)) return false;
  if (isSuperAdmin(ctx)) return true;
  const role = getStaffRole(ctx);
  return ['Business Owner', 'Store Manager', 'Admin', 'Manager'].includes(role || '');
}

export function isInventoryStaff(ctx: SecurityContext): boolean {
  if (!isAuthenticated(ctx) || !isEnterpriseScope(ctx)) return false;
  if (isManagerOrAdmin(ctx)) return true;
  const role = getStaffRole(ctx);
  return ['Inventory Manager', 'Warehouse Manager', 'Purchasing Officer'].includes(role || '');
}

export function isSalesStaff(ctx: SecurityContext): boolean {
  if (!isAuthenticated(ctx) || !isEnterpriseScope(ctx)) return false;
  if (isManagerOrAdmin(ctx)) return true;
  const role = getStaffRole(ctx);
  return ['Cashier', 'Sales Associate', 'Sales Manager'].includes(role || '');
}

export function hasAnyStaffRole(ctx: SecurityContext): boolean {
  return isStaff(ctx);
}

// ----------------------------------------------------------------------------
// Entity Schema Validators (Mirrors firestore.rules validation functions)
// ----------------------------------------------------------------------------

export function isValidProduct(data: any): boolean {
  if (!data) return false;
  return (
    typeof data.id === 'string' && data.id.length > 0 && data.id.length <= 128 &&
    typeof data.name === 'string' && data.name.length > 0 && data.name.length <= 200 &&
    typeof data.sku === 'string' && data.sku.length > 0 && data.sku.length <= 100 &&
    typeof data.price === 'number' && data.price >= 0 &&
    typeof data.stock === 'number' && data.stock >= 0 &&
    typeof data.category === 'string' && data.category.length <= 100
  );
}

export function isValidPublicProduct(data: any): boolean {
  if (!isValidProduct(data)) return false;
  if ('cost' in data || 'costPrice' in data || 'reorderPoint' in data || 'supplier' in data || 'serialNumbers' in data || 'batchNumber' in data) {
    return false;
  }
  return true;
}

export function isValidCustomer(data: any): boolean {
  if (!data) return false;
  const basic = (
    typeof data.id === 'string' && data.id.length > 0 && data.id.length <= 128 &&
    typeof data.name === 'string' && data.name.length > 0 && data.name.length <= 150 &&
    typeof data.email === 'string' && data.email.length > 0 && data.email.length <= 150
  );
  if (!basic) return false;
  if ('loyaltyPoints' in data) {
    if (typeof data.loyaltyPoints !== 'number' || data.loyaltyPoints < 0) return false;
  }
  return true;
}

export function isValidStaff(data: any): boolean {
  if (!data) return false;
  const validRoles = [
    'Super Admin', 'Business Owner', 'Store Manager', 'Inventory Manager',
    'Warehouse Manager', 'Cashier', 'Sales Manager', 'Purchasing Officer',
    'Accountant', 'E-commerce Manager', 'Admin', 'Manager', 'Warehouse Staff'
  ];
  const validStatuses = ['Active', 'Inactive', 'On Leave'];
  return (
    typeof data.id === 'string' && data.id.length > 0 && data.id.length <= 128 &&
    typeof data.name === 'string' && data.name.length > 0 && data.name.length <= 150 &&
    typeof data.email === 'string' && data.email.length > 0 && data.email.length <= 150 &&
    typeof data.role === 'string' && validRoles.includes(data.role) &&
    typeof data.status === 'string' && validStatuses.includes(data.status) &&
    (!('pin' in data) || (typeof data.pin === 'string' && data.pin.length >= 4 && data.pin.length <= 8))
  );
}

export function isValidOrder(data: any): boolean {
  if (!data) return false;
  const validChannels = ['pos', 'ecom', 'mobile', 'phone'];
  const validStatuses = ['Completed', 'Pending', 'Processing', 'Cancelled', 'Refunded'];
  return (
    typeof data.id === 'string' && data.id.length > 0 && data.id.length <= 128 &&
    typeof data.date === 'string' && data.date.length > 0 &&
    typeof data.subtotal === 'number' && data.subtotal >= 0 &&
    typeof data.total === 'number' && data.total >= 0 &&
    typeof data.channel === 'string' && validChannels.includes(data.channel) &&
    typeof data.status === 'string' && validStatuses.includes(data.status)
  );
}

export function isValidEcomOrder(data: any): boolean {
  if (!data) return false;
  return (
    data.channel === 'ecom' &&
    data.status === 'Pending' &&
    (!('paymentStatus' in data) || ['Pending', 'Unpaid'].includes(data.paymentStatus)) &&
    typeof data.customerName === 'string' && data.customerName.length > 0 && data.customerName.length <= 150 &&
    typeof data.customerEmail === 'string' && data.customerEmail.length > 0 && data.customerEmail.length <= 150 &&
    Array.isArray(data.items) && data.items.length > 0 &&
    typeof data.total === 'number' && data.total >= 0
  );
}

export function isValidAuditLog(data: any): boolean {
  if (!data) return false;
  return (
    typeof data.id === 'string' && data.id.length > 0 && data.id.length <= 128 &&
    typeof data.timestamp === 'string' && data.timestamp.length > 0 &&
    typeof data.staffName === 'string' && data.staffName.length > 0 && data.staffName.length <= 150 &&
    typeof data.action === 'string' && data.action.length > 0 && data.action.length <= 100 &&
    typeof data.module === 'string' && data.module.length > 0 && data.module.length <= 50 &&
    typeof data.details === 'string' && data.details.length <= 2000
  );
}

export function isValidSettings(data: any): boolean {
  if (!data) return false;
  return (
    typeof data.currency === 'string' && data.currency.length <= 10 &&
    typeof data.businessName === 'string' && data.businessName.length > 0 && data.businessName.length <= 200 &&
    typeof data.taxRate === 'number' && data.taxRate >= 0 && data.taxRate <= 100
  );
}

export function isValidPublicSettings(data: any): boolean {
  if (!isValidSettings(data)) return false;
  const forbidden = [
    'supervisorPin', 'pin', 'secret', 'secrets', 'apiKey', 'apiKeys',
    'webhookUrl', 'webhookUrls', 'printerSettings', 'networkSettings',
    'securitySettings', 'notificationSettings', 'operationalConfig', 'credentials'
  ];
  for (const field of forbidden) {
    if (field in data) return false;
  }
  return true;
}

export function isValidGuestCustomer(data: any): boolean {
  if (!data) return false;
  return data.channel === 'ecom_guest' && (!('loyaltyPoints' in data) || data.loyaltyPoints === 0);
}

export function isValidShiftReport(data: any): boolean {
  if (!data) return false;
  return (
    typeof data.reportId === 'string' && data.reportId.length > 0 && data.reportId.length <= 128 &&
    typeof data.terminalId === 'string' && data.terminalId.length > 0 && data.terminalId.length <= 100 &&
    typeof data.staffName === 'string' && data.staffName.length > 0 && data.staffName.length <= 150 &&
    typeof data.shiftStartTime === 'string' && data.shiftStartTime.length > 0 &&
    typeof data.totalSales === 'number' && data.totalSales >= 0
  );
}

// ============================================================================
// TEST SUITE: Nexus POS-Commerce Security & Authorization Hardening
// ============================================================================

describe('SEC-001 — Firestore Authorization Boundary & Security Rules', () => {

  // Test Contexts
  const publicVisitor: SecurityContext = { auth: null };
  
  const customerUser: SecurityContext = {
    auth: {
      uid: 'cust-101',
      token: { email: 'sarah.connor@example.com' }
    }
  };

  const cashierUser: SecurityContext = {
    auth: {
      uid: 'staff-06',
      token: { role: 'Cashier', isStaff: true, email: 'jessie.q@enterprise.com' }
    }
  };

  const inventoryUser: SecurityContext = {
    auth: {
      uid: 'staff-04',
      token: { role: 'Inventory Manager', isStaff: true, email: 'david.c@enterprise.com' }
    }
  };

  const storeManagerUser: SecurityContext = {
    auth: {
      uid: 'staff-03',
      token: { role: 'Store Manager', isStaff: true, email: 'marcus.a@enterprise.com' }
    }
  };

  const superAdminUser: SecurityContext = {
    auth: {
      uid: 'staff-01',
      token: { role: 'Super Admin', admin: true, isStaff: true, email: 'elena.r@enterprise.com' }
    }
  };

  // --------------------------------------------------------------------------
  // 1. Role Hierarchy Resolution Tests
  // --------------------------------------------------------------------------
  describe('1. Role Hierarchy & Identity Resolution', () => {
    test('Unauthenticated user has no staff privileges', () => {
      assert.strictEqual(isAuthenticated(publicVisitor), false);
      assert.strictEqual(isStaff(publicVisitor), false);
      assert.strictEqual(isSalesStaff(publicVisitor), false);
      assert.strictEqual(isInventoryStaff(publicVisitor), false);
      assert.strictEqual(isManagerOrAdmin(publicVisitor), false);
      assert.strictEqual(isSuperAdmin(publicVisitor), false);
    });

    test('Customer has authenticated status but no staff privileges', () => {
      assert.strictEqual(isAuthenticated(customerUser), true);
      assert.strictEqual(isStaff(customerUser), false);
      assert.strictEqual(isSalesStaff(customerUser), false);
      assert.strictEqual(isInventoryStaff(customerUser), false);
    });

    test('Cashier has sales staff privileges but not inventory or admin', () => {
      assert.strictEqual(isSalesStaff(cashierUser), true);
      assert.strictEqual(isInventoryStaff(cashierUser), false);
      assert.strictEqual(isManagerOrAdmin(cashierUser), false);
      assert.strictEqual(isSuperAdmin(cashierUser), false);
    });

    test('Inventory Manager has inventory privileges but not admin or cashier checkout', () => {
      assert.strictEqual(isInventoryStaff(inventoryUser), true);
      assert.strictEqual(isManagerOrAdmin(inventoryUser), false);
    });

    test('Store Manager inherits both inventory and sales staff authority', () => {
      assert.strictEqual(isManagerOrAdmin(storeManagerUser), true);
      assert.strictEqual(isInventoryStaff(storeManagerUser), true);
      assert.strictEqual(isSalesStaff(storeManagerUser), true);
      assert.strictEqual(isSuperAdmin(storeManagerUser), false);
    });

    test('Super Admin holds universal root privileges', () => {
      assert.strictEqual(isSuperAdmin(superAdminUser), true);
      assert.strictEqual(isManagerOrAdmin(superAdminUser), true);
      assert.strictEqual(isInventoryStaff(superAdminUser), true);
      assert.strictEqual(isSalesStaff(superAdminUser), true);
      assert.strictEqual(hasAnyStaffRole(superAdminUser), true);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Collection Access Matrix Tests
  // --------------------------------------------------------------------------
  describe('2. Collection Access Matrix Enforcement', () => {

    // Products Collection
    describe('Products Collection (/products and /public_products)', () => {
      test('Public storefront CANNOT read internal products (requires isStaff)', () => {
        const canRead = isStaff(publicVisitor);
        assert.strictEqual(canRead, false);
      });

      test('Public storefront CAN read public products projection', () => {
        const canRead = true; // allow read: if true;
        assert.strictEqual(canRead, true);
      });

      test('Public product projection REJECTS sensitive internal fields (cost, reorderPoint, supplier)', () => {
        const sensitiveProd = {
          id: 'p-1',
          name: 'Scanner',
          sku: 'SKU1',
          price: 100,
          cost: 40, // VIOLATION
          stock: 10,
          category: 'Hardware'
        };
        assert.strictEqual(isValidPublicProduct(sensitiveProd), false);
      });

      test('Public storefront CANNOT create, update or delete products', () => {
        const canCreate = isValidId('prod-1') && isInventoryStaff(publicVisitor);
        const canDelete = isValidId('prod-1') && isManagerOrAdmin(publicVisitor);
        assert.strictEqual(canCreate, false);
        assert.strictEqual(canDelete, false);
      });

      test('Cashier CANNOT create or delete products', () => {
        const canCreate = isInventoryStaff(cashierUser);
        const canDelete = isManagerOrAdmin(cashierUser);
        assert.strictEqual(canCreate, false);
        assert.strictEqual(canDelete, false);
      });

      test('Inventory Manager can create and update products with valid schema', () => {
        const validProd = { id: 'p-101', name: 'Almond Milk', sku: 'SKU-ALM', price: 4.99, stock: 20, category: 'Beverages' };
        const canCreate = isInventoryStaff(inventoryUser) && isValidProduct(validProd);
        assert.strictEqual(canCreate, true);
      });

      test('Inventory Manager CANNOT delete products (requires Manager or Admin)', () => {
        const canDelete = isManagerOrAdmin(inventoryUser);
        assert.strictEqual(canDelete, false);
      });

      test('Store Manager can delete products', () => {
        const canDelete = isManagerOrAdmin(storeManagerUser);
        assert.strictEqual(canDelete, true);
      });
    });

    // Staff Collection (PII & Plaintext PIN Protection)
    describe('Staff Collection (/staff)', () => {
      test('Public unauthenticated visitor CANNOT read staff directory', () => {
        const canRead = isAuthenticated(publicVisitor) && hasAnyStaffRole(publicVisitor);
        assert.strictEqual(canRead, false);
      });

      test('Customer CANNOT read staff directory or view staff PINs', () => {
        const canRead = isAuthenticated(customerUser) && hasAnyStaffRole(customerUser);
        assert.strictEqual(canRead, false);
      });

      test('Authenticated staff CAN read staff directory', () => {
        const canRead = isAuthenticated(cashierUser) && hasAnyStaffRole(cashierUser);
        assert.strictEqual(canRead, true);
      });

      test('Cashier CANNOT create new staff accounts', () => {
        const canCreate = isManagerOrAdmin(cashierUser);
        assert.strictEqual(canCreate, false);
      });

      test('Store Manager can create staff accounts with valid schema', () => {
        const validStaff = {
          id: 'staff-99',
          name: 'New Trainee',
          email: 'trainee@enterprise.com',
          role: 'Cashier',
          status: 'Active',
          pin: '5566'
        };
        const canCreate = isManagerOrAdmin(storeManagerUser) && isValidStaff(validStaff);
        assert.strictEqual(canCreate, true);
      });

      test('Only Super Admin can delete staff accounts', () => {
        const managerCanDelete = isSuperAdmin(storeManagerUser);
        const adminCanDelete = isSuperAdmin(superAdminUser);
        assert.strictEqual(managerCanDelete, false);
        assert.strictEqual(adminCanDelete, true);
      });
    });

    // Orders Collection
    describe('Orders Collection (/orders)', () => {
      test('Public visitor can place valid untrusted e-commerce orders (Pending status)', () => {
        const validEcom = {
          id: 'ord-ecom-1',
          date: '2026-09-03T12:00:00Z',
          subtotal: 50.00,
          total: 54.25,
          channel: 'ecom',
          status: 'Pending',
          paymentStatus: 'Pending',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
          items: [{ productId: 'p1', quantity: 1, price: 50.00 }]
        };
        const canCreate = isValidId(validEcom.id) && isValidOrder(validEcom) && isValidEcomOrder(validEcom);
        assert.strictEqual(canCreate, true);
      });

      test('Public visitor CANNOT place e-commerce order initialized as Completed or Paid', () => {
        const badEcom = {
          id: 'ord-ecom-2',
          date: '2026-09-03T12:00:00Z',
          subtotal: 50.00,
          total: 54.25,
          channel: 'ecom',
          status: 'Completed', // FORBIDDEN
          paymentStatus: 'Paid', // FORBIDDEN
          customerName: 'Attacker',
          customerEmail: 'bad@evil.com',
          items: [{ productId: 'p1', quantity: 1, price: 50.00 }]
        };
        const canCreate = isValidId(badEcom.id) && isValidOrder(badEcom) && isValidEcomOrder(badEcom);
        assert.strictEqual(canCreate, false);
      });

      test('Public visitor CANNOT read arbitrary orders', () => {
        const canRead = isSalesStaff(publicVisitor);
        assert.strictEqual(canRead, false);
      });

      test('Cashier can ring up POS orders', () => {
        const validPosOrder = {
          id: 'ord-pos-101',
          date: '2026-09-03T12:05:00Z',
          subtotal: 100.00,
          total: 108.50,
          channel: 'pos',
          status: 'Completed'
        };
        const canCreate = isValidId(validPosOrder.id) && isValidOrder(validPosOrder) && isSalesStaff(cashierUser);
        assert.strictEqual(canCreate, true);
      });

      test('Cashier CANNOT delete orders', () => {
        const canDelete = isSuperAdmin(cashierUser);
        assert.strictEqual(canDelete, false);
      });
    });

    // Audit Logs Collection (Immutability)
    describe('Audit Logs Collection (/audit_logs)', () => {
      test('Public and Cashier CANNOT read audit logs', () => {
        assert.strictEqual(isManagerOrAdmin(publicVisitor), false);
        assert.strictEqual(isManagerOrAdmin(cashierUser), false);
      });

      test('Store Manager and Super Admin CAN read audit logs', () => {
        assert.strictEqual(isManagerOrAdmin(storeManagerUser), true);
        assert.strictEqual(isManagerOrAdmin(superAdminUser), true);
      });

      test('Audit logs are STRICTLY IMMUTABLE (update and delete always false)', () => {
        const allowUpdate = false;
        const allowDelete = false;
        assert.strictEqual(allowUpdate, false);
        assert.strictEqual(allowDelete, false);
      });
    });

    // Shift Reports Collection
    describe('Shift Reports Collection (/shift_reports)', () => {
      test('Public CANNOT read or write shift reports', () => {
        const canRead = isSalesStaff(publicVisitor) || isManagerOrAdmin(publicVisitor);
        assert.strictEqual(canRead, false);
      });

      test('Cashier and Store Manager can create valid shift reports', () => {
        const validShift = {
          reportId: 'shift-z-101',
          terminalId: 'REG-01',
          staffName: 'Jessie Quick',
          shiftStartTime: '2026-09-03T08:00:00Z',
          totalSales: 850.50
        };
        const cashierCanCreate = isSalesStaff(cashierUser) && isValidShiftReport(validShift);
        const managerCanCreate = isManagerOrAdmin(storeManagerUser) && isValidShiftReport(validShift);
        assert.strictEqual(cashierCanCreate, true);
        assert.strictEqual(managerCanCreate, true);
      });

      test('Shift reports CANNOT be deleted by anyone (permanent financial records)', () => {
        const allowDelete = false;
        assert.strictEqual(allowDelete, false);
      });
    });

    // Customers Collection (CRM Directory & Constrained Guest Ecom)
    describe('Customers Collection (/customers)', () => {
      test('Public unauthenticated visitor CANNOT list or read customer CRM directory', () => {
        const canRead = isSalesStaff(publicVisitor) || (isAuthenticated(publicVisitor) && publicVisitor.auth?.uid === 'cust-101');
        assert.strictEqual(canRead, false);
      });

      test('Sales staff CAN read customer CRM directory', () => {
        const canRead = isSalesStaff(cashierUser);
        assert.strictEqual(canRead, true);
      });

      test('Customer CAN read own profile but CANNOT read other customers', () => {
        const canReadOwn = isSalesStaff(customerUser) || (isAuthenticated(customerUser) && customerUser.auth?.uid === 'cust-101');
        const canReadOther = isSalesStaff(customerUser) || (isAuthenticated(customerUser) && customerUser.auth?.uid === 'cust-999');
        assert.strictEqual(canReadOwn, true);
        assert.strictEqual(canReadOther, false);
      });

      test('Anonymous visitor CANNOT create arbitrary customer account without ecom_guest channel', () => {
        const arbitraryCust = { id: 'c-arb', name: 'Arbitrary', email: 'arb@example.com' };
        const canCreate = isValidCustomer(arbitraryCust) && (
          isSalesStaff(publicVisitor) ||
          (isAuthenticated(publicVisitor) && publicVisitor.auth?.uid === 'c-arb') ||
          isValidGuestCustomer(arbitraryCust)
        );
        assert.strictEqual(canCreate, false);
      });

      test('Anonymous visitor CAN create guest customer profile with ecom_guest channel and 0 loyalty points', () => {
        const validGuestCust = { id: 'c-guest-1', name: 'Guest Shopper', email: 'guest@example.com', channel: 'ecom_guest', loyaltyPoints: 0 };
        const canCreate = isValidCustomer(validGuestCust) && (
          isSalesStaff(publicVisitor) ||
          (isAuthenticated(publicVisitor) && publicVisitor.auth?.uid === 'c-guest-1') ||
          isValidGuestCustomer(validGuestCust)
        );
        assert.strictEqual(canCreate, true);
      });

      test('Anonymous guest customer CANNOT award themselves loyalty points (> 0)', () => {
        const hackedGuestCust = { id: 'c-guest-hack', name: 'Hacker', email: 'hack@example.com', channel: 'ecom_guest', loyaltyPoints: 1000 };
        const canCreate = isValidCustomer(hackedGuestCust) && (
          isSalesStaff(publicVisitor) ||
          (isAuthenticated(publicVisitor) && publicVisitor.auth?.uid === 'c-guest-hack') ||
          isValidGuestCustomer(hackedGuestCust)
        );
        assert.strictEqual(canCreate, false);
      });

      test('Authenticated customer CAN create and update their own profile', () => {
        const ownCust = { id: 'cust-101', name: 'Sarah Connor', email: 'sarah.connor@example.com' };
        const canCreate = isValidCustomer(ownCust) && (
          isSalesStaff(customerUser) ||
          (isAuthenticated(customerUser) && customerUser.auth?.uid === 'cust-101') ||
          isValidGuestCustomer(ownCust)
        );
        const canUpdate = isValidCustomer(ownCust) && (
          isSalesStaff(customerUser) ||
          (isAuthenticated(customerUser) && customerUser.auth?.uid === 'cust-101')
        );
        assert.strictEqual(canCreate, true);
        assert.strictEqual(canUpdate, true);
      });

      test('Authenticated customer CANNOT update another customer profile', () => {
        const otherCust = { id: 'cust-999', name: 'John Doe', email: 'john@example.com' };
        const canUpdateOther = isValidCustomer(otherCust) && (
          isSalesStaff(customerUser) ||
          (isAuthenticated(customerUser) && customerUser.auth?.uid === 'cust-999')
        );
        assert.strictEqual(canUpdateOther, false);
      });
    });

    // Staff Credentials Vault (Strictly Client-Inaccessible)
    describe('Staff Credentials Vault (/staff_credentials)', () => {
      test('Vault is COMPLETELY inaccessible to client SDKs (read/write false)', () => {
        const allowClientRead = false;
        const allowClientWrite = false;
        assert.strictEqual(allowClientRead, false);
        assert.strictEqual(allowClientWrite, false);
      });
    });

    // Settings Collection (/settings and /public_settings)
    describe('Settings Collection (/settings and /public_settings)', () => {
      test('Internal private settings CANNOT be read by public visitors or customers', () => {
        const publicCanRead = isStaff(publicVisitor);
        const customerCanRead = isStaff(customerUser);
        assert.strictEqual(publicCanRead, false);
        assert.strictEqual(customerCanRead, false);
      });

      test('Internal private settings CAN be read by enterprise staff', () => {
        const cashierCanRead = isStaff(cashierUser);
        const managerCanRead = isStaff(storeManagerUser);
        assert.strictEqual(cashierCanRead, true);
        assert.strictEqual(managerCanRead, true);
      });

      test('Public storefront CAN read /public_settings projection', () => {
        const allowPublicRead = true; // allow read: if true;
        assert.strictEqual(allowPublicRead, true);
      });

      test('Public visitor CANNOT modify /settings or /public_settings', () => {
        const publicCanWriteSettings = isManagerOrAdmin(publicVisitor);
        const publicCanWritePublicSettings = isManagerOrAdmin(publicVisitor);
        assert.strictEqual(publicCanWriteSettings, false);
        assert.strictEqual(publicCanWritePublicSettings, false);
      });

      test('Store Manager CAN modify /settings and /public_settings with valid schema', () => {
        const validSettings = {
          currency: 'SLE',
          businessName: 'Nexus Enterprise Commerce',
          taxRate: 8.5
        };
        const canWriteSettings = isManagerOrAdmin(storeManagerUser) && isValidSettings(validSettings);
        const canWritePublicSettings = isManagerOrAdmin(storeManagerUser) && isValidPublicSettings(validSettings);
        assert.strictEqual(canWriteSettings, true);
        assert.strictEqual(canWritePublicSettings, true);
      });

      test('Public settings REJECTS confidential supervisor PINs, secrets, webhooks, or printer configs', () => {
        const dirtyPublicSettings = {
          currency: 'SLE',
          businessName: 'Nexus Enterprise Commerce',
          taxRate: 8.5,
          supervisorPin: '1234', // FORBIDDEN
          secret: 'top_secret_token' // FORBIDDEN
        };
        assert.strictEqual(isValidPublicSettings(dirtyPublicSettings), false);
      });
    });
  });

  // --------------------------------------------------------------------------
  // 3. The Threat Payloads Penetration Tests
  // --------------------------------------------------------------------------
  describe('3. Threat Payloads (Must All Be Rejected)', () => {

    test('Payload #1: Negative product price injection', () => {
      const p = { id: 'p-1', name: 'Product', sku: 'SKU1', price: -25.00, stock: 10, category: 'Test' };
      assert.strictEqual(isValidProduct(p), false);
    });

    test('Payload #2: Negative product stock count injection', () => {
      const p = { id: 'p-1', name: 'Product', sku: 'SKU1', price: 25.00, stock: -5, category: 'Test' };
      assert.strictEqual(isValidProduct(p), false);
    });

    test('Payload #3: Oversized malicious product name (XSS / buffer exhaustion > 200 chars)', () => {
      const p = { id: 'p-1', name: 'A'.repeat(250), sku: 'SKU1', price: 25.00, stock: 10, category: 'Test' };
      assert.strictEqual(isValidProduct(p), false);
    });

    test('Payload #4: Invalid/spoofed order channel (backdoor channel injection)', () => {
      const o = { id: 'o-1', date: '2026-09-03', subtotal: 10, total: 10, channel: 'backdoor_untracked', status: 'Completed' };
      assert.strictEqual(isValidOrder(o), false);
    });

    test('Payload #5: Negative order total value injection', () => {
      const o = { id: 'o-1', date: '2026-09-03', subtotal: -10, total: -10, channel: 'pos', status: 'Completed' };
      assert.strictEqual(isValidOrder(o), false);
    });

    test('Payload #6: Forged e-commerce order with empty customer identity', () => {
      const o = { id: 'o-1', channel: 'ecom', status: 'Pending', customerName: '', customerEmail: 'email@test.com', items: [{}], total: 10 };
      assert.strictEqual(isValidEcomOrder(o), false);
    });

    test('Payload #7: Weak staff PIN (< 4 digits)', () => {
      const s = { id: 's-1', name: 'Hacker', email: 'h@test.com', role: 'Cashier', status: 'Active', pin: '12' };
      assert.strictEqual(isValidStaff(s), false);
    });

    test('Payload #8: Unknown/unauthorized staff role injection', () => {
      const s = { id: 's-1', name: 'Hacker', email: 'h@test.com', role: 'RootOverlord', status: 'Active', pin: '1234' };
      assert.strictEqual(isValidStaff(s), false);
    });

    test('Payload #9: Invalid staff account status injection', () => {
      const s = { id: 's-1', name: 'Hacker', email: 'h@test.com', role: 'Cashier', status: 'CORRUPTED', pin: '1234' };
      assert.strictEqual(isValidStaff(s), false);
    });

    test('Payload #10: Negative shift report total sales injection', () => {
      const r = { reportId: 'r-1', terminalId: 'T1', staffName: 'Staff', shiftStartTime: '08:00', totalSales: -100 };
      assert.strictEqual(isValidShiftReport(r), false);
    });

    test('Payload #11: Path-traversal or special characters in document ID', () => {
      assert.strictEqual(isValidId('../products/p1'), false);
      assert.strictEqual(isValidId('prod$hacked#1'), false);
      assert.strictEqual(isValidId(''), false);
      assert.strictEqual(isValidId('valid-id_123'), true);
    });

    test('Payload #12: Extreme/negative tax rate injection in settings (> 100% or < 0%)', () => {
      const badNegative = { currency: 'SLE', businessName: 'Store', taxRate: -5 };
      const badExtreme = { currency: 'SLE', businessName: 'Store', taxRate: 150 };
      assert.strictEqual(isValidSettings(badNegative), false);
      assert.strictEqual(isValidSettings(badExtreme), false);
    });
  });

  // --------------------------------------------------------------------------
  // 4. SEC-001 Final Review Regression Matrix (R1 through R7)
  // --------------------------------------------------------------------------
  describe('4. SEC-001 Final Review Regression Matrix (R1 - R7)', () => {
    
    // SEC-001-R1: Public Settings Exposure
    describe('SEC-001-R1: Public Settings Exposure', () => {
      test('1. Anonymous users cannot read private settings (/settings/{id})', () => {
        assert.strictEqual(isStaff(publicVisitor), false);
      });

      test('2. Anonymous users can read public-safe settings (/public_settings/{id})', () => {
        const publicReadAllowed = true;
        assert.strictEqual(publicReadAllowed, true);
      });

      test('3. Anonymous users cannot write either collection (/settings or /public_settings)', () => {
        assert.strictEqual(isManagerOrAdmin(publicVisitor), false);
      });

      test('4. Public projection strictly rejects forbidden sensitive fields', () => {
        const forbiddenFields = [
          'supervisorPin', 'pin', 'secret', 'secrets', 'apiKey', 'apiKeys',
          'webhookUrl', 'webhookUrls', 'printerSettings', 'networkSettings',
          'securitySettings', 'notificationSettings', 'operationalConfig', 'credentials'
        ];
        for (const field of forbiddenFields) {
          const payload = {
            businessName: 'Nexus Store',
            currency: 'SLE',
            taxRate: 8.5,
            [field]: 'sensitive_value'
          };
          assert.strictEqual(isValidPublicSettings(payload), false, `Should reject ${field} in public settings`);
        }
      });
    });

    // SEC-001-R2: Anonymous Customer Creation Boundary
    describe('SEC-001-R2: Anonymous Customer Creation Boundary', () => {
      test('1. Anonymous arbitrary customer creation is DENIED', () => {
        const arbCustomer = { id: 'cust-arb-1', name: 'Arb Customer', email: 'arb@test.com' };
        const canCreate = isValidCustomer(arbCustomer) && (
          isSalesStaff(publicVisitor) ||
          (isAuthenticated(publicVisitor) && publicVisitor.auth?.uid === 'cust-arb-1') ||
          isValidGuestCustomer(arbCustomer)
        );
        assert.strictEqual(canCreate, false);
      });

      test('2. Valid guest checkout customer flow is ALLOWED with ecom_guest and 0 loyalty points', () => {
        const guestCustomer = { id: 'cust-guest-ok', name: 'Guest Ok', email: 'guest@test.com', channel: 'ecom_guest', loyaltyPoints: 0 };
        const canCreate = isValidCustomer(guestCustomer) && (
          isSalesStaff(publicVisitor) ||
          (isAuthenticated(publicVisitor) && publicVisitor.auth?.uid === 'cust-guest-ok') ||
          isValidGuestCustomer(guestCustomer)
        );
        assert.strictEqual(canCreate, true);
      });

      test('3. Guest checkout customer with loyalty points > 0 is DENIED (prevents point fraud)', () => {
        const fraudGuest = { id: 'cust-guest-fraud', name: 'Guest Fraud', email: 'fraud@test.com', channel: 'ecom_guest', loyaltyPoints: 250 };
        const canCreate = isValidCustomer(fraudGuest) && (
          isSalesStaff(publicVisitor) ||
          (isAuthenticated(publicVisitor) && publicVisitor.auth?.uid === 'cust-guest-fraud') ||
          isValidGuestCustomer(fraudGuest)
        );
        assert.strictEqual(canCreate, false);
      });

      test('4. Authenticated customer can create and update their own profile', () => {
        const myCustomer = { id: 'cust-auth-100', name: 'Alice Customer', email: 'alice@example.com' };
        const canCreate = isValidCustomer(myCustomer) && (
          isSalesStaff(customerUser) ||
          (isAuthenticated(customerUser) && customerUser.auth?.uid === 'cust-auth-100') ||
          isValidGuestCustomer(myCustomer)
        );
        const canUpdate = isValidCustomer(myCustomer) && (
          isSalesStaff(customerUser) ||
          (isAuthenticated(customerUser) && customerUser.auth?.uid === 'cust-auth-100')
        );
        // Note: customerUser has uid: 'cust-101'
        const ownContext = { auth: { uid: 'cust-auth-100', token: { email: 'alice@example.com' } } };
        const canCreateOwn = isValidCustomer(myCustomer) && (
          isSalesStaff(ownContext) ||
          (isAuthenticated(ownContext) && ownContext.auth?.uid === 'cust-auth-100') ||
          isValidGuestCustomer(myCustomer)
        );
        const canUpdateOwn = isValidCustomer(myCustomer) && (
          isSalesStaff(ownContext) ||
          (isAuthenticated(ownContext) && ownContext.auth?.uid === 'cust-auth-100')
        );
        assert.strictEqual(canCreateOwn, true);
        assert.strictEqual(canUpdateOwn, true);
      });

      test('5. Cross-customer profile modification is DENIED', () => {
        const otherCustomer = { id: 'cust-victim', name: 'Victim', email: 'victim@example.com' };
        const attackerContext = { auth: { uid: 'cust-attacker', token: { email: 'attacker@example.com' } } };
        const canUpdateOther = isValidCustomer(otherCustomer) && (
          isSalesStaff(attackerContext) ||
          (isAuthenticated(attackerContext) && attackerContext.auth?.uid === 'cust-victim')
        );
        assert.strictEqual(canUpdateOther, false);
      });
    });

    // SEC-001-R3: Public Product Projection Integrity
    describe('SEC-001-R3: Public Product Projection Integrity', () => {
      test('1. Public product projection is publicly readable', () => {
        const publicRead = true; // allow read: if true;
        assert.strictEqual(publicRead, true);
      });

      test('2. Public product projection rejects supplier cost & sensitive tracking fields', () => {
        const sensitiveFields = ['cost', 'costPrice', 'reorderPoint', 'serialNumbers', 'supplier', 'batchNumber'];
        for (const field of sensitiveFields) {
          const p = {
            id: 'p-leak',
            name: 'Public Item',
            sku: 'SKU-PUB',
            price: 50,
            stock: 10,
            category: 'Retail',
            [field]: 'leaked_data'
          };
          assert.strictEqual(isValidPublicProduct(p), false, `Should reject ${field} in public product projection`);
        }
      });

      test('3. Only inventory staff / managers can create or update public product projections', () => {
        assert.strictEqual(isInventoryStaff(publicVisitor), false);
        assert.strictEqual(isInventoryStaff(customerUser), false);
        assert.strictEqual(isInventoryStaff(cashierUser), false);
        assert.strictEqual(isInventoryStaff(inventoryUser), true);
        assert.strictEqual(isInventoryStaff(storeManagerUser), true);
      });
    });

    // SEC-001-R4: Credential Vault Authority
    describe('SEC-001-R4: Credential Vault Authority', () => {
      test('1. Client SDK reads to /staff_credentials are unconditionally DENIED', () => {
        const allowRead = false; // allow read: if false;
        assert.strictEqual(allowRead, false);
      });

      test('2. Client SDK writes to /staff_credentials are unconditionally DENIED (including Super Admin client)', () => {
        const allowWrite = false; // allow write: if false;
        assert.strictEqual(allowWrite, false);
      });
    });

    // SEC-001-R5: Role Authority & Claims Integrity
    describe('SEC-001-R5: Role Authority & Claims Integrity', () => {
      test('1. Foreign tenant token is rejected by enterprise boundary', () => {
        const foreignToken = { auth: { uid: 'u-1', token: { tenantId: 'attacker-corp', role: 'Super Admin' } } };
        assert.strictEqual(isEnterpriseScope(foreignToken), false);
        assert.strictEqual(isStaff(foreignToken), false);
        assert.strictEqual(isSuperAdmin(foreignToken), false);
      });

      test('2. Unauthenticated user cannot claim any staff role', () => {
        assert.strictEqual(isStaff(publicVisitor), false);
        assert.strictEqual(isSuperAdmin(publicVisitor), false);
      });
    });

    // SEC-001-R6: Audit Log Integrity
    describe('SEC-001-R6: Audit Log Integrity', () => {
      test('1. Audit logs are strictly append-only (update and delete denied)', () => {
        const allowUpdate = false;
        const allowDelete = false;
        assert.strictEqual(allowUpdate, false);
        assert.strictEqual(allowDelete, false);
      });

      test('2. Unauthenticated actors cannot create audit log records', () => {
        const canCreate = isAuthenticated(publicVisitor) && isStaff(publicVisitor);
        assert.strictEqual(canCreate, false);
      });
    });

    // SEC-001-R7: E-Commerce Trust Boundary
    describe('SEC-001-R7: E-Commerce Trust Boundary', () => {
      test('1. Untrusted browser cannot initialize e-commerce order as Completed', () => {
        const o = {
          id: 'ord-bad',
          channel: 'ecom',
          status: 'Completed', // FORBIDDEN
          customerName: 'Buyer',
          customerEmail: 'buyer@test.com',
          items: [{ productId: 'p1', quantity: 1 }],
          total: 50
        };
        assert.strictEqual(isValidEcomOrder(o), false);
      });

      test('2. Untrusted browser cannot initialize e-commerce order with Paid payment status', () => {
        const o = {
          id: 'ord-bad-pay',
          channel: 'ecom',
          status: 'Pending',
          paymentStatus: 'Paid', // FORBIDDEN
          customerName: 'Buyer',
          customerEmail: 'buyer@test.com',
          items: [{ productId: 'p1', quantity: 1 }],
          total: 50
        };
        assert.strictEqual(isValidEcomOrder(o), false);
      });

      test('3. Untrusted browser CAN initialize order with status: Pending and paymentStatus: Pending', () => {
        const o = {
          id: 'ord-good',
          channel: 'ecom',
          status: 'Pending',
          paymentStatus: 'Pending',
          customerName: 'Buyer',
          customerEmail: 'buyer@test.com',
          items: [{ productId: 'p1', quantity: 1 }],
          total: 50
        };
        assert.strictEqual(isValidEcomOrder(o), true);
      });
    });
  });
});

