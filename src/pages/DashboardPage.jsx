import React, { useState, useMemo } from 'react';
import {
  Server,
  Download,
  Activity,
  ArrowRight,
  Database,
  FileCode,
  Globe,
  RefreshCw,
  MapPin,
  Wifi,
  Radio,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import PodGeoMap from '../components/dashboard/PodGeoMap';
import PodHeartbeatTable from '../components/dashboard/PodHeartbeatTable';
import ServerDetailModal from '../components/server/ServerDetailModal';
import { syncHeartbeatApi } from '../api/vpsApi';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage({
  servers = [],
  onRefreshServers = null,
  onSelectServer = null,
  onNavigateView = null
}) {
  const { isAuthenticated } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedPodId, setSelectedPodId] = useState(null);
  const [selectedDetailServer, setSelectedDetailServer] = useState(null);
  const [syncToast, setSyncToast] = useState(null);

  // Filter servers to focus exclusively on POD nodes (type === 'pod')
  const displayServers = useMemo(() => {
    return servers.filter(s => s.type === 'pod');
  }, [servers]);

  // Handle Sync Heartbeat to Database (only executed when user clicks the reload/sync button)
  const handleSyncToDatabase = async () => {
    setIsSyncing(true);
    setSyncToast(null);
    try {
      const res = await syncHeartbeatApi();
      if (res && res.success) {
        setSyncToast({
          type: 'success',
          message: res.message || `Berhasil memperbarui data latitude, longitude, dan mac_address!`
        });
        if (onRefreshServers) {
          await onRefreshServers();
        }
      } else {
        setSyncToast({
          type: 'error',
          message: res.error || 'Gagal melakukan sinkronisasi ke database.'
        });
      }
    } catch (err) {
      console.error('Sync error:', err);
      setSyncToast({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat menyinkronkan data.'
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 5000);
    }
  };

  const totalLocated = displayServers.filter(s => s.latitude && s.longitude).length;
  const totalOnline = displayServers.filter(s => s.currentMetrics?.status === 'online' || s.status === 'online').length;
  const totalMac = displayServers.filter(s => s.mac_address).length;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">

      {/* Sync Toast Notification */}
      {syncToast && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xl backdrop-blur-xl animate-in slide-in-from-top-3 duration-200 ${
          syncToast.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
        }`}>
          <div className="flex items-center gap-2.5 text-xs font-bold">
            {syncToast.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-rose-400 shrink-0" />
            )}
            <span>{syncToast.message}</span>
          </div>
          <button
            onClick={() => setSyncToast(null)}
            className="text-xs text-slate-400 hover:text-white cursor-pointer px-2 py-0.5 rounded"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Hero Welcome & Sync Action Bar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-cyan-950/30 p-6 sm:p-8 border border-cyan-500/20 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left Title & Description */}
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold w-fit">
              <Activity size={14} className="animate-pulse" />
              <span>Database Server Geolocation & Monitoring</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Dashboard & Pemetaan POD
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Visualisasi persebaran geografis POD berdasarkan data Latitude, Longitude, dan MAC Address di database dengan status monitoring live.
            </p>
          </div>

          {/* Right Action Buttons (Only for Authenticated Admins) */}
          {isAuthenticated && (
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              {/* Refresh DB Servers Button */}
              {onRefreshServers && (
                <button
                  onClick={() => onRefreshServers()}
                  disabled={isSyncing}
                  className="px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
                  title="Perbarui data server"
                >
                  <RefreshCw size={15} />
                  <span>Refresh Server</span>
                </button>
              )}

              {/* Sync from Heartbeat Button */}
              <button
                onClick={handleSyncToDatabase}
                disabled={isSyncing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
                title="Ambil latitude, longitude, dan mac_address dari endpoint heartbeat ke database"
              >
                <Database size={16} className={isSyncing ? 'animate-bounce' : ''} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan dari Heartbeat'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered Servers */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Total Server / POD</span>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Server size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl sm:text-3xl font-black text-cyan-400">
              {displayServers.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Unit terdaftar di sistem</div>
          </div>
        </div>

        {/* Located on GPS Map */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Terpetakan di GPS</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <MapPin size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl sm:text-3xl font-black text-emerald-400">
              {totalLocated} <span className="text-sm font-semibold text-slate-400">/ {displayServers.length}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Latitude & Longitude terisi</div>
          </div>
        </div>

        {/* Online Status from VPS Monitoring */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Status Server Online</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Wifi size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl sm:text-3xl font-black text-emerald-400">
              {totalOnline} <span className="text-sm font-semibold text-slate-400">/ {displayServers.length}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Monitoring VPS live aktif</div>
          </div>
        </div>

        {/* MAC Address Registered */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">MAC Address Fisik</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Radio size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl sm:text-3xl font-black text-amber-400">
              {totalMac}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Alamat hardware tersimpan</div>
          </div>
        </div>
      </div>

      {/* Interactive Global Geolocation Map */}
      <PodGeoMap
        servers={displayServers}
        selectedPodId={selectedPodId}
        onSelectPod={(s) => setSelectedPodId(s.id)}
      />

      {/* Full POD Inventory Table */}
      <PodHeartbeatTable
        servers={displayServers}
        selectedPodId={selectedPodId}
        onSelectServer={onSelectServer ? (s) => onSelectServer(s) : (s) => setSelectedDetailServer(s)}
      />

      {/* Local ServerDetailModal fallback if not handled globally */}
      {selectedDetailServer && !onSelectServer && (
        <ServerDetailModal
          server={selectedDetailServer}
          onClose={() => setSelectedDetailServer(null)}
        />
      )}

      {/* Quick Navigation Cards (Only for Authenticated Users) */}
      {isAuthenticated && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div
            onClick={() => onNavigateView && onNavigateView('server-list')}
            className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 hover:border-cyan-500/50 transition-all cursor-pointer group shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 group-hover:scale-105 transition-transform">
                <Server size={20} />
              </div>
              <ArrowRight size={16} className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors">
              Server & POD List
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Pantau status CPU, RAM, Disk, dan kontainer Docker aktif pada semua server VPS & POD.
            </p>
          </div>

          <div
            onClick={() => onNavigateView && onNavigateView('installation')}
            className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 hover:border-blue-500/50 transition-all cursor-pointer group shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 group-hover:scale-105 transition-transform">
                <Download size={20} />
              </div>
              <ArrowRight size={16} className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-base font-extrabold text-white group-hover:text-blue-300 transition-colors">
              Installation Pipeline
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Eksekusi batch instalasi dan deployment artefak MinIO ke multi-POD secara real-time.
            </p>
          </div>

          <div
            onClick={() => onNavigateView && onNavigateView('env-manager')}
            className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 hover:border-emerald-500/50 transition-all cursor-pointer group shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:scale-105 transition-transform">
                <FileCode size={20} />
              </div>
              <ArrowRight size={16} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300 transition-colors">
              Environment Manager & Comparison
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Kelola file .env, bandingkan perbedaan variabel key-value, dan sinkronkan konfigurasi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
