import React from 'react';
import { Grid, Search, X, Server, Box, Database, HardDrive } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function FilterTabs({
  filterType,
  setFilterType,
  searchQuery,
  setSearchQuery,
  totalCount,
  vpsCount,
  podV3Count,
  podV2Count,
  postgresCount,
  storageCount
}) {
  const { t } = useLanguage();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Grid size={20} color="#00f2fe" />
          <span>{t('connectedInfrastructure')}</span>
        </h2>

        {/* Real-time Search Input Bar */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          minWidth: '240px'
        }}>
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            style={{
              width: '100%',
              padding: '7px 32px 7px 36px',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '0.88rem',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#00f2fe'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Requested Category Filter Buttons: Semua, VPS, POD V3, POD V2, Database, Storage */}
      <div style={{ display: 'flex', gap: '8px', background: 'rgba(0, 0, 0, 0.35)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
        
        {/* Semua (All) */}
        <button
          onClick={() => setFilterType('all')}
          style={{
            background: filterType === 'all' ? 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)' : 'transparent',
            color: filterType === 'all' ? '#0b0f19' : 'var(--text-muted)',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: 700,
            transition: 'all 0.2s ease'
          }}
        >
          {t('all')} ({totalCount})
        </button>

        {/* VPS */}
        <button
          onClick={() => setFilterType('vps')}
          style={{
            background: filterType === 'vps' ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
            color: filterType === 'vps' ? '#00f2fe' : 'var(--text-muted)',
            border: filterType === 'vps' ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid transparent',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: 700,
            transition: 'all 0.2s ease'
          }}
        >
          🖥️ VPS ({vpsCount || 0})
        </button>

        {/* POD V3 */}
        <button
          onClick={() => setFilterType('pod_v3')}
          style={{
            background: filterType === 'pod_v3' ? 'rgba(192, 132, 252, 0.25)' : 'transparent',
            color: filterType === 'pod_v3' ? '#c084fc' : 'var(--text-muted)',
            border: filterType === 'pod_v3' ? '1px solid #c084fc' : '1px solid transparent',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: 700,
            transition: 'all 0.2s ease'
          }}
        >
          📦 POD V3 ({podV3Count || 0})
        </button>

        {/* POD V2 */}
        <button
          onClick={() => setFilterType('pod_v2')}
          style={{
            background: filterType === 'pod_v2' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
            color: filterType === 'pod_v2' ? '#f59e0b' : 'var(--text-muted)',
            border: filterType === 'pod_v2' ? '1px solid #f59e0b' : '1px solid transparent',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: 700,
            transition: 'all 0.2s ease'
          }}
        >
          📦 POD V2 ({podV2Count || 0})
        </button>

        {/* Database (PostgreSQL) */}
        <button
          onClick={() => setFilterType('postgresql')}
          style={{
            background: filterType === 'postgresql' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            color: filterType === 'postgresql' ? '#38bdf8' : 'var(--text-muted)',
            border: filterType === 'postgresql' ? '1px solid #38bdf8' : '1px solid transparent',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: 700,
            transition: 'all 0.2s ease'
          }}
        >
          🐘 Database ({postgresCount || 0})
        </button>

        {/* Storage (MinIO & S3) */}
        <button
          onClick={() => setFilterType('storage')}
          style={{
            background: filterType === 'storage' ? 'rgba(236, 72, 153, 0.25)' : 'transparent',
            color: filterType === 'storage' ? '#ec4899' : 'var(--text-muted)',
            border: filterType === 'storage' ? '1px solid #ec4899' : '1px solid transparent',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: 700,
            transition: 'all 0.2s ease'
          }}
        >
          🪣 Storage ({storageCount || 0})
        </button>

      </div>
    </div>
  );
}
