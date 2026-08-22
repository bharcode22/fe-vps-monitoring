import React from 'react';
import {
  Package,
  Server,
  Layers,
  Cpu,
  Tv,
  Play,
  ArrowLeft,
  Sparkles,
  Check,
  HardDrive,
  FileCode,
  Database
} from 'lucide-react';
import { POD_APPS, FRONTEND_APPS } from './constants';

export default function BundleDeploymentTab({
  activeBundle,
  onBackToBundles,
  podV3Servers,
  selectedServerIds,
  setSelectedServerIds,
  toggleServerSelect,
  // 5 Backend States
  backendConfigs,
  setBackendConfigs,
  // 2 Frontend States
  frontendConfigs,
  setFrontendConfigs,
  // Environment Files
  envFiles,
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
  const activeBackendCount = Object.values(backendConfigs || {}).filter(c => c?.enabled !== false).length;
  const activeFrontendCount = Object.values(frontendConfigs || {}).filter(c => c?.enabled !== false).length;
  const totalActiveApps = activeBackendCount + activeFrontendCount;
  const totalTasks = selectedServerIds.length * totalActiveApps;

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      {/* 1. Active Bundle Top Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl border shadow-xl relative overflow-hidden ${
        isDev
          ? 'border-amber-500/30 bg-gradient-to-r from-slate-950 via-amber-950/20 to-slate-950'
          : 'border-emerald-500/30 bg-gradient-to-r from-slate-950 via-emerald-950/20 to-slate-950'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border shadow-md ${
              isDev
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            }`}>
              <Package size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                  isDev
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {activeBundle?.environment || 'dev'}
                </span>
                <h2 className="text-sm sm:text-base font-black text-white">
                  {activeBundle?.bundle_name || 'Bundle Suite'}
                </h2>
                <span className="text-xs font-mono font-bold text-slate-400">
                  (v{activeBundle?.bundle_version || '3.2.0'})
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                {activeBundle?.description || 'Paket deployment 7 aplikasi (5 Backend Microservices + 2 Layar Frontend)'}
              </p>
            </div>
          </div>

          <button
            onClick={onBackToBundles}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft size={13} />
            <span>Ganti Resep Bundle</span>
          </button>
        </div>
      </div>

      {/* 2. Step 1: Select Target POD v3 Servers */}
      <div className="glass-card p-4 sm:p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Server size={16} className="text-cyan-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              1. Pilih Server POD Target (Khusus POD v3)
            </h3>
          </div>

          {podV3Servers.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedServerIds(podV3Servers.map(s => String(s.id)))}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/30 transition-colors cursor-pointer"
              >
                Pilih Semua ({podV3Servers.length})
              </button>
              <button
                onClick={() => setSelectedServerIds([])}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-slate-800 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {podV3Servers.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 text-center">
            Tidak ada unit POD v3 yang terdaftar.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {podV3Servers.map(server => {
              const isSelected = selectedServerIds.includes(String(server.id));
              return (
                <div
                  key={server.id}
                  onClick={() => toggleServerSelect(server.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/60 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-extrabold text-[11px] text-white truncate" title={server.name}>
                      {server.name}
                    </span>
                    {server.code && (
                      <span className="px-1 py-0.1 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[8.5px] font-bold shrink-0">
                        #{server.code}
                      </span>
                    )}
                  </div>
                  <div className="text-[9.5px] text-slate-400 font-mono truncate">{server.host}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Step 2 & 3: 2-Column Responsive Layout (Clean & Uncluttered) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Column (7 cols): 5 Microservices Backend */}
        <div className="xl:col-span-7 flex flex-col gap-3">
          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-sky-500/20 bg-slate-900/60 backdrop-blur-md shadow-xl flex-1">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-sky-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  A. 5 Microservices Backend (Docker)
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded-md border border-sky-500/30">
                  {activeBackendCount}/5 Aktif
                </span>
                <button
                  type="button"
                  onClick={() => setAllBackend(activeBackendCount < 5)}
                  className="text-[10px] font-semibold text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {activeBackendCount < 5 ? 'Pilih Semua' : 'Batal'}
                </button>
              </div>
            </div>

            {/* Compact Backend Rows */}
            <div className="space-y-2">
              {POD_APPS.map(app => {
                const cfg = backendConfigs[app.id] || { enabled: true, version: '', env_filename: '', run_prisma_migrate: false };
                const isEnabled = cfg.enabled !== false;

                return (
                  <div
                    key={app.id}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isEnabled
                        ? 'bg-slate-950/90 border-sky-500/30 shadow-sm'
                        : 'bg-slate-950/30 border-slate-800/60 opacity-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      {/* Left: Checkbox + Title */}
                      <div className="flex items-center gap-2.5 min-w-[170px]">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => toggleBackendAppActive(app.id)}
                          className="w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700 cursor-pointer accent-sky-500 shrink-0"
                        />
                        <div>
                          <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                            <span>{app.label}</span>
                            <span className="text-[8.5px] font-mono text-sky-400 bg-sky-500/10 px-1 py-0.1 rounded border border-sky-500/20">
                              {app.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Version + Env + Prisma Controls */}
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                        {/* Version Pill */}
                        <span className="font-mono text-[10.5px] font-bold text-sky-300 bg-sky-950/80 px-2 py-1 rounded-lg border border-sky-500/30 truncate max-w-[130px]" title={cfg.version}>
                          {cfg.version || 'dev-latest'}
                        </span>

                        {/* Env File Dropdown */}
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
                          className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10.5px] text-amber-300 font-mono focus:outline-none focus:border-sky-500/50 cursor-pointer disabled:opacity-40 max-w-[130px]"
                          title="File .env backend"
                        >
                          <option value="">(.env Server)</option>
                          {envFiles.map((f, idx) => {
                            const fname = typeof f === 'string' ? f : (f.name || f.filename || `env-${idx}`);
                            return (
                              <option key={fname} value={fname}>
                                {fname}
                              </option>
                            );
                          })}
                        </select>

                        {/* Prisma Toggle Chip */}
                        <label
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                            cfg.run_prisma_migrate
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm'
                              : 'bg-slate-900/80 border-slate-800 text-slate-500 hover:text-slate-400'
                          } ${!isEnabled ? 'opacity-40 pointer-events-none' : ''}`}
                          title="Jalankan npx prisma migrate dev"
                        >
                          <input
                            type="checkbox"
                            disabled={!isEnabled}
                            checked={Boolean(cfg.run_prisma_migrate)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setBackendConfigs(prev => ({
                                ...prev,
                               [app.id]: { ...prev[app.id], run_prisma_migrate: checked }
                              }));
                            }}
                            className="hidden"
                          />
                          <Database size={10} />
                          <span>{cfg.run_prisma_migrate ? 'Migrate' : 'No Mig'}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): 2 Screen Apps + Execution Hero Card */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          {/* Section B: 2 Frontend Screen Applications */}
          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-purple-500/20 bg-slate-900/60 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2">
                <Tv size={16} className="text-purple-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  B. 2 Layar Frontend (Debian .deb)
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-md border border-purple-500/30">
                  {activeFrontendCount}/2 Aktif
                </span>
                <button
                  type="button"
                  onClick={() => setAllFrontend(activeFrontendCount < 2)}
                  className="text-[10px] font-semibold text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {activeFrontendCount < 2 ? 'Pilih Semua' : 'Batal'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {FRONTEND_APPS.map(app => {
                const cfg = frontendConfigs[app.id] || { enabled: true, version: '' };
                const isEnabled = cfg.enabled !== false;

                return (
                  <div
                    key={app.id}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isEnabled
                        ? 'bg-slate-950/90 border-purple-500/30 shadow-sm'
                        : 'bg-slate-950/30 border-slate-800/60 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => toggleFrontendAppActive(app.id)}
                          className="w-4 h-4 rounded text-purple-500 bg-slate-900 border-slate-700 cursor-pointer accent-purple-500 shrink-0"
                        />
                        <div>
                          <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                            <span>{app.label}</span>
                            <span className="text-[8.5px] font-mono text-purple-400 bg-purple-500/10 px-1 py-0.1 rounded border border-purple-500/20">
                              {app.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10.5px] font-bold text-purple-300 bg-purple-950/80 px-2 py-1 rounded-lg border border-purple-500/30 truncate max-w-[130px]" title={cfg.version}>
                          {cfg.version || '0.0.0'}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1.5 py-1 rounded border border-slate-800 hidden sm:inline">
                          dpkg -i
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section C: Summary & Deployment Action Trigger */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/60 via-slate-950 to-blue-950/60 border border-cyan-500/40 shadow-2xl flex-1 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                  <Sparkles size={16} />
                </div>
                <h4 className="font-black text-white text-xs uppercase tracking-wider">
                  Ringkasan Pipeline Eksekusi
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-2 my-3 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Target POD v3:</span>
                  <span className="font-mono font-black text-cyan-300 text-xs">
                    {selectedServerIds.length} Unit
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Aplikasi Terpilih:</span>
                  <span className="font-mono font-black text-white text-xs">
                    {totalActiveApps} / 7 Apps
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-black/40 p-2.5 rounded-xl border border-slate-800/80 font-mono">
                Total Tugas: <span className="text-cyan-300 font-bold">{totalTasks} Tugas Pipeline</span>
              </div>
            </div>

            <button
              onClick={onStartDeploy}
              disabled={isDeploying || selectedServerIds.length === 0 || totalActiveApps === 0}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={15} className="fill-white" />
              <span>
                {isDeploying
                  ? 'Sedang Menjalankan Pipeline...'
                  : `🚀 Mulai Deployment Bundle (${totalActiveApps} Aplikasi)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
