import React from 'react';
import { FileCode, SlidersHorizontal, GitCompare, Plus, Save, RotateCw, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function EnvHeader({
  activeTab,
  setActiveTab,
  selectedFile,
  isSaving,
  isDirty,
  onSave,
  onOpenCreateModal,
  onRefresh,
  onBack
}) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-5 rounded-2xl border border-cyan-500/30 bg-slate-950/80 backdrop-blur-md shadow-2xl">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            title={t('common.back', null, 'Kembali ke Dashboard')}
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-blue-500/20 border border-emerald-500/40 text-emerald-400">
          <FileCode size={24} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="gradient-text text-lg sm:text-xl font-extrabold tracking-tight">
              {t('envManager.header.title', null, 'Environment Manager & Comparison')}
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              backend/envoirment
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">
            {t('envManager.header.subtitle', null, 'Kelola file .env, edit konfigurasi variabel, dan bandingkan nilai antar environment secara visual')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Tab Mode Switcher (Editor vs Compare) */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'editor'
              ? 'bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <SlidersHorizontal size={14} />
            <span>{t('envManager.header.editorTab', null, 'File Editor')}</span>
          </button>

          <button
            onClick={() => setActiveTab('compare')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'compare'
              ? 'bg-gradient-to-r from-purple-500/25 to-indigo-500/25 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <GitCompare size={14} />
            <span>{t('envManager.header.compareTab', null, 'Diff Comparator')}</span>
          </button>
        </div>

        {/* Refresh Files List */}
        <button
          onClick={onRefresh}
          className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
          title={t('envManager.header.refreshTooltip', null, 'Segarkan data file .env')}
        >
          <RotateCw size={16} />
        </button>

        {/* Create New .env File Button */}
        <button
          onClick={onOpenCreateModal}
          className="bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
        >
          <Plus size={15} />
          <span>{t('envManager.header.createBtn', null, 'Buat File .env')}</span>
        </button>

        {/* Save Current File Button (Shown when in editor tab) */}
        {activeTab === 'editor' && selectedFile && (
          <button
            onClick={onSave}
            disabled={isSaving || !isDirty}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-md cursor-pointer ${isDirty
              ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/25'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
          >
            {isSaving ? (
              <>
                <RotateCw size={14} className="animate-spin" />
                <span>{t('envManager.header.saving', null, 'Menyimpan...')}</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>{isDirty ? t('envManager.header.saveChanges', null, 'Simpan Perubahan') : t('envManager.header.saved', null, 'Tersimpan')}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
