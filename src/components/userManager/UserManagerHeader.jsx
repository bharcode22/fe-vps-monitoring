import React from 'react';
import { ArrowLeft, Users, Database, RefreshCw } from 'lucide-react';

/**
 * Modular Header Toolbar for Database User Manager
 */
export default function UserManagerHeader({
  onBack,
  masterDatabases = [],
  selectedMasterId,
  onSelectMasterId,
  isLoadingDatabases = false,
  isComparing = false,
  onRefresh
}) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-xl shadow-xl">
      {/* Left Title & Icon */}
      <div className="flex items-center gap-3.5">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm hover:scale-105"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 shadow-md">
          <Users size={24} />
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Database User Manager
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold font-mono">
              public.user
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Kelola akun, edit <code>userLevel</code> enum, dan pantau komparasi data langsung dengan seluruh unit POD V3.
          </p>
        </div>
      </div>

      {/* Right Master DB Selector & Refresh Button */}
      <div className="flex items-center gap-2.5 w-full md:w-auto">
        <div className="relative flex-1 md:w-64">
          <Database size={13} className="absolute left-3 top-3 text-slate-500 pointer-events-none" />
          <select
            value={selectedMasterId}
            onChange={(e) => onSelectMasterId(e.target.value)}
            disabled={isLoadingDatabases || isComparing}
            className="w-full pl-8 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none shadow-sm disabled:opacity-50"
            title="Pilih Master Database"
          >
            {masterDatabases.map((db) => (
              <option key={db.id} value={db.id}>
                {db.name || `Master #${db.id}`} ({db.host})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onRefresh}
          disabled={isComparing}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm hover:scale-105 disabled:opacity-50"
          title="Muat Ulang Data User & Status POD"
        >
          <RefreshCw size={15} className={isComparing ? 'animate-spin text-indigo-400' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </div>
  );
}
