import React, { useState, useEffect } from 'react';
import { 
  INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_STAFF, 
  INITIAL_ORDERS, INITIAL_AUDIT_LOGS 
} from './data/mockData';
import { Product, Customer, StaffMember, Order, AuditLog, SystemSettings } from './types';
import { normalizeProduct } from './domain/product';
import { 
  seedInitialFirestoreData,
  subscribeProducts, saveProductToDB, deleteProductFromDB,
  subscribeCustomers, saveCustomerToDB, deleteCustomerFromDB,
  subscribeOrders, saveOrderToDB,
  subscribeStaff, saveStaffToDB, deleteStaffFromDB,
  subscribeAuditLogs, saveAuditLogToDB,
  subscribeSettings, saveSettingsToDB, DEFAULT_SETTINGS
} from './services/dbService';

// Import subcomponents
import DashboardOverview from './components/DashboardOverview';
import InventoryModule from './components/InventoryModule';
import POSModule from './components/POSModule';
import ECommerceStorefront from './components/ECommerceStorefront';
import CRMModule from './components/CRMModule';
import InvoiceModule from './components/InvoiceModule';
import ReportsModule from './components/ReportsModule';
import SecurityModule from './components/SecurityModule';
import SettingsModule from './components/SettingsModule';
import CurrencySelectorModal from './components/CurrencySelectorModal';
import EnhancedSidebar, { AdminSubTab } from './components/EnhancedSidebar';
import { useCurrency } from './context/CurrencyContext';

// Icons
import { 
  LayoutDashboard, Package, Smartphone, ShieldCheck, 
  Users, FileText, ShoppingBag, Terminal, Network, WifiOff, RefreshCw, Coins, Menu 
} from 'lucide-react';

export default function App() {
  // Database States
  const [products, setProducts] = useState<Product[]>(() => INITIAL_PRODUCTS.map(p => normalizeProduct(p)));
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(INITIAL_STAFF);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  // Operator states
  const [activeStaff, setActiveStaff] = useState<StaffMember>(INITIAL_STAFF[0]); // Elena (Admin)
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(INITIAL_CUSTOMERS[0]); // Sarah Connor

  // Navigation states
  const [currentView, setCurrentView] = useState<'Admin' | 'ECommerce'>('Admin');
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('Dashboard');

  // Central System Settings state
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // Sidebar responsiveness & static rail state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'syncing' | 'offline' | 'error'>('connected');
  const [lastSynced, setLastSynced] = useState<string>('Just now');

  // Mobile POS specific simulator state
  const [mobilePosActive, setMobilePosActive] = useState(false);
  const [deviceOffline, setDeviceOffline] = useState(false);
  const [offlineBuffer, setOfflineBuffer] = useState<{ id: string; total: number; qty: number }[]>([]);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const { currentCurrency } = useCurrency();

  // Metrics computation for sidebar badges
  const lowStockCount = products.filter(p => p.stock <= 10).length;
  const totalOrdersCount = orders.length;
  const totalCustomersCount = customers.length;

  const handleManualSync = () => {
    setDbStatus('syncing');
    seedInitialFirestoreData().catch(() => {});
    setTimeout(() => {
      setDbStatus('connected');
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 600);
  };

  // Live Firestore database synchronization with fallback to local storage
  useEffect(() => {
    // 1. Check local cache first for instant boot
    const savedProds = localStorage.getItem('nexus_products');
    const savedCusts = localStorage.getItem('nexus_customers');
    const savedOrders = localStorage.getItem('nexus_orders');
    const savedLogs = localStorage.getItem('nexus_audit_logs');
    const savedSettings = localStorage.getItem('nexus_system_settings');

    if (savedProds) {
      try {
        const parsed = JSON.parse(savedProds);
        if (Array.isArray(parsed)) setProducts(parsed.map(p => normalizeProduct(p)));
      } catch (e) {
        // use fallback
      }
    }
    if (savedCusts) setCustomers(JSON.parse(savedCusts));
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedLogs) setAuditLogs(JSON.parse(savedLogs));
    if (savedSettings) setSystemSettings(JSON.parse(savedSettings));

    // 2. Attach live Firestore subscriptions
    const handleOffline = () => {
      setDbStatus('offline');
    };

    const unsubProds = subscribeProducts((liveProds) => {
      if (liveProds.length > 0) {
        setProducts(liveProds);
        localStorage.setItem('nexus_products', JSON.stringify(liveProds));
        setDbStatus('connected');
        setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    }, handleOffline);

    const unsubCusts = subscribeCustomers((liveCusts) => {
      if (liveCusts.length > 0) {
        setCustomers(liveCusts);
        localStorage.setItem('nexus_customers', JSON.stringify(liveCusts));
      }
    }, handleOffline);

    const unsubOrders = subscribeOrders((liveOrders) => {
      if (liveOrders.length > 0) {
        setOrders(liveOrders);
        localStorage.setItem('nexus_orders', JSON.stringify(liveOrders));
      }
    }, handleOffline);

    const unsubStaff = subscribeStaff((liveStaff) => {
      if (liveStaff.length > 0) {
        setStaffMembers(liveStaff);
      }
    }, handleOffline);

    const unsubLogs = subscribeAuditLogs((liveLogs) => {
      if (liveLogs.length > 0) {
        setAuditLogs(liveLogs);
        localStorage.setItem('nexus_audit_logs', JSON.stringify(liveLogs));
      }
    }, handleOffline);

    const unsubSettings = subscribeSettings((liveSettings) => {
      if (liveSettings) {
        setSystemSettings(liveSettings);
        localStorage.setItem('nexus_system_settings', JSON.stringify(liveSettings));
      }
    }, handleOffline);

    return () => {
      unsubProds();
      unsubCusts();
      unsubOrders();
      unsubStaff();
      unsubLogs();
      unsubSettings();
    };
  }, []);

  const saveToLocal = (newProds: Product[], newCusts: Customer[], newOrders: Order[], newLogs: AuditLog[]) => {
    localStorage.setItem('nexus_products', JSON.stringify(newProds));
    localStorage.setItem('nexus_customers', JSON.stringify(newCusts));
    localStorage.setItem('nexus_orders', JSON.stringify(newOrders));
    localStorage.setItem('nexus_audit_logs', JSON.stringify(newLogs));
  };

  // Helper to log audit trail records
  const createAuditRecord = (action: string, module: AuditLog['module'], details: string, updatedLogs?: AuditLog[]) => {
    const newLog: AuditLog = {
      id: `log-${Math.floor(100 + Math.random() * 899)}`,
      timestamp: new Date().toISOString(),
      staffName: activeStaff.name,
      role: activeStaff.role,
      action,
      module,
      details
    };
    const targetLogs = updatedLogs || auditLogs;
    const finalLogs = [newLog, ...targetLogs];
    setAuditLogs(finalLogs);
    saveAuditLogToDB(newLog).catch(() => {});
    return finalLogs;
  };

  // Interconnected Actions
  // 1. Reordering replenishment & Purchase Order Receiving
  const handleQuickReorder = (productId: string, amount: number) => {
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        const newStock = p.stock + amount;
        
        let nextPackaging = p.packaging;
        if (p.packaging?.hasPackaging) {
          const unitsPerBox = p.packaging.unitsPerPackage || 30;
          if (p.packaging.inventoryTrackingMode === 'auto_depackage') {
            // Auto-depackage: immediately unbox and convert to loose selling units
            nextPackaging = {
              ...p.packaging,
              looseUnitStock: newStock,
              sealedPackageStock: 0
            };
          } else {
            // Dual-stock mode: increment sealed boxes if replenished in cartons or add to existing stock
            const additionalBoxes = Math.floor(amount / unitsPerBox);
            const additionalLoose = amount % unitsPerBox;
            const currentBoxes = p.packaging.sealedPackageStock || 0;
            const currentLoose = p.packaging.looseUnitStock ?? 0;
            nextPackaging = {
              ...p.packaging,
              sealedPackageStock: currentBoxes + additionalBoxes,
              looseUnitStock: currentLoose + additionalLoose
            };
          }
        }

        // Also update individual first variant if present
        const updatedVariants = p.variants.map((v, i) => i === 0 ? { ...v, stock: v.stock + amount } : v);
        const updated = { ...p, stock: newStock, packaging: nextPackaging, variants: updatedVariants };
        saveProductToDB(updated).catch(() => {});
        return updated;
      }
      return p;
    });
    setProducts(updatedProducts);

    const found = products.find(p => p.id === productId);
    const logs = createAuditRecord(
      'Stock Replenishment', 
      'Inventory', 
      `Supplied +${amount} units for ${found?.name || productId}. Mode: ${found?.packaging?.inventoryTrackingMode || 'standard'}. New Stock: ${found ? found.stock + amount : 'N/A'}`
    );
    saveToLocal(updatedProducts, customers, orders, logs);
  };

  // 2. Add product catalog item
  const handleAddProduct = (newProd: Product) => {
    const updatedProducts = [newProd, ...products];
    setProducts(updatedProducts);
    saveProductToDB(newProd).catch(() => {});
    const logs = createAuditRecord(
      'Provisioned Product', 
      'Inventory', 
      `Provisioned product item: ${newProd.name} (${newProd.sku}). Category: ${newProd.category}. Location: ${newProd.location}`
    );
    saveToLocal(updatedProducts, customers, orders, logs);
  };

  // 3. Edit product catalog item
  const handleUpdateProduct = (updatedProd: Product) => {
    const updatedProducts = products.map(p => p.id === updatedProd.id ? updatedProd : p);
    setProducts(updatedProducts);
    saveProductToDB(updatedProd).catch(() => {});
    const logs = createAuditRecord(
      'Updated Product File', 
      'Inventory', 
      `Updated product details for SKU: ${updatedProd.sku}. Stock: ${updatedProd.stock}`
    );
    saveToLocal(updatedProducts, customers, orders, logs);
  };

  // 4. Delete product catalog item
  const handleDeleteProduct = (productId: string) => {
    const found = products.find(p => p.id === productId);
    const updatedProducts = products.filter(p => p.id !== productId);
    setProducts(updatedProducts);
    deleteProductFromDB(productId).catch(() => {});
    const logs = createAuditRecord(
      'Product Deleted', 
      'Inventory', 
      `Removed product SKU: ${found?.sku || productId} from active telemetry list.`
    );
    saveToLocal(updatedProducts, customers, orders, logs);
  };

  // 5. Add / Quick-Register CRM Customer
  const handleAddCustomer = (newCust: Customer) => {
    const updatedCustomers = [newCust, ...customers];
    setCustomers(updatedCustomers);
    saveCustomerToDB(newCust).catch(() => {});
    const logs = createAuditRecord(
      'Provisioned CRM Customer', 
      'CRM', 
      `Created CRM file for: ${newCust.name} (${newCust.email}). Awarded starting loyalty.`
    );
    saveToLocal(products, updatedCustomers, orders, logs);
  };

  // 5b. Update CRM Customer profile
  const handleUpdateCustomer = (updatedCust: Customer) => {
    const updatedCustomers = customers.map(c => c.id === updatedCust.id ? updatedCust : c);
    setCustomers(updatedCustomers);
    saveCustomerToDB(updatedCust).catch(() => {});
    const logs = createAuditRecord(
      'Updated CRM Customer',
      'CRM',
      `Modified record for: ${updatedCust.name} (${updatedCust.email}). Segment: ${updatedCust.segment}, Loyalty: ${updatedCust.loyaltyPoints} pts.`
    );
    saveToLocal(products, updatedCustomers, orders, logs);

    if (activeCustomer && activeCustomer.id === updatedCust.id) {
      setActiveCustomer(updatedCust);
    }
  };

  // 5c. Delete CRM Customer record
  const handleDeleteCustomer = (customerId: string) => {
    const found = customers.find(c => c.id === customerId);
    const updatedCustomers = customers.filter(c => c.id !== customerId);
    setCustomers(updatedCustomers);
    deleteCustomerFromDB(customerId).catch(() => {});
    const logs = createAuditRecord(
      'Deleted CRM Customer',
      'CRM',
      `Deleted record for: ${found?.name || customerId} from central database.`
    );
    saveToLocal(products, updatedCustomers, orders, logs);

    if (activeCustomer && activeCustomer.id === customerId) {
      setActiveCustomer(updatedCustomers[0] || null);
    }
  };

  // 6. Main Sales & Order Processor (decrements inventory, increments customer loyalty)
  const handleProcessOrder = (newOrder: Order) => {
    // 1. Decrement product inventories (taking into account PackagingUnits multipliers and variants)
    const updatedProducts = products.map(p => {
      const orderItem = newOrder.items.find(item => item.productId === p.id);
      if (orderItem) {
        // Calculate units to deduct based on multiplier relationship (e.g., box_of_30_bars -> 30 pcs, retail unit -> 1 pc)
        const multiplier = orderItem.unitMultiplier || (orderItem.packagingUnitName ? (p.packagingUnits?.find(u => u.unitName === orderItem.packagingUnitName)?.multiplier || 1) : 1);
        const totalBaseUnitsDeducted = orderItem.quantity * multiplier;
        const nextStock = Math.max(0, p.stock - totalBaseUnitsDeducted);

        // Handle dual_stock or auto_depackage packaging structures
        let nextPackaging = p.packaging;
        if (p.packaging?.hasPackaging) {
          if (p.packaging.inventoryTrackingMode === 'dual_stock') {
            let sealed = p.packaging.sealedPackageStock || 0;
            let loose = p.packaging.looseUnitStock ?? p.stock;
            const unitsPerPkg = p.packaging.unitsPerPackage || 1;

            if (orderItem.sellingMode === 'pack_selling' && multiplier >= unitsPerPkg) {
              const fullPacksSold = Math.floor(totalBaseUnitsDeducted / unitsPerPkg);
              if (sealed >= fullPacksSold) {
                sealed -= fullPacksSold;
              } else {
                const deficitPacks = fullPacksSold - sealed;
                sealed = 0;
                loose = Math.max(0, loose - (deficitPacks * unitsPerPkg));
              }
            } else {
              // Retail unit or smaller sub-pack
              if (loose >= totalBaseUnitsDeducted) {
                loose -= totalBaseUnitsDeducted;
              } else {
                // Auto-break bulk for retail fulfillment
                const deficit = totalBaseUnitsDeducted - loose;
                const boxesToOpen = Math.min(sealed, Math.ceil(deficit / unitsPerPkg));
                sealed -= boxesToOpen;
                loose = Math.max(0, (loose + (boxesToOpen * unitsPerPkg)) - totalBaseUnitsDeducted);
              }
            }

            nextPackaging = {
              ...p.packaging,
              sealedPackageStock: sealed,
              looseUnitStock: loose
            };
          } else {
            // auto_depackage mode
            nextPackaging = {
              ...p.packaging,
              looseUnitStock: nextStock,
              sealedPackageStock: 0
            };
          }
        }

        // decrement variant stock if variant matches
        const updatedVariants = p.variants.map(v => {
          if (orderItem.variantSku && v.sku === orderItem.variantSku) {
            return { ...v, stock: Math.max(0, v.stock - totalBaseUnitsDeducted) };
          }
          return v;
        });

        const updated = { 
          ...p, 
          stock: nextStock, 
          packaging: nextPackaging,
          variants: updatedVariants, 
          salesCount: p.salesCount + totalBaseUnitsDeducted 
        };
        saveProductToDB(updated).catch(() => {});
        return updated;
      }
      return p;
    });

    // 2. Increment customer loyalty points (e.g., 10% of order total is points, plus past orders tracking)
    const pointsGained = Math.round(newOrder.total / 10);
    const updatedCustomers = customers.map(c => {
      if (c.id === newOrder.customerId || c.name === newOrder.customerName) {
        const updated = { 
          ...c, 
          loyaltyPoints: c.loyaltyPoints + pointsGained,
          segment: c.loyaltyPoints + pointsGained > 300 ? 'VIP' as const : 'Regular' as const,
          purchaseHistoryIds: [...(c.purchaseHistoryIds || []), newOrder.id]
        };
        saveCustomerToDB(updated).catch(() => {});
        return updated;
      }
      return c;
    });

    // 3. Save order
    const updatedOrders = [newOrder, ...orders];
    saveOrderToDB(newOrder).catch(() => {});

    setProducts(updatedProducts);
    setCustomers(updatedCustomers);
    setOrders(updatedOrders);

    // 4. Record audit log
    const emailNote = newOrder.receiptSentToEmail ? ` Receipt automatically dispatched to ${newOrder.receiptSentToEmail}.` : '';
    const logs = createAuditRecord(
      'POS Transaction Processed',
      'POS',
      `Processed order ${newOrder.id} total $${newOrder.total}. Items: ${newOrder.items.length}. Payment Method: ${newOrder.paymentMethod}.${emailNote}`
    );

    saveToLocal(updatedProducts, updatedCustomers, updatedOrders, logs);

    // If customer was active customer, update state
    if (activeCustomer && (activeCustomer.id === newOrder.customerId || activeCustomer.name === newOrder.customerName)) {
      const updatedActive = updatedCustomers.find(c => c.id === activeCustomer.id);
      if (updatedActive) {
        setActiveCustomer(updatedActive);
      }
    }
  };

  // 6b. Process POS Order Refund / Void
  const handleRefundOrder = (orderId: string, reason: string) => {
    const found = orders.find(o => o.id === orderId);
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'Refunded' as const,
          notes: `${o.notes ? o.notes + ' | ' : ''}REFUNDED: ${reason}`
        };
      }
      return o;
    });
    setOrders(updatedOrders);
    if (found) {
      saveOrderToDB({
        ...found,
        status: 'Refunded',
        notes: `${found.notes ? found.notes + ' | ' : ''}REFUNDED: ${reason}`
      }).catch(() => {});
    }
    const logs = createAuditRecord(
      'POS Order Refunded',
      'POS',
      `Authorized refund/void for Order ${orderId}. Reason: ${reason}. Amount: $${found?.total || 0}`
    );
    saveToLocal(products, customers, updatedOrders, logs);
  };

  // 6c. Update Order Status (e.g., settle outstanding invoice)
  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status,
          outstandingBalance: status === 'Completed' ? 0 : o.outstandingBalance
        };
      }
      return o;
    });
    setOrders(updatedOrders);
    const found = orders.find(o => o.id === orderId);
    if (found) {
      saveOrderToDB({
        ...found,
        status,
        outstandingBalance: status === 'Completed' ? 0 : found.outstandingBalance
      }).catch(() => {});
    }
    const logs = createAuditRecord(
      'Order Status Updated',
      'Billing',
      `Order ${orderId} status set to ${status}. Outstanding balance updated.`
    );
    saveToLocal(products, customers, updatedOrders, logs);
  };

  // 7. E-commerce storefront buy action
  const handlePlaceEcomOrder = (newOrder: Order) => {
    // Exactly like POS processor but categorized under CRM/Billing channels
    const updatedProducts = products.map(p => {
      const orderItem = newOrder.items.find(item => item.productId === p.id);
      if (orderItem) {
        const multiplier = orderItem.unitMultiplier || (orderItem.packagingUnitName ? (p.packagingUnits?.find(u => u.unitName === orderItem.packagingUnitName)?.multiplier || 1) : 1);
        const totalBaseUnitsDeducted = orderItem.quantity * multiplier;
        const nextStock = Math.max(0, p.stock - totalBaseUnitsDeducted);

        let nextPackaging = p.packaging;
        if (p.packaging?.hasPackaging) {
          if (p.packaging.inventoryTrackingMode === 'dual_stock') {
            let sealed = p.packaging.sealedPackageStock || 0;
            let loose = p.packaging.looseUnitStock ?? p.stock;
            const unitsPerPkg = p.packaging.unitsPerPackage || 1;

            if (orderItem.sellingMode === 'pack_selling' && multiplier >= unitsPerPkg) {
              const fullPacksSold = Math.floor(totalBaseUnitsDeducted / unitsPerPkg);
              if (sealed >= fullPacksSold) {
                sealed -= fullPacksSold;
              } else {
                const deficitPacks = fullPacksSold - sealed;
                sealed = 0;
                loose = Math.max(0, loose - (deficitPacks * unitsPerPkg));
              }
            } else {
              if (loose >= totalBaseUnitsDeducted) {
                loose -= totalBaseUnitsDeducted;
              } else {
                const deficit = totalBaseUnitsDeducted - loose;
                const boxesToOpen = Math.min(sealed, Math.ceil(deficit / unitsPerPkg));
                sealed -= boxesToOpen;
                loose = Math.max(0, (loose + (boxesToOpen * unitsPerPkg)) - totalBaseUnitsDeducted);
              }
            }

            nextPackaging = {
              ...p.packaging,
              sealedPackageStock: sealed,
              looseUnitStock: loose
            };
          } else {
            nextPackaging = {
              ...p.packaging,
              looseUnitStock: nextStock,
              sealedPackageStock: 0
            };
          }
        }

        const updatedVariants = p.variants.map(v => {
          if (orderItem.variantSku && v.sku === orderItem.variantSku) {
            return { ...v, stock: Math.max(0, v.stock - totalBaseUnitsDeducted) };
          }
          return v;
        });

        const updated = { 
          ...p, 
          stock: nextStock, 
          packaging: nextPackaging,
          variants: updatedVariants, 
          salesCount: p.salesCount + totalBaseUnitsDeducted 
        };
        saveProductToDB(updated).catch(() => {});
        return updated;
      }
      return p;
    });

    const pointsGained = Math.round(newOrder.total / 10);
    const updatedCustomers = customers.map(c => {
      if (c.id === newOrder.customerId || c.name === newOrder.customerName) {
        return { 
          ...c, 
          loyaltyPoints: c.loyaltyPoints + pointsGained,
          segment: c.loyaltyPoints + pointsGained > 300 ? 'VIP' as const : 'Regular' as const,
          purchaseHistoryIds: [...(c.purchaseHistoryIds || []), newOrder.id]
        };
      }
      return c;
    });

    const updatedOrders = [newOrder, ...orders];

    setProducts(updatedProducts);
    setCustomers(updatedCustomers);
    setOrders(updatedOrders);

    const logs = createAuditRecord(
      'eCommerce Purchase Processed',
      'Billing',
      `Storefront purchase ${newOrder.id} total $${newOrder.total}. Customer: ${newOrder.customerName}. Sync status: Auto-dispatched.`
    );

    saveToLocal(updatedProducts, updatedCustomers, updatedOrders, logs);

    if (activeCustomer && (activeCustomer.id === newOrder.customerId || activeCustomer.name === newOrder.customerName)) {
      const updatedActive = updatedCustomers.find(c => c.id === activeCustomer.id);
      if (updatedActive) {
        setActiveCustomer(updatedActive);
      }
    }
  };

  // 8. Staff management and switches
  const handleSwitchStaff = (staffId: string) => {
    const found = staffMembers.find(s => s.id === staffId);
    if (found) {
      setActiveStaff(found);
      const logs = createAuditRecord(
        'Terminal Login Changed',
        'User Management',
        `Operator terminal access switched to: ${found.name} (${found.role}).`
      );
      saveToLocal(products, customers, orders, logs);
    }
  };

  const handleAddStaff = (newStaff: StaffMember) => {
    const updated = [...staffMembers, newStaff];
    setStaffMembers(updated);
    saveStaffToDB(newStaff).catch(() => {});
    const logs = createAuditRecord(
      'Staff Member Registered',
      'User Management',
      `Registered employee: ${newStaff.name} with role ${newStaff.role} (${newStaff.department || 'General Operations'}).`
    );
    saveToLocal(products, customers, orders, logs);
  };

  const handleUpdateStaff = (updatedStaff: StaffMember) => {
    const updated = staffMembers.map(s => s.id === updatedStaff.id ? updatedStaff : s);
    setStaffMembers(updated);
    if (activeStaff.id === updatedStaff.id) {
      setActiveStaff(updatedStaff);
    }
    saveStaffToDB(updatedStaff).catch(() => {});
    const logs = createAuditRecord(
      'Staff Permissions Updated',
      'User Management',
      `Updated profile & rights for: ${updatedStaff.name} (${updatedStaff.role}).`
    );
    saveToLocal(products, customers, orders, logs);
  };

  const handleDeleteStaff = (staffId: string) => {
    const target = staffMembers.find(s => s.id === staffId);
    const updated = staffMembers.filter(s => s.id !== staffId);
    setStaffMembers(updated);
    deleteStaffFromDB(staffId).catch(() => {});
    const logs = createAuditRecord(
      'Staff Member Removed',
      'User Management',
      `Decommissioned employee account: ${target?.name || staffId} (${target?.role || 'Staff'}).`
    );
    saveToLocal(products, customers, orders, logs);
  };

  // 9. Customer Logins inside eCommerce storefront
  const handleLoginCustomer = (customerId: string) => {
    const found = customers.find(c => c.id === customerId);
    if (found) {
      setActiveCustomer(found);
    }
  };

  // Offline Simulator helpers for POS
  const triggerOfflineSimulatorToggle = () => {
    if (deviceOffline) {
      // Reconnected! Process offline buffer
      if (offlineBuffer.length > 0) {
        offlineBuffer.forEach(bufferOrder => {
          // Generate formal Order
          const randId = `ord-off-${Math.floor(1000 + Math.random() * 9000)}`;
          const orderPayload: Order = {
            id: randId,
            date: new Date().toISOString(),
            items: [
              { productId: 'prod-103', productName: 'Merino Wool Trail Socks', quantity: bufferOrder.qty, price: 24.99 }
            ],
            subtotal: bufferOrder.total / 1.085,
            tax: bufferOrder.total * 0.085,
            discount: 0,
            total: bufferOrder.total,
            paymentMethod: 'Credit/Debit Card',
            channel: 'In-Store POS',
            customerName: 'Offline Walk-in',
            status: 'Completed'
          };
          handleProcessOrder(orderPayload);
        });
        alert(`SYNCHRONIZATION COMPLETED!\nRe-established connection. Processed ${offlineBuffer.length} batched transactions from local cache!`);
        setOfflineBuffer([]);
      }
      setDeviceOffline(false);
    } else {
      setDeviceOffline(true);
      alert('OFFLINE MODE ACTIVE!\nRegister disconnected from central cloud sync. Purchases will be buffered locally in device hardware cache.');
    }
  };

  const addOfflineBufferOrder = () => {
    const mockOffline = {
      id: `off-${Date.now()}`,
      total: 24.99 * 1.085,
      qty: 1
    };
    setOfflineBuffer([...offlineBuffer, mockOffline]);
    alert('Offline Order cached in device storage. Sync will run automatically on reconnection.');
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 flex flex-col justify-between" id="applet-viewport-root">
      
      {/* Top Main Mode Selector - Core Showroom navigation */}
      <header className="bg-slate-900 border-b border-white/10 px-3 sm:px-6 py-2.5 sticky top-0 z-40 shadow-md backdrop-blur-md" id="master-mode-navbar">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* Left Brand & Mobile Navigation Trigger */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Mobile/Tablet Sidebar Hamburger Toggle (visible on mobile/tablet when in Admin mode) */}
            {currentView === 'Admin' && (
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-300 hover:text-white rounded-xl hover:bg-slate-800 active:scale-95 transition-all border border-slate-700/80 shrink-0 cursor-pointer"
                title="Open Navigation Menu"
                id="mobile-menu-toggle-btn"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
            
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 rounded-xl text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-indigo-900/50 shrink-0 select-none">
              N
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-black tracking-wider text-white uppercase truncate">
                  NEXUS POS-COMMERCE CORE
                </h1>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentView === 'Admin' ? adminSubTab : 'Online Store'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 truncate hidden xs:block">
                Enterprise Unified Multi-Channel System
              </p>
            </div>
          </div>

          {/* Right Status & Active Operator Bar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0" id="master-header-telemetry">
            
            {/* Real-time Cloud/Firestore Status Indicator */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-gray-300"
              title={deviceOffline ? 'Operating in local offline buffer mode' : 'Connected to Firestore Cloud DB'}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  deviceOffline ? 'bg-amber-400' : dbStatus === 'connected' ? 'bg-emerald-400' : 'bg-indigo-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  deviceOffline ? 'bg-amber-500' : dbStatus === 'connected' ? 'bg-emerald-500' : 'bg-indigo-500'
                }`} />
              </span>
              <span className="hidden sm:inline font-semibold">
                {deviceOffline ? 'Offline Cache' : dbStatus === 'connected' ? 'Cloud Active' : 'Syncing...'}
              </span>
            </div>

            {/* Active Staff Member Profile Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 font-bold text-xs flex items-center justify-center shrink-0">
                {activeStaff.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-white truncate max-w-[120px] leading-tight">
                  {activeStaff.name}
                </div>
                <div className="text-[9px] font-mono text-indigo-300 uppercase tracking-wider">
                  {activeStaff.role}
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main viewport area */}
      <div className="flex-1" id="main-content-stage">
        {currentView === 'Admin' ? (
          /* Admin Side: Static/Fixed Sidebar Layout with responsive main area */
          <div className="min-h-screen bg-slate-50 relative" id="admin-workspace-layout">
            
            {/* Enhanced Static/Fixed Sidebar Component */}
            <EnhancedSidebar
              currentView={currentView}
              onSwitchView={setCurrentView}
              adminSubTab={adminSubTab}
              onSelectSubTab={(tab) => {
                setAdminSubTab(tab);
                setIsMobileSidebarOpen(false);
              }}
              activeStaff={activeStaff}
              dbStatus={deviceOffline ? 'offline' : dbStatus}
              lastSynced={lastSynced}
              onManualSync={handleManualSync}
              lowStockCount={lowStockCount}
              totalOrdersCount={totalOrdersCount}
              totalCustomersCount={totalCustomersCount}
              deviceOffline={deviceOffline}
              onToggleOfflineSim={triggerOfflineSimulatorToggle}
              offlineOrderCount={offlineBuffer.length}
              onOpenCurrencyModal={() => setIsCurrencyModalOpen(true)}
              isMobileOpen={isMobileSidebarOpen}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
            />

            {/* Admin Workspace main board: Positioned cleanly with ample breathing room from the fixed sidebar */}
            <main 
              className={`transition-all duration-300 ease-in-out ${
                isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
              } p-5 sm:p-7 lg:p-10 pb-24 lg:pb-12`} 
              id="admin-main-board"
            >
              <div className="max-w-[1500px] mx-auto w-full space-y-6">
                {adminSubTab === 'Dashboard' && (
                  <DashboardOverview
                    products={products}
                    orders={orders}
                    customers={customers}
                    auditLogs={auditLogs}
                    onQuickReorder={handleQuickReorder}
                    onNavigateToTab={(tabId) => setAdminSubTab(tabId as any)}
                  />
                )}

                {adminSubTab === 'Inventory' && (
                  <InventoryModule
                    products={products}
                    onAddProduct={handleAddProduct}
                    onUpdateProduct={handleUpdateProduct}
                    onDeleteProduct={handleDeleteProduct}
                    staffRole={activeStaff.role}
                    activeStaff={activeStaff}
                  />
                )}

                {adminSubTab === 'POS' && (
                  <POSModule
                    products={products}
                    customers={customers}
                    orders={orders}
                    onAddCustomer={handleAddCustomer}
                    onProcessOrder={handleProcessOrder}
                    onRefundOrder={handleRefundOrder}
                    activeStaffName={activeStaff.name}
                  />
                )}

                {adminSubTab === 'CRM' && (
                  <CRMModule
                    customers={customers}
                    orders={orders}
                    onAddCustomer={handleAddCustomer}
                    onUpdateCustomer={handleUpdateCustomer}
                    onDeleteCustomer={handleDeleteCustomer}
                    staffRole={activeStaff.role}
                    activeStaffName={activeStaff.name}
                  />
                )}

                {adminSubTab === 'Invoices' && (
                  <InvoiceModule
                    orders={orders}
                  />
                )}

                {adminSubTab === 'Reports' && (
                  <ReportsModule
                    products={products}
                    orders={orders}
                    activeStaff={activeStaff}
                    onUpdateOrderStatus={handleUpdateOrderStatus}
                    onReorderProduct={handleQuickReorder}
                  />
                )}

                {adminSubTab === 'Security' && (
                  <SecurityModule
                    staffMembers={staffMembers}
                    auditLogs={auditLogs}
                    activeStaff={activeStaff}
                    onSwitchStaff={handleSwitchStaff}
                    onAddStaff={handleAddStaff}
                    onUpdateStaff={handleUpdateStaff}
                    onDeleteStaff={handleDeleteStaff}
                  />
                )}

                {adminSubTab === 'Settings' && (
                  <SettingsModule
                    settings={systemSettings}
                    onUpdateSettings={(newSettings) => {
                      setSystemSettings(newSettings);
                      localStorage.setItem('nexus_system_settings', JSON.stringify(newSettings));
                    }}
                    activeStaff={activeStaff}
                    onAuditLog={(action, module, details) => {
                      createAuditRecord(action, module as any, details);
                    }}
                  />
                )}
              </div>
            </main>
          </div>
        ) : (
          /* eCommerce Storefront: Full Screen Premium layout */
          <ECommerceStorefront
            products={products}
            customers={customers}
            orders={orders}
            onPlaceEcomOrder={handlePlaceEcomOrder}
            activeCustomer={activeCustomer}
            onLoginCustomer={handleLoginCustomer}
            onRegisterCustomer={handleAddCustomer}
            onSwitchToAdmin={() => setCurrentView('Admin')}
          />
        )}
      </div>

      {/* Global Currency Selection Modal */}
      <CurrencySelectorModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
      />
    </div>
  );
}
