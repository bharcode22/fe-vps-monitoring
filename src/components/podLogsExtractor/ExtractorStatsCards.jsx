import React from 'react';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Music,
  KeyRound,
  Clock,
  Database
} from 'lucide-react';

export default function ExtractorStatsCards({ stats, isLoading, onRefresh }) {
  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 animate-pulse">
            <div className="h-4 w-20 bg-slate-800 rounded mb-3" />
            <div className="h-7 w-28 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const totalLogs = stats?.totalPodLogs ?? 0;
  const totalExtracted = stats?.totalExtracted ?? 0;
  const unextracted = stats?.unextractedCount ?? 0;
  const totalSessions = stats?.totalPlaySessions ?? 0;
  const totalAuth = stats?.totalAuthDetails ?? 0;

  const pctExtracted = totalLogs > 0 ? Math.min(100, Math.round((totalExtracted / totalLogs) * 100)) : 100;

  const cards = [
    {
      id: 'total',
      label: 'Total Log Mentah',
      sublabel: 'Tabel pod_logs (RDS)',
      value: totalLogs.toLocaleString(),
      icon: Database,
      color: 'from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30'
    },
    {
      id: 'extracted',
      label: 'Sudah Di-ekstrak',
      sublabel: `${pctExtracted}% dari total log`,
      value: totalExtracted.toLocaleString(),
      icon: CheckCircle2,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30'
    },
    {
      id: 'unextracted',
      label: 'Belum Di-ekstrak',
      sublabel: unextracted > 0 ? 'Menunggu pemrosesan' : 'Seluruh log bersih',
      value: unextracted.toLocaleString(),
      icon: AlertCircle,
      color: unextracted > 0
        ? 'from-amber-500/25 to-rose-500/15 text-amber-300 border-amber-500/40 shadow-amber-500/10 shadow-lg'
        : 'from-slate-800/40 to-slate-900/40 text-slate-400 border-slate-800'
    },
    {
      id: 'sessions',
      label: 'Play Session Detail',
      sublabel: 'Tabel play_sesion_detail',
      value: totalSessions.toLocaleString(),
      icon: Music,
      color: 'from-purple-500/20 to-fuchsia-500/10 text-purple-400 border-purple-500/30'
    },
    {
      id: 'auth',
      label: 'Auth Detail (Logins)',
      sublabel: 'Tabel auth_detail',
      value: totalAuth.toLocaleString(),
      icon: KeyRound,
      color: 'from-cyan-500/20 to-sky-500/10 text-cyan-400 border-cyan-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${card.color} border backdrop-blur-md transition-all duration-200 hover:scale-[1.01]`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-400 truncate tracking-wide uppercase">
                {card.label}
              </span>
              <div className="p-1.5 rounded-lg bg-slate-950/40 shrink-0">
                <Icon size={16} />
              </div>
            </div>
            <div className="text-2xl font-black tracking-tight text-white mb-1">
              {card.value}
            </div>
            <p className="text-[11px] text-slate-400 truncate font-medium">
              {card.sublabel}
            </p>
          </div>
        );
      })}
    </div>
  );
}
