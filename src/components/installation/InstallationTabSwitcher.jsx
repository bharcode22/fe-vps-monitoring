import React from 'react';
import { Cpu, Tv, HardDrive } from 'lucide-react';

export default function InstallationTabSwitcher({ activeTab, setActiveTab }) {
  return (
    <div className="flex flex-col sm:flex-row items-center bg-slate-950/90 p-1.5 rounded-2xl border border-cyan-500/20 shadow-lg gap-1.5">
      {/* 1. Backend Microservices */}
      <button
        onClick={() => setActiveTab('backend')}
        className={`flex-1 w-full sm:w-auto py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
          activeTab === 'backend'
            ? 'bg-gradient-to-r from-cyan-500/25 via-sky-500/20 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
        }`}
      >
        <Cpu size={16} className={activeTab === 'backend' ? 'text-cyan-400' : 'text-slate-500'} />
        <span>Backend (POD v3)</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          5 Apps
        </span>
      </button>

      {/* 2. Frontend Screen Apps */}
      <button
        onClick={() => setActiveTab('frontend')}
        className={`flex-1 w-full sm:w-auto py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
          activeTab === 'frontend'
            ? 'bg-gradient-to-r from-purple-500/25 via-indigo-500/20 to-pink-500/25 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
        }`}
      >
        <Tv size={16} className={activeTab === 'frontend' ? 'text-purple-400' : 'text-slate-500'} />
        <span>Frontend Screens</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
          2 Apps
        </span>
      </button>

      {/* 3. MinIO Artifact & Version Manager */}
      <button
        onClick={() => setActiveTab('artifacts')}
        className={`flex-1 w-full sm:w-auto py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
          activeTab === 'artifacts'
            ? 'bg-gradient-to-r from-emerald-500/25 via-teal-500/20 to-cyan-500/25 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
        }`}
      >
        <HardDrive size={16} className={activeTab === 'artifacts' ? 'text-emerald-400' : 'text-slate-500'} />
        <span>MinIO Artifact Manager</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Storage
        </span>
      </button>
    </div>
  );
}
