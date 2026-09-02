import React, { useState } from 'react';
import { Search, FileCode, Copy, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function EnvSidebar({
  files = [],
  selectedFile,
  onSelectFile,
  onDuplicateFile,
  onDeleteFile
}) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.kvMap && Object.keys(f.kvMap).some(k => k.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="glass-card p-4 rounded-2xl border border-cyan-500/20 bg-slate-950/90 shadow-xl flex flex-col gap-3 h-full">
      {/* Search Filter */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('envManager.sidebar.searchPlaceholder', null, 'Cari file / nama variabel...')}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
        />
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {t('envManager.sidebar.fileCount', { count: filteredFiles.length }, `File Environment (${filteredFiles.length})`)}
        </span>
      </div>

      {/* Files List */}
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[620px] scrollbar-thin pr-1">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs italic">
            {t('envManager.sidebar.noFiles', null, 'Tidak ada file .env ditemukan.')}
          </div>
        ) : (
          filteredFiles.map((file) => {
            const isSelected = selectedFile?.name === file.name;
            const isDev = file.name.includes('dev');
            const isProd = file.name.includes('prod') || file.name.includes('release');

            return (
              <div
                key={file.name}
                onClick={() => onSelectFile(file)}
                className={`group p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-blue-500/15 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isProd
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : isDev
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}>
                      <FileCode size={14} />
                    </div>
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-300' : 'text-white'}`}>
                      {file.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {/* Duplicate / Clone Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateFile(file);
                      }}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded transition-colors cursor-pointer"
                      title={t('envManager.sidebar.cloneTooltip', null, 'Kloning file .env ini')}
                    >
                      <Copy size={12} />
                    </button>

                    {/* Delete File Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFile(file);
                      }}
                      className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                      title={t('envManager.sidebar.deleteTooltip', null, 'Hapus file .env ini')}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono">
                    {t('envManager.sidebar.varsAndLines', { vars: file.variableCount, lines: file.lineCount }, `${file.variableCount} Variabel • ${file.lineCount} Baris`)}
                  </span>

                  <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                    isProd
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : isDev
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isProd ? 'PROD' : isDev ? 'DEV' : 'CONFIG'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
