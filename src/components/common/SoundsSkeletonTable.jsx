import React from 'react';

export default function SoundsSkeletonTable() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
            <div className="h-3 w-20 bg-slate-800 rounded mx-auto mb-2"></div>
            <div className="h-8 w-12 bg-slate-800 rounded mx-auto"></div>
          </div>
        ))}
      </div>

      {/* Table Container Skeleton */}
      <div className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl shadow-xl overflow-hidden">
        {/* Table Toolbar Skeleton */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="h-8 w-64 bg-slate-800 rounded-lg"></div>
          <div className="h-8 w-40 bg-slate-800 rounded-lg"></div>
        </div>
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950">
                <th className="p-4 w-[350px] min-w-[280px] max-w-[350px] border-b border-slate-800 shadow-[1px_1px_0_0_#1e293b]">
                  <div className="h-4 w-36 bg-slate-800 rounded"></div>
                </th>
                {[1, 2, 3, 4].map((i) => (
                  <th key={i} className="p-4 border-b border-l border-slate-800 shadow-[0_1px_0_0_#1e293b] w-44 min-w-[150px] max-w-[200px]">
                    <div className="h-4 w-20 bg-slate-800 rounded mb-1.5 mx-auto"></div>
                    <div className="h-3 w-24 bg-slate-800 rounded mx-auto"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((row) => (
                <tr key={row} className="border-b border-slate-800 bg-slate-900/20">
                  <td className="p-3 w-[350px] min-w-[280px] max-w-[350px]">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-cyan-500/20 rounded"></div>
                      <div className="h-3.5 w-48 bg-slate-800 rounded"></div>
                    </div>
                  </td>
                  {[1, 2, 3, 4].map((col) => (
                    <td key={col} className="p-3 border-l border-slate-800/50 w-44 min-w-[150px] max-w-[200px] text-center">
                      <div className="w-4 h-4 bg-slate-800 rounded-full mx-auto"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
