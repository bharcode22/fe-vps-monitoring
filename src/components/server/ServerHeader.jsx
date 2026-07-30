import React from 'react';
import { Server, Box, ChevronUp, ChevronDown, Edit3, Trash2, GripVertical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ServerHeader({
  server,
  isOnline,
  isPod,
  pingMs,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}) {
  const { isAuthenticated } = useAuth();
  const podVersionText = server.pod_version ? server.pod_version.toUpperCase() : 'V3';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isAuthenticated && (
          <GripVertical size={20} color="var(--text-dim)" style={{ cursor: 'grab', opacity: 0.7 }} title="Tahan & geser untuk mengubah urutan" />
        )}
        <div style={{
          background: isPod ? 'rgba(192, 132, 252, 0.15)' : (isOnline ? 'rgba(0, 242, 254, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
          border: `1px solid ${isPod ? 'rgba(192, 132, 252, 0.3)' : (isOnline ? 'rgba(0, 242, 254, 0.3)' : 'rgba(239, 68, 68, 0.3)')}`,
          padding: '10px',
          borderRadius: '12px'
        }}>
          {isPod ? <Box size={22} color="#c084fc" /> : <Server size={22} color={isOnline ? '#00f2fe' : '#ef4444'} />}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>
              {server.name}
            </h3>
            {/* Type Badge */}
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              padding: '2px 8px',
              borderRadius: '6px',
              background: isPod ? 'rgba(192, 132, 252, 0.2)' : 'rgba(0, 242, 254, 0.2)',
              color: isPod ? '#c084fc' : '#00f2fe',
              border: `1px solid ${isPod ? 'rgba(192, 132, 252, 0.3)' : 'rgba(0, 242, 254, 0.3)'}`
            }}>
              {isPod ? `📦 POD ${podVersionText}` : '🖥️ VPS'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {isAuthenticated ? (
              <>
                <span className="font-mono">{server.host}:{server.port}</span>
                <span>•</span>
                <span>{server.username}</span>
              </>
            ) : (
              <span className="font-mono" style={{ opacity: 0.6, letterSpacing: '1px' }}>••••.••••.••••.••••</span>
            )}
            {server.is_local === 1 && <span style={{ color: 'var(--primary-cyan)', fontSize: '0.75rem' }}>(Host Server)</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Re-ordering Shift Buttons (Admin Only) */}
        {isAuthenticated && (
          <div style={{ display: 'flex', gap: '2px', background: 'rgba(0, 0, 0, 0.3)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              disabled={isFirst}
              style={{
                background: 'none',
                border: 'none',
                color: isFirst ? 'var(--text-dim)' : 'var(--text-muted)',
                cursor: isFirst ? 'not-allowed' : 'pointer',
                padding: '4px'
              }}
              title="Geser Posisi Ke Atas/Kiri"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              disabled={isLast}
              style={{
                background: 'none',
                border: 'none',
                color: isLast ? 'var(--text-dim)' : 'var(--text-muted)',
                cursor: isLast ? 'not-allowed' : 'pointer',
                padding: '4px'
              }}
              title="Geser Posisi Ke Bawah/Kanan"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        )}

        {/* Live Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.78rem',
          fontWeight: 600,
          color: isOnline ? '#10b981' : '#ef4444'
        }}>
          <span className={`live-dot ${isOnline ? 'online' : 'offline'}`} style={{ width: '8px', height: '8px' }}></span>
          <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          {isOnline && <span className="font-mono" style={{ opacity: 0.8, marginLeft: '4px' }}>({pingMs}ms)</span>}
        </div>

        {/* Action Controls (Edit & Delete - Admin Only) */}
        {isAuthenticated && server.is_local !== 1 && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(server); }}
              className="btn-secondary"
              style={{ padding: '6px 10px' }}
              title="Edit Konfigurasi Server"
            >
              <Edit3 size={15} color="#00f2fe" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(server.id, server.name); }}
              className="btn-danger"
              style={{ padding: '6px 10px' }}
              title="Hapus Server"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
