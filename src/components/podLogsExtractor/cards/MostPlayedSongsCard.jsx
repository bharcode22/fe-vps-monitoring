import React from 'react';
import { Music, Users, Play, Award, Sparkles } from 'lucide-react';

export default function MostPlayedSongsCard({ songs = [], isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-slate-950/60 rounded-xl border border-slate-800/80" />
        ))}
      </div>
    );
  }

  const validSongs = (songs || []).filter(
    (s) => s && s.title && !['', '-', 'undefined', 'Unknown', 'null'].includes(s.title.trim()) && Number(s.play_count) > 0
  );

  if (validSongs.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 text-xs italic">
        Belum ada data rekaman pemutaran lagu pada filter terpilih.
      </div>
    );
  }

  const maxPlays = validSongs[0]?.play_count || 1;

  const getSessionBadgeColor = (name) => {
    const s = (name || '').toUpperCase();
    if (s.includes('RECHARGE')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (s.includes('RELAX')) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    if (s.includes('RECONNECT')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    if (s.includes('NATURE')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const getRankBadge = (idx) => {
    if (idx === 0) return 'bg-amber-400 text-slate-950 font-black shadow-amber-400/30 shadow-md';
    if (idx === 1) return 'bg-slate-300 text-slate-950 font-bold';
    if (idx === 2) return 'bg-amber-700/80 text-amber-100 font-bold';
    return 'bg-slate-800 text-slate-400 font-medium';
  };

  return (
    <div className="space-y-2.5">
      {validSongs.map((song, idx) => {
        const pct = Math.round((song.play_count / maxPlays) * 100);
        return (
          <div
            key={idx}
            className="group relative p-3 rounded-xl bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800/70 hover:border-purple-500/40 transition-all duration-200"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] shrink-0 ${getRankBadge(
                    idx
                  )}`}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                      {song.title}
                    </span>
                    {song.session_name && song.session_name !== '-' && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full border font-semibold shrink-0 uppercase ${getSessionBadgeColor(
                          song.session_name
                        )}`}
                      >
                        {song.session_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                <div className="flex items-center gap-1 text-slate-400" title="Jumlah Pengguna Unik">
                  <Users size={12} className="text-cyan-400" />
                  <span>{song.unique_users} user</span>
                </div>
                <div className="flex items-center gap-1 text-purple-300 font-bold">
                  <Play size={11} className="fill-purple-300 text-purple-300" />
                  <span>{song.play_count.toLocaleString()}x</span>
                </div>
              </div>
            </div>

            {/* Progress Bar Play Ratio */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  idx === 0
                    ? 'bg-gradient-to-r from-amber-400 to-purple-500 shadow-sm shadow-purple-500/30'
                    : 'bg-purple-500/80 group-hover:bg-purple-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
