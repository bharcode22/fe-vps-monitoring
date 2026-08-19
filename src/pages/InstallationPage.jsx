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
import PipelineStageMatrix from '../components/installation/PipelineStageMatrix';
import InstallationConsole from '../components/installation/InstallationConsole';
import MinioArtifactManagerTab from '../components/installation/MinioArtifactManagerTab';

export default function InstallationPage({ onBack }) {
  // Main Tab Navigation State ('backend' | 'frontend' | 'artifacts')
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

      const targetServers = activeTab === 'backend'
        ? podV3Servers.filter(srv => selectedServerIds.includes(String(srv.id)))
        : podV3Servers.filter(srv => feSelectedServerIds.includes(String(srv.id)));

      // Reset stage matrix for target servers
      const initialMatrix = {};
      targetServers.forEach(srv => {
        initialMatrix[srv.name] = { 1: 'pending', 2: 'pending', 3: 'pending', 4: 'pending', 5: 'pending' };
      });
      setStageMatrix(initialMatrix);
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
  }, [activeTab, podV3Servers, selectedServerIds, feSelectedServerIds]);

  // Auto-scroll terminal log to bottom on new log chunk
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [batchLogs]);

  // Load available POD v3 servers
  useEffect(() => {
    fetchServersApi()
      .then(servers => {
        const list = servers || [];
        const v3Pods = list.filter(s => s.pod_version === 'v3');
        setPodV3Servers(v3Pods);

        if (v3Pods.length > 0) {
          setSelectedServerIds([String(v3Pods[0].id)]);
          setFeSelectedServerIds([String(v3Pods[0].id)]);
        }
      })
      .catch(err => {
        console.error('Gagal memuat daftar server POD v3:', err);
      });
  }, []);

  // Load .env files from backend/envoirment & initialize smart mapping
  useEffect(() => {
    setIsEnvLoading(true);
    fetchInstallationEnvFilesApi()
      .then(res => {
        const files = res.files || [];
        setEnvFiles(files);

        if (files.length > 0) {
          const beMapping = {};
          POD_APPS.forEach(app => {
            const matchedFile = files.find(f => f.name.toLowerCase().includes(app.id)) || files[0];
            if (matchedFile) beMapping[app.id] = matchedFile.name;
          });
          setAppEnvMapping(beMapping);
        }
      })
      .catch(err => {
        console.error('Gagal memuat daftar file .env:', err);
      })
      .finally(() => {
        setIsEnvLoading(false);
      });
  }, []);

  // Load MinIO artifact versions for backend apps
  const loadVersionsForBackendApps = async (appIdsToFetch = selectedAppIds) => {
    if (appIdsToFetch.length === 0) return;
    appIdsToFetch.forEach(async (appId) => {
      setIsAppVersionsLoadingMap(prev => ({ ...prev, [appId]: true }));
      try {
        const res = await fetchInstallationVersionsApi(appId, env);
        const list = res.versions || [];
        setAppVersionsMap(prev => ({ ...prev, [appId]: list }));
        if (list.length > 0) {
          setSelectedAppVersions(prev => {
            if (prev[appId] && list.includes(prev[appId])) return prev;
            return { ...prev, [appId]: list[0] };
          });
        } else {
          setSelectedAppVersions(prev => ({ ...prev, [appId]: '' }));
        }
      } catch (err) {
        console.error(`Gagal memuat versi MinIO backend untuk ${appId}:`, err);
      } finally {
        setIsAppVersionsLoadingMap(prev => ({ ...prev, [appId]: false }));
      }
    });
  };

  // Load MinIO artifact versions for frontend apps (Screen-Apps/small-screen-app & Screen-Apps/big-screen-app)
  const loadVersionsForFrontendApps = async (appIdsToFetch = feSelectedAppIds) => {
    if (appIdsToFetch.length === 0) return;
    appIdsToFetch.forEach(async (appId) => {
      setIsFeVersionsLoadingMap(prev => ({ ...prev, [appId]: true }));
      try {
        const res = await fetchInstallationVersionsApi(appId, feEnv);
        const list = res.versions || [];
        setFeAppVersionsMap(prev => ({ ...prev, [appId]: list }));
        if (list.length > 0) {
          setFeSelectedAppVersions(prev => {
            if (prev[appId] && list.includes(prev[appId])) return prev;
            return { ...prev, [appId]: list[0] };
          });
        } else {
          setFeSelectedAppVersions(prev => ({ ...prev, [appId]: '' }));
        }
      } catch (err) {
        console.error(`Gagal memuat versi MinIO frontend untuk ${appId}:`, err);
      } finally {
        setIsFeVersionsLoadingMap(prev => ({ ...prev, [appId]: false }));
      }
    });
  };

  useEffect(() => {
    if (activeTab === 'backend') {
      loadVersionsForBackendApps();
    } else {
      loadVersionsForFrontendApps();
    }
  }, [activeTab, selectedAppIds, feSelectedAppIds, env, feEnv]);

  // Format seconds to MM:SS timer
  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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
    if (activeTab === 'backend') {
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
        app_configs: appConfigs
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
        app_configs: appConfigs
      });
    }
  };

  const handleCopyLogs = () => {
    if (batchLogs.length === 0) return;
    navigator.clipboard.writeText(batchLogs.join('\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const targetServersList = activeTab === 'backend'
    ? podV3Servers.filter(srv => selectedServerIds.includes(String(srv.id)))
    : podV3Servers.filter(srv => feSelectedServerIds.includes(String(srv.id)));

  const currentStages = activeTab === 'backend' ? BACKEND_JENKINS_STAGES : FRONTEND_JENKINS_STAGES;
  const currentAppIds = activeTab === 'backend' ? selectedAppIds : feSelectedAppIds;
  const currentServerIds = activeTab === 'backend' ? selectedServerIds : feSelectedServerIds;
  const totalBatchCombinations = currentServerIds.length * currentAppIds.length;

  const filteredLogs = batchLogs.filter(line => {
    if (activeLogFilter === 'ALL') return true;
    return line.includes(activeLogFilter);
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <InstallationHeader
        onBack={onBack}
        elapsedSeconds={elapsedSeconds}
        formatTimer={formatTimer}
        activeTab={activeTab}
        onRefreshVersions={() => activeTab === 'backend' ? loadVersionsForBackendApps() : loadVersionsForFrontendApps()}
      />

      {/* Main Mode Navigation Tabs (Backend vs Frontend vs MinIO Artifacts) */}
      <InstallationTabSwitcher
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Tab 3: MinIO Artifact & Version Manager */}
      {activeTab === 'artifacts' ? (
        <MinioArtifactManagerTab />
      ) : (
        /* Main Configuration Grid for Backend & Frontend Deployment */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left 2 Columns: Config Controls & Pipeline Stage Matrix */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Backend Installation Tab */}
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

            {/* Frontend Screen Applications Tab */}
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
            env={env}
            feEnv={feEnv}
            selectedAppVersions={selectedAppVersions}
            feSelectedAppVersions={feSelectedAppVersions}
            appEnvMapping={appEnvMapping}
            appPrismaMapping={appPrismaMapping}
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
