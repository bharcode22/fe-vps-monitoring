import React from 'react';
import { Wind, Zap, Sun, Plus, Trash2 } from 'lucide-react';
import olfactoryList from '../podSessions/olfactory.json';

export default function VisualBuilderEvents({
  sessionData,
  onUpdateSessionData
}) {
  const data = sessionData || {};
  const olfEvents = data.olfactoryEvents || [];
  const pemfEvents = data.pemfEvents || [];
  const nirEvents = data.nirEvents || [];

  // 1. Olfactory Events
  const handleAddOlf = () => {
    const defaultScent = olfactoryList?.[0]?.scent || 'Lavender';
    const updated = [...olfEvents, ['00:10', defaultScent, '3000']];
    onUpdateSessionData({ ...data, olfactoryEvents: updated });
  };

  const handleUpdateOlf = (idx, fieldIdx, value) => {
    const copy = [...olfEvents];
    copy[idx] = [...copy[idx]];
    copy[idx][fieldIdx] = value;
    onUpdateSessionData({ ...data, olfactoryEvents: copy });
  };

  const handleRemoveOlf = (idx) => {
    const updated = olfEvents.filter((_, i) => i !== idx);
    onUpdateSessionData({ ...data, olfactoryEvents: updated });
  };

  // 2. PEMF Events
  const handleAddPemf = () => {
    const updated = [...pemfEvents, ['00:05', '1']];
    onUpdateSessionData({ ...data, pemfEvents: updated });
  };

  const handleUpdatePemf = (idx, fieldIdx, value) => {
    const copy = [...pemfEvents];
    copy[idx] = [...copy[idx]];
    copy[idx][fieldIdx] = value;
    onUpdateSessionData({ ...data, pemfEvents: copy });
  };

  const handleRemovePemf = (idx) => {
    const updated = pemfEvents.filter((_, i) => i !== idx);
    onUpdateSessionData({ ...data, pemfEvents: updated });
  };

  // 3. NIR Events
  const handleAddNir = () => {
    const updated = [...nirEvents, ['00:05', '1']];
    onUpdateSessionData({ ...data, nirEvents: updated });
  };

  const handleUpdateNir = (idx, fieldIdx, value) => {
    const copy = [...nirEvents];
    copy[idx] = [...copy[idx]];
    copy[idx][fieldIdx] = value;
    onUpdateSessionData({ ...data, nirEvents: copy });
  };

  const handleRemoveNir = (idx) => {
    const updated = nirEvents.filter((_, i) => i !== idx);
    onUpdateSessionData({ ...data, nirEvents: updated });
  };

  return (
    <div className="space-y-3">
      {/* 1. Olfactory Events Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wind size={15} className="text-purple-400" />
            <span className="font-bold text-xs text-purple-200">
              Olfactory Burst Events ({olfEvents.length})
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddOlf}
            className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[11px] font-bold transition flex items-center gap-1"
          >
            <Plus size={12} />
            Tambah Scent
          </button>
        </div>

        {olfEvents.length === 0 ? (
          <div className="text-[11px] text-slate-500 italic py-2 text-center">
            Belum ada jadwal semprotan aroma.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {olfEvents.map((ev, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
              >
                <span className="text-[10px] font-mono text-slate-500 w-5">#{idx + 1}</span>
                <input
                  type="text"
                  value={ev[0]}
                  onChange={(e) => handleUpdateOlf(idx, 0, e.target.value)}
                  placeholder="00:10"
                  title="Waktu mulai (MM:SS)"
                  className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                />
                <input
                  type="text"
                  list="generator-scent-presets"
                  value={ev[1]}
                  onChange={(e) => handleUpdateOlf(idx, 1, e.target.value)}
                  placeholder="Lavender"
                  title="Nama aroma / Scent"
                  className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <input
                  type="text"
                  value={ev[2] || '3000'}
                  onChange={(e) => handleUpdateOlf(idx, 2, e.target.value)}
                  placeholder="3000"
                  title="Durasi semprotan (ms)"
                  className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveOlf(idx)}
                  className="p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. PEMF Events Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-sky-400" />
            <span className="font-bold text-xs text-sky-200">
              PEMF Modulation Events ({pemfEvents.length})
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddPemf}
            className="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-[11px] font-bold transition flex items-center gap-1"
          >
            <Plus size={12} />
            Tambah PEMF
          </button>
        </div>

        {pemfEvents.length === 0 ? (
          <div className="text-[11px] text-slate-500 italic py-2 text-center">
            Belum ada jadwal modulasi PEMF.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {pemfEvents.map((ev, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
              >
                <span className="text-[10px] font-mono text-slate-500 w-5">#{idx + 1}</span>
                <input
                  type="text"
                  value={ev[0]}
                  onChange={(e) => handleUpdatePemf(idx, 0, e.target.value)}
                  placeholder="00:05"
                  title="Waktu mulai (MM:SS)"
                  className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                />
                <select
                  value={ev[1] || '1'}
                  onChange={(e) => handleUpdatePemf(idx, 1, e.target.value)}
                  className="flex-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="1">Mode 1: PEMF Box (Konstan)</option>
                  <option value="2">Mode 2: PEMF WimHof (Ramp / Hold / Rec)</option>
                  <option value="3">Mode 3: PEMF SendOff (Penutup)</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleRemovePemf(idx)}
                  className="p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. NIR Events Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sun size={15} className="text-rose-400" />
            <span className="font-bold text-xs text-rose-200">
              NIR Light Events ({nirEvents.length})
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddNir}
            className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold transition flex items-center gap-1"
          >
            <Plus size={12} />
            Tambah NIR
          </button>
        </div>

        {nirEvents.length === 0 ? (
          <div className="text-[11px] text-slate-500 italic py-2 text-center">
            Belum ada jadwal terapi NIR.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {nirEvents.map((ev, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
              >
                <span className="text-[10px] font-mono text-slate-500 w-5">#{idx + 1}</span>
                <input
                  type="text"
                  value={ev[0]}
                  onChange={(e) => handleUpdateNir(idx, 0, e.target.value)}
                  placeholder="00:05"
                  title="Waktu mulai (MM:SS)"
                  className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                />
                <select
                  value={ev[1] || '1'}
                  onChange={(e) => handleUpdateNir(idx, 1, e.target.value)}
                  className="flex-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="1">Mode 1: NIR Box (Konstan)</option>
                  <option value="2">Mode 2: NIR WimHof (WimHof / Hold / Rec)</option>
                  <option value="3">Mode 3: NIR SendOff (Penutup)</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleRemoveNir(idx)}
                  className="p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Datalist for preset scents */}
      <datalist id="generator-scent-presets">
        {(olfactoryList || []).map((o) => (
          <option key={o.id} value={o.scent} />
        ))}
        <option value="Minyak Kayu Putih" />
        <option value="Lemon Grass" />
        <option value="Peppermint" />
      </datalist>
    </div>
  );
}
