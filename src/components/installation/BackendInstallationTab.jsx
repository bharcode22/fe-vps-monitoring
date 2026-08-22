import React from 'react';
import {
  Server,
  Box,
  FileCode,
  CheckSquare,
  Square,
  AlertTriangle,
  RefreshCw,
  Play
} from 'lucide-react';
import { POD_APPS } from './constants';

export default function BackendInstallationTab({
  podV3Servers,
  selectedServerIds,
  setSelectedServerIds,
  toggleServerSelect,
  selectedAppIds,
  setSelectedAppIds,
  toggleAppSelect,
  env,
  setEnv,
  appVersionsMap,
  selectedAppVersions,
  setSelectedAppVersions,
  isAppVersionsLoadingMap,
  appEnvMapping,
  setAppEnvMapping,
  appPrismaMapping,
  setAppPrismaMapping,
  envFiles,
  isEnvLoading,
  isDeploying,
  onStartDeploy,
  totalBatchCombinations
}) {
  return (
    <>
      {/* Step 1: Select Target POD v3 Servers */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Server size={18} className="text-cyan-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              1. Pilih Server POD Target (Khusus POD v3)
            </h3>
          </div>

          {podV3Servers.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedServerIds(podV3Servers.map(s => String(s.id)))}
                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition-colors cursor-pointer"
              >
                Pilih Semua ({podV3Servers.length})
              </button>
              <button
                onClick={() => setSelectedServerIds([])}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-200 bg-slate-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Hapus Semua
              </button>
            </div>
          )}
        </div>

        {podV3Servers.length === 0 ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>Belum ada server berkategori <strong>POD v3</strong> (`pod_version === 'v3'`) di database.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {podV3Servers.map(srv => {
              const isSelected = selectedServerIds.includes(String(srv.id));
              return (
                <div
                  key={srv.id}
                  onClick={() => toggleServerSelect(String(srv.id))}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${isSelected
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                >
                  <div className={`p-1 rounded-md ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-white">{srv.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        POD V3
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {srv.host}:{srv.port || 22}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 2: Select Backend Apps & Environment */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Box size={18} className="text-cyan-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              2. Pilih Aplikasi Backend POD & Environment
            </h3>
          </div>

          <div className="flex items-center bg-black/50 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setEnv('dev')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${env === 'dev'
                  ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-400 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              DEV
            </button>
            <button
              onClick={() => setEnv('release')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${env === 'release'
                  ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-400 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              RELEASE
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400 font-medium">Pilih aplikasi backend yang akan di-install:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedAppIds(POD_APPS.map(a => a.id))}
              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition-colors cursor-pointer"
            >
              Pilih Semua Apps
            </button>
            <button
              onClick={() => setSelectedAppIds([])}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-200 bg-slate-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Hapus Semua
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {POD_APPS.map(app => {
            const isSelected = selectedAppIds.includes(app.id);
            return (
              <div
                key={app.id}
                onClick={() => toggleAppSelect(app.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${isSelected
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/50 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
              >
                <div className={`p-1 rounded-md ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`}>
                  {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <div className="flex-1">
                  <div className="font-extrabold text-xs text-cyan-300">{app.label}</div>
                  <div className="text-[10px] text-slate-400">{app.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-black/40 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Target MinIO Paths:</span>
          <span className="font-mono text-cyan-400 font-semibold truncate max-w-[300px]">
            deploybox/ [{selectedAppIds.join(', ')}] /{env}/
          </span>
        </div>
      </div>

      {/* Step 3: Config for each selected backend app */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileCode size={18} className="text-cyan-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              3. Konfigurasi Versi MinIO, .env & Prisma Migration Per App
            </h3>
          </div>

          {isEnvLoading && (
            <span className="text-xs text-cyan-400 flex items-center gap-1.5 font-medium">
              <RefreshCw size={12} className="animate-spin" /> Memuat data...
            </span>
          )}
        </div>

        {selectedAppIds.length === 0 ? (
          <div className="text-xs text-amber-400 italic p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
            Pilih setidaknya 1 aplikasi pada Step 2 untuk mengonfigurasi.
          </div>
        ) : (
          <div className="space-y-3.5">
            {selectedAppIds.map(appId => {
              const appObj = POD_APPS.find(a => a.id === appId);
              const label = appObj ? appObj.label : appId;
              const minioFolder = appId === 'mobile-consume' ? 'mobile-consumer' : appId;

              const appVersions = appVersionsMap[appId] || [];
              const currentVersion = selectedAppVersions[appId] || '';
              const isLoadingVersions = Boolean(isAppVersionsLoadingMap[appId]);

              const currentEnvFile = appEnvMapping[appId] || '';
              const isPrismaActive = Boolean(appPrismaMapping[appId]);

              return (
                <div key={appId} className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col gap-3.5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                        <Box size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-white">{label}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          deploybox/{minioFolder}/{env}/
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setAppPrismaMapping(prev => ({ ...prev, [appId]: !prev[appId] }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${isPrismaActive
                          ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-400 border border-cyan-500/40 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                        }`}
                    >
                      {isPrismaActive ? <CheckSquare size={15} /> : <Square size={15} />}
                      <span>Prisma Migrate</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Versi Artefak MinIO ({label}):
                      </label>
                      <select
                        value={currentVersion}
                        onChange={(e) => setSelectedAppVersions(prev => ({ ...prev, [appId]: e.target.value }))}
                        disabled={isLoadingVersions || appVersions.length === 0}
                        className="w-full bg-slate-900 border border-cyan-500/30 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        {isLoadingVersions ? (
                          <option value="">Memuat versi MinIO...</option>
                        ) : appVersions.length === 0 ? (
                          <option value="">Tidak ada versi ditemukan</option>
                        ) : (
                          appVersions.map((ver, idx) => (
                            <option key={idx} value={ver}>
                              {ver} {idx === 0 ? '(Terbaru)' : ''}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        File .env (backend/envoirment):
                      </label>
                      <select
                        value={currentEnvFile}
                        onChange={(e) => setAppEnvMapping(prev => ({ ...prev, [appId]: e.target.value }))}
                        className="w-full bg-slate-900 border border-cyan-500/30 rounded-lg px-2.5 py-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value="">-- Tanpa File .env --</option>
                        {envFiles.map(f => (
                          <option key={f.name} value={f.name}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5">
          <button
            onClick={onStartDeploy}
            disabled={isDeploying || selectedServerIds.length === 0 || selectedAppIds.length === 0}
            className={`w-full py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${isDeploying || selectedServerIds.length === 0 || selectedAppIds.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-cyan-500/25'
              }`}
          >
            {isDeploying ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Mengeksekusi Jenkins CI/CD Backend Pipeline Stream...</span>
              </>
            ) : (
              <>
                <Play size={18} className="fill-slate-950" />
                <span>Jalankan Jenkins Pipeline Backend ({totalBatchCombinations} Target)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
