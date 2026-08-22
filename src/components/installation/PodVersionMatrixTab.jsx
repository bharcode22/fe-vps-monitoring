import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  RefreshCw,
  Server,
  Package,
  Activity,
  CheckCircle2,
  AlertCircle,
  Scan,
  Cpu,
  Tv
} from 'lucide-react';
import {
  fetchPodAppVersionsApi,
  scanPodAppVersionsApi
} from '../../api/vpsApi';
import { ALL_POD_APPS } from './constants';

export default function PodVersionMatrixTab({ onQuickDeploy = null }) {
  const [matrixData, setMatrixData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [appTypeFilter, setAppTypeFilter] = useState('all'); // 'all' | 'backend' | 'frontend'

  const loadMatrix = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPodAppVersionsApi();
      setMatrixData(data || []);
    } catch (err) {
      console.error('Failed to load POD version matrix:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, []);

  const handleScanLive = async () => {
    setIsScanning(true);
    setScanMessage(null);
    try {
      const res = await scanPodAppVersionsApi();
      if (res && res.success) {
        setMatrixData(res.data || []);
        setScanMessage({
          type: 'success',
          text: res.message || 'Pemindaian versi langsung via SSH selesai!'
        });
      }
    } catch (err) {
      console.error('Scan error:', err);
      setScanMessage({
        type: 'error',
        text: err.message || 'Gagal melakukan pemindaian versi langsung'
      });
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanMessage(null), 6000);
    }
  };

  const displayedApps = ALL_POD_APPS.filter(app => {
    if (appTypeFilter === 'backend') return app.type === 'backend';
    if (appTypeFilter === 'frontend') return app.type === 'frontend';
    return true;
  });

  const filteredMatrix = matrixData
    .filter(item => item.pod_version === 'v3' || (item.pod_version || '').toLowerCase().includes('3'))
    .filter(item => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = item.server_name && item.server_name.toLowerCase().includes(q);
        const matchCode = item.pod_code && item.pod_code.toLowerCase().includes(q);
        const matchHost = item.host && item.host.includes(q);
        if (!matchName && !matchCode && !matchHost) return false;
      }
      return true;
    });

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      {/* Header Info & Scan Trigger */}
      <div className="glass-card p-4 rounded-2xl border border-cyan-500/20 bg-slate-950/70 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Layers size={20} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>Matriks Versi Aplikasi POD v3</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {filteredMatrix.length} Unit POD v3
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pantau status versi aktif untuk 7 aplikasi (5 Backend & 2 Frontend) pada seluruh node POD v3
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live SSH Scan Button */}
          <button
            onClick={handleScanLive}
            disabled={isScanning}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Scan langsung kontainer Docker dan paket Debian aktif via SSH di seluruh POD"
          >
            <Scan size={14} className={isScanning ? 'animate-spin' : ''} />
            <span>{isScanning ? 'Memindai...' : 'Scan Versi SSH'}</span>
          </button>

          <button
            onClick={loadMatrix}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            title="Muat Ulang Data Matriks"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {scanMessage && (
        <div className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 text-xs font-bold animate-in slide-in-from-top-2 duration-200 ${
          scanMessage.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {scanMessage.type === 'success' ? <CheckCircle2 size={15} className="text-emerald-400" /> : <AlertCircle size={15} />}
            <span>{scanMessage.text}</span>
          </div>
        </div>
      )}

      {/* Filter & Category Bar */}
      <div className="glass-card p-3 rounded-xl border border-cyan-500/20 bg-slate-950/70 flex flex-col md:flex-row items-center justify-between gap-2.5 shadow-md">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari POD (nama/kode)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* App Type Category Filter */}
          <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setAppTypeFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                appTypeFilter === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua (7)
            </button>
            <button
              onClick={() => setAppTypeFilter('backend')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                appTypeFilter === 'backend'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu size={11} />
              <span>Backend (5)</span>
            </button>
            <button
              onClick={() => setAppTypeFilter('frontend')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                appTypeFilter === 'frontend'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv size={11} />
              <span>Screens (2)</span>
            </button>
          </div>
        </div>

        {/* Compact Legend */}
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>DEV</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>RELEASE</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-600"></span>
            <span>Unset</span>
          </div>
        </div>
      </div>

      {/* Interactive Compact Matrix Table */}
      <div className="glass-card rounded-2xl border border-cyan-500/20 bg-slate-950/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10">
                <th className="py-2.5 px-3 min-w-[130px] bg-slate-900">Node POD</th>
                {displayedApps.map(app => (
                  <th key={app.id} className="py-2.5 px-2 min-w-[115px] bg-slate-900">
                    <div className="flex items-center gap-1">
                      <Package size={11} className={app.type === 'frontend' ? 'text-purple-400' : 'text-cyan-400'} />
                      <span className="text-slate-200 truncate">{app.label}</span>
                      <span className={`text-[7px] font-black px-1 py-0.2 rounded border shrink-0 ${
                        app.type === 'frontend'
                          ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                      }`}>
                        {app.type === 'frontend' ? 'DEB' : 'API'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={displayedApps.length + 1} className="py-10 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin text-cyan-400 mx-auto mb-2" />
                    Memuat matriks versi aplikasi POD v3...
                  </td>
                </tr>
              ) : filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan={displayedApps.length + 1} className="py-10 text-center text-slate-500">
                    Tidak ada data unit POD v3 yang cocok.
                  </td>
                </tr>
              ) : (
                filteredMatrix.map(row => {
                  return (
                    <tr key={row.server_id} className="hover:bg-slate-900/40 transition-colors">
                      {/* POD Node Info */}
                      <td className="py-2.5 px-3 whitespace-nowrap bg-slate-950/40">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 shrink-0">
                            <Server size={13} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-white text-[11px] flex items-center gap-1 truncate">
                              <span className="truncate">{row.server_name}</span>
                              {row.pod_code && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 font-mono font-bold text-[9px] border border-cyan-500/30 shrink-0">
                                  #{row.pod_code}
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-500 font-mono">
                              {row.host}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* App Columns */}
                      {displayedApps.map(app => {
                        const appVersion = (row.apps || []).find(a => a.app_name === app.id);
                        const isInstalled = appVersion && appVersion.current_version && appVersion.current_version !== 'Not Installed';
                        const isDev = (appVersion?.environment || 'dev').toLowerCase() === 'dev';

                        return (
                          <td key={app.id} className="py-2 px-1.5 whitespace-nowrap">
                            {isInstalled ? (
                              <div className={`p-1.5 rounded-lg border flex flex-col gap-0.5 transition-all shadow-xs ${
                                isDev
                                  ? 'bg-amber-500/10 border-amber-500/30'
                                  : 'bg-emerald-500/10 border-emerald-500/30'
                              }`}>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono font-extrabold text-[10px] text-white truncate max-w-[70px]" title={appVersion.current_version}>
                                    {appVersion.current_version}
                                  </span>
                                  <span className={`px-1 py-0.2 rounded text-[7.5px] font-black uppercase border shrink-0 ${
                                    isDev
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  }`}>
                                    {isDev ? 'DEV' : 'REL'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[8px] text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${appVersion.status === 'active' ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                                    <span>{appVersion.status === 'active' ? 'Running' : 'Stopped'}</span>
                                  </span>
                                  {appVersion.updated_at && (
                                    <span className="text-[7.5px] text-slate-500 font-mono">
                                      {new Date(appVersion.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="p-1.5 rounded-lg bg-slate-900/30 border border-slate-800/40 text-center text-[9px] text-slate-600 font-mono">
                                <span>—</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
