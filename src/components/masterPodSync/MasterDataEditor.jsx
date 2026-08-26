import React, { useState, useEffect } from 'react';
import { Edit2, Plus, RefreshCw, Send, Save, X, Database } from 'lucide-react';
import { fetchMasterTableDataApi, createMasterRowApi, updateMasterRowApi } from '../../api/masterPodSyncApi';

// Modal for Create/Edit
function RowEditorModal({ isOpen, onClose, onSave, columns, initialData, isEdit }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (colName, val) => {
    setFormData(prev => ({ ...prev, [colName]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {isEdit ? <Edit2 className="text-blue-400" size={20} /> : <Plus className="text-emerald-400" size={20} />}
            {isEdit ? 'Edit Data Master' : 'Tambah Data Master'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="row-form" onSubmit={handleSubmit} className="space-y-4">
            {columns.map(col => (
              <div key={col.name} className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300 flex justify-between">
                  <span>
                    {col.name} {col.isPk && <span className="text-amber-500">(Primary Key)</span>}
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">{col.type}</span>
                </label>
                <input
                  type={['integer', 'smallint', 'bigint', 'numeric'].includes(col.type) ? 'number' : 'text'}
                  value={formData[col.name] !== undefined && formData[col.name] !== null ? formData[col.name] : ''}
                  onChange={(e) => handleChange(col.name, e.target.value)}
                  disabled={isEdit && col.isPk} // Cannot edit PK
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-900"
                  placeholder={col.nullable ? 'Boleh kosong (NULL)' : 'Wajib diisi'}
                />
              </div>
            ))}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-colors">
            Batal
          </button>
          <button type="submit" form="row-form" className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center gap-2">
            <Save size={16} /> Simpan
          </button>
        </div>
      </div>
    </div>
  );
}


export default function MasterDataEditor({ masterId, tableName, onSyncRowRequest }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [modalState, setModalState] = useState({ isOpen: false, isEdit: false, rowData: null });

  const loadData = async () => {
    if (!masterId || !tableName) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchMasterTableDataApi(masterId, tableName);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [masterId, tableName]);

  const handleSave = async (formData) => {
    try {
      if (modalState.isEdit) {
        await updateMasterRowApi(masterId, tableName, {
          pkColumn: data.pkColumn,
          pkValue: formData[data.pkColumn],
          data: formData
        });
      } else {
        await createMasterRowApi(masterId, tableName, formData);
      }
      setModalState({ isOpen: false, isEdit: false, rowData: null });
      loadData(); // Refresh table
    } catch (err) {
      alert(`Gagal menyimpan: ${err.message}`);
    }
  };

  if (!tableName) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 border border-dashed border-slate-700 rounded-3xl">
        <Database size={48} className="mb-4 opacity-20" />
        <p>Pilih tabel di menu samping untuk mengelola data.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
      
      {/* Header Panel */}
      <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database size={18} className="text-cyan-400" />
            {tableName}
          </h2>
          {data && <p className="text-xs text-slate-500 mt-1">Total {data.totalCount} baris (Dibatasi 1000)</p>}
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={loadData} 
            disabled={isLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          
          <button 
            onClick={() => setModalState({ isOpen: true, isEdit: false, rowData: {} })}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
          >
            <Plus size={16} /> Tambah Data
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 m-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-bold">
          Error: {error}
        </div>
      )}

      {/* Table Container */}
      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        {isLoading && !data ? (
          <div className="flex justify-center items-center h-40 text-slate-500">Memuat data...</div>
        ) : data && data.rows.length === 0 ? (
          <div className="flex justify-center items-center h-40 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
            Tabel kosong.
          </div>
        ) : data && (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 bg-slate-900 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-400 border-b border-slate-800 bg-slate-950/50">Aksi</th>
                {data.columns.map(col => (
                  <th key={col.name} className="px-4 py-3 font-bold text-slate-400 border-b border-slate-800 bg-slate-950/50">
                    <div className="flex flex-col">
                      <span className="text-slate-300">{col.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono font-normal">{col.type}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 flex items-center gap-2">
                    <button 
                      onClick={() => setModalState({ isOpen: true, isEdit: true, rowData: row })}
                      className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/20"
                      title="Edit Baris"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => onSyncRowRequest(tableName, data.pkColumn, row[data.pkColumn])}
                      className="p-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors border border-purple-500/20"
                      title="Sync (Push) baris ini ke POD"
                    >
                      <Send size={14} />
                    </button>
                  </td>
                  {data.columns.map(col => {
                    let val = row[col.name];
                    if (val === null) val = <span className="text-slate-600 italic">NULL</span>;
                    else if (typeof val === 'boolean') val = val ? <span className="text-emerald-400">TRUE</span> : <span className="text-red-400">FALSE</span>;
                    else if (typeof val === 'object') val = JSON.stringify(val);
                    return (
                      <td key={col.name} className="px-4 py-3 text-slate-300 max-w-xs truncate" title={String(row[col.name])}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <RowEditorModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, isEdit: false, rowData: null })}
        onSave={handleSave}
        columns={data ? data.columns : []}
        initialData={modalState.rowData}
        isEdit={modalState.isEdit}
      />
    </div>
  );
}
