import React, { useState, useEffect } from 'react';
import { Layers, RefreshCw, RotateCcw, Square, Terminal, AlertCircle, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { fetchPm2AppsApi, restartPm2AppApi, stopPm2AppApi, deletePm2AppApi } from '../../api/vpsApi';
import Pm2LogModal from './Pm2LogModal';
import { formatMbToGb } from '../../utils/formatters';

const SkeletonPm2Table = () => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <div className="skeleton-box w-5 h-5 rounded"></div>
        <div className="skeleton-box w-40 h-5.5 rounded-md"></div>
      </div>
      <div className="skeleton-box w-28 h-8.5 rounded-lg"></div>
    </div>
    <div className="glass-card p-0 overflow-hidden rounded-2xl border border-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-black/40 border-b border-slate-800 text-left">
              <th className="p-3"><div className="skeleton-box w-28 h-3.5 rounded"></div></th>
              <th className="p-3"><div className="skeleton-box w-24 h-3.5 rounded"></div></th>
              <th className="p-3"><div className="skeleton-box w-18 h-3.5 rounded"></div></th>
              <th className="p-3"><div className="skeleton-box w-24 h-3.5 rounded"></div></th>
              <th className="p-3 text-right"><div className="skeleton-box w-20 h-3.5 rounded ml-auto"></div></th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="p-3.5"><div className="skeleton-box w-36 h-4 rounded"></div></td>
                <td className="p-3.5"><div className="skeleton-box w-28 h-3.5 rounded"></div></td>
                <td className="p-3.5"><div className="skeleton-box w-20 h-6 rounded-full"></div></td>
                <td className="p-3.5"><div className="skeleton-box w-24 h-3.5 rounded"></div></td>
                <td className="p-3.5 text-right"><div className="skeleton-box w-20 h-8 rounded-lg ml-auto"></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default function Pm2AppTab({ serverId }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [restartingApp, setRestartingApp] = useState('');
  const [stoppingApp, setStoppingApp] = useState('');
  const [deletingApp, setDeletingApp] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [selectedLogApp, setSelectedLogApp] = useState(null);

  useEffect(() => {
    if (serverId) {
      loadApps();
    }
  }, [serverId]);

  const loadApps = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchPm2AppsApi(serverId);
      setApps(data);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat daftar aplikasi PM2 (pm2 ls).');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async (appName) => {
    setRestartingApp(appName);
    setActionSuccessMsg('');
    setErrorMsg('');
    try {
      await restartPm2AppApi(serverId, appName);
      setActionSuccessMsg(`Aplikasi PM2 "${appName}" berhasil dimuat ulang (restart).`);
      loadApps();
    } catch (err) {
      setErrorMsg(err.message || `Gagal merestart PM2 ${appName}`);
    } finally {
      setRestartingApp('');
    }
  };

  const handleStop = async (appName) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghentikan (pm2 stop) aplikasi "${appName}"?`)) return;
    setStoppingApp(appName);
    setActionSuccessMsg('');
    setErrorMsg('');
    try {
      await stopPm2AppApi(serverId, appName);
      setActionSuccessMsg(`Aplikasi PM2 "${appName}" berhasil dihentikan (stop).`);
      loadApps();
    } catch (err) {
      setErrorMsg(err.message || `Gagal menghentikan PM2 ${appName}`);
    } finally {
      setStoppingApp('');
    }
  };

  const handleDelete = async (appName) => {
    if (!window.confirm(`PERINGATAN: Apakah Anda yakin ingin MENGHAPUS (pm2 delete) service "${appName}" dari daftar PM2?`)) return;
    setDeletingApp(appName);
    setActionSuccessMsg('');
    setErrorMsg('');
    try {
      await deletePm2AppApi(serverId, appName);
      setActionSuccessMsg(`Aplikasi PM2 "${appName}" berhasil dihapus (pm2 delete).`);
      loadApps();
    } catch (err) {
      setErrorMsg(err.message || `Gagal menghapus PM2 ${appName}`);
    } finally {
      setDeletingApp('');
    }
  };

  const formatMemory = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = Math.round(bytes / (1024 * 1024));
    return `${mb} MB`;
  };

  if (loading) {
    return <SkeletonPm2Table />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Layers className="text-emerald-400" size={20} />
          <h3 className="text-lg font-bold text-white">
            PM2 Managed Services ({apps.length} Running / Stopped)
          </h3>
        </div>

        <button
          onClick={loadApps}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh PM2 (pm2 ls)</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {actionSuccessMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Apps Table */}
      {apps.length === 0 ? (
        <div className="text-center p-9 bg-black/20 rounded-2xl text-slate-400 text-xs">
          Tidak ada aplikasi PM2 yang berjalan di server ini (atau PM2 belum terinstall).
        </div>
      ) : (
        <div className="overflow-x-auto bg-black/25 border border-slate-800 rounded-2xl">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-400 bg-slate-900/50">
                <th className="p-3">Nama Service / App</th>
                <th className="p-3">Status / State</th>
                <th className="p-3">Memori (RAM)</th>
                <th className="p-3">CPU %</th>
                <th className="p-3">Restarts</th>
                <th className="p-3 text-right">Aksi Admin</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => {
                const isOnline = (app.status || '').toLowerCase() === 'online';
                const isStopped = (app.status || '').toLowerCase() === 'stopped';
                const isRestartingThis = restartingApp === app.name;
                const isStoppingThis = stoppingApp === app.name;

                return (
                  <tr key={app.id || app.name} className="border-b border-white/5 hover:bg-white/[0.02]">
                    {/* App Name & ID */}
                    <td className="p-3 font-mono">
                      <div className="font-semibold text-white">{app.name}</div>
                      <div className="text-[10px] text-slate-500">ID: {app.id} • {app.mode}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isOnline
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : isStopped
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}>
                        <span className={`live-dot ${isOnline ? 'online' : 'offline'} w-1.5 h-1.5`}></span>
                        {app.status.toUpperCase()}
                      </span>
                    </td>

                    {/* Memory */}
                    <td className="p-3 text-emerald-300 font-mono">
                      {formatMemory(app.memory)}
                    </td>

                    {/* CPU */}
                    <td className="p-3 text-cyan-300 font-mono">
                      {app.cpu}%
                    </td>

                    {/* Restarts */}
                    <td className="p-3 text-slate-400 font-mono">
                      {app.restarts}x
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {/* Logs */}
                        <button
                          onClick={() => setSelectedLogApp(app.name)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Lihat Log Service (pm2 logs)"
                        >
                          <Terminal size={14} className="text-cyan-400" />
                          <span>Logs</span>
                        </button>

                        {/* Stop */}
                        <button
                          onClick={() => handleStop(app.name)}
                          disabled={isStoppingThis || isRestartingThis || !isOnline}
                          className={`px-2.5 py-1 border rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            isStoppingThis || isRestartingThis || !isOnline
                              ? 'bg-red-500/10 border-red-500/20 text-red-400 opacity-50 cursor-not-allowed'
                              : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                          }`}
                          title="Hentikan Service PM2 Ini"
                        >
                          {isStoppingThis ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <Square size={14} />
                          )}
                          <span>{isStoppingThis ? 'Stopping...' : 'Stop'}</span>
                        </button>

                        {/* Restart */}
                        <button
                          onClick={() => handleRestart(app.name)}
                          disabled={isRestartingThis || isStoppingThis || deletingApp === app.name}
                          className={`px-2.5 py-1 border rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            isRestartingThis || isStoppingThis || deletingApp === app.name
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 opacity-50 cursor-not-allowed'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                          }`}
                          title="Restart Service PM2 Ini"
                        >
                          {isRestartingThis ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <RotateCcw size={14} />
                          )}
                          <span>{isRestartingThis ? 'Restarting...' : 'Restart'}</span>
                        </button>

                        {/* Delete PM2 App */}
                        <button
                          onClick={() => handleDelete(app.name)}
                          disabled={deletingApp === app.name || isRestartingThis || isStoppingThis}
                          className={`px-2 py-1 border rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            deletingApp === app.name
                              ? 'bg-red-600/20 border-red-600/30 text-red-500 opacity-50 cursor-not-allowed'
                              : 'bg-red-600/15 border-red-600/40 text-red-400 hover:bg-red-600/30'
                          }`}
                          title="Hapus (pm2 delete) Service Ini"
                        >
                          {deletingApp === app.name ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          <span>{deletingApp === app.name ? 'Deleting...' : 'Delete'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Console Modal */}
      <Pm2LogModal
        isOpen={Boolean(selectedLogApp)}
        onClose={() => setSelectedLogApp(null)}
        serverId={serverId}
        appName={selectedLogApp}
      />
    </div>
  );
}
