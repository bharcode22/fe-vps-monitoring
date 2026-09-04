import React from 'react';
import { HardDrive, FileCode, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';

export default function PodHeartbeatStorageSummary({
  storageFilesInfo,
  isExpanded = false,
  onToggleExpand,
  onNavigateView = null,
  pod = null
}) {
  if (!storageFilesInfo || !storageFilesInfo.totalFiles) return null;

  return (
    <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-cyan-950/20 border border-slate-800 shadow-lg">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0">
            <HardDrive size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white">Arsip Berkas Rekaman Fisik:</span>
              <code className="px-2 py-0.5 rounded bg-slate-950 text-cyan-300 font-mono text-[11px] border border-slate-800">
                backend/src/data/pod_storage/{storageFilesInfo.storagePath}
              </code>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                {storageFilesInfo.totalFiles} berkas ({storageFilesInfo.totalSizeFormatted})
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tersimpan di disk lokal server dengan masa retensi 14 hari.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateView && (
            <button
              onClick={() => onNavigateView('pod-heartbeat-records', { podId: pod?.id })}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileCode size={13} />
              <span>Buka di Penjelajah JSON</span>
              <ExternalLink size={11} />
            </button>
          )}
          <button
            onClick={onToggleExpand}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
          >
            <span>{isExpanded ? 'Sembunyikan' : 'Rincian Berkas'}</span>
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Expanded Files List */}
      {isExpanded && Array.isArray(storageFilesInfo.files) && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {storageFilesInfo.files.map((file, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode
                  size={14}
                  className={
                    file.type === 'heartbeats'
                      ? 'text-cyan-400 shrink-0'
                      : file.type === 'events'
                      ? 'text-amber-400 shrink-0'
                      : 'text-emerald-400 shrink-0'
                  }
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate font-mono">{file.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {file.category} &bull; {file.sizeFormatted}
                  </div>
                </div>
              </div>
              {onNavigateView && (
                <button
                  onClick={() => onNavigateView('pod-heartbeat-records', { podId: pod?.id })}
                  className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition cursor-pointer shrink-0"
                  title="Lihat Berkas di Halaman Khusus"
                >
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
