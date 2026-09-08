import React from 'react';
import {
  Server,
  Play,
  RotateCw,
  Square,
  RefreshCw,
  Terminal,
  Loader2,
  HardDrive,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import PodFileMatrixSection from './PodFileMatrixSection';

export default function PodUnitCard({
  pod,
  selectedItem,
  actionLoadingMap = {},
  podCheck,
  isExpanded,
  downloadProgressMap = {},
  integrityMap = {},
  onControlSinglePod,
  onInspectSinglePod,
  onCheckSinglePodFiles,
  onToggleExpandPodFiles,
  onOpenLogs,
  onDownloadSingleMissingFile,
  onDeleteSingleFileOnPod,
  onDownloadAllMissingForPod,
  onDeleteAllFilesOnPod,
  onCheckFileIntegrity,
  onOpenIntegrityModal,
  onToast
}) {
  const podId = pod.serverId || pod.id;
  const isExited = pod.isOnline && pod.containerState === 'exited';
  const isRunning = pod.isOnline && pod.containerState === 'running';
  const isStartLoading = !!actionLoadingMap[`start_${podId}`];
  const isRestartLoading = !!actionLoadingMap[`restart_${podId}`];
  const isStopLoading = !!actionLoadingMap[`stop_${podId}`];
  const isInspectLoading = !!actionLoadingMap[`inspect_${podId}`];
  const isCheckingThisPodFiles = !!actionLoadingMap[`files_${podId}`];

  // Active Downloads on this specific POD
  const activeDownloads = Object.entries(downloadProgressMap)
    .filter(([k]) => k.startsWith(`${podId}_`))
    .map(([, v]) => v);
  const isPodDownloading = activeDownloads.length > 0 || !!actionLoadingMap[`dl_all_${podId}`] || Object.keys(actionLoadingMap).some(k => k.startsWith(`dl_${podId}_`) && actionLoadingMap[k]);
  const primaryDownload = activeDownloads[0];

  return (
    <div
      className={`p-3 rounded-2xl border transition-all flex flex-col gap-2.5 ${!pod.isOnline
        ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
        : isExited
          ? 'bg-amber-950/15 border-amber-500/40 shadow-sm'
          : isPodDownloading
            ? 'bg-slate-950/80 border-sky-500/50 shadow-lg shadow-sky-500/10'
            : 'bg-slate-950/60 border-slate-800 hover:border-cyan-500/30'
        }`}
    >
      {/* Top Row: POD Info & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* POD Info & IP */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-2 rounded-xl border shrink-0 ${!pod.isOnline
              ? 'bg-slate-900 border-slate-800 text-slate-500'
              : isRunning
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
          >
            <Server size={15} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs text-white">
                {pod.serverName}
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                ({pod.host})
              </span>
              {pod.pingMs && (
                <span className="text-[9px] font-mono text-slate-500">
                  {pod.pingMs}ms
                </span>
              )}
            </div>

            {/* Badges: Container Status & On-demand File Status */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* Container Status */}
              <span
                className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-bold flex items-center gap-1 border ${!pod.isOnline
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : isRunning
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : isExited
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : isExited ? 'bg-amber-400' : 'bg-rose-400'
                    }`}
                />
                <span>{pod.containerStatus || pod.containerState}</span>
              </span>

              {/* Active Download Badge */}
              {isPodDownloading && (
                <span className="px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1.5 shadow-sm shadow-sky-500/20 animate-pulse">
                  <Loader2 size={10} className="animate-spin text-sky-400" />
                  <span>
                    {primaryDownload
                      ? `Unduh: ${primaryDownload.filename} (${primaryDownload.percent || 0}% • ${primaryDownload.speed || '...'})`
                      : 'Mengunduh Berkas...'}
                  </span>
                </span>
              )}

              {/* Physical File Check Status (On-demand - Shown once checked) */}
              {selectedItem?.sound_scape && (
                <>
                  {isCheckingThisPodFiles ? (
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 shadow-sm">
                      <Loader2 size={10} className="animate-spin text-cyan-400" />
                      <span>Memeriksa Berkas...</span>
                    </span>
                  ) : podCheck && (
                    <button
                      type="button"
                      onClick={() => onToggleExpandPodFiles(podId)}
                      className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold flex items-center gap-1 border transition-all cursor-pointer shadow-sm active:scale-95 ${podCheck.fileStatus === 'all'
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                        : podCheck.foundCount > 0
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40'
                        }`}
                      title="Klik untuk melihat/menutup rincian berkas"
                    >
                      <HardDrive size={10} />
                      <span>
                        {podCheck.fileStatus === 'all'
                          ? `Lengkap (${podCheck.foundCount}/${podCheck.totalExpected} Berkas • ${podCheck.totalFormatted})`
                          : podCheck.foundCount > 0
                            ? `Sebagian (${podCheck.foundCount}/${podCheck.totalExpected} Berkas)`
                            : `Kosong (0/${podCheck.totalExpected || 0})`}
                      </span>
                      {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Individual Action Controls per POD */}
        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 flex-wrap">
          {/* Start Container Button (if Exited) */}
          {isExited && (
            <button
              type="button"
              onClick={() => onControlSinglePod(pod, 'start')}
              disabled={isStartLoading}
              className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
              title="Nyalakan container mobile-synch pada POD ini"
            >
              {isStartLoading ? (
                <Loader2 size={11} className="animate-spin text-emerald-300" />
              ) : (
                <Play size={10} className="fill-emerald-400 text-emerald-400" />
              )}
              <span>{isStartLoading ? 'Memulai...' : 'Start'}</span>
            </button>
          )}

          {/* Restart Container Button (if Online) */}
          {pod.isOnline && (
            <button
              type="button"
              onClick={() => onControlSinglePod(pod, 'restart')}
              disabled={isRestartLoading}
              className="px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
              title="Restart container mobile-synch pada POD ini"
            >
              <RotateCw size={11} className={isRestartLoading ? 'animate-spin text-purple-400' : 'text-purple-400'} />
              <span>{isRestartLoading ? 'Restarting...' : 'Restart'}</span>
            </button>
          )}

          {/* Stop Container Button (if Running) */}
          {isRunning && (
            <button
              type="button"
              onClick={() => onControlSinglePod(pod, 'stop')}
              disabled={isStopLoading}
              className="px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
              title="Stop container mobile-synch pada POD ini"
            >
              {isStopLoading ? (
                <Loader2 size={11} className="animate-spin text-rose-400" />
              ) : (
                <Square size={9} className="fill-rose-400 text-rose-400" />
              )}
              <span>{isStopLoading ? 'Menghentikan...' : 'Stop'}</span>
            </button>
          )}

          {/* Cek Berkas / Refresh Status Button on the Right */}
          {pod.isOnline && (
            <button
              type="button"
              onClick={() => {
                onInspectSinglePod(pod);
                onCheckSinglePodFiles(pod);
              }}
              disabled={isInspectLoading || isCheckingThisPodFiles}
              className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
              title="Periksa status container dan ketersediaan berkas fisik pada POD ini"
            >
              <RefreshCw
                size={11}
                className={isInspectLoading || isCheckingThisPodFiles ? 'animate-spin text-cyan-400' : 'text-slate-400'}
              />
              <span>{isInspectLoading || isCheckingThisPodFiles ? 'Memeriksa...' : 'Cek Berkas'}</span>
            </button>
          )}

          {/* View Logs Button */}
          {pod.isOnline && (
            <button
              type="button"
              onClick={() => onOpenLogs(pod)}
              className="px-2 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Buka Console Log Real-time mobile-synch"
            >
              <Terminal size={11} className="text-slate-400" />
              <span>Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* Mini Progress Bar on PodUnitCard if downloading & not expanded */}
      {!isExpanded && isPodDownloading && (
        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800 animate-in fade-in duration-200">
          <div
            className="bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 h-1.5 rounded-full transition-all duration-300 shadow-sm shadow-cyan-400/50"
            style={{
              width: `${Math.min(100, Math.max(5, primaryDownload?.percent || 15))}%`
            }}
          />
        </div>
      )}

      {/* Expandable Physical Files Checklist Sub-Panel */}
      {isExpanded && podCheck && (
        <PodFileMatrixSection
          pod={pod}
          podId={podId}
          podCheck={podCheck}
          selectedItem={selectedItem}
          downloadProgressMap={downloadProgressMap}
          actionLoadingMap={actionLoadingMap}
          integrityMap={integrityMap}
          onCheckSinglePodFiles={onCheckSinglePodFiles}
          onDeleteAllFilesOnPod={onDeleteAllFilesOnPod}
          onDownloadSingleMissingFile={onDownloadSingleMissingFile}
          onDeleteSingleFileOnPod={onDeleteSingleFileOnPod}
          onDownloadAllMissingForPod={onDownloadAllMissingForPod}
          onCheckFileIntegrity={onCheckFileIntegrity}
          onOpenIntegrityModal={onOpenIntegrityModal}
          onToast={onToast}
        />
      )}
    </div>
  );
}
