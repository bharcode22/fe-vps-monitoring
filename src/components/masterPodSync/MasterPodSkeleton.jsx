import React from 'react';

/**
 * 1. Skeleton Loader for Level 2: Table Detail Workspace
 */
export default function MasterPodSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Workspace Header Skeleton */}
      <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-800/90"></div>
          <div className="flex flex-col gap-1.5">
            <div className="h-5 w-48 bg-slate-800 rounded-lg"></div>
            <div className="h-3 w-64 bg-slate-800/50 rounded"></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-slate-800/80 rounded-xl"></div>
          <div className="h-9 w-32 bg-slate-800/80 rounded-xl"></div>
        </div>
      </div>

      {/* 4 Summary Metrics Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between h-24">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-slate-800 rounded"></div>
              <div className="w-6 h-6 rounded-lg bg-slate-800/60"></div>
            </div>
            <div className="h-6 w-20 bg-slate-800/90 rounded-lg"></div>
          </div>
        ))}
      </div>

      {/* Tab Switcher Skeleton */}
      <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 w-fit">
        <div className="h-8 w-36 bg-slate-800/90 rounded-xl"></div>
        <div className="h-8 w-36 bg-slate-800/50 rounded-xl"></div>
        <div className="h-8 w-40 bg-slate-800/50 rounded-xl"></div>
      </div>

      {/* Table & Toolbar Skeleton */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Toolbar Header */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-44 bg-slate-800/80 rounded-xl"></div>
            <div className="h-8 w-28 bg-slate-800/50 rounded-xl"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-32 bg-slate-800/60 rounded-xl"></div>
            <div className="h-8 w-36 bg-slate-800/80 rounded-xl"></div>
          </div>
        </div>

        {/* Data Rows */}
        <div className="divide-y divide-slate-800/60">
          {[1, 2, 3, 4, 5, 6, 7].map((row) => (
            <div key={row} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-4 h-4 rounded bg-slate-800/80"></div>
                <div className="h-4 w-12 bg-slate-800/90 rounded"></div>
                <div className="h-4 w-32 bg-slate-800/70 rounded"></div>
                <div className="h-4 w-40 bg-slate-800/50 rounded hidden sm:block"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-20 bg-slate-800/60 rounded-full"></div>
                <div className="h-7 w-24 bg-slate-800/80 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 2. Skeleton Loader for Level 1A: Catalog Cards View
 */
export function MasterCatalogSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
        <div
          key={n}
          className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-48 shadow-lg"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-slate-800/90"></div>
              <div className="h-5 w-16 bg-slate-800/60 rounded-full"></div>
            </div>
            <div className="h-4.5 w-36 bg-slate-800 rounded-md mb-2"></div>
            <div className="h-3 w-24 bg-slate-800/40 rounded"></div>
          </div>
          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
            <div className="h-4 w-20 bg-slate-800/70 rounded"></div>
            <div className="h-7 w-20 bg-slate-800/80 rounded-xl"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 3. Skeleton Loader for Level 1B: Fleet Sync Audit View
 */
export function FleetAuditSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* 5 KPI Summary Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-28 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-slate-800 rounded"></div>
              <div className="w-7 h-7 rounded-xl bg-slate-800/80"></div>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div className="h-7 w-16 bg-slate-800/90 rounded-lg"></div>
              <div className="h-4 w-20 bg-slate-800/50 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar Skeleton */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-28 bg-slate-800/90 rounded-xl"></div>
            <div className="h-7 w-28 bg-slate-800/60 rounded-xl"></div>
            <div className="h-7 w-28 bg-slate-800/60 rounded-xl"></div>
          </div>
          <div className="h-8 w-44 bg-slate-800/80 rounded-xl"></div>
        </div>
        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-3">
          <div className="h-7 w-48 bg-slate-800/60 rounded-xl"></div>
          <div className="h-7 w-56 bg-slate-800/60 rounded-xl"></div>
        </div>
      </div>

      {/* Table Matrix Skeleton */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-2xl">
        <div className="p-3.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
          <div className="h-4 w-40 bg-slate-800 rounded"></div>
          <div className="h-4 w-32 bg-slate-800 rounded"></div>
          <div className="h-4 w-36 bg-slate-800 rounded"></div>
          <div className="h-4 w-24 bg-slate-800 rounded"></div>
        </div>
        <div className="divide-y divide-slate-800/60">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
            <div key={row} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-64">
                <div className="h-4 w-6 bg-slate-800/60 rounded"></div>
                <div className="flex flex-col gap-1">
                  <div className="h-4 w-36 bg-slate-800/90 rounded"></div>
                  <div className="h-2.5 w-20 bg-slate-800/40 rounded"></div>
                </div>
              </div>
              <div className="h-5 w-16 bg-slate-800/80 rounded text-center"></div>
              <div className="w-40 flex flex-col gap-1">
                <div className="h-3 w-28 bg-slate-800/70 rounded"></div>
                <div className="h-2 w-full bg-slate-800/50 rounded-full"></div>
              </div>
              <div className="flex items-center gap-1.5 flex-1 justify-center">
                <div className="h-6 w-24 bg-slate-800/60 rounded-lg"></div>
                <div className="h-6 w-24 bg-slate-800/60 rounded-lg"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-20 bg-slate-800/80 rounded-xl"></div>
                <div className="h-7 w-20 bg-slate-800/80 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 3. Skeleton Loader tailored specifically for T&C Sync Views
 */
export function TncPodSyncSkeleton({ showMaster = false }) {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* 1. Compact Action Bar Skeleton */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="h-8 w-44 bg-purple-500/20 rounded-xl border border-purple-500/30"></div>
          <div className="h-8 w-48 bg-slate-800/60 rounded-xl"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-48 bg-slate-800/80 rounded"></div>
          <div className="h-8 w-8 bg-slate-800 rounded-lg"></div>
        </div>
      </div>

      {/* Optional Master Data Viewer Skeleton */}
      {showMaster && (
        <div className="rounded-3xl border border-cyan-500/30 bg-slate-900/70 overflow-hidden shadow-2xl flex flex-col">
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30"></div>
              <div className="flex flex-col gap-1">
                <div className="h-4 w-48 bg-slate-800 rounded"></div>
                <div className="h-3 w-32 bg-slate-800/60 rounded"></div>
              </div>
            </div>
            <div className="h-8 w-36 bg-slate-800 rounded-xl"></div>
          </div>
          <div className="divide-y divide-slate-800/60">
            {[1, 2, 3].map((row) => (
              <div key={row} className="p-3.5 flex items-center justify-between gap-4">
                <div className="h-4 w-28 bg-slate-800/90 rounded"></div>
                <div className="h-4 w-56 bg-slate-800/70 rounded"></div>
                <div className="h-4 w-32 bg-slate-800/80 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. POD Selection Grid Skeleton */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-slate-800">
          <div className="h-4 w-64 bg-slate-800/90 rounded"></div>
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <div className="h-6 w-20 bg-slate-800 rounded-lg"></div>
            <div className="h-6 w-28 bg-slate-800/60 rounded-lg"></div>
            <div className="h-6 w-24 bg-slate-800/60 rounded-lg"></div>
            <div className="h-6 w-20 bg-slate-800/60 rounded-lg"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className={`p-4 rounded-2xl border flex flex-col justify-between h-32 transition-all ${
                i === 1
                  ? 'bg-slate-900 border-purple-500/50 shadow-lg shadow-purple-900/20'
                  : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 w-24 bg-slate-800 rounded"></div>
                  <div className="h-3 w-16 bg-slate-800/60 rounded"></div>
                </div>
                <div className="h-5 w-16 bg-slate-800/80 rounded-full"></div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <div className="h-4 w-20 bg-slate-800/80 rounded"></div>
                <div className="h-7 w-20 bg-slate-800 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Active POD Data Viewer Skeleton */}
      <div className="rounded-3xl border border-purple-500/30 bg-slate-900/70 overflow-hidden shadow-2xl flex flex-col">
        {/* POD Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30"></div>
            <div className="flex flex-col gap-1">
              <div className="h-4 w-32 bg-slate-800 rounded"></div>
              <div className="h-3 w-48 bg-slate-800/60 rounded"></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-44 bg-slate-800 rounded-xl"></div>
            <div className="h-8 w-28 bg-slate-800 rounded-xl"></div>
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="h-3 w-12 bg-slate-800 rounded"></div>
          <div className="h-3 w-32 bg-slate-800 rounded"></div>
          <div className="h-3 w-48 bg-slate-800 rounded"></div>
          <div className="h-3 w-36 bg-slate-800 rounded"></div>
          <div className="h-3 w-20 bg-slate-800 rounded"></div>
        </div>
        <div className="divide-y divide-slate-800/60">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="p-3.5 flex items-center justify-between gap-4">
              <div className="h-4 w-8 bg-slate-800/60 rounded"></div>
              <div className="h-4 w-28 bg-slate-800/90 rounded"></div>
              <div className="h-4 w-56 bg-slate-800/70 rounded"></div>
              <div className="h-4 w-32 bg-slate-800/80 rounded"></div>
              <div className="h-6 w-20 bg-slate-800/80 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

