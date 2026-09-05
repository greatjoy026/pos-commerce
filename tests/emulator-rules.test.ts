import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { setDoc, getDoc, getDocs, updateDoc, deleteDoc, doc, collection, query, where } from 'firebase/firestore';

const PROJECT_ID = 'nexus-pos-commerce-test';

describe('SEC-001 — Firestore Emulator Security Rules Enforcement', () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: rulesContent,
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();

    // Seed baseline server-authoritative fixture data using admin context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();

      // Seed internal product with sensitive cost/supplier data
      await setDoc(doc(adminDb, 'products', 'prod-100'), {
        id: 'prod-100',
        name: 'Enterprise Barcode Scanner',
        sku: 'SCAN-100',
        price: 299.99,
        cost: 145.00, // SENSITIVE INTERNAL MARGIN
        stock: 50,
        category: 'Hardware',
        reorderPoint: 10, // SENSITIVE INVENTORY THRESHOLD
        supplier: 'Global Logistics Ltd' // SENSITIVE SUPPLIER
      });

      // Seed public product projection (safe storefront view)
      await setDoc(doc(adminDb, 'public_products', 'prod-100'), {
        id: 'prod-100',
        name: 'Enterprise Barcode Scanner',
        sku: 'SCAN-100',
        price: 299.99,
        availability: { status: 'IN_STOCK' },
        category: 'Hardware',
        publishOnline: true
      });

      // Seed store settings (internal private with supervisor PIN)
      await setDoc(doc(adminDb, 'settings', 'general'), {
        businessName: 'Nexus Enterprise Commerce',
        currency: 'SLE',
        taxRate: 8.5,
        supervisorPin: '9999',
        secret: 'internal_secret_token'
      });

      // Seed public-safe settings projection
      await setDoc(doc(adminDb, 'public_settings', 'general'), {
        businessName: 'Nexus Enterprise Commerce',
        currency: 'SLE',
        taxRate: 8.5
      });

      // Seed customers
      await setDoc(doc(adminDb, 'customers', 'cust-100'), {
        id: 'cust-100',
        name: 'Alice Customer',
        email: 'alice@example.com',
        loyaltyPoints: 150
      });

      await setDoc(doc(adminDb, 'customers', 'cust-200'), {
        id: 'cust-200',
        name: 'Bob Customer',
        email: 'bob@example.com',
        loyaltyPoints: 0
      });

      // Seed staff member
      await setDoc(doc(adminDb, 'staff', 'staff-cashier-1'), {
        id: 'staff-cashier-1',
        name: 'Carol Cashier',
        email: 'carol@nexus.com',
        role: 'Cashier',
        status: 'Active'
      });

      await setDoc(doc(adminDb, 'staff', 'staff-mgr-1'), {
        id: 'staff-mgr-1',
        name: 'Dave Manager',
        email: 'dave@nexus.com',
        role: 'Store Manager',
        status: 'Active'
      });

      // Seed segregated credentials vault
      await setDoc(doc(adminDb, 'staff_credentials', 'staff-cashier-1'), {
        staffId: 'staff-cashier-1',
        hashedPin: 'argon2id$hashedpin1234',
        updatedAt: '2026-09-03T12:00:00Z'
      });

      // Seed customer order
      await setDoc(doc(adminDb, 'orders', 'ord-cust-100'), {
        id: 'ord-cust-100',
        date: '2026-09-03T10:00:00Z',
        subtotal: 299.99,
        total: 325.49,
        channel: 'ecom',
        status: 'Pending',
        customerId: 'cust-100',
        customerName: 'Alice Customer',
        customerEmail: 'alice@example.com',
        paymentMethod: 'Credit Card'
      });

      // Seed audit log
      await setDoc(doc(adminDb, 'audit_logs', 'log-100'), {
        id: 'log-100',
        timestamp: '2026-09-03T09:00:00Z',
        staffName: 'Dave Manager',
        role: 'Store Manager',
        action: 'INVENTORY_RECONCILE',
        module: 'inventory',
        details: 'Reconciled 50 barcode scanners'
      });

      // Seed shift report
      await setDoc(doc(adminDb, 'shift_reports', 'shift-100'), {
        reportId: 'shift-100',
        terminalId: 'POS-TERM-01',
        staffName: 'Carol Cashier',
        shiftStartTime: '2026-09-03T08:00:00Z',
        totalSales: 1250.00
      });
    });
  });

  // ==========================================
  // Suite 1: Unauthenticated Visitor Permissions
  // ==========================================
  describe('1. Unauthenticated Visitor Permissions', () => {
    it('CANNOT read internal products collection (blocks cost & supplier exposure)', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauth, 'products', 'prod-100')));
    });

    it('CAN read public products projection collection (storefront safe catalog)', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertSucceeds(getDoc(doc(unauth, 'public_products', 'prod-100')));
    });

    it('CANNOT read customer records or list CRM directory', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauth, 'customers', 'cust-100')));
      await assertFails(getDocs(collection(unauth, 'customers')));
    });

    it('CANNOT read staff directory or inspect staff accounts', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauth, 'staff', 'staff-cashier-1')));
      await assertFails(getDocs(collection(unauth, 'staff')));
    });

    it('CANNOT read credentials vault', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauth, 'staff_credentials', 'staff-cashier-1')));
    });

    it('CANNOT write to credentials vault', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertFails(setDoc(doc(unauth, 'staff_credentials', 'staff-cashier-1'), { staffId: 'staff-cashier-1', hashedPin: 'evil' }));
    });

    it('CANNOT list arbitrary orders or read other orders', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDocs(collection(unauth, 'orders')));
      await assertFails(getDoc(doc(unauth, 'orders', 'ord-cust-100')));
    });

    it('CANNOT read audit logs', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDocs(collection(unauth, 'audit_logs')));
      await assertFails(getDoc(doc(unauth, 'audit_logs', 'log-100')));
    });

    it('CANNOT read private settings (/settings/general - blocks supervisor PINs and secrets)', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauth, 'settings', 'general')));
    });

    it('CAN read public-safe settings projection (/public_settings/general)', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertSucceeds(getDoc(doc(unauth, 'public_settings', 'general')));
    });

    it('CANNOT modify settings or public_settings', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertFails(updateDoc(doc(unauth, 'settings', 'general'), { taxRate: 0 }));
      await assertFails(updateDoc(doc(unauth, 'public_settings', 'general'), { taxRate: 0 }));
    });

    it('CANNOT arbitrarily create customer account without ecom_guest channel', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertFails(setDoc(doc(unauth, 'customers', 'cust-arbitrary'), {
        id: 'cust-arbitrary',
        name: 'Arbitrary Anonymous',
        email: 'anon@test.com'
      }));
    });

    it('CAN create guest customer profile with explicit ecom_guest channel and 0 loyalty points', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertSucceeds(setDoc(doc(unauth, 'customers', 'cust-guest-1'), {
        id: 'cust-guest-1',
        name: 'Guest Shopper',
        email: 'guest@test.com',
        channel: 'ecom_guest',
        loyaltyPoints: 0
      }));
    });

    it('CANNOT create guest customer profile with nonzero loyalty points (prevents point fraud)', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertFails(setDoc(doc(unauth, 'customers', 'cust-guest-hacked'), {
        id: 'cust-guest-hacked',
        name: 'Guest Hacker',
        email: 'hack@test.com',
        channel: 'ecom_guest',
        loyaltyPoints: 500
      }));
    });

    it('CANNOT write or update public_products projection (reserved for staff)', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertFails(setDoc(doc(unauth, 'public_products', 'prod-hacked'), {
        id: 'prod-hacked',
        name: 'Hacked Product',
        sku: 'HACK',
        price: 1,
        stock: 1,
        category: 'Test'
      }));
    });

    it('CANNOT read or write shift reports', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDocs(collection(unauth, 'shift_reports')));
      await assertFails(setDoc(doc(unauth, 'shift_reports', 'fake-shift'), {
        reportId: 'fake-shift',
        terminalId: 'POS-01',
        staffName: 'Hacker',
        shiftStartTime: '2026-09-03',
        totalSales: 0
      }));
    });

    it('CAN place valid untrusted e-commerce order initialized as Pending', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertSucceeds(setDoc(doc(unauth, 'orders', 'ord-ecom-valid'), {
        id: 'ord-ecom-valid',
        date: '2026-09-03T12:00:00Z',
        subtotal: 100.00,
        total: 108.50,
        channel: 'ecom',
        status: 'Pending',
        paymentStatus: 'Pending',
        customerName: 'Online Shopper',
        customerEmail: 'shopper@test.com',
        items: [{ productId: 'prod-100', quantity: 1, price: 100.00 }]
      }));
    });

    it('CANNOT place e-commerce order initialized as Completed or Paid (untrusted client protection)', async () => {
      const unauth = testEnv.unauthenticatedContext().firestore();
      // Attempting to bypass checkout payment by self-marking as Completed
      await assertFails(setDoc(doc(unauth, 'orders', 'ord-ecom-bypass'), {
        id: 'ord-ecom-bypass',
        date: '2026-09-03T12:00:00Z',
        subtotal: 100.00,
        total: 108.50,
        channel: 'ecom',
        status: 'Completed', // FORBIDDEN FOR UNTRUSTED CLIENT
        paymentStatus: 'Paid', // FORBIDDEN FOR UNTRUSTED CLIENT
        customerName: 'Online Shopper',
        customerEmail: 'shopper@test.com',
        items: [{ productId: 'prod-100', quantity: 1, price: 100.00 }]
      }));
    });
  });

  // ==========================================
  // Suite 2: Authenticated Customer Access Boundary
  // ==========================================
  describe('2. Authenticated Customer Boundary', () => {
    it('CANNOT list all enterprise orders unscoped', async () => {
      const customer = testEnv.authenticatedContext('cust-100', { email: 'alice@example.com' }).firestore();
      await assertFails(getDocs(collection(customer, 'orders')));
    });

    it('CAN list their own orders when query is scoped to customerId', async () => {
      const customer = testEnv.authenticatedContext('cust-100', { email: 'alice@example.com' }).firestore();
      const ownOrdersQuery = query(collection(customer, 'orders'), where('customerId', '==', 'cust-100'));
      await assertSucceeds(getDocs(ownOrdersQuery));
    });

    it('CAN retrieve their own order document', async () => {
      const customer = testEnv.authenticatedContext('cust-100', { email: 'alice@example.com' }).firestore();
      await assertSucceeds(getDoc(doc(customer, 'orders', 'ord-cust-100')));
    });

    it('CANNOT retrieve another customer’s order document', async () => {
      const customerBob = testEnv.authenticatedContext('cust-200', { email: 'bob@example.com' }).firestore();
      await assertFails(getDoc(doc(customerBob, 'orders', 'ord-cust-100')));
    });

    it('CANNOT read staff directory or credentials vault', async () => {
      const customer = testEnv.authenticatedContext('cust-100', { email: 'alice@example.com' }).firestore();
      await assertFails(getDocs(collection(customer, 'staff')));
      await assertFails(getDoc(doc(customer, 'staff_credentials', 'staff-cashier-1')));
    });

    it('CANNOT read CRM directory', async () => {
      const customer = testEnv.authenticatedContext('cust-100', { email: 'alice@example.com' }).firestore();
      await assertFails(getDocs(collection(customer, 'customers')));
    });

    it('CAN create their own customer profile with matching UID', async () => {
      const customerNew = testEnv.authenticatedContext('cust-300', { email: 'charlie@example.com' }).firestore();
      await assertSucceeds(setDoc(doc(customerNew, 'customers', 'cust-300'), {
        id: 'cust-300',
        name: 'Charlie Customer',
        email: 'charlie@example.com'
      }));
    });

    it('CANNOT create arbitrary customer profile with mismatched UID without ecom_guest', async () => {
      const customer = testEnv.authenticatedContext('cust-100', { email: 'alice@example.com' }).firestore();
      await assertFails(setDoc(doc(customer, 'customers', 'cust-999'), {
        id: 'cust-999',
        name: 'Spoofed Profile',
        email: 'spoof@example.com'
      }));
    });

    it('CAN read and update their own customer profile', async () => {
      const customer = testEnv.authenticatedContext('cust-100', { email: 'alice@example.com' }).firestore();
      await assertSucceeds(getDoc(doc(customer, 'customers', 'cust-100')));
      await assertSucceeds(updateDoc(doc(customer, 'customers', 'cust-100'), {
        name: 'Alice Updated',
        email: 'alice@example.com'
      }));
    });

    it('CANNOT update another customer profile', async () => {
      const customer = testEnv.authenticatedContext('cust-100', { email: 'alice@example.com' }).firestore();
      await assertFails(updateDoc(doc(customer, 'customers', 'cust-200'), { name: 'Bob Hacked' }));
    });

    it('CANNOT read private settings (/settings/general)', async () => {
      const customer = testEnv.authenticatedContext('cust-100', { email: 'alice@example.com' }).firestore();
      await assertFails(getDoc(doc(customer, 'settings', 'general')));
    });

    it('CAN read public settings (/public_settings/general)', async () => {
      const customer = testEnv.authenticatedContext('cust-100', { email: 'alice@example.com' }).firestore();
      await assertSucceeds(getDoc(doc(customer, 'public_settings', 'general')));
    });

    it('CANNOT modify internal products or settings or public_settings', async () => {
      const customer = testEnv.authenticatedContext('cust-100', { email: 'alice@example.com' }).firestore();
      await assertFails(setDoc(doc(customer, 'products', 'new-prod'), {
        id: 'new-prod',
        name: 'Fake Prod',
        sku: 'FAKE',
        price: 1,
        stock: 1,
        category: 'Test'
      }));
      await assertFails(updateDoc(doc(customer, 'settings', 'general'), { taxRate: 0 }));
      await assertFails(updateDoc(doc(customer, 'public_settings', 'general'), { taxRate: 0 }));
    });

    it('CANNOT modify or read audit logs', async () => {
      const customer = testEnv.authenticatedContext('cust-100', { email: 'alice@example.com' }).firestore();
      await assertFails(getDocs(collection(customer, 'audit_logs')));
      await assertFails(deleteDoc(doc(customer, 'audit_logs', 'log-100')));
    });
  });

  // ==========================================
  // Suite 3: Cashier Role Boundaries
  // ==========================================
  describe('3. Cashier Role Boundaries', () => {
    it('CAN read internal products (for POS terminal barcode lookup)', async () => {
      const cashier = testEnv.authenticatedContext('staff-cashier-1', { role: 'Cashier', isStaff: true }).firestore();
      await assertSucceeds(getDoc(doc(cashier, 'products', 'prod-100')));
    });

    it('CAN read staff directory but CANNOT read credentials vault', async () => {
      const cashier = testEnv.authenticatedContext('staff-cashier-1', { role: 'Cashier', isStaff: true }).firestore();
      await assertSucceeds(getDoc(doc(cashier, 'staff', 'staff-cashier-1')));
      await assertFails(getDoc(doc(cashier, 'staff_credentials', 'staff-cashier-1')));
    });

    it('CAN create valid POS orders (channel == pos)', async () => {
      const cashier = testEnv.authenticatedContext('staff-cashier-1', { role: 'Cashier', isStaff: true }).firestore();
      await assertSucceeds(setDoc(doc(cashier, 'orders', 'ord-pos-cashier'), {
        id: 'ord-pos-cashier',
        date: '2026-09-03T14:00:00Z',
        subtotal: 50.00,
        total: 54.25,
        channel: 'pos',
        status: 'Completed'
      }));
    });

    it('CAN list enterprise orders for POS register lookups', async () => {
      const cashier = testEnv.authenticatedContext('staff-cashier-1', { role: 'Cashier', isStaff: true }).firestore();
      await assertSucceeds(getDocs(collection(cashier, 'orders')));
    });

    it('CANNOT delete orders', async () => {
      const cashier = testEnv.authenticatedContext('staff-cashier-1', { role: 'Cashier', isStaff: true }).firestore();
      await assertFails(deleteDoc(doc(cashier, 'orders', 'ord-cust-100')));
    });

    it('CANNOT perform inventory administration (create or delete products)', async () => {
      const cashier = testEnv.authenticatedContext('staff-cashier-1', { role: 'Cashier', isStaff: true }).firestore();
      await assertFails(setDoc(doc(cashier, 'products', 'prod-unauth-by-cashier'), {
        id: 'prod-unauth-by-cashier',
        name: 'Unauthorized',
        sku: 'UNAUTH',
        price: 10,
        stock: 10,
        category: 'Test'
      }));
      await assertFails(deleteDoc(doc(cashier, 'products', 'prod-100')));
    });

    it('CANNOT perform staff administration or change roles', async () => {
      const cashier = testEnv.authenticatedContext('staff-cashier-1', { role: 'Cashier', isStaff: true }).firestore();
      await assertFails(setDoc(doc(cashier, 'staff', 'new-staff'), {
        id: 'new-staff',
        name: 'New Cashier',
        email: 'cashier2@nexus.com',
        role: 'Cashier',
        status: 'Active'
      }));
      // Cannot elevate own role
      await assertFails(updateDoc(doc(cashier, 'staff', 'staff-cashier-1'), {
        role: 'Super Admin'
      }));
    });

    it('CANNOT read audit logs', async () => {
      const cashier = testEnv.authenticatedContext('staff-cashier-1', { role: 'Cashier', isStaff: true }).firestore();
      await assertFails(getDocs(collection(cashier, 'audit_logs')));
    });

    it('CAN create valid shift report for register reconciliation', async () => {
      const cashier = testEnv.authenticatedContext('staff-cashier-1', { role: 'Cashier', isStaff: true }).firestore();
      await assertSucceeds(setDoc(doc(cashier, 'shift_reports', 'shift-cashier-closeout'), {
        reportId: 'shift-cashier-closeout',
        terminalId: 'POS-01',
        staffName: 'Carol Cashier',
        shiftStartTime: '2026-09-03T08:00:00Z',
        totalSales: 450.00
      }));
    });

    it('CANNOT delete shift reports (permanent financial record)', async () => {
      const cashier = testEnv.authenticatedContext('staff-cashier-1', { role: 'Cashier', isStaff: true }).firestore();
      await assertFails(deleteDoc(doc(cashier, 'shift_reports', 'shift-100')));
    });
  });

  // ==========================================
  // Suite 4: Inventory Manager Role Boundaries
  // ==========================================
  describe('4. Inventory Manager Role Boundaries', () => {
    it('CAN create and update internal products and public projections with valid schema', async () => {
      const invMgr = testEnv.authenticatedContext('staff-inv-1', { role: 'Inventory Manager', isStaff: true }).firestore();
      await assertSucceeds(setDoc(doc(invMgr, 'products', 'prod-200'), {
        id: 'prod-200',
        name: 'Laser Thermal Printer',
        sku: 'PRINT-200',
        price: 189.00,
        stock: 25,
        category: 'Printers'
      }));

      await assertSucceeds(setDoc(doc(invMgr, 'public_products', 'prod-200'), {
        id: 'prod-200',
        name: 'Laser Thermal Printer',
        sku: 'PRINT-200',
        price: 189.00,
        availability: { status: 'IN_STOCK' },
        category: 'Printers'
      }));
    });

    it('CANNOT delete products (reserved for Store Manager / Admin)', async () => {
      const invMgr = testEnv.authenticatedContext('staff-inv-1', { role: 'Inventory Manager', isStaff: true }).firestore();
      await assertFails(deleteDoc(doc(invMgr, 'products', 'prod-100')));
    });

    it('CANNOT modify settings or delete orders', async () => {
      const invMgr = testEnv.authenticatedContext('staff-inv-1', { role: 'Inventory Manager', isStaff: true }).firestore();
      await assertFails(updateDoc(doc(invMgr, 'settings', 'general'), { taxRate: 0 }));
      await assertFails(deleteDoc(doc(invMgr, 'orders', 'ord-cust-100')));
    });
  });

  // ==========================================
  // Suite 5: Store Manager Role Boundaries
  // ==========================================
  describe('5. Store Manager Role Boundaries', () => {
    it('CAN read audit logs and delete products', async () => {
      const storeMgr = testEnv.authenticatedContext('staff-mgr-1', { role: 'Store Manager', isStaff: true }).firestore();
      await assertSucceeds(getDocs(collection(storeMgr, 'audit_logs')));
      await assertSucceeds(deleteDoc(doc(storeMgr, 'products', 'prod-100')));
    });

    it('CAN modify store settings with valid schema', async () => {
      const storeMgr = testEnv.authenticatedContext('staff-mgr-1', { role: 'Store Manager', isStaff: true }).firestore();
      await assertSucceeds(setDoc(doc(storeMgr, 'settings', 'general'), {
        businessName: 'Nexus Enterprise Commerce Updated',
        currency: 'SLE',
        taxRate: 9.0
      }));
    });

    it('CAN create staff accounts with valid schema', async () => {
      const storeMgr = testEnv.authenticatedContext('staff-mgr-1', { role: 'Store Manager', isStaff: true }).firestore();
      await assertSucceeds(setDoc(doc(storeMgr, 'staff', 'staff-new-hire'), {
        id: 'staff-new-hire',
        name: 'Edward Employee',
        email: 'edward@nexus.com',
        role: 'Warehouse Staff',
        status: 'Active'
      }));
    });

    it('CANNOT delete staff accounts (reserved for Super Admin)', async () => {
      const storeMgr = testEnv.authenticatedContext('staff-mgr-1', { role: 'Store Manager', isStaff: true }).firestore();
      await assertFails(deleteDoc(doc(storeMgr, 'staff', 'staff-cashier-1')));
    });

    it('CANNOT update or delete audit logs (strictly immutable append-only ledger)', async () => {
      const storeMgr = testEnv.authenticatedContext('staff-mgr-1', { role: 'Store Manager', isStaff: true }).firestore();
      await assertFails(updateDoc(doc(storeMgr, 'audit_logs', 'log-100'), { details: 'Tampered' }));
      await assertFails(deleteDoc(doc(storeMgr, 'audit_logs', 'log-100')));
    });

    it('CANNOT delete shift reports (permanent financial records)', async () => {
      const storeMgr = testEnv.authenticatedContext('staff-mgr-1', { role: 'Store Manager', isStaff: true }).firestore();
      await assertFails(deleteDoc(doc(storeMgr, 'shift_reports', 'shift-100')));
    });
  });

  // ==========================================
  // Suite 6: Super Admin Role Permissions
  // ==========================================
  describe('6. Super Admin Permissions', () => {
    it('CAN delete staff accounts and delete orders', async () => {
      const admin = testEnv.authenticatedContext('staff-admin-1', { role: 'Super Admin', admin: true, isStaff: true }).firestore();
      await assertSucceeds(deleteDoc(doc(admin, 'staff', 'staff-cashier-1')));
      await assertSucceeds(deleteDoc(doc(admin, 'orders', 'ord-cust-100')));
    });

    it('CANNOT update or delete audit logs (strictly immutable even for Super Admin)', async () => {
      const admin = testEnv.authenticatedContext('staff-admin-1', { role: 'Super Admin', admin: true, isStaff: true }).firestore();
      await assertFails(updateDoc(doc(admin, 'audit_logs', 'log-100'), { details: 'Admin Tamper' }));
      await assertFails(deleteDoc(doc(admin, 'audit_logs', 'log-100')));
    });

    it('CANNOT delete shift reports (strictly permanent even for Super Admin)', async () => {
      const admin = testEnv.authenticatedContext('staff-admin-1', { role: 'Super Admin', admin: true, isStaff: true }).firestore();
      await assertFails(deleteDoc(doc(admin, 'shift_reports', 'shift-100')));
    });

    it('CANNOT read or write staff_credentials directly from client SDK (vault is closed to all clients)', async () => {
      const admin = testEnv.authenticatedContext('staff-admin-1', { role: 'Super Admin', admin: true, isStaff: true }).firestore();
      await assertFails(getDoc(doc(admin, 'staff_credentials', 'staff-cashier-1')));
      await assertFails(setDoc(doc(admin, 'staff_credentials', 'staff-cashier-1'), {
        staffId: 'staff-cashier-1',
        hashedPin: 'argon2id$hacked'
      }));
    });
  });

  // ==========================================
  // Suite 7: Threat & Attack Penetration Payloads
  // ==========================================
  describe('7. Threat & Penetration Payloads', () => {
    it('Rejects negative product price injection', async () => {
      const invMgr = testEnv.authenticatedContext('staff-inv-1', { role: 'Inventory Manager', isStaff: true }).firestore();
      await assertFails(setDoc(doc(invMgr, 'products', 'prod-bad-price'), {
        id: 'prod-bad-price',
        name: 'Negative Price Item',
        sku: 'NEG-01',
        price: -50.00,
        stock: 10,
        category: 'Test'
      }));
    });

    it('Rejects negative stock quantity injection', async () => {
      const invMgr = testEnv.authenticatedContext('staff-inv-1', { role: 'Inventory Manager', isStaff: true }).firestore();
      await assertFails(setDoc(doc(invMgr, 'products', 'prod-bad-stock'), {
        id: 'prod-bad-stock',
        name: 'Negative Stock Item',
        sku: 'NEG-STK',
        price: 15.00,
        stock: -100,
        category: 'Test'
      }));
    });

    it('Rejects injection of sensitive cost and operational stock fields into public_products projection', async () => {
      const invMgr = testEnv.authenticatedContext('staff-inv-1', { role: 'Inventory Manager', isStaff: true }).firestore();
      // Leaking cost
      await assertFails(setDoc(doc(invMgr, 'public_products', 'prod-leak-cost'), {
        id: 'prod-leak-cost',
        name: 'Leaky Cost Product',
        sku: 'LEAK-01',
        price: 50.00,
        cost: 15.00, // VIOLATION: cost is forbidden on public projection!
        category: 'Test'
      }));
      // Leaking operational stock
      await assertFails(setDoc(doc(invMgr, 'public_products', 'prod-leak-stock'), {
        id: 'prod-leak-stock',
        name: 'Leaky Stock Product',
        sku: 'LEAK-02',
        price: 50.00,
        stock: 10, // VIOLATION: exact stock is forbidden on public projection!
        category: 'Test'
      }));
    });

    it('Rejects injection of confidential supervisor PIN or secret into public_settings projection', async () => {
      const storeMgr = testEnv.authenticatedContext('staff-mgr-1', { role: 'Store Manager', isStaff: true }).firestore();
      await assertFails(setDoc(doc(storeMgr, 'public_settings', 'general'), {
        businessName: 'Nexus Enterprise',
        currency: 'SLE',
        taxRate: 8.5,
        supervisorPin: '1234' // VIOLATION: forbidden in public settings!
      }));
      await assertFails(setDoc(doc(storeMgr, 'public_settings', 'general'), {
        businessName: 'Nexus Enterprise',
        currency: 'SLE',
        taxRate: 8.5,
        secret: 'vault_secret' // VIOLATION: forbidden in public settings!
      }));
    });

    it('Rejects forged role escalation from unprivileged account', async () => {
      const attacker = testEnv.authenticatedContext('attacker-1', { role: 'Attacker' }).firestore();
      await assertFails(setDoc(doc(attacker, 'staff', 'attacker-1'), {
        id: 'attacker-1',
        name: 'Attacker',
        email: 'attacker@evil.com',
        role: 'Super Admin',
        status: 'Active'
      }));
    });

    it('Rejects foreign tenant token attempting unauthorized access', async () => {
      // In single-enterprise model, unknown tenant context cannot bypass rules
      const foreignUser = testEnv.authenticatedContext('foreign-1', { tenantId: 'foreign-corp', role: 'Viewer' }).firestore();
      await assertFails(getDoc(doc(foreignUser, 'products', 'prod-100')));
    });

    it('Rejects illegal special characters in document ID', async () => {
      const storeMgr = testEnv.authenticatedContext('staff-mgr-1', { role: 'Store Manager', isStaff: true }).firestore();
      await assertFails(setDoc(doc(storeMgr, 'products', 'prod$hack%bad'), {
        id: 'prod$hack%bad',
        name: 'Special Char Injection',
        sku: 'BAD-ID',
        price: 10,
        stock: 10,
        category: 'Test'
      }));
    });

    it('Rejects extreme tax rate injection (> 100% or < 0%) in settings', async () => {
      const storeMgr = testEnv.authenticatedContext('staff-mgr-1', { role: 'Store Manager', isStaff: true }).firestore();
      await assertFails(setDoc(doc(storeMgr, 'settings', 'general'), {
        businessName: 'Nexus Enterprise',
        currency: 'SLE',
        taxRate: 500 // VIOLATION: > 100
      }));
    });
  });
});
