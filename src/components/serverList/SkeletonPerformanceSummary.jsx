import React from 'react';

export default function SkeletonPerformanceSummary() {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="glass-card p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="skeleton-box w-28 h-3.5 rounded-md"></div>
            <div className="skeleton-box w-7 h-7 rounded-lg"></div>
          </div>
          <div className="skeleton-box w-24 h-7 rounded-lg mt-3"></div>
        </div>
      ))}
    </section>
  );
}
