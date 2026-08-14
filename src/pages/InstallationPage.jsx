import React, { useState, useEffect } from 'react';
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
  FolderGit2,
  FileCode,
  Database,
  CheckSquare,
  Square,
  Copy,
  Check
} from 'lucide-react';
import {
  fetchServersApi,
  fetchInstallationVersionsApi,
  fetchInstallationEnvFilesApi,
  executeInstallationApi
} from '../api/vpsApi';

const POD_APPS = [
  { id: 'mobile-api', label: 'Mobile API', desc: 'Main Mobile Gateway Service' },
  { id: 'mobile-synch', label: 'Mobile Sync', desc: 'Data Synchronization Service' },
  { id: 'mobile-consume', label: 'Mobile Consume', desc: 'Queue Message Consumer' },
  { id: 'mobile-downloader', label: 'Mobile Downloader', desc: 'File & Asset Downloader' },
  { id: 'assist-api', label: 'Assist API', desc: 'AI & Assist Subservice' }
];

export default function InstallationPage({ onBack }) {
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

  // Batch deployment execution state
  const [isDeploying, setIsDeploying] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentLabel: '' });
  const [batchLogs, setBatchLogs] = useState([]);
  const [batchSummary, setBatchSummary] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

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

        // Pre-fill initial appEnvMapping with matching .env filenames
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

  // Execute Batch Deployment runner
  const handleStartBatchDeploy = async () => {
    if (selectedServerIds.length === 0) {
      alert('Pilih setidaknya 1 Server POD v3!');
      return;
    }
    if (selectedAppIds.length === 0) {
      alert('Pilih setidaknya 1 Aplikasi POD!');
      return;
    }

    // Verify each selected app has a version selected
    for (const appId of selectedAppIds) {
      if (!selectedAppVersions[appId]) {
        alert(`Pilih versi artefak MinIO terlebih dahulu untuk aplikasi: ${appId}`);
        return;
      }
    }

    const totalTasks = selectedServerIds.length * selectedAppIds.length;
    setIsDeploying(true);
    setBatchLogs([]);
    setBatchSummary(null);
    setBatchProgress({ current: 0, total: totalTasks, currentLabel: 'Menyiapkan batch deployment...' });

    const newLogs = [];
    newLogs.push(`=== MEMULAI BATCH DEPLOYMENT POD V3 (${totalTasks} TUGAS) ===`);
    newLogs.push(`Target POD v3: ${selectedServerIds.length} server | Aplikasi: ${selectedAppIds.length} app | Environment: ${env.toUpperCase()}`);
    newLogs.push(`----------------------------------------------------------------------`);
    setBatchLogs([...newLogs]);

    let successCount = 0;
    let failCount = 0;
    let taskCounter = 0;

    for (const serverIdStr of selectedServerIds) {
      const serverObj = podV3Servers.find(s => String(s.id) === String(serverIdStr));
      const serverName = serverObj ? serverObj.name : `Server #${serverIdStr}`;

      for (const appId of selectedAppIds) {
        taskCounter++;
        const appVersion = selectedAppVersions[appId] || '';
        const appEnvFile = appEnvMapping[appId] || '';
        const appRunPrisma = Boolean(appPrismaMapping[appId]);

        const currentTaskLabel = `[${taskCounter}/${totalTasks}] Deploying ${appId} (${appVersion}) -> ${serverName}`;
        setBatchProgress({ current: taskCounter, total: totalTasks, currentLabel: currentTaskLabel });

        newLogs.push(`\n>>> TASK ${taskCounter}/${totalTasks}: ${appId} -> ${serverName} (Versi: ${appVersion})`);
        if (appEnvFile) {
          newLogs.push(`   File .env: ${appEnvFile}`);
        } else {
          newLogs.push(`   File .env: (Tanpa .env)`);
        }
        newLogs.push(`   Prisma Migrate: ${appRunPrisma ? 'YA (npx prisma migrate)' : 'TIDAK'}`);
        setBatchLogs([...newLogs]);

        try {
          const res = await executeInstallationApi({
            server_id: Number(serverIdStr),
            app_name: appId,
            env,
            version: appVersion,
            env_filename: appEnvFile,
            run_prisma_migrate: appRunPrisma
          });

          if (res.success) {
            successCount++;
            (res.logs || []).forEach(l => newLogs.push(`   ${l}`));
            if (res.output) newLogs.push(`   [Output] ${res.output.slice(0, 300)}...`);
            newLogs.push(`✔ ${appId} berhasil di-deploy ke ${serverName}`);
          } else {
            failCount++;
            newLogs.push(`❌ GAGAL: ${res.error || 'Terjadi kesalahan saat deployment'}`);
          }
        } catch (err) {
          failCount++;
          newLogs.push(`❌ GAGAL: ${err.message}`);
        }
        setBatchLogs([...newLogs]);
      }
    }

    newLogs.push(`\n----------------------------------------------------------------------`);
    newLogs.push(`=== BATCH DEPLOYMENT SELESAI ===`);
    newLogs.push(`Total Sukses: ${successCount} | Total Gagal: ${failCount}`);
    setBatchLogs([...newLogs]);

    setBatchSummary({
      total: totalTasks,
      successCount,
      failCount
    });

    setIsDeploying(false);
  };

  const handleCopyLogs = () => {
    if (batchLogs.length === 0) return;
    navigator.clipboard.writeText(batchLogs.join('\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const totalBatchCombinations = selectedServerIds.length * selectedAppIds.length;

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
              <Download size={22} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Instalasi POD v3 (Multi-Server & App)
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  Batch Runner
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Pilih multiple POD v3, aplikasi, pemetaan versi MinIO, file .env & Prisma Migration khusus per aplikasi
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => loadVersionsForApps()}
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 font-semibold text-xs transition-all cursor-pointer"
        >
          <RefreshCw size={14} className="text-cyan-400" />
          <span>Refresh Versi MinIO</span>
        </button>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Columns: Config Controls */}
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
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
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
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    env === 'dev'
                      ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-400 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  DEV
                </button>
                <button
                  onClick={() => setEnv('release')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    env === 'release'
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
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      isSelected
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

          {/* Step 3: Config FOR EACH SELECTED APP (MinIO Version, .env & Prisma Migration) */}
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
                        {/* App Header */}
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

                          {/* Prisma Migrate Toggle Button */}
                          <button
                            onClick={() => toggleAppPrisma(appId)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isPrismaActive
                                ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-400 border border-cyan-500/40 shadow-sm'
                                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                            }`}
                            title="Jalankan npx prisma migrate dev --name 'deploy' saat instalasi aplikasi ini"
                          >
                            {isPrismaActive ? <CheckSquare size={15} /> : <Square size={15} />}
                            <span>Prisma Migrate</span>
                          </button>
                        </div>

                        {/* Selectors Grid: MinIO Version & .env File */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* MinIO Version Selector */}
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

                          {/* .env File Selector */}
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
                className={`w-full py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                  isDeploying || selectedServerIds.length === 0 || selectedAppIds.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-cyan-500/25'
                }`}
              >
                {isDeploying ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Mengeksekusi Batch Deployment ({batchProgress.current}/{batchProgress.total})...</span>
                  </>
                ) : (
                  <>
                    <Play size={18} className="fill-slate-950" />
                    <span>Mulai Batch Instalasi ({totalBatchCombinations} Kombinasi Target)</span>
                  </>
                )}
              </button>
            </div>

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
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  env === 'dev' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'
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

          {/* Real-time Execution Console Log Box */}
          <div className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-slate-950/90 shadow-2xl flex flex-col min-h-[420px] justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal size={16} className="text-cyan-400" />
                  <span className="text-xs font-bold text-slate-300">Console Log Batch</span>
                </div>
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

              {/* Progress Indicator */}
              {isDeploying && (
                <div className="p-3 mb-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 text-xs flex flex-col gap-1.5 animate-pulse">
                  <div className="flex items-center justify-between font-bold">
                    <span>{batchProgress.currentLabel}</span>
                    <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full transition-all duration-300"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {batchSummary && (
                <div className={`p-3 mb-3 rounded-xl text-xs flex items-center gap-2 ${
                  batchSummary.failCount === 0
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                }`}>
                  {batchSummary.failCount === 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>
                    Batch Selesai: {batchSummary.successCount} Sukses, {batchSummary.failCount} Gagal.
                  </span>
                </div>
              )}

              {/* Console Output Screen */}
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-[300px] overflow-y-auto space-y-1 scrollbar-thin">
                {batchLogs.length === 0 && !isDeploying ? (
                  <div className="text-slate-500 italic text-center py-12">
                    Konsol log eksekusi batch akan tampil di sini saat instalasi dimulai.
                  </div>
                ) : null}

                {batchLogs.map((logLine, idx) => (
                  <div
                    key={idx}
                    className={
                      logLine.includes('❌')
                        ? 'text-red-400 font-bold'
                        : logLine.includes('✔')
                        ? 'text-emerald-400 font-bold'
                        : logLine.startsWith('>>>')
                        ? 'text-cyan-300 font-bold mt-2'
                        : 'text-slate-300'
                    }
                  >
                    {logLine}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 text-[10px] text-slate-500 text-center">
              Powered by MinIO Artifact Repository & Multi-POD v3 Batch Runner
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
