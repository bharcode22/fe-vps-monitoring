import React from 'react';
import {
  Calendar,
  Folder,
  FolderOpen,
  Cpu,
  Clock,
  Radio,
  ListFilter
} from 'lucide-react';
import { MODULE_CONFIG, getTodayLocalDate } from './podRecordsConfig';

export default function PodRecordsFilterToolbar({
  availableDates = [],
  selectedDate,
  onSelectDate,
  dateFolders = [],
  activeCategory,
  selectedModuleFilter,
  onSelectModuleFilter,
  timePreset,
  onApplyPreset,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  sourceMode,
  onSourceModeChange,
  fetchLimit,
  onFetchLimitChange
}) {
  const todayStr = getTodayLocalDate();

  return (
    <div className="px-4 sm:px-6 py-2.5 bg-slate-900/20 border-b border-slate-800/80 flex flex-col gap-2.5 shrink-0">
      {/* Row 1: Folder Tanggal Dropdown */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-300 shrink-0 flex items-center gap-1.5">
            <FolderOpen size={15} className="text-cyan-400" />
            <span>Folder Tanggal:</span>
          </span>

          {availableDates.length === 0 ? (
            <span className="text-xs text-slate-500 italic">Tidak ada folder log terdeteksi</span>
          ) : (
            <div className="relative min-w-[240px] sm:min-w-[320px]">
              <select
                value={selectedDate}
                onChange={(e) => onSelectDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 transition-all cursor-pointer shadow-inner pr-8"
              >
                {availableDates.map((d) => {
                  const isToday = d === todayStr;
                  const folderMeta = dateFolders.find((df) => df.date === d);
                  const countStr = folderMeta ? `${folderMeta.count} berkas • ${folderMeta.sizeFormatted}` : '';
                  const todayBadge = isToday ? ' (Hari Ini)' : '';

                  return (
                    <option key={d} value={d} className="bg-slate-900 text-slate-200 py-1 font-mono">
                      📁 {d} {countStr ? `— ${countStr}` : ''}{todayBadge}
                    </option>
                  );
                })}

                {availableDates.length > 1 && (
                  <option value="ALL" className="bg-slate-900 text-cyan-300 py-1 font-sans font-bold">
                    📂 Semua Folder (Semua Berkas Fisik)
                  </option>
                )}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Heartbeat Specific Filters (Modules, Hours, Source, Limit) */}
      {activeCategory === 'heartbeats' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/60">
          {/* Module Selector Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <Cpu size={11} className="text-cyan-400" />
              Filter Modul Hardware
            </label>
            <select
              value={selectedModuleFilter}
              onChange={(e) => onSelectModuleFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
            >
              <option value="ALL">Semua Modul (501 - 509)</option>
              {MODULE_CONFIG.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} - {m.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Preset */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <Clock size={11} className="text-cyan-400" />
              Rentang Waktu
            </label>
            <select
              value={timePreset}
              onChange={(e) => onApplyPreset(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
            >
              <option value="all">24 Jam Penuh</option>
              <option value="1h">1 Jam Terakhir</option>
              <option value="3h">3 Jam Terakhir</option>
              <option value="6h">6 Jam Terakhir</option>
              <option value="12h">12 Jam Terakhir</option>
              <option value="morning">Pagi (06:00 - 12:00)</option>
              <option value="afternoon">Siang (12:00 - 18:00)</option>
              <option value="work">Jam Kerja (08:00 - 17:00)</option>
              <option value="custom">Kustom (Jam:Menit)</option>
            </select>
          </div>

          {/* Custom Time Inputs or Source Mode */}
          {timePreset === 'custom' ? (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Jam Mulai &bull; Selesai
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => onStartTimeChange(e.target.value)}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                />
                <span className="text-slate-600">-</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => onEndTimeChange(e.target.value)}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Radio size={11} className="text-cyan-400" />
                Sumber Pembacaan
              </label>
              <select
                value={sourceMode}
                onChange={(e) => onSourceModeChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
              >
                <option value="auto">Otomatis (Disk / RAM)</option>
                <option value="file">Berkas Fisik (.jsonl)</option>
                <option value="live">Buffer Memori Live</option>
              </select>
            </div>
          )}

          {/* Limit Rows */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <ListFilter size={11} className="text-cyan-400" />
              Limit Baris Data
            </label>
            <select
              value={fetchLimit}
              onChange={(e) => onFetchLimitChange(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
            >
              <option value={100}>100 Baris Terkini</option>
              <option value={300}>300 Baris</option>
              <option value={500}>500 Baris (Standar)</option>
              <option value={1000}>1.000 Baris</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
