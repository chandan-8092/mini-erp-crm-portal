import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  Users,
  UserCheck,
  Package,
  AlertTriangle,
  FileCheck,
  FileEdit,
  ArrowRight,
  TrendingDown,
  Clock,
  History,
} from 'lucide-react';
import { Customer, SalesChallan, StockMovement, Product } from '../types';

interface DashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  draftChallans: number;
  confirmedChallans: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<Partial<Customer>[]>([]);
  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([]);
  const [recentChallans, setRecentChallans] = useState<SalesChallan[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch stats & low stock & recent challans in parallel
        const [statsRes, challansRes, lowStockRes] = await Promise.all([
          api.get('/api/dashboard/stats'),
          api.get('/api/dashboard/recent-challans'),
          api.get('/api/dashboard/low-stock'),
        ]);

        if (statsRes.data.success) {
          setStats(statsRes.data.stats);
          setRecentCustomers(statsRes.data.recentCustomers || []);
          setRecentMovements(statsRes.data.recentStockMovements || []);
        }

        if (challansRes.data.success) {
          setRecentChallans(challansRes.data.data || []);
        }

        if (lowStockRes.data.success) {
          setLowStockProducts(lowStockRes.data.data || []);
        }
      } catch (err: any) {
        console.error('Failed to load dashboard:', err);
        setError('Error fetching dashboard statistics. Make sure the backend server is running and database is seeded.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeletons */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-8">
          <div className="h-96 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"></div>
          <div className="h-96 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-200">Unable to load Dashboard</h3>
        <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">{error}</p>
        <div className="mt-6">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Low Stock Warning Banner */}
      {stats && stats.lowStockProducts > 0 && (
        <div className="p-4.5 rounded-xl caution-stripes text-amber-400 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <span className="font-extrabold text-amber-300">LOW STOCK WARNING: </span>
              There are <span className="underline font-bold text-amber-200">{stats.lowStockProducts}</span> products that have dropped below their minimum safety limits.
            </div>
          </div>
          <Link
            to="/products?lowStock=true"
            className="btn-tactile-secondary py-2 px-4 rounded-lg text-xs font-bold text-slate-300 hover:text-white"
          >
            Resolve Inventory Alerts
          </Link>
        </div>
      )}

      {/* Stats Cards Grid */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Total Customers */}
          <div className="tactile-panel p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Customers</p>
              <p className="mt-2 text-3xl font-black text-slate-100 tracking-tight">{stats.totalCustomers}</p>
            </div>
            <div className="h-12 w-12 rounded-lg sunken-well text-indigo-400 flex items-center justify-center border border-indigo-500/10 shadow-inner">
              <Users className="h-5 w-5" />
            </div>
          </div>

          {/* Card 2: Active Customers */}
          <div className="tactile-panel p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active CRM Leads</p>
              <p className="mt-2 text-3xl font-black text-slate-100 tracking-tight">{stats.activeCustomers}</p>
            </div>
            <div className="h-12 w-12 rounded-lg sunken-well text-emerald-400 flex items-center justify-center border border-emerald-500/10 shadow-inner">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>

          {/* Card 3: Total Products */}
          <div className="tactile-panel p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Products</p>
              <p className="mt-2 text-3xl font-black text-slate-100 tracking-tight">{stats.totalProducts}</p>
            </div>
            <div className="h-12 w-12 rounded-lg sunken-well text-sky-400 flex items-center justify-center border border-sky-500/10 shadow-inner">
              <Package className="h-5 w-5" />
            </div>
          </div>

          {/* Card 4: Low Stock Alert */}
          <div className="tactile-panel p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Low Stock Warnings</p>
              <p className={`mt-2 text-3xl font-black tracking-tight ${stats.lowStockProducts > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
                {stats.lowStockProducts}
              </p>
            </div>
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center border transition-all ${
              stats.lowStockProducts > 0 
                ? 'sunken-well text-amber-400 border-amber-500/20 shadow-inner'
                : 'sunken-well text-slate-500 border-slate-700/10 shadow-inner'
            }`}>
              <AlertTriangle className={`h-5 w-5 ${stats.lowStockProducts > 0 ? 'animate-pulse text-amber-500' : ''}`} />
            </div>
          </div>

          {/* Card 5: Draft Challans */}
          <div className="tactile-panel p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Draft Challans</p>
              <p className="mt-2 text-3xl font-black text-slate-100 tracking-tight">{stats.draftChallans}</p>
            </div>
            <div className="h-12 w-12 rounded-lg sunken-well text-purple-400 flex items-center justify-center border border-purple-500/10 shadow-inner">
              <FileEdit className="h-5 w-5" />
            </div>
          </div>

          {/* Card 6: Confirmed Challans */}
          <div className="tactile-panel p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Confirmed Sales</p>
              <p className="mt-2 text-3xl font-black text-slate-100 tracking-tight">{stats.confirmedChallans}</p>
            </div>
            <div className="h-12 w-12 rounded-lg sunken-well text-teal-400 flex items-center justify-center border border-teal-500/10 shadow-inner">
              <FileCheck className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {/* Grid: Recent Logs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Challans List */}
        <div className="tactile-panel p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2.5">
                <Clock className="h-4.5 w-4.5 text-indigo-400" />
                Recent Challans
              </h3>
              <Link to="/challans" className="btn-tactile-secondary px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-300">
                View All
              </Link>
            </div>
            <div className="sunken-well p-4 rounded-xl overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800/80 text-left text-xs">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
                    <th className="pb-2.5">Challan #</th>
                    <th className="pb-2.5">Customer</th>
                    <th className="pb-2.5">Quantity</th>
                    <th className="pb-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {recentChallans.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-500 font-mono text-[11px]">
                        No challans recorded.
                      </td>
                    </tr>
                  ) : (
                    recentChallans.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-950/40">
                        <td className="py-3 font-mono font-bold text-indigo-400">
                          <Link to={`/challans/${c.id}`} className="hover:underline">{c.challanNumber}</Link>
                        </td>
                        <td className="py-3 text-slate-300 font-semibold max-w-[140px] truncate">
                          {c.customer?.customerName || 'Unknown Customer'}
                        </td>
                        <td className="py-3 text-slate-400 font-mono">{c.totalQuantity} units</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-black uppercase rounded border ${
                            c.status === 'CONFIRMED'
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
                              : c.status === 'CANCELLED'
                              ? 'bg-rose-950/40 text-rose-400 border-rose-900/40'
                              : 'bg-purple-950/40 text-purple-400 border-purple-900/40'
                          }`}>
                            <span className={`led-glow ${
                              c.status === 'CONFIRMED'
                                ? 'led-green'
                                : c.status === 'CANCELLED'
                                ? 'led-red'
                                : 'led-purple'
                            }`} />
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent CRM Lead/Customers */}
        <div className="tactile-panel p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2.5">
                <Users className="h-4.5 w-4.5 text-indigo-400" />
                Recent CRM Leads
              </h3>
              <Link to="/customers" className="btn-tactile-secondary px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-300">
                View All
              </Link>
            </div>
            <div className="sunken-well p-4 rounded-xl overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800/80 text-left text-xs">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
                    <th className="pb-2.5">Name</th>
                    <th className="pb-2.5">Business Name</th>
                    <th className="pb-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {recentCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-500 font-mono text-[11px]">
                        No customer logs registered.
                      </td>
                    </tr>
                  ) : (
                    recentCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-950/40">
                        <td className="py-3 text-slate-200 font-bold hover:underline">
                          <Link to={`/customers/${c.id}`}>{c.customerName}</Link>
                        </td>
                        <td className="py-3 text-slate-400 font-semibold max-w-[140px] truncate">
                          {c.businessName}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-black uppercase rounded border ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
                              : c.status === 'LEAD'
                              ? 'bg-sky-950/40 text-sky-400 border-sky-900/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700/50'
                          }`}>
                            <span className={`led-glow ${
                              c.status === 'ACTIVE'
                                ? 'led-green'
                                : c.status === 'LEAD'
                                ? 'led-blue'
                                : 'led-amber'
                            }`} />
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Stock Movements Log */}
        <div className="tactile-panel p-5 col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2.5">
              <History className="h-4.5 w-4.5 text-indigo-400" />
              Recent Inventory Stock Movements
            </h3>
            <Link to="/products" className="btn-tactile-secondary px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-300">
              Adjust Inventory
            </Link>
          </div>
          <div className="sunken-well p-4 rounded-xl overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800/80 text-left text-xs">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
                  <th className="pb-2.5">Product SKU</th>
                  <th className="pb-2.5">Product Name</th>
                  <th className="pb-2.5">Adjustment</th>
                  <th className="pb-2.5">Reason</th>
                  <th className="pb-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {recentMovements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500 font-mono text-[11px]">
                      No recent inventory movements recorded.
                    </td>
                  </tr>
                ) : (
                  recentMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-950/40">
                      <td className="py-3 font-mono font-bold text-slate-300">
                        {m.product?.sku}
                      </td>
                      <td className="py-3 text-slate-300 font-semibold">
                        {m.product?.productName}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                          m.movementType === 'IN'
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
                            : 'bg-rose-950/40 text-rose-400 border-rose-900/40'
                        }`}>
                          <span className={`led-glow ${m.movementType === 'IN' ? 'led-green' : 'led-red'}`} />
                          {m.movementType} {m.quantityChanged} units
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 text-xs max-w-[200px] truncate">
                        {m.reason}
                      </td>
                      <td className="py-3 text-slate-500 font-mono text-[10px]">
                        {new Date(m.createdAt).toLocaleDateString()} &nbsp;
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
