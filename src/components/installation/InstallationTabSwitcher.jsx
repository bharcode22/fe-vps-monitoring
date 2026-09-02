import React from 'react';
import { Cpu, Tv, HardDrive, History, Layers, Package } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function InstallationTabSwitcher({ activeTab, setActiveTab }) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap items-center bg-slate-950/90 p-1.5 rounded-2xl border border-cyan-500/20 shadow-lg gap-1.5">
      {/* 1. Backend Microservices */}
      <button
        onClick={() => setActiveTab('backend')}
        className={`flex-1 min-w-[130px] py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === 'backend'
            ? 'bg-gradient-to-r from-cyan-500/25 via-sky-500/20 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
      >
        <Cpu size={14} className={activeTab === 'backend' ? 'text-cyan-400' : 'text-slate-500'} />
        <span>{t('installation.tabs.backend', null, 'Backend')}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          5 Apps
        </span>
      </button>

      {/* 2. Frontend Screen Apps */}
      <button
        onClick={() => setActiveTab('frontend')}
        className={`flex-1 min-w-[130px] py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === 'frontend'
            ? 'bg-gradient-to-r from-purple-500/25 via-indigo-500/20 to-pink-500/25 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
      >
        <Tv size={14} className={activeTab === 'frontend' ? 'text-purple-400' : 'text-slate-500'} />
        <span>{t('installation.tabs.frontend', null, 'Frontend Screens')}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
          2 Apps
        </span>
      </button>

      {/* 3. Bundle Versioning */}
      <button
        onClick={() => setActiveTab('bundles')}
        className={`flex-1 min-w-[140px] py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === 'bundles' || activeTab === 'bundle_deploy'
            ? 'bg-gradient-to-r from-teal-500/25 via-emerald-500/20 to-cyan-500/25 text-teal-300 border border-teal-500/40 shadow-lg shadow-teal-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
      >
        <Package size={14} className={activeTab === 'bundles' || activeTab === 'bundle_deploy' ? 'text-teal-400' : 'text-slate-500'} />
        <span>{t('installation.tabs.bundles', null, 'Versi Bundle')}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
          {activeTab === 'bundle_deploy' ? t('installation.tabs.deployCount', null, '7 Apps Deploy') : t('installation.tabs.bundleBadge', null, 'Bundle')}
        </span>
      </button>

      {/* 4. POD App Version Matrix */}
      <button
        onClick={() => setActiveTab('matrix')}
        className={`flex-1 min-w-[130px] py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === 'matrix'
            ? 'bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-orange-500/25 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
      >
        <Layers size={14} className={activeTab === 'matrix' ? 'text-amber-400' : 'text-slate-500'} />
        <span>{t('installation.tabs.matrix', null, 'Matriks Versi')}</span>
      </button>

      {/* 5. Deployment History */}
      <button
        onClick={() => setActiveTab('history')}
        className={`flex-1 min-w-[130px] py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === 'history'
            ? 'bg-gradient-to-r from-blue-500/25 via-indigo-500/20 to-cyan-500/25 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
      >
        <History size={14} className={activeTab === 'history' ? 'text-blue-400' : 'text-slate-500'} />
        <span>{t('installation.tabs.history', null, 'Riwayat Rilis')}</span>
      </button>

      {/* 6. MinIO Artifact & Version Manager */}
      <button
        onClick={() => setActiveTab('artifacts')}
        className={`flex-1 min-w-[130px] py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === 'artifacts'
            ? 'bg-gradient-to-r from-rose-500/25 via-pink-500/20 to-purple-500/25 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
      >
        <HardDrive size={14} className={activeTab === 'artifacts' ? 'text-rose-400' : 'text-slate-500'} />
        <span>{t('installation.tabs.artifacts', null, 'MinIO Storage')}</span>
      </button>
    </div>
  );
}
