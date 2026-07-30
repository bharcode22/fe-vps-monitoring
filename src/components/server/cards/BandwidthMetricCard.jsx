import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { formatSpeed } from '../../../utils/formatters';

export function DownloadSpeedCard({ speed = 0 }) {
  return (
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
        {formatSpeed(speed)}
      </div>
    </div>
  );
}

export function UploadSpeedCard({ speed = 0 }) {
  return (
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
        {formatSpeed(speed)}
      </div>
    </div>
  );
}
