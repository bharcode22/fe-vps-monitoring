import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config';
import {
  fetchServersApi,
  fetchInstallationVersionsApi,
  fetchInstallationEnvFilesApi
} from '../api/vpsApi';

import {
  POD_APPS,
  FRONTEND_APPS,
  BACKEND_JENKINS_STAGES,
  FRONTEND_JENKINS_STAGES
} from '../components/installation/constants';
import InstallationHeader from '../components/installation/InstallationHeader';
import InstallationTabSwitcher from '../components/installation/InstallationTabSwitcher';
import BackendInstallationTab from '../components/installation/BackendInstallationTab';
import FrontendInstallationTab from '../components/installation/FrontendInstallationTab';
import { useAuth } from '../context/AuthContext';
import PipelineStageMatrix from '../components/installation/PipelineStageMatrix';
import InstallationConsole from '../components/installation/InstallationConsole';
import MinioArtifactManagerTab from '../components/installation/MinioArtifactManagerTab';
import DeploymentHistoryTab from '../components/installation/DeploymentHistoryTab';
import PodVersionMatrixTab from '../components/installation/PodVersionMatrixTab';
import BundleVersionTab from '../components/installation/BundleVersionTab';
import BundleDeploymentTab from '../components/installation/BundleDeploymentTab';

export default function InstallationPage({ onBack }) {
  const { user } = useAuth();
  // Main Tab Navigation State ('backend' | 'frontend' | 'bundles' | 'bundle_deploy' | 'matrix' | 'history' | 'artifacts')
  const [activeTab, setActiveTab] = useState('backend');

  // Socket.io persistent connection reference
  const socketRef = useRef(null);
  const terminalEndRef = useRef(null);

  // POD v3 servers state (strictly pod_version === 'v3' for both Backend and Frontend)
  const [podV3Servers, setPodV3Servers] = useState([]);

  // =========================================================================
  // BACKEND TAB STATES
  // =========================================================================
  const [selectedServerIds, setSelectedServerIds] = useState([]);
  const [selectedAppIds, setSelectedAppIds] = useState(['mobile-api']);
  const [env, setEnv] = useState('dev'); // 'dev' | 'release'

  const [appVersionsMap, setAppVersionsMap] = useState({});
  const [selectedAppVersions, setSelectedAppVersions] = useState({});
  const [isAppVersionsLoadingMap, setIsAppVersionsLoadingMap] = useState({});

  const [appEnvMapping, setAppEnvMapping] = useState({});
  const [appPrismaMapping, setAppPrismaMapping] = useState({});

  // =========================================================================
  // FRONTEND TAB STATES (small-screen & big-screen for POD v3)
  // =========================================================================
  const [feSelectedServerIds, setFeSelectedServerIds] = useState([]);
  const [feSelectedAppIds, setFeSelectedAppIds] = useState(['small-screen']);
  const [feEnv, setFeEnv] = useState('dev'); // 'dev' | 'release'

  const [feAppVersionsMap, setFeAppVersionsMap] = useState({});
  const [feSelectedAppVersions, setFeSelectedAppVersions] = useState({});
  const [isFeVersionsLoadingMap, setIsFeVersionsLoadingMap] = useState({});

  // =========================================================================
  // BUNDLE SUITE DEPLOYMENT STATES (7 Applications: 5 Backend + 2 Frontend)
  // =========================================================================
  const [activeBundle, setActiveBundle] = useState(null);
  const [bundleSelectedServerIds, setBundleSelectedServerIds] = useState([]);
  const [bundleBackendConfigs, setBundleBackendConfigs] = useState({});
  const [bundleFrontendConfigs, setBundleFrontendConfigs] = useState({});

  // Shared .env files state from backend/envoirment
  const [envFiles, setEnvFiles] = useState([]);
  const [isEnvLoading, setIsEnvLoading] = useState(false);

  // Jenkins Pipeline State Matrix
  // Structure: { [serverName]: { [stageId]: 'pending' | 'running' | 'completed' | 'failed' } }
  const [stageMatrix, setStageMatrix] = useState({});
  const [activeLogFilter, setActiveLogFilter] = useState('ALL');

  // Elapsed Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  // Batch deployment execution state (WebSockets streaming)
  const [isDeploying, setIsDeploying] = useState(false);
  const [batchLogs, setBatchLogs] = useState([]);
  const [batchSummary, setBatchSummary] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  // Initialize Socket.io and fetch server list & env files
  useEffect(() => {
    fetchServers();
    fetchEnvFiles();

    // Setup Socket.io connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to installation streamer socket:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from installation streamer socket');
    });

    socket.on('installation_batch_start', (data) => {
      setIsDeploying(true);
      setBatchLogs([`🚀 MEMULAI BATCH DEPLOYMENT (${data.totalServers} Server, ${data.totalApps} Aplikasi, ${data.totalTasks} Total Tugas)...`]);
      setBatchSummary(null);
      setElapsedSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);

      // Immediately set Stage 1 (Download) to 'running' for all target servers
      setStageMatrix(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(srvName => {
          next[srvName] = {
            ...(next[srvName] || {}),
            1: 'running'
          };
        });
        return next;
      });
    });

    socket.on('installation_batch_log', (data) => {
      if (data && data.text) {
        setBatchLogs(prev => [...prev, data.text]);

        // Auto parse Jenkins Pipeline stages from log stream markers
        // Example markers:
        // [JENKINS_STAGE:1:START:POD RIG 30] (for stage 1 all-app download)
        // [JENKINS_STAGE:2:START:POD RIG 30:mobile-api]
        const lines = data.text.split('\n');
        lines.forEach(line => {
          const startMatch = line.match(/\[JENKINS_STAGE:(\d+):START:([^:\]]+)(?::([^\]]+))?\]/);
          if (startMatch) {
            const stageId = Number(startMatch[1]);
            const serverName = startMatch[2]?.trim();
            if (serverName) {
              setStageMatrix(prev => ({
                ...prev,
                [serverName]: {
                  ...(prev[serverName] || {}),
                  [stageId]: 'running'
                }
              }));
            }
          }

          const endMatch = line.match(/\[JENKINS_STAGE:(\d+):END:([^:\]]+)(?::([^\]]+))?\]/);
          if (endMatch) {
            const stageId = Number(endMatch[1]);
            const serverName = endMatch[2]?.trim();
            if (serverName) {
              setStageMatrix(prev => ({
                ...prev,
                [serverName]: {
                  ...(prev[serverName] || {}),
                  [stageId]: 'completed'
                }
              }));
            }
          }

          const failMatch = line.match(/\[JENKINS_STAGE:(\d+):FAIL:([^:\]]+)(?::([^\]]+))?\]/);
          if (failMatch) {
            const stageId = Number(failMatch[1]);
            const serverName = failMatch[2]?.trim();
            if (serverName) {
              setStageMatrix(prev => ({
                ...prev,
                [serverName]: {
                  ...(prev[serverName] || {}),
                  [stageId]: 'failed'
                }
              }));
            }
          }
        });
      }
    });

    socket.on('installation_batch_complete', (summary) => {
      setIsDeploying(false);
      setBatchSummary(summary);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    socket.on('installation_batch_error', (err) => {
      setIsDeploying(false);
      setBatchLogs(prev => [...prev, `❌ ERROR: ${err.error || 'Terjadi kesalahan sistem'}`]);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    return () => {
      if (socket) socket.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format Elapsed Seconds as mm:ss
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Auto-scroll terminal log to bottom on new log line
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [batchLogs]);

  // Fetch servers & filter ONLY pod_version === 'v3' (strict constraint for both backend and frontend)
  const fetchServers = async () => {
    try {
      const data = await fetchServersApi();
      const allServers = Array.isArray(data) ? data : (data.servers || []);
      const v3Pods = allServers.filter(s => s.type === 'pod' && s.pod_version === 'v3');
      setPodV3Servers(v3Pods);

      // Auto-select first POD server for backend and frontend if available
      if (v3Pods.length > 0) {
        setSelectedServerIds([String(v3Pods[0].id)]);
        setFeSelectedServerIds([String(v3Pods[0].id)]);
        setBundleSelectedServerIds([String(v3Pods[0].id)]);
      }
    } catch (err) {
      console.error('Error fetching servers:', err);
    }
  };

  // Fetch available .env files
  const fetchEnvFiles = async () => {
    setIsEnvLoading(true);
    try {
      const res = await fetchInstallationEnvFilesApi();
      const rawFiles = res.files || [];
      const files = rawFiles.map(f => {
        if (typeof f === 'string') return { name: f, filename: f };
        const fname = f.name || f.filename || '';
        return { ...f, name: fname, filename: fname };
      });
      setEnvFiles(files);

      // Pre-map default assist-api-dev.env or similar for each app
      const defaultMapping = {};
      POD_APPS.forEach(app => {
        const found = files.find(f => {
          const fname = f.name || f.filename || '';
          return fname.includes(app.id) || fname.includes('assist-api');
        });
        if (found) {
          defaultMapping[app.id] = found.name || found.filename;
        } else if (files.length > 0) {
          defaultMapping[app.id] = files[0].name || files[0].filename;
        }
      });
      setAppEnvMapping(defaultMapping);
    } catch (err) {
      console.error('Error fetching env files:', err);
    } finally {
      setIsEnvLoading(false);
    }
  };

  // Load MinIO artifact versions for backend apps
  const loadVersionsForBackendApps = async (appIdsToFetch = selectedAppIds, targetEnv = env) => {
    if (appIdsToFetch.length === 0) return;
    appIdsToFetch.forEach(async (appId) => {
      setIsAppVersionsLoadingMap(prev => ({ ...prev, [appId]: true }));
      try {
        const res = await fetchInstallationVersionsApi(appId, targetEnv);
        const list = res.versions || [];
        setAppVersionsMap(prev => ({ ...prev, [appId]: list }));
        if (list.length > 0) {
          setSelectedAppVersions(prev => {
            return { ...prev, [appId]: list[0] };
          });
        }
      } catch (err) {
        console.error(`Error loading versions for ${appId}:`, err);
        setAppVersionsMap(prev => ({ ...prev, [appId]: [] }));
      } finally {
        setIsAppVersionsLoadingMap(prev => ({ ...prev, [appId]: false }));
      }
    });
  };

  // Load MinIO artifact versions for frontend apps
  const loadVersionsForFrontendApps = async (appIdsToFetch = feSelectedAppIds, targetEnv = feEnv) => {
    if (appIdsToFetch.length === 0) return;
    appIdsToFetch.forEach(async (appId) => {
      setIsFeVersionsLoadingMap(prev => ({ ...prev, [appId]: true }));
      try {
        const res = await fetchInstallationVersionsApi(appId, targetEnv);
        const list = res.versions || [];
        setFeAppVersionsMap(prev => ({ ...prev, [appId]: list }));
        if (list.length > 0) {
          setFeSelectedAppVersions(prev => ({ ...prev, [appId]: list[0] }));
        }
      } catch (err) {
        console.error(`Error loading frontend versions for ${appId}:`, err);
        setFeAppVersionsMap(prev => ({ ...prev, [appId]: [] }));
      } finally {
        setIsFeVersionsLoadingMap(prev => ({ ...prev, [appId]: false }));
      }
    });
  };

  // Load versions whenever apps or environment changes
  useEffect(() => {
    loadVersionsForBackendApps(selectedAppIds, env);
  }, [selectedAppIds, env]);

  useEffect(() => {
    loadVersionsForFrontendApps(feSelectedAppIds, feEnv);
  }, [feSelectedAppIds, feEnv]);

  // Selection toggle handlers for Backend
  const toggleServerSelect = (idStr) => {
    setSelectedServerIds(prev => prev.includes(idStr) ? prev.filter(i => i !== idStr) : [...prev, idStr]);
  };
  const toggleAppSelect = (appId) => {
    setSelectedAppIds(prev => prev.includes(appId) ? prev.filter(a => a !== appId) : [...prev, appId]);
  };

  // Selection toggle handlers for Frontend
  const toggleFeServerSelect = (idStr) => {
    setFeSelectedServerIds(prev => prev.includes(idStr) ? prev.filter(i => i !== idStr) : [...prev, idStr]);
  };
  const toggleFeAppSelect = (appId) => {
    setFeSelectedAppIds(prev => prev.includes(appId) ? prev.filter(a => a !== appId) : [...prev, appId]);
  };

  // Execute Streamed Batch Deployment runner over WebSockets
  const handleStartBatchDeploy = () => {
    const deployerName = user?.name || user?.email || 'Admin';

    if (activeTab === 'bundle_deploy') {
      // FULL 7-APP BUNDLE DEPLOYMENT
      if (bundleSelectedServerIds.length === 0) {
        alert('Pilih setidaknya 1 Server POD v3 Target!');
        return;
      }

      const appConfigs = [];
      Object.entries(bundleBackendConfigs).forEach(([appId, cfg]) => {
        if (cfg?.enabled !== false) {
          appConfigs.push({
            app_name: appId,
            app_type: 'backend',
            version: cfg.version || 'dev-latest',
            env_filename: cfg.env_filename || '',
            run_prisma_migrate: Boolean(cfg.run_prisma_migrate)
          });
        }
      });

      Object.entries(bundleFrontendConfigs).forEach(([appId, cfg]) => {
        if (cfg?.enabled !== false) {
          appConfigs.push({
            app_name: appId,
            app_type: 'frontend',
            version: cfg.version || '0.0.0',
            deploy_mode: 'deb'
          });
        }
      });

      if (appConfigs.length === 0) {
        alert('Pilih setidaknya 1 aplikasi dalam bundle untuk dideploy!');
        return;
      }

      setIsDeploying(true);
      setBatchLogs([]);
      setBatchSummary(null);

      const initialMatrix = {};
      podV3Servers.forEach(srv => {
        if (bundleSelectedServerIds.includes(String(srv.id))) {
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
        server_ids: bundleSelectedServerIds.map(Number),
        env: activeBundle?.environment || 'dev',
        app_configs: appConfigs,
        deployed_by: deployerName,
        bundle_id: activeBundle?.id,
        bundle_name: activeBundle?.bundle_name
      });
    } else if (activeTab === 'backend') {
      if (selectedServerIds.length === 0) {
        alert('Pilih setidaknya 1 Server POD v3!');
        return;
      }
      if (selectedAppIds.length === 0) {
        alert('Pilih setidaknya 1 Aplikasi Backend!');
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
        app_type: 'backend',
        version: selectedAppVersions[appId],
        env_filename: appEnvMapping[appId] || '',
        run_prisma_migrate: Boolean(appPrismaMapping[appId])
      }));

      setIsDeploying(true);
      setBatchLogs([]);
      setBatchSummary(null);

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
        app_configs: appConfigs,
        deployed_by: deployerName
      });
    } else {
      // FRONTEND DEPLOYMENT (small-screen & big-screen)
      if (feSelectedServerIds.length === 0) {
        alert('Pilih setidaknya 1 Server POD v3 Target Frontend!');
        return;
      }
      if (feSelectedAppIds.length === 0) {
        alert('Pilih setidaknya 1 Aplikasi Frontend (small-screen / big-screen)!');
        return;
      }
      for (const appId of feSelectedAppIds) {
        if (!feSelectedAppVersions[appId]) {
          alert(`Pilih versi artefak MinIO terlebih dahulu untuk aplikasi frontend: ${appId}`);
          return;
        }
      }

      const appConfigs = feSelectedAppIds.map(appId => ({
        app_name: appId,
        app_type: 'frontend',
        version: feSelectedAppVersions[appId],
        deploy_mode: 'deb'
      }));

      setIsDeploying(true);
      setBatchLogs([]);
      setBatchSummary(null);

      const initialMatrix = {};
      podV3Servers.forEach(srv => {
        if (feSelectedServerIds.includes(String(srv.id))) {
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
        server_ids: feSelectedServerIds.map(Number),
        env: feEnv,
        app_configs: appConfigs,
        deployed_by: deployerName
      });
    }
  };

  const handleCopyLogs = () => {
    if (batchLogs.length === 0) return;
    navigator.clipboard.writeText(batchLogs.join('\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const targetServersList = activeTab === 'bundle_deploy'
    ? podV3Servers.filter(srv => bundleSelectedServerIds.includes(String(srv.id)))
    : activeTab === 'backend'
    ? podV3Servers.filter(srv => selectedServerIds.includes(String(srv.id)))
    : podV3Servers.filter(srv => feSelectedServerIds.includes(String(srv.id)));

  const currentStages = BACKEND_JENKINS_STAGES;
  const currentAppIds = activeTab === 'bundle_deploy'
    ? [
        ...Object.entries(bundleBackendConfigs).filter(([_, c]) => c?.enabled !== false).map(([id]) => id),
        ...Object.entries(bundleFrontendConfigs).filter(([_, c]) => c?.enabled !== false).map(([id]) => id)
      ]
    : activeTab === 'backend'
    ? selectedAppIds
    : feSelectedAppIds;

  const currentServerIds = activeTab === 'bundle_deploy'
    ? bundleSelectedServerIds
    : activeTab === 'backend'
    ? selectedServerIds
    : feSelectedServerIds;

  const totalBatchCombinations = currentServerIds.length * currentAppIds.length;

  const filteredLogs = batchLogs.filter(line => {
    if (activeLogFilter === 'ALL') return true;
    return line.includes(activeLogFilter);
  });

  const handleQuickDeploy = (historyItem) => {
    if (!historyItem) return;
    const isDeb = historyItem.app_name === 'big-screen' || historyItem.app_name === 'small-screen' || historyItem.app_type === 'frontend';
    if (isDeb) {
      setActiveTab('frontend');
      setFeEnv(historyItem.environment || 'dev');
      setFeSelectedAppIds([historyItem.app_name]);
      if (historyItem.version) {
        setFeSelectedAppVersions(prev => ({ ...prev, [historyItem.app_name]: historyItem.version }));
      }
    } else {
      setActiveTab('backend');
      setEnv(historyItem.environment || 'dev');
      setSelectedAppIds([historyItem.app_name]);
      if (historyItem.version) {
        setSelectedAppVersions(prev => ({ ...prev, [historyItem.app_name]: historyItem.version }));
      }
      if (historyItem.env_filename) {
        setAppEnvMapping(prev => ({ ...prev, [historyItem.app_name]: historyItem.env_filename }));
      }
    }
  };

  const handleDeployBundle = (bundle, targetPod = null) => {
    if (!bundle) return;
    setActiveBundle(bundle);

    const srvIds = targetPod?.server_id
      ? [String(targetPod.server_id)]
      : (podV3Servers.length > 0 ? [String(podV3Servers[0].id)] : []);
    setBundleSelectedServerIds(srvIds);

    const defaultEnv = bundle.environment === 'release' ? 'assist-api-prod.env' : 'assist-api-dev.env';

    // Initialize 5 backend configs directly from Bundle Definition
    setBundleBackendConfigs({
      'mobile-api': {
        enabled: true,
        version: bundle.mobile_api_version,
        env_filename: bundle.mobile_api_env || defaultEnv,
        run_prisma_migrate: bundle.mobile_api_prisma !== undefined ? Boolean(bundle.mobile_api_prisma) : true
      },
      'mobile-synch': {
        enabled: true,
        version: bundle.mobile_synch_version,
        env_filename: bundle.mobile_synch_env || defaultEnv,
        run_prisma_migrate: Boolean(bundle.mobile_synch_prisma)
      },
      'mobile-consume': {
        enabled: true,
        version: bundle.mobile_consume_version,
        env_filename: bundle.mobile_consume_env || defaultEnv,
        run_prisma_migrate: Boolean(bundle.mobile_consume_prisma)
      },
      'mobile-downloader': {
        enabled: true,
        version: bundle.mobile_downloader_version,
        env_filename: bundle.mobile_downloader_env || defaultEnv,
        run_prisma_migrate: Boolean(bundle.mobile_downloader_prisma)
      },
      'assist-api': {
        enabled: true,
        version: bundle.assist_api_version,
        env_filename: bundle.assist_api_env || defaultEnv,
        run_prisma_migrate: Boolean(bundle.assist_api_prisma)
      }
    });

    // Initialize 2 frontend configs
    setBundleFrontendConfigs({
      'small-screen': { enabled: true, version: bundle.small_screen_version || '0.0.0' },
      'big-screen': { enabled: true, version: bundle.big_screen_version || '0.0.0' }
    });

    // Switch to Bundle Deployment View
    setActiveTab('bundle_deploy');
  };

  const consoleVersions = activeTab === 'bundle_deploy'
    ? {
        ...Object.fromEntries(Object.entries(bundleBackendConfigs).map(([k, v]) => [k, v?.version || ''])),
        ...Object.fromEntries(Object.entries(bundleFrontendConfigs).map(([k, v]) => [k, v?.version || '']))
      }
    : (activeTab === 'backend' ? selectedAppVersions : feSelectedAppVersions);

  const consoleEnvMapping = activeTab === 'bundle_deploy'
    ? Object.fromEntries(Object.entries(bundleBackendConfigs).map(([k, v]) => [k, v?.env_filename || '']))
    : appEnvMapping;

  const consolePrismaMapping = activeTab === 'bundle_deploy'
    ? Object.fromEntries(Object.entries(bundleBackendConfigs).map(([k, v]) => [k, Boolean(v?.run_prisma_migrate)]))
    : appPrismaMapping;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header with quick back button & summary */}
      <InstallationHeader
        onBack={onBack}
        elapsedSeconds={elapsedSeconds}
        formatTimer={formatTimer}
        activeTab={activeTab}
        onRefreshVersions={() => activeTab === 'backend' ? loadVersionsForBackendApps() : loadVersionsForFrontendApps()}
      />

      {/* Modern Tab Navigation Switcher */}
      <InstallationTabSwitcher
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Tab Content Rendering */}
      {activeTab === 'artifacts' ? (
        <MinioArtifactManagerTab />
      ) : activeTab === 'history' ? (
        <DeploymentHistoryTab onQuickDeploy={handleQuickDeploy} />
      ) : activeTab === 'matrix' ? (
        <PodVersionMatrixTab onQuickDeploy={handleQuickDeploy} />
      ) : activeTab === 'bundles' ? (
        <BundleVersionTab onDeployBundle={handleDeployBundle} />
      ) : (
        /* Main Configuration Grid for Backend, Frontend, and Unified Bundle Deployment */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left 2 Columns: Config Controls & Pipeline Stage Matrix */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Mode 1: Unified Bundle Suite Deployment (7 Apps) */}
            {activeTab === 'bundle_deploy' && (
              <BundleDeploymentTab
                activeBundle={activeBundle}
                onBackToBundles={() => setActiveTab('bundles')}
                podV3Servers={podV3Servers}
                selectedServerIds={bundleSelectedServerIds}
                setSelectedServerIds={setBundleSelectedServerIds}
                toggleServerSelect={(id) => {
                  const idStr = String(id);
                  setBundleSelectedServerIds(prev => prev.includes(idStr) ? prev.filter(i => i !== idStr) : [...prev, idStr]);
                }}
                backendConfigs={bundleBackendConfigs}
                setBackendConfigs={setBundleBackendConfigs}
                frontendConfigs={bundleFrontendConfigs}
                setFrontendConfigs={setBundleFrontendConfigs}
                envFiles={envFiles}
                isEnvLoading={isEnvLoading}
                isDeploying={isDeploying}
                onStartDeploy={handleStartBatchDeploy}
              />
            )}

            {/* Mode 2: Standalone Backend Installation Tab */}
            {activeTab === 'backend' && (
              <BackendInstallationTab
                podV3Servers={podV3Servers}
                selectedServerIds={selectedServerIds}
                setSelectedServerIds={setSelectedServerIds}
                toggleServerSelect={toggleServerSelect}
                selectedAppIds={selectedAppIds}
                setSelectedAppIds={setSelectedAppIds}
                toggleAppSelect={toggleAppSelect}
                env={env}
                setEnv={setEnv}
                appVersionsMap={appVersionsMap}
                selectedAppVersions={selectedAppVersions}
                setSelectedAppVersions={setSelectedAppVersions}
                isAppVersionsLoadingMap={isAppVersionsLoadingMap}
                appEnvMapping={appEnvMapping}
                setAppEnvMapping={setAppEnvMapping}
                appPrismaMapping={appPrismaMapping}
                setAppPrismaMapping={setAppPrismaMapping}
                envFiles={envFiles}
                isEnvLoading={isEnvLoading}
                isDeploying={isDeploying}
                onStartDeploy={handleStartBatchDeploy}
                totalBatchCombinations={totalBatchCombinations}
              />
            )}

            {/* Mode 3: Standalone Frontend Screen Applications Tab */}
            {activeTab === 'frontend' && (
              <FrontendInstallationTab
                podV3Servers={podV3Servers}
                feSelectedServerIds={feSelectedServerIds}
                setFeSelectedServerIds={setFeSelectedServerIds}
                toggleFeServerSelect={toggleFeServerSelect}
                feSelectedAppIds={feSelectedAppIds}
                setFeSelectedAppIds={setFeSelectedAppIds}
                toggleFeAppSelect={toggleFeAppSelect}
                feEnv={feEnv}
                setFeEnv={setFeEnv}
                feAppVersionsMap={feAppVersionsMap}
                feSelectedAppVersions={feSelectedAppVersions}
                setFeSelectedAppVersions={setFeSelectedAppVersions}
                isFeVersionsLoadingMap={isFeVersionsLoadingMap}
                isEnvLoading={isEnvLoading}
                isDeploying={isDeploying}
                onStartDeploy={handleStartBatchDeploy}
                totalBatchCombinations={totalBatchCombinations}
              />
            )}

            {/* Jenkins-Style Pipeline Stage Matrix */}
            <PipelineStageMatrix
              activeTab={activeTab}
              targetServersList={targetServersList}
              currentStages={currentStages}
              currentAppIds={currentAppIds}
              stageMatrix={stageMatrix}
              isDeploying={isDeploying}
              setActiveLogFilter={setActiveLogFilter}
            />

          </div>

          {/* Right 1 Column: Deployment Logs & Batch Progress Summary */}
          <InstallationConsole
            activeTab={activeTab}
            currentServerIds={currentServerIds}
            currentAppIds={currentAppIds}
            env={activeTab === 'bundle_deploy' ? (activeBundle?.environment || 'dev') : env}
            feEnv={activeTab === 'bundle_deploy' ? (activeBundle?.environment || 'dev') : feEnv}
            selectedAppVersions={consoleVersions}
            feSelectedAppVersions={consoleVersions}
            appEnvMapping={consoleEnvMapping}
            appPrismaMapping={consolePrismaMapping}
            batchLogs={batchLogs}
            filteredLogs={filteredLogs}
            batchSummary={batchSummary}
            activeLogFilter={activeLogFilter}
            setActiveLogFilter={setActiveLogFilter}
            targetServersList={targetServersList}
            isDeploying={isDeploying}
            isCopied={isCopied}
            onCopyLogs={handleCopyLogs}
            terminalEndRef={terminalEndRef}
          />

        </div>
      )}
    </div>
  );
}
