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
import { Activity, Wifi, Cpu, HardDrive } from 'lucide-react';

export default function MetricsChart({ historyData, serverName, activeMetric = 'bandwidth' }) {
  const formattedData = (historyData || []).map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    cpu: item.cpu_usage,
    ram: item.ram_usage,
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
