import React, { useState, useRef, useEffect } from 'react';
import { Sliders, X, Check } from 'lucide-react';
import { WINDOW_PRESETS, formatWindowLabel } from './liveStreamConfig';

export default function LiveWindowSelector({ windowSeconds, onWindowChange }) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState(45);
  const [customUnit, setCustomUnit] = useState('m'); // 's' | 'm' | 'h'
  const customPopoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customPopoverRef.current && !customPopoverRef.current.contains(e.target)) {
        setIsCustomOpen(false);
      }
    };
    if (isCustomOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCustomOpen]);

  const isCustomActive = !WINDOW_PRESETS.some((p) => p.sec === windowSeconds);

  const handleApplyCustom = () => {
    const rawVal = parseFloat(customVal);
    if (isNaN(rawVal) || rawVal <= 0) return;
    let multiplier = 1;
    if (customUnit === 'm') multiplier = 60;
    if (customUnit === 'h') multiplier = 3600;
    const totalSec = Math.max(10, Math.min(21600, Math.round(rawVal * multiplier)));
    onWindowChange(totalSec);
    setIsCustomOpen(false);
  };

  return (
    <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs gap-0.5 overflow-x-auto max-w-full">
      <span className="px-2 text-[10px] text-slate-400 font-bold uppercase hidden sm:inline flex items-center gap-2 shrink-0">
        Jendela:
      </span>
      {WINDOW_PRESETS.map((w) => (
        <button
          key={w.sec}
          onClick={() => onWindowChange(w.sec)}
          title={`Tampilkan ${w.desc}`}
          className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
            windowSeconds === w.sec
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          {w.label}
        </button>
      ))}

      {/* Custom Window Popover Toggle */}
      <div className="relative shrink-0" ref={customPopoverRef}>
        <button
          onClick={() => setIsCustomOpen(!isCustomOpen)}
          className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
            isCustomActive || isCustomOpen
              ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
          title="Atur durasi jendela waktu kustom"
        >
          <Sliders size={11} />
          <span>{isCustomActive ? `${formatWindowLabel(windowSeconds)}` : '+ Kustom'}</span>
        </button>

        {isCustomOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 p-3.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl z-50 space-y-3 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders size={13} className="text-indigo-400" />
                Jendela Waktu Kustom
              </span>
              <button
                type="button"
                onClick={() => setIsCustomOpen(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                Rentang Durasi (Maks. 6 Jam):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max={customUnit === 'h' ? 6 : customUnit === 'm' ? 360 : 21600}
                  value={customVal}
                  onChange={(e) => setCustomVal(e.target.value)}
                  className="w-24 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                  placeholder="45"
                />
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                  {[
                    { id: 's', label: 'Detik' },
                    { id: 'm', label: 'Menit' },
                    { id: 'h', label: 'Jam' }
                  ].map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setCustomUnit(u.id)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                        customUnit === u.id
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 font-semibold">Pilihan Cepat:</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { val: 10, unit: 'm', label: '10m' },
                  { val: 20, unit: 'm', label: '20m' },
                  { val: 45, unit: 'm', label: '45m' },
                  { val: 4, unit: 'h', label: '4 Jam' },
                  { val: 6, unit: 'h', label: '6 Jam' }
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      setCustomVal(s.val);
                      setCustomUnit(s.unit);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-[10px] font-mono text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCustomOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all cursor-pointer flex items-center gap-1"
              >
                <Check size={12} />
                Terapkan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
