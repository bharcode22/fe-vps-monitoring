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
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, index)}
      onDragOver={(e) => onDragOver && onDragOver(e, index)}
      onDrop={(e) => onDrop && onDrop(e, index)}
      onDragEnd={onDragEnd}
      onClick={() => onSelectServer && onSelectServer(server)}
      className={`glass-card p-6 flex flex-col justify-between relative cursor-grab transition-all duration-200 rounded-2xl border ${isDragging ? 'opacity-45 border-dashed border-cyan-400 scale-[0.98]' : 'border-slate-800 bg-slate-900/60 backdrop-blur-md'
        }`}
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

      {/* Metrics Grid (2 Columns x 3 Rows - Spacious Layout) */}
      {server.type === 'postgresql' ? (
        <div className="grid grid-cols-2 gap-3.5 my-4">
          <div className="bg-sky-500/5 border border-sky-500/20 rounded-2xl p-4">
            <div className="text-xs text-slate-400 mb-1 font-medium">Koneksi Aktif</div>
            <div className="text-xl font-extrabold text-sky-400 font-mono">
              {metrics.activeConnections ?? 0} <span className="text-xs font-normal text-slate-400">/ {metrics.totalConnections ?? 0}</span>
            </div>
          </div>

          <div className="bg-sky-500/5 border border-sky-500/20 rounded-2xl p-4">
            <div className="text-xs text-slate-400 mb-1 font-medium">Ukuran Database</div>
            <div className="text-xl font-extrabold text-sky-400 font-mono">
              {metrics.ramUsedMb || metrics.ram_used_mb ? `${metrics.ramUsedMb || metrics.ram_used_mb} MB` : '0 MB'}
            </div>
          </div>

          <div className="bg-sky-500/5 border border-sky-500/20 rounded-2xl p-4">
            <div className="text-xs text-slate-400 mb-1 font-medium">Total Transaksi</div>
            <div className="text-xl font-extrabold text-sky-400 font-mono">
              {metrics.totalTransactions ? metrics.totalTransactions.toLocaleString() : 0}
            </div>
          </div>

          <div className="bg-sky-500/5 border border-sky-500/20 rounded-2xl p-4">
            <div className="text-xs text-slate-400 mb-1 font-medium">Latensi Ping DB</div>
            <div className="text-xl font-extrabold text-sky-400 font-mono">
              {metrics.pingMs ?? metrics.ping_ms ?? 0} <span className="text-xs font-normal">ms</span>
            </div>
          </div>
        </div>
      ) : (server.type === 'minio' || server.type === 's3') ? (
        <div className="grid grid-cols-2 gap-3.5 my-4">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
            <div className="text-xs text-slate-400 mb-1 font-medium">Total Bucket</div>
            <div className="text-xl font-extrabold text-amber-400 font-mono">
              {metrics.totalBuckets ?? 0} <span className="text-xs font-normal">Bucket</span>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
            <div className="text-xs text-slate-400 mb-1 font-medium">Jumlah File (Objects)</div>
            <div className="text-xl font-extrabold text-amber-400 font-mono">
              {metrics.totalObjects ? metrics.totalObjects.toLocaleString() : 0}
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
            <div className="text-xs text-slate-400 mb-1 font-medium">Storage Terpakai</div>
            <div className="text-xl font-extrabold text-amber-400 font-mono">
              {metrics.diskUsedGb || metrics.disk_used_gb ? `${metrics.diskUsedGb || metrics.disk_used_gb} GB` : `${metrics.ramUsedMb || metrics.ram_used_mb || 0} MB`}
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
            <div className="text-xs text-slate-400 mb-1 font-medium">Latensi S3 Endpoint</div>
            <div className="text-xl font-extrabold text-amber-400 font-mono">
              {metrics.pingMs ?? metrics.ping_ms ?? 0} <span className="text-xs font-normal">ms</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 my-4">
          {/* Row 1: CPU Load & RAM Memory */}
          <CpuMetricCard
            cpuUsage={metrics.cpu_usage || metrics.cpuUsage || 0}
            cpuCores={metrics.cpu_cores || metrics.cpuCores || 1}
          />

          <RamMetricCard
            ramUsage={metrics.ram_usage || metrics.ramUsage || 0}
            ramUsedMb={metrics.ram_used_mb || metrics.ramUsedMb || 0}
            ramFreeMb={metrics.ram_free_mb || metrics.ramFreeMb || 0}
          />

          {/* Row 2: Download Speed & Upload Speed */}
          <DownloadSpeedCard speed={metrics.bandwidth_rx_speed || metrics.bandwidthRxSpeed || 0} />
          <UploadSpeedCard speed={metrics.bandwidth_tx_speed || metrics.bandwidthTxSpeed || 0} />

          {/* Row 3: Disk Storage & GPU Load */}
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
      )}

      {/* Chart Toggle Footer */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-t border-slate-800 pt-3.5 mt-4 flex items-center justify-between flex-wrap gap-3"
      >
        <button
          onClick={(e) => { e.stopPropagation(); setShowChart(!showChart); }}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <BarChart2 size={16} className="text-cyan-400" />
          <span>{showChart ? t('hideChart') : t('showChart')}</span>
        </button>

        {showChart && (
          <div className="flex gap-1.5 bg-black/30 p-1 rounded-lg">
            {['bandwidth', 'cpu', 'ram', 'gpu'].map(tab => (
              <button
                key={tab}
                onClick={(e) => { e.stopPropagation(); setActiveChartTab(tab); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${activeChartTab === tab ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
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
