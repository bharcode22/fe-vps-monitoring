import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
  Package,
  Layers,
  Terminal,
  Trash2,
  User,
  ArrowRight,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import {
  fetchDeploymentHistoryApi,
  deleteDeploymentHistoryApi,
  fetchDeploymentDetailApi
} from '../../api/vpsApi';
import DeploymentLogModal from './DeploymentLogModal';

export default function DeploymentHistoryTab({ onQuickDeploy = null }) {
  const [historyList, setHistoryList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [podCodeFilter, setPodCodeFilter] = useState('');
  const [appNameFilter, setAppNameFilter] = useState('');
  const [envFilter, setEnvFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Log Modal State
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const loadHistory = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await fetchDeploymentHistoryApi({
        page,
        limit: pagination.limit,
        search,
        pod_code: podCodeFilter,
        app_name: appNameFilter,
        environment: envFilter,
        status: statusFilter
      });
      if (res && res.success) {
        setHistoryList(res.data || []);
        if (res.pagination) setPagination(res.pagination);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load deployment history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(1);
  }, [search, podCodeFilter, appNameFilter, envFilter, statusFilter]);

  const handleViewLog = async (item) => {
    setIsDetailLoading(true);
    try {
      const detail = await fetchDeploymentDetailApi(item.id);
      setSelectedHistory(detail || item);
      setIsLogModalOpen(true);
    } catch (err) {
      console.error('Failed to load deployment detail log:', err);
      setSelectedHistory(item);
      setIsLogModalOpen(true);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Apakah Anda yakin ingin menghapus catatan riwayat deployment ini?')) {
      try {
        await deleteDeploymentHistoryApi(id);
        loadHistory(pagination.page);
      } catch (err) {
        alert(err.message || 'Gagal menghapus riwayat');
      }
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setPodCodeFilter('');
    setAppNameFilter('');
    setEnvFilter('');
    setStatusFilter('');
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      {/* Top Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="glass-card p-4 rounded-2xl border border-cyan-500/30 bg-slate-950/70 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-semibold text-slate-400">Total Deployment</span>
            <div className="text-2xl font-black text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <History size={20} />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-emerald-500/30 bg-slate-950/70 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-semibold text-slate-400">Deployment Berhasil</span>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">
              {stats.success}
              <span className="text-xs text-emerald-500 font-bold ml-2">
                ({stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%)
              </span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-rose-500/30 bg-slate-950/70 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-semibold text-slate-400">Deployment Gagal</span>
            <div className="text-2xl font-black text-rose-400 mt-0.5">{stats.failed}</div>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertCircle size={20} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-cyan-500/20 bg-slate-950/70 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xl">
        <div className="flex-1 flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari POD, versi, app..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* App Filter */}
          <select
            value={appNameFilter}
            onChange={(e) => setAppNameFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            <option value="">Semua Aplikasi (7)</option>
            <option value="mobile-api">Mobile API (mobile-api)</option>
            <option value="mobile-synch">Mobile Sync (mobile-synch)</option>
            <option value="mobile-consume">Mobile Consume (mobile-consume)</option>
            <option value="mobile-downloader">Mobile Downloader (mobile-downloader)</option>
            <option value="assist-api">Assist API (assist-api)</option>
            <option value="small-screen">Small Screen App (small-screen)</option>
            <option value="big-screen">Big Screen App (big-screen)</option>
          </select>

          {/* Environment Filter */}
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            <option value="">Semua Env</option>
            <option value="dev">Development (dev)</option>
            <option value="release">Production (release)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            <option value="">Semua Status</option>
            <option value="success">Berhasil (Success)</option>
            <option value="failed">Gagal (Failed)</option>
          </select>

          {(search || podCodeFilter || appNameFilter || envFilter || statusFilter) && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        <button
          onClick={() => loadHistory(pagination.page)}
          className="px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg"
          title="Segarkan Riwayat"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* History Data Table */}
      <div className="glass-card rounded-2xl border border-cyan-500/20 bg-slate-950/70 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Status & Waktu</th>
                <th className="py-3.5 px-4">POD (Code)</th>
                <th className="py-3.5 px-4">Aplikasi & Tipe</th>
                <th className="py-3.5 px-4">Versi & Env</th>
                <th className="py-3.5 px-4">File .env</th>
                <th className="py-3.5 px-4">Durasi</th>
                <th className="py-3.5 px-4">Deployer</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-cyan-400 mx-auto mb-2" />
                    Memuat riwayat deployment...
                  </td>
                </tr>
              ) : historyList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Belum ada riwayat deployment yang tercatat.
                  </td>
                </tr>
              ) : (
                historyList.map((item) => {
                  const isSuccess = item.status === 'success';
                  const isEnvDev = (item.environment || 'dev').toLowerCase() === 'dev';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleViewLog(item)}
                      className="hover:bg-slate-900/50 transition-colors cursor-pointer group"
                    >
                      {/* Status & Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            isSuccess
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          }`}>
                            {isSuccess ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                            {item.status}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      </td>

                      {/* Server & POD Code */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-xs">{item.server_name}</span>
                          {item.pod_code && (
                            <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 font-mono font-bold text-[10px] border border-cyan-500/30">
                              #{item.pod_code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* App Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-200">
                          <Package size={13} className="text-cyan-400 shrink-0" />
                          <span>{item.app_name}</span>
                          <span className="text-[10px] font-semibold text-slate-500 ml-1">
                            ({item.app_type || 'backend'})
                          </span>
                        </div>
                      </td>

                      {/* Version & Environment */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-cyan-300 text-xs">
                            {item.version}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase border ${
                            isEnvDev
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {item.environment || 'dev'}
                          </span>
                        </div>
                      </td>

                      {/* Env filename */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        {item.env_filename || '-'}
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} className="text-slate-500" />
                          {item.duration_seconds || 0}s
                        </span>
                      </td>

                      {/* Deployer */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <User size={11} className="text-slate-500" />
                          {item.deployed_by || 'Admin'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewLog(item);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Buka Log Terminal"
                          >
                            <Terminal size={14} />
                          </button>
                          {onQuickDeploy && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickDeploy(item);
                              }}
                              className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 transition-colors cursor-pointer"
                              title="Re-deploy / Rollback ke versi ini"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                            title="Hapus Catatan Riwayat"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-3.5 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Menampilkan {historyList.length} dari total {pagination.total} riwayat
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadHistory(pagination.page - 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 cursor-pointer transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-bold text-slate-200">
                Halaman {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadHistory(pagination.page + 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 cursor-pointer transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Terminal Log Modal */}
      <DeploymentLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        historyItem={selectedHistory}
      />
    </div>
  );
}
