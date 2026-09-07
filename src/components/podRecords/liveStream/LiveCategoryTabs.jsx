import React from 'react';
import { Layers, Zap, Activity, Radio, Check } from 'lucide-react';

export default function LiveCategoryTabs({
  liveDataType,
  onSelectType,
  currentChannelsCount = 0,
  hasEnv = false,
  envChannelsCount = 0,
  allChannelsCount = 0
}) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80 shadow-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
          <Layers size={13} className="text-cyan-400" />
          <span>Kategori Data Live:</span>
        </span>
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 flex-wrap">
          {/* Tab 1: Arus (Current) - ALWAYS FIRST & DEFAULT */}
          <button
            onClick={() => onSelectType('current')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              liveDataType === 'current'
                ? 'bg-gradient-to-r from-amber-500/25 to-cyan-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Tampilkan khusus telemetri kanal arus (mA)"
          >
            <Zap size={12} className={liveDataType === 'current' ? 'text-amber-400 fill-amber-400' : 'text-slate-500'} />
            <span>Arus (Current {currentChannelsCount > 0 ? `• ${currentChannelsCount}` : ''})</span>
          </button>

          {/* Tab 2: Suhu & Lingkungan (jika modul memiliki sensor temp/humi) */}
          {hasEnv && (
            <button
              onClick={() => onSelectType('env')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                liveDataType === 'env'
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Tampilkan sensor suhu & kelembaban terpisah"
            >
              <span>Suhu &amp; Kelembaban ({envChannelsCount})</span>
            </button>
          )}

          {/* Tab 3: Detak Heartbeat */}
          <button
            onClick={() => onSelectType('hb')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              liveDataType === 'hb'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Tampilkan sinyal pulsa detak heartbeat modul"
          >
            <Radio size={12} className={liveDataType === 'hb' ? 'text-cyan-400' : 'text-slate-500'} />
            <span>Detak (HB)</span>
          </button>

          {/* Tab 4: Semua Kanal (jika ada lebih dari 1 kategori sensor) */}
          {allChannelsCount > currentChannelsCount && (
            <button
              onClick={() => onSelectType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                liveDataType === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Tampilkan seluruh metrik sensor sekaligus"
            >
              <span>Semua ({allChannelsCount})</span>
            </button>
          )}
        </div>
      </div>

      <div className="text-[11px] font-mono flex items-center gap-1.5">
        {liveDataType === 'current' ? (
          <span className="text-amber-300/90 font-semibold flex items-center gap-1">
            <Check size={13} className="text-amber-400" />
            Data arus dipisahkan bersih (Satuan mA • Non-current disembunyikan)
          </span>
        ) : liveDataType === 'env' ? (
          <span className="text-rose-300/90 font-semibold flex items-center gap-1">
            <Activity size={13} className="text-rose-400" />
            Menampilkan sensor suhu &amp; kelembaban terpisah
          </span>
        ) : liveDataType === 'hb' ? (
          <span className="text-cyan-300/90 font-semibold flex items-center gap-1">
            <Radio size={13} className="text-cyan-400" />
            Menampilkan sinyal pulsa detak perangkat
          </span>
        ) : (
          <span className="text-slate-400 font-semibold">
            Menampilkan seluruh sinyal gabungan
          </span>
        )}
      </div>
    </div>
  );
}
