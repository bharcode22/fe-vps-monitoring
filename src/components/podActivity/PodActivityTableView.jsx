import React from 'react';
import { UserCheck, UserX, Radio } from 'lucide-react';

export default function PodActivityTableView({
  filteredPods = [],
  formatDuration,
  onSelectPod,
  onSimulate
}) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Unit POD V3</th>
              <th className="px-4 py-3">IP LAN &amp; Port</th>
              <th className="px-4 py-3">Status Keterisian</th>
              <th className="px-4 py-3">Durasi Status</th>
              <th className="px-4 py-3">Topik MQTT</th>
              <th className="px-4 py-3">Raw Value</th>
              <th className="px-4 py-3 text-center">Status Broker</th>
              <th className="px-4 py-3 text-center">Aksi &amp; Uji Coba</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredPods.map((pod) => {
              const isOccupied = pod.stateValue === 1;
              const isVacant = pod.stateValue === 0;

              return (
                <tr key={pod.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="px-4 py-3 font-sans font-bold text-white">
                    <div className="flex items-center gap-1.5">
                      <span>{pod.name}</span>
                      <span className="text-[10px] font-mono px-1 py-0.2 bg-cyan-500/20 text-cyan-300 rounded">
                        V3
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {pod.host}:1883
                  </td>
                  <td className="px-4 py-3 font-sans">
                    {isOccupied ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                        <UserCheck size={12} /> OCCUPIED (1)
                      </span>
                    ) : isVacant ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 inline-flex items-center gap-1">
                        <UserX size={12} /> AVAILABLE (0)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Awaiting Data
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatDuration(pod.lastChangedAt)}
                  </td>
                  <td className="px-4 py-3 text-cyan-300 truncate max-w-[180px]">
                    {pod.lastTopic || 'mod_chair/pob_state'}
                  </td>
                  <td className="px-4 py-3 font-bold text-white">
                    {pod.lastPayload ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-center font-sans">
                    {pod.brokerConnected ? (
                      <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded text-[10.5px] font-bold">
                        Online
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded text-[10.5px]">
                        Offline
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-sans">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onSelectPod(pod)}
                        className="px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        title="Buka Inspector & Subscribe Topik MQTT pada unit ini"
                      >
                        <Radio size={11} />
                        <span>Topik</span>
                      </button>
                      <button
                        onClick={() => onSimulate(pod.id, 1)}
                        className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-xs font-semibold cursor-pointer"
                        title="Set POB = 1 (Occupied)"
                      >
                        1 (Occ)
                      </button>
                      <button
                        onClick={() => onSimulate(pod.id, 0)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs font-semibold cursor-pointer"
                        title="Set POB = 0 (Available)"
                      >
                        0 (Avail)
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
