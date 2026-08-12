import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  Phone,
  Mail,
  Building,
  MapPin,
  Calendar,
  AlertTriangle,
  History,
  FileText,
  User,
  Plus,
  MessageSquare,
  BadgeAlert,
  Loader,
} from 'lucide-react';
import { Customer, FollowUp, SalesChallan } from '../types';

const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canWrite = hasRole(['ADMIN', 'SALES']);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'followups' | 'challans'>('followups');

  // Add Follow-up Note Form States
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState(false);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.get(`/api/customers/${id}`);
      if (res.data.success) {
        setCustomer(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load customer profile details:', err);
      setErrorMsg(err.response?.data?.message || 'Error fetching customer data from api.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
    // Default next follow-up date picker to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFollowUpDate(tomorrow.toISOString().split('T')[0]);
  }, [id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoteError(null);
    setNoteSuccess(false);

    if (!note.trim()) {
      setNoteError('Please enter a note description.');
      return;
    }
    if (!followUpDate) {
      setNoteError('Please schedule a next follow-up date.');
      return;
    }

    setSubmittingNote(true);
    try {
      const res = await api.post(`/api/customers/${id}/followups`, {
        note,
        followUpDate: new Date(followUpDate).toISOString(),
      });

      if (res.data.success) {
        setNoteSuccess(true);
        setNote('');
        // Refresh detail view (which loads updated notes timeline and rescheduled followUpDate)
        fetchCustomerDetails();
      }
    } catch (err: any) {
      console.error(err);
      setNoteError(err.response?.data?.message || 'Failed to submit follow-up note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader className="h-8 w-8 animate-spin text-indigo-500" />
          <span>Retrieving customer profile files...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !customer) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-slate-200">Customer profile not found</h3>
        <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">{errorMsg || 'The requested customer does not exist.'}</p>
        <button
          onClick={() => navigate('/customers')}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-sm font-semibold rounded-lg text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to CRM list
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/customers')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Customer List
        </button>
      </div>

      {/* Grid: Profile Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer General Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 lg:col-span-2 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-4 border-b border-slate-800/60 pb-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-100">{customer.customerName}</h2>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 uppercase border border-slate-700 bg-slate-850 rounded text-slate-300">
                  {customer.customerType}
                </span>
                <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase border ${
                  customer.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : customer.status === 'LEAD'
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {customer.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Business info */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Business Details</h4>
              <div className="flex items-center gap-2.5 text-slate-300">
                <Building className="h-4 w-4 text-slate-500 shrink-0" />
                <div>
                  <p className="font-semibold">{customer.businessName}</p>
                  <p className="text-xs text-slate-400">Company Name</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-slate-300">
                <BadgeAlert className="h-4 w-4 text-slate-500 shrink-0" />
                <div>
                  <p className="font-mono">{customer.gstNumber || 'No GST Registered'}</p>
                  <p className="text-xs text-slate-400">GST Registration #</p>
                </div>
              </div>
            </div>

            {/* Contact details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Contact Info</h4>
              <div className="flex items-center gap-2.5 text-slate-300">
                <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                <div>
                  <p className="font-semibold">{customer.mobileNumber}</p>
                  <p className="text-xs text-slate-400">Phone Mobile</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-slate-300">
                <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                <div>
                  <p className="font-mono truncate max-w-[200px]">{customer.email}</p>
                  <p className="text-xs text-slate-400">Email Address</p>
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="pt-4 border-t border-slate-800/50 space-y-2">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-500" />
              Delivery / Billing Address
            </h4>
            <p className="text-sm text-slate-300 pl-5.5 leading-relaxed font-medium">{customer.address}</p>
          </div>

          {/* General Notes */}
          <div className="pt-4 border-t border-slate-800/50 space-y-2">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">CRM Notes / Background</h4>
            <p className="text-sm text-slate-400 pl-1 border-l-2 border-slate-700 leading-relaxed italic">
              {customer.notes || 'No customer background logs registered.'}
            </p>
          </div>
        </div>

        {/* Next Scheduled follow up Details */}
        <div className="bg-indigo-950/15 border border-indigo-900/40 rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-900/35">
              <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-400" />
                CRM Action Item
              </h3>
            </div>

            <div className="py-4 text-center">
              <span className="text-xs font-semibold text-indigo-400 block uppercase tracking-wide">Next Scheduled Follow-up</span>
              <span className="text-2xl font-black text-indigo-200 mt-2 block font-mono">
                {new Date(customer.followUpDate).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <p className="text-xs text-slate-400 text-center leading-relaxed">
              Always log your follow-ups credit updates, discount requirements, or complaints to maintain business transparency.
            </p>
          </div>

          <div className="text-center text-[10px] text-indigo-400 font-mono mt-4 pt-3 border-t border-indigo-900/20">
            Registered: {new Date(customer.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Tabs Layout: History & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Tabs Display */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl lg:col-span-2 overflow-hidden flex flex-col">
          {/* Tabs Selector Header */}
          <div className="flex bg-slate-950 border-b border-slate-850">
            <button
              onClick={() => setActiveTab('followups')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'followups'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="h-4.5 w-4.5" />
              Follow-up Timeline ({customer.followUps?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('challans')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'challans'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="h-4.5 w-4.5" />
              Sales Challan Billed ({customer.challans?.length || 0})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 flex-1 bg-slate-900/20">
            {activeTab === 'followups' && (
              <div className="space-y-6">
                {customer.followUps && customer.followUps.length === 0 ? (
                  <p className="text-sm text-slate-500 italic py-4 text-center">
                    No timeline logs registered for this customer. Log your first note on the right panel.
                  </p>
                ) : (
                  <div className="relative border-l border-slate-800 pl-6 ml-3 space-y-6">
                    {customer.followUps?.map((f) => (
                      <div key={f.id} className="relative">
                        {/* Timeline node point */}
                        <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full bg-slate-950 border-2 border-indigo-500 flex items-center justify-center">
                          <span className="h-1 w-1 bg-indigo-400 rounded-full"></span>
                        </span>

                        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800/80">
                          <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-slate-800/30 text-xs">
                            <span className="font-bold text-slate-300 flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-indigo-400" />
                              {f.creator?.name || 'Operations Agent'}
                            </span>
                            <span className="text-slate-500 font-mono">
                              {new Date(f.createdAt).toLocaleDateString()} &nbsp;
                              {new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="mt-2.5 text-sm text-slate-300 leading-relaxed font-medium">{f.note}</p>
                          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono bg-slate-950/45 px-2.5 py-1 rounded w-fit border border-slate-800/50">
                            <Calendar className="h-3 w-3 text-indigo-400" />
                            Next scheduled callback: {new Date(f.followUpDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'challans' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 uppercase font-semibold">
                      <th className="py-2.5">Challan Number</th>
                      <th className="py-2.5">Date Created</th>
                      <th className="py-2.5">Item Quantity</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {customer.challans && customer.challans.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-500 text-xs italic">
                          No sales challans recorded under this business.
                        </td>
                      </tr>
                    ) : (
                      customer.challans?.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/20">
                          <td className="py-3 font-mono font-bold text-indigo-400">
                            <Link to={`/challans/${c.id}`} className="hover:underline">
                              {c.challanNumber}
                            </Link>
                          </td>
                          <td className="py-3 text-slate-400 text-xs font-mono">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-slate-300 font-medium">
                            {c.totalQuantity} items
                          </td>
                          <td className="py-3">
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
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Add Follow-up Form */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 h-fit">
          <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-800/60 pb-3">
            <MessageSquare className="h-5 w-5 text-indigo-400" />
            Log CRM Conversation
          </h3>

          {canWrite ? (
            <form onSubmit={handleAddNote} className="space-y-4">
              {noteError && (
                <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {noteError}
                </div>
              )}
              {noteSuccess && (
                <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  Conversation logged & follow-up rescheduled!
                </div>
              )}

              {/* Textarea note */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Interaction Summary *
                </label>
                <textarea
                  required
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Summarize details discussed, client feedback, order requests..."
                  className="w-full mt-2 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              {/* Next date */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Reschedule Next Callback *
                </label>
                <input
                  type="date"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm cursor-pointer"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingNote}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {submittingNote ? 'Saving log...' : 'Save Timeline Log'}
              </button>
            </form>
          ) : (
            <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800 text-slate-400 text-sm leading-relaxed italic text-center">
              ⚠️ Only sales employees or system administrators can write follow-up notes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;
