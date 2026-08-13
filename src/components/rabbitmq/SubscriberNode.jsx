import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { RefreshCw, RadioReceiver, Network, X, CheckCircle2, XCircle, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { fetchDockerContainersApi } from '../../api/vpsApi';
import NodeInlineLogViewer from './NodeInlineLogViewer';

const SubscriberNode = ({ data, isConnectable }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [dockerStatus, setDockerStatus] = useState(null); // null, 'ready', 'error'
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [showHost, setShowHost] = useState(false);

  const handleCheckConnection = async () => {
    if (!data.podId) return;
    setIsChecking(true);
    setDockerStatus(null);
    try {
      const containers = await fetchDockerContainersApi(data.podId);
      const mobileSynch = containers.find(c => c.name === 'mobile-synch');
      
      if (mobileSynch && (mobileSynch.state === 'running' || mobileSynch.status?.toLowerCase().includes('up'))) {
        setDockerStatus('ready');
      } else {
        setDockerStatus('error');
      }
    } catch (err) {
      console.error(err);
      setDockerStatus('error');
    } finally {
      setIsChecking(false);
    }
  };

  const displayStatus = dockerStatus === 'ready' 
    ? 'ready' 
    : (dockerStatus === 'error' ? 'error' : data.status);
    
  const isOnlineColor = displayStatus === 'online' || displayStatus === 'ready';

  return (
    <div className={`bg-slate-900/80 backdrop-blur-xl border-2 border-emerald-500/40 rounded-2xl shadow-xl shadow-emerald-500/10 overflow-hidden group relative transition-all duration-300 ${isLogOpen ? 'w-[680px]' : 'w-[320px]'}`}>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-emerald-500"
      />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950/40 p-4 border-b border-emerald-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/30 group-hover:scale-110 transition-transform">
            <RadioReceiver size={18} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">{data.label || 'Pod Subscriber'}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <p className="text-[10px] text-emerald-400 font-mono">
                IP: {showHost ? (data.peerHost || 'Unknown') : '••••.••••'}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHost(!showHost);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="text-emerald-400/70 hover:text-emerald-300 p-0.5 transition-colors cursor-pointer"
                title={showHost ? "Sembunyikan IP" : "Tampilkan IP"}
              >
                {showHost ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${isOnlineColor ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`}></span>
            <span className="text-[10px] font-bold text-slate-300 uppercase">{displayStatus}</span>
          </div>
          {data.onRemoveNode && data.podId && (
            <button 
              onClick={() => data.onRemoveNode(data.podId)}
              className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors"
              title="Hapus Node"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Connection Details */}
        {data.details && (
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
            <div className="flex items-start gap-2 mb-2">
              <Network size={12} className="text-cyan-400 mt-0.5 shrink-0" />
              <span className="text-[10px] font-mono text-slate-400 leading-tight break-all">
                {data.details}
              </span>
            </div>
            {data.active !== undefined && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800">
                <span className={`w-1.5 h-1.5 rounded-full ${data.active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                <span className={`text-[10px] font-bold ${data.active ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.active ? 'Active Connection' : 'Inactive'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Docker Connection Status */}
        {data.podId && (
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Mobile-Synch</span>
              {dockerStatus === 'ready' && <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> Ready</span>}
              {dockerStatus === 'error' && <span className="text-[10px] font-bold text-red-400 flex items-center gap-1"><XCircle size={12} /> Not Ready</span>}
              {!dockerStatus && !isChecking && <span className="text-[10px] font-bold text-slate-500">Unchecked</span>}
              {isChecking && <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1"><RefreshCw size={10} className="animate-spin" /> Checking</span>}
            </div>
            <button 
              onClick={handleCheckConnection}
              disabled={isChecking}
              className="w-full bg-slate-950 hover:bg-slate-800 text-slate-300 p-2 rounded-lg text-[10px] font-bold transition-colors border border-slate-800 disabled:opacity-50"
            >
              Cek Koneksi
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 nodrag nopan">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Remote Actions</p>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[DEBUG SubscriberNode] Tombol Buka Detail VPS diklik!', { podId: data.podId, label: data.label, peerHost: data.peerHost });
              if (data.onOpenServerDetail) {
                data.onOpenServerDetail(data.podId);
              } else {
                console.warn('[DEBUG SubscriberNode] data.onOpenServerDetail callback tidak ditemukan!');
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 p-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-emerald-500/30 cursor-pointer"
          >
            <ExternalLink size={12} />
            <span>Buka Detail VPS</span>
          </button>
          
          <button 
            onClick={() => data.onRestartDocker && data.onRestartDocker(data.podId, 'mobile-synch')}
            disabled={!data.podId}
            className="w-full bg-blue-900/40 hover:bg-blue-800/60 disabled:opacity-50 text-blue-400 p-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-blue-500/20"
          >
            <RefreshCw size={12} />
            <span>Restart Mobile-Synch</span>
          </button>
        </div>

        {/* Inline Log Terminal */}
        {data.podId && (
          <NodeInlineLogViewer 
            type="docker" 
            serverId={data.podId} 
            targetName="mobile-synch" 
            title="Live Log (mobile-synch)" 
            onToggleOpen={setIsLogOpen}
          />
        )}
      </div>
    </div>
  );
};

export default memo(SubscriberNode);
