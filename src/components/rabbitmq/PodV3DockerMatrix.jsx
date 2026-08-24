import React, { useState, useEffect } from 'react';
import { Box, RefreshCw, Search, CheckCircle2, XCircle, AlertCircle, Layers, Play, Square, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { fetchDockerContainersApi, restartDockerContainerApi, fetchScreenAppsApi, restartScreenAppApi } from '../../api/vpsApi';

const TARGET_APPS = [
  { key: 'mobile-api', label: 'mobile-api', isGui: false },
  { key: 'mobile-synch', label: 'mobile-synch', isGui: false },
  { key: 'assist-api', label: 'assist-api', isGui: false },
  { key: 'mobile-consumer', label: 'mobile-consumer', isGui: false },
  { key: 'mobile-downloader', label: 'mobile-downloader', isGui: false },
  { key: 'small-screen', label: 'small-screen', isGui: true },
  { key: 'big-screen', label: 'big-screen', isGui: true }
];

export default function PodV3DockerMatrix({ vpsServers, onOpenServerDetail }) {
  const [podStatusMap, setPodStatusMap] = useState({});
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [restartingMap, setRestartingMap] = useState({});
  const [showHost, setShowHost] = useState(false);

  // Filter ONLY Pod V3 servers (type === 'pod' and pod_version !== 'v2')
  const podV3Servers = (vpsServers || []).filter(s => {
    if (s.type !== 'pod') return false;

    const podVer = (s.pod_version || '').toLowerCase().trim();
    const nameStr = (s.name || '').toLowerCase().trim();

    // Exclude V2 explicitly if marked as v2 or name contains v2
    if (podVer === 'v2' || nameStr.includes('v2')) {
      return false;
    }

    // If version is specified, it must be v3
    if (podVer) {
      return podVer === 'v3';
    }

    return true;
  });

  // Fetch Docker containers & Screen Apps for all Pod V3 servers
  const fetchAllPodStatuses = async () => {
    if (podV3Servers.length === 0) return;
    setIsLoadingAll(true);

    const newMap = { ...podStatusMap };

    await Promise.all(
      podV3Servers.map(async (server) => {
        newMap[server.id] = { ...(newMap[server.id] || {}), loading: true, error: null };
        try {
          const [dockerContainers, screenApps] = await Promise.all([
            fetchDockerContainersApi(server.id).catch(() => []),
            fetchScreenAppsApi(server.id).catch(() => [])
          ]);
          const combined = [
            ...(Array.isArray(dockerContainers) ? dockerContainers : []),
            ...(Array.isArray(screenApps) ? screenApps : [])
          ];
          newMap[server.id] = {
            server,
            containers: combined,
            loading: false,
            error: null,
            lastChecked: new Date().toLocaleTimeString()
          };
        } catch (err) {
          newMap[server.id] = {
            server,
            containers: [],
            loading: false,
            error: err.message || 'Gagal koneksi SSH',
            lastChecked: new Date().toLocaleTimeString()
          };
        }
      })
    );

    setPodStatusMap({ ...newMap });
    setIsLoadingAll(false);
  };

  useEffect(() => {
    fetchAllPodStatuses();
  }, [vpsServers?.length]);

  // Restart a specific container or screen app on a pod
  const handleRestartContainer = async (serverId, containerName) => {
    const key = `${serverId}-${containerName}`;
    setRestartingMap(prev => ({ ...prev, [key]: true }));
    try {
      const isGuiApp = containerName === 'small-screen' || containerName === 'big-screen';
      if (isGuiApp) {
        await restartScreenAppApi(serverId, containerName);
      } else {
        await restartDockerContainerApi(serverId, containerName);
      }
      // Refresh status for this single server
      const [updatedDocker, updatedScreen] = await Promise.all([
        fetchDockerContainersApi(serverId).catch(() => []),
        fetchScreenAppsApi(serverId).catch(() => [])
      ]);
      const combined = [
        ...(Array.isArray(updatedDocker) ? updatedDocker : []),
        ...(Array.isArray(updatedScreen) ? updatedScreen : [])
      ];
      setPodStatusMap(prev => ({
        ...prev,
        [serverId]: {
          ...prev[serverId],
          containers: combined,
          lastChecked: new Date().toLocaleTimeString()
        }
      }));
    } catch (err) {
      alert(`Gagal restart ${containerName}: ${err.message}`);
    } finally {
      setRestartingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  // Helper to match target container status
  const getContainerInfo = (containers, targetKey) => {
    if (!containers || !Array.isArray(containers)) return { status: 'unknown', label: 'N/A' };

    const found = containers.find(c => {
      const name = (c.name || c.Names?.[0] || '').replace(/^\//, '').toLowerCase();
      return name === targetKey || name.includes(targetKey);
    });

    if (!found) return { status: 'missing', label: 'Tidak Ada' };

    const stateStr = (found.state || found.State || '').toLowerCase();
    const statusStr = (found.status || found.Status || '').toLowerCase();
    const isRunning = stateStr === 'running' || statusStr.includes('up');

    return {
      status: isRunning ? 'running' : 'stopped',
      label: isRunning ? 'Running' : (found.state || 'Exited'),
      rawName: (found.name || '').replace(/^\//, '') || targetKey,
      statusDetail: found.status || ''
    };
  };

  const filteredServers = podV3Servers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.host.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/80 p-3.5 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2.5">
          <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30 text-purple-400">
            <Box size={18} />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Matriks Aplikasi Pod V3 (Docker &amp; GUI Apps)</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono">
                {podV3Servers.length} Pods
              </span>
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Status real-time 5 container Docker + 2 aplikasi GUI (small-screen &amp; big-screen)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari Pod / IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-955 border border-slate-800 text-slate-200 text-xs px-2.5 py-1.5 pl-7 rounded-lg outline-none focus:border-purple-500/50 w-44 font-mono"
            />
            <Search size={12} className="absolute left-2.5 top-2 text-slate-500" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchAllPodStatuses}
            disabled={isLoadingAll}
            className="bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-50 text-purple-300 px-3 py-1.5 rounded-lg text-xs font-bold border border-purple-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isLoadingAll ? 'animate-spin' : ''} />
            <span>{isLoadingAll ? 'Memeriksa...' : 'Refresh All'}</span>
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-955/90 shadow-xl custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-900/90 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <th className="p-3 w-48">
                <div className="flex items-center gap-1.5">
                  <span>Pod Server V3</span>
                  <button
                    type="button"
                    onClick={() => setShowHost(!showHost)}
                    className="text-slate-400 hover:text-slate-200 p-0.5 transition-colors cursor-pointer"
                    title={showHost ? "Sembunyikan Host/IP" : "Tampilkan Host/IP"}
                  >
                    {showHost ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
              </th>
              {TARGET_APPS.map(app => (
                <th key={app.key} className="p-3 text-center w-36">
                  <div className="flex flex-col items-center justify-center">
                    <span>{app.label}</span>
                    {app.isGui && (
                      <span className="text-[8px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-sans font-bold mt-0.5">
                        GUI APP
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="p-3 text-center w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
            {filteredServers.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500 italic">
                  Tidak ada Pod V3 ditemukan.
                </td>
              </tr>
            ) : (
              filteredServers.map((server) => {
                const podData = podStatusMap[server.id] || { loading: true, containers: [] };
                const isPodLoading = podData.loading;

                return (
                  <tr key={server.id} className="hover:bg-slate-900/40 transition-colors">
                    {/* Pod Name & IP */}
                    <td className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white text-xs flex items-center gap-1.5">
                            <span>{server.name}</span>
                            <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-sans font-bold">
                              {server.pod_version ? server.pod_version.toUpperCase() : 'V3'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {showHost ? server.host : '••••.••••'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 5 Target App Columns */}
                    {TARGET_APPS.map(app => {
                      if (isPodLoading) {
                        return (
                          <td key={app.key} className="p-3 text-center">
                            <span className="text-[10px] text-slate-500 italic animate-pulse">Checking...</span>
                          </td>
                        );
                      }

                      if (podData.error) {
                        return (
                          <td key={app.key} className="p-3 text-center">
                            <span className="text-[10px] text-red-400 flex items-center justify-center gap-1">
                              <AlertCircle size={10} /> Error
                            </span>
                          </td>
                        );
                      }

                      const info = getContainerInfo(podData.containers, app.key);
                      const isRestarting = restartingMap[`${server.id}-${info.rawName}`];

                      return (
                        <td key={app.key} className="p-3 text-center">
                          {info.status === 'missing' ? (
                            <span className="text-[10px] text-slate-600 bg-slate-900 px-2 py-0.5 rounded border border-slate-800/60 inline-block">
                              N/A
                            </span>
                          ) : info.status === 'running' ? (
                            <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                              <span>Running</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              <span>{info.label}</span>
                              {info.rawName && (
                                <button
                                  onClick={() => handleRestartContainer(server.id, info.rawName)}
                                  disabled={isRestarting}
                                  className="ml-1 hover:text-white transition-colors cursor-pointer"
                                  title="Restart Container"
                                >
                                  <RefreshCw size={10} className={isRestarting ? 'animate-spin' : ''} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Actions Column */}
                    <td className="p-3 text-center">
                      {onOpenServerDetail && (
                        <button
                          onClick={() => onOpenServerDetail(server)}
                          className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white p-1.5 rounded-lg border border-slate-800 transition-colors inline-flex items-center justify-center cursor-pointer"
                          title="Buka Detail VPS"
                        >
                          <ExternalLink size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
