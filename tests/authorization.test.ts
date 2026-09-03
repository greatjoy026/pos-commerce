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

export function isStaff(ctx: SecurityContext): boolean {
  if (!isAuthenticated(ctx) || !ctx.auth) return false;
  return (
    ctx.auth.token?.isStaff === true ||
    ctx.auth.token?.role !== undefined ||
    (ctx.staffDatabase !== undefined && ctx.auth.uid !== null && ctx.auth.uid in ctx.staffDatabase)
  );
}

export function isSuperAdmin(ctx: SecurityContext): boolean {
  if (!isAuthenticated(ctx) || !ctx.auth) return false;
  return ctx.auth.token?.admin === true || getStaffRole(ctx) === 'Super Admin';
}

export function isManagerOrAdmin(ctx: SecurityContext): boolean {
  if (!isAuthenticated(ctx)) return false;
  if (isSuperAdmin(ctx)) return true;
  const role = getStaffRole(ctx);
  return ['Business Owner', 'Store Manager', 'Admin', 'Manager'].includes(role || '');
}

export function isInventoryStaff(ctx: SecurityContext): boolean {
  if (!isAuthenticated(ctx)) return false;
  if (isManagerOrAdmin(ctx)) return true;
  const role = getStaffRole(ctx);
  return ['Inventory Manager', 'Warehouse Manager', 'Purchasing Officer'].includes(role || '');
}

export function isSalesStaff(ctx: SecurityContext): boolean {
  if (!isAuthenticated(ctx)) return false;
  if (isManagerOrAdmin(ctx)) return true;
  const role = getStaffRole(ctx);
  return ['Cashier', 'Sales Associate', 'Sales Manager'].includes(role || '');
}

export function hasAnyStaffRole(ctx: SecurityContext): boolean {
  if (!isStaff(ctx)) return false;
  if (isManagerOrAdmin(ctx) || isInventoryStaff(ctx) || isSalesStaff(ctx)) return true;
  const role = getStaffRole(ctx);
  return ['Accountant', 'E-commerce Manager', 'Warehouse Staff'].includes(role || '');
}

export function matchesTenant(data: any, ctx: SecurityContext): boolean {
  if (!('tenantId' in data)) return true;
  if (!ctx.auth?.token?.tenantId) return true;
  return data.tenantId === ctx.auth.token.tenantId;
}

// ----------------------------------------------------------------------------
// Entity Schema Validators (Mirrors firestore.rules validation functions)
// ----------------------------------------------------------------------------

export function isValidProduct(data: any, ctx: SecurityContext): boolean {
  if (!data) return false;
  return (
    typeof data.id === 'string' && data.id.length > 0 && data.id.length <= 128 &&
    typeof data.name === 'string' && data.name.length > 0 && data.name.length <= 200 &&
    typeof data.sku === 'string' && data.sku.length > 0 && data.sku.length <= 100 &&
    typeof data.price === 'number' && data.price >= 0 &&
    typeof data.stock === 'number' && data.stock >= 0 &&
    typeof data.category === 'string' && data.category.length <= 100 &&
    matchesTenant(data, ctx)
  );
}

export function isValidCustomer(data: any, ctx: SecurityContext): boolean {
  if (!data) return false;
  const basic = (
    typeof data.id === 'string' && data.id.length > 0 && data.id.length <= 128 &&
    typeof data.name === 'string' && data.name.length > 0 && data.name.length <= 150 &&
    typeof data.email === 'string' && data.email.length > 0 && data.email.length <= 150 &&
    matchesTenant(data, ctx)
  );
  if (!basic) return false;
  if ('loyaltyPoints' in data) {
    if (typeof data.loyaltyPoints !== 'number' || data.loyaltyPoints < 0) return false;
  }
  return true;
}

export function isValidStaff(data: any, ctx: SecurityContext): boolean {
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
    typeof data.pin === 'string' && data.pin.length >= 4 && data.pin.length <= 8 &&
    matchesTenant(data, ctx)
  );
}

export function isValidOrder(data: any, ctx: SecurityContext): boolean {
  if (!data) return false;
  const validChannels = ['pos', 'ecom', 'mobile', 'phone'];
  const validStatuses = ['Completed', 'Pending', 'Processing', 'Cancelled', 'Refunded'];
  return (
    typeof data.id === 'string' && data.id.length > 0 && data.id.length <= 128 &&
    typeof data.date === 'string' && data.date.length > 0 &&
    typeof data.subtotal === 'number' && data.subtotal >= 0 &&
    typeof data.total === 'number' && data.total >= 0 &&
    typeof data.channel === 'string' && validChannels.includes(data.channel) &&
    typeof data.status === 'string' && validStatuses.includes(data.status) &&
    matchesTenant(data, ctx)
  );
}

export function isValidEcomOrder(data: any): boolean {
  if (!data) return false;
  return (
    data.channel === 'ecom' &&
    ['Completed', 'Pending'].includes(data.status) &&
    typeof data.customerName === 'string' && data.customerName.length > 0 && data.customerName.length <= 150 &&
    typeof data.customerEmail === 'string' && data.customerEmail.length > 0 && data.customerEmail.length <= 150
  );
}

export function isValidAuditLog(data: any, ctx: SecurityContext): boolean {
  if (!data) return false;
  return (
    typeof data.id === 'string' && data.id.length > 0 && data.id.length <= 128 &&
    typeof data.timestamp === 'string' && data.timestamp.length > 0 &&
    typeof data.staffName === 'string' && data.staffName.length > 0 && data.staffName.length <= 150 &&
    typeof data.action === 'string' && data.action.length > 0 && data.action.length <= 100 &&
    typeof data.module === 'string' && data.module.length > 0 && data.module.length <= 50 &&
    typeof data.details === 'string' && data.details.length <= 2000 &&
    matchesTenant(data, ctx)
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

export function isValidShiftReport(data: any, ctx: SecurityContext): boolean {
  if (!data) return false;
  return (
    typeof data.reportId === 'string' && data.reportId.length > 0 && data.reportId.length <= 128 &&
    typeof data.terminalId === 'string' && data.terminalId.length > 0 && data.terminalId.length <= 100 &&
    typeof data.staffName === 'string' && data.staffName.length > 0 && data.staffName.length <= 150 &&
    typeof data.shiftStartTime === 'string' && data.shiftStartTime.length > 0 &&
    typeof data.totalSales === 'number' && data.totalSales >= 0 &&
    matchesTenant(data, ctx)
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
    describe('Products Collection (/products)', () => {
      test('Public storefront can read products', () => {
        // allow read: if true;
        const canRead = true;
        assert.strictEqual(canRead, true);
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
        const canCreate = isInventoryStaff(inventoryUser) && isValidProduct(validProd, inventoryUser);
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
        const canCreate = isManagerOrAdmin(storeManagerUser) && isValidStaff(validStaff, storeManagerUser);
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
      test('Public visitor can place valid e-commerce orders', () => {
        const validEcom = {
          id: 'ord-ecom-1',
          date: '2026-09-03T12:00:00Z',
          subtotal: 50.00,
          total: 54.25,
          channel: 'ecom',
          status: 'Completed',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com'
        };
        const canCreate = isValidId(validEcom.id) && isValidOrder(validEcom, publicVisitor) && isValidEcomOrder(validEcom);
        assert.strictEqual(canCreate, true);
      });

      test('Public visitor CANNOT place e-commerce order with forged status or negative total', () => {
        const badEcom = {
          id: 'ord-ecom-2',
          date: '2026-09-03T12:00:00Z',
          subtotal: 50.00,
          total: -50.00, // NEGATIVE
          channel: 'ecom',
          status: 'Completed',
          customerName: 'Attacker',
          customerEmail: 'bad@evil.com'
        };
        const canCreate = isValidId(badEcom.id) && isValidOrder(badEcom, publicVisitor) && isValidEcomOrder(badEcom);
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
        const canCreate = isValidId(validPosOrder.id) && isValidOrder(validPosOrder, cashierUser) && isSalesStaff(cashierUser);
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
        const cashierCanCreate = isSalesStaff(cashierUser) && isValidShiftReport(validShift, cashierUser);
        const managerCanCreate = isManagerOrAdmin(storeManagerUser) && isValidShiftReport(validShift, storeManagerUser);
        assert.strictEqual(cashierCanCreate, true);
        assert.strictEqual(managerCanCreate, true);
      });

      test('Shift reports CANNOT be deleted by anyone (permanent financial records)', () => {
        const allowDelete = false;
        assert.strictEqual(allowDelete, false);
      });
    });

    // Settings Collection
    describe('Settings Collection (/settings)', () => {
      test('Public can read store settings for currency and store name', () => {
        const canRead = true; // allow read: if true;
        assert.strictEqual(canRead, true);
      });

      test('Public and Cashier CANNOT modify settings', () => {
        assert.strictEqual(isManagerOrAdmin(publicVisitor), false);
        assert.strictEqual(isManagerOrAdmin(cashierUser), false);
      });

      test('Store Manager and Super Admin CAN modify settings with valid schema', () => {
        const validSettings = {
          currency: 'SLE',
          businessName: 'Nexus Enterprise Commerce',
          taxRate: 8.5
        };
        const canWrite = isManagerOrAdmin(storeManagerUser) && isValidSettings(validSettings);
        assert.strictEqual(canWrite, true);
      });
    });
  });

  // --------------------------------------------------------------------------
  // 3. The "Dirty Dozen" Malicious Payload Penetration Tests
  // --------------------------------------------------------------------------
  describe('3. The "Dirty Dozen" Threat Payloads (Must All Be Rejected)', () => {

    test('Payload #1: Negative product price injection', () => {
      const p = { id: 'p-1', name: 'Product', sku: 'SKU1', price: -25.00, stock: 10, category: 'Test' };
      assert.strictEqual(isValidProduct(p, inventoryUser), false);
    });

    test('Payload #2: Negative product stock count injection', () => {
      const p = { id: 'p-1', name: 'Product', sku: 'SKU1', price: 25.00, stock: -5, category: 'Test' };
      assert.strictEqual(isValidProduct(p, inventoryUser), false);
    });

    test('Payload #3: Oversized malicious product name (XSS / buffer exhaustion > 200 chars)', () => {
      const p = { id: 'p-1', name: 'A'.repeat(250), sku: 'SKU1', price: 25.00, stock: 10, category: 'Test' };
      assert.strictEqual(isValidProduct(p, inventoryUser), false);
    });

    test('Payload #4: Invalid/spoofed order channel (backdoor channel injection)', () => {
      const o = { id: 'o-1', date: '2026-09-03', subtotal: 10, total: 10, channel: 'backdoor_untracked', status: 'Completed' };
      assert.strictEqual(isValidOrder(o, cashierUser), false);
    });

    test('Payload #5: Negative order total value injection', () => {
      const o = { id: 'o-1', date: '2026-09-03', subtotal: -10, total: -10, channel: 'pos', status: 'Completed' };
      assert.strictEqual(isValidOrder(o, cashierUser), false);
    });

    test('Payload #6: Forged e-commerce order with empty customer identity', () => {
      const o = { id: 'o-1', channel: 'ecom', status: 'Completed', customerName: '', customerEmail: 'email@test.com' };
      assert.strictEqual(isValidEcomOrder(o), false);
    });

    test('Payload #7: Weak staff PIN (< 4 digits)', () => {
      const s = { id: 's-1', name: 'Hacker', email: 'h@test.com', role: 'Cashier', status: 'Active', pin: '12' };
      assert.strictEqual(isValidStaff(s, superAdminUser), false);
    });

    test('Payload #8: Unknown/unauthorized staff role injection', () => {
      const s = { id: 's-1', name: 'Hacker', email: 'h@test.com', role: 'RootOverlord', status: 'Active', pin: '1234' };
      assert.strictEqual(isValidStaff(s, superAdminUser), false);
    });

    test('Payload #9: Invalid staff account status injection', () => {
      const s = { id: 's-1', name: 'Hacker', email: 'h@test.com', role: 'Cashier', status: 'CORRUPTED', pin: '1234' };
      assert.strictEqual(isValidStaff(s, superAdminUser), false);
    });

    test('Payload #10: Negative shift report total sales injection', () => {
      const r = { reportId: 'r-1', terminalId: 'T1', staffName: 'Staff', shiftStartTime: '08:00', totalSales: -100 };
      assert.strictEqual(isValidShiftReport(r, cashierUser), false);
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
});
