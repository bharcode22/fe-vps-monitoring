import React, { useState, useEffect } from 'react';
import { X, Server, Box, Cpu, HardDrive, ArrowDown, ArrowUp, Zap, Clock, ShieldCheck, Edit3, Activity, FileCode, Music, Layers } from 'lucide-react';
import MetricsChart from '../MetricsChart';
import { fetchServerHistoryApi } from '../../api/vpsApi';
import { formatMbToGb } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import DockerContainerTab from './DockerContainerTab';
import Pm2AppTab from './Pm2AppTab';
import ScriptExecTab from './ScriptExecTab';
import SoundsTab from './SoundsTab';

export default function ServerDetailModal({ server, onClose, onEdit }) {
  const { isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState('metrics'); // 'metrics' | 'docker' | 'scripts' | 'sounds'
  const [activeTab, setActiveTab] = useState('bandwidth');
  const [historyData, setHistoryData] = useState([]);

  const serverId = server?.id;
  const metrics = server?.currentMetrics || {};

  // Load 60 history points on mount & append live WebSocket metrics
  useEffect(() => {
    if (!serverId) return;
    fetchServerHistoryApi(serverId)
      .then(data => {
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
          timestamp: new Date(item.created_at || item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }));
        setHistoryData(formatted);
      })
      .catch(err => console.error(`Error loading history for server ${serverId}:`, err));
  }, [serverId]);

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

  if (!server) return null;

  const isOnline = metrics.status === 'online';
  const isPod = server.type === 'pod';
  const podVersionText = server.pod_version ? server.pod_version.toUpperCase() : 'V3';
  const hasGpu = Boolean(metrics.gpu_name && metrics.gpu_name !== 'N/A' && metrics.gpu_name !== 'No GPU / N/A' && metrics.gpu_name.trim() !== '');

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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[999] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-[95vw] max-w-7xl max-h-[92vh] overflow-y-auto p-6 md:p-8 bg-slate-950 border border-cyan-500/30 rounded-3xl shadow-2xl shadow-black/90"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Title & Actions */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${isPod
              ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
              : isOnline
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                : 'bg-red-500/15 border-red-500/30 text-red-400'
              }`}>
              {isPod ? <Box size={28} /> : <Server size={28} />}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white">{server.name}</h2>
                <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-md border ${isPod ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                  }`}>
                  {isPod ? `POD ${podVersionText}` : 'VPS'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                {isAuthenticated ? (
                  <>
                    <span className="font-mono">{server.host}:{server.port}</span>
                    <span>•</span>
                    <span>User: {server.username}</span>
                  </>
                ) : (
                  <span className="font-mono opacity-60 tracking-wider">••••.••••.••••.••••</span>
                )}
                {server.is_local === 1 && <span className="text-cyan-400 font-semibold">(Host Server Lokal)</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Pill */}
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${isOnline
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/15 border-red-500/30 text-red-400'
              }`}>
              <span className={`live-dot ${isOnline ? 'online' : 'offline'} w-2 h-2`}></span>
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            {/* Edit Button (Admin Only) */}
            {isAuthenticated && server.is_local !== 1 && (
              <button
                onClick={() => { onClose(); onEdit(server); }}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Edit Konfigurasi Server"
              >
                <Edit3 size={16} />
                <span>Edit</span>
              </button>
            )}

            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* View Mode Switcher (Metrics vs Docker Apps) - Admin Only */}
        {isAuthenticated && (
          <div className="flex gap-2 mb-5 border-b border-slate-800 pb-3 flex-wrap">
            <button
              onClick={() => setViewMode('metrics')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${viewMode === 'metrics'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
            >
              <Activity size={16} /> Metrik & Grafik Real-time
            </button>

            <button
              onClick={() => setViewMode('docker')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${viewMode === 'docker'
                ? 'bg-gradient-to-r from-purple-400 to-purple-600 text-slate-950 shadow-md shadow-purple-500/20'
                : 'bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
            >
              <Box size={16} /> Docker Apps
            </button>

            <button
              onClick={() => setViewMode('pm2')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${viewMode === 'pm2'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
            >
              <Layers size={16} /> PM2 Services
            </button>

            <button
              onClick={() => setViewMode('scripts')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${viewMode === 'scripts'
                ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
            >
              <FileCode size={16} /> Exec Scripts
            </button>

            <button
              onClick={() => setViewMode('sounds')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${viewMode === 'sounds'
                ? 'bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
            >
              <Music size={16} /> Sounds Metadata
            </button>
          </div>
        )}

        {/* Dynamic Content View */}
        {viewMode === 'docker' && isAuthenticated ? (
          <DockerContainerTab serverId={server.id} />
        ) : viewMode === 'pm2' && isAuthenticated ? (
          <Pm2AppTab serverId={server.id} />
        ) : viewMode === 'scripts' && isAuthenticated ? (
          <ScriptExecTab serverId={server.id} />
        ) : viewMode === 'sounds' && isAuthenticated ? (
          <SoundsTab serverId={server.id} />
        ) : (
          <div>
            {/* Real-time Current Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">

              {/* CPU Card */}
              <div className="bg-sky-500/5 border border-sky-500/20 rounded-2xl p-4">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Cpu size={16} className="text-sky-400" /> CPU Load ({metrics.cpu_cores || metrics.cpuCores || 1} Cores)
                </span>
                <div className="font-mono text-2xl font-bold text-sky-400 my-2">
                  {metrics.cpu_usage || metrics.cpuUsage || 0}%
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill bg-sky-400" style={{ width: `${metrics.cpu_usage || 0}%` }}></div>
                </div>
              </div>

              {/* RAM Card */}
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <HardDrive size={16} className="text-purple-400" /> RAM Memory
                  </span>
                  <span className="font-mono text-xs text-purple-400 font-semibold">
                    {metrics.ram_usage || metrics.ramUsage || 0}%
                  </span>
                </div>
                <div className="font-mono text-2xl font-bold text-purple-400 my-2">
                  {formatMbToGb(metrics.ram_used_mb || metrics.ramUsedMb)}
                  <span className="text-xs text-slate-400 font-normal ml-1">
                    / {formatMbToGb(metrics.ram_total_mb || metrics.ramTotalMb)}
                  </span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill bg-purple-400" style={{ width: `${metrics.ram_usage || 0}%` }}></div>
                </div>
              </div>

              {/* Disk Card */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <HardDrive size={16} className="text-amber-400" /> Disk Storage
                  </span>
                  <span className="font-mono text-xs text-amber-400 font-semibold">
                    {metrics.disk_usage || metrics.diskUsage || 0}%
                  </span>
                </div>
                <div className="font-mono text-2xl font-bold text-amber-400 my-2">
                  {metrics.disk_used_gb || metrics.diskUsedGb || 0} GB
                  <span className="text-xs text-slate-400 font-normal ml-1">
                    / {metrics.disk_total_gb || metrics.diskTotalGb || 0} GB
                  </span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill bg-amber-400" style={{ width: `${metrics.disk_usage || 0}%` }}></div>
                </div>
              </div>

              {/* Bandwidth Card */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Zap size={16} className="text-emerald-400" /> Bandwidth Speed
                </span>
                <div className="my-2 flex flex-col gap-1 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1"><ArrowDown size={14} className="text-cyan-400" /> Download:</span>
                    <span className="text-cyan-400 font-bold">{(metrics.bandwidth_rx_speed || metrics.bandwidthRxSpeed || 0).toFixed(1)} KB/s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1"><ArrowUp size={14} className="text-purple-400" /> Upload:</span>
                    <span className="text-purple-400 font-bold">{(metrics.bandwidth_tx_speed || metrics.bandwidthTxSpeed || 0).toFixed(1)} KB/s</span>
                  </div>
                </div>
              </div>

            </div>

            {/* GPU Status Card (If Available) */}
            {hasGpu && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4.5 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className="text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">GPU Card: {metrics.gpu_name || metrics.gpuName}</h4>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                    Suhu: {metrics.gpu_temp || metrics.gpuTemp || 0}°C
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">GPU Core Compute:</span>
                      <span className="text-emerald-400 font-bold font-mono">{metrics.gpu_usage || metrics.gpuUsage || 0}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill bg-emerald-400" style={{ width: `${metrics.gpu_usage || 0}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">VRAM Memory Usage:</span>
                      <span className="text-emerald-400 font-bold font-mono">{metrics.gpu_memory_usage || metrics.gpuMemoryUsage || 0}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill bg-emerald-400" style={{ width: `${metrics.gpu_memory_usage || 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Real-time Recharts Component */}
            <div className="bg-black/35 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-cyan-400" />
                  <h4 className="text-sm font-bold text-white">Grafik Riwayat Performa Live (60 Poin Snapshot)</h4>
                </div>

                {/* Metric Selector Tabs */}
                <div className="flex gap-1.5 bg-black/40 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setActiveTab('bandwidth')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'bandwidth' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    Bandwidth
                  </button>
                  <button
                    onClick={() => setActiveTab('cpu')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'cpu' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    CPU
                  </button>
                  <button
                    onClick={() => setActiveTab('ram')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'ram' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    RAM
                  </button>
                  {hasGpu && (
                    <button
                      onClick={() => setActiveTab('gpu')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'gpu' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      GPU
                    </button>
                  )}
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
      </div>
    </div>
  );
}
