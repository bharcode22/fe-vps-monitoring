import React, { useState, useEffect } from 'react';
import { BarChart2 } from 'lucide-react';
import MetricsChart from './MetricsChart';
import ServerHeader from './server/ServerHeader';
import CpuMetricCard from './server/cards/CpuMetricCard';
import RamMetricCard from './server/cards/RamMetricCard';
import { DownloadSpeedCard, UploadSpeedCard } from './server/cards/BandwidthMetricCard';
import DiskMetricCard from './server/cards/DiskMetricCard';
import GpuMetricCard from './server/cards/GpuMetricCard';
import { fetchServerHistoryApi } from '../api/vpsApi';
import { useLanguage } from '../context/LanguageContext';

export default function ServerCard({
  server,
  index,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onSelectServer,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging
}) {
  const { t } = useLanguage();
  const [activeChartTab, setActiveChartTab] = useState('bandwidth');
  const [historyData, setHistoryData] = useState([]);
  const [showChart, setShowChart] = useState(false);

  const metrics = server.currentMetrics || {};
  const isOnline = metrics.status === 'online';
  const isPod = server.type === 'pod';

  // Fetch initial 60 history points ONCE when real-time chart tab is opened
  useEffect(() => {
    if (showChart) {
      loadHistory();
    }
  }, [showChart, server.id]);

  // Real-time WebSocket push: Stream live metrics into chart without any HTTP GET polling
  useEffect(() => {
    if (showChart && metrics && metrics.timestamp) {
      setHistoryData(prev => {
        if (prev.length === 0) return prev;
        const lastPoint = prev[prev.length - 1];
        if (lastPoint && lastPoint.timestamp === metrics.timestamp) {
          return prev;
        }
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
          gpu_temp: metrics.gpu_temp || metrics.gpuTemp || 0,
          ping_ms: metrics.ping_ms || metrics.pingMs || 0,
          timestamp: metrics.timestamp
        };
        return [...prev.slice(-59), newPoint];
      });
    }
  }, [metrics, showChart]);

  const loadHistory = async () => {
    try {
      const data = await fetchServerHistoryApi(server.id);
      setHistoryData(data);
    } catch (err) {
      console.error(`Error loading history for server ${server.id}:`, err);
    }
  };

  return (
    <div
      className="glass-card"
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, index)}
      onDragOver={(e) => onDragOver && onDragOver(e, index)}
      onDrop={(e) => onDrop && onDrop(e, index)}
      onDragEnd={onDragEnd}
      onClick={() => onSelectServer && onSelectServer(server)}
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justify: 'space-between',
        position: 'relative',
        cursor: 'grab',
        opacity: isDragging ? 0.45 : 1,
        border: isDragging ? '2px dashed var(--primary-cyan)' : undefined,
        transform: isDragging ? 'scale(0.98)' : 'none',
        transition: 'all 0.2s ease'
      }}
    >
      
      {/* Server Header */}
      <ServerHeader
        server={server}
        isOnline={isOnline}
        isPod={isPod}
        pingMs={metrics.ping_ms || metrics.pingMs || 0}
        onDelete={onDelete}
        onEdit={onEdit}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        isFirst={isFirst}
        isLast={isLast}
      />

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <CpuMetricCard
          cpuUsage={metrics.cpu_usage || metrics.cpuUsage || 0}
          cpuCores={metrics.cpu_cores || metrics.cpuCores || 1}
        />
        
        <RamMetricCard
          ramUsage={metrics.ram_usage || metrics.ramUsage || 0}
          ramUsedMb={metrics.ram_used_mb || metrics.ramUsedMb || 0}
          ramFreeMb={metrics.ram_free_mb || metrics.ramFreeMb || 0}
        />

        <DownloadSpeedCard speed={metrics.bandwidth_rx_speed || metrics.bandwidthRxSpeed || 0} />
        <UploadSpeedCard speed={metrics.bandwidth_tx_speed || metrics.bandwidthTxSpeed || 0} />

        <DiskMetricCard
          diskUsage={metrics.disk_usage || metrics.diskUsage || 0}
          diskUsedGb={metrics.disk_used_gb || metrics.diskUsedGb || 0}
          diskFreeGb={metrics.disk_free_gb || metrics.diskFreeGb || 0}
        />

        <GpuMetricCard
          gpuUsage={metrics.gpu_usage || metrics.gpuUsage || 0}
          gpuName={metrics.gpu_name || metrics.gpuName || ''}
          gpuTemp={metrics.gpu_temp || metrics.gpuTemp || 0}
        />
      </div>

      {/* Chart Toggle Footer */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ borderTop: '1px solid var(--border-color)', pt: '14px', paddingTop: '14px', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setShowChart(!showChart); }}
          className="btn-secondary"
          style={{ fontSize: '0.85rem', padding: '6px 14px' }}
        >
          <BarChart2 size={16} color="#00f2fe" />
          <span>{showChart ? t('hideChart') : t('showChart')}</span>
        </button>

        {showChart && (
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.3)', padding: '4px', borderRadius: '8px' }}>
            {['bandwidth', 'cpu', 'ram', 'gpu'].map(tab => (
              <button
                key={tab}
                onClick={(e) => { e.stopPropagation(); setActiveChartTab(tab); }}
                style={{
                  background: activeChartTab === tab ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                  color: activeChartTab === tab ? '#00f2fe' : 'var(--text-muted)',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                  textTransform: 'capitalize'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recharts Area Component */}
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
