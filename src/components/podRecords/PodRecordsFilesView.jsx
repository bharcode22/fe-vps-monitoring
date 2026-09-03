import React from 'react';
import {
  HardDrive,
  RefreshCw,
  FolderOpen,
  FileCode,
  Eye,
  Download
} from 'lucide-react';

export default function PodRecordsFilesView({
  storageFilesData,
  isLoadingFiles,
  onSelectCategory,
  onSelectDate,
  onViewModeChange,
  onTriggerDownload
}) {
  return (
    <div className="space-y-4">
      {/* Storage Folder Summary Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <FolderOpen size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Arsip Berkas Rekaman Fisik (Disk)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {storageFilesData?.storagePath || 'pods/'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Daftar berkas rekaman log per detik (.jsonl) dan snapshot status yang tersimpan di direktori server ini.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-xs text-slate-400">Total Berkas</div>
            <div className="text-sm font-black font-mono text-cyan-400">
              {storageFilesData?.totalFiles || 0} file
            </div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="text-right">
            <div className="text-xs text-slate-400">Total Ukuran</div>
            <div className="text-sm font-black font-mono text-emerald-400">
              {storageFilesData?.totalSizeFormatted || '0 B'}
            </div>
          </div>
        </div>
      </div>

      {/* Files List Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
        {isLoadingFiles ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw size={20} className="animate-spin text-cyan-400" />
            <span>Memuat daftar berkas fisik dari storage server...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Nama Berkas</th>
                  <th className="py-3 px-4">Kategori Log</th>
                  <th className="py-3 px-4">Lokasi Relatif</th>
                  <th className="py-3 px-4 text-right">Ukuran</th>
                  <th className="py-3 px-4">Waktu Modifikasi Terakhir</th>
                  <th className="py-3 px-4 text-center">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono">
                {!storageFilesData?.files || storageFilesData.files.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-sans text-xs">
                      Belum ada berkas yang tersimpan di direktori pod_storage untuk server ini.
                    </td>
                  </tr>
                ) : (
                  storageFilesData.files.map((file, idx) => {
                    const modDate = new Date(file.modifiedAt);
                    const dateFormatted = isNaN(modDate.getTime()) ? '-' : modDate.toLocaleString('id-ID');

                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2 whitespace-nowrap">
                          <FileCode size={15} className="text-cyan-400 shrink-0" />
                          <span>{file.name}</span>
                        </td>
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
                        <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap font-mono">
                          {file.relativePath}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-200 whitespace-nowrap">
                          {file.sizeFormatted}
                        </td>
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                          {dateFormatted}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {file.type !== 'state' && (
                              <button
                                onClick={() => {
                                  onSelectCategory(file.type);
                                  onSelectDate(file.date);
                                  onViewModeChange('table');
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-sans text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                title="Buka data di tabel interaktif"
                              >
                                <Eye size={12} />
                                <span>Buka Tabel</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                onSelectCategory(file.type);
                                if (file.date) onSelectDate(file.date);
                                onViewModeChange('json');
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-sans text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              title="Lihat isi JSON"
                            >
                              <FileCode size={12} />
                              <span>Buka JSON</span>
                            </button>
                            {file.type === 'heartbeats' && (
                              <button
                                onClick={() => {
                                  onSelectDate(file.date);
                                  onTriggerDownload('json');
                                }}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
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
