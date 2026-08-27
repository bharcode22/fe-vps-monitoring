import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  X,
  Table,
  Code,
  Search,
  Copy,
  Check,
  Server,
  Zap,
  Loader2
} from 'lucide-react';
import { USER_LEVEL_CONFIG } from '../MasterDataViewer';

export default function PodRowInspectModal({
  inspectingRow,
  setInspectingRow,
  pod,
  masterInfo,
  pkColumn = 'id',
  getPodInfoByUuid,
  onSyncSingleRowToPod
}) {
  const [modalTab, setModalTab] = useState('table'); // 'table' | 'json'
  const [modalSearch, setModalSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [copiedModalJson, setCopiedModalJson] = useState(false);
  const [downloadingRowKey, setDownloadingRowKey] = useState(null);

  if (!inspectingRow || typeof document === 'undefined') return null;

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => setInspectingRow(null)}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Database size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-bold text-white">Detail Lengkap Data Baris</h4>
                {inspectingRow.isPresent ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    <CheckCircle2 size={11} /> Ada di {pod.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                    <AlertTriangle size={11} /> Belum Ada di {pod.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
                <span>Key:</span>
                <strong className="text-cyan-300">{inspectingRow.rowKey}</strong>
                <span className="text-slate-600">&bull;</span>
                <span>Tabel:</span>
                <strong className="text-white">{masterInfo?.tableName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => setInspectingRow(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Sub-header Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setModalTab('table')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                modalTab === 'table'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table size={13} />
              <span>Tabel Kolom ({Object.keys(inspectingRow.sampleData || {}).length})</span>
            </button>
            <button
              onClick={() => setModalTab('json')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                modalTab === 'json'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code size={13} />
              <span>Format JSON</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {modalTab === 'table' && (
              <div className="relative flex-1 sm:w-56">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Cari kolom / nilai..."
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(inspectingRow.sampleData || {}, null, 2));
                setCopiedModalJson(true);
                setTimeout(() => setCopiedModalJson(false), 2000);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Salin seluruh data JSON ke clipboard"
            >
              {copiedModalJson ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Salin JSON</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 min-h-0">
          {/* Registered POD Identification Card */}
          {(() => {
            const regUuid =
              inspectingRow.sampleData?.registerd_at || inspectingRow.sampleData?.registered_at;
            if (!regUuid) return null;
            const regPod = getPodInfoByUuid ? getPodInfoByUuid(regUuid) : null;
            if (!regPod) return null;
            return (
              <div className="mb-4 p-3.5 bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-500/40 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Server size={20} />
                  </div>
                  <div>
                    <div className="text-[11px] text-purple-300/80 font-sans font-medium">
                      User ini terdaftar pada unit:
                    </div>
                    <div className="font-bold text-white text-sm flex items-center gap-2 font-sans mt-0.5">
                      <span className="text-purple-200">{regPod.name}</span>
                      {regPod.code && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-900/90 text-xs text-purple-300 font-mono font-bold">
                          #{regPod.code}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-mono font-normal">
                        ({regPod.host})
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-purple-900/60 text-purple-300 border border-purple-500/30 font-mono font-semibold">
                    POD UUID Match
                  </span>
                </div>
              </div>
            );
          })()}

          {modalTab === 'table' ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-sans sticky top-0 z-10">
                    <th className="p-3 font-bold w-48">Nama Kolom</th>
                    <th className="p-3 font-bold">Nilai Data</th>
                    <th className="p-3 text-center w-16">Salin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-[11px]">
                  {(() => {
                    const rawEntries = Object.entries(inspectingRow.sampleData || {});
                    const priorityKeys = [
                      'user_id',
                      'id',
                      'username',
                      'userLevel',
                      'registerd_at',
                      'registered_at',
                      'full_names',
                      'email'
                    ];
                    const front = [];
                    for (const k of priorityKeys) {
                      const found = rawEntries.find(([key]) => key === k);
                      if (found && !front.includes(found)) {
                        front.push(found);
                      }
                    }
                    const rest = rawEntries.filter((e) => !front.includes(e));
                    return [...front, ...rest];
                  })()
                    .filter(([colKey, colVal]) => {
                      if (!modalSearch.trim()) return true;
                      const q = modalSearch.toLowerCase().trim();
                      return (
                        colKey.toLowerCase().includes(q) ||
                        String(colVal || '').toLowerCase().includes(q)
                      );
                    })
                    .map(([colKey, colVal], fIdx) => (
                      <tr key={fIdx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-bold text-cyan-300 align-top whitespace-nowrap">
                          {colKey}
                        </td>
                        <td className="p-3 text-slate-200 break-all select-text font-mono">
                          {colVal === null ? (
                            <span className="text-slate-500 italic">null</span>
                          ) : colVal === undefined ? (
                            <span className="text-slate-600 italic">undefined</span>
                          ) : typeof colVal === 'object' ? (
                            <pre className="text-purple-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(colVal, null, 2)}
                            </pre>
                          ) : colKey === 'userLevel' ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                USER_LEVEL_CONFIG[colVal]?.badgeClass ||
                                'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {String(colVal)}
                            </span>
                          ) : colKey === 'registerd_at' || colKey === 'registered_at' ? (
                            <div className="flex flex-col gap-1.5">
                              {(() => {
                                const podInfo = getPodInfoByUuid ? getPodInfoByUuid(colVal) : null;
                                if (podInfo) {
                                  return (
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-200 text-xs font-bold font-sans shadow-sm w-fit">
                                      <Server size={14} className="text-purple-400 shrink-0" />
                                      <span>{podInfo.name}</span>
                                      {podInfo.code && (
                                        <span className="px-1.5 py-0.2 rounded bg-purple-900/90 text-[10px] text-purple-300 font-mono">
                                          #{podInfo.code}
                                        </span>
                                      )}
                                      <span className="text-slate-400 font-mono text-[11px] font-normal">
                                        ({podInfo.host})
                                      </span>
                                    </div>
                                  );
                                }
                                if (colVal) {
                                  return (
                                    <span className="text-amber-400 font-mono font-bold text-xs">
                                      {String(colVal)}
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 border border-slate-800 text-xs font-sans w-fit">
                                    <Database size={12} className="text-slate-500" />
                                    <span>Pusat / Master DB</span>
                                  </span>
                                );
                              })()}
                              <span className="text-[10px] text-slate-500 font-mono select-all">
                                UUID: {String(colVal || 'null')}
                              </span>
                            </div>
                          ) : (
                            String(colVal)
                          )}
                        </td>
                        <td className="p-3 text-center align-top">
                          <button
                            onClick={() => handleCopy(String(colVal ?? ''), `modal_col_${fIdx}`)}
                            className="p-1 rounded-lg text-slate-500 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Salin nilai kolom ini"
                          >
                            {copiedKey === `modal_col_${fIdx}` ? (
                              <Check size={12} className="text-emerald-400" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="relative">
              <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-purple-300 overflow-auto whitespace-pre-wrap leading-relaxed select-text shadow-inner max-h-[420px]">
                {JSON.stringify(inspectingRow.sampleData || {}, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/50 shrink-0">
          <div>
            {!inspectingRow.isPresent && onSyncSingleRowToPod && (
              <button
                disabled={downloadingRowKey === inspectingRow.rowKeyStr}
                onClick={async () => {
                  setDownloadingRowKey(inspectingRow.rowKeyStr);
                  try {
                    await onSyncSingleRowToPod({
                      serverId: pod.id,
                      targetPodId: pod.id,
                      serverName: pod.name,
                      pkColumn,
                      pkValue: inspectingRow.pkVal,
                      rowData: inspectingRow.sampleData
                    });
                    setInspectingRow((prev) => (prev ? { ...prev, isPresent: true } : null));
                  } catch (err) {
                    console.error('Gagal mengunduh baris ke POD dari modal:', err);
                  } finally {
                    setDownloadingRowKey(null);
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 transition-all hover:scale-105 disabled:opacity-50"
              >
                {downloadingRowKey === inspectingRow.rowKeyStr ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-white" />
                    <span>Mengirim ke {pod.name}...</span>
                  </>
                ) : (
                  <>
                    <Zap size={13} className="fill-white" />
                    <span>Kirim Baris Ini ke {pod.name}</span>
                  </>
                )}
              </button>
            )}
          </div>

          <button
            onClick={() => setInspectingRow(null)}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
