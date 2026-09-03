import React from 'react';
import {
  Server,
  Search,
  RefreshCw,
  ChevronRight
} from 'lucide-react';

export default function PodRecordsSidebar({
  podServers = [],
  selectedPodId,
  onSelectPod,
  serverSearch,
  onSearchChange,
  isServerLoading
}) {
  return (
    <aside className="w-full lg:w-72 xl:w-80 bg-slate-900/60 border-r border-slate-800/80 shrink-0 flex flex-col h-full min-h-0 overflow-hidden">
      {/* Sidebar Header & Search */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/80 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Server size={14} className="text-cyan-400" />
            Daftar Server POD V3 ({podServers.length})
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-mono border border-cyan-500/30">
            V3 Fleet Only
          </span>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={serverSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari POD V3 (nama / IP / code)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
          />
        </div>
      </div>

      {/* Pods List - Independently Scrollable Left Pane */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar min-h-0 overscroll-contain">
        {isServerLoading ? (
          <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw size={18} className="animate-spin text-cyan-400" />
            <span>Memuat daftar POD...</span>
          </div>
        ) : podServers.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Tidak ada server POD V3 yang sesuai.
          </div>
        ) : (
          podServers.map((pod) => {
            const isSelected = Number(pod.id) === Number(selectedPodId);
            const isOnline = pod.is_connected || pod.isConnected;
            return (
              <button
                key={pod.id}
                onClick={() => onSelectPod(Number(pod.id))}
                className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/40 hover:bg-slate-800/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-600'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span>{pod.name || `POD ${pod.id}`}</span>
                      {pod.code && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          #{pod.code}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {pod.host || 'No IP'}
                    </div>
                  </div>
                </div>
                <ChevronRight size={14} className={`shrink-0 transition-transform ${isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'}`} />
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
