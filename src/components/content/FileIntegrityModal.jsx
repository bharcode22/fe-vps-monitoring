import React from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Clock,
  Activity,
  Layers,
  FileVideo,
  FileAudio,
  Download,
  Eye
} from 'lucide-react';

export default function FileIntegrityModal({
  isOpen,
  onClose,
  data,
  isLoading,
  onRedownload,
  onOpenPreview
}) {
  if (!isOpen) return null;

  const isCorrupt = data?.isCorrupt || data?.status === 'corrupt';
  const isHealthy = data?.status === 'healthy';

  return (
    <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${isCorrupt
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              : isHealthy
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
              }`}>
              {isCorrupt ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">
                  Diagnosa Integritas File Media
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                  {data?.serverName || 'POD'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-md mt-0.5" title={data?.path}>
                {data?.filename || data?.path}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Activity size={28} className="animate-spin text-cyan-400" />
              <span className="text-xs font-semibold">Memeriksa struktur kontainer &amp; codec ffprobe...</span>
              <span className="text-[11px] text-slate-500 font-mono">Memindai file fisik di server POD</span>
            </div>
          ) : data ? (
            <>
              {/* Primary Status Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${isCorrupt
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                }`}>
                {isCorrupt ? (
                  <AlertTriangle size={22} className="text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={22} className="text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-sm">
                      {isCorrupt ? '⚠️ File Dinyatakan KORUP / RUSAK' : 'File Sehat &amp; Utuh (Siap Diputar)'}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${isCorrupt ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                      {data.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {data.message || (isCorrupt ? 'File tidak dapat didekode atau terpotong.' : 'Seluruh stream dan header kontainer valid.')}
                  </p>

                  {isCorrupt && onRedownload && (
                    <button
                      onClick={onRedownload}
                      className="mt-3 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-rose-950 cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Download Ulang File Ini</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Technical Pillars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <HardDrive size={12} className="text-cyan-400" /> Ukuran File
                  </span>
                  <div className="mt-1">
                    <div className="text-sm font-mono font-bold text-white">{data.sizeFormatted}</div>
                    <span className="text-[9px] text-slate-500 font-mono truncate block">
                      {(data.sizeBytes || 0).toLocaleString()} B
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock size={12} className="text-amber-400" /> Durasi Media
                  </span>
                  <div className="mt-1">
                    <div className="text-sm font-mono font-bold text-amber-300">
                      {data.durationFormatted || 'N/A'}
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {data.duration ? `${data.duration.toFixed(1)}s` : '-'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Activity size={12} className="text-indigo-400" /> Bitrate Stream
                  </span>
                  <div className="mt-1">
                    <div className="text-sm font-mono font-bold text-indigo-300">
                      {data.bitrateFormatted || 'N/A'}
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">Kualitas Audio/Video</span>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Layers size={12} className="text-emerald-400" /> Format Box
                  </span>
                  <div className="mt-1">
                    <div className="text-xs font-mono font-bold text-emerald-300 truncate" title={data.formatName}>
                      {data.formatName ? data.formatName.split(',')[0] : 'RAW'}
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">Container Tag</span>
                  </div>
                </div>
              </div>

              {/* Stream Breakdown */}
              {Array.isArray(data.streams) && data.streams.length > 0 && (
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5">
                  <span className="text-xs font-bold text-slate-300 block mb-2 flex items-center gap-1.5">
                    <Layers size={13} className="text-cyan-400" />
                    Rincian Stream &amp; Codec Fisik:
                  </span>
                  <div className="space-y-1.5 font-mono text-xs">
                    {data.streams.map((s, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/80 border border-slate-800/60 px-3 py-2 rounded-lg flex items-center justify-between gap-2 flex-wrap text-[11px]"
                      >
                        <div className="flex items-center gap-2 text-slate-300">
                          {s.type === 'video' ? (
                            <FileVideo size={14} className="text-purple-400" />
                          ) : (
                            <FileAudio size={14} className="text-sky-400" />
                          )}
                          <span className="font-bold text-white capitalize">{s.type || 'Data'} Stream</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-cyan-300 font-semibold">{s.codec || 'raw'}</span>
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          {s.width && s.height && (
                            <span className="text-amber-300/90 font-bold">{s.width} &times; {s.height} px</span>
                          )}
                          {s.sampleRate && (
                            <span className="text-emerald-300/90 font-bold">
                              {parseInt(s.sampleRate, 10).toLocaleString()} Hz ({s.channels} Ch)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Tidak ada data diagnosa integritas yang dimuat.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900/80 border-t border-slate-800 px-5 py-3 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-mono">
            Pemeriksaan integritas diverifikasi langsung via ffprobe di POD
          </div>

          <div className="flex items-center gap-2">
            {onOpenPreview && isHealthy && (
              <button
                onClick={onOpenPreview}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <Eye size={13} />
                <span>Buka Preview</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
