import React from 'react';

export default function PodTopicSkeleton() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      {/* 4 Summary Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-2">
            <div className="h-3 w-28 bg-slate-800 rounded-md"></div>
            <div className="h-7 w-20 bg-slate-700/50 rounded-lg mt-1"></div>
          </div>
        ))}
      </div>

      {/* Toolbar Skeleton */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-32 bg-slate-800/80 rounded-xl"></div>
          <div className="h-8 w-32 bg-slate-800/60 rounded-xl"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-36 bg-slate-800/60 rounded-xl"></div>
          <div className="h-8 w-48 bg-slate-800/80 rounded-xl"></div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800">
              <th className="p-3.5 w-80"><div className="h-3.5 w-36 bg-slate-800 rounded"></div></th>
              <th className="p-3.5 w-28"><div className="h-3.5 w-20 bg-slate-800 rounded"></div></th>
              <th className="p-3.5 text-center w-24"><div className="h-3.5 w-16 bg-slate-800 rounded mx-auto"></div></th>
              <th className="p-3.5 text-center w-36"><div className="h-3.5 w-24 bg-slate-800 rounded mx-auto"></div></th>
              <th className="p-3.5 text-center w-36"><div className="h-3.5 w-24 bg-slate-800 rounded mx-auto"></div></th>
              <th className="p-3.5 text-center w-36"><div className="h-3.5 w-24 bg-slate-800 rounded mx-auto"></div></th>
              <th className="p-3.5 text-right w-28"><div className="h-3.5 w-16 bg-slate-800 rounded ml-auto"></div></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {[1, 2, 3, 4, 5, 6, 7].map((row) => (
              <tr key={row} className="hover:bg-transparent">
                {/* Topic Name */}
                <td className="p-3.5">
                  <div className="h-4 w-52 bg-slate-800/90 rounded mb-1.5"></div>
                  <div className="h-2.5 w-36 bg-slate-800/40 rounded"></div>
                </td>
                {/* Type */}
                <td className="p-3.5">
                  <div className="h-3 w-16 bg-slate-800/60 rounded"></div>
                </td>
                {/* Kelengkapan */}
                <td className="p-3.5 text-center">
                  <div className="h-5 w-10 bg-slate-800/80 rounded-full mx-auto"></div>
                </td>
                {/* POD 1 */}
                <td className="p-3.5 text-center">
                  <div className="h-6 w-6 rounded-full bg-slate-800/70 mx-auto"></div>
                </td>
                {/* POD 2 */}
                <td className="p-3.5 text-center">
                  <div className="h-6 w-6 rounded-full bg-slate-800/70 mx-auto"></div>
                </td>
                {/* POD 3 */}
                <td className="p-3.5 text-center">
                  <div className="h-6 w-6 rounded-full bg-slate-800/70 mx-auto"></div>
                </td>
                {/* Action */}
                <td className="p-3.5 text-right">
                  <div className="h-6 w-16 bg-slate-800/80 rounded-lg ml-auto"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
