import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Zap,
  Radio,
  Heart,
  HardDrive,
  FileCheck,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { generatePodReportApi, fetchReportsListApi, getReportDownloadUrl, downloadReportBlobApi, deleteReportApi } from '../../api/reportApi';

export default function PodReportTab({ server }) {
  const [reports, setReports] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [deletingFile, setDeletingFile] = useState(null);
  const [sendTelegram, setSendTelegram] = useState(true);
  const [currentStep, setCurrentStep] = useState(0); // 0: idle, 1: init, 2: topics, 3: hb, 4: sessions & storage, 5: render pdf, 6: done
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showAllFleet, setShowAllFleet] = useState(false);

  const serverName = server?.name || `POD ${server?.id}`;
  const serverCode = server?.code || '';

  // Fetch past reports
  const loadReports = async () => {
    setIsLoadingReports(true);
    try {
      const res = await fetchReportsListApi();
      if (res?.success && Array.isArray(res.reports)) {
        setReports(res.reports);
      }
    } catch (err) {
      console.warn('Gagal memuat daftar laporan:', err.message);
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [server?.id]);

  // Timer while generating
  useEffect(() => {
    let timer = null;
    if (isGenerating) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isGenerating]);

  // Trigger Report Generation
  const handleGenerateReport = async () => {
    if (!server?.id || isGenerating) return;

    setIsGenerating(true);
    setErrorMsg(null);
    setLastResult(null);
    setCurrentStep(1);

    // Simulated visual step progression
    const stepTimer1 = setTimeout(() => setCurrentStep(2), 1200);
    const stepTimer2 = setTimeout(() => setCurrentStep(3), 2800);
    const stepTimer3 = setTimeout(() => setCurrentStep(4), 4500);
    const stepTimer4 = setTimeout(() => setCurrentStep(5), 6500);

    try {
      const res = await generatePodReportApi(server.id, sendTelegram);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);

      if (res?.success) {
        setCurrentStep(6);
        setLastResult(res);
        await loadReports();
      } else {
        throw new Error(res?.error || 'Gagal menghasilkan laporan.');
      }
    } catch (err) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses laporan.');
      setCurrentStep(0);
    } finally {
      setIsGenerating(false);
    }
  };

  // Hard Delete Report
  const handleDeleteReport = async (fileName) => {
    const confirmed = window.confirm(
      `HAPUS LAPORAN PERMANEN (HARD DELETE)?\n\nApakah Anda yakin ingin menghapus berkas:\n"${fileName}"\n\nBerkas fisik PDF akan dihapus secara permanen dari server dan tidak dapat dipulihkan.`
    );
    if (!confirmed) return;

    setDeletingFile(fileName);
    try {
      const res = await deleteReportApi(fileName);
      if (res?.success) {
        await loadReports();
      } else {
        alert(res?.error || 'Gagal menghapus berkas laporan.');
      }
    } catch (err) {
      alert(`Gagal menghapus berkas laporan: ${err.message}`);
    } finally {
      setDeletingFile(null);
    }
  };

  // Filter reports for this server
  const filteredReports = reports.filter((r) => {
    if (showAllFleet) return true;
    const fName = (r.fileName || '').toLowerCase();
    const sNameClean = serverName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const sCodeClean = serverCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idClean = `_${server?.id}_`;

    return (
      (sNameClean && fName.includes(sNameClean)) ||
      (sCodeClean && fName.includes(sCodeClean)) ||
      fName.includes(idClean)
    );
  });

  const steps = [
    { num: 1, label: 'Inisialisasi & Koneksi DB Master / POD', icon: Zap },
    { num: 2, label: 'Audit Matriks pod_topics & socket_topics', icon: Radio },
    { num: 3, label: 'Telemetri Heartbeat 1 Jam Terakhir & Status Modul', icon: Heart },
    { num: 4, label: 'Audit Sesi Signature & Explore + Scan File Fisik SSH', icon: HardDrive },
    { num: 5, label: 'Perenderan Dokumen PDF Vektor & Dispatch', icon: FileCheck }
  ];

  return (
    <div className="flex flex-col gap-6 text-slate-200">
      {/* Top Banner Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-cyan-500/20 p-6 shadow-xl shadow-black/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
              <FileText size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Audit Diagnostik & Laporan PDF ({serverName})
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  On-Demand Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                Mengekstrak perbandingan tabel <code className="text-cyan-300">pod_topics</code> & <code className="text-cyan-300">socket_topics</code>, grafik detak heartbeat 1 jam terakhir, serta memvalidasi ketersediaan file fisik sesi Signature & Explore di storage lokal POD via SSH.
              </p>
            </div>
          </div>

          {/* Trigger Action Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-slate-700/50 text-xs text-slate-300 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={sendTelegram}
                onChange={(e) => setSendTelegram(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-slate-800 border-slate-600 cursor-pointer"
              />
              <Send size={14} className="text-cyan-400" />
              <span>Kirim ke Telegram</span>
            </label>

            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${isGenerating
                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/25 active:scale-95'
                }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={15} className="animate-spin text-cyan-400" />
                  <span>Sedang Mengaudit... ({elapsedSeconds}s)</span>
                </>
              ) : (
                <>
                  <Zap size={15} />
                  <span>Jalankan Audit & Buat PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Decorative corner background glow */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Real-time Progress Stepper (Active during generation) */}
      {isGenerating && (
        <div className="rounded-2xl bg-slate-900/90 border border-cyan-500/30 p-5 shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <RefreshCw size={14} className="animate-spin" />
              <span>Progres Eksekusi Pipeline ({elapsedSeconds} detik berjalan)</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Tahap {currentStep} dari 5</span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
            {steps.map((s) => {
              const StepIcon = s.icon;
              const isPassed = currentStep > s.num;
              const isCurrent = currentStep === s.num;

              return (
                <div
                  key={s.num}
                  className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${isPassed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : isCurrent
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 ring-2 ring-cyan-500/20 animate-pulse'
                      : 'bg-white/5 border-slate-800 text-slate-500'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Tahap {s.num}</span>
                    {isPassed ? (
                      <CheckCircle2 size={15} className="text-emerald-400" />
                    ) : (
                      <StepIcon size={15} className={isCurrent ? 'text-cyan-400' : 'text-slate-500'} />
                    )}
                  </div>
                  <span className="text-xs font-semibold leading-snug">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <XCircle size={18} className="text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs text-red-400 hover:text-red-200 underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Last Generated Result Summary Card */}
      {lastResult && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5 shadow-lg flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">Laporan Berhasil Dihasilkan!</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Berkas <span className="font-mono text-cyan-300">{lastResult.fileName}</span> ({(lastResult.fileSizeBytes / 1024).toFixed(1)} KB) siap diunduh.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <a
                href={getReportDownloadUrl(lastResult.fileName)}
                download={lastResult.fileName}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
              >
                <Download size={15} />
                <span>Unduh PDF</span>
              </a>
              {lastResult.telegramSent && (
                <span className="text-xs text-emerald-300 font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1">
                  <Send size={12} /> Terkirim ke Telegram
                </span>
              )}
            </div>
          </div>

          {/* KPI Snapshot Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-emerald-500/20">
            <div className="p-3 rounded-xl bg-black/20 border border-emerald-500/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Health Score</span>
              <div className="text-lg font-bold text-emerald-400 mt-1">{lastResult.healthScore}%</div>
            </div>
            <div className="p-3 rounded-xl bg-black/20 border border-emerald-500/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Topics Matched</span>
              <div className="text-lg font-bold text-cyan-400 mt-1">
                {lastResult.summary?.topicsMatched} / {lastResult.summary?.topicsTotal}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black/20 border border-emerald-500/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Heartbeat 1 Jam</span>
              <div className="text-lg font-bold text-sky-400 mt-1">{lastResult.summary?.heartbeatUptime}%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {lastResult.summary?.heartbeatLive !== undefined ? `${lastResult.summary.heartbeatLive}/${lastResult.summary.heartbeatTotal} Modul Live` : 'Detak Modul'}
                {lastResult.summary?.heartbeatPackets ? ` • ${(lastResult.summary.heartbeatPackets).toLocaleString()} pkt` : ''}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black/20 border border-emerald-500/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signature & Explore</span>
              <div className="text-lg font-bold text-purple-400 mt-1">
                {(lastResult.summary?.signatureReady || 0) + (lastResult.summary?.exploreReady || 0)} File Siap
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Reports History Section */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-cyan-400" />
            <h4 className="text-sm font-bold text-white tracking-tight">Riwayat Berkas Laporan PDF</h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {filteredReports.length} Dokumen
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAllFleet(!showAllFleet)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${showAllFleet
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-white/5 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
            >
              {showAllFleet ? '✓ Tampilkan Seluruh Armada' : 'Filter POD Ini Saja'}
            </button>
            <button
              onClick={loadReports}
              disabled={isLoadingReports}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-800"
              title="Segarkan daftar laporan"
            >
              <RefreshCw size={14} className={isLoadingReports ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Reports Table / List */}
        {isLoadingReports ? (
          <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin text-cyan-500" />
            <span>Memuat berkas laporan...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center justify-center text-slate-500">
            <FileText size={36} className="text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-400">Belum ada dokumen laporan PDF untuk unit ini.</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Klik tombol <span className="text-cyan-400 font-bold">"Jalankan Audit & Buat PDF"</span> di atas atau ketik <code className="text-slate-400">/report {server?.code || server?.id}</code> di Telegram.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Nama Berkas</th>
                  <th className="py-2.5 px-3">Waktu Pembuatan</th>
                  <th className="py-2.5 px-3">Ukuran</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredReports.map((rep) => {
                  const dateFormatted = rep.createdAt
                    ? new Date(rep.createdAt).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                    : '—';

                  const downloadUrl = getReportDownloadUrl(rep.fileName);

                  return (
                    <tr key={rep.fileName} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3 px-3 font-mono text-cyan-300 flex items-center gap-2">
                        <FileText size={15} className="text-slate-400 shrink-0 group-hover:text-cyan-400 transition-colors" />
                        <span className="truncate max-w-sm" title={rep.fileName}>
                          {rep.fileName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">{dateFormatted}</td>
                      <td className="py-3 px-3 text-slate-400 font-mono whitespace-nowrap">
                        {(rep.sizeBytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`${downloadUrl}?inline=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer border border-slate-800"
                            title="Buka / Pratinjau di Tab Baru"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            type="button"
                            disabled={downloadingFile === rep.fileName}
                            onClick={async () => {
                              setDownloadingFile(rep.fileName);
                              try {
                                await downloadReportBlobApi(rep.fileName);
                              } catch (err) {
                                alert(`Gagal mengunduh: ${err.message}`);
                              } finally {
                                setDownloadingFile(null);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-cyan-500/30 disabled:opacity-50"
                            title="Unduh file PDF"
                          >
                            {downloadingFile === rep.fileName ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <Download size={13} />
                            )}
                            <span>{downloadingFile === rep.fileName ? '...' : 'Unduh'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={deletingFile === rep.fileName}
                            onClick={() => handleDeleteReport(rep.fileName)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 transition-colors cursor-pointer border border-red-500/20 disabled:opacity-50"
                            title="Hapus Laporan Permanen (Hard Delete)"
                          >
                            {deletingFile === rep.fileName ? (
                              <RefreshCw size={13} className="animate-spin text-red-400" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
