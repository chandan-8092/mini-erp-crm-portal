import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  Plus,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Warehouse,
  History,
  X,
  FileCheck,
  ArrowUpDown,
  Loader,
} from 'lucide-react';
import { Product, StockMovement, Pagination } from '../types';

const Products: React.FC = () => {
  const { hasRole } = useAuth();
  const canModify = hasRole(['ADMIN', 'WAREHOUSE']);

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals States
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form Fields - Product CRUD
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minimumStock, setMinimumStock] = useState<number>(0);
  const [warehouseLocation, setWarehouseLocation] = useState('');

  // Form Fields - Stock Adjustments
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [adjustReason, setAdjustReason] = useState('');

  // History Log States
  const [movementHistory, setMovementHistory] = useState<StockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Message Alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/products', {
        params: {
          page,
          limit: 10,
          search,
          category: category || undefined,
          lowStock: lowStockFilter ? 'true' : undefined,
        },
      });
      if (res.data.success) {
        setProducts(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, category, lowStockFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  // Product CRUD Modal Helpers
  const openAddProductModal = () => {
    setEditingId(null);
    setProductName('');
    setSku('');
    setProdCategory('');
    setUnitPrice(0);
    setCurrentStock(0);
    setMinimumStock(0);
    setWarehouseLocation('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setProductModalOpen(true);
  };

  const openEditProductModal = (p: Product) => {
    setEditingId(p.id);
    setProductName(p.productName);
    setSku(p.sku);
    setProdCategory(p.category);
    setUnitPrice(p.unitPrice);
    setCurrentStock(p.currentStock);
    setMinimumStock(p.minimumStock);
    setWarehouseLocation(p.warehouseLocation);
    setErrorMsg(null);
    setSuccessMsg(null);
    setProductModalOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!productName || !sku || !prodCategory || unitPrice <= 0 || minimumStock < 0 || !warehouseLocation) {
      setErrorMsg('Please enter valid product specifications.');
      return;
    }

    const payload: any = {
      productName,
      sku,
      category: prodCategory,
      unitPrice: Number(unitPrice),
      minimumStock: Number(minimumStock),
      warehouseLocation,
    };

    if (!editingId) {
      payload.currentStock = Number(currentStock);
    }

    try {
      if (editingId) {
        const res = await api.put(`/api/products/${editingId}`, payload);
        if (res.data.success) {
          setSuccessMsg('Product details updated successfully!');
          fetchProducts();
          setTimeout(() => setProductModalOpen(false), 800);
        }
      } else {
        const res = await api.post('/api/products', payload);
        if (res.data.success) {
          setSuccessMsg('Product registered successfully!');
          fetchProducts();
          setTimeout(() => setProductModalOpen(false), 800);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Error occurred while saving product details.');
    }
  };

  // Stock Adjustment Modal Helpers
  const openAdjustModal = (p: Product) => {
    setSelectedProduct(p);
    setAdjustQty(0);
    setAdjustType('IN');
    setAdjustReason('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedProduct) return;
    if (adjustQty <= 0) {
      setErrorMsg('Adjustment quantity must be greater than zero.');
      return;
    }
    if (adjustReason.trim().length < 5) {
      setErrorMsg('A valid reason description of at least 5 characters is required.');
      return;
    }

    try {
      const res = await api.post(`/api/products/${selectedProduct.id}/stock-movements`, {
        quantityChanged: Number(adjustQty),
        movementType: adjustType,
        reason: adjustReason,
      });

      if (res.data.success) {
        setSuccessMsg('Stock adjusted successfully!');
        fetchProducts();
        setTimeout(() => setAdjustModalOpen(false), 800);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to adjust product inventory.');
    }
  };

  // Stock Movement History Modal Helpers
  const openHistoryModal = async (p: Product) => {
    setSelectedProduct(p);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/api/products/${p.id}/stock-movements`, {
        params: { page: 1, limit: 30 },
      });
      if (res.data.success) {
        setMovementHistory(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 uppercase tracking-wide">
            Products & Inventory Stock
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Maintain catalogs, set safety thresholds, monitor stock locations, and record physical corrections.
          </p>
        </div>
        {canModify && (
          <button
            onClick={openAddProductModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white shadow-md shadow-indigo-600/10 transition-colors active:scale-[0.98]"
          >
            <Plus className="h-4.5 w-4.5" />
            Add Catalog Product
          </button>
        )}
      </div>

      {/* Filters options Panel */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-3xl">
          {/* Text Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by SKU or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-700 bg-slate-950/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
          </div>

          {/* Category Filter */}
          <div>
            <input
              type="text"
              placeholder="Filter by Category..."
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-700 bg-slate-950/80 rounded-lg text-slate-100 placeholder-slate-550 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Low Stock Toggle Checkbox */}
          <div className="flex items-center pl-1 h-9">
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-350 hover:text-slate-200">
              <input
                type="checkbox"
                checked={lowStockFilter}
                onChange={(e) => {
                  setLowStockFilter(e.target.checked);
                  setPage(1);
                }}
                className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Low Stock Warnings Only
              </span>
            </label>
          </div>
        </form>
      </div>

      {/* Products list Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">SKU / Code</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Unit Price</th>
                <th className="px-6 py-4">Current Stock</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                [...Array(5)].map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={8} className="px-6 py-4.5 h-16 bg-slate-900/10"></td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    No products cataloged matching current filters.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.currentStock <= p.minimumStock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                      {/* SKU */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-350">
                        {p.sku}
                      </td>

                      {/* Name */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-200 font-semibold">
                        {p.productName}
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs font-medium">
                        {p.category}
                      </td>

                      {/* Unit Price */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300 font-mono font-medium">
                        ₹{p.unitPrice.toFixed(2)}
                      </td>

                      {/* Current Stock */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300 font-semibold font-mono">
                        {p.currentStock} units
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Warehouse className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          {p.warehouseLocation}
                        </div>
                      </td>

                      {/* Status Warning Tag */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            SUFFICIENT
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-1.5">
                        {/* Adjust stock button */}
                        {canModify && (
                          <button
                            onClick={() => openAdjustModal(p)}
                            className="text-slate-300 hover:text-indigo-400 px-2 py-1.5 border border-slate-700 bg-slate-800 rounded hover:border-slate-500 transition-colors"
                            title="Adjust stock levels"
                          >
                            <ArrowUpDown className="h-3.5 w-3.5 inline mr-1" />
                            Adjust
                          </button>
                        )}

                        {/* Stock History log */}
                        <button
                          onClick={() => openHistoryModal(p)}
                          className="text-slate-300 hover:text-indigo-400 p-1.5 border border-slate-800 rounded hover:bg-slate-850 hover:border-slate-650 transition-colors"
                          title="Movement History"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>

                        {/* Edit details */}
                        {canModify && (
                          <button
                            onClick={() => openEditProductModal(p)}
                            className="text-slate-350 hover:text-indigo-400 p-1.5 border border-slate-800 rounded hover:bg-slate-850 hover:border-slate-650 transition-colors"
                            title="Edit details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-900/20 border-t border-slate-850 flex items-center justify-between text-sm text-slate-400">
            <div>
              Showing page <span className="text-slate-200 font-semibold">{page}</span> of{' '}
              <span className="text-slate-200 font-semibold">{pagination.totalPages}</span> (
              <span className="text-slate-200 font-semibold">{pagination.total}</span> total products)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-1.5 border border-slate-700 bg-slate-800 rounded-lg hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                disabled={page === pagination.totalPages}
                className="p-1.5 border border-slate-700 bg-slate-800 rounded-lg hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-base tracking-wide text-slate-100 uppercase">
                {editingId ? 'Edit Product Catalog Details' : 'Register New Product'}
              </h3>
              <button onClick={() => setProductModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4" />
                  {successMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Ergonomic Standing Desk"
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>

                {/* SKU */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    SKU (Unique code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="e.g. FUR-DK-101"
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    placeholder="e.g. Furniture"
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Unit Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0.01}
                    step={0.01}
                    value={unitPrice || ''}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    placeholder="12000.00"
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
                  />
                </div>

                {/* Warehouse Location */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Warehouse Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={warehouseLocation}
                    onChange={(e) => setWarehouseLocation(e.target.value)}
                    placeholder="e.g. Ais-2-Row-4"
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>

                {/* Initial Stock (Only on creation) */}
                {!editingId && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Initial Physical Stock *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={currentStock || ''}
                      onChange={(e) => setCurrentStock(Number(e.target.value))}
                      placeholder="100"
                      className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
                    />
                  </div>
                )}

                {/* Min stock */}
                <div className={editingId ? 'col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Safety stock (Min Alert Limit) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={minimumStock || ''}
                    onChange={(e) => setMinimumStock(Number(e.target.value))}
                    placeholder="15"
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-sm text-slate-350 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white transition-colors"
                >
                  {editingId ? 'Update details' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Inventory Stock levels Modal */}
      {adjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-base tracking-wide text-slate-100 uppercase">
                Stock Correction: {selectedProduct.sku}
              </h3>
              <button onClick={() => setAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  {successMsg}
                </div>
              )}

              <div>
                <p className="text-xs text-slate-400 font-medium">
                  Product Name: <span className="text-slate-200 font-semibold">{selectedProduct.productName}</span>
                </p>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Current System Inventory: <span className="text-slate-200 font-semibold">{selectedProduct.currentStock} units</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Movement Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-405 uppercase tracking-wide">
                    Movement Type *
                  </label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as 'IN' | 'OUT')}
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm cursor-pointer"
                  >
                    <option value="IN">Stock IN (+ Adding)</option>
                    <option value="OUT">Stock OUT (- Reducing)</option>
                  </select>
                </div>

                {/* Adjust Quantity */}
                <div>
                  <label className="block text-xs font-bold text-slate-405 uppercase tracking-wide">
                    QuantityChanged *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={adjustQty || ''}
                    onChange={(e) => setAdjustQty(Number(e.target.value))}
                    placeholder="e.g. 10"
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-405 uppercase tracking-wide">
                  Adjustment Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Manual audit reconciliation / Damaged stock discard / Excess receipt"
                  className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-sm text-slate-350 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white transition-colors"
                >
                  Post Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock History Submodal */}
      {historyModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-base tracking-wide text-slate-100 uppercase">
                Stock Movements: {selectedProduct.sku}
              </h3>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-900/20">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-slate-200">{selectedProduct.productName}</h4>
                <p className="text-xs text-slate-450 mt-0.5">Warehouse Location: {selectedProduct.warehouseLocation}</p>
              </div>

              {historyLoading ? (
                <div className="flex h-48 items-center justify-center text-slate-500">
                  <Loader className="h-6 w-6 animate-spin mr-2 text-indigo-400" />
                  Loading logs...
                </div>
              ) : movementHistory.length === 0 ? (
                <p className="text-sm text-slate-500 italic py-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
                  No stock movements recorded for this product catalog.
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase">
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Adjustment</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3">Logged By</th>
                        <th className="px-4 py-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                      {movementHistory.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-800/10">
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              m.movementType === 'IN'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {m.movementType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-350 font-bold font-mono">
                            {m.quantityChanged} units
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-xs leading-relaxed max-w-[200px] truncate" title={m.reason}>
                            {m.reason}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs font-medium">
                            {m.creator?.name || 'Agent'}
                          </td>
                          <td className="px-4 py-3 text-slate-450 text-xs font-mono">
                            {new Date(m.createdAt).toLocaleDateString()} &nbsp;
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
