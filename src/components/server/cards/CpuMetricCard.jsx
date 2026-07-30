import React from 'react';
import { Cpu } from 'lucide-react';
import { getProgressColor } from '../../../utils/formatters';

export default function CpuMetricCard({ cpuUsage = 0, cpuCores = 1 }) {
  const usage = Math.min(100, Math.max(0, cpuUsage));

  return (
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
            {cpuCores} Cores
          </span>
          <span className="font-mono" style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
            {usage}%
          </span>
        </div>
      </div>
      <div className="progress-bar-bg">
        <div
          className="progress-bar-fill"
          style={{
            width: `${usage}%`,
            background: getProgressColor(usage)
          }}
        ></div>
      </div>
    </div>
  );
}
