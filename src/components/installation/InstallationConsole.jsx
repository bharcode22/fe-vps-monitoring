import React from 'react';
import { Terminal, Copy, Check, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

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
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-6">
      {/* Batch Summary Box */}
      <div className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md shadow-xl">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          {t('installation.summary.title', null, 'RINGKASAN PEMETAAN CONFIG BATCH')} ({activeTab.toUpperCase()})
        </h3>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400">{t('installation.summary.targetServer', null, 'Server Target (POD v3):')}</span>
            <span className="font-bold text-white font-mono">{currentServerIds.length} Server</span>
          </div>
          <div className="flex justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400">{t('installation.summary.selectedApps', null, 'Aplikasi Terpilih:')}</span>
            <span className={`font-bold font-mono ${activeTab === 'backend' ? 'text-cyan-400' : 'text-purple-400'}`}>
              {currentAppIds.length} Apps
            </span>
          </div>
          <div className="flex justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400">{t('installation.summary.environment', null, 'Environment:')}</span>
            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${(activeTab === 'backend' ? env : feEnv) === 'dev' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'
              }`}>
              {(activeTab === 'backend' ? env : feEnv).toUpperCase()}
            </span>
          </div>

          {/* Per-App Config Summary */}
          <div className="pt-1">
            <span className="text-slate-400 text-[11px] font-bold block mb-1.5 uppercase">
              {t('installation.summary.configDetail', null, 'DETAIL CONFIG PER APP:')}
            </span>
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

      {/* Real-time Streaming Terminal Console */}
      <div className="glass-card rounded-2xl border border-slate-800 bg-slate-950/90 shadow-2xl flex flex-col overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal size={15} className="text-cyan-400" />
            <span className="text-xs font-bold text-white tracking-wide">
              {t('installation.summary.consoleLog', null, 'Jenkins Console Log')}
            </span>
          </div>

          <button
            onClick={onCopyLogs}
            disabled={batchLogs.length === 0}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-30"
            title="Salin seluruh log"
          >
            {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>

        {/* Server Filter Tabs for Log Stream */}
        {targetServersList.length > 1 && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-black/40 border-b border-slate-800/80 overflow-x-auto">
            <button
              onClick={() => setActiveLogFilter('ALL')}
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${activeLogFilter === 'ALL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              {t('installation.summary.allLogs', null, 'Semua Log')}
            </button>
            {targetServersList.map(srv => (
              <button
                key={srv.id}
                onClick={() => setActiveLogFilter(srv.name)}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono transition-all cursor-pointer truncate max-w-[120px] ${activeLogFilter === srv.name
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                {srv.name}
              </button>
            ))}
          </div>
        )}

        {/* Terminal Content Box */}
        <div className="p-4 h-72 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1 text-slate-300 selection:bg-cyan-500/30">
          {batchLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-600 italic text-center p-4">
              {t('installation.summary.consolePlaceholder', null, 'Konsol log Jenkins WebSockets akan tampil di sini saat pipeline dijalankan.')}
            </div>
          ) : (
            filteredLogs.map((line, idx) => {
              const isError = line.includes('❌') || line.includes('ERROR') || line.includes('ERR!');
              const isSuccess = line.includes('✅') || line.includes('SUCCESS') || line.includes('DONE');
              const isStage = line.includes('[STAGE:') || line.includes('⚡');
              return (
                <div
                  key={idx}
                  className={`break-all ${isError
                      ? 'text-rose-400 bg-rose-500/10 px-1 rounded'
                      : isSuccess
                        ? 'text-emerald-300'
                        : isStage
                          ? 'text-cyan-300 font-bold'
                          : 'text-slate-300'
                    }`}
                >
                  {line}
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
