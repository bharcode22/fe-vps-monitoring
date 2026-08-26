import React, { useState, useEffect } from 'react';
import { Eraser, AlertTriangle, X, Database, Info, Loader2, CheckCircle2, Search } from 'lucide-react';
import { checkMasterDuplicatesApi, cleanMasterDuplicatesApi } from '../../api/masterPodSyncApi';

export default function CleanMasterDuplicatesModal({
  isOpen,
  onClose,
  tableName,
  masterInfo,
  columns = [],
  onSuccess
}) {
  const [selectedCols, setSelectedCols] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  // Checking results
  const [hasChecked, setHasChecked] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    if (tableName === 'terms_and_conditions_answers') {
      setSelectedCols(['fk_user_id', 'fk_question_id']);
    } else {
      if (columns && columns.length > 0) {
        // Find PK column or fallback to first column
        const pkCol = columns.find(c => c.isPk)?.columnName || columns[0].columnName;
        setSelectedCols([pkCol]);
      } else {
        setSelectedCols([]);
      }
    }

    // Reset state when opened/closed or table changes
    setHasChecked(false);
    setCheckResult(null);
  }, [tableName, isOpen, columns]);

  if (!isOpen) return null;

  const toggleColumn = (colName) => {
    if (hasChecked) return; // Prevent changing cols after checking
    setSelectedCols(prev =>
      prev.includes(colName) ? prev.filter(c => c !== colName) : [...prev, colName]
    );
  };

  const handleCheck = async () => {
    if (selectedCols.length === 0) return;
    setIsChecking(true);
    try {
      const res = await checkMasterDuplicatesApi({
        masterId: masterInfo?.id,
        tableName,
        conflictCols: selectedCols
      });
      if (res.success) {
        setCheckResult(res.data);
        setHasChecked(true);
      } else {
        alert(`Gagal mengecek duplikat: ${res.error}`);
      }
    } catch (err) {
      alert(`Terjadi kesalahan jaringan: ${err.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  const handleClean = async () => {
    if (!hasChecked || !checkResult?.hasDuplicates) return;

    setIsCleaning(true);
    try {
      const res = await cleanMasterDuplicatesApi({
        masterId: masterInfo?.id,
        tableName,
        conflictCols: selectedCols
      });

      if (res.success) {
        alert(`Berhasil membersihkan ${res.data.deletedCount} baris data duplikat di Master!`);
        onSuccess();
      } else {
        alert(`Gagal: ${res.error}`);
      }
    } catch (err) {
      alert(`Terjadi kesalahan jaringan: ${err.message}`);
    } finally {
      setIsCleaning(false);
    }
  };

  const renderCheckPreview = () => {
    if (!checkResult) return null;

    if (!checkResult.hasDuplicates) {
      return (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
          <div>
            <h4 className="text-emerald-300 font-bold text-sm">Tidak Ditemukan Duplikat!</h4>
            <p className="text-emerald-400/80 text-xs mt-0.5">Tabel Master ini sudah bersih berdasarkan kombinasi kolom yang Anda pilih.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between">
          <div>
            <h4 className="text-amber-400 font-bold text-sm flex items-center gap-1.5">
              <AlertTriangle size={16} />
              <span>Ditemukan Data Duplikat</span>
            </h4>
            <p className="text-amber-300/80 text-xs mt-0.5">
              Total <strong>{checkResult.totalDuplicateRows} baris</strong> terindikasi ganda.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block mb-0.5">Akan Dihapus</span>
            <span className="text-lg font-black text-red-400">{checkResult.rowsToDelete} baris</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-800/50 px-3 py-2 border-b border-slate-700">
            <span className="text-xs font-bold text-slate-300">Cuplikan 5 Data Duplikat Terbanyak:</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-mono">
                <tr>
                  {selectedCols.map(c => <th key={c} className="p-2 border-b border-slate-800">{c}</th>)}
                  <th className="p-2 border-b border-slate-800 text-right">Jml Duplikat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono text-slate-300">
                {checkResult.sampleRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    {selectedCols.map(c => (
                      <td key={c} className="p-2 truncate max-w-[150px]" title={row[c]}>
                        {row[c] !== null ? String(row[c]) : 'NULL'}
                      </td>
                    ))}
                    <td className="p-2 text-right font-bold text-amber-400">{row.duplicate_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warning Alert */}
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 mt-1">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="text-xs text-red-200/90 leading-relaxed">
            <strong className="text-red-400 block mb-0.5">Perhatian: Tindakan ini permanen!</strong>
            Sebanyak {checkResult.rowsToDelete} baris data sampah di Master Database akan dihapus. Hal ini penting agar sinkronisasi ke POD bisa berhasil 100%.
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-emerald-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Eraser size={16} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Pembersihan Duplikat Cerdas</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                  Master DB
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Target Tabel: <strong className="text-white font-mono">{tableName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isChecking || isCleaning}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step 1: Configuration */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Database size={15} className="text-cyan-400 shrink-0" />
            <span>
              Tabel <strong>public.{tableName}</strong> memiliki <strong>{masterInfo?.rowCount || 0}</strong> baris data di Master.
            </span>
          </div>

          {!hasChecked && (
            <div className="flex items-start gap-2.5 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 text-blue-200">
              <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <p>
                Pilih kolom yang seharusnya bernilai <strong>UNIK</strong>. Kami akan mengecek terlebih dahulu (tanpa menghapus) data ganda berdasarkan kombinasi kolom ini.
              </p>
            </div>
          )}

          <div className="mt-1">
            <label className="text-[11px] font-bold text-slate-400 mb-2 block">
              Pilih Kolom Patokan Unik:
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
              {columns && columns.length > 0 ? (
                columns.map((col) => {
                  const isSelected = selectedCols.includes(col.columnName);
                  return (
                    <button
                      key={col.columnName}
                      onClick={() => toggleColumn(col.columnName)}
                      disabled={hasChecked}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono border transition-all ${hasChecked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                        } ${isSelected
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-inner'
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                        }`}
                    >
                      {col.columnName}
                    </button>
                  );
                })
              ) : (
                <div className="text-slate-500 italic px-2 py-1 text-[11px]">Memuat struktur kolom...</div>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Preview Results */}
        {hasChecked && renderCheckPreview()}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-2 pt-4 border-t border-slate-800">
          {hasChecked && !checkResult?.hasDuplicates ? (
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
            >
              Tutup
            </button>
          ) : (
            <>
              <button
                onClick={hasChecked ? () => setHasChecked(false) : onClose}
                disabled={isChecking || isCleaning}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {hasChecked ? 'Cek Ulang' : 'Batal'}
              </button>

              {!hasChecked ? (
                <button
                  onClick={handleCheck}
                  disabled={isChecking || selectedCols.length === 0}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isChecking ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Mengecek...</span>
                    </>
                  ) : (
                    <>
                      <Search size={14} />
                      <span>Cek Data Duplikat</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleClean}
                  disabled={isCleaning}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isCleaning ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Membersihkan...</span>
                    </>
                  ) : (
                    <>
                      <Eraser size={14} />
                      <span>Bersihkan Sekarang</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
