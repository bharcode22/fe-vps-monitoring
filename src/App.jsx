import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ServerCard from './components/ServerCard';
import AddServerModal from './components/AddServerModal';
import AddServiceModal from './components/AddServiceModal';
import ServerDetailModal from './components/server/ServerDetailModal';
import UserManagementModal from './components/admin/UserManagementModal';
import PerformanceSummary from './components/dashboard/PerformanceSummary';
import FilterTabs from './components/dashboard/FilterTabs';
import SkeletonPerformanceSummary from './components/dashboard/SkeletonPerformanceSummary';
import SkeletonCard from './components/common/SkeletonCard';
import DatabaseSyncPage from './pages/DatabaseSyncPage';
import SoundsComparisonPage from './pages/SoundsComparisonPage';
import MetadataComparisonPage from './pages/MetadataComparisonPage';
import RabbitMqMonitorPage from './pages/RabbitMqMonitorPage';
import { useServers } from './hooks/useServers';
import { useSocket } from './hooks/useSocket';
import { fetchSettingsApi, saveSettingApi } from './api/vpsApi';
import { useAuth } from './context/AuthContext';
import { Server, Database, HardDrive, Cpu, ShieldCheck } from 'lucide-react';

export default function App() {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState(() => {
    try {
      const saved = localStorage.getItem('vps_monitoring_current_view');
      return saved || 'dashboard';
    } catch (e) {
      return 'dashboard';
    }
  }); // 'dashboard' | 'sync' | 'sounds-comparison' | 'metadata-comparison' | 'rabbitmq'

  // Persist currentView changes to localStorage
  useEffect(() => {
    localStorage.setItem('vps_monitoring_current_view', currentView);
  }, [currentView]);

  // Auto switch back to dashboard when user logs out
  useEffect(() => {
    if (!isAuthenticated && currentView !== 'dashboard') {
      setCurrentView('dashboard');
    }
  }, [isAuthenticated, currentView]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [selectedDetailServerId, setSelectedDetailServerId] = useState(null);

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
    ? servers.find(s => s.id === selectedDetailServerId)
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

  return (
    <div className={`mx-auto pb-10 transition-all duration-300 ${isTvMode ? 'w-full px-4' : 'max-w-7xl px-4 sm:px-6'
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
        onNavigateView={setCurrentView}
      />

      {/* Render View: Database Synchronization Page or Main Dashboard */}
      {currentView === 'metadata-comparison' ? (
        <MetadataComparisonPage onBack={() => setCurrentView('dashboard')} />
      ) : currentView === 'sounds-comparison' ? (
        <SoundsComparisonPage onBack={() => setCurrentView('dashboard')} />
      ) : currentView === 'rabbitmq' ? (
        <RabbitMqMonitorPage onBack={() => setCurrentView('dashboard')} />
      ) : currentView === 'sync' ? (
        <DatabaseSyncPage
          servers={servers}
          onBack={() => setCurrentView('dashboard')}
        />
      ) : (
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
          <Footer />
        </>
      )}

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
