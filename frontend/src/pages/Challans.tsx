import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  FileCheck,
  Calendar,
  IndianRupee,
  ShoppingBag,
  Loader,
} from 'lucide-react';
import { SalesChallan, Customer, Product, Pagination } from '../types';

interface OrderItemInput {
  productId: string;
  quantity: number;
}

const Challans: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canWrite = hasRole(['ADMIN', 'SALES']);

  const [challans, setChallans] = useState<SalesChallan[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Creation Workspace Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([{ productId: '', quantity: 1 }]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchChallans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/challans', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      if (res.data.success) {
        setChallans(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      console.error('Failed to fetch challans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallans();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchChallans();
  };

  // Fetch dropdown lists when workspace is opened
  const openCreateWorkspace = async () => {
    setCreateModalOpen(true);
    setSelectedCustomerId('');
    setOrderItems([{ productId: '', quantity: 1 }]);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const [custRes, prodRes] = await Promise.all([
        api.get('/api/customers', { params: { limit: 100 } }),
        api.get('/api/products', { params: { limit: 100 } }),
      ]);
      if (custRes.data.success) setCustomers(custRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data);
    } catch (err) {
      console.error('Failed to load lists for challan checkout:', err);
    }
  };

  // Add a product item row in checkout
  const addOrderItemRow = () => {
    setOrderItems([...orderItems, { productId: '', quantity: 1 }]);
  };

  // Remove a product item row in checkout
  const removeOrderItemRow = (index: number) => {
    if (orderItems.length === 1) return; // Must have at least 1 item
    const updated = orderItems.filter((_, i) => i !== index);
    setOrderItems(updated);
  };

  // Handle item change
  const handleItemFieldChange = (index: number, field: keyof OrderItemInput, value: string | number) => {
    const updated = [...orderItems];
    if (field === 'productId') {
      updated[index].productId = value as string;
      // Reset quantity or set defaults
    } else if (field === 'quantity') {
      updated[index].quantity = Math.max(Number(value), 1);
    }
    setOrderItems(updated);
  };

  // Compute live cumulative summaries
  const calculateTotalOrderValues = () => {
    let itemsCount = 0;
    let grandTotal = 0;

    orderItems.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        itemsCount += item.quantity;
        grandTotal += prod.unitPrice * item.quantity;
      }
    });

    return { itemsCount, grandTotal };
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedCustomerId) {
      setErrorMsg('Please select a customer for billing.');
      return;
    }

    // Verify all items are selected
    const incomplete = orderItems.some((i) => !i.productId || i.quantity <= 0);
    if (incomplete) {
      setErrorMsg('Please specify products and valid quantities for all items.');
      return;
    }

    // Check duplicate products in rows
    const selectedProductIds = orderItems.map(o => o.productId);
    const duplicates = selectedProductIds.filter((item, index) => selectedProductIds.indexOf(item) !== index);
    if (duplicates.length > 0) {
      setErrorMsg('Duplicate products selected. Please adjust the quantities in a single row instead.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/api/challans', {
        customerId: selectedCustomerId,
        items: orderItems,
      });

      if (res.data.success) {
        setSuccessMsg(`Draft challan created successfully: ${res.data.data.challanNumber}`);
        fetchChallans();
        setTimeout(() => {
          setCreateModalOpen(false);
          // Navigate to newly created draft details
          navigate(`/challans/${res.data.data.id}`);
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to submit sales challan draft.');
    } finally {
      setSubmitting(false);
    }
  };

  const { itemsCount, grandTotal } = calculateTotalOrderValues();

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 uppercase tracking-wide flex items-center gap-2">
            Sales Challan Registry
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Generate delivery challenges, verify stock levels inside atomic transaction pipelines, and manage invoice status.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={openCreateWorkspace}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white shadow-md shadow-indigo-600/10 transition-colors active:scale-[0.98]"
          >
            <Plus className="h-4.5 w-4.5" />
            Create Sales Challan
          </button>
        )}
      </div>

      {/* Filter panel */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-2xl">
          {/* Text Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search challan # (e.g. CH-2026-)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-700 bg-slate-950/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-700 bg-slate-950/80 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Drafts (Stock reserved check not run)</option>
              <option value="CONFIRMED">Confirmed (Stock decremented)</option>
              <option value="CANCELLED">Cancelled (Stock restored if confirmed)</option>
            </select>
          </div>
        </form>
      </div>

      {/* Table list */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Challan Number</th>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Business Company</th>
                <th className="px-6 py-4">Total Qty</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 font-mono">Date Billed</th>
                <th className="px-6 py-4">Created By</th>
                <th className="px-6 py-4 text-right">Invoice View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                [...Array(5)].map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={8} className="px-6 py-4.5 h-16 bg-slate-900/10"></td>
                  </tr>
                ))
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    No sales challans recorded matching current criteria.
                  </td>
                </tr>
              ) : (
                challans.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                    {/* Challan # */}
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-indigo-400">
                      <Link to={`/challans/${c.id}`} className="hover:underline">
                        {c.challanNumber}
                      </Link>
                    </td>

                    {/* Customer */}
                    <td className="px-6 py-4 whitespace-nowrap text-slate-200 font-semibold">
                      {c.customer?.customerName || 'Deleted Customer'}
                    </td>

                    {/* Business */}
                    <td className="px-6 py-4 whitespace-nowrap text-slate-350 max-w-[150px] truncate">
                      {c.customer?.businessName}
                    </td>

                    {/* Qty */}
                    <td className="px-6 py-4 whitespace-nowrap text-slate-300 font-medium">
                      {c.totalQuantity} items
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase border ${
                        c.status === 'CONFIRMED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : c.status === 'CANCELLED'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}>
                        {c.status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-655" />
                        {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Agent */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-350 font-medium">
                      {c.creator?.name || 'Agent'}
                    </td>

                    {/* View Button */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <Link
                        to={`/challans/${c.id}`}
                        className="text-slate-300 hover:text-indigo-400 px-2.5 py-1.5 border border-slate-800 rounded bg-slate-850 hover:bg-indigo-600/10 transition-all font-semibold"
                      >
                        Open Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-900/20 border-t border-slate-850 flex items-center justify-between text-sm text-slate-400">
            <div>
              Showing page <span className="text-slate-200 font-semibold">{page}</span> of{' '}
              <span className="text-slate-200 font-semibold">{pagination.totalPages}</span> (
              <span className="text-slate-200 font-semibold">{pagination.total}</span> total challans)
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

      {/* Creation Workspace Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-base tracking-wide text-slate-100 uppercase">
                Create Sales Challan Workspace
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCheckoutSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col lg:flex-row gap-6">
              {/* Left Side: Order Rows configuration */}
              <div className="flex-1 space-y-4">
                {errorMsg && (
                  <div className="p-3.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                    {errorMsg}
                  </div>
                )}

                {/* Customer Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Select Customer for Billing *
                  </label>
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full mt-2 px-3 py-2.5 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm cursor-pointer"
                  >
                    <option value="">-- Click to choose customer business --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customerName} ({c.businessName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Products Grid rows */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Product Items & Quantities *
                    </label>
                    <button
                      type="button"
                      onClick={addOrderItemRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-650/20 rounded border border-indigo-500/20 text-xs font-bold text-indigo-400 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Item Row
                    </button>
                  </div>

                  {/* Rows List */}
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {orderItems.map((item, idx) => {
                      const prod = products.find((p) => p.id === item.productId);
                      const unitP = prod ? prod.unitPrice : 0;
                      const sub = unitP * item.quantity;
                      return (
                        <div key={idx} className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl flex flex-wrap items-center gap-3">
                          {/* Selector */}
                          <div className="flex-1 min-w-[200px]">
                            <select
                              required
                              value={item.productId}
                              onChange={(e) => handleItemFieldChange(idx, 'productId', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-700 bg-slate-900 rounded-md text-slate-200 text-xs focus:outline-none cursor-pointer"
                            >
                              <option value="">-- Choose Product --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.sku} &bull; {p.productName} (₹{p.unitPrice}) [Stock: {p.currentStock}]
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Qty */}
                          <div className="w-20">
                            <input
                              type="number"
                              required
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-700 bg-slate-900 rounded-md text-slate-200 text-xs text-center font-mono focus:outline-none"
                            />
                          </div>

                          {/* Subtotal preview */}
                          <div className="w-24 text-right pr-2 text-xs font-mono text-slate-300">
                            ₹{sub.toFixed(2)}
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeOrderItemRow(idx)}
                            disabled={orderItems.length === 1}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Side: Live order summary checkout */}
              <div className="w-full lg:w-80 bg-slate-950/60 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between h-fit">
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <ShoppingBag className="h-4 w-4" />
                    Challan Summary
                  </h4>

                  {/* Summary values */}
                  <div className="space-y-2.5 text-sm text-slate-400">
                    <div className="flex justify-between">
                      <span>Total quantity:</span>
                      <span className="font-semibold text-slate-200 font-mono">{itemsCount} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Product snap price:</span>
                      <span className="font-semibold text-slate-200">Historical snapshots</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/80 pt-3 text-base font-bold text-slate-100">
                      <span>Grand Total:</span>
                      <span className="font-mono text-indigo-400 flex items-center">
                        <IndianRupee className="h-4 w-4 shrink-0" />
                        {grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {/* Action button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Generating draft...' : 'Create Challan Draft'}
                  </button>
                  <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                    ⚠️ Creating the challan saves it in DRAFT mode. Billed stock is NOT reserved or deducted until the draft is explicitly CONFIRMED.
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Challans;
