import { Product, Customer, StaffMember, Order, AuditLog, Category } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'electronics', name: 'Electronics', icon: 'Cpu' },
  { id: 'apparel', name: 'Apparel & Fashion', icon: 'Shirt' },
  { id: 'home', name: 'Home & Living', icon: 'Home' },
  { id: 'fitness', name: 'Fitness & Outdoors', icon: 'Activity' },
  { id: 'office', name: 'Office Supplies', icon: 'Briefcase' },
  { id: 'groceries', name: 'Groceries & Snacks', icon: 'Package' }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-101',
    name: 'AeroSound Pro ANC Headphones',
    sku: 'EL-HP-001',
    price: 249.99,
    originalPrice: 299.99,
    discountPercent: 17,
    cost: 110.00,
    stock: 45,
    category: 'Electronics',
    brand: 'Sony',
    location: 'Store Shelf',
    reorderPoint: 15,
    barcode: '880192837401',
    qrCode: 'QR-EL-HP-001',
    isBestSeller: true,
    isFeatured: true,
    rating: 4.9,
    reviewCount: 128,
    variants: [
      { sku: 'EL-HP-001-BLK', size: 'Over-Ear', color: 'Midnight Black', stock: 25 },
      { sku: 'EL-HP-001-SLV', size: 'Over-Ear', color: 'Platinum Silver', stock: 20 }
    ],
    salesCount: 142,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Battery Life': 'Up to 40 Hours (ANC On)',
      'Connectivity': 'Bluetooth 5.3 & 3.5mm AUX',
      'Drivers': '40mm Custom Titanium Drivers',
      'Weight': '250 grams',
      'Warranty': '2 Years Comprehensive Replacement'
    },
    reviews: [
      { id: 'rev-1', userName: 'Alex Mercer', rating: 5, date: '2026-08-10', comment: 'Active Noise Cancellation is unbeatable. Battery lasts the entire work week!', verifiedPurchase: true },
      { id: 'rev-2', userName: 'Elena Rostova', rating: 5, date: '2026-08-04', comment: 'Extremely comfortable for long listening sessions and calls.', verifiedPurchase: true }
    ],
    description: 'Studio-grade hybrid Active Noise Cancelling headphones with 40-hour battery life, plush memory foam earcups, and customizable parametric EQ sound profiles.'
  },
  {
    id: 'prod-102',
    name: 'FitTrack V4 Titanium Smartwatch',
    sku: 'EL-SW-004',
    price: 189.99,
    originalPrice: 229.99,
    discountPercent: 17,
    cost: 80.00,
    stock: 8,
    category: 'Electronics',
    brand: 'Apple',
    location: 'Store Shelf',
    reorderPoint: 12,
    barcode: '880192837402',
    qrCode: 'QR-EL-SW-004',
    isNewArrival: true,
    isFeatured: true,
    rating: 4.8,
    reviewCount: 94,
    variants: [
      { sku: 'EL-SW-004-CHR', size: '44mm', color: 'Charcoal Grey', stock: 5 },
      { sku: 'EL-SW-004-GLD', size: '40mm', color: 'Rose Gold', stock: 3 }
    ],
    salesCount: 210,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Display': '1.9-inch Always-On Retina OLED',
      'Water Resistance': '50M WR50 Swimproof',
      'Sensors': 'ECG, SpO2, Heart Rate, Body Temp, Dual GPS',
      'Battery Life': 'Up to 36 Hours (Low Power Mode)',
      'Compatibility': 'iOS & Android'
    },
    reviews: [
      { id: 'rev-3', userName: 'Marcus Vance', rating: 5, date: '2026-08-12', comment: 'Accurate heart rate tracking and crisp display even in bright sunlight.', verifiedPurchase: true }
    ],
    description: 'All-day aerospace titanium fitness tracker with SpO2 monitoring, on-wrist ECG, integrated dual-band GPS, and fast wireless charging.'
  },
  {
    id: 'prod-103',
    name: 'Merino Wool Pro Alpine Socks',
    sku: 'AP-SK-012',
    price: 24.99,
    originalPrice: 32.00,
    discountPercent: 22,
    cost: 8.50,
    stock: 120,
    category: 'Apparel & Fashion',
    brand: 'Nike',
    location: 'Warehouse',
    reorderPoint: 30,
    barcode: '880192837403',
    qrCode: 'QR-AP-SK-012',
    isBestSeller: true,
    rating: 4.7,
    reviewCount: 245,
    variants: [
      { sku: 'AP-SK-012-M', size: 'Medium (US 7-9)', color: 'Forest Green', stock: 60 },
      { sku: 'AP-SK-012-L', size: 'Large (US 10-13)', color: 'Slate Grey', stock: 60 }
    ],
    salesCount: 340,
    imageUrl: 'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Material': '68% Merino Wool, 28% Nylon, 4% Lycra Elastane',
      'Cushioning': 'Medium Targeted High-Impact Cushioning',
      'Origin': 'Ethically Sourced New Zealand Wool'
    },
    reviews: [
      { id: 'rev-4', userName: 'Chloe Bennett', rating: 5, date: '2026-08-01', comment: 'No blisters after a 20-mile hike in the mountains. Warm and breathable.', verifiedPurchase: true }
    ],
    description: 'Premium ethical Merino wool blended performance socks with double-cushioned soles, targeted arch compression, and seamless toe closure.'
  },
  {
    id: 'prod-104',
    name: 'Apex Ergonomic Executive Mesh Chair',
    sku: 'HO-CH-099',
    price: 349.99,
    originalPrice: 429.99,
    discountPercent: 19,
    cost: 165.00,
    stock: 5,
    category: 'Home & Living',
    brand: 'Herman Miller',
    location: 'Warehouse',
    reorderPoint: 10,
    barcode: '880192837404',
    qrCode: 'QR-HO-CH-099',
    isFeatured: true,
    rating: 4.9,
    reviewCount: 78,
    variants: [
      { sku: 'HO-CH-099-STD', size: 'Standard Adjustable', color: 'Obsidian Black', stock: 5 }
    ],
    salesCount: 55,
    imageUrl: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1580481077180-2a9f73248386?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Adjustability': '4D Armrests, Lumbar Depth & Height, 135° Synchro-Tilt',
      'Weight Capacity': '330 lbs (150 kg)',
      'Mesh Material': 'Breathable Elastomeric High-Tensile Mesh',
      'Base': 'Heavy-duty polished aluminum 5-wheel wheelbase',
      'Warranty': '10 Years Structural Warranty'
    },
    reviews: [
      { id: 'rev-5', userName: 'David Sterling', rating: 5, date: '2026-07-28', comment: 'Eliminated my lower back stiffness completely during 10-hour work days.', verifiedPurchase: true }
    ],
    description: 'Fully adjustable breathable mesh task chair featuring dynamic adaptive lumbar support, 4D multi-directional armrests, and synchronized multi-point tilt mechanism.'
  },
  {
    id: 'prod-105',
    name: 'HydroLock Thermal Steel Flask 1L',
    sku: 'FT-FK-023',
    price: 39.99,
    originalPrice: 49.99,
    discountPercent: 20,
    cost: 14.00,
    stock: 75,
    category: 'Fitness & Outdoors',
    brand: 'Bose',
    location: 'Store Shelf',
    reorderPoint: 20,
    barcode: '880192837405',
    qrCode: 'QR-FT-FK-023',
    isNewArrival: true,
    rating: 4.8,
    reviewCount: 112,
    variants: [
      { sku: 'FT-FK-023-NVY', size: '1000 ml', color: 'Ocean Navy', stock: 40 },
      { sku: 'FT-FK-023-WHT', size: '1000 ml', color: 'Alpine White', stock: 35 }
    ],
    salesCount: 188,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Insulation': 'TempShield™ Double-Wall Vacuum Insulation',
      'Cold Retention': 'Ice Cold for 24 Hours',
      'Hot Retention': 'Steaming Hot for 12 Hours',
      'Material': '18/8 Pro-Grade Stainless Steel (BPA-Free)',
      'Lid Type': 'Leakproof Flex Cap with Ergonomic Grip'
    },
    reviews: [
      { id: 'rev-6', userName: 'Samantha Lee', rating: 5, date: '2026-08-08', comment: 'Still had ice cubes after leaving it in a hot car all afternoon!', verifiedPurchase: true }
    ],
    description: 'Double-walled vacuum insulated food-grade 18/8 stainless steel bottle keeping cold drinks chilled for 24 hours and hot liquids steaming for 12 hours.'
  },
  {
    id: 'prod-106',
    name: 'Handcrafted Walnut Desk Organizer',
    sku: 'OF-DO-008',
    price: 69.99,
    originalPrice: 85.00,
    discountPercent: 18,
    cost: 28.00,
    stock: 22,
    category: 'Office Supplies',
    brand: 'Logitech',
    location: 'Fulfillment Center',
    reorderPoint: 8,
    barcode: '880192837406',
    qrCode: 'QR-OF-DO-008',
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 56,
    variants: [
      { sku: 'OF-DO-008-WAL', size: 'Medium (12" x 6")', color: 'Natural American Walnut', stock: 22 }
    ],
    salesCount: 94,
    imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Wood Type': '100% Solid Certified American Walnut',
      'Features': 'Magnetic Phone Stand, Dual Pen Well, Catchall Tray',
      'Finish': 'Natural Organic Matte Oil Wax'
    },
    reviews: [
      { id: 'rev-7', userName: 'Oliver Quinn', rating: 5, date: '2026-08-02', comment: 'Elevates the aesthetic of my desk setup instantly. Fantastic craftsmanship.', verifiedPurchase: true }
    ],
    description: 'Handcrafted solid North American walnut workspace dock featuring magnetic hidden cable routing channels, phone kickstand, and modular pen receptacles.'
  },
  {
    id: 'prod-107',
    name: 'Lumix Pro 4K Wireless Action Cam',
    sku: 'EL-AC-019',
    price: 329.99,
    originalPrice: 399.99,
    discountPercent: 18,
    cost: 160.00,
    stock: 19,
    category: 'Electronics',
    brand: 'Sony',
    location: 'Store Shelf',
    reorderPoint: 5,
    barcode: '880192837407',
    qrCode: 'QR-EL-AC-019',
    isNewArrival: true,
    isFeatured: true,
    rating: 4.8,
    reviewCount: 42,
    variants: [
      { sku: 'EL-AC-019-BLK', size: 'Standard Kit', color: 'Stealth Black', stock: 19 }
    ],
    salesCount: 88,
    imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Video Resolution': '4K @ 120 FPS / 5.3K @ 60 FPS',
      'Stabilization': 'HyperSmooth 6.0 Horizon Lock',
      'Waterproof': '10m / 33ft without housing',
      'Battery': 'Enduro 1720mAh Cold-Weather Battery'
    },
    reviews: [
      { id: 'rev-8', userName: 'Jason Todd', rating: 5, date: '2026-08-11', comment: 'Crystal clear video and gimbal-like stabilization for mountain biking.', verifiedPurchase: true }
    ],
    description: 'Ultra-durable waterproof action camera with horizon-lock image stabilization, dual color displays, and voice commands.'
  },
  {
    id: 'prod-108',
    name: 'Vortex Mechanical Wireless Keyboard',
    sku: 'OF-KB-055',
    price: 139.99,
    originalPrice: 169.99,
    discountPercent: 18,
    cost: 55.00,
    stock: 34,
    category: 'Office Supplies',
    brand: 'Logitech',
    location: 'Warehouse',
    reorderPoint: 10,
    barcode: '880192837408',
    qrCode: 'QR-OF-KB-055',
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 160,
    variants: [
      { sku: 'OF-KB-055-BRN', size: '75% Compact', color: 'Tactile Quiet Brown', stock: 20 },
      { sku: 'OF-KB-055-RED', size: '75% Compact', color: 'Linear Smooth Red', stock: 14 }
    ],
    salesCount: 175,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=600'
    ],
    specifications: {
      'Switches': 'Hot-swappable Custom Pre-lubed Mechanical Switches',
      'Connectivity': 'Bluetooth 5.1 / 2.4GHz Wireless / USB-C Wired',
      'Keycaps': 'Double-shot PBT Cherry Profile',
      'Battery': '4000mAh (Up to 200 hours without backlight)'
    },
    reviews: [
      { id: 'rev-9', userName: 'Maya Lin', rating: 5, date: '2026-08-06', comment: 'Deep thocky typing sound right out of the box with zero ping.', verifiedPurchase: true }
    ],
    description: 'Custom acoustic-dampened 75% mechanical wireless keyboard with hot-swappable switch sockets, PBT double-shot keycaps, and multi-device fast pairing.'
  },
  {
    id: 'prod-109',
    name: 'Crispy Caramel Crunch Chocolate Bars',
    sku: 'SN-CB-030',
    price: 4.00,
    cost: 2.50,
    stock: 315,
    category: 'Groceries & Snacks',
    brand: 'CrispyTreats',
    location: 'Store Shelf',
    reorderPoint: 50,
    barcode: '880192837409',
    qrCode: 'QR-SN-CB-030',
    variants: [],
    unit: 'pcs',
    productType: 'Standard',
    status: 'Active',
    isBestSeller: true,
    isFeatured: true,
    rating: 4.9,
    reviewCount: 84,
    salesCount: 320,
    imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=80&w=600'
    ],
    description: 'Crispy caramel crunch wafer chocolate bars. Purchased in master wholesale boxes of 30 pcs and retailed individually, in half dozens, full dozens, or entire sealed boxes.',
    base_unit: 'piece',
    packagingUnits: [
      { id: 'unit-retail', unitName: 'piece', multiplier: 1, base_unit: 'piece', sellingPrice: 4.00, isDefaultSellingUnit: true, sellingMode: 'retail_unit', barcode: '880192837409-1', sku: 'SN-CB-030-PC' },
      { id: 'unit-pack-30', unitName: 'box_of_30_bars', multiplier: 30, base_unit: 'piece', sellingPrice: 105.00, isPackUnit: true, sellingMode: 'pack_selling', barcode: '880192837409-30', sku: 'SN-CB-030-BX30' },
      { id: 'unit-pack-6', unitName: 'half_dozen_pack', multiplier: 6, base_unit: 'piece', sellingPrice: 23.00, sellingMode: 'pack_selling', barcode: '880192837409-6', sku: 'SN-CB-030-PK6' },
      { id: 'unit-pack-12', unitName: 'dozen_pack', multiplier: 12, base_unit: 'piece', sellingPrice: 45.00, sellingMode: 'pack_selling', barcode: '880192837409-12', sku: 'SN-CB-030-PK12' }
    ],
    packaging: {
      hasPackaging: true,
      purchasePackagingName: 'Box',
      unitsPerPackage: 30,
      packageCost: 75.00,
      calculatedUnitCost: 2.50,
      baseSellingUnitName: 'Piece',
      base_unit: 'piece',
      multiplier: 30,
      inventoryTrackingMode: 'dual_stock',
      sealedPackageStock: 10,
      looseUnitStock: 15,
      packagingUnits: [
        { id: 'unit-retail', unitName: 'piece', multiplier: 1, base_unit: 'piece', sellingPrice: 4.00, isDefaultSellingUnit: true, sellingMode: 'retail_unit', barcode: '880192837409-1', sku: 'SN-CB-030-PC' },
        { id: 'unit-pack-30', unitName: 'box_of_30_bars', multiplier: 30, base_unit: 'piece', sellingPrice: 105.00, isPackUnit: true, sellingMode: 'pack_selling', barcode: '880192837409-30', sku: 'SN-CB-030-BX30' },
        { id: 'unit-pack-6', unitName: 'half_dozen_pack', multiplier: 6, base_unit: 'piece', sellingPrice: 23.00, sellingMode: 'pack_selling', barcode: '880192837409-6', sku: 'SN-CB-030-PK6' },
        { id: 'unit-pack-12', unitName: 'dozen_pack', multiplier: 12, base_unit: 'piece', sellingPrice: 45.00, sellingMode: 'pack_selling', barcode: '880192837409-12', sku: 'SN-CB-030-PK12' }
      ],
      sellingTiers: [
        { id: 'tier-1', name: 'Single Piece', unitQuantity: 1, sellingPrice: 4.00, isDefaultSellingUnit: true, barcode: '880192837409-1' },
        { id: 'tier-2', name: 'Half Dozen (6 pcs)', unitQuantity: 6, sellingPrice: 23.00, barcode: '880192837409-6' },
        { id: 'tier-3', name: 'One Dozen (12 pcs)', unitQuantity: 12, sellingPrice: 45.00, barcode: '880192837409-12' },
        { id: 'tier-4', name: 'Full Sealed Box (30 pcs)', unitQuantity: 30, sellingPrice: 105.00, isDefaultPurchaseUnit: true, barcode: '880192837409-30' }
      ]
    },
    specifications: {
      'Flavor': 'Salted Caramel Milk Chocolate',
      'Net Weight per Bar': '45g',
      'Box Net Weight': '1.35 kg (30 x 45g)',
      'Shelf Life': '12 Months',
      'Allergens': 'Milk, Soy, Wheat (Gluten)'
    }
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-201',
    name: 'Sarah Connor',
    email: 'sarah.c@skyline.org',
    phone: '+1 (555) 321-9876',
    loyaltyPoints: 340,
    segment: 'VIP',
    notes: 'Prefers carbon-neutral packaging. Key accounts manager.',
    purchaseHistoryIds: ['ord-5001', 'ord-5004']
  },
  {
    id: 'cust-202',
    name: 'Miles Dyson',
    email: 'mdyson@cyberdyne.io',
    phone: '+1 (555) 789-1234',
    loyaltyPoints: 120,
    segment: 'Regular',
    notes: 'Responsive to tech-focused marketing lists.',
    purchaseHistoryIds: ['ord-5002']
  },
  {
    id: 'cust-203',
    name: 'John Connor',
    email: 'jconnor@resistance.net',
    phone: '+1 (555) 999-0001',
    loyaltyPoints: 15,
    segment: 'New',
    notes: 'First-time retail store buyer.',
    purchaseHistoryIds: ['ord-5003']
  },
  {
    id: 'cust-204',
    name: 'Marcus Wright',
    email: 'm.wright@projectangel.com',
    phone: '+1 (555) 444-2311',
    loyaltyPoints: 0,
    segment: 'Inactive',
    notes: 'No transactions registered in the last 120 days.',
    purchaseHistoryIds: []
  }
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-01',
    name: 'Elena Rostova',
    email: 'elena.r@enterprise.com',
    role: 'Super Admin',
    department: 'Executive IT & Infrastructure',
    phone: '+1 (555) 019-2831',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
    pin: '1234',
    status: 'Active',
    lastActive: 'Just now',
    notes: 'Primary system root administrator. Master access.'
  },
  {
    id: 'staff-02',
    name: 'Sarah Jenkins',
    email: 'sarah.j@enterprise.com',
    role: 'Business Owner',
    department: 'Executive Management',
    phone: '+1 (555) 014-9982',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150',
    pin: '9900',
    status: 'Active',
    lastActive: '10 mins ago',
    notes: 'Managing partner and principal business executive.'
  },
  {
    id: 'staff-03',
    name: 'Marcus Aurelius',
    email: 'marcus.a@enterprise.com',
    role: 'Store Manager',
    department: 'Retail Store Operations',
    phone: '+1 (555) 018-4421',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    pin: '4321',
    status: 'Active',
    lastActive: '25 mins ago',
    notes: 'Floor manager in charge of POS terminals and on-site staff.'
  },
  {
    id: 'staff-04',
    name: 'David Chen',
    email: 'david.c@enterprise.com',
    role: 'Inventory Manager',
    department: 'Merchandising & Catalog',
    phone: '+1 (555) 012-7711',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150',
    pin: '3344',
    status: 'Active',
    lastActive: '1 hour ago',
    notes: 'Controls product SKU catalog, margins, and reorder levels.'
  },
  {
    id: 'staff-05',
    name: 'Cody Sparks',
    email: 'cody.s@enterprise.com',
    role: 'Warehouse Manager',
    department: 'Logistics & Fulfillment Hub',
    phone: '+1 (555) 016-3399',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    pin: '2222',
    status: 'Active',
    lastActive: '45 mins ago',
    notes: 'Dock master managing freight receiving and stock transfers.'
  },
  {
    id: 'staff-06',
    name: 'Jessie Quick',
    email: 'jessie.q@enterprise.com',
    role: 'Cashier',
    department: 'Front of House POS',
    phone: '+1 (555) 011-8844',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    pin: '1111',
    status: 'Active',
    lastActive: '5 mins ago',
    notes: 'Lead cashier on register terminal #01.'
  },
  {
    id: 'staff-07',
    name: 'Sam Rivera',
    email: 'sam.r@enterprise.com',
    role: 'Sales Manager',
    department: 'Sales & Customer Retention',
    phone: '+1 (555) 019-5566',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150',
    pin: '5566',
    status: 'Active',
    lastActive: '2 hours ago',
    notes: 'Authorizes sales refunds, discount overrides, and CRM campaigns.'
  },
  {
    id: 'staff-08',
    name: 'Alex Thorne',
    email: 'alex.t@enterprise.com',
    role: 'Purchasing Officer',
    department: 'Procurement & Supply Chain',
    phone: '+1 (555) 017-6622',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=150',
    pin: '7788',
    status: 'Active',
    lastActive: '3 hours ago',
    notes: 'Handles vendor procurement contracts and PO approvals.'
  },
  {
    id: 'staff-09',
    name: 'Priya Patel',
    email: 'priya.p@enterprise.com',
    role: 'Accountant',
    department: 'Finance & Tax Compliance',
    phone: '+1 (555) 013-4499',
    avatar: 'https://images.unsplash.com/photo-1534751516642-a171edd2521d?auto=format&fit=crop&q=80&w=150',
    pin: '8899',
    status: 'Active',
    lastActive: 'Yesterday',
    notes: 'Financial comptroller managing tax invoices, P&L, and audit ledgers.'
  },
  {
    id: 'staff-10',
    name: 'Maya Lin',
    email: 'maya.l@enterprise.com',
    role: 'E-commerce Manager',
    department: 'Digital Commerce & Marketing',
    phone: '+1 (555) 015-2233',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150',
    pin: '6677',
    status: 'Active',
    lastActive: '30 mins ago',
    notes: 'Oversees web storefront merchandising, online orders, and fulfillment.'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-5001',
    date: '2026-08-09T10:15:30-07:00',
    items: [
      {
        productId: 'prod-101',
        productName: 'AeroSound Pro ANC Headphones',
        quantity: 1,
        price: 249.99,
        variantSku: 'EL-HP-001-BLK'
      },
      {
        productId: 'prod-105',
        productName: 'HydroLock Steel Flask 1L',
        quantity: 2,
        price: 39.99,
        variantSku: 'FT-FK-023-NVY'
      }
    ],
    subtotal: 329.97,
    tax: 26.40,
    discount: 15.00,
    total: 341.37,
    paymentMethod: 'Credit/Debit Card',
    channel: 'In-Store POS',
    customerId: 'cust-201',
    customerName: 'Sarah Connor',
    status: 'Completed'
  },
  {
    id: 'ord-5002',
    date: '2026-08-10T14:45:00-07:00',
    items: [
      {
        productId: 'prod-102',
        productName: 'FitTrack V4 Smartwatch',
        quantity: 1,
        price: 189.99,
        variantSku: 'EL-SW-004-CHR'
      }
    ],
    subtotal: 189.99,
    tax: 15.20,
    discount: 0.00,
    total: 205.19,
    paymentMethod: 'Mobile Pay',
    channel: 'Online Storefront',
    customerId: 'cust-202',
    customerName: 'Miles Dyson',
    status: 'Completed'
  },
  {
    id: 'ord-5003',
    date: '2026-08-11T09:30:15-07:00',
    items: [
      {
        productId: 'prod-103',
        productName: 'Merino Wool Trail Socks',
        quantity: 4,
        price: 24.99,
        variantSku: 'AP-SK-012-M'
      },
      {
        productId: 'prod-106',
        productName: 'Minimalist Walnut Desk Organizer',
        quantity: 1,
        price: 69.99,
        variantSku: 'OF-DO-008'
      }
    ],
    subtotal: 169.95,
    tax: 13.60,
    discount: 10.00,
    total: 173.55,
    paymentMethod: 'Installments (Klarna/Afterpay)',
    channel: 'Mobile App',
    customerId: 'cust-203',
    customerName: 'John Connor',
    status: 'Completed'
  },
  {
    id: 'ord-5004',
    date: '2026-08-12T11:55:00-07:00',
    items: [
      {
        productId: 'prod-104',
        productName: 'Apex Ergonomic Mesh Chair',
        quantity: 1,
        price: 349.99,
        variantSku: 'HO-CH-099-STD'
      }
    ],
    subtotal: 349.99,
    tax: 28.00,
    discount: 0.00,
    total: 377.99,
    paymentMethod: 'Bank Transfer',
    channel: 'In-Store POS',
    customerId: 'cust-201',
    customerName: 'Sarah Connor',
    status: 'Completed'
  },
  {
    id: 'ord-5005',
    date: '2026-08-13T16:20:00-07:00',
    items: [
      {
        productId: 'prod-101',
        productName: 'AeroSound Pro ANC Headphones',
        quantity: 2,
        price: 249.99,
        variantSku: 'EL-HP-001-SLV'
      },
      {
        productId: 'prod-105',
        productName: 'HydroLock Steel Flask 1L',
        quantity: 1,
        price: 39.99,
        variantSku: 'FT-FK-023-WHT'
      }
    ],
    subtotal: 539.97,
    tax: 43.20,
    discount: 25.00,
    total: 558.17,
    paymentMethod: 'Credit/Debit Card',
    channel: 'Online Storefront',
    customerId: 'cust-204',
    customerName: 'Kyle Reese',
    status: 'Completed'
  },
  {
    id: 'ord-5006',
    date: '2026-08-14T13:10:00-07:00',
    items: [
      {
        productId: 'prod-103',
        productName: 'Merino Wool Trail Socks',
        quantity: 6,
        price: 24.99,
        variantSku: 'AP-SK-012-L'
      },
      {
        productId: 'prod-104',
        productName: 'Apex Ergonomic Mesh Chair',
        quantity: 1,
        price: 349.99,
        variantSku: 'HO-CH-099-STD'
      }
    ],
    subtotal: 499.93,
    tax: 39.99,
    discount: 30.00,
    total: 509.92,
    paymentMethod: 'Credit/Debit Card',
    channel: 'In-Store POS',
    customerId: 'cust-202',
    customerName: 'Miles Dyson',
    status: 'Completed'
  },
  {
    id: 'ord-5007',
    date: '2026-08-15T09:40:00-07:00',
    items: [
      {
        productId: 'prod-102',
        productName: 'FitTrack V4 Smartwatch',
        quantity: 2,
        price: 189.99,
        variantSku: 'EL-SW-004-CHR'
      },
      {
        productId: 'prod-106',
        productName: 'Minimalist Walnut Desk Organizer',
        quantity: 2,
        price: 69.99,
        variantSku: 'OF-DO-008'
      }
    ],
    subtotal: 519.96,
    tax: 41.60,
    discount: 20.00,
    total: 541.56,
    paymentMethod: 'Mobile Pay',
    channel: 'Online Storefront',
    customerId: 'cust-201',
    customerName: 'Sarah Connor',
    status: 'Completed'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-001',
    timestamp: '2026-07-14T08:30:00-07:00',
    staffName: 'Elena Rostova',
    role: 'Admin',
    action: 'System Boot & DB Connect',
    module: 'User Management',
    details: 'Primary multi-location synchronization validated successfully.'
  },
  {
    id: 'log-002',
    timestamp: '2026-07-14T09:15:22-07:00',
    staffName: 'Cody Sparks',
    role: 'Warehouse Staff',
    action: 'Stock Adjustment',
    module: 'Inventory',
    details: 'Added 50 units of Merino Wool Socks (AP-SK-012-M) to Warehouse Rack B4.'
  },
  {
    id: 'log-003',
    timestamp: '2026-07-14T10:16:11-07:00',
    staffName: 'Jessie Quick',
    role: 'Cashier',
    action: 'POS Sale Processed',
    module: 'POS',
    details: 'Processed order ord-5001 total $341.37. Applied COUPON_15 promo.'
  },
  {
    id: 'log-004',
    timestamp: '2026-07-15T11:00:00-07:00',
    staffName: 'Marcus Aurelius',
    role: 'Manager',
    action: 'Pricing Configuration',
    module: 'Inventory',
    details: 'Configured FitTrack V4 Smartwatch price from $199.99 to $189.99.'
  }
];
