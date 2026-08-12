import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  Calendar,
  User,
  ShoppingBag,
  AlertTriangle,
  CheckCircle,
  FileX,
  Printer,
  FileText,
  IndianRupee,
  ShieldAlert,
  Loader,
  MapPin,
  FileCheck,

} from 'lucide-react';
import { SalesChallan, ChallanStatus } from '../types';

const ChallanDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canModify = hasRole(['ADMIN', 'SALES']);

  const [challan, setChallan] = useState<SalesChallan | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Operation States
  const [processing, setProcessing] = useState(false);
  const [opError, setOpError] = useState<{ message: string; details?: any } | null>(null);
  const [opSuccess, setOpSuccess] = useState<string | null>(null);

  const fetchChallanDetails = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.get(`/api/challans/${id}`);
      if (res.data.success) {
        setChallan(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load challan:', err);
      setErrorMsg(err.response?.data?.message || 'Error fetching challan details from api.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallanDetails();
  }, [id]);

  const handleConfirm = async () => {
    if (!challan) return;
    const confirmPrompt = window.confirm(
      `Confirm Sales Challan ${challan.challanNumber}? This will deduct product stock levels and record OUT movements.`
    );
    if (!confirmPrompt) return;

    setProcessing(true);
    setOpError(null);
    setOpSuccess(null);

    try {
      const res = await api.post(`/api/challans/${challan.id}/confirm`);
      if (res.data.success) {
        setOpSuccess('Sales challan confirmed successfully! Inventory updated.');
        // Reload details to show updated status and stock movements
        fetchChallanDetails();
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to confirm challan.';
      const details = err.response?.data?.error || null;
      setOpError({ message: msg, details });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!challan) return;
    const confirmPrompt = window.confirm(
      challan.status === 'CONFIRMED'
        ? `WARNING: This challan is already CONFIRMED. Cancelling it will RESTORE all items back into warehouse inventory stock. Proceed?`
        : `Cancel Sales Challan ${challan.challanNumber}?`
    );
    if (!confirmPrompt) return;

    setProcessing(true);
    setOpError(null);
    setOpSuccess(null);

    try {
      const res = await api.post(`/api/challans/${challan.id}/cancel`);
      if (res.data.success) {
        setOpSuccess(res.data.message || 'Sales challan cancelled.');
        fetchChallanDetails();
      }
    } catch (err: any) {
      console.error(err);
      setOpError({ message: err.response?.data?.message || 'Failed to cancel challan.' });
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader className="h-8 w-8 animate-spin text-indigo-500" />
          <span>Retrieving sales challan details...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !challan) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-slate-200">Sales challan not found</h3>
        <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">{errorMsg || 'The requested challan does not exist.'}</p>
        <button
          onClick={() => navigate('/challans')}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-sm font-semibold rounded-lg text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to challans list
        </button>
      </div>
    );
  }

  // Calculate totals
  const subtotalSum = challan.items?.reduce((sum, item) => sum + item.subtotal, 0) || 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button and Print options (hidden on print) */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <button
          onClick={() => navigate('/challans')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Challans list
        </button>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-700 hover:border-slate-500 bg-slate-850 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-200 transition-colors"
        >
          <Printer className="h-3.5 w-3.5" />
          Print Challan
        </button>
      </div>

      {/* Operation Status alerts (hidden on print) */}
      <div className="print:hidden">
        {opSuccess && (
          <div className="p-4 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2.5">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>{opSuccess}</span>
          </div>
        )}

        {opError && (
          <div className="p-4 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm space-y-2">
            <div className="flex items-start gap-2.5 font-semibold">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{opError.message}</span>
            </div>
            {opError.details && (
              <div className="pl-7 text-xs space-y-1 text-rose-300 font-mono">
                <p>Product Code: <span className="text-white font-bold">{opError.details.product}</span></p>
                <p>Warehouse Available: <span className="text-white font-bold">{opError.details.available} units</span></p>
                <p>Order Requested: <span className="text-rose-400 font-bold">{opError.details.requested} units</span></p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Challan Invoice Layout */}
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-8 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Bill Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800/80 pb-6 print:border-black/20">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 print:text-indigo-600">
              <FileText className="h-8 w-8" />
              <span className="text-2xl font-black tracking-wide uppercase">Mini ERP + CRM</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 print:text-black/60">
              Wholesale & Distribution Logistics Company Pvt Ltd
            </p>
          </div>

          <div className="text-right md:text-right print:text-black">
            <h2 className="text-xl font-bold font-mono tracking-wide text-slate-100 print:text-black">
              {challan.challanNumber}
            </h2>
            <div className="mt-1 flex flex-wrap items-center justify-end gap-2 text-xs">
              {/* Status Tag */}
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${
                challan.status === 'CONFIRMED'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 print:bg-emerald-100 print:text-emerald-800 print:border-emerald-200'
                  : challan.status === 'CANCELLED'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 print:bg-rose-100 print:text-rose-800 print:border-rose-200'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20 print:bg-purple-100 print:text-purple-800 print:border-purple-200'
              }`}>
                {challan.status}
              </span>
            </div>
          </div>
        </div>

        {/* Client & Billing Info metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          {/* Client Delivery details */}
          <div className="md:col-span-2 space-y-2">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wide print:text-indigo-600">Billed & Shipped To</h4>
            {challan.customer && (
              <div className="space-y-1">
                <p className="font-bold text-slate-200 text-base print:text-black">{challan.customer.customerName}</p>
                <p className="font-medium text-slate-350 print:text-black/80">{challan.customer.businessName}</p>
                {challan.customer.gstNumber && (
                  <p className="text-xs font-mono text-slate-400 print:text-black/60">GSTIN: {challan.customer.gstNumber}</p>
                )}
                <div className="pt-2 text-slate-300 print:text-black/80 flex items-start gap-1">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-500 mt-0.5 print:hidden" />
                  <span className="leading-relaxed font-medium">{challan.customer.address}</span>
                </div>
              </div>
            )}
          </div>

          {/* Challan Info details */}
          <div className="space-y-2.5 border-t md:border-t-0 md:border-l border-slate-800/80 pt-4 md:pt-0 md:pl-6 print:border-black/10">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wide print:text-indigo-600">Document Meta</h4>
            <div className="space-y-2 text-xs text-slate-300 print:text-black/80">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500 shrink-0 print:hidden" />
                <span>Date Billed: <span className="font-semibold font-mono">{new Date(challan.createdAt).toLocaleDateString()}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500 shrink-0 print:hidden" />
                <span>Sales Agent: <span className="font-semibold">{challan.creator?.name}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-slate-500 shrink-0 print:hidden" />
                <span>Total Items: <span className="font-semibold font-mono">{challan.totalQuantity} items</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Listing Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden print:border-black/20">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm print:divide-black/20">
            <thead>
              <tr className="bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider print:bg-slate-100 print:text-black">
                <th className="px-6 py-3.5">SKU Code</th>
                <th className="px-6 py-3.5">Product Name Snapshot</th>
                <th className="px-6 py-3.5 text-right">Unit Price (Snap)</th>
                <th className="px-6 py-3.5 text-center">Billed Qty</th>
                <th className="px-6 py-3.5 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-black/10">
              {challan.items?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-850/10 text-slate-300 print:text-black">
                  <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-350 print:text-black">
                    {item.skuSnapshot}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">
                    {item.productNameSnapshot}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-mono">
                    ₹{item.unitPriceSnapshot.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center font-mono font-bold">
                    {item.quantity} units
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-slate-100 print:text-black">
                    ₹{item.subtotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals footer */}
            <tfoot>
              <tr className="bg-slate-950/20 text-slate-300 font-bold border-t border-slate-800 print:text-black print:border-black/20">
                <td colSpan={3} className="px-6 py-4 text-right">Total Summary:</td>
                <td className="px-6 py-4 text-center font-mono">{challan.totalQuantity} units</td>
                <td className="px-6 py-4 text-right font-mono text-indigo-400 print:text-black text-base flex items-center justify-end">
                  <IndianRupee className="h-4.5 w-4.5 inline shrink-0" />
                  {subtotalSum.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Dynamic actions block (hidden on print) */}
        {canModify && challan.status !== 'CANCELLED' && (
          <div className="flex flex-wrap items-center justify-end gap-3 pt-6 border-t border-slate-800/60 print:hidden">
            {processing && (
              <span className="text-xs text-slate-500 mr-2 flex items-center">
                <Loader className="h-4 w-4 animate-spin mr-1.5 text-indigo-500" />
                Executing transaction commands...
              </span>
            )}

            {/* DRAFT controls */}
            {challan.status === 'DRAFT' && (
              <>
                <button
                  onClick={handleCancel}
                  disabled={processing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-700 hover:bg-slate-800/50 rounded-lg text-sm text-rose-400 hover:border-rose-500/20 disabled:opacity-50 transition-colors"
                >
                  <FileX className="h-4.5 w-4.5" />
                  Cancel Draft
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={processing}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white shadow-md shadow-indigo-600/10 disabled:opacity-50 transition-colors"
                >
                  <FileCheck className="h-4.5 w-4.5" />
                  Confirm Challan
                </button>
              </>
            )}

            {/* CONFIRMED controls */}
            {challan.status === 'CONFIRMED' && (
              <button
                onClick={handleCancel}
                disabled={processing}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-rose-500/30 hover:bg-rose-950/20 rounded-lg text-sm text-rose-400 disabled:opacity-50 transition-colors"
              >
                <FileX className="h-4.5 w-4.5" />
                Cancel Billed Order (Restore Stock)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallanDetails;
