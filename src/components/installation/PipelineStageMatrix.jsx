import React from 'react';
import {
  Layers,
  Server,
  Clock,
  RotateCw,
  CheckCircle2,
  XCircle,
  Download,
  ArrowDown
} from 'lucide-react';

export default function PipelineStageMatrix({
  activeTab,
  targetServersList,
  currentStages,
  currentAppIds,
  stageMatrix,
  isDeploying,
  setActiveLogFilter
}) {
  return (
    <div className="glass-card p-5 sm:p-6 rounded-2xl border border-cyan-500/30 bg-slate-950/80 backdrop-blur-md shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${
            activeTab === 'backend' || activeTab === 'bundle_deploy'
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
              : 'bg-purple-500/20 text-purple-400 border-purple-500/40'
          }`}>
            <Layers size={20} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              Karboe Pipeline Stage Matrix
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                #BUILD-105
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Visualisasi real-time status 5 tahap pipeline CI/CD per server target POD v3
            </p>
          </div>
        </div>

        {isDeploying && (
          <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border animate-pulse ${
            activeTab === 'backend' || activeTab === 'bundle_deploy'
              ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
              : 'text-purple-400 bg-purple-500/10 border-purple-500/30'
          }`}>
            <RotateCw size={14} className="animate-spin" />
            <span>Pipeline Running...</span>
          </div>
        )}
      </div>

      {targetServersList.length === 0 ? (
        <div className="text-xs text-slate-500 italic p-6 text-center">
          Pilih server POD v3 target pada Step 1 untuk melihat Pipeline Stage Matrix.
        </div>
      ) : (
        <div className="space-y-4 overflow-x-auto">
          {targetServersList.map(srv => {
            const serverStages = stageMatrix[srv.name] || { 1: 'pending', 2: 'pending', 3: 'pending', 4: 'pending', 5: 'pending' };

            return (
              <div key={srv.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                {/* Server Node Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Server size={16} className={activeTab === 'frontend' ? 'text-purple-400' : 'text-cyan-400'} />
                    <span className="text-xs font-extrabold text-white">{srv.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">({srv.host})</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    activeTab === 'frontend'
                      ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                      : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                  }`}>
                    {currentAppIds.length} Apps Target
                  </span>
                </div>

                {/* 5 Stages Grid for this Server */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {currentStages.map(stage => {
                    const status = serverStages[stage.id] || 'pending';
                    const StageIcon = stage.icon;

                    let cardStyle = 'bg-slate-950/60 border-slate-800 text-slate-400';
                    let badgeStyle = 'bg-slate-800 text-slate-400';
                    let badgeLabel = 'PENDING';
                    let iconElement = <Clock size={13} />;

                    if (status === 'running') {
                      cardStyle = activeTab === 'frontend'
                        ? 'bg-gradient-to-b from-purple-500/25 via-slate-950 to-pink-950/30 border-purple-500 text-white shadow-lg shadow-purple-500/20 ring-1 ring-purple-500/50'
                        : 'bg-gradient-to-b from-cyan-500/25 via-slate-950 to-blue-950/30 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/50';
                      
                      badgeStyle = activeTab === 'frontend'
                        ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50 shadow-sm'
                        : 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 shadow-sm';
                      
                      badgeLabel = stage.id === 1 ? 'DOWNLOADING' : 'RUNNING';
                      iconElement = stage.id === 1 
                        ? <RotateCw size={13} className="animate-spin text-cyan-300" />
                        : <RotateCw size={13} className="animate-spin" />;
                    } else if (status === 'completed') {
                      cardStyle = 'bg-slate-900/90 border-emerald-500/60 text-emerald-300';
                      badgeStyle = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
                      badgeLabel = 'SUCCESS';
                      iconElement = <CheckCircle2 size={13} className="text-emerald-400" />;
                    } else if (status === 'failed') {
                      cardStyle = 'bg-rose-950/40 border-rose-500/60 text-rose-300';
                      badgeStyle = 'bg-rose-500/20 text-rose-400 border border-rose-500/40';
                      badgeLabel = 'FAILED';
                      iconElement = <XCircle size={13} className="text-rose-400" />;
                    }

                    return (
                      <div
                        key={stage.id}
                        onClick={() => setActiveLogFilter(srv.name)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 text-left relative overflow-hidden ${cardStyle}`}
                        title={`Klik untuk melihat log terminal ${srv.name}`}
                      >
                        {/* Shimmer / Progress bar on running state */}
                        {status === 'running' && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden">
                            <div className={`h-full animate-pulse w-full ${
                              activeTab === 'frontend'
                                ? 'bg-gradient-to-r from-purple-500 via-pink-400 to-purple-600'
                                : 'bg-gradient-to-r from-cyan-500 via-sky-300 to-blue-500'
                            }`} />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <StageIcon size={14} className={`shrink-0 ${status === 'running' ? 'text-cyan-300 animate-bounce' : ''}`} />
                            <span className="text-[11px] font-extrabold truncate">{stage.short}</span>
                          </div>
                          <div className="text-[9px] opacity-75 truncate">{stage.desc}</div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1.5 ${badgeStyle}`}>
                            {iconElement}
                            <span className="tracking-wide">{badgeLabel}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
