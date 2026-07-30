import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="glass-card" style={{ padding: '24px', opacity: 0.8 }}>
      {/* Header Skeleton */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="skeleton-box" style={{ width: '42px', height: '42px', borderRadius: '12px' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="skeleton-box" style={{ width: '140px', height: '18px' }}></div>
            <div className="skeleton-box" style={{ width: '100px', height: '14px' }}></div>
          </div>
        </div>
        <div className="skeleton-box" style={{ width: '80px', height: '24px', borderRadius: '20px' }}></div>
      </div>

      {/* Mini Metric Cards Skeleton Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton-box" style={{ width: '70px', height: '14px' }}></div>
              <div className="skeleton-box" style={{ width: '35px', height: '14px' }}></div>
            </div>
            <div className="skeleton-box" style={{ width: '100%', height: '8px', borderRadius: '4px' }}></div>
            <div className="skeleton-box" style={{ width: '110px', height: '12px', marginTop: '4px' }}></div>
          </div>
        ))}
      </div>
    </div>
  );
}
