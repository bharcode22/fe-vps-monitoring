import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Navbar from './components/Navbar';
import ServerCard from './components/ServerCard';
import AddServerModal from './components/AddServerModal';
import { Activity, ArrowDown, ArrowUp, Cpu, HardDrive, Server, ShieldCheck, Box, Filter, Grid, Zap } from 'lucide-react';
import { BACKEND_URL } from './config';

export default function App() {
  const [servers, setServers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'vps' | 'pod'
  const [isTvMode, setIsTvMode] = useState(false);
  const [customOrder, setCustomOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('vps_monitoring_order');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    // Initial fetch via REST API
    fetchServers();

    // Connect WebSocket
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket Connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket Disconnected');
      setIsConnected(false);
    });

    socket.on('metrics_update', (updatedServers) => {
      setServers(updatedServers);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchServers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/vps`);
      const data = await res.json();
      if (data.success) {
        setServers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch VPS list:', err);
    }
  };

  const handleDeleteServer = async (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus server "${name}" dari monitoring?`)) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/vps/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          fetchServers();
        }
      } catch (err) {
        console.error('Error deleting server:', err);
      }
    }
  };

  // Re-ordering logic (Shift Position)
  const saveOrder = (newOrderedList) => {
    const orderIds = newOrderedList.map(s => s.id);
    setCustomOrder(orderIds);
    localStorage.setItem('vps_monitoring_order', JSON.stringify(orderIds));
  };

  const handleMoveUp = (index, filteredList) => {
    if (index <= 0) return;
    const newList = [...filteredList];
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;
    saveOrder(newList);
  };

  const handleMoveDown = (index, filteredList) => {
    if (index >= filteredList.length - 1) return;
    const newList = [...filteredList];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;
    saveOrder(newList);
  };

  // Sort servers according to stored customOrder
  const sortedServers = [...servers].sort((a, b) => {
    const idxA = customOrder.indexOf(a.id);
    const idxB = customOrder.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.id - b.id;
  });

  // Filter servers by type & pod_version
  const displayedServers = sortedServers.filter(s => {
    if (filterType === 'vps') return (s.type || 'vps') === 'vps';
    if (filterType === 'pod') return s.type === 'pod';
    if (filterType === 'pod_v3') return s.type === 'pod' && (s.pod_version === 'v3' || !s.pod_version);
    if (filterType === 'pod_v2') return s.type === 'pod' && s.pod_version === 'v2';
    return true; // 'all'
  });

  const vpsCount = servers.filter(s => (s.type || 'vps') === 'vps').length;
  const podCount = servers.filter(s => s.type === 'pod').length;
  const podV3Count = servers.filter(s => s.type === 'pod' && (s.pod_version === 'v3' || !s.pod_version)).length;
  const podV2Count = servers.filter(s => s.type === 'pod' && s.pod_version === 'v2').length;

  // Calculate aggregated overall metrics
  const totalDownloadSpeed = servers.reduce((acc, s) => acc + (s.currentMetrics?.bandwidth_rx_speed || s.currentMetrics?.bandwidthRxSpeed || 0), 0);
  const totalUploadSpeed = servers.reduce((acc, s) => acc + (s.currentMetrics?.bandwidth_tx_speed || s.currentMetrics?.bandwidthTxSpeed || 0), 0);
  const onlineCount = servers.filter(s => (s.currentMetrics?.status || 'online') === 'online').length;

  const avgCpu = servers.length > 0
    ? Math.round(servers.reduce((acc, s) => acc + (s.currentMetrics?.cpu_usage || s.currentMetrics?.cpuUsage || 0), 0) / servers.length * 10) / 10
    : 0;

  const gpuServers = servers.filter(s => s.currentMetrics?.gpu_name && s.currentMetrics.gpu_name !== 'N/A' && s.currentMetrics.gpu_name !== 'No GPU / N/A');
  const avgGpu = gpuServers.length > 0
    ? Math.round(gpuServers.reduce((acc, s) => acc + (s.currentMetrics?.gpu_usage || s.currentMetrics?.gpuUsage || 0), 0) / gpuServers.length * 10) / 10
    : 0;

  return (
    <div style={{
      maxWidth: isTvMode ? '100%' : '1440px',
      margin: '0 auto',
      padding: isTvMode ? '0 16px 40px 16px' : '0 24px 40px 24px',
      transition: 'all 0.3s ease'
    }}>
      
      {/* Top Navbar */}
      <Navbar
        onOpenAddModal={() => setIsAddModalOpen(true)}
        totalServers={servers.length}
        isConnected={isConnected}
        onRefresh={fetchServers}
        isTvMode={isTvMode}
        onToggleTvMode={() => setIsTvMode(!isTvMode)}
      />

      {/* Global Aggregated Performance Summary Bar */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        
        {/* Total Download */}
        <div className="glass-card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Download Speed</span>
            <ArrowDown color="#00f2fe" size={18} />
          </div>
          <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00f2fe', marginTop: '6px' }}>
            {Math.round(totalDownloadSpeed * 10) / 10} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>KB/s</span>
          </div>
        </div>

        {/* Total Upload */}
        <div className="glass-card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Upload Speed</span>
            <ArrowUp color="#8b5cf6" size={18} />
          </div>
          <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c084fc', marginTop: '6px' }}>
            {Math.round(totalUploadSpeed * 10) / 10} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>KB/s</span>
          </div>
        </div>

        {/* Avg CPU */}
        <div className="glass-card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rata-rata CPU Load</span>
            <Cpu color="#38bdf8" size={18} />
          </div>
          <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginTop: '6px' }}>
            {avgCpu}%
          </div>
        </div>

        {/* Avg GPU */}
        <div className="glass-card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rata-rata GPU Load</span>
            <Zap color="#10b981" size={18} />
          </div>
          <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginTop: '6px' }}>
            {avgGpu}%
          </div>
        </div>

        {/* Online Status Ratio */}
        <div className="glass-card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status Server</span>
            <ShieldCheck color="#10b981" size={18} />
          </div>
          <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginTop: '6px' }}>
            {onlineCount} / {servers.length} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>Online</span>
          </div>
        </div>

      </section>

      {/* Main Server Cards Grid */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header & Type Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Grid size={20} color="#00f2fe" />
            <span>Daftar Infrastruktur Terhubung</span>
          </h2>

          {/* Type Filter Buttons */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(0, 0, 0, 0.35)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setFilterType('all')}
              style={{
                background: filterType === 'all' ? 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)' : 'transparent',
                color: filterType === 'all' ? '#0b0f19' : 'var(--text-muted)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              Semua ({servers.length})
            </button>

            <button
              onClick={() => setFilterType('vps')}
              style={{
                background: filterType === 'vps' ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                color: filterType === 'vps' ? '#00f2fe' : 'var(--text-muted)',
                border: filterType === 'vps' ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid transparent',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              🖥️ VPS ({vpsCount})
            </button>

            <button
              onClick={() => setFilterType('pod')}
              style={{
                background: filterType === 'pod' ? 'rgba(192, 132, 252, 0.2)' : 'transparent',
                color: filterType === 'pod' ? '#c084fc' : 'var(--text-muted)',
                border: filterType === 'pod' ? '1px solid rgba(192, 132, 252, 0.4)' : '1px solid transparent',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              📦 POD Semua ({podCount})
            </button>

            <button
              onClick={() => setFilterType('pod_v3')}
              style={{
                background: filterType === 'pod_v3' ? 'rgba(192, 132, 252, 0.25)' : 'transparent',
                color: filterType === 'pod_v3' ? '#c084fc' : 'var(--text-muted)',
                border: filterType === 'pod_v3' ? '1px solid #c084fc' : '1px solid transparent',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              ⚡ POD v3 ({podV3Count})
            </button>

            <button
              onClick={() => setFilterType('pod_v2')}
              style={{
                background: filterType === 'pod_v2' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                color: filterType === 'pod_v2' ? '#f59e0b' : 'var(--text-muted)',
                border: filterType === 'pod_v2' ? '1px solid #f59e0b' : '1px solid transparent',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              🐢 POD v2 ({podV2Count})
            </button>
          </div>
        </div>

        {/* Server Cards Display Grid (Optimized for Big Monitors / TVs) */}
        {displayedServers.length === 0 ? (
          <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
            <Server size={48} color="var(--primary-blue)" style={{ margin: '0 auto 16px auto', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '8px' }}>
              {filterType === 'vps' ? 'Belum Ada Server VPS' : filterType === 'pod' ? 'Belum Ada POD Container' : 'Belum Ada Server Terdaftar'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Klik tombol di bawah untuk menambahkan VPS atau POD baru ke monitoring.
            </p>
            <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
              Tambah Server Baru
            </button>
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
                onDelete={handleDeleteServer}
                onEdit={(srv) => setEditingServer(srv)}
                onMoveUp={() => handleMoveUp(idx, displayedServers)}
                onMoveDown={() => handleMoveDown(idx, displayedServers)}
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

    </div>
  );
}
