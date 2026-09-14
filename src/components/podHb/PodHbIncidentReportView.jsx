import React, { memo, useMemo } from 'react';
import {
  FileText,
  Printer,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Activity,
  ArrowRight,
  RotateCcw,
  Radio,
  ShieldAlert
} from 'lucide-react';

/**
 * Incident Report View
 * Formal, printable audit report document highlighting all anomalous heartbeat ticks,
 * delay spikes, packet drops, MCU resets, and frozen counters with executive summaries.
 */
const PodHbIncidentReportView = memo(function PodHbIncidentReportView({
  analysisData,
  incidentTicks,
  onJumpToTick,
  onPrint,
  onCopyMarkdown,
  onDownloadMarkdown,
  onDownloadCsv,
  copiedReportSuccess
}) {
  const meta = analysisData?.meta || {};
  const diag = analysisData?.diagnosis || {};
  const stats = meta?.stats || {};
  const thresholds = meta?.thresholds || {};

  const reportDateFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Makassar',
        dateStyle: 'full',
        timeStyle: 'medium'
      }).format(new Date());
    } catch (_) {
      return new Date().toLocaleString();
    }
  }, []);

  const severityColor = diag.severity === 'CRITICAL'
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    : diag.severity === 'WARNING'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

  return (
    <div className="space-y-6 pt-1">
      {/* Print Specific Styling */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          nav, header, aside, .no-print {
            display: none !important;
          }
          #incident-printable-report {
            background: #ffffff !important;
            color: #0f172a !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          #incident-printable-report * {
            color: #0f172a !important;
            border-color: #cbd5e1 !important;
            text-shadow: none !important;
          }
          #incident-printable-report .bg-slate-900\\/60,
          #incident-printable-report .bg-slate-900\\/80,
          #incident-printable-report .bg-slate-950,
          #incident-printable-report .bg-slate-950\\/60,
          #incident-printable-report .bg-slate-950\\/80 {
            background-color: #f8fafc !important;
            border-color: #e2e8f0 !important;
          }
          #incident-printable-report thead tr {
            background-color: #f1f5f9 !important;
          }
          #incident-printable-report th, 
          #incident-printable-report td {
            border: 1px solid #e2e8f0 !important;
            padding: 6px 8px !important;
          }
          .custom-scrollbar {
            overflow: visible !important;
            max-height: none !important;
          }
          @page {
            margin: 1.5cm;
            size: auto;
          }
        }
      `}</style>

      {/* Top Action Bar (Web Only - hidden during print) */}
      <div className="no-print p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 text-rose-300 border border-rose-500/30">
            <FileText size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Laporan Analisa Baris Insiden
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black">
                {incidentTicks.length} Baris Terdeteksi
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Dokumen komprehensif yang memusatkan perhatian pada anomali transmisi (Dead Gap, Lompat, Reset, Lag Spike)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Cetak langsung atau simpan sebagai dokumen PDF bersih"
          >
            <Printer size={13} className="text-cyan-400" />
            <span>Cetak / PDF</span>
          </button>
          <button
            onClick={onCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Salin laporan lengkap dalam format Markdown (siap kirim ke chat/tiket)"
          >
            {copiedReportSuccess ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copiedReportSuccess ? 'Tersalin!' : 'Salin Teks (MD)'}</span>
          </button>
          <button
            onClick={onDownloadMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Unduh file dokumen laporan Markdown (.md)"
          >
            <Download size={13} className="text-slate-400" />
            <span>Unduh .MD</span>
          </button>
          <button
            onClick={onDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Unduh baris data insiden ke format spreadsheet CSV"
          >
            <FileSpreadsheet size={13} className="text-emerald-400" />
            <span>Unduh CSV Insiden</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div
        id="incident-printable-report"
        className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800/90 shadow-2xl space-y-6"
      >
        {/* Document Formal Header */}
        <div className="pb-5 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded bg-rose-600 text-white">
                Sistem Monitoring Server
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Presisi Milidetik (WITA / UTC+8)
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
              LAPORAN ANALISA INSIDEN DETAK MODUL
            </h2>
            <p className="text-xs text-slate-400">
              Dokumen resmi analisis investigasi jeda komunikasi, lonjakan counter, dan kontinuitas detak hardware.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end text-xs text-slate-400 font-mono space-y-0.5">
            <div>Waktu Cetak: <strong className="text-slate-200">{reportDateFormatted} WITA</strong></div>
            <div>Jendela Pantau: <strong className="text-cyan-400">±{meta.windowMinutes || 5} Menit</strong> ({analysisData.ticks?.length || 0} Total Records)</div>
            <div>Threshold Dead: <strong className="text-rose-300">{thresholds.deadSec || 15}s</strong> • Frozen: <strong className="text-purple-300">{thresholds.frozenSec || 10}s</strong></div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Target Server / Pod</span>
            <span className="font-extrabold text-white text-sm">
              {meta.serverName || `POD ${meta.podId}`}
            </span>
            <span className="block text-[10px] text-slate-400 font-mono">ID: {meta.podId}</span>
          </div>

          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Modul Hardware</span>
            <span className="font-extrabold text-cyan-300 text-sm">
              {meta.moduleName || `Modul ${meta.moduleId}`}
            </span>
            <span className="block text-[10px] text-slate-400 font-mono">ID: {meta.moduleId}</span>
          </div>

          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Waktu Target Insiden</span>
            <span className="font-extrabold text-amber-300 text-sm font-mono">
              {meta.targetTime || '—'} WITA
            </span>
            <span className="block text-[10px] text-slate-400 font-mono">{meta.resolvedDate}</span>
          </div>

          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Diagnosa Utama</span>
            <span className={`inline-flex items-center gap-1 font-extrabold px-2 py-0.5 rounded text-[11px] border mt-0.5 ${severityColor}`}>
              {diag.severity === 'CRITICAL' ? <Flame size={11} /> : diag.severity === 'WARNING' ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
              {diag.patternTitle?.split('(')[0] || 'NORMAL'}
            </span>
          </div>
        </div>

        {/* Executive Summary & Root Cause Callout */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            <Activity size={13} className="text-cyan-400" />
            <span>Ringkasan Investigasi & Rekomendasi Solusi</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <span className="block font-bold text-slate-300">Ringkasan Kejadian:</span>
              <p className="text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                {diag.summary || 'Detak beroperasi normal tanpa insiden signifikan.'}
              </p>
              <span className="block font-bold text-slate-300 pt-1">Akar Masalah Teknis (Root Cause):</span>
              <p className="text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                {diag.rootCauseDetails || 'Tidak ditemukan anomali atau kegagalan perangkat.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="block font-bold text-slate-300">Rekomendasi Tindakan Teknis:</span>
              <div className="text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 whitespace-pre-line">
                {diag.recommendedAction || 'Sistem beroperasi normal, tidak ada aksi perbaikan yang dibutuhkan.'}
              </div>
            </div>
          </div>
        </div>

        {/* Incident Metrics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500">Baris Insiden Terdeteksi</span>
            <div className="text-lg font-black font-mono text-rose-400">
              {incidentTicks.length} Baris
            </div>
            <span className="text-[10px] text-slate-400">Anomali pada rentang waktu</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500">Jeda Terlama (Max Delay)</span>
            <div className="text-lg font-black font-mono text-amber-300">
              {stats.maxDeltaSec ? `${stats.maxDeltaSec.toFixed(2)}s` : '0s'}
            </div>
            <span className="text-[10px] text-slate-400">Batas dead: {thresholds.deadSec || 15}s</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500">Dead Gap (≥15s)</span>
            <div className="text-lg font-black font-mono text-rose-300">
              {analysisData.gaps?.length || 0} Kali
            </div>
            <span className="text-[10px] text-slate-400">Kejadian modul hening</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500">Rata-Rata Interval Detak</span>
            <div className="text-lg font-black font-mono text-cyan-300">
              {stats.avgDeltaSec ? `${stats.avgDeltaSec.toFixed(2)}s` : '—'}
            </div>
            <span className="text-[10px] text-slate-400">Interval normal: 1.0s</span>
          </div>
        </div>

        {/* FOCUSED INCIDENT ROWS TABLE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-rose-500/20 text-rose-400">
                <AlertTriangle size={14} />
              </span>
              <h3 className="text-sm font-bold text-white">
                Rincian Baris Data Insiden ({incidentTicks.length} Kejadian)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Fokus data: hanya paket dengan selisih waktu atau lonjakan counter anomali
            </span>
          </div>

          {incidentTicks.length === 0 ? (
            <div className="p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-2">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-200">Tidak Ada Insiden Terdeteksi</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Seluruh data detak dalam rentang waktu ini mengalir normal dan konsisten tanpa jeda mati (&gt;{thresholds.deadSec || 15}s), lag spike (&gt;3s), lonjakan counter, maupun reset ke 0.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-inner">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                      <th className="py-2.5 px-3">No / Baris</th>
                      <th className="py-2.5 px-3">Waktu (WITA)</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Alur Counter (#hb)</th>
                      <th className="py-2.5 px-3">ΔHB (Detak)</th>
                      <th className="py-2.5 px-3">Jeda (Δt)</th>
                      <th className="py-2.5 px-3">Klasifikasi Insiden</th>
                      <th className="py-2.5 px-3">Port</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Penjelasan & Implikasi Teknis</th>
                      <th className="py-2.5 px-3 text-center no-print">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {incidentTicks.map((tick, idx) => {
                      const prevTick = tick.index > 1 ? analysisData.ticks[tick.index - 2] : null;
                      const prevHb = prevTick?.hb !== undefined ? prevTick.hb : null;
                      const isDead = tick.status === 'GAP_DEAD' || (tick.deltaSec !== null && tick.deltaSec >= (thresholds.deadSec || 15));
                      const isJump = tick.postDeadType === 'LOMPAT' || tick.postDeadType === 'LONCAT' || tick.status === 'GAP_JUMP' || (tick.deltaHb !== null && tick.deltaHb > 5);
                      const isReset = tick.postDeadType === 'RESET' || tick.status === 'RESET' || (tick.deltaHb !== null && tick.deltaHb < 0);
                      const isLag = tick.status === 'GAP_LAG' || (tick.deltaSec !== null && tick.deltaSec >= 3.0 && !isDead);
                      const isFrozen = tick.status === 'FROZEN';

                      let rowBg = 'hover:bg-slate-900/80';
                      if (isDead) rowBg = 'bg-rose-950/25 hover:bg-rose-950/40';
                      else if (isJump) rowBg = 'bg-blue-950/25 hover:bg-blue-950/40';
                      else if (isReset) rowBg = 'bg-rose-950/30 hover:bg-rose-950/50';
                      else if (isLag) rowBg = 'bg-amber-950/20 hover:bg-amber-950/35';

                      // Explanation helper
                      let explanation = 'Penyimpangan interval waktu normal transmisi detak.';
                      if (isJump) {
                        explanation = `Counter melonjak dari #${prevHb ?? '—'} ke #${tick.hb} (+${tick.deltaHb} paket hilang di jaringan/transport MQTT). Hardware pod tetap hidup.`;
                      } else if (isReset) {
                        explanation = `Counter mengalami RESET kembali ke #${tick.hb}. Modul microcontroller kehilangan daya / restart proses driver.`;
                      } else if (isDead) {
                        explanation = `Jeda mati hening selama ${tick.deltaSec}s (melebihi batas DEAD ${thresholds.deadSec || 15}s).`;
                      } else if (isLag) {
                        explanation = `Lag spike keterlambatan pengiriman data selama ${tick.deltaSec}s (buffer serial / CPU thread pod sempat tersendat).`;
                      } else if (isFrozen) {
                        explanation = `Nilai counter #${tick.hb} membeku / macet, modul hardware tidak menaikkan counter.`;
                      }

                      return (
                        <tr key={tick.index || idx} className={`transition-colors ${rowBg}`}>
                          <td className="py-2.5 px-3 font-bold text-slate-300">
                            #{idx + 1}
                            <span className="block text-[9px] text-slate-500 font-normal">
                              (Baris {tick.index})
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-white whitespace-nowrap">
                            <div className="font-bold text-cyan-300">{tick.time || '—'}</div>
                            <span className="text-[10px] text-slate-400">{tick.date || ''}</span>
                          </td>

                          <td className="py-2.5 px-3 text-slate-400 text-[10px]">
                            {tick.ts}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="text-slate-400">{prevHb !== null ? `#${prevHb}` : '—'}</span>
                              <ArrowRight size={11} className="text-slate-500" />
                              <span className={isReset ? 'text-rose-400 font-black' : isJump ? 'text-blue-300 font-black' : 'text-emerald-300'}>
                                {tick.hb !== null ? `#${tick.hb}` : '—'}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-bold">
                            {tick.deltaHb !== null ? (
                              <span className={
                                isJump
                                  ? 'px-2 py-0.5 rounded bg-blue-500/25 text-blue-300 border border-blue-500/40 font-black shadow-sm'
                                  : isReset
                                    ? 'px-2 py-0.5 rounded bg-rose-500/25 text-rose-300 border border-rose-500/40 font-black shadow-sm'
                                    : tick.deltaHb === 1
                                      ? 'text-slate-400'
                                      : 'text-amber-400'
                              }>
                                {tick.deltaHb > 0 ? `+${tick.deltaHb}` : tick.deltaHb}
                              </span>
                            ) : '—'}
                          </td>

                          <td className="py-2.5 px-3 font-bold">
                            {tick.deltaSec !== null ? (
                              <span className={
                                isDead
                                  ? 'px-2 py-0.5 rounded bg-rose-500/25 text-rose-300 border border-rose-500/40'
                                  : isLag
                                    ? 'px-2 py-0.5 rounded bg-amber-500/25 text-amber-300 border border-amber-500/40'
                                    : 'text-slate-300'
                              }>
                                {tick.deltaSec.toFixed(2)}s
                              </span>
                            ) : '—'}
                          </td>

                          <td className="py-2.5 px-3 font-sans">
                            {isDead ? (
                              <div className="flex flex-col gap-0.5 items-start">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  <Flame size={11} /> DEAD GAP
                                </span>
                                {tick.postDeadLabel && (
                                  <span className="text-[9px] text-slate-300 font-mono">
                                    {tick.postDeadLabel}
                                  </span>
                                )}
                              </div>
                            ) : isJump ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm">
                                <Radio size={11} /> LOMPAT (+{tick.deltaHb})
                              </span>
                            ) : isReset ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm">
                                <RotateCcw size={11} /> RESET (Mulai Dari 0)
                              </span>
                            ) : isLag ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <AlertTriangle size={11} /> LAG SPIKE
                              </span>
                            ) : isFrozen ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                <ShieldAlert size={11} /> FROZEN
                              </span>
                            ) : (
                              <span className="text-slate-400">Anomali</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-slate-400">
                            {tick.port ? <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">{tick.port}</span> : '—'}
                          </td>

                          <td className="py-2.5 px-3 font-sans text-slate-300 text-xs leading-snug">
                            {explanation}
                          </td>

                          <td className="py-2.5 px-3 text-center no-print">
                            <button
                              onClick={() => onJumpToTick(tick)}
                              className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold transition shadow-sm hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
                              title="Buka dan sorot baris ini di Tabel Log lengkap"
                            >
                              Fokus Log
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer of Printable Document */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Server Monitoring System • Antigravity Heartbeat Analyzer</span>
          <span>Halaman Laporan Insiden Detak Modul • {meta.resolvedDate}</span>
        </div>
      </div>
    </div>
  );
});

export default PodHbIncidentReportView;
