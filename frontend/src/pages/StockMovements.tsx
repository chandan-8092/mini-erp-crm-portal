import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  User,
  Loader,
} from 'lucide-react';
import { StockMovement, Pagination } from '../types';

const StockMovements: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/products/movements/all', {
        params: {
          page,
          limit: 15, // Display slightly more lines for historical audit
          search: search || undefined,
        },
      });
      if (res.data.success) {
        setMovements(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      console.error('Failed to load stock movements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMovements();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-100 uppercase tracking-wide flex items-center gap-2">
          <History className="h-6 w-6 text-indigo-400" />
          Global Inventory Audit Trail
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Review all additions (IN) and reductions (OUT) logged by catalog registration, physical count corrections, or sales dispatch confirmations.
        </p>
      </div>

      {/* Filter */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
        <form onSubmit={handleSearchSubmit} className="max-w-md relative">
          <input
            type="text"
            placeholder="Search movements by SKU or product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-slate-700 bg-slate-950/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
        </form>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Adjustment Type</th>
                <th className="px-6 py-4">Product SKU</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Quantity Changed</th>
                <th className="px-6 py-4">Reason / Notes</th>
                <th className="px-6 py-4">Logged By</th>
                <th className="px-6 py-4 font-mono">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                [...Array(6)].map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-4.5 h-14 bg-slate-900/10"></td>
                  </tr>
                ))
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No inventory movements recorded in the system audit logs.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isIn = m.movementType === 'IN';
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/15 transition-colors">
                      {/* IN/OUT Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                          isIn
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {isIn ? (
                            <ArrowUpRight className="h-3 w-3 shrink-0" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 shrink-0" />
                          )}
                          {m.movementType}
                        </span>
                      </td>

                      {/* SKU */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-300">
                        {m.product?.sku}
                      </td>

                      {/* Name */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-200 font-semibold max-w-[200px] truncate">
                        {m.product?.productName}
                      </td>

                      {/* Quantity */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-200 font-mono font-bold">
                        {m.quantityChanged} units
                      </td>

                      {/* Reason */}
                      <td className="px-6 py-4 text-xs text-slate-400 max-w-[250px] leading-relaxed">
                        {m.reason}
                      </td>

                      {/* Agent */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-300 font-medium">
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          {m.creator?.name || 'System Agent'}
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-450 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-600" />
                          {new Date(m.createdAt).toLocaleDateString()} &bull;{' '}
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
              <span className="text-slate-200 font-semibold">{pagination.total}</span> total movements)
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
    </div>
  );
};

export default StockMovements;
