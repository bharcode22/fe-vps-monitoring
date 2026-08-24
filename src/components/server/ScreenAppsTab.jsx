import React, { useState, useEffect } from 'react';
import { Tv, RefreshCw, CheckCircle2, XCircle, Monitor, RotateCcw, Square, Terminal, AlertCircle, Copy, Check, X } from 'lucide-react';
import { fetchScreenAppsApi, restartScreenAppApi, stopScreenAppApi, fetchScreenAppLogsApi } from '../../api/vpsApi';

export default function ScreenAppsTab({ serverId }) {
  const [apps, setApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [restartingApp, setRestartingApp] = useState('');
  const [stoppingApp, setStoppingApp] = useState('');

  // Log Modal State
  const [selectedLogApp, setSelectedLogApp] = useState(null);
  const [logsContent, setLogsContent] = useState('');
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [copied, setCopied] = useState(false);

  const loadScreenApps = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchScreenAppsApi(serverId);
      setApps(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Gagal memuat status Screen Apps');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (serverId) loadScreenApps();
  }, [serverId]);

  const handleRestart = async (appName) => {
    setRestartingApp(appName);
    setActionSuccessMsg('');
    setError('');
    try {
      await restartScreenAppApi(serverId, appName);
      setActionSuccessMsg(`Aplikasi ${appName} berhasil dimuat ulang (restart).`);
      loadScreenApps();
    } catch (err) {
      setError(err.message || `Gagal merestart aplikasi ${appName}`);
    } finally {
      setRestartingApp('');
    }
  };

  const handleStop = async (appName) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghentikan aplikasi layar "${appName}"?`)) return;
    setStoppingApp(appName);
    setActionSuccessMsg('');
    setError('');
    try {
      await stopScreenAppApi(serverId, appName);
      setActionSuccessMsg(`Aplikasi ${appName} berhasil dihentikan.`);
      loadScreenApps();
    } catch (err) {
      setError(err.message || `Gagal menghentikan aplikasi ${appName}`);
    } finally {
      setStoppingApp('');
    }
  };

  const handleOpenLogs = async (appName) => {
    setSelectedLogApp(appName);
    setIsLogsLoading(true);
    setLogsError('');
    setLogsContent('');
    try {
      const data = await fetchScreenAppLogsApi(serverId, appName);
      const text = typeof data === 'string' ? data : (data?.logs || JSON.stringify(data, null, 2));
      setLogsContent(text || 'Log kosong.');
    } catch (err) {
      setLogsError(err.message || `Gagal memuat log untuk ${appName}`);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const handleCopyLogs = () => {
    if (!logsContent) return;
    navigator.clipboard.writeText(logsContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/80 p-4 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
            <Tv size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Status Aplikasi Layar (Screen Apps)</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                Linux Native GUI
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pemantauan status real-time aplikasi desktop GUI <code className="text-indigo-300 font-mono">small-screen</code> dan <code className="text-indigo-300 font-mono">big-screen</code>
            </p>
          </div>
        </div>

        <button
          onClick={loadScreenApps}
          disabled={isLoading}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {actionSuccessMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Screen App Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {apps.map(app => {
          const isRunning = (app.state || '').toLowerCase() === 'running' || (app.status || '').toLowerCase().includes('up');
          const isRestarting = restartingApp === app.name;
          const isStopping = stoppingApp === app.name;

          return (
            <div
              key={app.name}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${isRunning
                ? 'bg-slate-900/90 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                : 'bg-slate-900/60 border-red-500/30'
                }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl border ${isRunning
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-red-500/15 border-red-500/30 text-red-400'
                      }`}>
                      <Monitor size={22} />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white font-mono flex items-center gap-2">
                        <span>{app.name}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-sans">
                          GUI App
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        /usr/lib/{app.name}/{app.name}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isRunning
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/15 border-red-500/30 text-red-400'
                    }`}>
                    {isRunning ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    <span>{isRunning ? 'RUNNING' : 'STOPPED'}</span>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-400 flex justify-between items-center mb-4">
                  <span>Status Proses:</span>
                  <span className={isRunning ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {app.status || (isRunning ? 'Up (running)' : 'Exited (0)')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleOpenLogs(app.name)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Lihat Log Aplikasi"
                >
                  <Terminal size={14} />
                  <span>Logs</span>
                </button>

                <button
                  onClick={() => handleStop(app.name)}
                  disabled={isStopping || isRestarting || !isRunning}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${isRunning
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-pointer'
                    : 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed'
                    }`}
                  title="Hentikan Aplikasi"
                >
                  <Square size={14} className={isStopping ? 'animate-spin' : ''} />
                  <span>{isStopping ? 'Stopping...' : 'Stop'}</span>
                </button>

                <button
                  onClick={() => handleRestart(app.name)}
                  disabled={isRestarting || isStopping}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Muat Ulang (Restart) Aplikasi"
                >
                  <RotateCcw size={14} className={isRestarting ? 'animate-spin' : ''} />
                  <span>{isRestarting ? 'Restarting...' : 'Restart'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Logs Modal */}
      {selectedLogApp && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedLogApp(null)}>
          <div
            className="w-full max-w-4xl max-h-[85vh] bg-slate-950 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
                  <Terminal size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Log Aplikasi: {selectedLogApp}</h3>
                  <p className="text-xs text-slate-400 font-mono">100 baris log terakhir via journalctl / log files</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLogs}
                  disabled={!logsContent || isLogsLoading}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>

                <button
                  onClick={() => handleOpenLogs(selectedLogApp)}
                  disabled={isLogsLoading}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw size={14} className={isLogsLoading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>

                <button onClick={() => setSelectedLogApp(null)} className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer ml-2">
                  <X size={20} />
                </button>
              </div>
            </div>

            {logsError && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span>{logsError}</span>
              </div>
            )}

            <div className="flex-1 min-h-[300px] max-h-[500px] overflow-y-auto bg-black/90 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400 whitespace-pre-wrap leading-relaxed">
              {isLogsLoading ? (
                <div className="flex items-center justify-center h-full text-slate-500 gap-2">
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Memuat log...</span>
                </div>
              ) : (
                logsContent || 'Tidak ada log yang tersedia.'
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
