import React, { useState, useEffect } from 'react';
import {
  Package,
  Layers,
  Plus,
  RefreshCw,
  Server,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Edit2,
  Trash2,
  ShieldCheck,
  Search,
  ExternalLink,
  Cpu,
  Tv,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  fetchBundleDefinitionsApi,
  fetchPodBundleMatrixApi,
  deleteBundleDefinitionApi
} from '../../api/vpsApi';
import CreateBundleModal from './CreateBundleModal';

export default function BundleVersionTab({ onDeployBundle = null }) {
  const [bundles, setBundles] = useState([]);
  const [podMatrix, setPodMatrix] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [envFilter, setEnvFilter] = useState(''); // '' | 'dev' | 'release'
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bundleList, matrix] = await Promise.all([
        fetchBundleDefinitionsApi(envFilter),
        fetchPodBundleMatrixApi()
      ]);
      setBundles(bundleList || []);
      setPodMatrix(matrix || []);
    } catch (err) {
      console.error('Failed to load bundle version data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [envFilter]);

  const handleDeleteBundle = async (id, name, e) => {
    e.stopPropagation();
    if (window.confirm(`Apakah Anda yakin ingin menghapus resep bundle '${name}'?`)) {
      try {
        await deleteBundleDefinitionApi(id);
        loadData();
      } catch (err) {
        alert(err.message || 'Gagal menghapus bundle');
      }
    }
  };

  const handleEditBundle = (bundle, e) => {
    e.stopPropagation();
    setEditingBundle(bundle);
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingBundle(null);
    setIsModalOpen(true);
  };

  const syncedPodsCount = podMatrix.filter(p => p.compliance_status === 'synced' && p.compliance_pct === 100).length;
  const mismatchedPodsCount = podMatrix.length - syncedPodsCount;

  const filteredPods = podMatrix.filter(item => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = item.server_name && item.server_name.toLowerCase().includes(q);
      const matchCode = item.pod_code && item.pod_code.toLowerCase().includes(q);
      const matchBundle = item.bundle_name && item.bundle_name.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchBundle) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="glass-card p-4 rounded-2xl border border-cyan-500/30 bg-slate-950/70 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-semibold text-slate-400">Total Resep Bundle</span>
            <div className="text-2xl font-black text-white mt-0.5">{bundles.length} Bundle</div>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Package size={20} />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-emerald-500/30 bg-slate-950/70 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-semibold text-slate-400">POD 100% Synced</span>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">
              {syncedPodsCount}
              <span className="text-xs text-slate-400 font-bold ml-1.5">/ {podMatrix.length} Unit</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-500/30 bg-slate-950/70 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-semibold text-slate-400">Perlu Penyesuaian</span>
            <div className="text-2xl font-black text-amber-400 mt-0.5">{mismatchedPodsCount} Unit</div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertCircle size={20} />
          </div>
        </div>
      </div>

      {/* Section 1: Bundle Definitions Cards */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>Daftar Resep Bundle Rilis (Bundle Definitions)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Paket versi resmi 7 aplikasi untuk standarisasi deployment unit POD v3
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Filter Environment */}
            <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
              <button
                onClick={() => setEnvFilter('')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  envFilter === '' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setEnvFilter('dev')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  envFilter === 'dev' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                DEV
              </button>
              <button
                onClick={() => setEnvFilter('release')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  envFilter === 'release' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                RELEASE
              </button>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Plus size={15} />
              <span>Buat Bundle Baru</span>
            </button>
          </div>
        </div>

        {/* Bundle Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bundles.map(bundle => {
            const isDev = bundle.environment === 'dev';
            return (
              <div
                key={bundle.id}
                className={`glass-card p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-xl ${
                  isDev
                    ? 'border-amber-500/25 bg-slate-950/80 hover:border-amber-500/40'
                    : 'border-emerald-500/25 bg-slate-950/80 hover:border-emerald-500/40'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border shrink-0 ${
                          isDev
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {bundle.environment}
                        </span>
                        <h4 className="text-xs font-black text-white truncate" title={bundle.bundle_name}>
                          {bundle.bundle_name}
                        </h4>
                      </div>
                      {bundle.description && (
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                          {bundle.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleEditBundle(bundle, e)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Edit Resep Bundle"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteBundle(bundle.id, bundle.bundle_name, e)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Hapus Resep Bundle"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* 7 App Versions Matrix in Card */}
                  <div className="grid grid-cols-2 gap-1.5 py-3 text-[10px]">
                    <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-1">
                      <span className="text-slate-400 font-medium truncate">Mobile API:</span>
                      <span className="font-mono font-bold text-cyan-300 truncate max-w-[100px]" title={bundle.mobile_api_version}>
                        {bundle.mobile_api_version}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-1">
                      <span className="text-slate-400 font-medium truncate">Mobile Sync:</span>
                      <span className="font-mono font-bold text-cyan-300 truncate max-w-[100px]" title={bundle.mobile_synch_version}>
                        {bundle.mobile_synch_version}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-1">
                      <span className="text-slate-400 font-medium truncate">Consume:</span>
                      <span className="font-mono font-bold text-cyan-300 truncate max-w-[100px]" title={bundle.mobile_consume_version}>
                        {bundle.mobile_consume_version}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-1">
                      <span className="text-slate-400 font-medium truncate">Downloader:</span>
                      <span className="font-mono font-bold text-cyan-300 truncate max-w-[100px]" title={bundle.mobile_downloader_version}>
                        {bundle.mobile_downloader_version}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-1">
                      <span className="text-slate-400 font-medium truncate">Assist API:</span>
                      <span className="font-mono font-bold text-cyan-300 truncate max-w-[100px]" title={bundle.assist_api_version}>
                        {bundle.assist_api_version}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-1">
                      <span className="text-purple-400 font-medium truncate">Small Screen:</span>
                      <span className="font-mono font-bold text-purple-300 truncate max-w-[100px]" title={bundle.small_screen_version}>
                        {bundle.small_screen_version}
                      </span>
                    </div>

                    <div className="col-span-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-1">
                      <span className="text-purple-400 font-medium truncate">Big Screen App:</span>
                      <span className="font-mono font-bold text-purple-300 truncate max-w-[150px]" title={bundle.big_screen_version}>
                        {bundle.big_screen_version}
                      </span>
                    </div>
                  </div>

                  {/* Backend .env Preset Info */}
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono px-1 py-0.5 bg-slate-900/40 rounded border border-slate-800/60 mb-2">
                    <span className="text-amber-300/80 font-bold">.env Preset:</span>
                    <span className="text-slate-300 truncate max-w-[200px]">
                      {bundle.mobile_api_env || (bundle.environment === 'release' ? 'assist-api-prod.env' : 'assist-api-dev.env')}
                    </span>
                  </div>
                </div>

                {/* Card Footer Action */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[9px] text-slate-500 font-mono">
                    Oleh: {bundle.created_by || 'Admin'}
                  </span>

                  <button
                    onClick={() => onDeployBundle?.(bundle)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow-cyan-500/20"
                  >
                    <Play size={12} className="fill-cyan-300" />
                    <span>1-Click Deploy Bundle</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: POD Compliance Table */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>Status Kepatuhan Bundle per Unit POD v3</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {filteredPods.length} Unit POD
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Pelacakan keselarasan versi aplikasi terpasang pada masing-masing POD terhadap Bundle resmi
            </p>
          </div>

          <div className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari POD / Bundle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* POD Matrix Table */}
        <div className="glass-card rounded-2xl border border-cyan-500/20 bg-slate-950/70 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10">
                  <th className="py-3 px-3.5 min-w-[140px] bg-slate-900">Node POD</th>
                  <th className="py-3 px-3 min-w-[160px] bg-slate-900">Bundle Aktif</th>
                  <th className="py-3 px-3 min-w-[130px] bg-slate-900">Kepatuhan</th>
                  <th className="py-3 px-3 min-w-[280px] bg-slate-900">Rincian 7 Aplikasi Terpasang</th>
                  <th className="py-3 px-3 min-w-[110px] bg-slate-900 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      <RefreshCw size={20} className="animate-spin text-cyan-400 mx-auto mb-2" />
                      Memuat matriks kepatuhan bundle...
                    </td>
                  </tr>
                ) : filteredPods.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      Tidak ada data unit POD yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredPods.map(pod => {
                    const isSynced = pod.compliance_status === 'synced' && pod.compliance_pct === 100;
                    return (
                      <tr key={pod.server_id} className="hover:bg-slate-900/40 transition-colors">
                        {/* POD Info */}
                        <td className="py-3 px-3.5 whitespace-nowrap bg-slate-950/40">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 shrink-0">
                              <Server size={14} />
                            </div>
                            <div>
                              <div className="font-extrabold text-white text-xs flex items-center gap-1.5">
                                <span>{pod.server_name}</span>
                                {pod.pod_code && (
                                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 font-mono font-bold text-[9px] border border-cyan-500/30">
                                    #{pod.pod_code}
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] text-slate-500 font-mono">
                                {pod.host}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Active Bundle Tag */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-white text-xs truncate max-w-[160px]" title={pod.bundle_name}>
                              {pod.bundle_name}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              Env: <span className="uppercase font-bold text-slate-300">{pod.environment}</span>
                            </span>
                          </div>
                        </td>

                        {/* Compliance Percentage Bar */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1 w-28">
                            <div className="flex items-center justify-between text-[9px]">
                              <span className={`font-bold flex items-center gap-1 ${isSynced ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {isSynced ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                                <span>{isSynced ? '100% Cocok' : `${pod.matched_apps_count}/7 Cocok`}</span>
                              </span>
                              <span className="font-mono text-slate-400">{pod.compliance_pct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isSynced
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-400'
                                }`}
                                style={{ width: `${pod.compliance_pct}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* 7 App Chips */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[340px]">
                            {Object.entries(pod.installed_apps || {}).map(([appId, ver]) => {
                              const isDeb = appId === 'big-screen' || appId === 'small-screen';
                              return (
                                <span
                                  key={appId}
                                  className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono border truncate max-w-[160px] ${
                                    ver
                                      ? (isDeb ? 'bg-purple-950/40 border-purple-500/30 text-purple-300' : 'bg-slate-900 border-slate-700 text-cyan-300')
                                      : 'bg-slate-900/30 border-slate-800 text-slate-600'
                                  }`}
                                  title={`${appId}: ${ver || 'Not Installed'}`}
                                >
                                  <span className="text-slate-400 font-sans mr-1">{appId.replace('mobile-', '')}:</span>
                                  <span>{ver || '—'}</span>
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Quick Deploy / Sync Action */}
                        <td className="py-3 px-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => {
                              const matchedBundle = bundles.find(b => b.id === pod.bundle_id) || bundles[0];
                              if (matchedBundle) onDeployBundle?.(matchedBundle, pod);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Sinkronkan
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create / Edit Bundle Modal */}
      <CreateBundleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadData}
        editBundle={editingBundle}
      />
    </div>
  );
}
