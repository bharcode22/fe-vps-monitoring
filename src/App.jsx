import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ServerCard from './components/ServerCard';
import AddServerModal from './components/AddServerModal';
import AddServiceModal from './components/AddServiceModal';
import ServerDetailModal from './components/server/ServerDetailModal';
import UserManagementModal from './components/admin/UserManagementModal';
import PerformanceSummary from './components/serverList/PerformanceSummary';
import FilterTabs from './components/serverList/FilterTabs';
import SkeletonPerformanceSummary from './components/serverList/SkeletonPerformanceSummary';
import SkeletonCard from './components/common/SkeletonCard';
import DatabaseSyncPage from './pages/DatabaseSyncPage';
import SoundsComparisonPage from './pages/SoundsComparisonPage';
import MetadataComparisonPage from './pages/MetadataComparisonPage';
import RabbitMqMonitorPage from './pages/RabbitMqMonitorPage';
import InstallationPage from './pages/InstallationPage';
import EnvManagerPage from './pages/EnvManagerPage';
import StorageManagerPage from './pages/StorageManagerPage';
import MultimediaRabbitMqSyncPage from './pages/MultimediaRabbitMqSyncPage';
import DashboardPage from './pages/DashboardPage';
import PodTopicDebuggerPage from './pages/PodTopicDebuggerPage';
import MasterPodSyncMatrixPage from './pages/MasterPodSyncMatrixPage';
import TncManagerPage from './pages/TncManagerPage';
import UserManagerPage from './pages/UserManagerPage';
import PodLogsSyncPage from './pages/PodLogsSyncPage';
import PodActivityPage from './pages/PodActivityPage';
import SettingsPage from './pages/SettingsPage';
import { useServers } from './hooks/useServers';
import { useSocket } from './hooks/useSocket';
import { fetchSettingsApi, saveSettingApi } from './api/vpsApi';
import { useAuth } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { Server, Database, HardDrive, Cpu, ShieldCheck } from 'lucide-react';

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState(() => {
    try {
      const saved = localStorage.getItem('vps_monitoring_current_view');
      return saved || 'dashboard';
    } catch (e) {
      return 'dashboard';
    }
  }); // 'dashboard' | 'sync' | 'sounds-comparison' | 'metadata-comparison' | 'rabbitmq' | 'installation'

  // Persist currentView changes to localStorage
  useEffect(() => {
    localStorage.setItem('vps_monitoring_current_view', currentView);
  }, [currentView]);

  // Auto switch back to dashboard when user logs out (wait until auth initialization completes)
  useEffect(() => {
    const protectedViews = ['sync', 'sounds-comparison', 'metadata-comparison', 'rabbitmq', 'installation', 'instalation', 'content-manager', 'content', 'pod-topic-debugger', 'pod-topics', 'settings'];
    if (!loading && !isAuthenticated && protectedViews.includes(currentView)) {
      setCurrentView('dashboard');
    }
  }, [isAuthenticated, loading, currentView]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [selectedDetailServerId, setSelectedDetailServerId] = useState(null);
  const [storageInitialCode, setStorageInitialCode] = useState(() => {
    return localStorage.getItem('storageManagerInitialCode') || null;
  });
  const [storageReturnView, setStorageReturnView] = useState(() => {
    return localStorage.getItem('storageManagerReturnView') || null;
  });

  const handleNavigateView = (view, extraParams = null) => {
    if (extraParams?.code) {
      setStorageInitialCode(extraParams.code);
      localStorage.setItem('storageManagerInitialCode', extraParams.code);
    }
    if (extraParams?.returnView !== undefined) {
      setStorageReturnView(extraParams.returnView);
      if (extraParams.returnView) {
        localStorage.setItem('storageManagerReturnView', extraParams.returnView);
      } else {
        localStorage.removeItem('storageManagerReturnView');
      }
    }
    setCurrentView(view);
  };

  // Persistent TV Mode state (Restores instantly from localStorage & syncs with DB)
  const [isTvMode, setIsTvMode] = useState(() => {
    try {
      const saved = localStorage.getItem('vps_monitoring_tv_mode');
      return saved === 'true';
    } catch (e) {
      return false;
    }
  });

  // Sync settings from backend SQLite DB on mount
  useEffect(() => {
    fetchSettingsApi().then(settings => {
      if (settings && settings.tv_mode !== undefined) {
        const val = settings.tv_mode === 'true';
        setIsTvMode(val);
        localStorage.setItem('vps_monitoring_tv_mode', String(val));
      }
    });
  }, []);

  const handleToggleTvMode = () => {
    const nextMode = !isTvMode;
    setIsTvMode(nextMode);
    localStorage.setItem('vps_monitoring_tv_mode', String(nextMode));
    saveSettingApi('tv_mode', String(nextMode));
  };

  const handleStartEdit = (srv) => {
    if (srv.type === 'postgresql' || srv.type === 'minio' || srv.type === 's3') {
      setEditingService(srv);
    } else {
      setEditingServer(srv);
    }
  };

  const [draggedIndex, setDraggedIndex] = useState(null);

  const {
    servers,
    allServers,
    displayedServers,
    isLoading,
    filterType,
    setFilterType,
    searchQuery,
    setSearchQuery,
    vpsCount,
    podV3Count,
    podV2Count,
    postgresCount,
    storageCount,
    fetchServers,
    handleMetricsUpdate,
    handleDeleteServer,
    handleMoveUp,
    handleMoveDown,
    handleReorder
  } = useServers();

  const { isConnected } = useSocket(handleMetricsUpdate, fetchServers);

  // Drag & Drop gesture handlers
  const handleDragStart = (e, idx) => {
    setDraggedIndex(idx);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIdx) {
      handleReorder(draggedIndex, dropIdx, displayedServers);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Keep detail modal server object updated with latest live metrics
  const activeDetailServer = selectedDetailServerId
    ? ((allServers && allServers.length > 0 ? allServers : servers).find(s => s.id === selectedDetailServerId) || servers.find(s => s.id === selectedDetailServerId))
    : null;

  // Group servers by categories
  const vpsPodGroup = displayedServers.filter(s => (s.type || 'vps') === 'vps' || s.type === 'pod');
  const postgresGroup = displayedServers.filter(s => s.type === 'postgresql');
  const minioGroup = displayedServers.filter(s => s.type === 'minio');
  const s3Group = displayedServers.filter(s => s.type === 's3');

  const gridClassName = `grid gap-5 transition-all duration-300 ${isTvMode
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'
    }`;

  const isMultimediaSyncView = ['multimedia-sync', 'rabbitmq-pod-sync', 're-save-sync'].includes(currentView);

  const isFullWidthView = isTvMode || isMultimediaSyncView || [
    'pod-topic-debugger',
    'pod-topics',
    'master-pod-sync',
    'master-sync',
    'database-users',
    'db-users',
    'user-manager',
    'storage-manager',
    'storage',
    'content-manager',
    'content',
    'pod-logs-sync',
    'pod-logs'
  ].includes(currentView);

  return (
    <div className={`mx-auto transition-all duration-300 ${
      isMultimediaSyncView
        ? 'w-full max-w-[98%] 2xl:max-w-[1920px] px-2 sm:px-4 lg:px-6 pb-2'
        : isFullWidthView
          ? 'w-full max-w-[98%] 2xl:max-w-[1920px] px-2 sm:px-4 lg:px-6 pb-10'
          : 'max-w-7xl px-4 sm:px-6 pb-10'
      }`}>

      {/* Header Top Navbar */}
      <Navbar
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenAddServiceModal={() => setIsAddServiceModalOpen(true)}
        onOpenUserModal={() => setIsUserModalOpen(true)}
        totalServers={servers.length}
        isConnected={isConnected}
        onRefresh={fetchServers}
        isTvMode={isTvMode}
        onToggleTvMode={handleToggleTvMode}
        currentView={currentView}
        onNavigateView={handleNavigateView}
      />

      {/* Render View: Dashboard, Server List, Installation, or Tools */}
      <ErrorBoundary title="Gagal Memuat Tampilan Halaman">
      {currentView === 'settings' ? (
        <SettingsPage
          onBack={() => handleNavigateView('dashboard')}
          onOpenUserModal={() => setIsUserModalOpen(true)}
          isTvMode={isTvMode}
          onToggleTvMode={handleToggleTvMode}
        />
      ) : currentView === 'database-users' || currentView === 'db-users' || currentView === 'user-manager' ? (
        <UserManagerPage onBack={() => handleNavigateView('dashboard')} />
      ) : currentView === 'pod-activity' || currentView === 'pod-occupancy' ? (
        <PodActivityPage onBack={() => handleNavigateView('dashboard')} />
      ) : currentView === 'pod-logs-sync' || currentView === 'pod-logs' ? (
        <PodLogsSyncPage onBack={() => handleNavigateView('dashboard')} />
      ) : currentView === 'tnc-sync-manager' ? (
        <TncManagerPage onBack={() => handleNavigateView('dashboard')} />
      ) : currentView === 'master-pod-sync' || currentView === 'master-sync' ? (
        <MasterPodSyncMatrixPage onBack={() => handleNavigateView('dashboard')} />
      ) : currentView === 'pod-topic-debugger' || currentView === 'pod-topics' ? (
        <PodTopicDebuggerPage onBack={() => handleNavigateView('dashboard')} />
      ) : currentView === 'storage-manager' || currentView === 'storage' || currentView === 'content-manager' || currentView === 'content' ? (
        <StorageManagerPage
          onBack={() => handleNavigateView('dashboard')}
          onNavigateView={handleNavigateView}
          initialActiveCode={storageInitialCode}
          onClearInitialActiveCode={() => setStorageInitialCode(null)}
          returnView={storageReturnView}
          onClearReturnView={() => setStorageReturnView(null)}
        />
      ) : currentView === 'env-manager' ? (
        <EnvManagerPage onBack={() => handleNavigateView('dashboard')} />
      ) : currentView === 'installation' || currentView === 'instalation' ? (
        <InstallationPage onBack={() => handleNavigateView('dashboard')} />
      ) : currentView === 'metadata-comparison' ? (
        <MetadataComparisonPage onBack={() => handleNavigateView('dashboard')} />
      ) : currentView === 'sounds-comparison' ? (
        <SoundsComparisonPage onBack={() => handleNavigateView('dashboard')} />
      ) : currentView === 'multimedia-sync' || currentView === 'rabbitmq-pod-sync' || currentView === 're-save-sync' ? (
        <MultimediaRabbitMqSyncPage
          onBack={() => handleNavigateView('dashboard')}
          onNavigateView={handleNavigateView}
        />
      ) : currentView === 'rabbitmq' ? (
        <RabbitMqMonitorPage onBack={() => handleNavigateView('dashboard')} />
      ) : currentView === 'sync' ? (
        <DatabaseSyncPage
          servers={servers}
          onBack={() => handleNavigateView('dashboard')}
        />
      ) : currentView === 'dashboard' ? (
        <DashboardPage
          servers={allServers && allServers.length > 0 ? allServers : servers}
          onRefreshServers={fetchServers}
          onSelectServer={(srv) => setSelectedDetailServerId(srv.id)}
          onNavigateView={setCurrentView}
        />
      ) : (
        /* Server List & Infrastructure Monitoring View */
        <>
          {/* Global Performance Summary Bar */}
          {isLoading ? (
            <SkeletonPerformanceSummary />
          ) : (
            <PerformanceSummary servers={servers} />
          )}

          {/* Main Server Cards Section */}
          <main className="flex flex-col gap-6">

            {/* Type & Version Filter Tabs + Search Input */}
            <FilterTabs
              filterType={filterType}
              setFilterType={setFilterType}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              totalCount={servers.length}
              vpsCount={vpsCount}
              podV3Count={podV3Count}
              podV2Count={podV2Count}
              postgresCount={postgresCount}
              storageCount={storageCount}
            />

            {/* Server Cards Display Grid */}
            {isLoading ? (
              <div className={gridClassName}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : displayedServers.length === 0 ? (
              <div className="glass-card p-12 text-center flex flex-col items-center justify-center">
                <Server size={48} className="text-slate-500 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Belum Ada Server / Layanan Ditemukan</h3>
                <p className="text-slate-400 text-sm mb-5">
                  {searchQuery ? `Tidak ada layanan yang cocok dengan kata kunci "${searchQuery}"` : 'Belum ada target VPS / POD / PostgreSQL / Storage yang ditambahkan'}
                </p>
              </div>
            ) : filterType !== 'all' || searchQuery ? (
              /* Filtered Single Grid View */
              <div className={gridClassName}>
                {displayedServers.map((server, idx) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    index={idx}
                    onDelete={handleDeleteServer}
                    onEdit={handleStartEdit}
                    onSelectServer={(srv) => setSelectedDetailServerId(srv.id)}
                    onMoveUp={() => handleMoveUp(idx, displayedServers)}
                    onMoveDown={() => handleMoveDown(idx, displayedServers)}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedIndex === idx}
                    isFirst={idx === 0}
                    isLast={idx === displayedServers.length - 1}
                  />
                ))}
              </div>
            ) : (
              /* Grouped Categorized View (All Mode) */
              <div className="flex flex-col gap-8">

                {/* Group 1: VPS & POD SSH Servers */}
                {vpsPodGroup.length > 0 && (
                  <section className="flex flex-col gap-3.5">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-cyan-500/20">
                      <Server size={20} className="text-cyan-400" />
                      <h3 className="text-base font-extrabold text-white tracking-tight">
                        Server VPS & POD (SSH)
                      </h3>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                        {vpsPodGroup.length} Server
                      </span>
                    </div>
                    <div className={gridClassName}>
                      {vpsPodGroup.map((server, idx) => (
                        <ServerCard
                          key={server.id}
                          server={server}
                          index={idx}
                          onDelete={handleDeleteServer}
                          onEdit={handleStartEdit}
                          onSelectServer={(srv) => setSelectedDetailServerId(srv.id)}
                          onMoveUp={() => handleMoveUp(idx, vpsPodGroup)}
                          onMoveDown={() => handleMoveDown(idx, vpsPodGroup)}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onDragEnd={handleDragEnd}
                          isDragging={draggedIndex === idx}
                          isFirst={idx === 0}
                          isLast={idx === vpsPodGroup.length - 1}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Group 2: PostgreSQL Databases */}
                {postgresGroup.length > 0 && (
                  <section className="flex flex-col gap-3.5">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-sky-500/20">
                      <Database size={20} className="text-sky-400" />
                      <h3 className="text-base font-extrabold text-white tracking-tight">
                        Database PostgreSQL
                      </h3>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        {postgresGroup.length} Database
                      </span>
                    </div>
                    <div className={gridClassName}>
                      {postgresGroup.map((server, idx) => (
                        <ServerCard
                          key={server.id}
                          server={server}
                          index={idx}
                          onDelete={handleDeleteServer}
                          onEdit={handleStartEdit}
                          onSelectServer={(srv) => setSelectedDetailServerId(srv.id)}
                          onMoveUp={() => handleMoveUp(idx, postgresGroup)}
                          onMoveDown={() => handleMoveDown(idx, postgresGroup)}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onDragEnd={handleDragEnd}
                          isDragging={draggedIndex === idx}
                          isFirst={idx === 0}
                          isLast={idx === postgresGroup.length - 1}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Group 3: MinIO Object Storage */}
                {minioGroup.length > 0 && (
                  <section className="flex flex-col gap-3.5">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-amber-500/20">
                      <HardDrive size={20} className="text-amber-400" />
                      <h3 className="text-base font-extrabold text-white tracking-tight">
                        MinIO Object Storage
                      </h3>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        {minioGroup.length} Service
                      </span>
                    </div>
                    <div className={gridClassName}>
                      {minioGroup.map((server, idx) => (
                        <ServerCard
                          key={server.id}
                          server={server}
                          index={idx}
                          onDelete={handleDeleteServer}
                          onEdit={handleStartEdit}
                          onSelectServer={(srv) => setSelectedDetailServerId(srv.id)}
                          onMoveUp={() => handleMoveUp(idx, minioGroup)}
                          onMoveDown={() => handleMoveDown(idx, minioGroup)}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onDragEnd={handleDragEnd}
                          isDragging={draggedIndex === idx}
                          isFirst={idx === 0}
                          isLast={idx === minioGroup.length - 1}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Group 4: AWS S3 Storage */}
                {s3Group.length > 0 && (
                  <section className="flex flex-col gap-3.5">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-pink-500/20">
                      <HardDrive size={20} className="text-pink-400" />
                      <h3 className="text-base font-extrabold text-white tracking-tight">
                        AWS S3 Object Storage
                      </h3>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-400/30">
                        {s3Group.length} Service
                      </span>
                    </div>
                    <div className={gridClassName}>
                      {s3Group.map((server, idx) => (
                        <ServerCard
                          key={server.id}
                          server={server}
                          index={idx}
                          onDelete={handleDeleteServer}
                          onEdit={handleStartEdit}
                          onSelectServer={(srv) => setSelectedDetailServerId(srv.id)}
                          onMoveUp={() => handleMoveUp(idx, s3Group)}
                          onMoveDown={() => handleMoveDown(idx, s3Group)}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onDragEnd={handleDragEnd}
                          isDragging={draggedIndex === idx}
                          isFirst={idx === 0}
                          isLast={idx === s3Group.length - 1}
                        />
                      ))}
                    </div>
                  </section>
                )}

              </div>
            )}

          </main>
        </>
      )}
      </ErrorBoundary>

      {/* Global Footer displayed on all pages except full-screen single-screen tools */}
      {!isMultimediaSyncView && <Footer />}

      {/* Add / Edit VPS / POD SSH Modal */}
      <AddServerModal
        isOpen={isAddModalOpen || Boolean(editingServer)}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingServer(null);
        }}
        serverToEdit={editingServer}
        onServerAdded={fetchServers}
      />

      {/* Add / Edit Database & Storage Service Modal */}
      <AddServiceModal
        isOpen={isAddServiceModalOpen || Boolean(editingService)}
        onClose={() => {
          setIsAddServiceModalOpen(false);
          setEditingService(null);
        }}
        serviceToEdit={editingService}
        onServerAdded={fetchServers}
      />

      {/* Detailed Server / POD View Modal */}
      {activeDetailServer && (
        <ServerDetailModal
          server={activeDetailServer}
          onClose={() => setSelectedDetailServerId(null)}
          onEdit={handleStartEdit}
        />
      )}

      {/* Super Admin User Management Approval Modal */}
      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />

    </div>
  );
}
