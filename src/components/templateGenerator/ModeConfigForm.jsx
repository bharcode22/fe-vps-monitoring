import React from 'react';
import { Sun, Zap } from 'lucide-react';

export default function ModeConfigForm({ sessionData, onUpdateSessionData }) {
  const data = sessionData || {};

  const handleFieldChange = (section, key, val) => {
    const updated = {
      ...data,
      [section]: {
        ...(data[section] || {}),
        [key]: val
      }
    };
    onUpdateSessionData(updated);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-4">
      <div className="border-b border-slate-800 pb-2">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Konfigurasi Parameter Protokol (NIR & PEMF)
        </h3>
        <p className="text-[10px] text-slate-500">
          Parameter frekuensi, durasi tahapan pernapasan/ramp, dan siklus iterasi mode terapi
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* NIR Box Mode */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300 mb-2">
            <Sun size={14} className="text-rose-400" />
            <span>Mode 1: NIR Box (Konstan)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Frekuensi (Hz)</label>
              <input
                type="number"
                value={data.nirBox?.freq || '10'}
                onChange={(e) => handleFieldChange('nirBox', 'freq', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Durasi ms (-1: Sesi)</label>
              <input
                type="text"
                value={data.nirBox?.duration || '-1'}
                onChange={(e) => handleFieldChange('nirBox', 'duration', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* PEMF Box Mode */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 mb-2">
            <Zap size={14} className="text-sky-400" />
            <span>Mode 1: PEMF Box (Konstan)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Frekuensi (Hz)</label>
              <input
                type="number"
                value={data.pemfBox?.freq || '10'}
                onChange={(e) => handleFieldChange('pemfBox', 'freq', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Durasi ms (-1: Sesi)</label>
              <input
                type="text"
                value={data.pemfBox?.duration || '-1'}
                onChange={(e) => handleFieldChange('pemfBox', 'duration', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* NIR WimHof Protocol */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300 mb-2">
            <Sun size={14} className="text-rose-400" />
            <span>Mode 2: NIR WimHof Protocol</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">WimHof Freq (Hz)</label>
              <input
                type="number"
                value={data.nirWimHof?.wimhofFreq || '40'}
                onChange={(e) => handleFieldChange('nirWimHof', 'wimhofFreq', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Hold Freq (Hz)</label>
              <input
                type="number"
                value={data.nirWimHof?.holdFreq || '1'}
                onChange={(e) => handleFieldChange('nirWimHof', 'holdFreq', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">WimHof Period (ms)</label>
              <input
                type="number"
                value={data.nirWimHof?.wimhofPeriod || '30000'}
                onChange={(e) => handleFieldChange('nirWimHof', 'wimhofPeriod', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Hold Period (ms)</label>
              <input
                type="number"
                value={data.nirWimHof?.holdPeriod || '15000'}
                onChange={(e) => handleFieldChange('nirWimHof', 'holdPeriod', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Recovery (ms)</label>
              <input
                type="number"
                value={data.nirWimHof?.recoveryPeriod || '17000'}
                onChange={(e) => handleFieldChange('nirWimHof', 'recoveryPeriod', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Iterasi Siklus</label>
              <input
                type="number"
                value={data.nirWimHof?.iteration || '2'}
                onChange={(e) => handleFieldChange('nirWimHof', 'iteration', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* PEMF WimHof Protocol */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 mb-2">
            <Zap size={14} className="text-sky-400" />
            <span>Mode 2: PEMF WimHof Protocol</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Ramp Dari Freq</label>
              <input
                type="number"
                value={data.pemfWimHof?.rampFromFreq || '14'}
                onChange={(e) => handleFieldChange('pemfWimHof', 'rampFromFreq', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Ramp Ke Freq</label>
              <input
                type="number"
                value={data.pemfWimHof?.rampToFreq || '40'}
                onChange={(e) => handleFieldChange('pemfWimHof', 'rampToFreq', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Ramp Period (ms)</label>
              <input
                type="number"
                value={data.pemfWimHof?.rampPeriod || '30000'}
                onChange={(e) => handleFieldChange('pemfWimHof', 'rampPeriod', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Hold Freq (Hz)</label>
              <input
                type="number"
                step="0.01"
                value={data.pemfWimHof?.holdFreq || '7.83'}
                onChange={(e) => handleFieldChange('pemfWimHof', 'holdFreq', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Recovery Freq (Hz)</label>
              <input
                type="number"
                value={data.pemfWimHof?.recoveryFreq || '13'}
                onChange={(e) => handleFieldChange('pemfWimHof', 'recoveryFreq', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Iterasi Siklus</label>
              <input
                type="number"
                value={data.pemfWimHof?.iteration || '2'}
                onChange={(e) => handleFieldChange('pemfWimHof', 'iteration', e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* SendOff Durations */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-rose-300 block">Mode 3: NIR SendOff</span>
            <span className="text-[10px] text-slate-500">Durasi penutup terapi (ms)</span>
          </div>
          <input
            type="number"
            value={data.nirSendOff?.duration || '3000'}
            onChange={(e) => handleFieldChange('nirSendOff', 'duration', e.target.value)}
            className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono text-right"
          />
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-sky-300 block">Mode 3: PEMF SendOff</span>
            <span className="text-[10px] text-slate-500">Durasi penutup terapi (ms)</span>
          </div>
          <input
            type="number"
            value={data.pemfSendOff?.duration || '3000'}
            onChange={(e) => handleFieldChange('pemfSendOff', 'duration', e.target.value)}
            className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono text-right"
          />
        </div>
      </div>
    </div>
  );
}
