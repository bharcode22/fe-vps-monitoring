import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="glass-card p-6 flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="skeleton-box w-10 h-10 rounded-xl"></div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="skeleton-box w-28 h-4.5 rounded-md"></div>
              <div className="skeleton-box w-16 h-4 rounded-md"></div>
            </div>
            <div className="skeleton-box w-36 h-3.5 rounded-md"></div>
          </div>
        </div>
        <div className="skeleton-box w-24 h-7 rounded-full"></div>
      </div>

      {/* Mini Metric Cards Skeleton Grid (2 Columns x 3 Rows) */}
      <div className="grid grid-cols-2 gap-3.5 my-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <div className="skeleton-box w-20 h-3.5 rounded-md"></div>
              <div className="skeleton-box w-10 h-3.5 rounded-md"></div>
            </div>
            <div className="skeleton-box w-full h-2 rounded-full"></div>
            <div className="flex flex-col gap-1 mt-1">
              <div className="skeleton-box w-full h-3 rounded-md"></div>
              <div className="skeleton-box w-3/4 h-3 rounded-md"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Skeleton */}
      <div className="border-t border-slate-800 pt-3.5 mt-4 flex items-center justify-between">
        <div className="skeleton-box w-32 h-8 rounded-lg"></div>
      </div>
    </div>
  );
}
