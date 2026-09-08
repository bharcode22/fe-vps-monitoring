import React from 'react';
import { Music, HardDrive, Loader2, RefreshCw, Server, AlertTriangle } from 'lucide-react';
import PodUnitCard from './PodUnitCard';

export default function FleetMatrixPanel({
  selectedItem,
  targetCoverUrl,
  fleetPods = [],
  isLoadingFleet,
  fleetError,
  onlinePodsCount = 0,
  runningContainersCount = 0,
  exitedContainersCount = 0,
  podFilesMatrix = {},
  expandedPodFiles = {},
  isCheckingAllFiles,
  s3FolderFilesMap = {},
  downloadProgressMap = {},
  actionLoadingMap = {},
  integrityMap = {},
  onInspectFleet,
  onCheckAllPodsFiles,
  onInspectSinglePod,
  onControlSinglePod,
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
  return (
    <div className="lg:col-span-7 flex flex-col glass-card rounded-3xl border border-cyan-500/30 bg-slate-900/70 shadow-xl overflow-hidden h-full min-h-0">
      {/* Target Track Banner on Top of Matrix */}
      <div className="shrink-0 p-3 sm:p-3.5 border-b border-cyan-500/20 bg-gradient-to-r from-slate-950/80 via-cyan-950/20 to-slate-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0">
              {targetCoverUrl ? (
                <img
                  src={targetCoverUrl}
                  alt="Cover"
                  className="w-10 h-10 rounded-xl object-cover border border-purple-500/40 shrink-0 bg-slate-950 shadow-md"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                  <Music size={18} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-black text-purple-300">
                  Folder #{selectedItem?.sound_scape || '---'}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  TARGET SINKRONISASI
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                {selectedItem?.tittle || selectedItem?.title || 'Pilih track di panel kiri'}
              </h3>
              <p className="text-[10px] text-slate-400 truncate">
                {selectedItem?.artist || 'Regenesis'} • {selectedItem?.album || 'Master Session'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Status Check & All File Check */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
            {selectedItem?.sound_scape && (
              <button
                onClick={onCheckAllPodsFiles}
                disabled={isCheckingAllFiles || !onlinePodsCount}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 group ${isCheckingAllFiles
                  ? 'bg-purple-500/30 border-purple-400/60 text-purple-200 shadow-lg shadow-purple-500/20 animate-pulse'
                  : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/40 hover:border-purple-400/60'
                }`}
                title="Periksa ketersediaan berkas multimedia fisik di seluruh unit POD secara serentak"
              >
                {isCheckingAllFiles ? (
                  <Loader2 size={13} className="animate-spin text-purple-300 shrink-0" />
                ) : (
                  <HardDrive size={13} className="text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
                )}
                <span>{isCheckingAllFiles ? 'Memindai Berkas POD...' : 'Cek Berkas Semua POD'}</span>
              </button>
            )}

            <button
              onClick={() => onInspectFleet(selectedItem?.sound_scape || '')}
              disabled={isLoadingFleet}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              title="Periksa status container mobile-synch di seluruh unit POD V3"
            >
              <RefreshCw size={13} className={isLoadingFleet ? 'animate-spin text-cyan-400' : ''} />
              <span>Cek Status Matriks POD</span>
            </button>
          </div>
        </div>
      </div>

      {/* Matrix Header & Summary Strip */}
      <div className="shrink-0 px-3.5 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Server size={13} className="text-cyan-400" />
          <span className="font-bold text-white text-xs">Matriks Unit POD V3</span>
          <span className="font-mono text-[10.5px]">({fleetPods.length} Server)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono">
            <span className="text-emerald-400 font-bold">{runningContainersCount}</span>/{onlinePodsCount} Ready
          </span>
          {exitedContainersCount > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-bold">
              {exitedContainersCount} Exited
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {fleetError && (
        <div className="shrink-0 m-3 p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle size={14} />
          <span>{fleetError}</span>
        </div>
      )}

      {/* POD Fleet Units List */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {isLoadingFleet ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2.5">
            <Loader2 size={22} className="animate-spin text-cyan-400" />
            <span className="text-xs">Memeriksa status container mobile-synch & disk di seluruh POD V3...</span>
          </div>
        ) : fleetPods.length === 0 ? (
          <div className="p-10 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-slate-500 text-xs">
            Tidak ada server POD V3 yang terdaftar.
          </div>
        ) : (
          fleetPods.map(pod => {
            const podId = pod.serverId || pod.id;
            return (
              <PodUnitCard
                key={podId}
                pod={pod}
                selectedItem={selectedItem}
                actionLoadingMap={actionLoadingMap}
                podCheck={podFilesMatrix[podId]}
                isExpanded={!!expandedPodFiles[podId]}
                downloadProgressMap={downloadProgressMap}
                integrityMap={integrityMap}
                onControlSinglePod={onControlSinglePod}
                onInspectSinglePod={onInspectSinglePod}
                onCheckSinglePodFiles={onCheckSinglePodFiles}
                onToggleExpandPodFiles={onToggleExpandPodFiles}
                onOpenLogs={onOpenLogs}
                onDownloadSingleMissingFile={onDownloadSingleMissingFile}
                onDeleteSingleFileOnPod={onDeleteSingleFileOnPod}
                onDownloadAllMissingForPod={onDownloadAllMissingForPod}
                onDeleteAllFilesOnPod={onDeleteAllFilesOnPod}
                onCheckFileIntegrity={onCheckFileIntegrity}
                onOpenIntegrityModal={onOpenIntegrityModal}
                onToast={onToast}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
