import React, { useState, useEffect } from 'react';
import { X, Server, Box, Cpu, HardDrive, ArrowDown, ArrowUp, Zap, Clock, ShieldCheck, Edit3, Activity, FileCode } from 'lucide-react';
import MetricsChart from '../MetricsChart';
import { fetchServerHistoryApi } from '../../api/vpsApi';
import { formatMbToGb } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import DockerContainerTab from './DockerContainerTab';
import ScriptExecTab from './ScriptExecTab';

export default function ServerDetailModal({ server, onClose, onEdit }) {
  const { isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState('metrics'); // 'metrics' | 'docker' | 'scripts'
  const [activeTab, setActiveTab] = useState('bandwidth');
  const [historyData, setHistoryData] = useState([]);

  if (!server) return null;

  const metrics = server.currentMetrics || {};
  const isOnline = metrics.status === 'online';
  const isPod = server.type === 'pod';
  const podVersionText = server.pod_version ? server.pod_version.toUpperCase() : 'V3';
  const hasGpu = Boolean(metrics.gpu_name && metrics.gpu_name !== 'N/A' && metrics.gpu_name !== 'No GPU / N/A' && metrics.gpu_name.trim() !== '');

  // Load 60 history points on mount & append live WebSocket metrics
  useEffect(() => {
    loadHistory();
  }, [server.id]);

  useEffect(() => {
    if (metrics && metrics.timestamp) {
      setHistoryData(prev => {
        const newPoint = {
          cpu_usage: metrics.cpu_usage || metrics.cpuUsage || 0,
          ram_usage: metrics.ram_usage || metrics.ramUsage || 0,
          ram_used_mb: metrics.ram_used_mb || metrics.ramUsedMb || 0,
          ram_total_mb: metrics.ram_total_mb || metrics.ramTotalMb || 0,
          bandwidth_rx_speed: metrics.bandwidth_rx_speed || metrics.bandwidthRxSpeed || 0,
          bandwidth_tx_speed: metrics.bandwidth_tx_speed || metrics.bandwidthTxSpeed || 0,
          disk_usage: metrics.disk_usage || metrics.diskUsage || 0,
          gpu_usage: metrics.gpu_usage || metrics.gpuUsage || 0,
          gpu_memory_usage: metrics.gpu_memory_usage || metrics.gpuMemoryUsage || 0,
          timestamp: new Date(metrics.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        const updated = [...prev, newPoint];
        if (updated.length > 60) updated.shift();
        return updated;
      });
    }
  }, [metrics.timestamp]);

  const loadHistory = async () => {
    try {
      const data = await fetchServerHistoryApi(server.id);
      const formatted = data.map(item => ({
        cpu_usage: item.cpu_usage || 0,
        ram_usage: item.ram_usage || 0,
        ram_used_mb: item.ram_used_mb || 0,
        ram_total_mb: item.ram_total_mb || 0,
        bandwidth_rx_speed: item.bandwidth_rx_speed || 0,
        bandwidth_tx_speed: item.bandwidth_tx_speed || 0,
        disk_usage: item.disk_usage || 0,
        gpu_usage: item.gpu_usage || 0,
        gpu_memory_usage: item.gpu_memory_usage || 0,
        timestamp: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }));
      setHistoryData(formatted);
    } catch (err) {
      console.error('Failed to load server history:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-card modal-aos-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95vw',
          maxWidth: '1300px',
          padding: '36px',
          maxHeight: '92vh',
          overflowY: 'auto'
        }}
      >
        {/* Header Title & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: isPod ? 'rgba(192, 132, 252, 0.15)' : (isOnline ? 'rgba(0, 242, 254, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
              border: `1px solid ${isPod ? 'rgba(192, 132, 252, 0.3)' : (isOnline ? 'rgba(0, 242, 254, 0.3)' : 'rgba(239, 68, 68, 0.3)')}`,
              padding: '12px',
              borderRadius: '14px'
            }}>
              {isPod ? <Box size={28} color="#c084fc" /> : <Server size={28} color={isOnline ? '#00f2fe' : '#ef4444'} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>{server.name}</h2>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: isPod ? 'rgba(192, 132, 252, 0.2)' : 'rgba(0, 242, 254, 0.2)',
                  color: isPod ? '#c084fc' : '#00f2fe',
                  border: `1px solid ${isPod ? 'rgba(192, 132, 252, 0.3)' : 'rgba(0, 242, 254, 0.3)'}`
                }}>
                  {isPod ? `📦 POD ${podVersionText}` : '🖥️ VPS'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {isAuthenticated ? (
                  <>
                    <span className="font-mono">{server.host}:{server.port}</span>
                    <span>•</span>
                    <span>User: {server.username}</span>
                  </>
                ) : (
                  <span className="font-mono" style={{ opacity: 0.6, letterSpacing: '1px' }}>••••.••••.••••.••••</span>
                )}
                {server.is_local === 1 && <span style={{ color: 'var(--primary-cyan)', fontWeight: 600 }}>(Host Server Lokal)</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Status Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: isOnline ? '#10b981' : '#ef4444'
            }}>
              <span className={`live-dot ${isOnline ? 'online' : 'offline'}`} style={{ width: '8px', height: '8px' }}></span>
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            {/* Edit Button (Admin Only) */}
            {isAuthenticated && server.is_local !== 1 && (
              <button
                onClick={() => { onClose(); onEdit(server); }}
                className="btn-secondary"
                style={{ padding: '8px 14px' }}
                title="Edit Konfigurasi Server"
              >
                <Edit3 size={16} color="#00f2fe" />
                <span>Edit</span>
              </button>
            )}

            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* View Mode Switcher (Metrics vs Docker Apps) - Admin Only */}
        {isAuthenticated && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <button
              onClick={() => setViewMode('metrics')}
              style={{
                background: viewMode === 'metrics' ? 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)' : 'rgba(255,255,255,0.05)',
                color: viewMode === 'metrics' ? '#0b0f19' : 'var(--text-muted)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Activity size={16} /> Metrik & Grafik Real-time
            </button>

            <button
              onClick={() => setViewMode('docker')}
              style={{
                background: viewMode === 'docker' ? 'linear-gradient(135deg, #c084fc 0%, #a855f7 100%)' : 'rgba(255,255,255,0.05)',
                color: viewMode === 'docker' ? '#0b0f19' : 'var(--text-muted)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Box size={16} /> 🐳 Docker Apps (Manage)
            </button>

            <button
              onClick={() => setViewMode('scripts')}
              style={{
                background: viewMode === 'scripts' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(255,255,255,0.05)',
                color: viewMode === 'scripts' ? '#0b0f19' : 'var(--text-muted)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <FileCode size={16} /> ⚡ Exec Scripts (kill-process ➡️ auto-script)
            </button>
          </div>
        )}

        {/* Dynamic Content View */}
        {viewMode === 'docker' && isAuthenticated ? (
          <DockerContainerTab serverId={server.id} />
        ) : viewMode === 'scripts' && isAuthenticated ? (
          <ScriptExecTab serverId={server.id} />
        ) : (
          <div>
            {/* Real-time Current Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              
              {/* CPU Card */}
              <div style={{ background: 'rgba(56, 189, 248, 0.04)', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '14px', padding: '16px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={16} color="#38bdf8" /> CPU Load ({metrics.cpu_cores || metrics.cpuCores || 1} Cores)
                </span>
                <div className="font-mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: '#38bdf8', margin: '8px 0 4px 0' }}>
                  {metrics.cpu_usage || metrics.cpuUsage || 0}%
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${metrics.cpu_usage || 0}%`, background: '#38bdf8' }}></div>
                </div>
              </div>

              {/* RAM Card */}
              <div style={{ background: 'rgba(192, 132, 252, 0.04)', border: '1px solid rgba(192, 132, 252, 0.15)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HardDrive size={16} color="#c084fc" /> RAM Memory
                  </span>
                  <span className="font-mono" style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: 600 }}>
                    {metrics.ram_usage || metrics.ramUsage || 0}%
                  </span>
                </div>
                <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: '8px 0 4px 0' }}>
                  {formatMbToGb(metrics.ram_used_mb || metrics.ramUsedMb || 0)} / {formatMbToGb(metrics.ram_total_mb || metrics.ramTotalMb || 0)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Sisa: <span style={{ color: '#c084fc', fontWeight: 600 }}>{formatMbToGb(metrics.ram_free_mb || metrics.ramFreeMb || 0)}</span>
                </div>
              </div>

              {/* Disk Card */}
              <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HardDrive size={16} color="#10b981" /> Disk Storage
                  </span>
                  <span className="font-mono" style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
                    {metrics.disk_usage || metrics.diskUsage || 0}%
                  </span>
                </div>
                <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: '8px 0 4px 0' }}>
                  {metrics.disk_used_gb || metrics.diskUsedGb || 0} GB / {metrics.disk_total_gb || metrics.diskTotalGb || 0} GB
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Sisa: <span style={{ color: '#10b981', fontWeight: 600 }}>{metrics.disk_free_gb || metrics.diskFreeGb || 0} GB</span>
                </div>
              </div>

              {/* Network Bandwidth Card */}
              <div style={{ background: 'rgba(0, 242, 254, 0.04)', border: '1px solid rgba(0, 242, 254, 0.15)', borderRadius: '14px', padding: '16px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={16} color="#00f2fe" /> Bandwidth Speed
                </span>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }} className="font-mono">
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}><ArrowDown size={12} color="#00f2fe" /> Download</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#00f2fe' }}>{metrics.bandwidth_rx_speed || metrics.bandwidthRxSpeed || 0} KB/s</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}><ArrowUp size={12} color="#8b5cf6" /> Upload</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#c084fc' }}>{metrics.bandwidth_tx_speed || metrics.bandwidthTxSpeed || 0} KB/s</span>
                  </div>
                </div>
              </div>

              {/* GPU Hardware Card */}
              <div style={{ background: hasGpu ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255, 255, 255, 0.02)', border: `1px solid ${hasGpu ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}`, borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={16} color={hasGpu ? '#10b981' : '#64748b'} /> GPU Hardware
                  </span>
                  {hasGpu && metrics.gpu_temp ? <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>{metrics.gpu_temp}°C</span> : null}
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: hasGpu ? '#fff' : 'var(--text-muted)', margin: '8px 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {hasGpu ? metrics.gpu_name : 'Tidak Ada GPU Hardware'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }} className="font-mono">
                  Load: {hasGpu ? (metrics.gpu_usage || metrics.gpuUsage || 0) : 0}% | VRAM: {hasGpu ? (metrics.gpu_memory_usage || metrics.gpuMemoryUsage || 0) : 0}%
                </div>
              </div>

            </div>

            {/* Real-Time Historical Charts Container */}
            <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} color="#00f2fe" /> Grafik Tren Real-time Server
                </h3>

                {/* Metric Tab Selector */}
                <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.4)', padding: '4px', borderRadius: '10px' }}>
                  {[
                    { key: 'bandwidth', label: 'Bandwidth (KB/s)' },
                    { key: 'cpu', label: 'CPU Load (%)' },
                    { key: 'ram', label: 'RAM Memory (%)' },
                    { key: 'gpu', label: 'GPU Hardware' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        background: activeTab === tab.key ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(79, 172, 254, 0.2) 100%)' : 'transparent',
                        color: activeTab === tab.key ? '#00f2fe' : 'var(--text-muted)',
                        border: activeTab === tab.key ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid transparent',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <MetricsChart
                historyData={historyData}
                serverName={server.name}
                activeMetric={activeTab}
              />
            </div>
          </div>
        )}

        {/* System & Connection Information Details */}
        <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tipe Infrastruktur</span>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginTop: '4px' }}>
              {isPod ? `📦 POD Container (${podVersionText})` : '🖥️ Standar VPS Server'}
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Metode Otentikasi SSH</span>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginTop: '4px' }}>
              {server.auth_type === 'key' ? '🔑 Private SSH Key' : '🔒 Password SSH'}
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Waktu Pendaftaran</span>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} color="var(--primary-cyan)" />
              <span className="font-mono">{server.created_at || 'Baru Saja'}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
