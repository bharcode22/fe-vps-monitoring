import React, { useState } from 'react';
import { Server, Box, Database, HardDrive, ChevronUp, ChevronDown, Edit3, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react';
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
  const [showHost, setShowHost] = useState(false);
  const podVersionText = server.pod_version ? server.pod_version.toUpperCase() : 'V3';

  const isPostgres = server.type === 'postgresql';
  const isMinio = server.type === 'minio';
  const isS3 = server.type === 's3';

  let badgeText = 'VPS';
  let badgeIconEmoji = '';
  let badgeColorClass = 'text-cyan-400';
  let badgeBgClass = 'bg-cyan-500/15 border-cyan-500/30';
  let HeaderIcon = Server;

  if (isPod) {
    badgeText = `POD ${podVersionText}`;
    badgeIconEmoji = '';
    badgeColorClass = 'text-purple-400';
    badgeBgClass = 'bg-purple-500/15 border-purple-500/30';
    HeaderIcon = Box;
  } else if (isPostgres) {
    badgeText = 'PostgreSQL';
    badgeIconEmoji = '';
    badgeColorClass = 'text-sky-400';
    badgeBgClass = 'bg-sky-500/15 border-sky-500/30';
    HeaderIcon = Database;
  } else if (isMinio) {
    badgeText = 'MinIO';
    badgeIconEmoji = '';
    badgeColorClass = 'text-amber-400';
    badgeBgClass = 'bg-amber-500/15 border-amber-500/30';
    HeaderIcon = HardDrive;
  } else if (isS3) {
    badgeText = 'AWS S3';
    badgeIconEmoji = '';
    badgeColorClass = 'text-pink-400';
    badgeBgClass = 'bg-pink-500/15 border-pink-500/30';
    HeaderIcon = HardDrive;
  }

  return (
    <div className="flex flex-col gap-2 mb-4 pb-3 border-b border-slate-800/70 min-w-0">
      {/* Row 1: Icon + Server Name + Type Badge */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isAuthenticated && (
            <GripVertical
              size={16}
              className="text-slate-600 cursor-grab opacity-50 hover:opacity-100 transition-opacity shrink-0"
              title="Tahan & geser untuk mengubah urutan"
            />
          )}

          {/* Compact Icon Container */}
          <div className={`p-2 rounded-xl border shrink-0 flex items-center justify-center shadow-inner ${badgeBgClass}`}>
            <HeaderIcon size={18} className={badgeColorClass} />
          </div>

          {/* Server Name */}
          <h3
            className="text-base font-extrabold text-white tracking-tight truncate min-w-0 flex-1"
            title={server.name || 'Unnamed Server'}
          >
            {server.name || 'Unnamed Server'}
          </h3>
        </div>

        {/* Top Right: Status & Type Badge (Stacked to save horizontal space) */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Live Status Pill */}
          <div className={`flex items-center gap-1.5 border px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${isOnline
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.12)]'
            : 'bg-red-500/10 border-red-500/25 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.12)]'
            }`}>
            <span className={`live-dot ${isOnline ? 'online' : 'offline'} w-1.5 h-1.5`}></span>
            {/* <span className="tracking-wide">{isOnline ? 'ONLINE' : 'OFFLINE'}</span> */}
            {isOnline && (
              <span className="font-mono text-[9px] opacity-75 ml-0.5">({pingMs}ms)</span>
            )}
          </div>

          {/* Type Badge */}
          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${badgeBgClass} ${badgeColorClass}`}>
            {badgeIconEmoji && <span>{badgeIconEmoji}</span>}
            <span>{badgeText}</span>
          </span>
        </div>
      </div>

      {/* Row 2: IP Info (Left) + Action Controls (Right) */}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-400 min-w-0 pt-1">
        {/* Left: Host IP */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Host IP / Port */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono text-slate-300 truncate text-[15px] font-medium" title={showHost ? `${server.host}${server.port ? `:${server.port}` : ''}` : 'Host tersembunyi'}>
                {showHost ? `${server.host}${server.port ? `:${server.port}` : ''}` : '••••.••••'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHost(!showHost);
                }}
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors rounded cursor-pointer shrink-0"
                title={showHost ? "Sembunyikan Host" : "Tampilkan Host"}
              >
                {showHost ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          ) : (
            <span className="font-mono text-slate-500 opacity-60 tracking-wider shrink-0 text-[11px]">••••.••••</span>
          )}

          {server.is_local === 1 && (
            <span className="text-cyan-400 text-[10px] font-bold shrink-0 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
              Host
            </span>
          )}
        </div>

        {/* Right: Action Controls (Admin Only) */}
        {isAuthenticated && (
          <div className="flex items-center gap-0.5 bg-slate-900/60 p-1 rounded-lg border border-slate-800/60 shrink-0 shadow-sm">
            {/* Re-ordering Shift Buttons */}
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              disabled={isFirst}
              className={`w-6 h-6 flex items-center justify-center rounded transition-all cursor-pointer ${isFirst ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
              title="Geser Posisi Ke Atas/Kiri"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              disabled={isLast}
              className={`w-6 h-6 flex items-center justify-center rounded transition-all cursor-pointer ${isLast ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
              title="Geser Posisi Ke Bawah/Kanan"
            >
              <ChevronDown size={14} />
            </button>

            {/* Edit & Delete Action Buttons */}
            {server.is_local !== 1 && (
              <>
                <div className="w-px h-4 bg-slate-700/50 mx-0.5 rounded-full"></div> {/* Divider */}
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(server); }}
                  className="w-6 h-6 flex items-center justify-center rounded transition-all cursor-pointer text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/20"
                  title="Edit Konfigurasi Server"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(server.id, server.name, server.type); }}
                  className="w-6 h-6 flex items-center justify-center rounded transition-all cursor-pointer text-slate-400 hover:text-red-400 hover:bg-red-500/20"
                  title="Hapus Layanan"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
