import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  CheckSquare,
  Square,
  MinusSquare,
  ArrowUpCircle,
  Trash2,
  Copy,
  Check,
  Zap,
  Eye,
  Loader2
} from 'lucide-react';

export default function PodDataRowsTable({
  pod,
  filteredData = [],
  dataStatusFilter,
  selectedKeys,
  toggleSelectRow,
  toggleSelectAllFiltered,
  isAllFilteredSelected,
  isSomeFilteredSelected,
  pkColumn = 'id',
  copiedKey,
  handleCopy,
  onSyncSinglePodRowToMaster,
  onDeletePodRow,
  onSyncSingleRowToPod,
  setInspectingRow
}) {
  const [syncingRowKey, setSyncingRowKey] = useState(null);
  const [deletingRowKey, setDeletingRowKey] = useState(null);
  const [downloadingRowKey, setDownloadingRowKey] = useState(null);
  const [justUploadedKeys, setJustUploadedKeys] = useState(new Set());

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-96 overflow-y-auto shadow-inner bg-slate-950/70">
      <table className="w-full text-left text-xs border-collapse font-mono">
        <thead>
          <tr className="bg-slate-900/95 border-b border-slate-800 text-slate-400 sticky top-0 z-10 font-sans">
            {/* Select All Checkbox */}
            <th className="p-3 text-center w-10">
              <button
                onClick={toggleSelectAllFiltered}
                className="text-slate-400 hover:text-white cursor-pointer"
                title={isAllFilteredSelected ? 'Batalkan Semua' : 'Pilih Semua'}
              >
                {isAllFilteredSelected ? (
                  <CheckSquare size={15} className="text-purple-400" />
                ) : isSomeFilteredSelected ? (
                  <MinusSquare size={15} className="text-purple-400" />
                ) : (
                  <Square size={15} />
                )}
              </button>
            </th>
            <th className="p-3 font-semibold text-center w-28 whitespace-nowrap">Aksi</th>
            <th className="p-3 font-bold">Key / ID Baris</th>
            <th className="p-3 font-semibold text-center w-36">Status di {pod.name}</th>
            <th className="p-3 font-bold">Nilai Data Preview</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50 text-[11px]">
          {filteredData.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-10 text-center text-slate-400 font-sans">
                {dataStatusFilter === 'missing' ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 size={26} className="text-emerald-400" />
                    <span className="font-bold text-white text-xs">Semua Data Sudah Ada di {pod.name}</span>
                    <span className="text-[11px] text-slate-500">
                      Seluruh data Master sudah 100% tersimpan pada database unit POD ini.
                    </span>
                  </div>
                ) : dataStatusFilter === 'present' ? (
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle size={26} className="text-amber-400" />
                    <span className="font-bold text-white text-xs">Belum Ada Data di {pod.name}</span>
                    <span className="text-[11px] text-slate-500">
                      Semua baris Master belum tersinkronisasi ke database unit POD ini.
                    </span>
                  </div>
                ) : (
                  <span>Tidak ada baris data yang cocok dengan filter atau pencarian.</span>
                )}
              </td>
            </tr>
          ) : (
            filteredData.map((item, idx) => {
              const presence = item.presence?.[pod.id];
              const isPresent = presence?.present;
              const pkVal =
                item.sampleData?.[pkColumn] !== undefined ? item.sampleData[pkColumn] : item.rowKey;
              const rowKeyStr = String(pkVal);
              const isSelected = selectedKeys.has(rowKeyStr);

              return (
                <tr
                  key={idx}
                  onClick={() => toggleSelectRow(rowKeyStr)}
                  className={`cursor-pointer select-none transition-all ${
                    isSelected
                      ? 'bg-purple-500/20 hover:bg-purple-500/25 border-l-4 border-purple-400 font-medium'
                      : !isPresent
                      ? 'bg-red-500/[0.04] hover:bg-slate-800/60'
                      : 'hover:bg-slate-800/60'
                  }`}
                >
                  {/* Row Checkbox */}
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleSelectRow(rowKeyStr)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare size={14} className="text-purple-400" />
                      ) : (
                        <Square size={14} />
                      )}
                    </button>
                  </td>

                  {/* Action column (Upload to Master & Delete in POD) */}
                  <td className="p-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      {isPresent ? (
                        <>
                          {/* Upload / Tarik baris ini ke Master */}
                          {onSyncSinglePodRowToMaster && !justUploadedKeys.has(rowKeyStr) && (
                            <button
                              disabled={syncingRowKey === rowKeyStr}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setSyncingRowKey(rowKeyStr);
                                try {
                                  await onSyncSinglePodRowToMaster({
                                    serverId: pod.id,
                                    serverName: pod.name,
                                    pkColumn,
                                    pkValue: pkVal
                                  });
                                  setJustUploadedKeys((prev) => new Set(prev).add(rowKeyStr));
                                } finally {
                                  setSyncingRowKey(null);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer hover:scale-105 disabled:opacity-50"
                              title={`Upload / Tarik 1 baris ini dari ${pod.name} ke Master Database`}
                            >
                              {syncingRowKey === rowKeyStr ? (
                                <>
                                  <Loader2 size={12} className="animate-spin text-white" />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <ArrowUpCircle size={12} />
                                  <span>Upload</span>
                                </>
                              )}
                            </button>
                          )}
                          {justUploadedKeys.has(rowKeyStr) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              <CheckCircle2 size={11} className="text-emerald-400" />
                              <span>Terupload</span>
                            </span>
                          )}

                          {/* Hapus baris di POD */}
                          <button
                            disabled={deletingRowKey === rowKeyStr}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setDeletingRowKey(rowKeyStr);
                              try {
                                onDeletePodRow &&
                                  (await onDeletePodRow({
                                    serverId: pod.id,
                                    serverName: pod.name,
                                    pkColumn,
                                    pkValue: pkVal
                                  }));
                              } finally {
                                setDeletingRowKey(null);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer disabled:opacity-50"
                            title={`Hapus permanen baris data ini dari database ${pod.name}`}
                          >
                            {deletingRowKey === rowKeyStr ? (
                              <Loader2 size={13} className="animate-spin text-red-400" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-600 text-xs">-</span>
                      )}
                    </div>
                  </td>

                  {/* Key */}
                  <td className="p-3 font-bold text-cyan-300">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate max-w-[240px]" title={item.rowKey}>
                        {item.rowKey}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(item.rowKey, `pod_r_${idx}`);
                        }}
                        className="text-slate-500 hover:text-cyan-400 p-0.5 cursor-pointer"
                      >
                        {copiedKey === `pod_r_${idx}` ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    {isPresent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold font-sans">
                        <CheckCircle2 size={12} /> Ada di {pod.name}
                      </span>
                    ) : (
                      <button
                        disabled={downloadingRowKey === rowKeyStr}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setDownloadingRowKey(rowKeyStr);
                          try {
                            if (onSyncSingleRowToPod) {
                              await onSyncSingleRowToPod({
                                serverId: pod.id,
                                targetPodId: pod.id,
                                serverName: pod.name,
                                pkColumn,
                                pkValue: pkVal,
                                rowData: item.sampleData
                              });
                            }
                          } catch (err) {
                            console.error('Gagal mengunduh baris ke POD:', err);
                          } finally {
                            setDownloadingRowKey(null);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 hover:bg-amber-500/30 text-red-300 hover:text-amber-300 border border-red-500/30 hover:border-amber-500/40 text-[10px] font-bold font-sans transition-all cursor-pointer hover:scale-105 disabled:opacity-50"
                        title={`Klik untuk mengunduh 1 baris ini dari Master ke ${pod.name}`}
                      >
                        {downloadingRowKey === rowKeyStr ? (
                          <>
                            <Loader2 size={11} className="animate-spin text-amber-400" />
                            <span>Mengunduh...</span>
                          </>
                        ) : (
                          <>
                            <Zap size={11} className="fill-amber-400 text-amber-400" />
                            <span>Download</span>
                          </>
                        )}
                      </button>
                    )}
                  </td>

                  {/* Data Value Preview */}
                  <td
                    className="p-3 text-slate-300 font-sans cursor-pointer group hover:bg-purple-950/20 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectingRow({
                        rowKey: item.rowKey,
                        sampleData: item.sampleData,
                        isPresent,
                        pkVal,
                        rowKeyStr
                      });
                    }}
                    title="Klik untuk melihat keseluruhan data baris ini secara lengkap"
                  >
                    <div className="flex items-center justify-between gap-2 max-w-[420px]">
                      <span className="truncate font-mono text-[11px] text-slate-400 group-hover:text-cyan-300 transition-colors">
                        {item.sampleData ? JSON.stringify(item.sampleData) : '-'}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 px-2 py-0.5 rounded-lg bg-slate-800/80 group-hover:bg-purple-600/30 text-slate-400 group-hover:text-purple-300 border border-slate-700/60 group-hover:border-purple-500/40 transition-all flex items-center gap-1 text-[10px] font-sans font-semibold cursor-pointer"
                      >
                        <Eye size={11} />
                        <span className="hidden sm:inline">Detail</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
