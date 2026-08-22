import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Activity, Wifi, Cpu, HardDrive, Zap } from 'lucide-react';

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  // If already formatted like "18:27:30" or "06:27 PM"
  if (typeof timestamp === 'string' && /^\d{1,2}:\d{2}(:\d{2})?(\s?[AP]M)?$/i.test(timestamp.trim())) {
    return timestamp.trim();
  }
  // Try standard Date parsing
  const d = new Date(timestamp);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  // If epoch number or numeric string
  const num = Number(timestamp);
  if (!isNaN(num) && num > 0) {
    const epochDate = new Date(num > 1e11 ? num : num * 1000);
    if (!isNaN(epochDate.getTime())) {
      return epochDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }
  return '';
};

export default function MetricsChart({ historyData, serverName, activeMetric = 'bandwidth' }) {
  const formattedData = (historyData || []).map(item => ({
    time: formatTime(item.timestamp),
    cpu: item.cpu_usage,
    ram: item.ram_usage,
    gpu: item.gpu_usage || 0,
    gpuMem: item.gpu_memory_usage || 0,
    rxSpeed: item.bandwidth_rx_speed,
    txSpeed: item.bandwidth_tx_speed,
    disk: item.disk_usage
  }));

  if (!historyData || historyData.length === 0) {
    return (
      <div style={{
        height: '240px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-dim)',
        fontSize: '0.9rem'
      }}>
        Mengumpulkan riwayat statistik real-time...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '240px', marginTop: '16px' }}>
      <ResponsiveContainer width="100%" height="100%">
        {activeMetric === 'bandwidth' ? (
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" KB/s" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }}
            />
            <Area type="monotone" dataKey="rxSpeed" name="Download (RX)" stroke="#00f2fe" strokeWidth={2} fillOpacity={1} fill="url(#colorRx)" />
            <Area type="monotone" dataKey="txSpeed" name="Upload (TX)" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorTx)" />
          </AreaChart>
        ) : activeMetric === 'cpu' ? (
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }}
            />
            <Area type="monotone" dataKey="cpu" name="CPU Load" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" />
          </AreaChart>
        ) : activeMetric === 'gpu' ? (
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorGpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorGpuMem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }}
            />
            <Area type="monotone" dataKey="gpu" name="GPU Core Load" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorGpu)" />
            <Area type="monotone" dataKey="gpuMem" name="GPU VRAM Usage" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorGpuMem)" />
          </AreaChart>
        ) : (
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c084fc" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#c084fc" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }}
            />
            <Area type="monotone" dataKey="ram" name="RAM Usage" stroke="#c084fc" strokeWidth={2} fillOpacity={1} fill="url(#colorRam)" />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
