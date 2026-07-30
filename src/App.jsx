import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ServerCard from './components/ServerCard';
import AddServerModal from './components/AddServerModal';
import ServerDetailModal from './components/server/ServerDetailModal';
import UserManagementModal from './components/admin/UserManagementModal';
import PerformanceSummary from './components/dashboard/PerformanceSummary';
import FilterTabs from './components/dashboard/FilterTabs';
import SkeletonPerformanceSummary from './components/dashboard/SkeletonPerformanceSummary';
import SkeletonCard from './components/common/SkeletonCard';
import { useServers } from './hooks/useServers';
import { useSocket } from './hooks/useSocket';
import { fetchSettingsApi, saveSettingApi } from './api/vpsApi';
import { Server } from 'lucide-react';

export default function App() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
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
    podCount,
    podV3Count,
    podV2Count,
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
      <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Type & Version Filter Tabs + Search Input */}
        <FilterTabs
          filterType={filterType}
          setFilterType={setFilterType}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalCount={servers.length}
          vpsCount={vpsCount}
          podCount={podCount}
          podV3Count={podV3Count}
          podV2Count={podV2Count}
        />

        {/* Server Cards Display Grid (Drag & Drop Reordering Supported) */}
        {isLoading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isTvMode 
              ? 'repeat(auto-fit, minmax(420px, 1fr))' 
              : 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '20px'
          }}>
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : displayedServers.length === 0 ? (
          <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
            <Server size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto', display: 'block' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#fff' }}>Belum Ada Server Ditemukan</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              {searchQuery ? `Tidak ada VPS/POD yang cocok dengan kata kunci "${searchQuery}"` : 'Belum ada target VPS / POD yang ditambahkan'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isTvMode 
              ? 'repeat(auto-fit, minmax(420px, 1fr))' 
              : 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '20px'
          }}>
            {displayedServers.map((server, idx) => (
              <ServerCard
                key={server.id}
                server={server}
                index={idx}
                onDelete={handleDeleteServer}
                onEdit={(srv) => setEditingServer(srv)}
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
        )}

      </main>

      {/* Add / Edit VPS / POD Modal */}
      <AddServerModal
        isOpen={isAddModalOpen || Boolean(editingServer)}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingServer(null);
        }}
        serverToEdit={editingServer}
        onServerAdded={fetchServers}
      />

      {/* Detailed Server / POD View Modal */}
      {activeDetailServer && (
        <ServerDetailModal
          server={activeDetailServer}
          onClose={() => setSelectedDetailServerId(null)}
          onEdit={(srv) => setEditingServer(srv)}
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
