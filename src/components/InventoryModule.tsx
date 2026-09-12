import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  ArrowUpDown,
  Barcode,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Edit2,
  Eye,
  FileText,
  Filter,
  FolderTree,
  Layers,
  LayoutGrid,
  List,
  MapPin,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Trash,
  Upload,
  X,
} from 'lucide-react';

import { Product, StaffMember, Category } from '../types';
import { hasPermission } from '../utils/permissions';
import BarcodeGeneratorModal from './BarcodeGeneratorModal';
import ProductDetailModal from './ProductDetailModal';
import ProductFormModal from './ProductFormModal';
import AIProductPhotoScannerModal from './AIProductPhotoScannerModal';
import { CategoryHierarchyManagerModal } from './CategoryHierarchyManagerModal';
import { getChildCategoryIds } from '../utils/categoryUtils';
import { mapExtractedDataToProduct } from '../services/aiPhotoExtractor';
import { useCurrency } from '../context/CurrencyContext';
import { getProductLocations, getProductLocationStock } from '../utils/locationUtils';

type SortField = 'name' | 'stock' | 'price' | 'sales' | 'margin' | 'sku';
type SortDirection = 'asc' | 'desc';
type StockStatusFilter = 'all' | 'healthy' | 'low' | 'out';
type ViewMode = 'table' | 'cards';

export type InventoryTransactionType =
  | 'PURCHASE'
  | 'SALE_RETURN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'DAMAGE'
  | 'EXPIRED'
  | 'LOST'
  | 'FOUND'
  | 'OPENING_BALANCE'
  | 'STOCK_COUNT';

export interface InventoryAdjustmentRequest {
  productId: string;
  variantId?: string;
  locationId?: string;
  quantity: number;
  type: InventoryTransactionType;
  reason: string;
  reference?: string;
}

export interface InventoryTransferRequest {
  productId: string;
  variantId?: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  reason: string;
  reference?: string;
}

export interface InventoryMutationResult {
  success: boolean;
  message?: string;
}

export interface InventoryService {
  adjustStock(request: InventoryAdjustmentRequest): Promise<InventoryMutationResult>;
  transferStock(request: InventoryTransferRequest): Promise<InventoryMutationResult>;
  bulkAdjust?(requests: InventoryAdjustmentRequest[]): Promise<InventoryMutationResult>;
  deleteProducts?(productIds: string[]): Promise<InventoryMutationResult>;
  createProduct?(product: Product): Promise<InventoryMutationResult>;
  updateProduct?(product: Product): Promise<InventoryMutationResult>;
  importProducts?(products: Product[]): Promise<InventoryMutationResult>;
}

interface InventoryModuleProps {
  products: Product[];
  categoriesList?: Category[];

  /**
   * These callbacks are retained for compatibility with the existing application.
   * For production inventory mutations, prefer inventoryService so the server owns
   * authorization, concurrency control, transaction creation and audit logging.
   */
  onSaveCategory?: (category: Category) => void | Promise<void>;
  onDeleteCategory?: (categoryId: string) => void | Promise<void>;
  onAddProduct: (product: Product) => void | Promise<void>;
  onUpdateProduct: (product: Product) => void | Promise<void>;
  onDeleteProduct: (productId: string) => void | Promise<void>;

  staffRole?: string;
  activeStaff?: StaffMember;

  /**
   * Recommended production mutation layer.
   * Backend should enforce permissions and create inventory ledger entries.
   */
  inventoryService?: InventoryService;

  locations?: Array<{ id: string; name: string }>;
  loading?: boolean;
}

const DEFAULT_LOCATIONS = [
  { id: 'warehouse', name: 'Warehouse' },
  { id: 'store-shelf', name: 'Store Shelf' },
  { id: 'fulfillment-center', name: 'Fulfillment Center' },
];

const PERMISSIONS = {
  view: 'inventory.view',
  create: 'inventory.create',
  edit: 'inventory.edit',
  adjust: 'inventory.adjust',
  transfer: 'inventory.transfer',
  delete: 'inventory.delete',
  reorder: 'inventory.reorder',
  import: 'inventory.import',
  export: 'inventory.export',
  category: 'inventory.manage_categories',
} as const;

function normalizeCode(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function escapeCsvCell(value: unknown): string {
  const text = String(value ?? '');
  // Prevent spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell.trim());
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length || row.length) {
    row.push(cell.trim());
    if (row.some(value => value !== '')) rows.push(row);
  }

  return rows;
}

function parseNonNegativeNumber(value: string, field: string, row: number): number {
  if (value.trim() === '') {
    throw new Error(`Row ${row}: ${field} is required.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Row ${row}: ${field} must be a non-negative number.`);
  }
  return parsed;
}

function parseNonNegativeInteger(value: string, field: string, row: number): number {
  const parsed = parseNonNegativeNumber(value, field, row);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Row ${row}: ${field} must be a whole number.`);
  }
  return parsed;
}

function PermissionDenied() {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
      <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-rose-600" />
      <h2 className="text-base font-bold text-rose-900">Inventory access denied</h2>
      <p className="mt-1 text-sm text-rose-700">
        You do not have permission to view inventory.
      </p>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
              destructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReasonDialog({
  open,
  title,
  quantity,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  title: string;
  quantity: number;
  onSubmit: (reason: string, reference?: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={event => {
          event.preventDefault();
          if (!reason.trim()) return;
          onSubmit(reason.trim(), reference.trim() || undefined);
          setReason('');
          setReference('');
        }}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
      >
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">
          Requested quantity: <strong>{quantity}</strong>. The server should validate the final balance.
        </p>

        <label className="mt-4 block text-xs font-bold text-slate-700">
          Reason
          <textarea
            required
            value={reason}
            onChange={event => setReason(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Purchase receipt, damaged goods, cycle count..."
          />
        </label>

        <label className="mt-3 block text-xs font-bold text-slate-700">
          Reference (optional)
          <input
            value={reference}
            onChange={event => setReference(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="PO-2026-001"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}

function TransferDialog({
  open,
  product,
  locations,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  product?: Product | null;
  locations: Array<{ id: string; name: string }>;
  onSubmit: (fromLocationId: string, toLocationId: string, quantity: number, reason: string, reference?: string) => void;
  onCancel: () => void;
}) {
  const currentLocations = useMemo(() => (product ? getProductLocations(product) : []), [product]);
  const locationStockList = useMemo(() => (product ? getProductLocationStock(product) : []), [product]);

  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');

  // Synchronize default from and to locations when a product is opened
  React.useEffect(() => {
    if (product) {
      const locs = getProductLocations(product);
      const defaultFrom = locs[0] || locations[0]?.name || '';
      setFromLocationId(defaultFrom);

      // Find a destination different from origin
      const otherLocation = locations.find(l => l.name.toLowerCase() !== defaultFrom.toLowerCase());
      setToLocationId(otherLocation ? otherLocation.name : (locations[0]?.name ?? ''));
      setQuantity(1);
      setReason('');
      setReference('');
    }
  }, [product, locations]);

  if (!open || !product) return null;

  const currentSourceStock = locationStockList.find(
    s => s.location.toLowerCase() === fromLocationId.toLowerCase()
  )?.stock ?? product.stock;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <form
        onSubmit={event => {
          event.preventDefault();
          if (!fromLocationId || !toLocationId || quantity <= 0 || !reason.trim()) return;
          onSubmit(fromLocationId, toLocationId, quantity, reason.trim(), reference.trim() || undefined);
        }}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Transfer Inventory</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Relocate stock between facilities or display zones with auditable ledger tracking.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Product Snapshot */}
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200/80">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Package className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-xs font-bold text-slate-900">{product.name}</h4>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
              <span className="font-mono font-semibold">{product.sku}</span>
              <span>•</span>
              <span>Total On-Hand: <strong className="text-slate-800">{product.stock}</strong></span>
            </div>
          </div>
        </div>

        {/* Source and Destination Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-slate-700">
            Source Location
            <select
              value={fromLocationId}
              onChange={event => setFromLocationId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              {locations.map(loc => {
                const stockAtLoc = locationStockList.find(s => s.location.toLowerCase() === loc.name.toLowerCase())?.stock;
                return (
                  <option key={loc.id} value={loc.name}>
                    {loc.name} {stockAtLoc !== undefined ? `(${stockAtLoc} pcs)` : ''}
                  </option>
                );
              })}
            </select>
            <span className="mt-1 block text-[10px] text-slate-500">
              Available: <strong>{currentSourceStock}</strong> unit(s)
            </span>
          </label>

          <label className="block text-xs font-bold text-slate-700">
            Destination Facility
            <select
              value={toLocationId}
              onChange={event => setToLocationId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.name} disabled={loc.name.toLowerCase() === fromLocationId.toLowerCase()}>
                  {loc.name} {loc.name.toLowerCase() === fromLocationId.toLowerCase() ? '(Source)' : ''}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[10px] text-slate-500">
              Target destination
            </span>
          </label>
        </div>

        {/* Quantity */}
        <label className="block text-xs font-bold text-slate-700">
          Transfer Quantity
          <div className="relative mt-1">
            <input
              type="number"
              min={1}
              max={Math.max(1, currentSourceStock)}
              step={1}
              value={quantity}
              onChange={event => setQuantity(Math.max(1, Number(event.target.value)))}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
            {currentSourceStock > 1 && (
              <button
                type="button"
                onClick={() => setQuantity(currentSourceStock)}
                className="absolute right-2 top-2 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100"
              >
                All ({currentSourceStock})
              </button>
            )}
          </div>
        </label>

        {/* Reason and Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-slate-700">
            Reason *
            <input
              required
              value={reason}
              onChange={event => setReason(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Retail floor replenishment"
            />
          </label>

          <label className="block text-xs font-bold text-slate-700">
            Reference / Memo
            <input
              value={reference}
              onChange={event => setReference(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
              placeholder="TRF-2026-001"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!fromLocationId || !toLocationId || fromLocationId.toLowerCase() === toLocationId.toLowerCase() || quantity <= 0}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>Confirm Transfer</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function InventoryModule({
  products,
  categoriesList = [],
  onSaveCategory,
  onDeleteCategory,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  staffRole,
  activeStaff,
  inventoryService,
  locations = DEFAULT_LOCATIONS,
  loading = false,
}: InventoryModuleProps) {
  const { formatAmount } = useCurrency();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<StockStatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortField>('stock');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<Product | null>(null);
  const [barcodeModalSku, setBarcodeModalSku] = useState('');

  const [isAiPhotoModalOpen, setIsAiPhotoModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<Product[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [reasonDialog, setReasonDialog] = useState<{
    product: Product;
    quantity: number;
  } | null>(null);

  const [transferDialog, setTransferDialog] = useState<Product | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string[] | null>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [locationPopoverProductId, setLocationPopoverProductId] = useState<string | null>(null);

  // Derive dynamic list of all distinct inventory locations from products and defaults
  const effectiveLocations = useMemo(() => {
    const map = new Map<string, string>();
    locations.forEach(loc => map.set(loc.name.toLowerCase(), loc.name));
    products.forEach(p => {
      getProductLocations(p).forEach(locName => {
        if (locName) map.set(locName.toLowerCase(), locName);
      });
    });
    return Array.from(map.values()).map(name => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
    }));
  }, [locations, products]);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const can = useCallback(
    (permission: string) => {
      if (!activeStaff) {
        return ['Admin', 'Manager', 'Warehouse Staff', 'Super Admin', 'Inventory Manager'].includes(
          staffRole ?? ''
        );
      }
      return hasPermission(activeStaff, permission as any);
    },
    [activeStaff, staffRole]
  );

  const canView = !activeStaff ? true : can(PERMISSIONS.view);
  const canCreate = can(PERMISSIONS.create);
  const canEdit = can(PERMISSIONS.edit);
  const canAdjust = can(PERMISSIONS.adjust);
  const canTransfer = can(PERMISSIONS.transfer);
  const canDelete = can(PERMISSIONS.delete);
  const canReorder = can(PERMISSIONS.reorder);
  const canImport = can(PERMISSIONS.import);
  const canExport = can(PERMISSIONS.export);
  const canManageCategories = can(PERMISSIONS.category);

  const categoryOptions = useMemo(
    () => ['All', ...Array.from(new Set(products.map(product => product.category).filter(Boolean)))],
    [products]
  );

  const brands = useMemo(
    () => Array.from(new Set(products.map(product => product.brand).filter(Boolean))) as string[],
    [products]
  );

  const categoryMatches = useMemo(() => {
    if (selectedCategory === 'All') return null;

    const category = categoriesList.find(
      item => item.id === selectedCategory || item.name === selectedCategory
    );

    if (!category) return new Set([selectedCategory.toLowerCase()]);

    const ids = getChildCategoryIds(category.id, categoriesList);
    const matches = new Set<string>([category.id.toLowerCase(), category.name.toLowerCase()]);

    ids.forEach(id => {
      matches.add(id.toLowerCase());
      const child = categoriesList.find(item => item.id === id);
      if (child) matches.add(child.name.toLowerCase());
    });

    return matches;
  }, [categoriesList, selectedCategory]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return [...products]
      .filter(product => {
        const searchable = [
          product.name,
          product.sku,
          product.barcode,
          product.qrCode,
          ...(product.variants ?? []).map(variant => variant.sku),
        ]
          .filter(Boolean)
          .map(normalizeCode);

        const matchesSearch = !query || searchable.some(value => value.includes(query));

        const categoryValue = normalizeCode(product.category);
        const matchesCategory =
          !categoryMatches || categoryMatches.has(categoryValue) ||
          categoryMatches.has(String(product.category ?? '').toLowerCase());

        const productLocations = getProductLocations(product);
        const matchesLocation =
          selectedLocation === 'All' ||
          productLocations.some(loc => normalizeCode(loc) === normalizeCode(selectedLocation));

        const matchesStatus =
          stockStatusFilter === 'all' ||
          (stockStatusFilter === 'out' && product.stock <= 0) ||
          (stockStatusFilter === 'low' &&
            product.stock > 0 &&
            product.stock <= product.reorderPoint) ||
          (stockStatusFilter === 'healthy' && product.stock > product.reorderPoint);

        return matchesSearch && matchesCategory && matchesLocation && matchesStatus;
      })
      .sort((a, b) => {
        let left: string | number = 0;
        let right: string | number = 0;

        switch (sortBy) {
          case 'name':
            left = a.name.toLowerCase();
            right = b.name.toLowerCase();
            break;
          case 'sku':
            left = a.sku.toLowerCase();
            right = b.sku.toLowerCase();
            break;
          case 'price':
            left = a.price;
            right = b.price;
            break;
          case 'sales':
            left = a.salesCount;
            right = b.salesCount;
            break;
          case 'margin':
            left = a.price - a.cost;
            right = b.price - b.cost;
            break;
          default:
            left = a.stock;
            right = b.stock;
        }

        const comparison = left < right ? -1 : left > right ? 1 : 0;
        return sortDir === 'asc' ? comparison : -comparison;
      });
  }, [
    products,
    searchTerm,
    selectedCategory,
    selectedLocation,
    stockStatusFilter,
    sortBy,
    sortDir,
    categoryMatches,
  ]);

  const metrics = useMemo(() => {
    const totalUnits = products.reduce((sum, product) => sum + Math.max(0, product.stock), 0);
    const lowStock = products.filter(
      product => product.stock > 0 && product.stock <= product.reorderPoint
    ).length;
    const outOfStock = products.filter(product => product.stock <= 0).length;
    const costValue = products.reduce(
      (sum, product) => sum + Math.max(0, product.stock) * Math.max(0, product.cost),
      0
    );
    const retailValue = products.reduce(
      (sum, product) => sum + Math.max(0, product.stock) * Math.max(0, product.price),
      0
    );

    return {
      totalUnits,
      lowStock,
      outOfStock,
      costValue,
      potentialProfit: retailValue - costValue,
    };
  }, [products]);

  const setSuccess = (message: string) => {
    setNotice({ type: 'success', message });
    window.setTimeout(() => setNotice(null), 4000);
  };

  const setError = (message: string) => {
    setNotice({ type: 'error', message });
    window.setTimeout(() => setNotice(null), 5000);
  };

  const runMutation = async (operation: () => Promise<InventoryMutationResult | void>) => {
    setBusy(true);
    try {
      const result = await operation();
      if (result && !result.success) {
        throw new Error(result.message || 'Inventory operation failed.');
      }
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Inventory operation failed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  /**
   * IMPORTANT:
   * Never calculate authoritative stock on the client.
   * When inventoryService exists, the backend performs the atomic mutation,
   * creates ledger entries, checks permissions, prevents negative stock and
   * records the audit event.
   */
  const handleAdjust = async (product: Product, quantity: number, reason: string, reference?: string) => {
    if (!canAdjust) {
      setError('You do not have permission to adjust inventory.');
      return;
    }

    const ok = await runMutation(async () => {
      if (inventoryService) {
        return inventoryService.adjustStock({
          productId: product.id,
          locationId: String(product.location ?? ''),
          quantity: Math.abs(quantity),
          type: quantity >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          reason,
          reference,
        });
      }

      // Legacy fallback. Keep only while migrating to the server inventory service.
      const nextStock = Math.max(0, product.stock + quantity);
      await onUpdateProduct({ ...product, stock: nextStock });
      return { success: true };
    });

    if (ok) setSuccess(`${quantity >= 0 ? 'Added' : 'Removed'} ${Math.abs(quantity)} unit(s).`);
  };

  const handleTransfer = async (
    product: Product,
    fromLocationNameOrId: string,
    toLocationNameOrId: string,
    quantity: number,
    reason: string,
    reference?: string
  ) => {
    if (!canTransfer) {
      setError('You do not have permission to transfer inventory.');
      return;
    }

    const fromLocName = effectiveLocations.find(l => l.id === fromLocationNameOrId || l.name.toLowerCase() === fromLocationNameOrId.toLowerCase())?.name ?? fromLocationNameOrId;
    const toLocName = effectiveLocations.find(l => l.id === toLocationNameOrId || l.name.toLowerCase() === toLocationNameOrId.toLowerCase())?.name ?? toLocationNameOrId;

    if (!fromLocName || !toLocName || fromLocName.toLowerCase() === toLocName.toLowerCase()) {
      setError('Choose a destination different from the origin location.');
      return;
    }

    const ok = await runMutation(async () => {
      if (inventoryService) {
        return inventoryService.transferStock({
          productId: product.id,
          fromLocationId: fromLocName,
          toLocationId: toLocName,
          quantity,
          reason,
          reference,
        });
      }

      // Multi-location inventory distribution calculation
      const currentLocStock = getProductLocationStock(product);
      let foundSource = false;
      const updatedLocStock = currentLocStock.map(item => {
        if (item.location.toLowerCase() === fromLocName.toLowerCase()) {
          foundSource = true;
          return { ...item, stock: Math.max(0, item.stock - quantity) };
        }
        return item;
      });

      if (!foundSource) {
        updatedLocStock.push({ location: fromLocName, stock: Math.max(0, product.stock - quantity) });
      }

      const destIndex = updatedLocStock.findIndex(item => item.location.toLowerCase() === toLocName.toLowerCase());
      if (destIndex >= 0) {
        updatedLocStock[destIndex].stock += quantity;
      } else {
        updatedLocStock.push({ location: toLocName, stock: quantity });
      }

      const currentLocs = getProductLocations(product);
      const updatedLocations = Array.from(new Set([...currentLocs, toLocName]));

      await onUpdateProduct({
        ...product,
        locations: updatedLocations,
        locationStock: updatedLocStock,
        location: updatedLocations.join(', ') as Product['location'],
      });
      return { success: true };
    });

    if (ok) setSuccess(`Transferred ${quantity} unit(s) of ${product.name} from ${fromLocName} to ${toLocName}.`);
  };

  const handleBulkAdjust = async (amount: number) => {
    if (!canReorder) {
      setError('You do not have permission to reorder inventory.');
      return;
    }

    const selected = products.filter(product => selectedProductIds.includes(product.id));
    if (!selected.length) return;

    const requests: InventoryAdjustmentRequest[] = selected.map(product => ({
      productId: product.id,
      locationId: String(product.location ?? ''),
      quantity: amount,
      type: 'PURCHASE',
      reason: 'Bulk replenishment',
    }));

    const ok = await runMutation(async () => {
      if (inventoryService?.bulkAdjust) {
        return inventoryService.bulkAdjust(requests);
      }

      for (const request of requests) {
        const product = selected.find(item => item.id === request.productId);
        if (!product) continue;
        await onUpdateProduct({ ...product, stock: product.stock + amount });
      }
      return { success: true };
    });

    if (ok) {
      setSelectedProductIds([]);
      setSuccess(`Replenishment submitted for ${selected.length} product(s).`);
    }
  };

  const handleDeleteSelected = () => {
    if (!canDelete) {
      setError('You do not have permission to delete inventory items.');
      return;
    }
    if (!selectedProductIds.length) return;
    setDeleteDialog([...selectedProductIds]);
  };

  const confirmDelete = async () => {
    const ids = deleteDialog ?? [];
    setDeleteDialog(null);
    if (!ids.length) return;

    const ok = await runMutation(async () => {
      if (inventoryService?.deleteProducts) {
        return inventoryService.deleteProducts(ids);
      }

      for (const id of ids) await onDeleteProduct(id);
      return { success: true };
    });

    if (ok) {
      setSelectedProductIds([]);
      setSuccess(`${ids.length} product(s) deleted.`);
    }
  };

  const buildImportPreview = (text: string) => {
    setCsvErrors([]);
    setCsvPreview([]);

    try {
      const rows = parseCsv(text);
      if (rows.length < 2) throw new Error('CSV must contain a header and at least one data row.');

      const header = rows[0].map(value => normalizeCode(value));
      const required = ['name', 'sku', 'price', 'cost', 'stock', 'category', 'reorderpoint', 'location'];
      const missing = required.filter(field => !header.includes(field));

      if (missing.length) {
        throw new Error(`Missing required CSV columns: ${missing.join(', ')}`);
      }

      const indexOf = (name: string) => header.indexOf(name);
      const seenSkus = new Set<string>();
      const preview: Product[] = [];
      const errors: string[] = [];

      rows.slice(1).forEach((row, index) => {
        const rowNumber = index + 2;
        try {
          const name = row[indexOf('name')]?.trim();
          const sku = row[indexOf('sku')]?.trim();
          const category = row[indexOf('category')]?.trim();
          const location = row[indexOf('location')]?.trim();

          if (!name) throw new Error(`Row ${rowNumber}: name is required.`);
          if (!sku) throw new Error(`Row ${rowNumber}: SKU is required.`);
          if (!category) throw new Error(`Row ${rowNumber}: category is required.`);
          if (!location) throw new Error(`Row ${rowNumber}: location is required.`);

          const normalizedSku = normalizeCode(sku);
          if (seenSkus.has(normalizedSku)) {
            throw new Error(`Row ${rowNumber}: duplicate SKU "${sku}" in import.`);
          }
          if (products.some(product => normalizeCode(product.sku) === normalizedSku)) {
            throw new Error(`Row ${rowNumber}: SKU "${sku}" already exists.`);
          }
          seenSkus.add(normalizedSku);

          const price = parseNonNegativeNumber(row[indexOf('price')] ?? '', 'price', rowNumber);
          const cost = parseNonNegativeNumber(row[indexOf('cost')] ?? '', 'cost', rowNumber);
          const stock = parseNonNegativeInteger(row[indexOf('stock')] ?? '', 'stock', rowNumber);
          const reorderPoint = parseNonNegativeInteger(
            row[indexOf('reorderpoint')] ?? '',
            'reorderPoint',
            rowNumber
          );

          if (cost > price) {
            throw new Error(`Row ${rowNumber}: cost cannot be greater than selling price.`);
          }

          const barcodeIndex = indexOf('barcode');
          const qrIndex = indexOf('qrcode');

          const validLocation = (['Warehouse', 'Store Shelf', 'Fulfillment Center'].includes(location)
            ? location
            : 'Warehouse') as Product['location'];

          preview.push({
            id: `import-preview-${rowNumber}`,
            name,
            sku,
            price,
            cost,
            stock,
            category,
            location: validLocation,
            reorderPoint,
            barcode: barcodeIndex >= 0 ? row[barcodeIndex]?.trim() || '' : '',
            qrCode: qrIndex >= 0 ? row[qrIndex]?.trim() || '' : '',
            variants: [],
            salesCount: 0,
            description: 'Imported catalog item.',
          });
        } catch (error) {
          errors.push(error instanceof Error ? error.message : `Row ${rowNumber}: invalid data.`);
        }
      });

      setCsvErrors(errors);
      setCsvPreview(preview);
    } catch (error) {
      setCsvErrors([error instanceof Error ? error.message : 'Invalid CSV.']);
    }
  };

  const handleImport = async () => {
    if (!canImport) {
      setError('You do not have permission to import inventory.');
      return;
    }

    if (!csvPreview.length || csvErrors.length) {
      setError('Resolve all CSV validation errors before importing.');
      return;
    }

    const ok = await runMutation(async () => {
      if (inventoryService?.importProducts) {
        return inventoryService.importProducts(csvPreview);
      }

      for (const product of csvPreview) {
        const { id: _previewId, ...rest } = product;
        await onAddProduct({
          ...rest,
          id: crypto.randomUUID(),
        } as Product);
      }

      return { success: true };
    });

    if (ok) {
      setCsvText('');
      setCsvPreview([]);
      setCsvErrors([]);
      setShowImport(false);
      setSuccess(`${csvPreview.length} product(s) imported.`);
    }
  };

  const handleExport = () => {
    if (!canExport) {
      setError('You do not have permission to export inventory.');
      return;
    }

    const rows = [
      ['Name', 'SKU', 'Price', 'Cost', 'Stock', 'Category', 'ReorderPoint', 'Location', 'Barcode', 'QRCode'],
      ...filteredProducts.map(product => [
        product.name,
        product.sku,
        product.price,
        product.cost,
        product.stock,
        product.category,
        product.reorderPoint,
        product.location,
        product.barcode,
        product.qrCode,
      ]),
    ];

    downloadCsv(`Inventory_Export_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleDownloadTemplate = () => {
    downloadCsv('Inventory_Import_Template.csv', [
      ['Name', 'SKU', 'Price', 'Cost', 'Stock', 'Category', 'ReorderPoint', 'Location', 'Barcode', 'QRCode'],
      ['Wireless Noise-Cancelling Headphones', 'WNC-001', 149.99, 65, 45, 'Electronics', 10, 'Warehouse', '', ''],
      ['Organic Cotton Crewneck', 'OCC-002', 34.5, 12, 80, 'Apparel & Fashion', 15, 'Store Shelf', '', ''],
    ]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('CSV file must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setCsvText(text);
      buildImportPreview(text);
    };
    reader.onerror = () => setError('Unable to read the CSV file.');
    reader.readAsText(file);
    event.target.value = '';
  };

  const toggleSelection = (productId: string) => {
    setSelectedProductIds(current =>
      current.includes(productId)
        ? current.filter(id => id !== productId)
        : [...current, productId]
    );
  };

  const toggleSelectAll = () => {
    const ids = filteredProducts.map(product => product.id);
    const allSelected = ids.length > 0 && ids.every(id => selectedProductIds.includes(id));

    setSelectedProductIds(current =>
      allSelected ? current.filter(id => !ids.includes(id)) : Array.from(new Set([...current, ...ids]))
    );
  };

  const openAdd = () => {
    if (!canCreate) {
      setError('You do not have permission to create products.');
      return;
    }
    setEditingProduct(null);
    setIsFormModalOpen(true);
  };

  const openEdit = (product: Product) => {
    if (!canEdit) {
      setError('You do not have permission to edit products.');
      return;
    }
    setEditingProduct(product);
    setIsFormModalOpen(true);
  };

  const openBarcode = (product?: Product | null, sku?: string) => {
    setBarcodeModalProduct(product ?? null);
    setBarcodeModalSku(sku ?? product?.sku ?? '');
    setIsBarcodeModalOpen(true);
  };

  if (!canView) return <PermissionDenied />;

  return (
    <div className="space-y-5" id="inventory-module-root">
      {notice && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border p-3 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>{notice.message}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
              <Package className="h-6 w-6 text-indigo-600" />
              Inventory & Catalog
            </h1>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              {products.length} SKUs
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Catalog, stock visibility, controlled adjustments, transfers and audit-ready inventory operations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openBarcode(products[0] ?? null)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700"
          >
            <Barcode className="h-4 w-4" />
            Barcode Studio
          </button>

          {canCreate && (
            <>
              <button
                type="button"
                onClick={() => setIsAiPhotoModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white"
              >
                <Sparkles className="h-4 w-4" />
                AI Photo Scan
              </button>
              <button
                type="button"
                onClick={openAdd}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            </>
          )}

          {canImport && (
            <button
              type="button"
              onClick={() => setShowImport(value => !value)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
          )}

          {canExport && (
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="On-hand units" value={metrics.totalUnits.toLocaleString()} icon={<Package className="h-5 w-5" />} />
        <MetricCard
          label="Low stock"
          value={metrics.lowStock.toLocaleString()}
          icon={<ShieldAlert className="h-5 w-5" />}
          active={stockStatusFilter === 'low'}
          onClick={() => setStockStatusFilter(value => (value === 'low' ? 'all' : 'low'))}
        />
        <MetricCard
          label="Out of stock"
          value={metrics.outOfStock.toLocaleString()}
          icon={<AlertTriangle className="h-5 w-5" />}
          active={stockStatusFilter === 'out'}
          onClick={() => setStockStatusFilter(value => (value === 'out' ? 'all' : 'out'))}
        />
        <MetricCard
          label="Cost valuation"
          value={formatAmount(metrics.costValue)}
          subtitle={`Potential profit ${formatAmount(metrics.potentialProfit)}`}
        />
      </section>

      {showImport && canImport && (
        <section className="rounded-2xl border border-indigo-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Upload className="h-4 w-4 text-indigo-600" />
                Safe CSV import
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Upload/parse first, validate second, preview third, then commit. No silent defaults.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
            >
              <Download className="h-4 w-4" />
              Template
            </button>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div>
              <textarea
                value={csvText}
                onChange={event => {
                  setCsvText(event.target.value);
                  setCsvPreview([]);
                  setCsvErrors([]);
                }}
                onBlur={() => csvText.trim() && buildImportPreview(csvText)}
                rows={8}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Name,SKU,Price,Cost,Stock,Category,ReorderPoint,Location,Barcode,QRCode"
              />

              <div className="mt-2 flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  Choose CSV
                </button>
                <button
                  type="button"
                  onClick={() => buildImportPreview(csvText)}
                  disabled={!csvText.trim() || busy}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  Validate
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!csvPreview.length || csvErrors.length > 0 || busy}
                  className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Import {csvPreview.length || ''}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Validation</span>
                <span className="text-xs text-slate-500">{csvPreview.length} valid rows</span>
              </div>

              {csvErrors.length > 0 ? (
                <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-xs text-rose-700">
                  {csvErrors.map(error => (
                    <li key={error} className="rounded-lg bg-rose-50 p-2">
                      {error}
                    </li>
                  ))}
                </ul>
              ) : csvPreview.length > 0 ? (
                <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                  <strong>{csvPreview.length}</strong> rows passed client validation. Server validation is still authoritative.
                </div>
              ) : (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                  No validation result yet.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Search product, SKU, barcode, category or variant..."
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-wrap lg:items-center">
            <select
              value={selectedCategory}
              onChange={event => setSelectedCategory(event.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 lg:w-auto"
              aria-label="Filter by category"
            >
              {categoryOptions.map(category => (
                <option key={category} value={category}>
                  {category === 'All' ? 'All Categories' : category}
                </option>
              ))}
            </select>

            <select
              value={selectedLocation}
              onChange={event => setSelectedLocation(event.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 lg:w-auto"
              aria-label="Filter by location"
            >
              <option value="All">All Locations</option>
              {effectiveLocations.map(location => (
                <option key={location.id} value={location.name}>
                  {location.name}
                </option>
              ))}
            </select>

            <select
              value={stockStatusFilter}
              onChange={event => setStockStatusFilter(event.target.value as StockStatusFilter)}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 lg:w-auto"
              aria-label="Filter by stock health"
            >
              <option value="all">All Stock Status</option>
              <option value="healthy">Healthy Stock</option>
              <option value="low">Low Stock Alert</option>
              <option value="out">Out of Stock</option>
            </select>

            <div className="flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-slate-50">
              <select
                value={sortBy}
                onChange={event => setSortBy(event.target.value as SortField)}
                className="min-h-[44px] flex-1 bg-transparent px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none"
                aria-label="Sort inventory by"
              >
                <option value="stock">Sort: Stock</option>
                <option value="name">Sort: Name</option>
                <option value="sku">Sort: SKU</option>
                <option value="price">Sort: Price</option>
                <option value="sales">Sort: Sales</option>
                <option value="margin">Sort: Margin</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir(value => (value === 'asc' ? 'desc' : 'asc'))}
                className="flex min-h-[44px] min-w-[40px] items-center justify-center border-l border-slate-200 p-2 text-slate-500 hover:text-slate-800"
                title={`Sort ${sortDir === 'asc' ? 'Ascending (click for Descending)' : 'Descending (click for Ascending)'}`}
                aria-label="Toggle sort direction"
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </div>

            <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-4 lg:col-span-1">
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    viewMode === 'table'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Table View"
                >
                  <List className="h-4 w-4" />
                  <span className="sm:inline">Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    viewMode === 'cards'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Grid Cards View"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="sm:inline">Cards</span>
                </button>
              </div>

              {canManageCategories && (
                <button
                  type="button"
                  onClick={() => setIsCategoryManagerOpen(true)}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <FolderTree className="h-4 w-4 text-indigo-600" />
                  <span className="whitespace-nowrap">Categories</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results summary bar with quick reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="font-semibold text-slate-800">{filteredProducts.length}</strong> of{' '}
              <strong className="font-semibold text-slate-800">{products.length}</strong> items
            </span>
            {(searchTerm ||
              selectedCategory !== 'All' ||
              selectedLocation !== 'All' ||
              stockStatusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All');
                  setSelectedLocation('All');
                  setStockStatusFilter('all');
                }}
                className="font-semibold text-indigo-600 hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="font-semibold text-slate-600 hover:text-slate-900"
            >
              {filteredProducts.length > 0 &&
              filteredProducts.every(product => selectedProductIds.includes(product.id))
                ? 'Deselect all'
                : 'Select all on page'}
            </button>
          </div>
        </div>
      </section>

      {selectedProductIds.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl bg-slate-900 p-4 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 min-w-[28px] items-center justify-center rounded-lg bg-indigo-600 px-2 font-mono text-xs font-bold">
              {selectedProductIds.length}
            </span>
            <span className="text-xs font-medium text-slate-300">Selected for batch actions</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canReorder &&
              [10, 25, 50].map(amount => (
                <button
                  key={amount}
                  type="button"
                  disabled={busy}
                  onClick={() => handleBulkAdjust(amount)}
                  className="flex min-h-[40px] items-center rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Restock +{amount}
                </button>
              ))}

            {canDelete && (
              <button
                type="button"
                disabled={busy}
                onClick={handleDeleteSelected}
                className="flex min-h-[40px] items-center rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                Delete
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedProductIds([])}
              className="flex min-h-[40px] items-center rounded-xl bg-white/15 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20"
            >
              Clear selection
            </button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            Loading inventory catalog...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 font-bold text-slate-800">No matching products found</h3>
            <p className="mt-1 text-sm text-slate-500">
              Try adjusting your search criteria, category filters, or location filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
                setSelectedLocation('All');
                setStockStatusFilter('all');
              }}
              className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Reset all filters
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div>
            {/* Mobile-First Responsive Card-List for small screens (< md) */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredProducts.map(product => {
                const expanded = !!expandedProductIds[product.id];
                const isSelected = selectedProductIds.includes(product.id);
                const status =
                  product.stock <= 0
                    ? 'out'
                    : product.stock <= product.reorderPoint
                      ? 'low'
                      : 'healthy';

                return (
                  <article
                    key={product.id}
                    id={`row-${product.id}`}
                    className={`p-4 transition-colors ${
                      isSelected ? 'bg-indigo-50/30 ring-1 ring-inset ring-indigo-500/20' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Header Row: Checkbox + Image + Title & Meta + Status Badge */}
                    <div className="flex items-start gap-3">
                      <label className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center -ml-2 -mt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(product.id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </label>

                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/60 bg-slate-100">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">
                            {product.name}
                          </h3>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              status === 'out'
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : status === 'low'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {status === 'out' ? 'OUT' : status === 'low' ? 'LOW' : 'HEALTHY'}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          <span className="font-semibold text-slate-600">{product.category}</span>
                          <span>•</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                            {product.sku}
                          </span>
                          {getProductLocations(product).length > 0 && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                <span>{getProductLocations(product).join(', ')}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Compact Metrics Grid */}
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Stock On Hand
                        </span>
                        <div className="mt-0.5 flex items-baseline gap-1.5">
                          <span className="font-mono text-base font-bold text-slate-900">
                            {product.stock.toLocaleString()}
                          </span>
                          <span className="text-xs font-medium text-slate-400">
                            / {product.reorderPoint} min
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Retail Price
                        </span>
                        <div className="mt-0.5 text-base font-bold text-slate-900">
                          {formatAmount(product.price)}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Variants Accordion (Mobile) */}
                    {product.variants && product.variants.length > 0 && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedProductIds(current => ({
                              ...current,
                              [product.id]: !current[product.id],
                            }))
                          }
                          className="flex min-h-[40px] w-full items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                        >
                          <span className="flex items-center gap-1.5">
                            <Layers className="h-4 w-4 text-indigo-600" />
                            {product.variants.length} {product.variants.length === 1 ? 'Variant' : 'Variants'}
                          </span>
                          <span className="flex items-center gap-1">
                            <span>{expanded ? 'Hide' : 'Show details'}</span>
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </span>
                        </button>

                        {expanded && (
                          <div className="mt-2 space-y-1.5 border-l-2 border-indigo-200 pl-2">
                            {product.variants.map(variant => {
                              const variantName =
                                [variant.color, variant.size, variant.model, variant.optionName]
                                  .filter(Boolean)
                                  .join(' • ') || 'Variant item';
                              return (
                                <div
                                  key={variant.id || variant.sku}
                                  className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs"
                                >
                                  <div className="min-w-0 pr-2">
                                    <div className="truncate font-semibold text-slate-800">{variantName}</div>
                                    <div className="font-mono text-[11px] text-slate-500">{variant.sku}</div>
                                  </div>
                                  <div className="text-right font-mono">
                                    <span className="font-bold text-slate-900">{variant.stock}</span>
                                    <span className="ml-1 text-[10px] text-slate-400">units</span>
                                    {variant.retailPrice !== undefined && (
                                      <div className="text-[11px] font-semibold text-slate-600">
                                        {formatAmount(variant.retailPrice)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Touch-First Mobile Action Toolbar (min-h-[44px]) */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-1">
                      {canAdjust && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setReasonDialog({ product, quantity: 10 })}
                          className="flex min-h-[44px] flex-1 min-w-[100px] items-center justify-center rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          +10 Restock
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setDetailProduct(product);
                          setIsDetailModalOpen(true);
                        }}
                        className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Details</span>
                      </button>

                      {canTransfer && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setTransferDialog(product)}
                          className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                          title="Transfer location"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          <span>Move</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openBarcode(product)}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                        title="Barcode"
                        aria-label="View or print barcode"
                      >
                        <Barcode className="h-4 w-4" />
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                          title="Edit product"
                          aria-label="Edit product"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteDialog([product.id])}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"
                          title="Delete product"
                          aria-label="Delete product"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Desktop Responsive Table (md:block) */}
            <div className="hidden md:block overflow-x-auto relative">
              {(activeActionMenuId || locationPopoverProductId) && (
                <div
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={() => {
                    setActiveActionMenuId(null);
                    setLocationPopoverProductId(null);
                  }}
                />
              )}
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="w-10 px-2.5 lg:px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredProducts.length > 0 &&
                          filteredProducts.every(product => selectedProductIds.includes(product.id))
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-2.5 lg:px-3 py-3 font-bold">Product</th>
                    <th className="px-2.5 lg:px-3 py-3 font-bold whitespace-nowrap">SKU</th>
                    <th className="px-2.5 lg:px-3 py-3 font-bold whitespace-nowrap">Location(s)</th>
                    <th className="px-2.5 lg:px-3 py-3 text-right font-bold whitespace-nowrap">Stock Level</th>
                    <th className="px-2.5 lg:px-3 py-3 text-right font-bold whitespace-nowrap">Unit Price</th>
                    <th className="px-2.5 lg:px-3 py-3 text-center font-bold whitespace-nowrap">Status</th>
                    <th className="px-2.5 lg:px-3 py-3 text-right font-bold whitespace-nowrap">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map(product => {
                    const expanded = !!expandedProductIds[product.id];
                    const isSelected = selectedProductIds.includes(product.id);
                    const status =
                      product.stock <= 0
                        ? 'out'
                        : product.stock <= product.reorderPoint
                          ? 'low'
                          : 'healthy';
                    const productLocations = getProductLocations(product);
                    const locStock = getProductLocationStock(product);

                    return (
                      <React.Fragment key={product.id}>
                        <tr
                          id={`row-${product.id}`}
                          className={`transition-colors ${
                            isSelected ? 'bg-indigo-50/50 hover:bg-indigo-50/70' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="px-2.5 lg:px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(product.id)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>

                          <td className="px-2.5 lg:px-3 py-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailProduct(product);
                                  setIsDetailModalOpen(true);
                                }}
                                className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200/60 bg-slate-100 hover:border-indigo-300 transition-colors"
                                title="View details"
                              >
                                {product.imageUrl ? (
                                  <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <Package className="h-4 w-4 text-slate-400" />
                                )}
                              </button>
                              <div className="min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailProduct(product);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="truncate font-bold text-slate-900 hover:text-indigo-600 transition-colors text-left block max-w-full"
                                  title="View details"
                                >
                                  {product.name}
                                </button>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                  <span className="truncate max-w-[120px]">{product.category}</span>
                                  {product.variants && product.variants.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedProductIds(current => ({
                                          ...current,
                                          [product.id]: !current[product.id],
                                        }))
                                      }
                                      className="inline-flex items-center gap-0.5 rounded bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700 hover:bg-indigo-100 shrink-0"
                                    >
                                      <span>{product.variants.length} var</span>
                                      {expanded ? (
                                        <ChevronUp className="h-3 w-3" />
                                      ) : (
                                        <ChevronDown className="h-3 w-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-2.5 lg:px-3 py-2.5 whitespace-nowrap">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                              {product.sku}
                            </span>
                          </td>

                          <td className="px-2.5 lg:px-3 py-2.5 whitespace-nowrap relative">
                            {productLocations.length <= 1 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                <span>{productLocations[0] || 'Store Shelf'}</span>
                              </span>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                {productLocations.slice(0, 2).map(loc => {
                                  const item = locStock.find(s => s.location.toLowerCase() === loc.toLowerCase());
                                  return (
                                    <span
                                      key={loc}
                                      className="inline-flex items-center gap-1 rounded-md bg-indigo-50/80 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200/50"
                                      title={item ? `${loc}: ${item.stock} units` : loc}
                                    >
                                      <MapPin className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
                                      <span className="truncate max-w-[75px]">{loc}</span>
                                      {item && <span className="font-mono text-indigo-950 font-bold">({item.stock})</span>}
                                    </span>
                                  );
                                })}
                                {productLocations.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLocationPopoverProductId(locationPopoverProductId === product.id ? null : product.id);
                                    }}
                                    className="inline-flex items-center rounded-md bg-slate-100 hover:bg-slate-200 px-1 py-0.5 text-[10px] font-bold text-slate-600 transition-colors"
                                    title={`Stored across ${productLocations.length} locations. Click to view breakdown.`}
                                  >
                                    +{productLocations.length - 2}
                                  </button>
                                )}

                                {locationPopoverProductId === product.id && (
                                  <div className="absolute left-0 top-full z-30 mt-1 min-w-[200px] rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl ring-1 ring-black/5 animate-in fade-in duration-100">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                                      <MapPin className="h-3 w-3 text-indigo-600" />
                                      Location Distribution
                                    </div>
                                    <div className="space-y-1">
                                      {locStock.map(ls => (
                                        <div key={ls.location} className="flex items-center justify-between text-xs py-0.5">
                                          <span className="font-medium text-slate-700">{ls.location}</span>
                                          <span className="font-mono font-bold text-indigo-600">{ls.stock} units</span>
                                        </div>
                                      ))}
                                      <div className="border-t border-slate-100 pt-1 mt-1 flex items-center justify-between text-xs font-bold text-slate-900">
                                        <span>Total Stock</span>
                                        <span className="font-mono">{product.stock} units</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-2.5 lg:px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <span
                                className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                                  status === 'out'
                                    ? 'bg-rose-500'
                                    : status === 'low'
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                }`}
                              />
                              <span className="font-mono font-bold text-slate-900">
                                {product.stock.toLocaleString()}
                              </span>
                              <span className="text-slate-400 text-[11px]">/ {product.reorderPoint}</span>
                            </div>
                          </td>

                          <td className="px-2.5 lg:px-3 py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                            {formatAmount(product.price)}
                          </td>

                          <td className="px-2.5 lg:px-3 py-2.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                status === 'out'
                                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                                  : status === 'low'
                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {status === 'out' ? 'OUT' : status === 'low' ? 'LOW' : 'HEALTHY'}
                            </span>
                          </td>

                          <td className="px-2.5 lg:px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="relative inline-flex items-center justify-end gap-1">
                              {product.variants?.length ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedProductIds(current => ({
                                      ...current,
                                      [product.id]: !current[product.id],
                                    }))
                                  }
                                  className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200 transition-colors"
                                  title={expanded ? 'Hide variants' : 'Show variants'}
                                >
                                  {expanded ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              ) : null}

                              {canAdjust && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setReasonDialog({ product, quantity: 10 })}
                                  className="rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                                  title="Quick Restock +10"
                                >
                                  +10
                                </button>
                              )}

                              {/* More Actions Dropdown */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionMenuId(activeActionMenuId === product.id ? null : product.id);
                                  }}
                                  className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200 transition-colors"
                                  title="Actions"
                                  aria-label="Actions"
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>

                                {activeActionMenuId === product.id && (
                                  <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-black/5 animate-in fade-in duration-100 text-left">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setDetailProduct(product);
                                        setIsDetailModalOpen(true);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left transition-colors"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                                      <span>View Details</span>
                                    </button>

                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          openEdit(product);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left transition-colors"
                                      >
                                        <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                                        <span>Edit Product</span>
                                      </button>
                                    )}

                                    {canTransfer && (
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          setTransferDialog(product);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-left transition-colors"
                                      >
                                        <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-600" />
                                        <span>Transfer Stock</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        openBarcode(product);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left transition-colors"
                                    >
                                      <Barcode className="h-3.5 w-3.5 text-slate-500" />
                                      <span>Barcode Studio</span>
                                    </button>

                                    {canDelete && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          setDeleteDialog([product.id]);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 text-left transition-colors border-t border-slate-100 mt-1 pt-1.5"
                                      >
                                        <Trash className="h-3.5 w-3.5 text-rose-500" />
                                        <span>Delete Product</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>

                        {expanded &&
                          product.variants?.map(variant => {
                            const variantAttributes = [variant.color, variant.size, variant.model, variant.optionName]
                              .filter(Boolean)
                              .join(' • ');

                            return (
                              <tr key={variant.id || variant.sku} className="border-l-4 border-indigo-400 bg-slate-50/70">
                                <td className="px-2.5 lg:px-3 py-2 text-center" />
                                <td className="px-2.5 lg:px-3 py-2 pl-8 text-slate-700">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">{variantAttributes || 'Variant'}</span>
                                    {variant.isActive === false && (
                                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600">
                                        Inactive
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-2.5 lg:px-3 py-2 font-mono text-xs text-slate-600 whitespace-nowrap">{variant.sku}</td>
                                <td className="px-2.5 lg:px-3 py-2 text-slate-500 whitespace-nowrap">{productLocations.join(', ')}</td>
                                <td className="px-2.5 lg:px-3 py-2 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                                  {variant.stock}
                                </td>
                                <td className="px-2.5 lg:px-3 py-2 text-right font-semibold text-slate-700 whitespace-nowrap">
                                  {variant.retailPrice !== undefined ? formatAmount(variant.retailPrice) : '—'}
                                </td>
                                <td className="px-2.5 lg:px-3 py-2 text-center whitespace-nowrap">
                                  <span
                                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      variant.stock <= 0
                                        ? 'bg-rose-50 text-rose-700'
                                        : 'bg-emerald-50 text-emerald-700'
                                    }`}
                                  >
                                    {variant.stock <= 0 ? 'OUT' : 'OK'}
                                  </span>
                                </td>
                                <td className="px-2.5 lg:px-3 py-2 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => openBarcode(product, variant.sku)}
                                    className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                                    title="Barcode for variant"
                                  >
                                    <Barcode className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="relative p-4 sm:p-5 lg:p-6">
            {(activeActionMenuId || locationPopoverProductId) && (
              <div
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => {
                  setActiveActionMenuId(null);
                  setLocationPopoverProductId(null);
                }}
              />
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filteredProducts.map(product => {
                const isSelected = selectedProductIds.includes(product.id);
                const status =
                  product.stock <= 0
                    ? 'out'
                    : product.stock <= product.reorderPoint
                      ? 'low'
                      : 'healthy';
                const productLocations = getProductLocations(product);
                const locStock = getProductLocationStock(product);

                return (
                  <article
                    key={product.id}
                    id={`card-${product.id}`}
                    className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/20 shadow-md ring-2 ring-indigo-500/30'
                        : 'border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Media / Thumbnail Header */}
                    <div
                      className="relative aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-t-2xl bg-slate-100"
                      onClick={() => {
                        setDetailProduct(product);
                        setIsDetailModalOpen(true);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetailProduct(product);
                          setIsDetailModalOpen(true);
                        }
                      }}
                      aria-label={`View details for ${product.name}`}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                          <Package className="h-10 w-10 transition-transform duration-300 group-hover:scale-110" />
                        </div>
                      )}

                      {/* Subtle dark gradient overlay on hover */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                      {/* Floating Quick View hint on hover */}
                      <div className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 translate-y-1 transform inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-md backdrop-blur-xs opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                        <Eye className="h-3 w-3 text-indigo-600" />
                        <span>Quick View</span>
                      </div>

                      {/* Checkbox overlay top-left */}
                      <div
                        className="absolute left-2.5 top-2.5 z-10"
                        onClick={e => e.stopPropagation()}
                      >
                        <label className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-white/70 bg-white/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-white">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(product.id)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>
                      </div>

                      {/* Status Badge top-right */}
                      <div className="absolute right-2.5 top-2.5 z-10">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-xs backdrop-blur-sm ${
                            status === 'out'
                              ? 'border-rose-200 bg-rose-50/95 text-rose-700'
                              : status === 'low'
                                ? 'border-amber-200 bg-amber-50/95 text-amber-700'
                                : 'border-emerald-200 bg-emerald-50/95 text-emerald-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              status === 'out'
                                ? 'bg-rose-500 animate-pulse'
                                : status === 'low'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`}
                          />
                          <span>{status === 'out' ? 'OUT' : status === 'low' ? 'LOW' : 'IN STOCK'}</span>
                        </span>
                      </div>

                      {/* Variants indicator bottom-left if any */}
                      {product.variants && product.variants.length > 0 && (
                        <div className="absolute bottom-2 left-2.5 z-10">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs backdrop-blur-xs">
                            <Layers className="h-2.5 w-2.5" />
                            <span>{product.variants.length} Var</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="flex flex-1 flex-col justify-between gap-3 p-3.5 sm:p-4">
                      <div>
                        {/* Category & SKU */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            {product.category}
                          </span>
                          <span className="shrink-0 rounded-md border border-slate-200/60 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                            {product.sku}
                          </span>
                        </div>

                        {/* Product Title */}
                        <button
                          type="button"
                          onClick={() => {
                            setDetailProduct(product);
                            setIsDetailModalOpen(true);
                          }}
                          className="mt-1 block min-h-[2.5rem] w-full text-left font-bold text-sm leading-snug text-slate-900 line-clamp-2 hover:text-indigo-600 transition-colors"
                          title={product.name}
                        >
                          {product.name}
                        </button>

                        {/* Location(s) Display with Popover */}
                        <div className="mt-1.5 relative">
                          {productLocations.length <= 1 ? (
                            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 truncate">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{productLocations[0] || 'Store Shelf'}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200/50 bg-indigo-50/80 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 truncate max-w-[130px]">
                                <MapPin className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
                                <span className="truncate">{productLocations[0]}</span>
                                {locStock[0] && <span className="font-mono font-bold text-indigo-950">({locStock[0].stock})</span>}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocationPopoverProductId(locationPopoverProductId === product.id ? null : product.id);
                                }}
                                className="inline-flex shrink-0 items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-200"
                                title={`Stored across ${productLocations.length} locations. Click to view.`}
                              >
                                +{productLocations.length - 1}
                              </button>

                              {locationPopoverProductId === product.id && (
                                <div className="absolute left-0 top-full z-40 mt-1 min-w-[200px] rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl ring-1 ring-black/5 animate-in fade-in duration-100">
                                  <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <MapPin className="h-3 w-3 text-indigo-600" />
                                    Storage Locations
                                  </div>
                                  <div className="space-y-1">
                                    {locStock.map(ls => (
                                      <div key={ls.location} className="flex items-center justify-between text-xs py-0.5">
                                        <span className="font-medium text-slate-700">{ls.location}</span>
                                        <span className="font-mono font-bold text-indigo-600">{ls.stock}</span>
                                      </div>
                                    ))}
                                    <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1 text-xs font-bold text-slate-900">
                                      <span>Total</span>
                                      <span className="font-mono">{product.stock} units</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        {/* Stock & Pricing Metric Box with Stock Progress Bar */}
                        <div className="rounded-xl border border-slate-100/90 bg-slate-50/90 p-2.5 space-y-2">
                          <div className="flex items-end justify-between gap-2">
                            <div>
                              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Stock on Hand</div>
                              <div className="mt-0.5 flex items-baseline gap-1">
                                <span className={`font-mono text-lg font-bold ${
                                  status === 'out' ? 'text-rose-600' : status === 'low' ? 'text-amber-600' : 'text-slate-900'
                                }`}>
                                  {product.stock.toLocaleString()}
                                </span>
                                <span className="text-[11px] font-medium text-slate-400">/ {product.reorderPoint}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Retail Price</div>
                              <div className="mt-0.5 font-mono text-base font-bold text-slate-900">
                                {formatAmount(product.price)}
                              </div>
                            </div>
                          </div>

                          {/* Stock Level Health Bar */}
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                status === 'out'
                                  ? 'bg-rose-500 w-full'
                                  : status === 'low'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                              }`}
                              style={{
                                width: status === 'out'
                                  ? '100%'
                                  : `${Math.min(100, Math.max(8, (product.stock / Math.max(1, product.reorderPoint * 2)) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Actions Bar */}
                        <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
                          {canAdjust ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setReasonDialog({ product, quantity: 10 })}
                              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-indigo-50 px-2.5 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
                              title="Quick Restock +10"
                            >
                              <span>+10 Restock</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDetailProduct(product);
                                setIsDetailModalOpen(true);
                              }}
                              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-100 px-2.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" />
                              <span>Details</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openBarcode(product)}
                            className="rounded-xl bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-800"
                            title="Barcode Studio"
                            aria-label="Barcode Studio"
                          >
                            <Barcode className="h-4 w-4" />
                          </button>

                          {/* Three Dot Action Dropdown Menu */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionMenuId(activeActionMenuId === product.id ? null : product.id);
                              }}
                              className="rounded-xl bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-800"
                              title="Actions"
                              aria-label="Actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {activeActionMenuId === product.id && (
                              <div className="absolute right-0 bottom-full z-40 mb-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-black/5 animate-in fade-in duration-100 text-left">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setDetailProduct(product);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 text-left"
                                >
                                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                                  <span>View Details</span>
                                </button>

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      openEdit(product);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 text-left"
                                  >
                                    <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                                    <span>Edit Product</span>
                                  </button>
                                )}

                                {canTransfer && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setTransferDialog(product);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 text-left"
                                  >
                                    <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-600" />
                                    <span>Transfer Stock</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    openBarcode(product);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 text-left"
                                >
                                  <Barcode className="h-3.5 w-3.5 text-slate-500" />
                                  <span>Barcode Studio</span>
                                </button>

                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setDeleteDialog([product.id]);
                                    }}
                                    className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 pt-1.5 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 text-left"
                                  >
                                    <Trash className="h-3.5 w-3.5 text-rose-500" />
                                    <span>Delete Product</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <ProductDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        product={detailProduct}
        onEditProduct={product => {
          setIsDetailModalOpen(false);
          openEdit(product);
        }}
        onOpenBarcodeModal={(product, sku) => {
          setIsDetailModalOpen(false);
          openBarcode(product, sku);
        }}
        onQuickReorder={(productId, amount) => {
          const product = products.find(item => item.id === productId);
          if (product && canAdjust) setReasonDialog({ product, quantity: amount });
        }}
        canEdit={canEdit}
      />

      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialProduct={editingProduct}
        existingCategories={categoryOptions}
        availableProducts={products}
        onSave={async product => {
          const ok = await runMutation(async () => {
            if (editingProduct) {
              if (inventoryService?.updateProduct) return inventoryService.updateProduct(product);
              await onUpdateProduct(product);
            } else {
              if (inventoryService?.createProduct) return inventoryService.createProduct(product);
              await onAddProduct(product);
            }
            return { success: true };
          });

          if (ok) {
            setIsFormModalOpen(false);
            setEditingProduct(null);
            setSuccess(editingProduct ? 'Product updated.' : 'Product created.');
          }
        }}
      />

      <BarcodeGeneratorModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        products={products}
        initialProduct={barcodeModalProduct}
        initialSku={barcodeModalSku}
      />

      <AIProductPhotoScannerModal
        isOpen={isAiPhotoModalOpen}
        onClose={() => setIsAiPhotoModalOpen(false)}
        products={products}
        onApplyToForm={(extracted, imgUrl, allImages) => {
          if (!canCreate) {
            setError('You do not have permission to create products.');
            return;
          }
          const product = mapExtractedDataToProduct(extracted, imgUrl, allImages);
          setEditingProduct(product);
          setIsAiPhotoModalOpen(false);
          setIsFormModalOpen(true);
        }}
        onDirectSaveProduct={async product => {
          if (!canCreate) {
            setError('You do not have permission to create products.');
            return;
          }

          const ok = await runMutation(async () => {
            if (inventoryService?.createProduct) return inventoryService.createProduct(product);
            await onAddProduct(product);
            return { success: true };
          });

          if (ok) {
            setIsAiPhotoModalOpen(false);
            setSuccess(`"${product.name}" is ready in the catalog.`);
          }
        }}
        onMergeProduct={async product => {
          const ok = await runMutation(async () => {
            if (inventoryService?.updateProduct) return inventoryService.updateProduct(product);
            await onUpdateProduct(product);
            return { success: true };
          });

          if (ok) {
            setIsAiPhotoModalOpen(false);
            setSuccess(`"${product.name}" merged successfully.`);
          }
        }}
      />

      <CategoryHierarchyManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categoriesList}
        onSaveCategory={onSaveCategory ?? (async () => undefined)}
        onDeleteCategory={onDeleteCategory ?? (async () => undefined)}
      />

      <ReasonDialog
        open={!!reasonDialog}
        title="Inventory adjustment"
        quantity={reasonDialog?.quantity ?? 0}
        onCancel={() => setReasonDialog(null)}
        onSubmit={async (reason, reference) => {
          if (!reasonDialog) return;
          const item = reasonDialog;
          setReasonDialog(null);
          await handleAdjust(item.product, item.quantity, reason, reference);
        }}
      />

      <TransferDialog
        open={!!transferDialog}
        product={transferDialog}
        locations={effectiveLocations}
        onCancel={() => setTransferDialog(null)}
        onSubmit={async (fromLocationId, toLocationId, quantity, reason, reference) => {
          if (!transferDialog) return;
          const product = transferDialog;
          setTransferDialog(null);
          await handleTransfer(product, fromLocationId, toLocationId, quantity, reason, reference);
        }}
      />

      <ConfirmDialog
        open={!!deleteDialog}
        title="Delete inventory item?"
        message={`This will remove ${deleteDialog?.length ?? 0} catalog item(s). Historical inventory transactions should remain immutable in the backend.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteDialog(null)}
        onConfirm={confirmDelete}
      />

      {busy && (
        <div className="fixed bottom-5 right-5 z-[90] rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xl">
          Processing inventory operation...
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex items-center justify-between rounded-2xl border p-4 text-left shadow-sm ${
        active ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'
      } ${onClick ? 'cursor-pointer hover:border-indigo-300' : 'cursor-default'}`}
    >
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
        <div className="mt-1 font-mono text-xl font-bold text-slate-900">{value}</div>
        {subtitle && <div className="mt-0.5 text-[10px] text-slate-500">{subtitle}</div>}
      </div>
      {icon && <div className="rounded-xl bg-slate-100 p-3 text-indigo-600">{icon}</div>}
    </button>
  );
}
