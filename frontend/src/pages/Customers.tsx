import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  Filter,
  UserPlus,
  Plus,
  Edit2,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Building,
  MapPin,
  Calendar,
  X,
  FileCheck,
} from 'lucide-react';
import { Customer, CustomerType, CustomerStatus, Pagination } from '../types';

const Customers: React.FC = () => {
  const { hasRole } = useAuth();
  const canWrite = hasRole(['ADMIN', 'SALES']);

  // State for customer logs
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [customerType, setCustomerType] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Form Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [cType, setCType] = useState<CustomerType>('WHOLESALE');
  const [cStatus, setCStatus] = useState<CustomerStatus>('LEAD');
  const [address, setAddress] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/customers', {
        params: {
          page,
          limit: 10,
          search,
          status: status || undefined,
          customerType: customerType || undefined,
        },
      });
      if (res.data.success) {
        setCustomers(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, status, customerType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const openAddModal = () => {
    setEditingId(null);
    setCustomerName('');
    setMobileNumber('');
    setEmail('');
    setBusinessName('');
    setGstNumber('');
    setCType('WHOLESALE');
    setCStatus('LEAD');
    setAddress('');
    setNotes('');
    // Default tomorrow for followup
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFollowUpDate(tomorrow.toISOString().split('T')[0]);

    setErrorMsg(null);
    setSuccessMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingId(c.id);
    setCustomerName(c.customerName);
    setMobileNumber(c.mobileNumber);
    setEmail(c.email);
    setBusinessName(c.businessName);
    setGstNumber(c.gstNumber || '');
    setCType(c.customerType);
    setCStatus(c.status);
    setAddress(c.address);
    setFollowUpDate(new Date(c.followUpDate).toISOString().split('T')[0]);
    setNotes(c.notes);

    setErrorMsg(null);
    setSuccessMsg(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Simple Validations
    if (!customerName || !mobileNumber || !email || !businessName || !address || !followUpDate) {
      setErrorMsg('Please fill in all mandatory fields.');
      return;
    }

    const payload = {
      customerName,
      mobileNumber,
      email,
      businessName,
      gstNumber: gstNumber || null,
      customerType: cType,
      status: cStatus,
      address,
      followUpDate: new Date(followUpDate).toISOString(),
      notes,
    };

    try {
      if (editingId) {
        const res = await api.put(`/api/customers/${editingId}`, payload);
        if (res.data.success) {
          setSuccessMsg('Customer updated successfully!');
          fetchCustomers();
          setTimeout(() => setModalOpen(false), 800);
        }
      } else {
        const res = await api.post('/api/customers', payload);
        if (res.data.success) {
          setSuccessMsg('Customer created successfully!');
          fetchCustomers();
          setTimeout(() => setModalOpen(false), 800);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.errors) {
        // format zod validation errors
        const errors = err.response.data.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ');
        setErrorMsg(errors);
      } else {
        setErrorMsg(err.response?.data?.message || 'Error occurred while saving customer profile.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 uppercase tracking-wide">
            Customer Relationship Management
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Register new wholesale, distributor, or retail leads, schedule follow-ups, and review communications.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white shadow-md shadow-indigo-600/10 transition-all duration-150 active:scale-[0.98]"
          >
            <UserPlus className="h-4.5 w-4.5" />
            Add Customer
          </button>
        )}
      </div>

      {/* Filter Options Panel */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {/* Text Search */}
          <div className="sm:col-span-2 relative">
            <input
              type="text"
              placeholder="Search by customer name, business, email, or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-700 bg-slate-950/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
          </div>

          {/* Customer Type Filter */}
          <div>
            <select
              value={customerType}
              onChange={(e) => {
                setCustomerType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-700 bg-slate-950/80 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm cursor-pointer"
            >
              <option value="">All Customer Types</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
              <option value="RETAIL">Retail</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-700 bg-slate-950/80 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="LEAD">Leads</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </form>
      </div>

      {/* Customers Table List */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Business Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Next Follow-up</th>
                {canWrite && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                [...Array(5)].map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={canWrite ? 7 : 6} className="px-6 py-4.5 h-16 bg-slate-900/10"></td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 7 : 6} className="px-6 py-8 text-center text-slate-500">
                    No customers registered matching the criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                    {/* Name */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/customers/${c.id}`}
                        className="text-slate-200 hover:text-indigo-400 font-bold transition-colors"
                      >
                        {c.customerName}
                      </Link>
                    </td>

                    {/* Business */}
                    <td className="px-6 py-4 whitespace-nowrap text-slate-300 font-medium max-w-[180px] truncate">
                      {c.businessName}
                    </td>

                    {/* Type Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-300">
                        {c.customerType}
                      </span>
                    </td>

                    {/* Contact Info */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 shrink-0" />
                        {c.mobileNumber}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 truncate max-w-[160px]">
                        <span className="font-mono">{c.email}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase border ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : c.status === 'LEAD'
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {c.status}
                      </span>
                    </td>

                    {/* Next Follow-up */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-300 font-mono">
                      {new Date(c.followUpDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    {canWrite && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditModal(c)}
                          className="text-slate-400 hover:text-indigo-400 inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-850 hover:bg-indigo-600/10 border border-slate-800 transition-colors"
                          title="Edit Customer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-900/20 border-t border-slate-850 flex items-center justify-between text-sm text-slate-400">
            <div>
              Showing page <span className="text-slate-200 font-semibold">{page}</span> of{' '}
              <span className="text-slate-200 font-semibold">{pagination.totalPages}</span> (
              <span className="text-slate-200 font-semibold">{pagination.total}</span> total customers)
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

      {/* Add / Edit Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-base tracking-wide text-slate-100 uppercase">
                {editingId ? 'Edit Customer Profile' : 'Register New Customer CRM'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4" />
                  {successMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>

                {/* Business Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Business / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. JD Enterprises"
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Mobile Number (10 digits) *
                  </label>
                  <input
                    type="text"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. client@company.com"
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>

                {/* GST Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    GST Number (Optional, 15 characters)
                  </label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. 29ABCDE1234F1Z5"
                    maxLength={15}
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>

                {/* FollowUp Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Next Follow-up Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm cursor-pointer"
                  />
                </div>

                {/* Customer Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Customer Category *
                  </label>
                  <select
                    value={cType}
                    onChange={(e) => setCType(e.target.value as CustomerType)}
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm cursor-pointer"
                  >
                    <option value="WHOLESALE">Wholesale Buyer</option>
                    <option value="DISTRIBUTOR">Regional Distributor</option>
                    <option value="RETAIL">Direct Retailer</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    CRM status *
                  </label>
                  <select
                    value={cStatus}
                    onChange={(e) => setCStatus(e.target.value as CustomerStatus)}
                    className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm cursor-pointer"
                  >
                    <option value="LEAD">Uncontacted Lead</option>
                    <option value="ACTIVE">Active Account</option>
                    <option value="INACTIVE">Inactive / Archived</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Business Billing/Shipping Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter complete company shipping and delivery address details..."
                  className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  CRM Followup Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record discussions, preferences, next steps..."
                  className="w-full mt-1.5 px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white transition-colors"
                >
                  {editingId ? 'Save Profile' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
