import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertTriangle, CheckCircle, Music, Sliders, Code, Plus, X, Layers, ArrowRight, Eye, CheckSquare, Square, History, Cpu, ShieldAlert, Monitor, Sparkles, Palette, Search, ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { fetchPodConfigApi, updatePodConfigApi } from '../../api/vpsApi';

/**
 * Universal helper to update a deeply nested path in an object immutably
 */
function updateNestedPath(obj, pathArray, value) {
  if (pathArray.length === 0) return value;
  const [head, ...tail] = pathArray;
  const isArray = Array.isArray(obj);
  const copy = isArray ? [...obj] : { ...(obj || {}) };
  copy[head] = updateNestedPath(copy[head], tail, value);
  return copy;
}

/**
 * Universal helper to getValue from a path
 */
function getNestedPath(obj, pathArray) {
  let current = obj;
  for (const key of pathArray) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
}

export default function PodConfigTab({ serverId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [config, setConfig] = useState(null);
  const [originalConfig, setOriginalConfig] = useState(null); // Values set previously on server
  const [availableSounds, setAvailableSounds] = useState([]);
  
  const [activeRootKey, setActiveRootKey] = useState('');
  const [rawJsonStr, setRawJsonStr] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundSearchQuery, setSoundSearchQuery] = useState('');
  
  // Color Picker states
  const [newColorInput, setNewColorInput] = useState('');
  const [colorPickerVal, setColorPickerVal] = useState('#ffa205');
  const [useOxFormat, setUseOxFormat] = useState(true);

  // Modal confirmation
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (serverId) {
      loadPodConfig();
    }
  }, [serverId]);

  const loadPodConfig = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const data = await fetchPodConfigApi(serverId);
      const loadedConfig = data.config || {};
      setConfig(loadedConfig);
      setOriginalConfig(JSON.parse(JSON.stringify(loadedConfig))); // Save exact snapshot of server values
      setAvailableSounds(data.availableSounds || []);
      setRawJsonStr(JSON.stringify(loadedConfig, null, 2));

      // Select first root key by default
      const rootKeys = Object.keys(loadedConfig);
      if (rootKeys.length > 0) {
        setActiveRootKey(rootKeys[0]);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat konfigurasi Pod.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfirmModal = () => {
    setErrorMsg('');
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await updatePodConfigApi(serverId, config);
      setSuccessMsg(res.message || 'Konfigurasi Pod berhasil diperbarui!');
      setOriginalConfig(JSON.parse(JSON.stringify(config))); // Update original reference
      setRawJsonStr(JSON.stringify(config, null, 2));
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyimpan konfigurasi Pod.');
    } finally {
      setSaving(false);
    }
  };

  const handleRawJsonSave = () => {
    try {
      const parsed = JSON.parse(rawJsonStr);
      setConfig(parsed);
      setShowConfirmModal(true);
    } catch (err) {
      setErrorMsg(`Format Raw JSON tidak valid: ${err.message}`);
    }
  };

  // Helper to update state and raw string
  const updateConfigVal = (pathArray, newValue) => {
    const updated = updateNestedPath(config, pathArray, newValue);
    setConfig(updated);
    setRawJsonStr(JSON.stringify(updated, null, 2));
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="skeleton-box w-48 h-8 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="skeleton-box h-40 rounded-2xl"></div>
          <div className="skeleton-box h-40 rounded-2xl md:col-span-2"></div>
        </div>
      </div>
    );
  }

  if (errorMsg && !config) {
    return (
      <div className="bg-red-500/15 border border-red-500/30 text-red-300 p-5 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-base font-bold">
          <AlertTriangle className="text-red-400" size={22} />
          <span>Gagal Memuat Konfigurasi Pod</span>
        </div>
        <p className="text-xs text-slate-400">{errorMsg}</p>
        <button
          onClick={loadPodConfig}
          className="w-fit px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer mt-1"
        >
          <RefreshCw size={14} /> Coba Lagi
        </button>
      </div>
    );
  }

  const rootKeys = Object.keys(config || {});
  const filteredSounds = availableSounds.filter(s => {
    const sSession = String(s.session || '').toLowerCase().trim();
    const sDisplay = String(s.display || '').toLowerCase().trim();
    if (sSession === 'any' || sDisplay === 'any') return false;

    return (
      s.idString.includes(soundSearchQuery.trim()) ||
      s.display.toLowerCase().includes(soundSearchQuery.toLowerCase()) ||
      s.session.toLowerCase().includes(soundSearchQuery.toLowerCase())
    );
  });

  // Calculate deep differences for diff modal
  const getModifiedPaths = () => {
    const diffs = [];
    const traverse = (orig, curr, pathStr) => {
      if (JSON.stringify(orig) === JSON.stringify(curr)) return;
      if (typeof curr !== 'object' || curr === null || typeof orig !== 'object' || orig === null) {
        diffs.push({ path: pathStr, orig, curr });
        return;
      }
      const allKeys = new Set([...Object.keys(orig || {}), ...Object.keys(curr || {})]);
      allKeys.forEach(k => {
        traverse(orig?.[k], curr?.[k], pathStr ? `${pathStr}.${k}` : k);
      });
    };
    traverse(originalConfig, config, '');
    return diffs;
  };

  const modifiedPaths = getModifiedPaths();

  /**
   * RECURSIVE DYNAMIC FORM NODE RENDERER
   */
  const renderDynamicNode = (data, pathArray = [], level = 0) => {
    if (data === null || data === undefined) {
      return <span className="text-xs text-slate-500 italic">null</span>;
    }

    const currentPathStr = pathArray.join('.');
    const lastKey = pathArray[pathArray.length - 1] || '';
    const origVal = getNestedPath(originalConfig, pathArray);
    const isModified = JSON.stringify(data) !== JSON.stringify(origVal);

    // Smart Enhancers Detection
    const isSoundscapesKey = lastKey.toLowerCase() === 'soundscapes' && Array.isArray(data);
    const isSoundscapePrimaryKey = lastKey.toLowerCase() === 'soundscape';
    const isRgbValueKey = lastKey.toLowerCase() === 'rgbvalue' && Array.isArray(data);

    // 1. SMART ENHANCER: soundscapes (Multi-Select Sound Metadata Picker)
    if (isSoundscapesKey) {
      const currentList = data.map(v => String(v));
      return (
        <div className="glass-card p-5 md:p-6 rounded-2xl border border-slate-800 bg-slate-950/70 flex flex-col gap-4 col-span-full shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                <Music size={18} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-100">{lastKey}</span>
                  {isModified && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Nilai diubah"></span>}
                </div>
                <span className="text-[11px] text-slate-400">Daftar Soundscape Aktif Sesi ini (Multi-Select)</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-lg text-[10px] font-mono font-bold">
              {currentList.length} SOUNDSCAPE TERPILIH
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT COLUMN: Selected Badges */}
            <div className="lg:col-span-5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                <span>Soundscape Terpilih ({currentList.length}):</span>
                {currentList.length > 0 && (
                  <button
                    onClick={() => updateConfigVal(pathArray, [])}
                    className="text-[11px] text-red-400 hover:text-red-300 cursor-pointer underline font-medium"
                  >
                    Hapus Semua
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 min-h-[120px] p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 content-start">
                {currentList.length > 0 ? (
                  currentList.map(idStr => {
                    const soundObj = availableSounds.find(s => s.idString === idStr);
                    return (
                      <div
                        key={idStr}
                        className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 rounded-xl text-xs font-mono font-medium animate-fadeIn shadow-sm"
                      >
                        <span className="font-bold text-cyan-300">"{idStr}"</span>
                        {soundObj && <span className="text-[10px] text-slate-300 font-sans">({soundObj.display})</span>}
                        <button
                          onClick={() => {
                            const updated = currentList.filter(id => id !== idStr);
                            updateConfigVal(pathArray, updated);
                          }}
                          className="text-cyan-300 hover:text-red-400 transition cursor-pointer ml-1"
                          title="Hapus soundscape ini"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-center p-4">
                    <Music className="text-slate-600 mb-1" size={24} />
                    <span className="text-xs text-slate-500 italic">Belum ada soundscape yang dipilih untuk sesi ini.</span>
                    <span className="text-[11px] text-slate-600 mt-0.5">Pilih dari panel di sebelah kanan.</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Search & Metadata Picker List */}
            <div className="lg:col-span-7 flex flex-col gap-2.5">
              <span className="text-xs text-slate-300 font-medium">Pilih Sound dari /home/pod/sounds/metadata.json:</span>
              <input
                type="text"
                placeholder="Cari ID, Sesi, atau Judul Sound..."
                value={soundSearchQuery}
                onChange={(e) => setSoundSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
              />
              <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-1 border border-slate-800/80 rounded-xl bg-slate-900/60 p-2">
                {filteredSounds.length > 0 ? (
                  filteredSounds.map(snd => {
                    const isSelected = currentList.includes(snd.idString);
                    return (
                      <div
                        key={snd.idString}
                        onClick={() => {
                          let updated;
                          if (isSelected) updated = currentList.filter(id => id !== snd.idString);
                          else updated = [...currentList, snd.idString];
                          updateConfigVal(pathArray, updated);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition ${
                          isSelected ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-semibold' : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="font-mono px-2 py-0.5 bg-slate-950 rounded-lg text-[11px] text-cyan-400 shrink-0 border border-slate-800">
                            ID: {snd.idString}
                          </span>
                          <span className="truncate">{snd.display}</span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md font-mono">{snd.session || 'Sound'}</span>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-slate-700'}`}>
                            {isSelected ? <CheckSquare size={12} /> : <Square size={12} className="text-slate-600" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">Tidak ada sound metadata yang cocok.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 2. SMART ENHANCER: soundScape (Single Select Primary Sound ID)
    if (isSoundscapePrimaryKey && (typeof data === 'number' || typeof data === 'string')) {
      const currentIntVal = parseInt(data, 10) || 0;
      return (
        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/60 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Music className="text-amber-400" size={18} />
              <span className="text-sm font-bold text-slate-200">{lastKey}</span>
              {isModified && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>}
            </div>
            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md text-[10px] font-mono font-bold">
              PRIMARY SOUND ID
            </span>
          </div>

          <select
            value={currentIntVal}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10) || 0;
              updateConfigVal(pathArray, typeof data === 'string' ? String(val) : val);
            }}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500/50"
          >
            <option value="0">0 - Default / Not Set</option>
            {availableSounds.filter(s => String(s.session || '').toLowerCase().trim() !== 'any').map(snd => (
              <option key={snd.idInt} value={snd.idInt}>
                {snd.idInt} - {snd.display} ({snd.session})
              </option>
            ))}
          </select>
        </div>
      );
    }

    // 3. SMART ENHANCER: rgbValue (Visual Color Picker + Text Input + Presets)
    if (isRgbValueKey) {
      const currentColors = data.map(v => String(v));
      return (
        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/60 flex flex-col gap-4 col-span-full">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Palette className="text-amber-400" size={18} />
              <span className="text-sm font-bold text-slate-200">{lastKey} (Array Warna)</span>
              {isModified && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>}
            </div>
            <span className="text-[11px] font-mono text-cyan-400">{currentColors.length} item warna</span>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[38px] p-2 bg-slate-950/80 rounded-xl border border-slate-800">
            {currentColors.length > 0 ? (
              currentColors.map((item, idx) => {
                const cleanHex = item.startsWith('0x') ? '#' + item.slice(2) : item;
                return (
                  <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-amber-300 shadow-sm animate-fadeIn">
                    <span className="w-3 h-3 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: cleanHex.startsWith('#') ? cleanHex : undefined }}></span>
                    <span>{item}</span>
                    <button
                      onClick={() => {
                        const updated = currentColors.filter((_, i) => i !== idx);
                        updateConfigVal(pathArray, updated);
                      }}
                      className="text-slate-500 hover:text-red-400 cursor-pointer ml-1"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })
            ) : (
              <span className="text-xs text-slate-500 italic p-1">Belum ada warna.</span>
            )}
          </div>

          <div className="flex flex-col gap-2.5 border-t border-slate-800/80 pt-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <Palette size={13} className="text-amber-400" />
                <span>Pilih dari Color Picker ATAU Ketik Manual:</span>
              </label>
              <button
                type="button"
                onClick={() => setUseOxFormat(!useOxFormat)}
                className="text-[10px] font-mono text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 hover:border-slate-700 cursor-pointer"
              >
                Format: {useOxFormat ? '0x...' : '#...'} (Klik ganti)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl shrink-0" title="Visual Color Picker">
                <input
                  type="color"
                  value={colorPickerVal}
                  onChange={(e) => {
                    const hex = e.target.value;
                    setColorPickerVal(hex);
                    const formatted = useOxFormat ? '0x' + hex.slice(1) : hex;
                    setNewColorInput(formatted);
                  }}
                  className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                />
              </div>

              <input
                type="text"
                placeholder="Nilai warna (misal: 0xffffff, 0xffa205, #FF5100)..."
                value={newColorInput}
                onChange={(e) => setNewColorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newColorInput.trim() && !currentColors.includes(newColorInput.trim())) {
                      updateConfigVal(pathArray, [...currentColors, newColorInput.trim()]);
                      setNewColorInput('');
                    }
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500/50"
              />

              <button
                type="button"
                onClick={() => {
                  if (newColorInput.trim() && !currentColors.includes(newColorInput.trim())) {
                    updateConfigVal(pathArray, [...currentColors, newColorInput.trim()]);
                    setNewColorInput('');
                  }
                }}
                className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer transition shadow-sm"
              >
                <Plus size={14} /> Tambah Warna
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400 mt-1">
              <span>Preset Cepat:</span>
              {['0xffffff', '0xffa205', '0xFF5100', '0x73227C', '0x004987', '0x008278', '0x116031'].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    if (!currentColors.includes(preset)) {
                      updateConfigVal(pathArray, [...currentColors, preset]);
                    }
                  }}
                  className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800 rounded font-mono cursor-pointer transition text-[10px]"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 4. BOOLEAN NODE (Compact & Space-Efficient Badge)
    if (typeof data === 'boolean') {
      return (
        <label className="inline-flex items-center justify-between px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition gap-2 text-xs w-fit min-w-[120px] shadow-sm">
          <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
            {lastKey}
            {isModified && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>}
          </span>
          <input
            type="checkbox"
            checked={data}
            onChange={(e) => updateConfigVal(pathArray, e.target.checked)}
            className="w-4 h-4 rounded accent-cyan-500 cursor-pointer shrink-0"
          />
        </label>
      );
    }

    // 5. NUMBER NODE
    if (typeof data === 'number') {
      const isSliderRange = data >= 0 && data <= 100;
      return (
        <div className="flex flex-col gap-1.5 p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              {lastKey}
              {isModified && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
            </span>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-500 text-[11px]">Prev: {origVal ?? '0'}</span>
              <span className="text-cyan-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{data}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isSliderRange && (
              <input
                type="range"
                min="0"
                max="100"
                value={data}
                onChange={(e) => updateConfigVal(pathArray, parseInt(e.target.value, 10) || 0)}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            )}
            <input
              type="number"
              value={data}
              onChange={(e) => updateConfigVal(pathArray, parseInt(e.target.value, 10) || 0)}
              className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-center font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>
      );
    }

    // 6. STRING NODE
    if (typeof data === 'string') {
      return (
        <div className="flex flex-col gap-1.5 p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              {lastKey}
              {isModified && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">string</span>
          </div>
          <input
            type="text"
            value={data}
            onChange={(e) => updateConfigVal(pathArray, e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      );
    }

    // 7. GENERIC ARRAY NODE (Non-special arrays)
    if (Array.isArray(data)) {
      return (
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col gap-3 col-span-full">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-200">{lastKey} (Array)</span>
            <span className="text-[11px] font-mono text-cyan-400">{data.length} item</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-cyan-400 font-mono">Item #{idx + 1}</span>
                {renderDynamicNode(item, [...pathArray, idx], level + 1)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 8. OBJECT NODE (Recursive Nested Object)
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      const isRoot = level === 0;

      // Filter search query
      const filteredKeys = keys.filter(k => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const fullPath = [...pathArray, k].join('.').toLowerCase();
        const jsonStr = JSON.stringify(data[k]).toLowerCase();
        return fullPath.includes(q) || jsonStr.includes(q);
      });

      if (isRoot) {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredKeys.length > 0 ? (
              filteredKeys.map(k => (
                <div key={k} className="flex flex-col gap-2">
                  {renderDynamicNode(data[k], [...pathArray, k], level + 1)}
                </div>
              ))
            ) : (
              <div className="col-span-full p-6 text-center text-xs text-slate-500 italic bg-slate-900/40 rounded-2xl border border-slate-800">
                Tidak ada parameter yang cocok dengan pencarian "{searchQuery}".
              </div>
            )}
          </div>
        );
      }

      // Nested child object: Separate boolean fields to group them inline compactly
      const booleanKeys = filteredKeys.filter(k => typeof data[k] === 'boolean');
      const nonBooleanKeys = filteredKeys.filter(k => typeof data[k] !== 'boolean');

      return (
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800/80 flex flex-col gap-3 col-span-full">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-cyan-300 font-mono">{lastKey}</span>
            <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">
              {keys.length} properti
            </span>
          </div>

          {/* Compact Inline Row for Boolean Checkboxes (e.g. strobe, disabled) */}
          {booleanKeys.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
              {booleanKeys.map(k => (
                <React.Fragment key={k}>
                  {renderDynamicNode(data[k], [...pathArray, k], level + 1)}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Grid for Numbers, Objects, Arrays, and Strings */}
          {nonBooleanKeys.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {nonBooleanKeys.map(k => (
                <React.Fragment key={k}>
                  {renderDynamicNode(data[k], [...pathArray, k], level + 1)}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col gap-6 relative">
      {/* CONFIRMATION & PREVIOUS VALUE DIFF MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-950 border border-cyan-500/40 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/15 border border-cyan-500/30 rounded-xl text-cyan-400">
                  <Eye size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Konfirmasi Perubahan Konfigurasi Pod</h3>
                  <p className="text-xs text-slate-400">Tinjau perbandingan antara nilai terpasang sebelumnya dengan perubahan baru ({modifiedPaths.length} perubahan).</p>
                </div>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Path Comparison List */}
            <div className="max-h-[55vh] overflow-y-auto flex flex-col gap-3 pr-1">
              {modifiedPaths.length > 0 ? (
                modifiedPaths.map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-900/90 rounded-xl border border-cyan-500/30 flex flex-col gap-2 text-xs">
                    <span className="font-mono font-bold text-cyan-300">{item.path}</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <History size={11} /> Nilai Sebelumnya (Server):
                        </span>
                        <code className="text-slate-300 font-mono text-[11px] truncate">
                          {JSON.stringify(item.orig)}
                        </code>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                          <ArrowRight size={11} /> Perubahan Baru:
                        </span>
                        <code className="text-cyan-300 font-mono text-[11px] truncate">
                          {JSON.stringify(item.curr)}
                        </code>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 italic">Tidak ada perubahan yang terdeteksi.</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer border border-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={saving}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-600/30"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Konfirmasi & Simpan Ke Server
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <CheckCircle className="text-emerald-400 shrink-0" size={18} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-300 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <AlertTriangle className="text-red-400 shrink-0" size={18} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* TOP HEADER & SEARCH BAR */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        {/* Dynamic Root Sub-Tabs Navigation Bar */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
          {rootKeys.map((rKey, idx) => (
            <button
              key={rKey}
              onClick={() => setActiveRootKey(rKey)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeRootKey === rKey
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span className="font-mono text-[11px] text-cyan-400">{idx + 1}.</span> {rKey}
            </button>
          ))}
          <button
            onClick={() => setActiveRootKey('raw_json')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeRootKey === 'raw_json'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Code size={14} /> Raw JSON
          </button>
        </div>

        {/* Global Key Search & Save Actions */}
        <div className="flex items-center gap-2">
          {activeRootKey !== 'raw_json' && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Cari kunci/nilai JSON..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 w-44 md:w-56"
              />
            </div>
          )}

          <button
            onClick={loadPodConfig}
            disabled={saving}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} /> Reset
          </button>

          {activeRootKey === 'raw_json' ? (
            <button
              onClick={handleRawJsonSave}
              disabled={saving}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-cyan-600/30 disabled:opacity-50"
            >
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              Tinjau & Simpan Raw JSON
            </button>
          ) : (
            <button
              onClick={handleOpenConfirmModal}
              disabled={saving}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-cyan-600/30 disabled:opacity-50"
            >
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              Simpan Konfigurasi
            </button>
          )}
        </div>
      </div>

      {/* DYNAMIC FORM VIEW */}
      {activeRootKey !== 'raw_json' && config?.[activeRootKey] !== undefined && (
        <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/60 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="text-cyan-400" size={20} />
              <span className="text-base font-bold text-slate-200">{activeRootKey}</span>
            </div>
            <span className="text-xs font-mono text-slate-400">Dynamic Universal View</span>
          </div>

          {renderDynamicNode(config[activeRootKey], [activeRootKey], 0)}
        </div>
      )}

      {/* RAW JSON VIEW */}
      {activeRootKey === 'raw_json' && (
        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="text-amber-400" size={18} />
              <span className="text-sm font-bold text-slate-200">Raw JSON Config Editor</span>
            </div>
            <span className="text-xs text-slate-400">/home/pod/pod_config.json</span>
          </div>

          <textarea
            value={rawJsonStr}
            onChange={(e) => setRawJsonStr(e.target.value)}
            rows={22}
            className="w-full font-mono text-xs bg-slate-900 border border-slate-800 rounded-xl p-4 text-emerald-300 focus:outline-none focus:border-cyan-500/50 leading-relaxed"
            placeholder="Edit JSON configuration directly..."
          />
        </div>
      )}
    </div>
  );
}
