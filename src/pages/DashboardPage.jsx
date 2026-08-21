import React from 'react';
import {
  LayoutDashboard,
  Server,
  Download,
  Zap,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Database,
  BarChart3,
  FileCode
} from 'lucide-react';

export default function DashboardPage({ onNavigateView }) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-cyan-950/30 p-6 sm:p-8 border border-cyan-500/20 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold w-fit">
              <Activity size={14} className="animate-pulse" />
              <span>System Overview & Monitoring Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Dashboard Utama
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Selamat datang di pusat pemantauan server dan infrastruktur. Halaman ini disiapkan untuk metrik analitik, grafik performa, dan ringkasan eksekutif masa mendatang.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateView && onNavigateView('server-list')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Server size={16} />
              <span>Buka Server List</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => onNavigateView && onNavigateView('server-list')}
          className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 hover:border-cyan-500/50 transition-all cursor-pointer group shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 group-hover:scale-105 transition-transform">
              <Server size={20} />
            </div>
            <ArrowRight size={16} className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors">
            Server & POD List
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Pantau status CPU, RAM, Disk, dan kontainer Docker aktif pada semua server VPS & POD.
          </p>
        </div>

        <div
          onClick={() => onNavigateView && onNavigateView('installation')}
          className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 hover:border-cyan-500/50 transition-all cursor-pointer group shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 group-hover:scale-105 transition-transform">
              <Download size={20} />
            </div>
            <ArrowRight size={16} className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-base font-extrabold text-white group-hover:text-blue-300 transition-colors">
            Installation Pipeline
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Eksekusi batch instalasi dan deployment artefak MinIO ke multi-POD secara real-time.
          </p>
        </div>

        <div
          onClick={() => onNavigateView && onNavigateView('env-manager')}
          className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 hover:border-emerald-500/50 transition-all cursor-pointer group shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:scale-105 transition-transform">
              <FileCode size={20} />
            </div>
            <ArrowRight size={16} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300 transition-colors">
            Environment Manager & Comparison
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Kelola file .env, bandingkan perbedaan variabel key-value, dan sinkronkan konfigurasi.
          </p>
        </div>
      </div>

      {/* Placeholder Canvas for Future Widgets */}
      <div className="glass-card p-10 sm:p-14 rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 text-center flex flex-col items-center justify-center gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-500">
          <BarChart3 size={36} className="text-cyan-400/60" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Area Widget & Grafik Analitik Masa Depan</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Bagian ini dapat diisi dengan grafik tren utilisasi CPU/RAM historis, ringkasan alert error, status uptime SLA, dan metrik visual lainnya.
          </p>
        </div>
      </div>
    </div>
  );
}
