import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Navbar from './components/Navbar';
import ServerCard from './components/ServerCard';
import AddServerModal from './components/AddServerModal';
import { Activity, ArrowDown, ArrowUp, Cpu, HardDrive, Server, ShieldCheck } from 'lucide-react';
import { BACKEND_URL } from './config';

export default function App() {
  const [servers, setServers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

  // Calculate aggregated overall metrics
  const totalDownloadSpeed = servers.reduce((acc, s) => acc + (s.currentMetrics?.bandwidth_rx_speed || s.currentMetrics?.bandwidthRxSpeed || 0), 0);
  const totalUploadSpeed = servers.reduce((acc, s) => acc + (s.currentMetrics?.bandwidth_tx_speed || s.currentMetrics?.bandwidthTxSpeed || 0), 0);
  const onlineCount = servers.filter(s => (s.currentMetrics?.status || 'online') === 'online').length;
  
  const avgCpu = servers.length > 0
    ? Math.round(servers.reduce((acc, s) => acc + (s.currentMetrics?.cpu_usage || s.currentMetrics?.cpuUsage || 0), 0) / servers.length * 10) / 10
    : 0;

  const avgRam = servers.length > 0
    ? Math.round(servers.reduce((acc, s) => acc + (s.currentMetrics?.ram_usage || s.currentMetrics?.ramUsage || 0), 0) / servers.length * 10) / 10
    : 0;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px 40px 20px' }}>
      
      {/* Top Navbar */}
      <Navbar
        onOpenAddModal={() => setIsAddModalOpen(true)}
        totalServers={servers.length}
        isConnected={isConnected}
        onRefresh={fetchServers}
      />

      {/* Global Aggregated Performance Summary Bar */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        
        {/* Total Download */}
        <div className="glass-card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Download Speed</span>
            <ArrowDown color="#00f2fe" size={18} />
          </div>
          <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#00f2fe', marginTop: '6px' }}>
            {Math.round(totalDownloadSpeed * 10) / 10} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>KB/s</span>
          </div>
        </div>

        {/* Total Upload */}
        <div className="glass-card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Upload Speed</span>
            <ArrowUp color="#8b5cf6" size={18} />
          </div>
          <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#c084fc', marginTop: '6px' }}>
            {Math.round(totalUploadSpeed * 10) / 10} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>KB/s</span>
          </div>
        </div>

        {/* Avg CPU */}
        <div className="glass-card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rata-rata CPU Load</span>
            <Cpu color="#38bdf8" size={18} />
          </div>
          <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginTop: '6px' }}>
            {avgCpu}%
          </div>
        </div>

        {/* Online Status Ratio */}
        <div className="glass-card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status Server</span>
            <ShieldCheck color="#10b981" size={18} />
          </div>
          <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', marginTop: '6px' }}>
            {onlineCount} / {servers.length} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>Online</span>
          </div>
        </div>

      </section>

      {/* Main Server Cards Grid */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>
            Daftar VPS Terhubung
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            Auto-refresh setiap 3 detik
          </span>
        </div>

        {servers.length === 0 ? (
          <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
            <Server size={48} color="var(--primary-blue)" style={{ margin: '0 auto 16px auto', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '8px' }}>Belum Ada VPS Terdaftar</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Klik tombol di bawah untuk menambahkan server VPS yang ingin dipantau.
            </p>
            <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
              Tambah VPS Pertama
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {servers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onDelete={handleDeleteServer}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add VPS Modal */}
      <AddServerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onServerAdded={fetchServers}
      />

    </div>
  );
}
