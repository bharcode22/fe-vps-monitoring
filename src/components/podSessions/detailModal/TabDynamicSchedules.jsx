import React from 'react';
import { Zap, Wind, Radio, Sun, Plus, Trash2 } from 'lucide-react';
import olfactoryList from '../olfactory.json';

export default function TabDynamicSchedules({
  formData,
  handleChange,
  enableBurstSchedule,
  handleToggleBurstSchedule,
  handleAddBurstTime,
  handleRemoveBurstTime,
  handleUpdateBurstTime,
  enableGenFreqSchedule,
  handleToggleGenFreqSchedule,
  handleAddGenFreq,
  handleRemoveGenFreq,
  handleUpdateGenFreq,
  enableNirSchedule,
  handleToggleNirSchedule,
  handleAddNirValue,
  handleRemoveNirValue,
  handleUpdateNirValue
}) {
  return (
    <div className="space-y-6">
      {/* PEMF Therapy */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-400" />
            <span className="text-xs font-bold text-white">PEMF Therapy</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={!!formData.pemf_therapy}
              onChange={(e) => handleChange('pemf_therapy', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Nilai PEMF (Intensity / Gauss)</label>
            <input
              type="number"
              disabled={!formData.pemf_therapy}
              value={formData.pemf_value}
              onChange={(e) => handleChange('pemf_value', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white disabled:opacity-50 font-mono"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-3 sm:pt-4">
            <input
              type="checkbox"
              checked={!!formData.direct_neutral_stimulation}
              onChange={(e) => handleChange('direct_neutral_stimulation', e.target.checked)}
              className="w-4 h-4 rounded accent-amber-400 bg-slate-950 border-slate-700"
            />
            <span className="text-xs text-slate-300">Direct Neural Stimulation</span>
          </label>
        </div>
      </div>

      {/* 1. Aroma Burst Times */}
      <div className={`p-4 rounded-xl transition border ${enableBurstSchedule ? 'bg-slate-800/40 border-emerald-500/40' : 'bg-slate-900/30 border-slate-800/80'} space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${enableBurstSchedule ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
              <Wind size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${enableBurstSchedule ? 'text-emerald-300' : 'text-slate-400'}`}>
                  Jadwal Semprotan Aroma (Burst Time)
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${enableBurstSchedule ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                  {enableBurstSchedule ? `${formData.burst_time.length} Jadwal Aktif` : 'Nonaktif ([])'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {enableBurstSchedule
                  ? 'Modul semprotan aroma berjadwal aktif selama durasi sesi.'
                  : 'Jadwal dinonaktifkan. Payload dikirim sebagai array kosong [].'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {enableBurstSchedule && (
              <button
                type="button"
                onClick={handleAddBurstTime}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs flex items-center gap-1 transition"
              >
                <Plus size={13} />
                Tambah Burst
              </button>
            )}

            <label className="relative inline-flex items-center cursor-pointer" title={enableBurstSchedule ? 'Nonaktifkan Jadwal Burst' : 'Aktifkan Jadwal Burst'}>
              <input
                type="checkbox"
                checked={enableBurstSchedule}
                onChange={(e) => handleToggleBurstSchedule(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>

        {enableBurstSchedule ? (
          formData.burst_time.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                Belum ada jadwal burst aroma. Klik "Tambah Burst" untuk membuat semprotan berkala.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {formData.burst_time.map((burst, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/30 transition">
                  <span className="text-[10px] font-bold text-slate-500 w-6">#{idx + 1}</span>
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Start Time (menit)</span>
                      <input
                        type="text"
                        value={burst.start_time}
                        onChange={(e) => handleUpdateBurstTime(idx, 'start_time', e.target.value)}
                        placeholder="e.g. 2.45"
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Durasi (ms)</span>
                      <input
                        type="text"
                        value={burst.duration}
                        onChange={(e) => handleUpdateBurstTime(idx, 'duration', e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Aroma / Scent</span>
                      <input
                        type="text"
                        list="olfactory-scent-presets"
                        value={burst.scent || ''}
                        onChange={(e) => handleUpdateBurstTime(idx, 'scent', e.target.value)}
                        placeholder="e.g. Lavender / Minyak Kayu Putih"
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBurstTime(idx)}
                    className="p-1.5 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                    title="Hapus jadwal burst ini"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="p-3 rounded-lg bg-slate-950/40 border border-dashed border-slate-800 text-slate-500 text-xs flex items-center justify-between">
            <span>Jadwal dinonaktifkan. Data <code>burst_time: []</code> akan dikirim kosong ke Master API.</span>
            <button
              type="button"
              onClick={() => handleToggleBurstSchedule(true)}
              className="text-xs text-emerald-400 hover:underline font-semibold"
            >
              Aktifkan Jadwal
            </button>
          </div>
        )}
      </div>

      {/* 2. Frequency Generator Schedule */}
      <div className={`p-4 rounded-xl transition border ${enableGenFreqSchedule ? 'bg-slate-800/40 border-cyan-500/40' : 'bg-slate-900/30 border-slate-800/80'} space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${enableGenFreqSchedule ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
              <Radio size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${enableGenFreqSchedule ? 'text-cyan-300' : 'text-slate-400'}`}>
                  Modulasi Frekuensi Generator (Generator Frequency)
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${enableGenFreqSchedule ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                  {enableGenFreqSchedule ? `${formData.generator_frequency.length} Jadwal Aktif` : 'Nonaktif ([])'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {enableGenFreqSchedule
                  ? 'Modulasi pola gelombang dan frekuensi generator dinamis aktif.'
                  : 'Jadwal dinonaktifkan. Payload dikirim sebagai array kosong [].'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {enableGenFreqSchedule && (
              <button
                type="button"
                onClick={handleAddGenFreq}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs flex items-center gap-1 transition"
              >
                <Plus size={13} />
                Tambah Frekuensi
              </button>
            )}

            <label className="relative inline-flex items-center cursor-pointer" title={enableGenFreqSchedule ? 'Nonaktifkan Jadwal Frekuensi' : 'Aktifkan Jadwal Frekuensi'}>
              <input
                type="checkbox"
                checked={enableGenFreqSchedule}
                onChange={(e) => handleToggleGenFreqSchedule(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>
        </div>

        {enableGenFreqSchedule ? (
          formData.generator_frequency.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                Belum ada jadwal modulasi frekuensi generator. Klik "Tambah Frekuensi" untuk menambahkan baris jadwal.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {formData.generator_frequency.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/30 transition">
                  <span className="text-[10px] font-bold text-slate-500 w-6">#{idx + 1}</span>
                  <div className="flex-1 grid grid-cols-4 gap-3">
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Frekuensi (Hz)</span>
                      <input
                        type="number"
                        value={item.frequency}
                        onChange={(e) => handleUpdateGenFreq(idx, 'frequency', Number(e.target.value))}
                        placeholder="40"
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Start Time</span>
                      <input
                        type="text"
                        value={item.start_time}
                        onChange={(e) => handleUpdateGenFreq(idx, 'start_time', e.target.value)}
                        placeholder="2"
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Durasi</span>
                      <input
                        type="text"
                        value={item.duration}
                        onChange={(e) => handleUpdateGenFreq(idx, 'duration', e.target.value)}
                        placeholder="5000"
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Wave Shape</span>
                      <input
                        type="text"
                        value={item.wave_shape || 'wave'}
                        onChange={(e) => handleUpdateGenFreq(idx, 'wave_shape', e.target.value)}
                        placeholder="wave"
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveGenFreq(idx)}
                    className="p-1.5 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                    title="Hapus jadwal frekuensi ini"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="p-3 rounded-lg bg-slate-950/40 border border-dashed border-slate-800 text-slate-500 text-xs flex items-center justify-between">
            <span>Jadwal dinonaktifkan. Data <code>generator_frequency: []</code> akan dikirim kosong ke Master API.</span>
            <button
              type="button"
              onClick={() => handleToggleGenFreqSchedule(true)}
              className="text-xs text-cyan-400 hover:underline font-semibold"
            >
              Aktifkan Jadwal
            </button>
          </div>
        )}
      </div>

      {/* 3. Near Infrared (NIR) Schedule */}
      <div className={`p-4 rounded-xl transition border ${enableNirSchedule ? 'bg-slate-800/40 border-rose-500/40' : 'bg-slate-900/30 border-slate-800/80'} space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${enableNirSchedule ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-500'}`}>
              <Sun size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${enableNirSchedule ? 'text-rose-300' : 'text-slate-400'}`}>
                  Jadwal Interval Terapi NIR (NIR Values)
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${enableNirSchedule ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                  {enableNirSchedule ? `${formData.nir_value.length} Jadwal Aktif` : 'Nonaktif ([])'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {enableNirSchedule
                  ? 'Jadwal interval modulasi Near-Infrared berkala aktif.'
                  : 'Jadwal dinonaktifkan. Payload dikirim sebagai array kosong [].'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {enableNirSchedule && (
              <button
                type="button"
                onClick={handleAddNirValue}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs flex items-center gap-1 transition"
              >
                <Plus size={13} />
                Tambah Interval NIR
              </button>
            )}

            <label className="relative inline-flex items-center cursor-pointer" title={enableNirSchedule ? 'Nonaktifkan Jadwal NIR' : 'Aktifkan Jadwal NIR'}>
              <input
                type="checkbox"
                checked={enableNirSchedule}
                onChange={(e) => handleToggleNirSchedule(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>
        </div>

        {enableNirSchedule ? (
          formData.nir_value.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                Belum ada jadwal interval NIR tersimpan. Klik "Tambah Interval NIR" untuk menambahkan interval.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {formData.nir_value.map((nir, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-500/30 transition">
                  <span className="text-[10px] font-bold text-slate-500 w-6">#{idx + 1}</span>
                  <div className="flex-1 grid grid-cols-5 gap-2">
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Start Time</span>
                      <input
                        type="text"
                        value={nir.start_time}
                        onChange={(e) => handleUpdateNirValue(idx, 'start_time', e.target.value)}
                        placeholder="00:10"
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">End Time</span>
                      <input
                        type="text"
                        value={nir.end_time}
                        onChange={(e) => handleUpdateNirValue(idx, 'end_time', e.target.value)}
                        placeholder="00:20"
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Durasi</span>
                      <input
                        type="text"
                        value={nir.duration}
                        onChange={(e) => handleUpdateNirValue(idx, 'duration', e.target.value)}
                        placeholder="00:10"
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">NIR Value</span>
                      <input
                        type="number"
                        step="0.1"
                        value={nir.nir_value}
                        onChange={(e) => handleUpdateNirValue(idx, 'nir_value', Number(e.target.value))}
                        placeholder="2.5"
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Frekuensi</span>
                      <input
                        type="text"
                        value={nir.frequency}
                        onChange={(e) => handleUpdateNirValue(idx, 'frequency', e.target.value)}
                        placeholder="40Hz"
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveNirValue(idx)}
                    className="p-1.5 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                    title="Hapus interval NIR ini"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="p-3 rounded-lg bg-slate-950/40 border border-dashed border-slate-800 text-slate-500 text-xs flex items-center justify-between">
            <span>Jadwal dinonaktifkan. Data <code>nir_value: []</code> akan dikirim kosong ke Master API.</span>
            <button
              type="button"
              onClick={() => handleToggleNirSchedule(true)}
              className="text-xs text-rose-400 hover:underline font-semibold"
            >
              Aktifkan Jadwal
            </button>
          </div>
        )}
      </div>

      {/* Datalist for Scent Presets + Custom Typing */}
      <datalist id="olfactory-scent-presets">
        {olfactoryList.map((item) => (
          <option key={item.id} value={item.scent} />
        ))}
        <option value="Minyak Kayu Putih" />
        <option value="Lemon Grass" />
        <option value="Chamomile" />
      </datalist>
    </div>
  );
}
