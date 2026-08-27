import React from 'react';

/**
 * Pixel-perfect Skeleton Loader tailored specifically for Database User Manager.
 * Exactly mirrors the 4 sections of TableDetailWorkspaceView for table 'user':
 * 1. Top Workspace Banner & View Switcher
 * 2. Master User Data Table (with userLevel filter pills & user rows)
 * 3. POD Fleet Status Cards Grid
 * 4. Active POD Deep Comparison Viewer
 */
export default function UserManagerSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse w-full">
      {/* ========================================================================= */}
      {/* 1. TOP WORKSPACE BANNER SKELETON                                         */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl border border-purple-500/30 bg-slate-900/70 shadow-2xl backdrop-blur-xl">
        {/* Top Header Row */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Database Icon Box */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <div className="w-6 h-6 rounded-lg bg-cyan-400/30" />
            </div>

            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="h-6 w-64 bg-slate-800 rounded-lg" />
                <div className="h-5 w-28 bg-purple-500/20 rounded-full border border-purple-500/30" />
                <div className="h-5 w-24 bg-emerald-500/20 rounded-full border border-emerald-500/30" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3.5 w-32 bg-slate-800/80 rounded" />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                <div className="h-3.5 w-24 bg-slate-800/60 rounded" />
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar Skeleton */}
          <div className="flex items-center gap-2 p-1 bg-slate-950/60 rounded-2xl border border-slate-800/80">
            <div className="h-9 w-32 bg-amber-500/20 rounded-xl border border-amber-500/30" />
            <div className="h-9 w-36 bg-purple-500/20 rounded-xl border border-purple-500/30" />
            <div className="h-9 w-28 bg-emerald-500/20 rounded-xl border border-emerald-500/30" />
            <div className="h-9 w-9 bg-slate-800 rounded-xl" />
          </div>
        </div>

        {/* View Mode Switcher Skeleton */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-52 bg-purple-500/20 rounded-xl border border-purple-500/30" />
            <div className="h-8 w-48 bg-slate-950/80 rounded-xl border border-slate-800" />
          </div>
          <div className="h-4 w-44 bg-slate-800/60 rounded" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SECTION 1: MASTER USER DATA TABLE SKELETON                             */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-cyan-500/30 bg-slate-900/60 shadow-xl overflow-hidden backdrop-blur-xl">
        {/* Table Top Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30" />
              <div>
                <div className="h-4.5 w-44 bg-slate-800 rounded-lg" />
                <div className="h-3 w-56 bg-slate-800/60 rounded mt-1.5" />
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="h-8 w-44 bg-slate-950 rounded-xl border border-slate-800" />
              <div className="h-8 w-28 bg-amber-500/15 rounded-xl border border-amber-500/30" />
              <div className="h-8 w-24 bg-slate-950 rounded-xl border border-slate-800" />
            </div>
          </div>

          {/* userLevel Filter Pills Toolbar Skeleton (Exact match for userLevel tabs) */}
          <div className="flex items-center gap-2 p-2 bg-slate-950/80 rounded-2xl border border-slate-800/80 overflow-x-auto">
            <div className="h-3.5 w-24 bg-slate-700/60 rounded shrink-0 mr-1" />
            <div className="h-7 w-20 bg-indigo-500/20 rounded-xl border border-indigo-500/30 shrink-0" />
            <div className="h-7 w-24 bg-emerald-500/20 rounded-xl border border-emerald-500/30 shrink-0" />
            <div className="h-7 w-24 bg-purple-500/20 rounded-xl border border-purple-500/30 shrink-0" />
            <div className="h-7 w-20 bg-indigo-500/20 rounded-xl border border-indigo-500/30 shrink-0" />
            <div className="h-7 w-20 bg-amber-500/20 rounded-xl border border-amber-500/30 shrink-0" />
            <div className="h-7 w-20 bg-cyan-500/20 rounded-xl border border-cyan-500/30 shrink-0" />
            <div className="h-7 w-16 bg-slate-700/30 rounded-xl border border-slate-700/40 shrink-0" />
          </div>
        </div>

        {/* Master User Table Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/90 border-b border-slate-800">
                <th className="p-3.5 w-12 text-center">
                  <div className="w-4 h-4 rounded bg-slate-800 mx-auto" />
                </th>
                <th className="p-3.5 font-bold"><div className="h-3.5 w-20 bg-slate-800 rounded" /></th>
                <th className="p-3.5 font-bold"><div className="h-3.5 w-24 bg-slate-800 rounded" /></th>
                <th className="p-3.5 font-bold"><div className="h-3.5 w-24 bg-slate-800 rounded" /></th>
                <th className="p-3.5 font-bold"><div className="h-3.5 w-28 bg-slate-800 rounded" /></th>
                <th className="p-3.5 font-bold"><div className="h-3.5 w-24 bg-slate-800 rounded" /></th>
                <th className="p-3.5 text-center w-28"><div className="h-3.5 w-16 bg-slate-800 rounded mx-auto" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {[1, 2, 3, 4, 5].map((rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-800/20">
                  {/* Checkbox */}
                  <td className="p-3.5 text-center">
                    <div className="w-4 h-4 rounded bg-slate-800/80 mx-auto" />
                  </td>
                  {/* User Profile (Avatar + Name + Username/Email) */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 shrink-0" />
                      <div className="flex flex-col gap-1.5">
                        <div className="h-3.5 w-28 bg-slate-800 rounded" />
                        <div className="h-2.5 w-36 bg-slate-800/60 rounded font-mono" />
                      </div>
                    </div>
                  </td>
                  {/* user_id (UUID) */}
                  <td className="p-3.5">
                    <div className="h-3 w-40 bg-slate-800/70 rounded font-mono" />
                  </td>
                  {/* userLevel Dropdown Selector Badge */}
                  <td className="p-3.5">
                    <div className="h-7 w-32 bg-slate-800/90 rounded-xl border border-slate-700" />
                  </td>
                  {/* created_at Timestamp */}
                  <td className="p-3.5">
                    <div className="h-3 w-28 bg-slate-800/60 rounded font-mono" />
                  </td>
                  {/* otp_verified Status */}
                  <td className="p-3.5">
                    <div className="h-5 w-20 bg-teal-500/20 rounded-full border border-teal-500/30" />
                  </td>
                  {/* Actions */}
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-7 h-7 rounded-xl bg-slate-800/80" />
                      <div className="w-7 h-7 rounded-xl bg-slate-800/80" />
                      <div className="w-7 h-7 rounded-xl bg-slate-800/80" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SECTION 2: POD FLEET STATUS CARDS GRID SKELETON                        */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-3.5">
        {/* POD Grid Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-4 w-36 bg-purple-500/30 rounded" />
            <div className="h-5 w-20 bg-emerald-500/20 rounded-full border border-emerald-500/30" />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <div className="h-6 w-16 bg-slate-800 rounded-lg" />
            <div className="h-6 w-16 bg-emerald-500/20 rounded-lg" />
            <div className="h-6 w-16 bg-red-500/20 rounded-lg" />
          </div>
        </div>

        {/* POD Cards (6 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((podIdx) => (
            <div
              key={podIdx}
              className={`p-3.5 rounded-2xl border flex flex-col justify-between h-28 shadow-md ${
                podIdx === 1
                  ? 'bg-purple-500/10 border-purple-500/40 ring-1 ring-purple-500/40'
                  : 'bg-slate-900/60 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <div className="h-4 w-20 bg-slate-800 rounded font-bold" />
                </div>
                <div className="w-5 h-5 rounded-lg bg-slate-800/80" />
              </div>

              <div className="flex flex-col gap-1 mt-2">
                <div className="h-2.5 w-24 bg-slate-800/60 rounded font-mono" />
                <div className="flex items-center justify-between mt-1">
                  <div className="h-4 w-14 bg-slate-800/90 rounded font-bold" />
                  <div className="h-4 w-16 bg-emerald-500/20 rounded-full border border-emerald-500/30" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SECTION 3: ACTIVE POD DEEP COMPARISON VIEWER SKELETON                   */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-purple-500/30 bg-slate-900/60 shadow-xl overflow-hidden backdrop-blur-xl">
        {/* POD Viewer Header Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/30" />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="h-5 w-40 bg-slate-800 rounded-lg" />
                <div className="h-4.5 w-16 bg-emerald-500/20 rounded-full border border-emerald-500/30" />
              </div>
              <div className="h-3 w-48 bg-slate-800/60 rounded font-mono" />
            </div>
          </div>

          {/* Sub-tab pills */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <div className="h-7 w-32 bg-purple-500/25 rounded-lg border border-purple-500/40" />
            <div className="h-7 w-36 bg-slate-900 rounded-lg" />
            <div className="h-7 w-28 bg-slate-900 rounded-lg" />
          </div>
        </div>

        {/* Active POD Comparison Table Rows */}
        <div className="divide-y divide-slate-800/50 p-2">
          {[1, 2, 3, 4].map((rIdx) => (
            <div key={rIdx} className="p-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <div className="h-3.5 w-28 bg-slate-800 rounded" />
                <div className="h-3 w-36 bg-slate-800/60 rounded font-mono" />
                <div className="h-3 w-48 bg-slate-800/40 rounded font-mono hidden md:block" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-24 bg-purple-500/15 rounded-xl border border-purple-500/30" />
                <div className="w-7 h-7 rounded-xl bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
