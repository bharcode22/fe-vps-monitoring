import React from 'react';
import { HardDrive } from 'lucide-react';
import { formatMbToGb } from '../../../utils/formatters';
import { useLanguage } from '../../../context/LanguageContext';

export default function RamMetricCard({ ramUsage = 0, ramUsedMb = 0, ramFreeMb = 0 }) {
  const { t } = useLanguage();
  const usage = Math.min(100, Math.max(0, ramUsage));

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '14px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <HardDrive size={15} color="#c084fc" /> {t('ramMemory')}
        </span>
        <span className="font-mono" style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
          {usage}%
        </span>
      </div>
      <div className="progress-bar-bg">
        <div
          className="progress-bar-fill"
          style={{
            width: `${usage}%`,
            background: 'linear-gradient(90deg, #a855f7, #c084fc)'
          }}
        ></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '6px' }} className="font-mono">
        <span>{t('used')}: {formatMbToGb(ramUsedMb)}</span>
        <span style={{ color: '#c084fc', fontWeight: 600 }}>{t('free')}: {formatMbToGb(ramFreeMb)}</span>
      </div>
    </div>
  );
}
