import React from 'react';
import { Server, Box, Database, HardDrive, ChevronUp, ChevronDown, Edit3, Trash2, GripVertical } from 'lucide-react';
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

  const isPostgres = server.type === 'postgresql';
  const isMinio = server.type === 'minio';
  const isS3 = server.type === 's3';

  let badgeText = '🖥️ VPS';
  let badgeColor = '#00f2fe';
  let badgeBg = 'rgba(0, 242, 254, 0.2)';
  let badgeBorder = 'rgba(0, 242, 254, 0.3)';
  let HeaderIcon = Server;

  if (isPod) {
    badgeText = `📦 POD ${podVersionText}`;
    badgeColor = '#c084fc';
    badgeBg = 'rgba(192, 132, 252, 0.2)';
    badgeBorder = 'rgba(192, 132, 252, 0.3)';
    HeaderIcon = Box;
  } else if (isPostgres) {
    badgeText = '🐘 PostgreSQL';
    badgeColor = '#38bdf8';
    badgeBg = 'rgba(56, 189, 248, 0.2)';
    badgeBorder = 'rgba(56, 189, 248, 0.3)';
    HeaderIcon = Database;
  } else if (isMinio) {
    badgeText = '🪣 MinIO Storage';
    badgeColor = '#f59e0b';
    badgeBg = 'rgba(245, 158, 11, 0.2)';
    badgeBorder = 'rgba(245, 158, 11, 0.3)';
    HeaderIcon = HardDrive;
  } else if (isS3) {
    badgeText = '☁️ AWS S3';
    badgeColor = '#ec4899';
    badgeBg = 'rgba(236, 72, 153, 0.2)';
    badgeBorder = 'rgba(236, 72, 153, 0.3)';
    HeaderIcon = HardDrive;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isAuthenticated && (
          <GripVertical size={20} color="var(--text-dim)" style={{ cursor: 'grab', opacity: 0.7 }} title="Tahan & geser untuk mengubah urutan" />
        )}
        <div style={{
          background: badgeBg,
          border: `1px solid ${badgeBorder}`,
          padding: '10px',
          borderRadius: '12px'
        }}>
          <HeaderIcon size={22} color={badgeColor} />
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
              background: badgeBg,
              color: badgeColor,
              border: `1px solid ${badgeBorder}`
            }}>
              {badgeText}
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
              onClick={(e) => { e.stopPropagation(); onDelete(server.id, server.name, server.type); }}
              className="btn-danger"
              style={{ padding: '6px 10px' }}
              title="Hapus Layanan"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
