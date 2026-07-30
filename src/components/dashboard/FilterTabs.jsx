import React from 'react';
import { Grid, Search, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function FilterTabs({
  filterType,
  setFilterType,
  searchQuery,
  setSearchQuery,
  totalCount,
  vpsCount,
  podCount,
  podV3Count,
  podV2Count
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

      {/* Type & Version Filter Buttons */}
      <div style={{ display: 'flex', gap: '8px', background: 'rgba(0, 0, 0, 0.35)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
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
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          {t('all')} ({totalCount})
        </button>

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
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          {t('vpsOnly')} ({vpsCount})
        </button>

        <button
          onClick={() => setFilterType('pod')}
          style={{
            background: filterType === 'pod' ? 'rgba(192, 132, 252, 0.2)' : 'transparent',
            color: filterType === 'pod' ? '#c084fc' : 'var(--text-muted)',
            border: filterType === 'pod' ? '1px solid rgba(192, 132, 252, 0.4)' : '1px solid transparent',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          {t('allPods')} ({podCount})
        </button>

        <button
          onClick={() => setFilterType('pod_v3')}
          style={{
            background: filterType === 'pod_v3' ? 'rgba(192, 132, 252, 0.25)' : 'transparent',
            color: filterType === 'pod_v3' ? '#c084fc' : 'var(--text-muted)',
            border: filterType === 'pod_v3' ? '1px solid #c084fc' : '1px solid transparent',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          {t('podV3')} ({podV3Count})
        </button>

        <button
          onClick={() => setFilterType('pod_v2')}
          style={{
            background: filterType === 'pod_v2' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
            color: filterType === 'pod_v2' ? '#f59e0b' : 'var(--text-muted)',
            border: filterType === 'pod_v2' ? '1px solid #f59e0b' : '1px solid transparent',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          {t('podV2')} ({podV2Count})
        </button>
      </div>
    </div>
  );
}
