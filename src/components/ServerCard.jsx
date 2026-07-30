import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Wifi, Server, Trash2, Activity, ArrowDown, ArrowUp, BarChart2, ShieldCheck, ShieldAlert, Box, ChevronUp, ChevronDown, Zap, Edit3 } from 'lucide-react';
import MetricsChart from './MetricsChart';
import { BACKEND_URL } from '../config';

export default function ServerCard({ server, onDelete, onEdit, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [activeChartTab, setActiveChartTab] = useState('bandwidth');
  const [historyData, setHistoryData] = useState([]);
  const [showChart, setShowChart] = useState(false);

  const metrics = server.currentMetrics || {};
  const isOnline = metrics.status === 'online';
  const isPod = server.type === 'pod';

  // Fetch history when chart tab is opened
  useEffect(() => {
    if (showChart) {
      fetchHistory();
      const interval = setInterval(fetchHistory, 4000);
      return () => clearInterval(interval);
    }
  }, [showChart, server.id]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/vps/${server.id}/history`);
      const data = await res.json();
      if (data.success) {
        setHistoryData(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch server history:', err);
    }
  };

  // Helper for progress bar color based on percentage
  const getProgressColor = (percent) => {
    if (percent >= 85) return 'linear-gradient(90deg, #ef4444, #dc2626)';
    if (percent >= 70) return 'linear-gradient(90deg, #f59e0b, #d97706)';
    return 'linear-gradient(90deg, #00f2fe, #4facfe)';
  };

  return (
    <div className="glass-card" style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      border: isPod ? '1px solid rgba(192, 132, 252, 0.25)' : '1px solid var(--border-color)',
      position: 'relative'
    }}>
      
      {/* Server Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: isPod ? 'rgba(192, 132, 252, 0.12)' : 'rgba(0, 242, 254, 0.12)',
            border: `1px solid ${isPod ? 'rgba(192, 132, 252, 0.3)' : 'rgba(0, 242, 254, 0.3)'}`,
            padding: '10px',
            borderRadius: '12px'
          }}>
            {isPod ? <Box size={22} color="#c084fc" /> : <Server size={22} color={isOnline ? '#00f2fe' : '#ef4444'} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>
                {server.name}
              </h3>
              {/* Type Badge */}
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '6px',
                background: isPod ? 'rgba(192, 132, 252, 0.2)' : 'rgba(0, 242, 254, 0.2)',
                color: isPod ? '#c084fc' : '#00f2fe',
                border: `1px solid ${isPod ? 'rgba(192, 132, 252, 0.3)' : 'rgba(0, 242, 254, 0.3)'}`
              }}>
                {isPod ? `📦 POD ${server.pod_version ? server.pod_version.toUpperCase() : 'V3'}` : '🖥️ VPS'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span className="font-mono">{server.host}:{server.port || 22}</span>
              {server.is_local === 1 && (
                <span style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                  Lokal Host
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Badge & Re-order Controls & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* Card Order Position Shift Controls */}
          <div style={{ display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              style={{
                background: 'none',
                border: 'none',
                color: isFirst ? 'var(--text-dim)' : 'var(--text-muted)',
                cursor: isFirst ? 'not-allowed' : 'pointer',
                padding: '4px'
              }}
              title="Geser ke Atas/Kiri"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              style={{
                background: 'none',
                border: 'none',
                color: isLast ? 'var(--text-dim)' : 'var(--text-muted)',
                cursor: isLast ? 'not-allowed' : 'pointer',
                padding: '4px'
              }}
              title="Geser ke Bawah/Kanan"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: isOnline ? '#10b981' : '#ef4444'
          }}>
            <span className={`live-dot ${isOnline ? 'online' : 'offline'}`} style={{ width: '8px', height: '8px' }}></span>
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            {isOnline && <span className="font-mono" style={{ opacity: 0.8, marginLeft: '4px' }}>({metrics.ping_ms || metrics.pingMs || 0}ms)</span>}
          </div>

          {server.is_local !== 1 && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => onEdit(server)}
                className="btn-secondary"
                style={{ padding: '6px 10px' }}
                title="Edit Konfigurasi Server"
              >
                <Edit3 size={15} color="#00f2fe" />
              </button>
              <button
                onClick={() => onDelete(server.id, server.name)}
                className="btn-danger"
                style={{ padding: '6px 10px' }}
                title="Hapus Server"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        
        {/* CPU Usage Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={15} color="#38bdf8" /> CPU Load
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                {metrics.cpu_cores || metrics.cpuCores || 1} Cores
              </span>
              <span className="font-mono" style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
                {metrics.cpu_usage || metrics.cpuUsage || 0}%
              </span>
            </div>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(100, metrics.cpu_usage || metrics.cpuUsage || 0)}%`,
                background: getProgressColor(metrics.cpu_usage || metrics.cpuUsage || 0)
              }}
            ></div>
          </div>
        </div>

        {/* RAM Usage Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HardDrive size={15} color="#c084fc" /> RAM Memory
            </span>
            <span className="font-mono" style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
              {metrics.ram_usage || metrics.ramUsage || 0}%
            </span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(100, metrics.ram_usage || metrics.ramUsage || 0)}%`,
                background: 'linear-gradient(90deg, #a855f7, #c084fc)'
              }}
            ></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '6px' }} className="font-mono">
            <span>Terpakai: {metrics.ram_used_mb || metrics.ramUsedMb || 0} MB</span>
            <span style={{ color: '#c084fc', fontWeight: 600 }}>Sisa: {metrics.ram_free_mb || metrics.ramFreeMb || Math.max(0, (metrics.ram_total_mb || 0) - (metrics.ram_used_mb || 0))} MB</span>
          </div>
        </div>

        {/* Bandwidth RX Card */}
        <div style={{
          background: 'rgba(0, 242, 254, 0.04)',
          border: '1px solid rgba(0, 242, 254, 0.15)',
          borderRadius: '12px',
          padding: '14px'
        }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowDown size={15} color="#00f2fe" /> Download Speed
          </span>
          <div className="font-mono" style={{ fontWeight: 700, fontSize: '1.25rem', color: '#00f2fe', marginTop: '6px' }}>
            {metrics.bandwidth_rx_speed || metrics.bandwidthRxSpeed || 0} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>KB/s</span>
          </div>
        </div>

        {/* Bandwidth TX Card */}
        <div style={{
          background: 'rgba(139, 92, 246, 0.04)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          borderRadius: '12px',
          padding: '14px'
        }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUp size={15} color="#8b5cf6" /> Upload Speed
          </span>
          <div className="font-mono" style={{ fontWeight: 700, fontSize: '1.25rem', color: '#c084fc', marginTop: '6px' }}>
            {metrics.bandwidth_tx_speed || metrics.bandwidthTxSpeed || 0} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>KB/s</span>
          </div>
        </div>

        {/* Disk Storage Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HardDrive size={15} color="#10b981" /> Disk Storage
            </span>
            <span className="font-mono" style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
              {metrics.disk_usage || metrics.diskUsage || 0}%
            </span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(100, metrics.disk_usage || metrics.diskUsage || 0)}%`,
                background: 'linear-gradient(90deg, #10b981, #34d399)'
              }}
            ></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '6px' }} className="font-mono">
            <span>Terpakai: {metrics.disk_used_gb || metrics.diskUsedGb || 0} GB</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>Sisa: {metrics.disk_free_gb || metrics.diskFreeGb || 0} GB</span>
          </div>
        </div>

        {/* GPU Activity Card */}
        {(() => {
          const hasGpu = Boolean(metrics.gpu_name && metrics.gpu_name !== 'N/A' && metrics.gpu_name !== 'No GPU / N/A' && metrics.gpu_name.trim() !== '');
          const displayGpuUsage = hasGpu ? (metrics.gpu_usage || metrics.gpuUsage || 0) : 0;

          return (
            <div style={{
              background: hasGpu ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${hasGpu ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}`,
              borderRadius: '12px',
              padding: '14px',
              opacity: hasGpu ? 1 : 0.65
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={15} color={hasGpu ? '#10b981' : '#64748b'} /> GPU Load
                </span>
                <span className="font-mono" style={{ fontWeight: 600, color: hasGpu ? '#10b981' : 'var(--text-muted)', fontSize: '0.95rem' }}>
                  {displayGpuUsage}%
                </span>
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min(100, displayGpuUsage)}%`,
                    background: hasGpu ? 'linear-gradient(90deg, #059669, #10b981)' : '#334155'
                  }}
                ></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '6px' }} className="font-mono">
                <span>{hasGpu ? metrics.gpu_name : 'Tidak Ada GPU (N/A)'}</span>
                {hasGpu && metrics.gpu_temp ? <span>{metrics.gpu_temp}°C</span> : null}
              </div>
            </div>
          );
        })()}

      </div>

      {/* Chart Toggle Footer */}
      <div style={{ borderTop: '1px solid var(--border-color)', pt: '14px', paddingTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={() => setShowChart(!showChart)}
          className="btn-secondary"
          style={{ fontSize: '0.85rem', padding: '6px 14px' }}
        >
          <BarChart2 size={16} color="#00f2fe" />
          <span>{showChart ? 'Sembunyikan Grafik' : 'Tampilkan Grafik Real-time'}</span>
        </button>

        {showChart && (
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.3)', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveChartTab('bandwidth')}
              style={{
                background: activeChartTab === 'bandwidth' ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                color: activeChartTab === 'bandwidth' ? '#00f2fe' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Bandwidth
            </button>
            <button
              onClick={() => setActiveChartTab('cpu')}
              style={{
                background: activeChartTab === 'cpu' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: activeChartTab === 'cpu' ? '#38bdf8' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              CPU
            </button>
            <button
              onClick={() => setActiveChartTab('ram')}
              style={{
                background: activeChartTab === 'ram' ? 'rgba(192, 132, 252, 0.2)' : 'transparent',
                color: activeChartTab === 'ram' ? '#c084fc' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              RAM
            </button>
            <button
              onClick={() => setActiveChartTab('gpu')}
              style={{
                background: activeChartTab === 'gpu' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: activeChartTab === 'gpu' ? '#10b981' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              GPU
            </button>
          </div>
        )}
      </div>

      {/* Render Chart when expanded */}
      {showChart && (
        <MetricsChart
          historyData={historyData}
          serverName={server.name}
          activeMetric={activeChartTab}
        />
      )}

    </div>
  );
}
