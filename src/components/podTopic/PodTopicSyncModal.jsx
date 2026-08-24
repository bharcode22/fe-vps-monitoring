import React from 'react';
import { Zap } from 'lucide-react';

export default function PodTopicSyncModal({
  isOpen,
  onClose,
  sourcePodId,
  setSourcePodId,
  syncTargetPodIds,
  setSyncTargetPodIds,
  syncTopicKeys,
  topicTypeFilter,
  pods,
  isSyncing,
  onPerformSync
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-cyan-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Zap size={18} className="text-amber-400" />
          Konfirmasi Sinkronisasi Topic Database
        </h3>

        <p className="text-xs text-slate-400">
          Sistem akan menyalin <strong className="text-cyan-300">{syncTopicKeys.length || 'Semua'} topic</strong> dari POD Sumber ke POD Target di tabel <code className="text-purple-300">{topicTypeFilter === 'socket_topic' ? 'public.socket_topics' : 'public.pod_topics'}</code>.
        </p>

        {/* Pick Source POD */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300">POD Sumber (Template Acuan):</label>
          <select
            value={sourcePodId}
            onChange={(e) => setSourcePodId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
          >
            {pods?.filter(p => p.isOnline !== false).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} - {topicTypeFilter === 'socket_topic' ? p.socketTopicCount : p.podTopicCount} topics
              </option>
            ))}
          </select>
        </div>

        {/* Target Pods List */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300">Target POD ({syncTargetPodIds.length} dipilih):</label>
          <div className="max-h-36 overflow-y-auto bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1.5 text-xs">
            {pods?.filter(p => String(p.id) !== String(sourcePodId)).map(p => {
              const isOffline = p.isOnline === false;
              return (
                <label key={p.id} className={`flex items-center gap-2 ${isOffline ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    disabled={isOffline}
                    checked={syncTargetPodIds.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSyncTargetPodIds(prev => [...prev, p.id]);
                      else setSyncTargetPodIds(prev => prev.filter(id => id !== p.id));
                    }}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0 disabled:opacity-40"
                  />
                  <span>{p.name} {isOffline ? '(OFFLINE - Tidak Dapat Diakses)' : ''}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={onPerformSync}
            disabled={isSyncing || syncTargetPodIds.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Zap size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Mulai Sinkronisasi'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
