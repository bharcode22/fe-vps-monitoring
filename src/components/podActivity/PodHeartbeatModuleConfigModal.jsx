import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  AlertCircle,
  FileJson,
  LayoutGrid,
  Save
} from 'lucide-react';
import {
  fetchHeartbeatModulesApi,
  saveHeartbeatModulesApi,
  resetHeartbeatModulesApi
} from '../../api/podActivityApi';
import { setStoredHbModules } from '../../utils/heartbeatModules';

export default function PodHeartbeatModuleConfigModal({
  isOpen,
  onClose,
  currentModules = [],
  onSaveSuccess
}) {
  const [editorMode, setEditorMode] = useState('FORM'); // 'FORM' | 'JSON'
  const [modulesList, setModulesList] = useState([]);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Initialize or re-sync when modal opens
  useEffect(() => {
    if (isOpen) {
      loadInitialConfig();
    }
  }, [isOpen]);

  const loadInitialConfig = async () => {
    setIsLoading(true);
    setJsonError(null);
    try {
      const data = await fetchHeartbeatModulesApi();
      const list = Array.isArray(data) && data.length > 0 ? data : currentModules;
      setModulesList(list);
      setJsonText(JSON.stringify(list, null, 2));
    } catch (err) {
      console.warn('Gagal memuat dari backend, menggunakan state saat ini:', err.message);
      setModulesList(currentModules);
      setJsonText(JSON.stringify(currentModules, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  // Sync JSON text when switching from Form to JSON mode
  const handleSwitchToJSON = () => {
    setJsonText(JSON.stringify(modulesList, null, 2));
    setJsonError(null);
    setEditorMode('JSON');
  };

  // Sync Form when switching from JSON to Form mode
  const handleSwitchToForm = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        setJsonError('Format JSON harus berupa Array list [...]');
        return;
      }
      setModulesList(parsed);
      setJsonError(null);
      setEditorMode('FORM');
    } catch (err) {
      setJsonError(`JSON tidak valid: ${err.message}`);
    }
  };

  // Add new module row in Form mode
  const handleAddNewModule = () => {
    const nextId = modulesList.reduce((max, m) => Math.max(max, Number(m.id) || 500), 500) + 1;
    const newMod = {
      id: nextId,
      name: `Module ${nextId}`,
      topic: `mod_server/${nextId}/data`,
      defaultPort: 'ttyUSB0',
      description: ''
    };
    const updated = [...modulesList, newMod];
    setModulesList(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  // Update specific module field in Form mode
  const handleUpdateModule = (index, field, value) => {
    const updated = [...modulesList];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-update topic when ID changes if standard format
    if (field === 'id') {
      const numVal = Number(value);
      if (updated[index].topic?.startsWith('mod_server/')) {
        updated[index].topic = `mod_server/${numVal}/data`;
      }
    }

    setModulesList(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  // Delete module row in Form mode
  const handleDeleteModule = (index) => {
    if (modulesList.length <= 1) {
      alert('Minimal harus ada 1 modul konfigurasi.');
      return;
    }
    const updated = modulesList.filter((_, i) => i !== index);
    setModulesList(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  // Save changes to backend JSON file
  const handleSaveConfig = async () => {
    setIsSaving(true);
    setJsonError(null);

    let payload = [];
    if (editorMode === 'JSON') {
      try {
        payload = JSON.parse(jsonText);
        if (!Array.isArray(payload) || payload.length === 0) {
          throw new Error('Data harus berupa array modul dan tidak boleh kosong.');
        }
      } catch (err) {
        setJsonError(`Format JSON salah: ${err.message}`);
        setIsSaving(false);
        return;
      }
    } else {
      payload = modulesList;
    }

    try {
      const res = await saveHeartbeatModulesApi(payload);
      const savedData = res.data || payload;

      setStoredHbModules(savedData);
      setModulesList(savedData);
      setJsonText(JSON.stringify(savedData, null, 2));
      showToast('Konfigurasi modul berhasil disimpan ke file JSON backend!');

      if (onSaveSuccess) {
        onSaveSuccess(savedData);
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      alert(`Gagal menyimpan konfigurasi: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default 9 modules in backend JSON file
  const handleResetToDefault = async () => {
    if (!window.confirm('Apakah Anda yakin ingin mereset konfigurasi ke 9 modul default bawaan sistem?')) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await resetHeartbeatModulesApi();
      const defaultData = res.data || [];

      setStoredHbModules(defaultData);
      setModulesList(defaultData);
      setJsonText(JSON.stringify(defaultData, null, 2));
      showToast('Konfigurasi modul berhasil direset ke 9 modul default!');

      if (onSaveSuccess) {
        onSaveSuccess(defaultData);
      }
    } catch (err) {
      alert(`Gagal mereset modul: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
              <Settings size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-wide">
                  Kelola Konfigurasi Modul Server Heartbeat
                </h3>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  JSON Dynamic
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Disimpan langsung ke: <code className="text-cyan-300 font-mono">backend/src/data/heartbeat_modules_config.json</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Switcher & Actions Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/80 bg-slate-950/40 flex-wrap gap-2">
          {/* Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={handleSwitchToForm}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                editorMode === 'FORM'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid size={13} />
              <span>Form Visual ({modulesList.length})</span>
            </button>
            <button
              type="button"
              onClick={handleSwitchToJSON}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                editorMode === 'JSON'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileJson size={13} />
              <span>Raw JSON Code</span>
            </button>
          </div>

          {/* Add Module Button (Form Mode Only) */}
          {editorMode === 'FORM' && (
            <button
              type="button"
              onClick={handleAddNewModule}
              className="px-3.5 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-bold text-xs rounded-xl border border-cyan-500/30 transition flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Plus size={14} />
              <span>Tambah Modul Baru</span>
            </button>
          )}
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="mx-6 mt-3 p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
            <Check size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* JSON Syntax Error Alert */}
        {jsonError && (
          <div className="mx-6 mt-3 p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle size={16} />
            <span>{jsonError}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4 flex-1 max-h-[calc(92vh-210px)]">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono">Memuat file JSON konfigurasi...</span>
            </div>
          ) : editorMode === 'FORM' ? (
            /* FORM VISUAL EDITOR */
            <div className="flex flex-col gap-3">
              {modulesList.map((m, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between transition-colors group"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1 w-full">
                    {/* ID Module */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        ID Modul
                      </label>
                      <input
                        type="number"
                        value={m.id || ''}
                        onChange={(e) => handleUpdateModule(idx, 'id', Number(e.target.value))}
                        className="bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono font-bold outline-none shadow-inner"
                        placeholder="501"
                      />
                    </div>

                    {/* Name */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Nama Modul
                      </label>
                      <input
                        type="text"
                        value={m.name || ''}
                        onChange={(e) => handleUpdateModule(idx, 'name', e.target.value)}
                        className="bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none shadow-inner"
                        placeholder="Manual Control"
                      />
                    </div>

                    {/* Topic */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Topik MQTT
                      </label>
                      <input
                        type="text"
                        value={m.topic || ''}
                        onChange={(e) => handleUpdateModule(idx, 'topic', e.target.value)}
                        className="bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono outline-none shadow-inner"
                        placeholder="mod_server/501/data"
                      />
                    </div>

                    {/* Default Port */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Port Default
                      </label>
                      <input
                        type="text"
                        value={m.defaultPort || ''}
                        onChange={(e) => handleUpdateModule(idx, 'defaultPort', e.target.value.trim() || null)}
                        className="bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono outline-none shadow-inner placeholder:text-slate-600"
                        placeholder="ttyUSB0 (opsional)"
                      />
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteModule(idx)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer mt-2 sm:mt-4 shrink-0"
                    title="Hapus Modul"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* RAW JSON EDITOR */
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Edit langsung format JSON murni:</span>
                <span className="font-mono text-[11px] text-cyan-400">Array of Module Objects</span>
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  try {
                    const parsed = JSON.parse(e.target.value);
                    if (Array.isArray(parsed)) {
                      setModulesList(parsed);
                      setJsonError(null);
                    }
                  } catch (_) { }
                }}
                rows={18}
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-cyan-400 rounded-2xl p-4 font-mono text-xs text-cyan-300 outline-none resize-y shadow-inner leading-relaxed"
                placeholder="[\n  {\n    'id': 501,\n    'name': 'Manual Control',\n    'topic': 'mod_server/501/data',\n    'defaultPort': 'ttyUSB0'\n  }\n]"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl border border-transparent hover:border-amber-500/30 transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw size={13} />
            <span>Reset ke 9 Modul Default</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl border border-slate-700 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-black bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={14} />
              )}
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi JSON'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
