import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config';
import {
  ArrowLeft,
  Download,
  Terminal,
  Server,
  Box,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode,
  CheckSquare,
  Square,
  Copy,
  Check,
  Clock,
  Layers,
  Cpu,
  PackageCheck,
  Zap,
  RotateCw
} from 'lucide-react';
import {
  fetchServersApi,
  fetchInstallationVersionsApi,
  fetchInstallationEnvFilesApi
} from '../api/vpsApi';

const POD_APPS = [
  { id: 'mobile-api', label: 'Mobile API', desc: 'Main Mobile Gateway Service' },
  { id: 'mobile-synch', label: 'Mobile Sync', desc: 'Data Synchronization Service' },
  { id: 'mobile-consume', label: 'Mobile Consume', desc: 'Queue Message Consumer' },
  { id: 'mobile-downloader', label: 'Mobile Downloader', desc: 'File & Asset Downloader' },
  { id: 'assist-api', label: 'Assist API', desc: 'AI & Assist Subservice' }
];

const JENKINS_STAGES = [
  { id: 1, name: 'Stage 1: Clean & Download', short: '1. Download', icon: Download, desc: 'Parallel mc cp from MinIO' },
  { id: 2, name: 'Stage 2: Artifact Unzip', short: '2. Unzip', icon: FolderGit2Icon, desc: 'Unzip artifact-bundle zip' },
  { id: 3, name: 'Stage 3: Env & Prisma', short: '3. Config/Prisma', icon: FileCode, desc: 'Inject .env & Prisma migrate' },
  { id: 4, name: 'Stage 4: Docker Load', short: '4. Docker Load', icon: Cpu, desc: 'docker load < image.tar.gz' },
  { id: 5, name: 'Stage 5: Compose Up', short: '5. Compose Up', icon: Play, desc: 'docker compose -f ... up -d' }
];

function FolderGit2Icon(props) {
  return <Layers {...props} />;
}

export default function InstallationPage({ onBack }) {
  // Socket.io persistent connection reference
  const socketRef = useRef(null);
  const terminalEndRef = useRef(null);

  // POD v3 servers state (strictly pod_version === 'v3')
  const [podV3Servers, setPodV3Servers] = useState([]);
  const [selectedServerIds, setSelectedServerIds] = useState([]);

  // Multi-select applications state
  const [selectedAppIds, setSelectedAppIds] = useState(['mobile-api']);
  const [env, setEnv] = useState('dev'); // 'dev' | 'release'

  // Per-application MinIO artifact version states
  const [appVersionsMap, setAppVersionsMap] = useState({});
  const [selectedAppVersions, setSelectedAppVersions] = useState({});
  const [isAppVersionsLoadingMap, setIsAppVersionsLoadingMap] = useState({});

  // .env files state & per-app env mapping from backend/envoirment
  const [envFiles, setEnvFiles] = useState([]);
  const [appEnvMapping, setAppEnvMapping] = useState({});
  const [isEnvLoading, setIsEnvLoading] = useState(false);

  // Prisma migration toggle mapping per application (appId -> boolean)
  const [appPrismaMapping, setAppPrismaMapping] = useState({});

  // Jenkins Pipeline State Matrix
  // Structure: { [serverName]: { [stageId]: 'pending' | 'running' | 'completed' | 'failed' } }
  const [stageMatrix, setStageMatrix] = useState({});
  const [stageDurations, setStageDurations] = useState({});
  const [activeLogFilter, setActiveLogFilter] = useState('ALL');

  // Elapsed Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  // Batch deployment execution state (WebSockets streaming)
  const [isDeploying, setIsDeploying] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentLabel: '' });
  const [batchLogs, setBatchLogs] = useState([]);
  const [batchSummary, setBatchSummary] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  // Elapsed timer ticker effect
  useEffect(() => {
    if (isDeploying) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isDeploying]);

  // Socket.io initialization for real-time streamed logs and Jenkins Stage Matrix updates
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('installation_batch_start', (data) => {
      setIsDeploying(true);
      setBatchProgress({ current: 0, total: data.totalTasks, currentLabel: 'Jenkins Pipeline Deployment Dimulai...' });

      // Reset stage matrix for all target servers
      const initialMatrix = {};
      podV3Servers.forEach(srv => {
        if (selectedServerIds.includes(String(srv.id))) {
          initialMatrix[srv.name] = { 1: 'pending', 2: 'pending', 3: 'pending', 4: 'pending', 5: 'pending' };
        }
      });
      setStageMatrix(initialMatrix);
      setStageDurations({});
    });

    socket.on('installation_batch_log', (data) => {
      if (data.text) {
        const text = data.text;
        setBatchLogs(prev => [...prev, text]);

        // Parse JENKINS_STAGE tags from log text stream
        // Format: [JENKINS_STAGE:stageId:START|END:serverName]
        const stageMatches = text.match(/\[JENKINS_STAGE:(\d):(START|END):([^\]:]+)(?::([^\]]+))?\]/g);
        if (stageMatches) {
          stageMatches.forEach(matchStr => {
            const parts = matchStr.replace('[JENKINS_STAGE:', '').replace(']', '').split(':');
            const stageId = Number(parts[0]);
            const action = parts[1]; // 'START' or 'END'
            const serverName = parts[2];

            setStageMatrix(prev => {
              const currentServerObj = prev[serverName] || { 1: 'pending', 2: 'pending', 3: 'pending', 4: 'pending', 5: 'pending' };
              const newStatus = action === 'START' ? 'running' : 'completed';
              return {
                ...prev,
                [serverName]: {
                  ...currentServerObj,
                  [stageId]: newStatus
                }
              };
            });
          });
        }
      }
    });

    socket.on('installation_batch_complete', (data) => {
      setIsDeploying(false);
      setBatchSummary(data);

      // Mark all running stages to completed if finished successfully
      if (data.totalFail === 0) {
        setStageMatrix(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(srvName => {
            next[srvName] = { 1: 'completed', 2: 'completed', 3: 'completed', 4: 'completed', 5: 'completed' };
          });
          return next;
        });
      }
    });

    socket.on('installation_batch_error', (data) => {
      setIsDeploying(false);
      alert(data.error || 'Terjadi kesalahan pada Jenkins batch installation');
    });

    return () => {
      socket.disconnect();
    };
  }, [podV3Servers, selectedServerIds]);

  // Auto-scroll terminal log to bottom on new log chunk
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [batchLogs]);

  // Load available POD v3 servers (strictly pod_version === 'v3')
  useEffect(() => {
    fetchServersApi()
      .then(servers => {
        const v3Pods = (servers || []).filter(s => s.pod_version === 'v3');
        setPodV3Servers(v3Pods);
        if (v3Pods.length > 0) {
          setSelectedServerIds([String(v3Pods[0].id)]);
        }
      })
      .catch(err => {
        console.error('Gagal memuat daftar POD v3 server:', err);
      });
  }, []);

  // Load .env files from backend/envoirment & initialize smart mapping per app
  useEffect(() => {
    setIsEnvLoading(true);
    fetchInstallationEnvFilesApi()
      .then(res => {
        const files = res.files || [];
        setEnvFiles(files);

        if (files.length > 0) {
          const mapping = {};
          POD_APPS.forEach(app => {
            const matchedFile = files.find(f => f.name.toLowerCase().includes(app.id)) || files[0];
            if (matchedFile) {
              mapping[app.id] = matchedFile.name;
            }
          });
          setAppEnvMapping(mapping);
        }
      })
      .catch(err => {
        console.error('Gagal memuat daftar file .env:', err);
      })
      .finally(() => {
        setIsEnvLoading(false);
      });
  }, []);

  // Load artifact versions from MinIO specifically for each selected app
  const loadVersionsForApps = async (appIdsToFetch = selectedAppIds) => {
    if (appIdsToFetch.length === 0) return;

    appIdsToFetch.forEach(async (appId) => {
      setIsAppVersionsLoadingMap(prev => ({ ...prev, [appId]: true }));
      try {
        const res = await fetchInstallationVersionsApi(appId, env);
        const list = res.versions || [];
        setAppVersionsMap(prev => ({ ...prev, [appId]: list }));
        if (list.length > 0) {
          setSelectedAppVersions(prev => {
            if (prev[appId] && list.includes(prev[appId])) {
              return prev;
            }
            return { ...prev, [appId]: list[0] };
          });
        } else {
          setSelectedAppVersions(prev => ({ ...prev, [appId]: '' }));
        }
      } catch (err) {
        console.error(`Gagal memuat versi MinIO untuk ${appId}:`, err);
      } finally {
        setIsAppVersionsLoadingMap(prev => ({ ...prev, [appId]: false }));
      }
    });
  };

  useEffect(() => {
    loadVersionsForApps();
  }, [selectedAppIds, env]);

  // Format seconds to MM:SS timer
  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Handle POD v3 server multi-select toggle
  const toggleServerSelect = (idStr) => {
    setSelectedServerIds(prev =>
      prev.includes(idStr) ? prev.filter(i => i !== idStr) : [...prev, idStr]
    );
  };

  const selectAllServers = () => {
    setSelectedServerIds(podV3Servers.map(s => String(s.id)));
  };

  const deselectAllServers = () => {
    setSelectedServerIds([]);
  };

  // Handle App multi-select toggle
  const toggleAppSelect = (appId) => {
    setSelectedAppIds(prev =>
      prev.includes(appId) ? prev.filter(a => a !== appId) : [...prev, appId]
    );
  };

  const selectAllApps = () => {
    setSelectedAppIds(POD_APPS.map(a => a.id));
  };

  const deselectAllApps = () => {
    setSelectedAppIds([]);
  };

  // Toggle Prisma Migration option for a specific app
  const toggleAppPrisma = (appId) => {
    setAppPrismaMapping(prev => ({
      ...prev,
      [appId]: !prev[appId]
    }));
  };

  // Execute Streamed Batch Deployment runner over WebSockets
  const handleStartBatchDeploy = () => {
    if (selectedServerIds.length === 0) {
      alert('Pilih setidaknya 1 Server POD v3!');
      return;
    }
    if (selectedAppIds.length === 0) {
      alert('Pilih setidaknya 1 Aplikasi POD!');
      return;
    }

    for (const appId of selectedAppIds) {
      if (!selectedAppVersions[appId]) {
        alert(`Pilih versi artefak MinIO terlebih dahulu untuk aplikasi: ${appId}`);
        return;
      }
    }

    const appConfigs = selectedAppIds.map(appId => ({
      app_name: appId,
      version: selectedAppVersions[appId],
      env_filename: appEnvMapping[appId] || '',
      run_prisma_migrate: Boolean(appPrismaMapping[appId])
    }));

    setIsDeploying(true);
    setBatchLogs([]);
    setBatchSummary(null);

    // Initialize Stage Matrix UI
    const initialMatrix = {};
    podV3Servers.forEach(srv => {
      if (selectedServerIds.includes(String(srv.id))) {
        initialMatrix[srv.name] = { 1: 'pending', 2: 'pending', 3: 'pending', 4: 'pending', 5: 'pending' };
      }
    });
    setStageMatrix(initialMatrix);

    if (!socketRef.current) {
      alert('Koneksi WebSocket belum terhubung. Coba refresh halaman.');
      setIsDeploying(false);
      return;
    }

    socketRef.current.emit('start_batch_installation', {
      server_ids: selectedServerIds.map(Number),
      env,
      app_configs: appConfigs
    });
  };

  const handleCopyLogs = () => {
    if (batchLogs.length === 0) return;
    navigator.clipboard.writeText(batchLogs.join('\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const totalBatchCombinations = selectedServerIds.length * selectedAppIds.length;

  // Filter logs for Jenkins terminal drawer based on activeLogFilter
  const filteredLogs = batchLogs.filter(line => {
    if (activeLogFilter === 'ALL') return true;
    return line.includes(activeLogFilter);
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-cyan-500/20 shadow-xl">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-all cursor-pointer shadow-md"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 p-2.5 rounded-xl text-cyan-400">
              <Layers size={22} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Jenkins CI/CD Pipeline Dashboard
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-mono">
                  #BUILD-105
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Visualisasi Karboe Pipeline Stage Matrix, download paralel & streaming log WebSockets real-time
              </p>
            </div>
          </div>
        </div>

        {/* Build Status Indicator & Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
            <Clock size={15} className="text-cyan-400 animate-pulse" />
            <span>Elapsed: <strong className="text-cyan-300">{formatTimer(elapsedSeconds)}</strong></span>
          </div>

          <button
            onClick={() => loadVersionsForApps()}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 font-semibold text-xs transition-all cursor-pointer"
          >
            <RefreshCw size={14} className="text-cyan-400" />
            <span>Refresh Versi MinIO</span>
          </button>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Columns: Config Controls & Jenkins Pipeline View */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Step 1: Select Target POD v3 Servers (strictly pod_version === 'v3') */}
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
                    onClick={selectAllServers}
                    className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition-colors cursor-pointer"
                  >
                    Pilih Semua ({podV3Servers.length})
                  </button>
                  <button
                    onClick={deselectAllServers}
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
                <span>Belum ada server berkategori <strong>POD v3</strong> (`pod_version === 'v3'`) di database. Tambahkan atau update versi POD via menu <strong>+ Tambah</strong>.</span>
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

          {/* Step 2: Select Multiple Applications & Environment */}
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Box size={18} className="text-cyan-400" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  2. Pilih Aplikasi POD (Multi-Select) & Environment
                </h3>
              </div>

              {/* Env Switcher */}
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

            {/* Apps Toggle Controls */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400 font-medium">Pilih aplikasi yang akan di-install:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllApps}
                  className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition-colors cursor-pointer"
                >
                  Pilih Semua Apps
                </button>
                <button
                  onClick={deselectAllApps}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-200 bg-slate-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Hapus Semua
                </button>
              </div>
            </div>

            {/* Apps Selection Cards */}
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

            {/* MinIO Target Path Information */}
            <div className="p-3 bg-black/40 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Target MinIO Paths:</span>
              <span className="font-mono text-cyan-400 font-semibold truncate max-w-[300px]">
                deploybox/ [{selectedAppIds.join(', ')}] /{env}/
              </span>
            </div>
          </div>

          {/* Step 3: Config FOR EACH SELECTED APP */}
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileCode size={18} className="text-cyan-400" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  3. Konfigurasi Versi MinIO, .env & Prisma Migration Per Aplikasi
                </h3>
              </div>

              {isEnvLoading && (
                <span className="text-xs text-cyan-400 flex items-center gap-1.5 font-medium">
                  <RefreshCw size={12} className="animate-spin" /> Memuat data...
                </span>
              )}
            </div>

            {/* Per-Application Config Cards */}
            <div>
              {selectedAppIds.length === 0 ? (
                <div className="text-xs text-amber-400 italic p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  Pilih setidaknya 1 aplikasi pada Step 2 untuk mengonfigurasi versi MinIO, file .env dan Prisma Migration.
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
                            onClick={() => toggleAppPrisma(appId)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${isPrismaActive
                              ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-400 border border-cyan-500/40 shadow-sm'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                              }`}
                            title="Jalankan npx prisma migrate dev --name 'deploy' saat instalasi aplikasi ini"
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
            </div>

            {/* Execution Trigger Button */}
            <div className="mt-5">
              <button
                onClick={handleStartBatchDeploy}
                disabled={isDeploying || selectedServerIds.length === 0 || selectedAppIds.length === 0}
                className={`w-full py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${isDeploying || selectedServerIds.length === 0 || selectedAppIds.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-cyan-500/25'
                  }`}
              >
                {isDeploying ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Mengeksekusi Jenkins CI/CD Pipeline Stream...</span>
                  </>
                ) : (
                  <>
                    <Play size={18} className="fill-slate-950" />
                    <span>Jalankan Jenkins Pipeline Batch ({totalBatchCombinations} Target)</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* JENKINS-STYLE PIPELINE STAGE MATRIX DASHBOARD */}
          {/* ========================================================================= */}
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-cyan-500/30 bg-slate-950/80 backdrop-blur-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    Karboe Pipeline Stage
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Build #105
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Status eksekusi panggung pipeline CI/CD per server target POD v3
                  </p>
                </div>
              </div>

              {isDeploying && (
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/30 animate-pulse">
                  <RotateCw size={14} className="animate-spin" />
                  <span>Pipeline Running</span>
                </div>
              )}
            </div>

            {selectedServerIds.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-6 text-center">
                Pilih server POD v3 pada Step 1 untuk melihat Pipeline Stage Matrix.
              </div>
            ) : (
              <div className="space-y-4 overflow-x-auto">
                {podV3Servers
                  .filter(srv => selectedServerIds.includes(String(srv.id)))
                  .map(srv => {
                    const serverStages = stageMatrix[srv.name] || { 1: 'pending', 2: 'pending', 3: 'pending', 4: 'pending', 5: 'pending' };

                    return (
                      <div key={srv.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                        {/* Server Node Header */}
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <Server size={16} className="text-cyan-400" />
                            <span className="text-xs font-extrabold text-white">{srv.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">({srv.host})</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            {selectedAppIds.length} Apps Target
                          </span>
                        </div>

                        {/* 5 Stages Grid for this Server */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                          {JENKINS_STAGES.map(stage => {
                            const status = serverStages[stage.id] || 'pending';
                            const StageIcon = stage.icon;

                            let cardStyle = 'bg-slate-950/60 border-slate-800 text-slate-400';
                            let badgeStyle = 'bg-slate-800 text-slate-400';
                            let badgeLabel = 'PENDING';
                            let iconElement = <Clock size={13} />;

                            if (status === 'running') {
                              cardStyle = 'bg-gradient-to-b from-cyan-500/20 to-blue-500/20 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10 animate-pulse';
                              badgeStyle = 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40';
                              badgeLabel = 'RUNNING';
                              iconElement = <RotateCw size={13} className="animate-spin" />;
                            } else if (status === 'completed') {
                              cardStyle = 'bg-slate-900 border-emerald-500/50 text-emerald-300';
                              badgeStyle = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
                              badgeLabel = 'SUCCESS';
                              iconElement = <CheckCircle2 size={13} />;
                            } else if (status === 'failed') {
                              cardStyle = 'bg-rose-950/40 border-rose-500/50 text-rose-300';
                              badgeStyle = 'bg-rose-500/20 text-rose-400 border border-rose-500/40';
                              badgeLabel = 'FAILED';
                              iconElement = <XCircle size={13} />;
                            }

                            return (
                              <div
                                key={stage.id}
                                onClick={() => setActiveLogFilter(srv.name)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 text-left ${cardStyle}`}
                                title={`Klik untuk melihat log terminal ${srv.name}`}
                              >
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <StageIcon size={14} className="shrink-0" />
                                    <span className="text-[11px] font-extrabold truncate">{stage.short}</span>
                                  </div>
                                  <div className="text-[9px] opacity-75 truncate">{stage.desc}</div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 ${badgeStyle}`}>
                                    {iconElement}
                                    <span>{badgeLabel}</span>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

        </div>

        {/* Right 1 Column: Deployment Logs & Batch Progress */}
        <div className="flex flex-col gap-6">

          {/* Batch Summary Box */}
          <div className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Ringkasan Pemetaan Config Batch
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Server Target (POD v3):</span>
                <span className="font-bold text-white font-mono">{selectedServerIds.length} Server</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Aplikasi Terpilih:</span>
                <span className="font-bold text-cyan-400 font-mono">{selectedAppIds.length} Apps</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Environment:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${env === 'dev' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'
                  }`}>
                  {env.toUpperCase()}
                </span>
              </div>

              {/* Per-App Config Summary */}
              <div className="pt-1">
                <span className="text-slate-400 text-[11px] font-bold block mb-1.5 uppercase">Detail Config Per App:</span>
                {selectedAppIds.length === 0 ? (
                  <span className="text-slate-500 italic">Belum ada app dipilih</span>
                ) : (
                  <div className="space-y-2">
                    {selectedAppIds.map(appId => {
                      const ver = selectedAppVersions[appId] || 'Belum dipilih';
                      const envFile = appEnvMapping[appId] || 'Tanpa env';
                      const isPrisma = Boolean(appPrismaMapping[appId]);
                      return (
                        <div key={appId} className="bg-black/40 p-2 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-cyan-400">{appId}</span>
                            <span className={`text-[10px] px-1 rounded ${isPrisma ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-600'}`}>
                              {isPrisma ? 'PRISMA' : 'NO-MIGRATE'}
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">Versi:</span>
                            <span className="text-white font-bold truncate max-w-[150px]" title={ver}>{ver}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">Env:</span>
                            <span className="text-amber-300 truncate max-w-[150px]" title={envFile}>{envFile}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Jenkins Console Terminal Drawer Box */}
          <div className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-slate-950/90 shadow-2xl flex flex-col min-h-[460px] justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal size={16} className="text-cyan-400" />
                  <span className="text-xs font-bold text-slate-300">Jenkins Console Log</span>
                </div>

                <div className="flex items-center gap-2">
                  {batchLogs.length > 0 && (
                    <button
                      onClick={handleCopyLogs}
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
                {podV3Servers
                  .filter(srv => selectedServerIds.includes(String(srv.id)))
                  .map(srv => (
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
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-[340px] overflow-y-auto space-y-1 scrollbar-thin">
                {filteredLogs.length === 0 && !isDeploying ? (
                  <div className="text-slate-500 italic text-center py-12">
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

      </div>
    </div>
  );
}
