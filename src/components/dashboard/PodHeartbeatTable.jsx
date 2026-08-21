import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Server,
  Layers,
  Cpu,
  Activity
} from 'lucide-react';

export default function PodHeartbeatTable({
  servers = [],
  onSelectServer = null,
  selectedPodId = null
}) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'located' | 'online' | 'unmapped'
  const [versionFilter, setVersionFilter] = useState('all'); // 'all' | 'v3' | 'v2'

  // Only display POD servers (type === 'pod')
  const podServers = servers.filter(s => s.type === 'pod');

  const podV3Count = podServers.filter(s => s.pod_version === 'v3' || (!s.pod_version && !s.name?.toLowerCase().includes('v2'))).length;
  const podV2Count = podServers.filter(s => s.pod_version === 'v2' || s.name?.toLowerCase().includes('v2')).length;

  const filteredItems = podServers.filter(s => {
    const isOnline = s.currentMetrics?.status === 'online' || s.status === 'online';
    const hasLocation = Boolean(s.latitude && s.longitude);
    const version = (s.pod_version || (s.name?.toLowerCase().includes('v2') ? 'v2' : 'v3')).toLowerCase();

    // Version filter
    if (versionFilter === 'v3' && version !== 'v3') return false;
    if (versionFilter === 'v2' && version !== 'v2') return false;

    // Search query match
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = s.name && s.name.toLowerCase().includes(q);
      const matchVersion = s.pod_version && s.pod_version.toLowerCase().includes(q);
      const matchLat = s.latitude && s.latitude.includes(q);
      const matchLong = s.longitude && s.longitude.includes(q);
      if (!matchName && !matchVersion && !matchLat && !matchLong) return false;
    }

    // Status filter mode
    if (filterMode === 'located' && !hasLocation) return false;
    if (filterMode === 'online' && !isOnline) return false;
    if (filterMode === 'unmapped' && hasLocation) return false;

    return true;
  });

  return (
    <div className="glass-card rounded-3xl border border-cyan-500/20 bg-slate-950/70 p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Server size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>Inventarisasi POD & Lokasi GPS</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                {filteredItems.length} POD
              </span>
            </h3>
            <p className="text-xs text-slate-400">Klik baris POD untuk membuka detail metrik, Docker apps, dan log</p>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Box */}
          <div className="relative min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari POD, Versi, Lokasi..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-800 focus:border-cyan-400 rounded-xl text-white text-xs outline-none transition-all placeholder:text-slate-500"
            />
          </div>

          {/* Version Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setVersionFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                versionFilter === 'all' ? 'bg-purple-500/25 text-purple-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua ({podServers.length})
            </button>
            <button
              onClick={() => setVersionFilter('v3')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                versionFilter === 'v3' ? 'bg-purple-500/25 text-purple-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              POD v3 ({podV3Count})
            </button>
            <button
              onClick={() => setVersionFilter('v2')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                versionFilter === 'v2' ? 'bg-blue-500/25 text-blue-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              POD v2 ({podV2Count})
            </button>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all' ? 'bg-cyan-500/25 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterMode('located')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'located' ? 'bg-cyan-500/25 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Terpetakan ({podServers.filter(s => s.latitude && s.longitude).length})
            </button>
            <button
              onClick={() => setFilterMode('online')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'online' ? 'bg-emerald-500/25 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Online ({podServers.filter(s => s.currentMetrics?.status === 'online' || s.status === 'online').length})
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/40">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-bold">
              <th className="py-3 px-4">Nama POD</th>
              <th className="py-3 px-4">Versi</th>
              <th className="py-3 px-4">Lokasi GPS</th>
              <th className="py-3 px-4">Status Monitoring</th>
              <th className="py-3 px-4">Load CPU / RAM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  Tidak ada POD yang sesuai dengan filter pencarian.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => {
                const isSelected = selectedPodId && (String(selectedPodId) === String(item.id) || String(selectedPodId) === String(item.code));
                const isOnline = item.currentMetrics?.status === 'online' || item.status === 'online';
                const hasLocation = Boolean(item.latitude && item.longitude);
                const cpuUsage = item.currentMetrics?.cpu_usage !== undefined ? item.currentMetrics.cpu_usage : 0;
                const ramUsage = item.currentMetrics?.ram_usage !== undefined ? item.currentMetrics.ram_usage : 0;
                const podVer = (item.pod_version || (item.name?.toLowerCase().includes('v2') ? 'v2' : 'v3')).toLowerCase();

                return (
                  <tr
                    key={item.id || idx}
                    onClick={() => onSelectServer && onSelectServer(item)}
                    className={`transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-cyan-500/15'
                        : 'hover:bg-slate-800/60'
                    }`}
                    title="Klik untuk membuka detail server & aplikasi"
                  >
                    {/* Server / POD Name */}
                    <td className="py-3.5 px-4 font-bold text-white group-hover:text-cyan-300 transition-colors">
                      <span>{item.name}</span>
                    </td>

                    {/* POD Version */}
                    <td className="py-3.5 px-4">
                      {podVer === 'v3' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          POD v3
                        </span>
                      ) : podVer === 'v2' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          POD v2
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">-</span>
                      )}
                    </td>

                    {/* GPS Coordinates */}
                    <td className="py-3.5 px-4">
                      {hasLocation ? (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <MapPin size={13} className="text-cyan-400 shrink-0" />
                          <span className="font-mono text-[11px]">
                            {parseFloat(item.latitude).toFixed(3)}, {parseFloat(item.longitude).toFixed(3)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Belum disinkron</span>
                      )}
                    </td>

                    {/* Status Server (From VPS Monitoring) */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        isOnline
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </td>

                    {/* CPU & RAM Usage */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {isOnline ? (
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-cyan-300 font-semibold">{cpuUsage}% CPU</span>
                          <span className="text-slate-500">/</span>
                          <span className="text-purple-300 font-semibold">{ramUsage}% RAM</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
