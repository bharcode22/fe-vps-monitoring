import React from 'react';
import {
  LineChart,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  Music,
  KeyRound,
  Database,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function DataMonitoringPreviewTab({ stats, onSwitchToExecution }) {
  const breakdown = stats?.activityTypeBreakdown || [];
  const totalLogs = stats?.totalPodLogs || 0;
  const totalExtracted = stats?.totalExtracted || 0;
  const totalSessions = stats?.totalPlaySessions || 0;
  const totalAuth = stats?.totalAuthDetails || 0;

  return (
    <div className="space-y-6">
      {/* Planned Phase Notice Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-slate-900/60 border border-violet-500/30 backdrop-blur-md shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold">
              <Sparkles size={14} className="text-violet-400" />
              <span>Fase Selanjutnya: Visualisasi & Monitoring POD Data</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Data Monitoring Dashboard (Dalam Perencanaan)
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Sesuai alur pengembangan, tab ini dipersiapkan untuk menampilkan analitik keterisian sesi,
              durasi pemutaran lagu di setiap POD, serta histori autentikasi user setelah proses ekstraksi
              data dari <code className="text-violet-300 font-mono">pod_logs</code> selesai dijalankan secara optimal.
            </p>
          </div>

          <button
            type="button"
            onClick={onSwitchToExecution}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-violet-600/20 active:scale-95"
          >
            <span>Eksekusi Ekstraksi Data</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Overview Cards & Pipeline Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pipeline Step 1 */}
        <div className="rounded-2xl p-4 bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-blue-400">
              <Database size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Sumber Raw</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
              {totalLogs.toLocaleString()} rows
            </span>
          </div>
          <h4 className="text-sm font-bold text-white mb-1">pod_logs (Master RDS)</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Menyimpan seluruh payload aktivitas mentah JSON dari armada unit POD V3 via sinkronisasi.
          </p>
        </div>

        {/* Pipeline Step 2 */}
        <div className="rounded-2xl p-4 bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Layers size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Index Ekstraksi</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              {totalExtracted.toLocaleString()} ter-ekstrak
            </span>
          </div>
          <h4 className="text-sm font-bold text-white mb-1">pod_logs_extracted</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Menjadi penanda idempoten unik agar satu log mentah tidak diproses berulang kali.
          </p>
        </div>

        {/* Pipeline Step 3 */}
        <div className="rounded-2xl p-4 bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-purple-400">
              <BarChart3 size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Tabel Analitik</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              {(totalSessions + totalAuth).toLocaleString()} entri
            </span>
          </div>
          <h4 className="text-sm font-bold text-white mb-1">play_sesion_detail & auth_detail</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Tabel terstruktur siap saji untuk grafik durasi lagu, frekuensi sesi, dan riwayat login user.
          </p>
        </div>
      </div>

      {/* Activity Type Breakdown in Raw Data */}
      <div className="rounded-2xl p-5 bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              Distribusi Tipe Aktivitas dalam pod_logs (RDS)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {breakdown.length} variasi tipe
          </span>
        </div>

        {breakdown.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs italic">
            Belum ada data distribusi aktivitas atau statistik belum dimuat.
          </div>
        ) : (
          <div className="space-y-3">
            {breakdown.slice(0, 10).map((item, idx) => {
              const maxCount = breakdown[0]?.count || 1;
              const pctOfMax = Math.round((item.count / maxCount) * 100);
              const isSession = [
                'play-session-experience',
                'play-session-explore',
                'end-session',
                'stop-session-experience',
                'stop-session-explore'
              ].includes(item.activityType);
              const isAuth = ['login', 'logout'].includes(item.activityType);

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-200 font-semibold">
                        {item.activityType}
                      </span>
                      {isSession && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          <Music size={10} /> Session
                        </span>
                      )}
                      {isAuth && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <KeyRound size={10} /> Auth
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-slate-300 font-bold">
                      {item.count.toLocaleString()} baris
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        isSession
                          ? 'bg-purple-500'
                          : isAuth
                          ? 'bg-emerald-500'
                          : 'bg-cyan-500'
                      }`}
                      style={{ width: `${pctOfMax}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Planned Feature Roadmap Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <Music size={16} />
            <h4 className="text-sm font-bold text-white">Monitoring Sesi Pemutaran Lagu</h4>
          </div>
          <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-purple-400 shrink-0 mt-0.5" />
              <span>Visualisasi durasi lagu per unit POD & daftar lagu paling populer.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-purple-400 shrink-0 mt-0.5" />
              <span>Rasio sesi yang selesai (end-session) vs dihentikan prematur (stop-session).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-purple-400 shrink-0 mt-0.5" />
              <span>Timeline aktivitas sesi real-time per user dan unit POD.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl p-5 bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <KeyRound size={16} />
            <h4 className="text-sm font-bold text-white">Monitoring Autentikasi & Pengguna</h4>
          </div>
          <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Frekuensi login per lokasi cabang (place) dan unit POD.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Analisis jeda waktu antara login dan pemutaran sesi terapi pertama.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Pemeriksaan anomali login ganda atau sesi tanpa autentikasi valid.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
