import React, { useState } from 'react';
import {
  Server,
  Search,
  RefreshCw,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

function getShortPodLabel(pod) {
  if (!pod) return '?';
  const name = pod.name || `POD ${pod.id}`;
  const match = name.match(/POD\s+(.+)/i);
  if (match) {
    const rest = match[1].trim();
    if (rest.toUpperCase().startsWith('RIG')) {
      return 'R' + rest.replace(/\D/g, '');
    }
    return rest;
  }
  if (pod.code) return String(pod.code);
  return String(pod.id);
}

export default function PodRecordsSidebar({
  podServers = [],
  selectedPodId,
  onSelectPod,
  serverSearch,
  onSearchChange,
  isServerLoading,
  isCollapsed: controlledCollapsed,
  onToggleCollapse
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse(!isCollapsed);
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  return (
    <aside
      className={`bg-slate-900/60 border-r border-slate-800/80 shrink-0 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16 lg:w-16' : 'w-full lg:w-72 xl:w-80'
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/80 shrink-0">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleCollapse}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700 hover:border-cyan-500/50 hover:shadow-md hover:shadow-cyan-500/20"
              title="Buka Daftar Server POD V3 (Expand)"
            >
              <PanelLeftOpen size={16} className="text-cyan-400" />
            </button>
            <div className="text-[10px] font-mono text-slate-500 text-center font-bold">
              {podServers.length}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 truncate">
                <Server size={14} className="text-cyan-400 shrink-0" />
                <span className="truncate">POD V3 ({podServers.length})</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-mono border border-cyan-500/30">
                  Fleet
                </span>
                <button
                  onClick={toggleCollapse}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700 hover:border-slate-600"
                  title="Minimize Sidebar (Hemat Ruang)"
                >
                  <PanelLeftClose size={14} />
                </button>
              </div>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={serverSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Cari POD V3..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* Pods List Pane */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar min-h-0 overscroll-contain">
        {isServerLoading ? (
          <div className="p-4 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw size={18} className="animate-spin text-cyan-400" />
            {!isCollapsed && <span>Memuat POD...</span>}
          </div>
        ) : podServers.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            {!isCollapsed && 'Tidak ada server POD V3 yang sesuai.'}
          </div>
        ) : (
          podServers.map((pod) => {
            const isSelected = Number(pod.id) === Number(selectedPodId);
            const isOnline = pod.is_connected || pod.isConnected;
            const shortLabel = getShortPodLabel(pod);
            const fullName = pod.name || `POD ${pod.id}`;

            if (isCollapsed) {
              return (
                <button
                  key={pod.id}
                  onClick={() => onSelectPod(Number(pod.id))}
                  className={`w-full aspect-square rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center relative group ${
                    isSelected
                      ? 'bg-gradient-to-b from-cyan-950/70 to-slate-900 border-cyan-500/70 shadow-lg shadow-cyan-950/60 ring-1 ring-cyan-500/40 text-cyan-300'
                      : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title={`${fullName} • ${pod.host || 'No IP'} • ${isOnline ? 'Online' : 'Offline'}`}
                >
                  <span className="text-[11px] font-bold font-mono tracking-tighter truncate max-w-[42px] px-0.5">
                    {shortLabel}
                  </span>
                  <div
                    className={`w-1.5 h-1.5 rounded-full absolute top-1.5 right-1.5 ${
                      isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-600'
                    }`}
                  />
                </button>
              );
            }

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
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span>{fullName}</span>
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
                <ChevronRight
                  size={14}
                  className={`shrink-0 transition-transform ${
                    isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                  }`}
                />
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
