import React from 'react';
import { Zap } from 'lucide-react';

export default function GpuMetricCard({ gpuUsage = 0, gpuName = '', gpuTemp = 0 }) {
  const hasGpu = Boolean(gpuName && gpuName !== 'N/A' && gpuName !== 'No GPU / N/A' && gpuName.trim() !== '');
  const usage = hasGpu ? Math.min(100, Math.max(0, gpuUsage)) : 0;

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
          {usage}%
        </span>
      </div>
      <div className="progress-bar-bg">
        <div
          className="progress-bar-fill"
          style={{
            width: `${usage}%`,
            background: hasGpu ? 'linear-gradient(90deg, #059669, #10b981)' : '#334155'
          }}
        ></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '6px' }} className="font-mono">
        <span>{hasGpu ? gpuName : 'Tidak Ada GPU (N/A)'}</span>
        {hasGpu && gpuTemp ? <span>{gpuTemp}°C</span> : null}
      </div>
    </div>
  );
}
