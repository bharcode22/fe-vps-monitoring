import React from 'react';
import {
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  Trash2,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Stethoscope,
  CloudDownload
} from 'lucide-react';
import DownloadUrlCopyButton from '../content/DownloadUrlCopyButton';

export default function PodFileMatrixSection({
  pod,
  podId,
  podCheck,
  selectedItem,
  downloadProgressMap,
  actionLoadingMap,
  integrityMap,
  onCheckSinglePodFiles,
  onDeleteAllFilesOnPod,
  onDownloadSingleMissingFile,
  onDeleteSingleFileOnPod,
  onDownloadAllMissingForPod,
  onCheckFileIntegrity,
  onOpenIntegrityModal,
  onToast
}) {
  if (!podCheck) return null;

  // Active Downloads on this POD
  const activeDownloads = Object.entries(downloadProgressMap)
    .filter(([k]) => k.startsWith(`${podId}_`))
    .map(([, v]) => v);

  return (
    <div className="pt-2.5 border-t border-slate-800/80 bg-slate-950/40 rounded-xl p-2.5 space-y-2 animate-in fade-in duration-200">
      <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5 font-bold text-slate-300">
          <FolderOpen size={12} className="text-cyan-400 shrink-0" />
          <span>Berkas Media POD:</span>
        </span>
        <span className="font-bold text-white">
          {podCheck.foundCount}/{podCheck.totalExpected} Berkas
        </span>
      </div>

      {/* Live Download Progress Banner for this POD */}
      {activeDownloads.length > 0 && (
        <div className="p-3 rounded-2xl bg-sky-950/60 border border-sky-500/40 shadow-lg shadow-sky-500/10 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-sky-300 flex items-center gap-2">
              <RefreshCw size={13} className="animate-spin text-sky-400" />
              <span>Sedang Mengunduh ke {pod.serverName}...</span>
            </span>
            <span className="font-mono text-[10px] text-sky-200 font-bold bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-500/30">
              {activeDownloads[0]?.percent || 0}%
            </span>
          </div>
          {activeDownloads.map((prog, idx) => (
            <div key={prog.filename || idx} className="space-y-1 font-mono text-[10.5px]">
              <div className="flex justify-between text-slate-300">
                <span className="truncate max-w-xs font-semibold text-white">{prog.filename}</span>
                <span className="text-cyan-300 font-bold">
                  {prog.downloadedFormatted || '0 B'} / {prog.totalFormatted || '...'} &bull; {prog.speed || '0 KB/s'}
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 h-2 rounded-full transition-all duration-200 shadow-sm shadow-cyan-400/50"
                  style={{ width: `${Math.min(100, Math.max(0, prog.percent || 0))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid of Files */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {/* Found Files on POD */}
        {podCheck.files?.map(f => {
          const integrityKey = `${podId}_${f.fullPath}`;
          const isIntegrityChecking = !!actionLoadingMap[`integrity_${podId}_${f.fullPath}`];
          const integrityData = integrityMap[integrityKey];
          const progKey = `${podId}_${f.filename}`;
          const progress = downloadProgressMap[progKey];
          const isFileDownloading = !!actionLoadingMap[`dl_${podId}_${f.filename}`];

          return (
            <div
              key={f.filename || f.fullPath}
              className={`p-2 rounded-xl border flex flex-col gap-1 text-[10.5px] transition-all ${
                integrityData?.isCorrupt
                  ? 'bg-rose-950/30 border-rose-500/50 shadow-sm'
                  : integrityData?.status === 'healthy'
                    ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm'
                    : 'bg-emerald-950/20 border-emerald-500/30'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                  <span className="font-bold text-white truncate font-mono text-[11px]" title={f.fullPath || f.filename}>
                    {f.filename}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9.5px] font-mono text-emerald-300 font-semibold shrink-0">
                    {f.sizeFormatted || 'Ada'}
                  </span>

                  {/* Tombol Salin URL / Terminal */}
                  <DownloadUrlCopyButton
                    soundScape={selectedItem?.sound_scape}
                    filename={f.filename}
                    fullPath={f.fullPath}
                    onToast={onToast}
                  />

                  {/* Tombol Cek Kesehatan / Integritas (ffprobe) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCheckFileIntegrity(pod, f.fullPath, f.filename);
                    }}
                    disabled={isIntegrityChecking}
                    className={`p-1 rounded-lg border transition-all cursor-pointer ${
                      integrityData?.isCorrupt
                        ? 'bg-rose-500/25 text-rose-300 border-rose-500/40 hover:bg-rose-500/35'
                        : integrityData?.status === 'healthy'
                          ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/35'
                          : 'bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-white border-slate-700'
                    }`}
                    title="Cek Kesehatan & Validitas Berkas (ffprobe: durasi, bitrate, codec, korup/sehat)"
                  >
                    {isIntegrityChecking ? (
                      <Loader2 size={11} className="animate-spin text-cyan-400" />
                    ) : integrityData?.isCorrupt ? (
                      <ShieldAlert size={11} className="text-rose-400" />
                    ) : integrityData?.status === 'healthy' ? (
                      <ShieldCheck size={11} className="text-emerald-400" />
                    ) : (
                      <Stethoscope size={11} />
                    )}
                  </button>
                </div>
              </div>

              {/* Badge Hasil Diagnosa Integritas ffprobe */}
              {integrityData && (
                <div
                  onClick={() => onOpenIntegrityModal({ data: integrityData, targetPod: pod, targetFilename: f.filename })}
                  className={`mt-0.5 px-2 py-1.5 rounded-lg text-[9.5px] font-mono flex flex-col gap-1 border cursor-pointer transition-all ${
                    integrityData.isCorrupt
                      ? 'bg-rose-950/60 text-rose-300 border-rose-500/40 hover:bg-rose-950/80'
                      : 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950/70'
                  }`}
                  title="Klik untuk melihat laporan diagnostik ffprobe lengkap"
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="flex items-center gap-1.5 truncate">
                      {integrityData.isCorrupt ? (
                        <>
                          <AlertTriangle size={10} className="text-rose-400 shrink-0" />
                          <b className="text-rose-400">KORUP:</b> {integrityData.message}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                          <span>
                            <b>Sehat &amp; Utuh</b>
                            {integrityData.durationFormatted ? ` • ${integrityData.durationFormatted}` : ''}
                            {integrityData.bitrateFormatted ? ` • ${integrityData.bitrateFormatted}` : ''}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="text-[8.5px] text-cyan-300 underline shrink-0 font-sans font-bold">Rincian &rsaquo;</span>
                  </div>

                  {/* Action Buttons inside Corrupt File Box */}
                  {integrityData.isCorrupt && (
                    <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-rose-500/30">
                      <button
                        type="button"
                        disabled={isFileDownloading}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadSingleMissingFile(pod, f.filename);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 rounded text-[9px] text-rose-200 font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isFileDownloading ? <RefreshCw size={10} className="animate-spin" /> : <Download size={10} />}
                        <span>{isFileDownloading ? 'Mendownload...' : 'Download Ulang'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isFileDownloading}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSingleFileOnPod(pod, f.filename);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 rounded text-[9px] text-rose-400 font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Trash2 size={10} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Live Progress Bar for Download / Re-download */}
              {(progress || isFileDownloading) && (
                <div className="mt-1 pt-1.5 border-t border-sky-500/20 animate-in fade-in duration-200">
                  {progress ? (
                    <>
                      <div className="w-full bg-slate-900/90 rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 h-1.5 rounded-full transition-all duration-300 ease-out shadow-sm shadow-cyan-400/50"
                          style={{ width: `${Math.min(100, Math.max(0, progress.percent || 0))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-mono mt-1">
                        <span>{progress.downloadedFormatted || '0 B'} / {progress.totalFormatted || '...'}</span>
                        <span className="text-cyan-300 font-semibold">{progress.speed || '0 KB/s'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] text-sky-400 font-mono animate-pulse">
                      <RefreshCw size={10} className="animate-spin" /> Menyiapkan download...
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Missing Files on POD */}
        {podCheck.missingFiles?.map(f => {
          const filename = typeof f === 'string' ? f : f.filename;
          const progKey = `${podId}_${filename}`;
          const progress = downloadProgressMap[progKey];
          const isDownloading = !!actionLoadingMap[`dl_${podId}_${filename}`] || !!actionLoadingMap[`dl_all_${podId}`];
          return (
            <div
              key={filename}
              className="p-2 rounded-xl bg-rose-950/20 border border-rose-500/30 flex flex-col gap-1 text-[10.5px]"
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                  <span className="font-semibold text-rose-300 truncate font-mono" title={filename}>
                    {filename}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Tombol Salin URL / Terminal */}
                  <DownloadUrlCopyButton
                    soundScape={selectedItem?.sound_scape}
                    filename={filename}
                    onToast={onToast}
                  />

                  <button
                    type="button"
                    onClick={() => onDownloadSingleMissingFile(pod, filename)}
                    disabled={isDownloading}
                    className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 text-[9.5px] font-bold text-rose-200 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 shadow-sm shrink-0"
                    title={`Download ${filename} langsung ke POD ${pod.serverName}`}
                  >
                    {isDownloading ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                    <span>{isDownloading ? 'Mendownload...' : 'Unduh'}</span>
                  </button>
                </div>
              </div>

              {/* Live Progress Bar for Missing File Download */}
              {(progress || isDownloading) && (
                <div className="mt-1 pt-1.5 border-t border-sky-500/20 animate-in fade-in duration-200">
                  {progress ? (
                    <>
                      <div className="w-full bg-slate-900/90 rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 h-1.5 rounded-full transition-all duration-300 ease-out shadow-sm shadow-cyan-400/50"
                          style={{ width: `${Math.min(100, Math.max(0, progress.percent || 0))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-mono mt-1">
                        <span>{progress.downloadedFormatted || '0 B'} / {progress.totalFormatted || '...'}</span>
                        <span className="text-cyan-300 font-semibold">{progress.speed || '0 KB/s'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] text-sky-400 font-mono animate-pulse">
                      <RefreshCw size={10} className="animate-spin" /> Menyiapkan download...
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Download All Missing button if multiple missing */}
      {podCheck.missingFiles?.length > 1 && (
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={() => onDownloadAllMissingForPod(pod)}
            disabled={!!actionLoadingMap[`dl_all_${podId}`]}
            className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
          >
            {actionLoadingMap[`dl_all_${podId}`] ? (
              <Loader2 size={11} className="animate-spin text-sky-400" />
            ) : (
              <CloudDownload size={11} />
            )}
            <span>Unduh Semua Berkas yang Kurang ({podCheck.missingFiles.length})</span>
          </button>
        </div>
      )}

      {/* Bottom Action Bar for this POD (Periksa Ulang & Hapus di POD Ini) */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onCheckSinglePodFiles(pod)}
          disabled={!!actionLoadingMap[`files_${podId}`]}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
          title="Periksa ulang berkas fisik di POD ini"
        >
          <RefreshCw size={12} className={actionLoadingMap[`files_${podId}`] ? 'animate-spin text-cyan-400' : 'text-slate-400'} />
          <span>Periksa Ulang</span>
        </button>

        <button
          type="button"
          onClick={() => onDeleteAllFilesOnPod(pod)}
          disabled={!!actionLoadingMap[`del_pod_${podId}`]}
          className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
          title={`Hapus semua berkas kode #${selectedItem?.sound_scape} di ${pod.serverName}`}
        >
          {actionLoadingMap[`del_pod_${podId}`] ? <Loader2 size={12} className="animate-spin text-rose-400" /> : <Trash2 size={12} className="text-rose-400" />}
          <span>Hapus di POD Ini</span>
        </button>
      </div>
    </div>
  );
}
