import React, { useState, useMemo } from 'react';
import {
  HardDrive,
  RefreshCw,
  Folder,
  FolderOpen,
  FileCode,
  Download,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Activity
} from 'lucide-react';
import { MODULE_CONFIG, getTodayLocalDate, getModuleFullName } from './podRecordsConfig';

export default function PodRecordsFilesView({
  storageFilesData,
  isLoadingFiles,
  selectedDate,
  availableDates = [],
  onSelectCategory,
  onSelectDate,
  onSelectModule,
  onViewModeChange,
  onTriggerDownload,
  onOpenFile
}) {
  const [fileSearch, setFileSearch] = useState('');
  const todayStr = getTodayLocalDate();

  // Extract folder summaries from storageFilesData
  const dateFolders = useMemo(() => {
    return storageFilesData?.dateFolders || [];
  }, [storageFilesData]);

  // Filter files by search query
  const filteredFiles = useMemo(() => {
    const list = storageFilesData?.files || [];
    if (!fileSearch.trim()) return list;
    const q = fileSearch.toLowerCase().trim();
    return list.filter((f) => {
      const nameMatch = f.name?.toLowerCase().includes(q);
      const modName = f.moduleId ? getModuleFullName(f.moduleId)?.toLowerCase() : '';
      const catMatch = f.category?.toLowerCase().includes(q);
      const modMatch = String(f.moduleId || '').includes(q);
      return nameMatch || (modName && modName.includes(q)) || catMatch || modMatch;
    });
  }, [storageFilesData?.files, fileSearch]);

  // Current folder stats
  const activeFolderMeta = useMemo(() => {
    if (selectedDate === 'ALL') {
      return {
        label: 'Semua Folder (All Dates)',
        count: storageFilesData?.totalFiles || 0,
        sizeFormatted: storageFilesData?.totalSizeFormatted || '0 B'
      };
    }
    const found = dateFolders.find((df) => df.date === selectedDate);
    if (found) return found;
    return {
      date: selectedDate,
      count: storageFilesData?.filteredFilesCount || storageFilesData?.files?.length || 0,
      sizeFormatted: storageFilesData?.filteredSizeFormatted || storageFilesData?.totalSizeFormatted || '0 B'
    };
  }, [dateFolders, selectedDate, storageFilesData]);

  const handleFileClick = (file, preferredMode = null) => {
    if (onOpenFile) {
      onOpenFile(file, preferredMode);
    } else {
      if (onSelectCategory) onSelectCategory(file.type);
      if (file.date && onSelectDate) onSelectDate(file.date);
      if (onSelectModule) {
        onSelectModule(file.moduleId !== undefined && file.moduleId !== null ? file.moduleId : 'ALL');
      }
      if (onViewModeChange) onViewModeChange(preferredMode || 'json', file.name);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. DIRECTORY BREADCRUMB & SEARCH BAR */}
      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="text-slate-500">Lokasi:</span>
          <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
            pods
          </span>
          <span className="text-slate-600">/</span>
          <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800 font-bold">
            {storageFilesData?.folderName || 'POD'}
          </span>
          <span className="text-slate-600">/</span>
          <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
            <FolderOpen size={12} className="text-cyan-400" />
            {selectedDate === 'ALL' ? 'semua_folder' : selectedDate}
          </span>
          <span className="text-slate-600">/</span>
        </div>

        {/* Search input inside folder */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              placeholder="Cari nama berkas / modul..."
              className="bg-slate-900 border border-slate-800 rounded-xl pl-7 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-52 sm:w-60"
            />
          </div>

          <div className="text-right shrink-0 px-2">
            <span className="text-xs font-mono font-bold text-cyan-400">
              {filteredFiles.length} berkas
            </span>
          </div>
        </div>
      </div>

      {/* 2. FILES LIST TABLE */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
        {isLoadingFiles ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw size={20} className="animate-spin text-cyan-400" />
            <span>Memuat berkas dari folder {selectedDate}...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Nama Berkas</th>
                  <th className="py-3 px-4">Modul / Konten</th>
                  <th className="py-3 px-4">Kategori Log</th>
                  <th className="py-3 px-4 text-right">Ukuran</th>
                  <th className="py-3 px-4">Waktu Modifikasi Terakhir</th>
                  <th className="py-3 px-4 text-center">Aksi Akses Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono">
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-sans text-xs">
                      {fileSearch
                        ? `Tidak ada berkas yang cocok dengan kata pencarian "${fileSearch}".`
                        : `Tidak ada berkas yang tersimpan di folder tanggal ${selectedDate}.`}
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file, idx) => {
                    const modDate = new Date(file.modifiedAt);
                    const dateFormatted = isNaN(modDate.getTime()) ? '-' : modDate.toLocaleString('id-ID');
                    const modFullName = file.moduleId ? getModuleFullName(file.moduleId) : null;

                    return (
                      <tr
                        key={idx}
                        onClick={() => handleFileClick(file)}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        {/* File Name & Format */}
                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FileCode
                              size={16}
                              className={
                                file.type === 'heartbeats'
                                  ? 'text-cyan-400 shrink-0'
                                  : file.type === 'events'
                                  ? 'text-amber-400 shrink-0'
                                  : 'text-emerald-400 shrink-0'
                              }
                            />
                            <span className="text-cyan-100 group-hover:text-cyan-300 transition-colors">{file.name}</span>
                          </div>
                        </td>

                        {/* Module Info / Details */}
                        <td className="py-3 px-4 whitespace-nowrap font-sans">
                          {file.moduleId ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/40">
                                Mod {file.moduleId}
                              </span>
                              {modFullName && (
                                <span className="text-slate-300 text-[11px] font-medium">
                                  {modFullName}
                                </span>
                              )}
                            </div>
                          ) : file.type === 'events' ? (
                            <span className="text-amber-300 text-[11px] font-medium">
                              Log Peristiwa &amp; Alert
                            </span>
                          ) : (
                            <span className="text-emerald-300 text-[11px] font-medium">
                              Snapshot Status Perangkat
                            </span>
                          )}
                        </td>

                        {/* Category Badge */}
                        <td className="py-3 px-4 whitespace-nowrap font-sans">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              file.type === 'heartbeats'
                                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                : file.type === 'events'
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {file.category}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="py-3 px-4 text-right font-bold text-slate-200 whitespace-nowrap">
                          {file.sizeFormatted}
                        </td>

                        {/* Modified Time */}
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                          {dateFormatted}
                        </td>

                        {/* Quick Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            {/* Action 1: Grafik Metrik (for timeseries .jsonl files) */}
                            {file.name?.endsWith('.jsonl') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFileClick(file, 'chart');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 font-sans text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-cyan-500/10"
                                title="Buka visualisasi grafik metrik waktu berkas ini"
                              >
                                <Activity size={13} className="text-cyan-400" />
                                <span>Grafik Metrik</span>
                              </button>
                            )}

                            {/* Action 2: Buka JSON */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFileClick(file, 'json');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 font-sans text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                              title="Buka dan baca isi data JSON berkas ini"
                            >
                              <FileCode size={13} className="text-slate-400 group-hover:text-cyan-400" />
                              <span>Buka JSON</span>
                            </button>

                            {/* Download Action */}
                            {file.type === 'heartbeats' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (file.date) onSelectDate(file.date);
                                  onTriggerDownload('json', file.moduleId !== undefined && file.moduleId !== null ? file.moduleId : undefined);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
                                title="Unduh .json berkas ini"
                              >
                                <Download size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
