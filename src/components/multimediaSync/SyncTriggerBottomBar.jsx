import React from 'react';
import { Shuffle } from 'lucide-react';

export default function SyncTriggerBottomBar({
  selectedItem,
  runningContainersCount = 0,
  onlinePodsCount = 0,
  exitedContainersCount = 0,
  isTriggeringResave,
  isLoadingFleet,
  onOpenConfirmModal
}) {
  if (!selectedItem) return null;

  return (
    <div className="shrink-0 mt-3 p-2.5 sm:px-4 sm:py-2.5 bg-slate-950/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Selected Item Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 shrink-0">
            <Shuffle size={16} className="animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-purple-300 font-mono">
                #{selectedItem.sound_scape}
              </span>
              <span className="text-xs font-bold text-white truncate">
                {selectedItem.tittle || selectedItem.title || 'Master Track'}
              </span>
            </div>
            <div className="text-[10.5px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{runningContainersCount}/{onlinePodsCount} POD Siap</span>
              {exitedContainersCount > 0 && (
                <span className="text-amber-400 font-bold">
                  ({exitedContainersCount} container mati)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Trigger Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end shrink-0">
          <button
            onClick={onOpenConfirmModal}
            disabled={isTriggeringResave || isLoadingFleet}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center gap-2 shadow-xl shadow-purple-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Shuffle size={14} />
            <span>Trigger Sinkronisasi RabbitMQ</span>
          </button>
        </div>
      </div>
    </div>
  );
}
