import React from 'react';
import {
  Server,
  Tv,
  FileCode,
  CheckSquare,
  Square,
  AlertTriangle,
  RefreshCw,
  Play
} from 'lucide-react';
import { FRONTEND_APPS } from './constants';

export default function FrontendInstallationTab({
  podV3Servers,
  feSelectedServerIds,
  setFeSelectedServerIds,
  toggleFeServerSelect,
  feSelectedAppIds,
  setFeSelectedAppIds,
  toggleFeAppSelect,
  feEnv,
  setFeEnv,
  feAppVersionsMap,
  feSelectedAppVersions,
  setFeSelectedAppVersions,
  isFeVersionsLoadingMap,
  isEnvLoading,
  isDeploying,
  onStartDeploy,
  totalBatchCombinations
}) {
  return (
    <>
      {/* Step 1: Select Target POD v3 Servers */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-purple-500/30 bg-slate-900/60 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Server size={18} className="text-purple-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              1. Pilih Server POD Target (Khusus POD v3)
            </h3>
          </div>

          {podV3Servers.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFeSelectedServerIds(podV3Servers.map(s => String(s.id)))}
                className="text-[11px] font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/30 transition-colors cursor-pointer"
              >
                Pilih Semua ({podV3Servers.length})
              </button>
              <button
                onClick={() => setFeSelectedServerIds([])}
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
              const isSelected = feSelectedServerIds.includes(String(srv.id));
              return (
                <div
                  key={srv.id}
                  onClick={() => toggleFeServerSelect(String(srv.id))}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-purple-500/50 text-white shadow-lg shadow-purple-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className={`p-1 rounded-md ${isSelected ? 'text-purple-400' : 'text-slate-600'}`}>
                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-white">{srv.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30">
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

      {/* Step 2: Select Frontend Screen Apps & Environment */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-purple-500/30 bg-slate-900/60 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Tv size={18} className="text-purple-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              2. Pilih Aplikasi Frontend Screen & Environment
            </h3>
          </div>

          <div className="flex items-center bg-black/50 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFeEnv('dev')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                feEnv === 'dev'
                  ? 'bg-gradient-to-r from-purple-500/30 to-indigo-500/30 text-purple-400 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              DEV
            </button>
            <button
              onClick={() => setFeEnv('release')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                feEnv === 'release'
                  ? 'bg-gradient-to-r from-pink-500/30 to-rose-500/30 text-pink-400 border border-pink-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              RELEASE
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400 font-medium">Pilih aplikasi frontend screen yang akan di-install:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFeSelectedAppIds(FRONTEND_APPS.map(a => a.id))}
              className="text-[11px] font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/30 transition-colors cursor-pointer"
            >
              Pilih Semua Apps ({FRONTEND_APPS.length})
            </button>
            <button
              onClick={() => setFeSelectedAppIds([])}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-200 bg-slate-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Hapus Semua
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {FRONTEND_APPS.map(app => {
            const isSelected = feSelectedAppIds.includes(app.id);
            return (
              <div
                key={app.id}
                onClick={() => toggleFeAppSelect(app.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-purple-500/50 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className={`p-1 rounded-md ${isSelected ? 'text-purple-400' : 'text-slate-600'}`}>
                  {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <div className="flex-1">
                  <div className="font-extrabold text-xs text-purple-300">{app.label}</div>
                  <div className="text-[10px] text-slate-400">{app.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-black/40 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Target MinIO Paths (Frontend Screen):</span>
          <span className="font-mono text-purple-400 font-semibold truncate max-w-[350px]">
            deploybox/ Screen-Apps/ [{feSelectedAppIds.map(id => `${id}-app`).join(', ')}] /{feEnv}/
          </span>
        </div>
      </div>

      {/* Step 3: Config MinIO Versions for selected frontend apps */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-purple-500/30 bg-slate-900/60 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileCode size={18} className="text-purple-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              3. Konfigurasi Versi MinIO Per Aplikasi Frontend Screen
            </h3>
          </div>

          {isEnvLoading && (
            <span className="text-xs text-purple-400 flex items-center gap-1.5 font-medium">
              <RefreshCw size={12} className="animate-spin" /> Memuat data...
            </span>
          )}
        </div>

        {feSelectedAppIds.length === 0 ? (
          <div className="text-xs text-amber-400 italic p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
            Pilih setidaknya 1 aplikasi frontend pada Step 2 untuk mengonfigurasi.
          </div>
        ) : (
          <div className="space-y-4">
            {feSelectedAppIds.map(appId => {
              const appObj = FRONTEND_APPS.find(a => a.id === appId);
              const label = appObj ? appObj.label : appId;
              const minioPathDisplay = `Screen-Apps/${appId}-app/${feEnv}/`;

              const appVersions = feAppVersionsMap[appId] || [];
              const currentVersion = feSelectedAppVersions[appId] || '';
              const isLoadingVersions = Boolean(isFeVersionsLoadingMap[appId]);

              return (
                <div key={appId} className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col gap-3.5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30">
                        <Tv size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-white">{label}</div>
                        <div className="text-[10px] text-purple-400 font-mono">
                          deploybox/{minioPathDisplay}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                      Debian Package (.deb)
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Versi Artefak MinIO ({label}):
                    </label>
                    <select
                      value={currentVersion}
                      onChange={(e) => setFeSelectedAppVersions(prev => ({ ...prev, [appId]: e.target.value }))}
                      disabled={isLoadingVersions || appVersions.length === 0}
                      className="w-full bg-slate-900 border border-purple-500/30 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-400 cursor-pointer"
                    >
                      {isLoadingVersions ? (
                        <option value="">Memuat versi MinIO...</option>
                      ) : appVersions.length === 0 ? (
                        <option value="">Tidak ada versi ditemukan di path {minioPathDisplay}</option>
                      ) : (
                        appVersions.map((ver, idx) => (
                          <option key={idx} value={ver}>
                            {ver} {idx === 0 ? '(Terbaru)' : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5">
          <button
            onClick={onStartDeploy}
            disabled={isDeploying || feSelectedServerIds.length === 0 || feSelectedAppIds.length === 0}
            className={`w-full py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
              isDeploying || feSelectedServerIds.length === 0 || feSelectedAppIds.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-purple-500/25'
            }`}
          >
            {isDeploying ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Mengeksekusi Jenkins CI/CD Frontend Pipeline Stream...</span>
              </>
            ) : (
              <>
                <Play size={18} className="fill-white" />
                <span>Jalankan Jenkins Pipeline Frontend ({totalBatchCombinations} Target)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
