import React from 'react';
import {
  Package,
  Server,
  Cpu,
  Tv,
  Play,
  ArrowLeft,
  Sparkles,
  Check,
  FileCode,
  Database,
  Layers,
  Box,
  CheckSquare,
  Square,
  RefreshCw,
  Info
} from 'lucide-react';
import { POD_APPS, FRONTEND_APPS } from './constants';

export default function BundleDeploymentTab({
  activeBundle,
  onBackToBundles,
  podV3Servers = [],
  selectedServerIds = [],
  setSelectedServerIds,
  toggleServerSelect,
  // 5 Backend States
  backendConfigs = {},
  setBackendConfigs,
  // 2 Frontend States
  frontendConfigs = {},
  setFrontendConfigs,
  // Environment Files
  envFiles = [],
  isEnvLoading,
  isDeploying,
  onStartDeploy
}) {
  const isDev = activeBundle?.environment === 'dev';

  // Toggle app selection in bundle
  const toggleBackendAppActive = (appId) => {
    setBackendConfigs(prev => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        enabled: !prev[appId]?.enabled
      }
    }));
  };

  const toggleFrontendAppActive = (appId) => {
    setFrontendConfigs(prev => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        enabled: !prev[appId]?.enabled
      }
    }));
  };

  // Bulk toggles for backend
  const setAllBackend = (enabled) => {
    setBackendConfigs(prev => {
      const next = { ...prev };
      POD_APPS.forEach(app => {
        next[app.id] = { ...next[app.id], enabled };
      });
      return next;
    });
  };

  // Bulk toggles for frontend
  const setAllFrontend = (enabled) => {
    setFrontendConfigs(prev => {
      const next = { ...prev };
      FRONTEND_APPS.forEach(app => {
        next[app.id] = { ...next[app.id], enabled };
      });
      return next;
    });
  };

  // Calculate active apps count
  const activeBackendCount = POD_APPS.filter(app => backendConfigs[app.id]?.enabled !== false).length;
  const activeFrontendCount = FRONTEND_APPS.filter(app => frontendConfigs[app.id]?.enabled !== false).length;
  const totalActiveApps = activeBackendCount + activeFrontendCount;
  const totalTasks = selectedServerIds.length * totalActiveApps;

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      {/* 1. Active Bundle Top Banner */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
          isDev
            ? 'border-amber-500/30 bg-gradient-to-r from-slate-950 via-amber-950/20 to-slate-950'
            : 'border-emerald-500/30 bg-gradient-to-r from-slate-950 via-emerald-950/20 to-slate-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3 rounded-xl border shadow-md shrink-0 ${
                isDev
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              <Package size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    isDev
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {activeBundle?.environment || 'dev'}
                </span>
                <h2 className="text-base sm:text-lg font-black text-white">
                  {activeBundle?.bundle_name || 'Bundle Suite'}
                </h2>
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
                  v{activeBundle?.bundle_version || '3.2.0'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {activeBundle?.description || 'Paket deployment 7 aplikasi (5 Backend Microservices + 2 Layar Frontend)'}
              </p>
            </div>
          </div>

          <button
            onClick={onBackToBundles}
            className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-2 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer shrink-0 shadow-sm"
          >
            <ArrowLeft size={14} />
            <span>Ganti Resep Bundle</span>
          </button>
        </div>
      </div>

      {/* 2. Step 1: Pilih Server POD Target (Khusus POD v3) */}
      <div className="glass-card p-4 sm:p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <Server size={17} className="text-cyan-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              1. Pilih Server POD Target (Khusus POD v3)
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              {selectedServerIds.length} / {podV3Servers.length} Terpilih
            </span>
          </div>

          {podV3Servers.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedServerIds(podV3Servers.map(s => String(s.id)))}
                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition-colors cursor-pointer"
              >
                Pilih Semua ({podV3Servers.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedServerIds([])}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {podV3Servers.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 text-center">
            Tidak ada unit POD v3 yang terdaftar.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {podV3Servers.map(server => {
              const isSelected = selectedServerIds.includes(String(server.id));
              return (
                <div
                  key={server.id}
                  onClick={() => toggleServerSelect(server.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                    isSelected
                      ? 'bg-gradient-to-b from-cyan-500/20 to-sky-500/10 border-cyan-500/60 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-xs text-white truncate" title={server.name}>
                      {server.name}
                    </span>
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-cyan-500 text-slate-950' : 'border border-slate-700'
                    }`}>
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span className="truncate">{server.host}</span>
                    {server.code && (
                      <span className="px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-300 font-bold shrink-0 ml-1">
                        #{server.code}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Step 2: Konfigurasi Aplikasi Deployment (Backend & Frontend) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Section A: 5 Microservices Backend (7 cols on lg/xl screens) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-sky-500/20 bg-slate-900/60 backdrop-blur-md shadow-xl flex-1 flex flex-col">
            {/* Section Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  <Cpu size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    A. 5 Microservices Backend
                  </h3>
                  <span className="text-[10px] text-slate-400">Docker Container Services</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded-full border border-sky-500/30">
                  {activeBackendCount} / 5 Aktif
                </span>
                <button
                  type="button"
                  onClick={() => setAllBackend(activeBackendCount < 5)}
                  className="text-[10.5px] font-semibold text-slate-400 hover:text-white px-2 py-0.5 rounded-md hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
                >
                  {activeBackendCount < 5 ? 'Pilih Semua' : 'Batal'}
                </button>
              </div>
            </div>

            {/* Backend Apps List (Spacious Two-Tier Cards) */}
            <div className="flex flex-col gap-2.5 flex-1">
              {POD_APPS.map(app => {
                const cfg = backendConfigs[app.id] || { enabled: true, version: '', env_filename: '', run_prisma_migrate: false };
                const isEnabled = cfg.enabled !== false;

                return (
                  <div
                    key={app.id}
                    className={`rounded-xl border transition-all p-3 ${
                      isEnabled
                        ? 'bg-slate-950/80 border-sky-500/30 shadow-md shadow-sky-950/10'
                        : 'bg-slate-950/30 border-slate-800/60 opacity-50'
                    }`}
                  >
                    {/* Top Tier: Checkbox + Name + Version Badge */}
                    <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/60">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none min-w-0">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => toggleBackendAppActive(app.id)}
                          className="w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700 cursor-pointer accent-sky-500 shrink-0"
                        />
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`font-bold text-xs truncate ${isEnabled ? 'text-white' : 'text-slate-400'}`}>
                            {app.label}
                          </span>
                          <span className="text-[9px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 shrink-0">
                            {app.id}
                          </span>
                        </div>
                      </label>

                      {/* Version Pill */}
                      <span
                        className="font-mono text-[10.5px] font-bold text-sky-300 bg-sky-950/90 px-2 py-0.5 rounded-md border border-sky-500/30 shrink-0"
                        title={cfg.version || 'dev-latest'}
                      >
                        {cfg.version || 'dev-latest'}
                      </span>
                    </div>

                    {/* Bottom Tier: Controls (Env selector + Prisma toggle) */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-0.5">
                      {/* Env Selector */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-[140px] bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                        <FileCode size={13} className="text-amber-400 shrink-0" />
                        <span className="text-[10px] text-slate-400 shrink-0">Env:</span>
                        <select
                          disabled={!isEnabled}
                          value={cfg.env_filename || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBackendConfigs(prev => ({
                              ...prev,
                              [app.id]: { ...prev[app.id], env_filename: val }
                            }));
                          }}
                          className="w-full bg-transparent text-[10.5px] text-amber-300 font-mono focus:outline-none cursor-pointer disabled:opacity-40"
                          title="File .env backend"
                        >
                          <option value="" className="bg-slate-900 text-slate-400">(.env Server Default)</option>
                          {envFiles.map((f, idx) => {
                            const fname = typeof f === 'string' ? f : (f.name || f.filename || `env-${idx}`);
                            return (
                              <option key={fname} value={fname} className="bg-slate-900 text-amber-300">
                                {fname}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Prisma Migration Toggle */}
                      <button
                        type="button"
                        disabled={!isEnabled}
                        onClick={() => {
                          setBackendConfigs(prev => ({
                            ...prev,
                            [app.id]: { ...prev[app.id], run_prisma_migrate: !cfg.run_prisma_migrate }
                          }));
                        }}
                        className={`flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg border text-[10.5px] font-bold transition-all cursor-pointer shrink-0 ${
                          cfg.run_prisma_migrate
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/10'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                        } ${!isEnabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                        title="Jalankan npx prisma migrate dev"
                      >
                        <Database size={12} className={cfg.run_prisma_migrate ? 'text-emerald-400' : 'text-slate-500'} />
                        <span>{cfg.run_prisma_migrate ? 'Prisma: Migrate' : 'No Migrate'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section B: 2 Layar Frontend Screen Apps (5 cols on lg/xl screens) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-purple-500/20 bg-slate-900/60 backdrop-blur-md shadow-xl flex-1 flex flex-col">
            {/* Section Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  <Tv size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    B. 2 Layar Frontend
                  </h3>
                  <span className="text-[10px] text-slate-400">Debian .deb Application Packages</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30">
                  {activeFrontendCount} / 2 Aktif
                </span>
                <button
                  type="button"
                  onClick={() => setAllFrontend(activeFrontendCount < 2)}
                  className="text-[10.5px] font-semibold text-slate-400 hover:text-white px-2 py-0.5 rounded-md hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
                >
                  {activeFrontendCount < 2 ? 'Pilih Semua' : 'Batal'}
                </button>
              </div>
            </div>

            {/* Frontend Apps List */}
            <div className="flex flex-col gap-2.5">
              {FRONTEND_APPS.map(app => {
                const cfg = frontendConfigs[app.id] || { enabled: true, version: '' };
                const isEnabled = cfg.enabled !== false;

                return (
                  <div
                    key={app.id}
                    className={`rounded-xl border transition-all p-3.5 ${
                      isEnabled
                        ? 'bg-slate-950/80 border-purple-500/30 shadow-md shadow-purple-950/10'
                        : 'bg-slate-950/30 border-slate-800/60 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/60">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none min-w-0">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => toggleFrontendAppActive(app.id)}
                          className="w-4 h-4 rounded text-purple-500 bg-slate-900 border-slate-700 cursor-pointer accent-purple-500 shrink-0"
                        />
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`font-bold text-xs truncate ${isEnabled ? 'text-white' : 'text-slate-400'}`}>
                            {app.label}
                          </span>
                          <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 shrink-0">
                            {app.id}
                          </span>
                        </div>
                      </label>

                      {/* Version Pill */}
                      <span
                        className="font-mono text-[10.5px] font-bold text-purple-300 bg-purple-950/90 px-2 py-0.5 rounded-md border border-purple-500/30 shrink-0"
                        title={cfg.version || '0.0.0'}
                      >
                        {cfg.version || '0.0.0'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1.5">
                        <Package size={12} className="text-purple-400" />
                        <span>Debian Package (.deb)</span>
                      </span>
                      <span className="text-[9.5px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        sudo dpkg -i
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info Hint Box */}
            <div className="mt-4 p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-[11px] text-purple-300 flex items-start gap-2.5">
              <Info size={15} className="shrink-0 text-purple-400 mt-0.5" />
              <span className="leading-relaxed">
                Frontend Screen Apps akan di-deploy menggunakan sistem Debian package (.deb) melalui MinIO Screen-Apps repository.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Step 3: Full-Width Pipeline Execution Summary & Action Trigger Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 border border-cyan-500/30 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Left: Summary Metrics */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="font-black text-white text-xs uppercase tracking-wider">
                Ringkasan Pipeline Eksekusi
              </h4>
              <div className="flex items-center gap-2 sm:gap-3 mt-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                  Target POD: <strong className="text-cyan-300 font-mono">{selectedServerIds.length} Unit</strong>
                </span>
                <span className="text-[11px] text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                  Aplikasi: <strong className="text-white font-mono">{totalActiveApps}/7</strong> ({activeBackendCount} BE + {activeFrontendCount} FE)
                </span>
                <span className="text-[11px] text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                  Total Tugas: <strong className="text-cyan-300 font-mono">{totalTasks} Pipeline</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Deploy Button */}
          <div className="shrink-0 flex items-center">
            <button
              type="button"
              onClick={onStartDeploy}
              disabled={isDeploying || selectedServerIds.length === 0 || totalActiveApps === 0}
              className="w-full lg:w-auto min-w-[240px] py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isDeploying ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Sedang Menjalankan Pipeline...</span>
                </>
              ) : (
                <>
                  <Play size={16} className="fill-white" />
                  <span>Mulai Deployment ({totalActiveApps} Apps, {selectedServerIds.length} POD)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
