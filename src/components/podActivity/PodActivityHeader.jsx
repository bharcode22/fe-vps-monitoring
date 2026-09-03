import React from 'react';
import { UserCheck, Radio, RotateCw, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PodActivityHeader({
  isSocketConnected,
  showSimulator,
  onToggleSimulator,
  isRefreshing,
  onReconnectMqtt,
  onRefresh,
  actionSuccess,
  error
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-xl shadow-xl">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-blue-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl shadow-inner">
            <UserCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                POD Activity MQTT Monitor
              </h1>
              <span className="text-xs font-mono px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-bold inline-flex items-center gap-1.5">
                <Radio size={12} className={isSocketConnected ? 'animate-pulse text-emerald-400' : 'text-slate-400'} />
                {isSocketConnected ? 'Live Real-Time' : 'Connecting WebSocket...'}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-md font-bold">
                Armada V3
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>Topik: <code className="text-cyan-300 font-mono font-semibold">mod_chair/pob_state</code> | <code className="text-cyan-300 font-mono font-semibold">mod_ambience/pod_state</code></span>
              <span>•</span>
              <span>Status: <b className="text-emerald-400 font-mono">1 = OCCUPIED</b>, <b className="text-slate-300 font-mono">0 = AVAILABLE (STANDBY)</b></span>
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap self-end lg:self-center">
          <button
            onClick={onReconnectMqtt}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Hubungkan Ulang Subscriber MQTT ke Seluruh Unit POD V3"
          >
            <RotateCw size={13} className={isRefreshing ? 'animate-spin text-cyan-400' : ''} />
            <span>Reconnect Broker</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs border border-slate-700 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-emerald-400' : ''} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/15 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 shadow-lg">
          <AlertCircle size={18} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
