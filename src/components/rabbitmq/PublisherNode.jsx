import React, { memo, useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Server, Activity, RefreshCw, Database, Box, ExternalLink } from 'lucide-react';
import NodeInlineLogViewer from './NodeInlineLogViewer';

const PublisherNode = ({ data, isConnectable }) => {
  const [selectedVpsId, setSelectedVpsId] = useState('');
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Auto-detect and select VPS matching RabbitMQ host/IP
  useEffect(() => {
    if (data.vpsList && data.host) {
      const matchingVps = data.vpsList.find(
        (vps) => vps.host === data.host || vps.host === data.peerHost
      );
      if (matchingVps) {
        setSelectedVpsId(String(matchingVps.id));
      }
    }
  }, [data.vpsList, data.host]);

  return (
    <div className={`bg-slate-900/80 backdrop-blur-xl border-2 border-amber-500/40 rounded-2xl shadow-xl shadow-amber-500/10 overflow-hidden group transition-all duration-300 ${isLogOpen ? 'w-[680px]' : 'w-[320px]'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-amber-950/40 p-4 border-b border-amber-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 p-2 rounded-xl border border-amber-500/30 group-hover:scale-110 transition-transform">
            <Server size={18} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">Publisher (RabbitMQ)</h3>
            <p className="text-[10px] text-amber-400 font-mono mt-0.5">Host: {data.host}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
          <span className={`w-2 h-2 rounded-full ${data.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`}></span>
          <span className="text-[10px] font-bold text-slate-300 uppercase">{data.status}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 flex flex-col items-center justify-center text-center">
            <Activity size={14} className="text-cyan-400 mb-1" />
            <span className="text-lg font-extrabold text-white">{data.publishRate}</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Msg/sec</span>
          </div>
          <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 flex flex-col items-center justify-center text-center">
            <Database size={14} className="text-emerald-400 mb-1" />
            <span className="text-lg font-extrabold text-white">{data.totalQueues}</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Queues</span>
          </div>
        </div>

        {/* VPS Select */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Pilih Admin VPS (Host)</label>
          <select
            value={selectedVpsId}
            onChange={(e) => setSelectedVpsId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500/50"
          >
            <option value="">-- Pilih Server --</option>
            {data.vpsList && data.vpsList.map(vps => (
              <option key={vps.id} value={vps.id}>{vps.name} ({vps.host})</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="space-y-2 nodrag nopan">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Remote Actions</p>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[DEBUG PublisherNode] Tombol Buka Detail VPS diklik!', { selectedVpsId, vpsList: data.vpsList, host: data.host });
              if (data.onOpenServerDetail) {
                data.onOpenServerDetail(selectedVpsId);
              } else {
                console.warn('[DEBUG PublisherNode] data.onOpenServerDetail callback tidak ditemukan!');
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 p-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-amber-500/30 cursor-pointer"
          >
            <ExternalLink size={12} />
            <span>Buka Detail VPS</span>
          </button>
          
          <button
            onClick={() => data.onRestartPm2(selectedVpsId, 'admin-backend')}
            disabled={!selectedVpsId}
            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white p-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-slate-700"
          >
            <RefreshCw size={12} />
            <span>Restart PM2 Admin</span>
          </button>

          <button
            onClick={() => data.onRestartDocker(selectedVpsId, 'rabbitmq')}
            disabled={!selectedVpsId}
            className="w-full bg-blue-900/40 hover:bg-blue-800/60 disabled:opacity-50 text-blue-400 p-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-blue-500/20"
          >
            <Box size={12} />
            <span>Restart Docker RMQ</span>
          </button>
        </div>

        {/* Inline Log Terminal */}
        {selectedVpsId && (
          <NodeInlineLogViewer
            type="pm2"
            serverId={selectedVpsId}
            targetName="admin-backend"
            title="Live Log (admin-backend)"
            onToggleOpen={setIsLogOpen}
          />
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="a"
        isConnectable={isConnectable}
        className="w-3 h-3 bg-cyan-500"
      />
    </div>
  );
};

export default memo(PublisherNode);
