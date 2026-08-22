import React, { useState, useEffect } from 'react';
import {
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Terminal,
  Scan,
  User,
  History
} from 'lucide-react';
import {
  fetchPodAppVersionsApi,
  scanPodAppVersionsApi,
  fetchDeploymentHistoryApi
} from '../../api/vpsApi';
import DeploymentLogModal from '../installation/DeploymentLogModal';

export default function InstalledVersionsTab({ server }) {
  const [appVersions, setAppVersions] = useState([]);
  const [serverHistory, setServerHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch versions matrix
      const matrix = await fetchPodAppVersionsApi();
      const podData = (matrix || []).find(m => String(m.server_id) === String(server.id) || (server.code && String(m.pod_code) === String(server.code)));
      setAppVersions(podData?.apps || []);

      // 2. Fetch history for this POD
      if (server.code) {
        const historyRes = await fetchDeploymentHistoryApi({ pod_code: server.code, limit: 5 });
        if (historyRes && historyRes.success) {
          setServerHistory(historyRes.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load installed versions for server:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (server?.id) {
      loadData();
    }
  }, [server]);

  const handleScanSingle = async () => {
    setIsScanning(true);
    try {
      await scanPodAppVersionsApi([server.id]);
      await loadData();
    } catch (err) {
      console.error('Failed to scan server versions:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const knownApps = [
    { id: 'mobile-api', name: 'Mobile API (mobile-api)', type: 'backend' },
    { id: 'mobile-synch', name: 'Mobile Sync (mobile-synch)', type: 'backend' },
    { id: 'mobile-consume', name: 'Mobile Consume (mobile-consume)', type: 'backend' },
    { id: 'mobile-downloader', name: 'Mobile Downloader (mobile-downloader)', type: 'backend' },
    { id: 'assist-api', name: 'Assist API (assist-api)', type: 'backend' },
    { id: 'small-screen', name: 'Small Screen App (small-screen)', type: 'frontend' },
    { id: 'big-screen', name: 'Big Screen App (big-screen)', type: 'frontend' }
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Layers size={20} />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>Status Versi Aplikasi Terpasang</span>
              {server.code && (
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 font-mono text-xs border border-cyan-500/30">
                  POD #{server.code}
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400">Versi kontainer Docker dan paket Debian aktif pada node server ini</p>
          </div>
        </div>

        <button
          onClick={handleScanSingle}
          disabled={isScanning || isLoading}
          className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg disabled:opacity-50"
          title="Scan versi kontainer & paket langsung via SSH"
        >
          <Scan size={14} className={isScanning ? 'animate-spin' : ''} />
          <span>{isScanning ? 'Memindai SSH...' : 'Scan Versi Sekarang'}</span>
        </button>
      </div>

      {/* Installed Apps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {knownApps.map(app => {
          const appVer = appVersions.find(a => a.app_name === app.id);
          const isInstalled = appVer && appVer.current_version && appVer.current_version !== 'Not Installed';
          const isDev = (appVer?.environment || 'dev').toLowerCase() === 'dev';

          return (
            <div
              key={app.id}
              className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                isInstalled
                  ? isDev
                    ? 'bg-slate-900/80 border-amber-500/30'
                    : 'bg-slate-900/80 border-emerald-500/30'
                  : 'bg-slate-950/50 border-slate-800/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-800 text-cyan-400">
                    <Package size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-white">{app.name}</h5>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">{app.type}</span>
                  </div>
                </div>

                {isInstalled ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                    isDev
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {appVer.environment || 'dev'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-500">
                    Not Installed
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400 font-medium text-[11px]">Versi Aktif:</span>
                <span className="font-mono font-black text-cyan-300">
                  {isInstalled ? appVer.current_version : '-'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Deployment History Section */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <History size={14} className="text-cyan-400" />
          <span>5 Riwayat Deployment Terakhir pada POD Ini</span>
        </h4>

        {serverHistory.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
            Belum ada catatan riwayat deployment untuk POD ini.
          </div>
        ) : (
          <div className="space-y-2">
            {serverHistory.map(item => {
              const isSuccess = item.status === 'success';
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedHistory(item);
                    setIsLogModalOpen(true);
                  }}
                  className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/30 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`p-1 rounded-md border ${
                      isSuccess
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    }`}>
                      {isSuccess ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                    </span>
                    <div>
                      <div className="font-bold text-slate-200">
                        {item.app_name} <span className="text-cyan-300 font-mono ml-1">({item.version})</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.created_at && !isNaN(new Date(item.created_at).getTime())
                          ? new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                          : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.duration_seconds}s
                    </span>
                    <button className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white">
                      <Terminal size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Terminal Log Modal */}
      <DeploymentLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        historyItem={selectedHistory}
      />
    </div>
  );
}
