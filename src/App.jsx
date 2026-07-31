import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ServerCard from './components/ServerCard';
import AddServerModal from './components/AddServerModal';
import AddServiceModal from './components/AddServiceModal';
import ServerDetailModal from './components/server/ServerDetailModal';
import UserManagementModal from './components/admin/UserManagementModal';
import PerformanceSummary from './components/dashboard/PerformanceSummary';
import FilterTabs from './components/dashboard/FilterTabs';
import SkeletonPerformanceSummary from './components/dashboard/SkeletonPerformanceSummary';
import SkeletonCard from './components/common/SkeletonCard';
import { useServers } from './hooks/useServers';
import { useSocket } from './hooks/useSocket';
import { fetchSettingsApi, saveSettingApi } from './api/vpsApi';
import { Server, Database, HardDrive, Cpu, ShieldCheck } from 'lucide-react';

export default function App() {
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

  const { isConnected } = useSocket(handleMetricsUpdate);

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

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isTvMode 
      ? 'repeat(auto-fit, minmax(420px, 1fr))' 
      : 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: '20px'
  };

  return (
    <div style={{
      maxWidth: isTvMode ? '100%' : '1440px',
      margin: '0 auto',
      padding: isTvMode ? '0 16px 40px 16px' : '0 24px 40px 24px',
      transition: 'all 0.3s ease'
    }}>
      
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
      />

      {/* Global Performance Summary Bar */}
      {isLoading ? (
        <SkeletonPerformanceSummary />
      ) : (
        <PerformanceSummary servers={servers} />
      )}

      {/* Main Server Cards Section */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
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
          <div style={gridStyle}>
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : displayedServers.length === 0 ? (
          <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
            <Server size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto', display: 'block' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#fff' }}>Belum Ada Server / Layanan Ditemukan</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              {searchQuery ? `Tidak ada layanan yang cocok dengan kata kunci "${searchQuery}"` : 'Belum ada target VPS / POD / PostgreSQL / Storage yang ditambahkan'}
            </p>
          </div>
        ) : filterType !== 'all' || searchQuery ? (
          /* Filtered Single Grid View */
          <div style={gridStyle}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Group 1: VPS & POD SSH Servers */}
            {vpsPodGroup.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '4px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)' }}>
                  <Server size={22} color="#00f2fe" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                    Server VPS & POD (SSH)
                  </h3>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe' }}>
                    {vpsPodGroup.length} Server
                  </span>
                </div>
                <div style={gridStyle}>
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
              <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '4px', borderBottom: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <Database size={22} color="#38bdf8" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                    Database PostgreSQL
                  </h3>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                    {postgresGroup.length} Database
                  </span>
                </div>
                <div style={gridStyle}>
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
              <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '4px', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <HardDrive size={22} color="#f59e0b" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                    MinIO Object Storage
                  </h3>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    {minioGroup.length} Service
                  </span>
                </div>
                <div style={gridStyle}>
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
              <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '4px', borderBottom: '1px solid rgba(236, 72, 153, 0.2)' }}>
                  <HardDrive size={22} color="#ec4899" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                    AWS S3 Object Storage
                  </h3>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                    {s3Group.length} Service
                  </span>
                </div>
                <div style={gridStyle}>
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
