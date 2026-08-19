import React from 'react';
import { Cpu, Tv } from 'lucide-react';

export default function InstallationTabSwitcher({ activeTab, setActiveTab }) {
  return (
    <div className="flex items-center bg-slate-950/90 p-1.5 rounded-2xl border border-cyan-500/20 shadow-lg">
      <button
        onClick={() => setActiveTab('backend')}
        className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
          activeTab === 'backend'
            ? 'bg-gradient-to-r from-cyan-500/25 via-sky-500/20 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
        }`}
      >
        <Cpu size={18} className={activeTab === 'backend' ? 'text-cyan-400' : 'text-slate-500'} />
        <span>Backend Microservices (POD v3)</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          5 Apps
        </span>
      </button>

      <button
        onClick={() => setActiveTab('frontend')}
        className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
          activeTab === 'frontend'
            ? 'bg-gradient-to-r from-purple-500/25 via-indigo-500/20 to-pink-500/25 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
        }`}
      >
        <Tv size={18} className={activeTab === 'frontend' ? 'text-purple-400' : 'text-slate-500'} />
        <span>Frontend Screen Apps (POD v3)</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
          2 Apps
        </span>
      </button>
    </div>
  );
}
