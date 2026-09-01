import React from 'react';
import { Users } from 'lucide-react';
import PodActivityCard from './PodActivityCard';

export default function PodActivityCardGrid({
  isLoading,
  filteredPods = [],
  recentFlashPodId,
  formatDuration,
  onSelectPod
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-slate-950 border border-slate-800 rounded-2xl p-5 h-56 flex flex-col justify-between animate-pulse"
          >
            <div className="h-5 bg-slate-800 rounded-md w-1/3" />
            <div className="h-20 bg-slate-900 rounded-xl" />
            <div className="h-4 bg-slate-850 rounded-md w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredPods.length === 0) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center">
        <Users size={36} className="text-slate-500 mb-3" />
        <h4 className="text-sm font-bold text-white mb-1">Tidak ada unit POD yang cocok</h4>
        <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau filter tab.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredPods.map((pod) => (
        <PodActivityCard
          key={pod.id}
          pod={pod}
          isFlashing={recentFlashPodId === pod.id}
          formatDuration={formatDuration}
          onSelectPod={onSelectPod}
        />
      ))}
    </div>
  );
}
