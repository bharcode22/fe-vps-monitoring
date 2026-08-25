import React, { useState, useMemo } from 'react';
import { Server, CheckCircle2, AlertTriangle, Zap, Copy, Check, Search, Database, Trash2 } from 'lucide-react';

export default function PodDataViewer({
  pod,
  masterInfo,
  dataMatrix = [],
  columnsMatrix = [],
  onSyncPod,
  onDeletePodRow,
  onSyncSingleRowToPod
}) {
  const [activeSubTab, setActiveSubTab] = useState('data'); // 'data' | 'columns'
  const [filterMissingOnly, setFilterMissingOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  const pkColumn = masterInfo?.pkColumn || 'id';

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filter rows for this specific POD
  const filteredData = useMemo(() => {
    return dataMatrix.filter(item => {
      const presence = item.presence?.[pod?.id];
      const isPresent = presence?.present;

      if (filterMissingOnly && isPresent) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const keyMatch = item.rowKey.toLowerCase().includes(q);
        const sampleMatch = Object.values(item.sampleData || {}).some(val =>
          String(val || '').toLowerCase().includes(q)
        );
        if (!keyMatch && !sampleMatch) return false;
      }

      return true;
    });
  }, [dataMatrix, pod, filterMissingOnly, searchQuery]);

  // Missing count in this POD
  const missingCountInThisPod = useMemo(() => {
    return dataMatrix.filter(item => !item.presence?.[pod?.id]?.present).length;
  }, [dataMatrix, pod]);

  if (!pod) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center text-slate-500 font-sans text-xs flex flex-col items-center gap-2">
        <Server size={28} className="text-slate-600" />
        <span>Pilih salah satu unit POD v3 di atas untuk melihat data yang ada di database POD tersebut.</span>
      </div>
    );
  }

  if (!pod.isOnline) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-8 text-center text-red-300 text-xs flex flex-col items-center gap-3">
        <AlertTriangle size={32} className="text-red-400" />
        <div>
          <h4 className="font-bold text-sm text-white">Unit {pod.name} Sedang OFFLINE</h4>
          <p className="text-slate-400 mt-1">Database PostgreSQL pada server ini tidak dapat dihubungi. Pastikan server POD menyala dan terhubung ke jaringan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-4">
      {/* Header Bar for Active POD */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Server size={16} />
            </span>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Data di Unit POD: <strong className="text-purple-400 font-mono">{pod.name}</strong></span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  pod.status === 'SYNCED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {pod.status === 'SYNCED' ? '100% SYNCED' : 'DRIFT / KURANG DATA'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Jumlah Data: <strong className="text-white font-mono">{pod.rowCount} baris</strong> &bull; Master: <strong className="text-cyan-300 font-mono">{masterInfo?.rowCount || 0} baris</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Sync This POD */}
        {pod.status !== 'SYNCED' && (
          <button
            onClick={() => onSyncPod(pod.id)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer transition-all hover:scale-105"
          >
            <Zap size={14} className="fill-slate-950" />
            <span>Sinkronkan {pod.name} Sekarang ({missingCountInThisPod} Baris Kurang)</span>
          </button>
        )}
      </div>

      {/* Toolbar: Sub-tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('data')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'data'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
            }`}
          >
            Data Baris ({filteredData.length})
          </button>

          <button
            onClick={() => setActiveSubTab('columns')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'columns'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
            }`}
          >
            Skema Kolom DDL ({columnsMatrix.length})
          </button>
        </div>

        {activeSubTab === 'data' && (
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={filterMissingOnly}
                onChange={(e) => setFilterMissingOnly(e.target.checked)}
                className="rounded border-slate-700 text-purple-500 focus:ring-0"
              />
              <span>Hanya yang Belum Ada di {pod.name} ({missingCountInThisPod})</span>
            </label>

            <div className="relative w-52">
              <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari baris data..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: Data Rows List with Status in This POD */}
      {activeSubTab === 'data' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-80 overflow-y-auto shadow-inner bg-slate-950/70">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-900/95 border-b border-slate-800 text-slate-400 sticky top-0 z-10 font-sans">
                <th className="p-3 font-bold w-12 text-center">Aksi</th>
                <th className="p-3 font-bold">Baris / Kunci Data Master</th>
                <th className="p-3 font-semibold text-center w-36">Status di {pod.name}</th>
                <th className="p-3 font-semibold">Cuplikan Nilai Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-[11px]">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 font-sans">
                    Semua data sudah selaras atau tidak ada baris yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => {
                  const presence = item.presence?.[pod.id];
                  const isPresent = presence?.present;
                  const pkVal = item.sampleData?.[pkColumn] !== undefined ? item.sampleData[pkColumn] : item.rowKey;

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        !isPresent ? 'bg-red-500/[0.05]' : ''
                      }`}
                    >
                      {/* Delete Action */}
                      <td className="p-3 text-center">
                        {isPresent ? (
                          <button
                            onClick={() => onDeletePodRow && onDeletePodRow({
                              serverId: pod.id,
                              serverName: pod.name,
                              pkColumn,
                              pkValue: pkVal
                            })}
                            className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
                            title={`Hapus baris ini dari database ${pod.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Key */}
                      <td className="p-3 font-bold text-cyan-300">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[240px]" title={item.rowKey}>{item.rowKey}</span>
                          <button
                            onClick={() => handleCopy(item.rowKey, `pod_r_${idx}`)}
                            className="text-slate-500 hover:text-cyan-400 p-0.5 cursor-pointer"
                          >
                            {copiedKey === `pod_r_${idx}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold font-sans">
                            <CheckCircle2 size={12} /> Ada di {pod.name}
                          </span>
                        ) : (
                          <button
                            onClick={() => onSyncSingleRowToPod && onSyncSingleRowToPod({
                              serverId: pod.id,
                              serverName: pod.name,
                              pkColumn,
                              pkValue: pkVal
                            })}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 hover:bg-amber-500/30 text-red-300 hover:text-amber-300 border border-red-500/30 hover:border-amber-500/40 text-[10px] font-bold font-sans transition-all cursor-pointer hover:scale-105"
                            title={`Klik untuk menyinkronkan 1 baris ini dari Master ke ${pod.name}`}
                          >
                            <Zap size={11} className="fill-amber-400 text-amber-400" />
                            <span>Sync Baris Ini</span>
                          </button>
                        )}
                      </td>

                      {/* Data Value Preview */}
                      <td className="p-3 text-slate-300 truncate max-w-[340px] font-sans">
                        {item.sampleData ? JSON.stringify(item.sampleData) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-TAB 2: Columns DDL Status in This POD */}
      {activeSubTab === 'columns' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-80 overflow-y-auto shadow-inner bg-slate-950/70">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-900/95 border-b border-slate-800 text-slate-400 sticky top-0 z-10 font-sans">
                <th className="p-3 font-bold">Nama Kolom Master</th>
                <th className="p-3 font-bold">Tipe Data Master</th>
                <th className="p-3 font-semibold text-center w-36">Status di {pod.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-[11px]">
              {columnsMatrix.map((col, idx) => {
                const presence = col.presence?.[pod.id];
                const exists = presence?.exists;
                const typeMatch = presence?.typeMatch;

                return (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-bold text-cyan-300">{col.columnName}</td>
                    <td className="p-3 text-purple-300">{col.dataType}</td>
                    <td className="p-3 text-center font-sans">
                      {exists ? (
                        typeMatch ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            <CheckCircle2 size={12} /> Kolom Cocok
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            Tipe Beda: {presence.podType}
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
                          Kolom Missing
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
