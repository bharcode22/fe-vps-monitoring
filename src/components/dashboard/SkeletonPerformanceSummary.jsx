import React from 'react';

export default function SkeletonPerformanceSummary() {
  return (
    <section style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
      marginBottom: '28px'
    }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="glass-card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="skeleton-box" style={{ width: '120px', height: '14px' }}></div>
            <div className="skeleton-box" style={{ width: '18px', height: '18px', borderRadius: '50%' }}></div>
          </div>
          <div className="skeleton-box" style={{ width: '100px', height: '24px', borderRadius: '6px' }}></div>
        </div>
      ))}
    </section>
  );
}
