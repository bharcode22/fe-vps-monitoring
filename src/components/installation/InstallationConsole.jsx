import React from 'react';
import { Terminal, Copy, Check, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function InstallationConsole({
  activeTab,
  currentServerIds,
  currentAppIds,
  env,
  feEnv,
  selectedAppVersions,
  feSelectedAppVersions,
  appEnvMapping,
  appPrismaMapping,
  batchLogs,
  filteredLogs,
  batchSummary,
  activeLogFilter,
  setActiveLogFilter,
  targetServersList,
  isDeploying,
  isCopied,
  onCopyLogs,
  terminalEndRef
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Batch Summary Box */}
      <div className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md shadow-xl">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Ringkasan Pemetaan Config Batch ({activeTab.toUpperCase()})
        </h3>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400">Server Target (POD v3):</span>
            <span className="font-bold text-white font-mono">{currentServerIds.length} Server</span>
          </div>
          <div className="flex justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400">Aplikasi Terpilih:</span>
            <span className={`font-bold font-mono ${activeTab === 'backend' ? 'text-cyan-400' : 'text-purple-400'}`}>
              {currentAppIds.length} Apps
            </span>
          </div>
          <div className="flex justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400">Environment:</span>
            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${(activeTab === 'backend' ? env : feEnv) === 'dev' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'
              }`}>
              {(activeTab === 'backend' ? env : feEnv).toUpperCase()}
            </span>
          </div>

          {/* Per-App Config Summary */}
          <div className="pt-1">
            <span className="text-slate-400 text-[11px] font-bold block mb-1.5 uppercase">Detail Config Per App:</span>
            {currentAppIds.length === 0 ? (
              <span className="text-slate-500 italic">Belum ada app dipilih</span>
            ) : (
              <div className="space-y-2">
                {currentAppIds.map(appId => {
                  let rawVer = (activeTab === 'backend' ? selectedAppVersions[appId] : feSelectedAppVersions[appId]);
                  if (rawVer && typeof rawVer === 'object') {
                    rawVer = rawVer.version || rawVer.name || '';
                  }
                  const ver = typeof rawVer === 'string' && rawVer ? rawVer : 'Belum dipilih';

                  const isDeb = appId === 'small-screen' || appId === 'big-screen';
                  const envFile = !isDeb ? (appEnvMapping[appId] || null) : null;
                  const isPrisma = !isDeb ? Boolean(appPrismaMapping[appId]) : false;

                  return (
                    <div key={appId} className="bg-black/40 p-2 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className={isDeb ? 'text-purple-400' : 'text-cyan-400'}>{appId}</span>
                        {isDeb ? (
                          <span className="text-[10px] px-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                            DEBIAN PKG
                          </span>
                        ) : (
                          <span className={`text-[10px] px-1 rounded ${isPrisma ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-600'}`}>
                            {isPrisma ? 'PRISMA' : 'NO-MIGRATE'}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Versi:</span>
                        <span className="text-white font-bold truncate max-w-[150px]" title={ver}>{ver}</span>
                      </div>
                      {envFile && (
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">Env:</span>
                          <span className="text-amber-300 truncate max-w-[150px]" title={envFile}>{envFile}</span>
                        </div>
                      )}
                      {activeTab === 'frontend' && (
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">MinIO:</span>
                          <span className="text-purple-300 truncate max-w-[150px]">Screen-Apps/{appId}-app</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Jenkins Console Terminal Drawer Box */}
      <div className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-slate-950/90 shadow-2xl flex flex-col flex-1 min-h-[620px] lg:min-h-[780px] justify-between">
        <div className="flex flex-col flex-1">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal size={16} className={activeTab === 'backend' ? 'text-cyan-400' : 'text-purple-400'} />
              <span className="text-xs font-bold text-slate-300">Jenkins Console Log</span>
              {batchLogs.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                  {filteredLogs.length} baris
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {batchLogs.length > 0 && (
                <button
                  onClick={onCopyLogs}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
                  title="Copy Console Log"
                >
                  {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Log Filter Buttons */}
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveLogFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${activeLogFilter === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
            >
              Semua Log
            </button>
            {targetServersList.map(srv => (
              <button
                key={srv.id}
                onClick={() => setActiveLogFilter(srv.name)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${activeLogFilter === srv.name
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
              >
                {srv.name}
              </button>
            ))}
          </div>

          {batchSummary && (
            <div className={`p-3 mb-3 rounded-xl text-xs flex items-center gap-2 ${batchSummary.totalFail === 0
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
              }`}>
              {batchSummary.totalFail === 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>
                Jenkins Build Selesai: {batchSummary.totalSuccess} Tugas Sukses, {batchSummary.totalFail} Gagal.
              </span>
            </div>
          )}

          {/* Console Output Screen */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 flex-1 min-h-[480px] lg:min-h-[600px] max-h-[850px] overflow-y-auto space-y-1 scrollbar-thin">
            {filteredLogs.length === 0 && !isDeploying ? (
              <div className="text-slate-500 italic text-center py-24">
                Konsol log Jenkins WebSockets akan tampil di sini saat pipeline dijalankan.
              </div>
            ) : null}

            {filteredLogs.map((logLine, idx) => (
              <div
                key={idx}
                className={
                  logLine.includes('❌')
                    ? 'text-red-400 font-bold'
                    : logLine.includes('✔')
                      ? 'text-emerald-400 font-bold'
                      : logLine.includes('>>>')
                        ? 'text-cyan-300 font-bold mt-2'
                        : logLine.includes('[JENKINS_STAGE:')
                          ? 'hidden'
                          : 'text-slate-300'
                }
              >
                {logLine}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        </div>

        <div className="mt-3 text-[10px] text-slate-500 text-center">
          Jenkins CI/CD Stage Engine powered by WebSockets & Parallel MinIO Downloader
        </div>
      </div>
    </div>
  );
}
