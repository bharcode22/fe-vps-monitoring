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
  let badgeColorClass = 'text-cyan-400';
  let badgeBgClass = 'bg-cyan-500/20 border-cyan-500/30';
  let HeaderIcon = Server;

  if (isPod) {
    badgeText = `📦 POD ${podVersionText}`;
    badgeColorClass = 'text-purple-400';
    badgeBgClass = 'bg-purple-500/20 border-purple-500/30';
    HeaderIcon = Box;
  } else if (isPostgres) {
    badgeText = '🐘 PostgreSQL';
    badgeColorClass = 'text-sky-400';
    badgeBgClass = 'bg-sky-500/20 border-sky-500/30';
    HeaderIcon = Database;
  } else if (isMinio) {
    badgeText = '🪣 MinIO Storage';
    badgeColorClass = 'text-amber-400';
    badgeBgClass = 'bg-amber-500/20 border-amber-500/30';
    HeaderIcon = HardDrive;
  } else if (isS3) {
    badgeText = '☁️ AWS S3';
    badgeColorClass = 'text-pink-400';
    badgeBgClass = 'bg-pink-500/20 border-pink-500/30';
    HeaderIcon = HardDrive;
  }

  return (
    <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div className="flex items-center gap-2.5">
        {isAuthenticated && (
          <GripVertical size={20} className="text-slate-600 cursor-grab opacity-70 hover:opacity-100 transition-opacity" title="Tahan & geser untuk mengubah urutan" />
        )}
        <div className={`p-2.5 rounded-xl border ${badgeBgClass}`}>
          <HeaderIcon size={22} className={badgeColorClass} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">
              {server.name}
            </h3>
            {/* Type Badge */}
            <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-md border ${badgeBgClass} ${badgeColorClass}`}>
              {badgeText}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            {isAuthenticated ? (
              <>
                <span className="font-mono">{server.host}:{server.port}</span>
                <span>•</span>
                <span>{server.username}</span>
              </>
            ) : (
              <span className="font-mono opacity-60 tracking-wider">••••.••••.••••.••••</span>
            )}
            {server.is_local === 1 && <span className="text-cyan-400 text-[11px]">(Host Server)</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Re-ordering Shift Buttons (Admin Only) */}
        {isAuthenticated && (
          <div className="flex gap-0.5 bg-black/30 p-0.5 rounded-md border border-slate-800">
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              disabled={isFirst}
              className={`p-1 transition-colors cursor-pointer ${isFirst ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-slate-200'}`}
              title="Geser Posisi Ke Atas/Kiri"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              disabled={isLast}
              className={`p-1 transition-colors cursor-pointer ${isLast ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-slate-200'}`}
              title="Geser Posisi Ke Bawah/Kanan"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        )}

        {/* Live Status Pill */}
        <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-full text-xs font-semibold ${
          isOnline
            ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/12 border-red-500/30 text-red-400'
        }`}>
          <span className={`live-dot ${isOnline ? 'online' : 'offline'} w-2 h-2`}></span>
          <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          {isOnline && <span className="font-mono opacity-80 ml-1">({pingMs}ms)</span>}
        </div>

        {/* Action Controls (Edit & Delete - Admin Only) */}
        {isAuthenticated && server.is_local !== 1 && (
          <div className="flex gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(server); }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Edit Konfigurasi Server"
            >
              <Edit3 size={15} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(server.id, server.name, server.type); }}
              className="p-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-lg transition-colors cursor-pointer"
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
