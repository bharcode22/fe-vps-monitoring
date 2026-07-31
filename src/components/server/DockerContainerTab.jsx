import React, { useState, useEffect } from 'react';
import { Box, RefreshCw, RotateCcw, Square, Terminal, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { fetchDockerContainersApi, restartDockerContainerApi, stopDockerContainerApi } from '../../api/vpsApi';
import DockerLogModal from './DockerLogModal';
import { useLanguage } from '../../context/LanguageContext';

const SkeletonDockerTable = () => (
  <div className="flex flex-col gap-4">
    {/* Tab Header Controls Skeleton */}
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <div className="skeleton-box w-5 h-5 rounded"></div>
        <div className="skeleton-box w-40 h-5.5 rounded-md"></div>
      </div>
      <div className="skeleton-box w-28 h-8.5 rounded-lg"></div>
    </div>

    {/* Table Card Skeleton Container */}
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
            {[1, 2, 3, 4].map((i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="p-3.5">
                  <div className="flex flex-col gap-1.5">
                    <div className="skeleton-box w-36 h-4 rounded"></div>
                    <div className="skeleton-box w-20 h-3 rounded"></div>
                  </div>
                </td>
                <td className="p-3.5"><div className="skeleton-box w-28 h-3.5 rounded"></div></td>
                <td className="p-3.5"><div className="skeleton-box w-20 h-6 rounded-full"></div></td>
                <td className="p-3.5"><div className="skeleton-box w-24 h-3.5 rounded"></div></td>
                <td className="p-3.5 text-right">
                  <div className="flex gap-2 justify-end">
                    <div className="skeleton-box w-20 h-8 rounded-lg"></div>
                    <div className="skeleton-box w-8 h-8 rounded-lg"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default function DockerContainerTab({ serverId }) {
  const { t } = useLanguage();
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [restartingContainer, setRestartingContainer] = useState('');
  const [stoppingContainer, setStoppingContainer] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Selected container for log modal
  const [selectedLogContainer, setSelectedLogContainer] = useState(null);

  useEffect(() => {
    if (serverId) {
      loadContainers();
    }
  }, [serverId]);

  const loadContainers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchDockerContainersApi(serverId);
      setContainers(data);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat daftar container Docker.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async (containerName) => {
    setRestartingContainer(containerName);
    setActionSuccessMsg('');
    setErrorMsg('');
    try {
      await restartDockerContainerApi(serverId, containerName);
      setActionSuccessMsg(`Container ${containerName} berhasil dimuat ulang (restart).`);
      loadContainers();
    } catch (err) {
      setErrorMsg(err.message || `Gagal merestart container ${containerName}`);
    } finally {
      setRestartingContainer('');
    }
  };

  const handleStop = async (containerName) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghentikan (docker stop) container "${containerName}"?`)) return;
    setStoppingContainer(containerName);
    setActionSuccessMsg('');
    setErrorMsg('');
    try {
      await stopDockerContainerApi(serverId, containerName);
      setActionSuccessMsg(`Container ${containerName} berhasil dihentikan (stop).`);
      loadContainers();
    } catch (err) {
      setErrorMsg(err.message || `Gagal menghentikan container ${containerName}`);
    } finally {
      setStoppingContainer('');
    }
  };

  if (loading) {
    return <SkeletonDockerTable />;
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Tab Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Box className="text-purple-400" size={20} />
          <h3 className="text-lg font-bold text-white">
            Docker Applications ({containers.length} Running / Stopped)
          </h3>
        </div>

        <button
          onClick={loadContainers}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Refresh Containers</span>
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

      {/* Containers Table */}
      {containers.length === 0 ? (
        <div className="text-center p-9 bg-black/20 rounded-2xl text-slate-400 text-xs">
          Tidak ada container Docker yang berjalan di server ini (atau Docker belum terinstall).
        </div>
      ) : (
        <div className="overflow-x-auto bg-black/25 border border-slate-800 rounded-2xl">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-400 bg-slate-900/50">
                <th className="p-3">Nama Container</th>
                <th className="p-3">Image Tag</th>
                <th className="p-3">Status / State</th>
                <th className="p-3">Ports</th>
                <th className="p-3 text-right">Aksi Admin</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((c, index) => {
                const isRunning = (c.state || '').toLowerCase() === 'running';
                const isExited = (c.state || '').toLowerCase() === 'exited';
                const isRestartingThis = restartingContainer === c.name;
                const isStoppingThis = stoppingContainer === c.name;

                return (
                  <tr key={c.id || index} className="border-b border-white/5 hover:bg-white/[0.02]">

                    {/* Container Name & ID */}
                    <td className="p-3 font-mono">
                      <div className="font-semibold text-white">{c.name}</div>
                      <div className="text-[10px] text-slate-500">ID: {c.id}</div>
                    </td>

                    {/* Image */}
                    <td className="p-3 text-slate-400 font-mono">
                      {c.image}
                    </td>

                    {/* Status / State Badge */}
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isRunning
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : isExited
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}>
                        <span className={`live-dot ${isRunning ? 'online' : 'offline'} w-1.5 h-1.5`}></span>
                        {c.status || c.state}
                      </span>
                    </td>

                    {/* Exposed Ports */}
                    <td className="p-3 text-slate-400 text-xs font-mono">
                      {c.ports || '-'}
                    </td>

                    {/* Admin Action Buttons */}
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">

                        {/* Log Console Button */}
                        <button
                          onClick={() => setSelectedLogContainer(c.name)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Lihat Log Container"
                        >
                          <Terminal size={14} className="text-cyan-400" />
                          <span>Logs</span>
                        </button>

                        {/* Stop Button */}
                        <button
                          onClick={() => handleStop(c.name)}
                          disabled={isStoppingThis || isRestartingThis || !isRunning}
                          className={`px-2.5 py-1 border rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            isStoppingThis || isRestartingThis || !isRunning
                              ? 'bg-red-500/10 border-red-500/20 text-red-400 opacity-50 cursor-not-allowed'
                              : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                          }`}
                          title="Hentikan (docker stop) Container Ini"
                        >
                          {isStoppingThis ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <Square size={14} />
                          )}
                          <span>{isStoppingThis ? 'Stopping...' : 'Stop'}</span>
                        </button>

                        {/* Restart Button */}
                        <button
                          onClick={() => handleRestart(c.name)}
                          disabled={isRestartingThis || isStoppingThis}
                          className={`px-2.5 py-1 border rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            isRestartingThis || isStoppingThis
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 opacity-50 cursor-not-allowed'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                          }`}
                          title="Restart Container Ini"
                        >
                          {isRestartingThis ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <RotateCcw size={14} />
                          )}
                          <span>{isRestartingThis ? 'Restarting...' : 'Restart'}</span>
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
      <DockerLogModal
        isOpen={Boolean(selectedLogContainer)}
        onClose={() => setSelectedLogContainer(null)}
        serverId={serverId}
        containerName={selectedLogContainer}
      />

    </div>
  );
}
