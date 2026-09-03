import React from 'react';
import {
  FileText
} from 'lucide-react';
import { MODULE_CONFIG, evaluateDeltaHealth } from './podRecordsConfig';

export default function PodRecordsTableView({
  activeCategory,
  recordsWithDelta = [],
  podStateData
}) {
  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
      {activeCategory === 'heartbeats' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Waktu (Lokal)</th>
                <th className="py-3 px-4">Interval Jeda</th>
                <th className="py-3 px-4">Modul Hardware</th>
                <th className="py-3 px-4 text-center">Nilai Detak (HB)</th>
                <th className="py-3 px-4">Port</th>
                <th className="py-3 px-4 text-center">Status Detak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono">
              {recordsWithDelta.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans text-xs">
                    Tidak ada rekaman detak yang cocok dengan filter tanggal/jam yang dipilih.
                  </td>
                </tr>
              ) : (
                recordsWithDelta.map((t, idx) => {
                  const modMeta = MODULE_CONFIG.find((m) => m.id === t.modId) || {
                    name: `Mod ${t.modId}`,
                    fullName: `Module ${t.modId}`,
                    defaultPort: '-'
                  };
                  const dateObj = t.ts ? new Date(t.ts) : t.isoTime ? new Date(t.isoTime) : null;
                  const timeFormatted = dateObj ? dateObj.toLocaleTimeString('id-ID', { hour12: false }) : '-';
                  const msPart = dateObj ? '.' + String(dateObj.getMilliseconds()).padStart(3, '0') : '';
                  const health = evaluateDeltaHealth(t.deltaSec);

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-300 font-bold whitespace-nowrap">
                        <span className="text-white">{timeFormatted}</span>
                        <span className="text-[10px] text-slate-500">{msPart}</span>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${health.badgeClass}`}>
                          {t.deltaSec !== null ? `+${t.deltaSec}s` : 'First'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-sans">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-cyan-400 font-bold">{t.modId}</span>
                          <span className="text-slate-300 font-semibold">{modMeta.name}</span>
                          <span className="text-[10px] text-slate-500">({modMeta.fullName})</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-cyan-300 whitespace-nowrap">
                        #{t.hb}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {t.port || modMeta.defaultPort}
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          LIVE TICK
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : activeCategory === 'events' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Tipe Peristiwa</th>
                <th className="py-3 px-4">Modul Terkait</th>
                <th className="py-3 px-4">Deskripsi / Keterangan</th>
                <th className="py-3 px-4">Durasi Terputus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono">
              {recordsWithDelta.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-sans text-xs">
                    Tidak ada insiden atau perubahan status tercatat pada tanggal ini.
                  </td>
                </tr>
              ) : (
                recordsWithDelta.map((evt, idx) => {
                  const isDead = evt.type?.includes('DEAD') || evt.type?.includes('FAIL');
                  const isRecovered = evt.type?.includes('RECOVER') || evt.type?.includes('ONLINE');
                  const isFrozen = evt.type?.includes('FROZEN');

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-300 whitespace-nowrap font-bold">
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isDead
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : isFrozen
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : isRecovered
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          {evt.type || 'EVENT'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono text-cyan-300 font-bold">
                        {evt.moduleId || evt.modId || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 font-sans">
                        {evt.message || evt.reason || JSON.stringify(evt.payload || {})}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                        {evt.durationSeconds ? `${evt.durationSeconds} detik` : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* State snapshot view */
        <div className="p-6">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <FileText size={16} className="text-cyan-400" />
            <span>Snapshot Status Terakhir (state.json)</span>
          </h3>
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
            {podStateData ? JSON.stringify(podStateData, null, 2) : '// Belum ada snapshot status tersimpan'}
          </pre>
        </div>
      )}
    </div>
  );
}
