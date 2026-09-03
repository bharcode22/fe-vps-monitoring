import React from 'react';
import {
  X,
  Users,
  Radio,
  Clock,
  Globe,
  Laptop,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function formatRelativeTime(timestamp) {
  if (!timestamp) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (diffSec < 5) return 'Baru saja';
  if (diffSec < 60) return `${diffSec} detik lalu`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDays = Math.floor(diffHour / 24);
  return `${diffDays} hari lalu`;
}

export default function ActiveUsersModal({
  isOpen,
  onClose,
  activeUsers = [],
  totalActiveUsers = 0,
  onNavigateView,
  onRefreshSnapshot
}) {
  const { user, isSuperAdmin } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white tracking-wide">
                  Pengguna Aktif Saat Ini
                </h3>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-mono text-xs font-bold flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  {totalActiveUsers} Online
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Real-time WebSocket presence stream & activity tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefreshSnapshot && (
              <button
                type="button"
                onClick={onRefreshSnapshot}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                title="Segarkan data aktif"
              >
                <RefreshCw size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Tutup Modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Active Users Grid */}
        <div className="p-5 space-y-3 overflow-y-auto custom-scrollbar flex-1">
          {activeUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-medium bg-slate-950/40 rounded-2xl border border-slate-800/60 p-6">
              <Users size={32} className="mx-auto mb-2 text-slate-600 opacity-50" />
              <span>Tidak ada pengguna lain yang sedang aktif selain sesi Anda.</span>
            </div>
          ) : (
            activeUsers.map((u) => {
              const isCurrentUser = u.email?.toLowerCase() === user?.email?.toLowerCase();
              return (
                <div
                  key={u.email}
                  className={`p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden flex items-start gap-3.5 shadow-sm ${isCurrentUser
                    ? 'bg-gradient-to-br from-cyan-950/30 via-slate-900/90 to-slate-900/90 border-cyan-500/40'
                    : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700/80 hover:bg-slate-900/80'
                    }`}
                >
                  {/* User Avatar */}
                  <div className="relative shrink-0">
                    {u.picture ? (
                      <img
                        src={u.picture}
                        alt={u.name}
                        className="w-10 h-10 rounded-full border border-slate-700 object-cover shadow"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-white font-bold text-sm shadow">
                        {u.name?.charAt(0) || u.email?.charAt(0) || 'U'}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-[0_0_6px_rgba(52,211,153,1)]" />
                  </div>

                  {/* User Information */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-xs text-white truncate" title={u.name}>
                          {u.name}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded font-bold shrink-0">
                            Anda
                          </span>
                        )}
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase shrink-0 ${u.role === 'super_admin'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}>
                        {u.role}
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      {u.email}
                    </div>

                    {/* Active Viewing Page / Menu */}
                    <div className="mt-2 flex items-center gap-1.5 text-[10.5px] bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-cyan-300 font-medium truncate">
                      <Laptop size={11} className="text-cyan-400 shrink-0" />
                      <span className="truncate">
                        Sedang membuka: <strong className="text-white">{u.currentViewLabel || u.currentView || 'Dashboard Monitoring'}</strong>
                      </span>
                    </div>

                    {/* Duration & IP */}
                    <div className="mt-2 flex items-center justify-between text-[9.5px] font-mono text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        <span>Aktif {formatRelativeTime(u.lastSeenAt)}</span>
                      </span>
                      <span className="flex items-center gap-1" title={u.ipAddress}>
                        <Globe size={10} />
                        <span className="truncate max-w-[120px]">{u.ipAddress || 'LAN'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 flex-wrap">
          {isSuperAdmin && onNavigateView ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateView('user-activity');
              }}
              className="px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
            >
              <ShieldCheck size={14} className="text-amber-400" />
              <span>Buka Audit & Log Aktivitas Lengkap</span>
            </button>
          ) : (
            <div className="text-[11px] font-mono text-slate-500">
              Menampilkan {activeUsers.length} pengguna online
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
