import React, { useState } from 'react';
import { Search, Trash2, RefreshCw, AlertTriangle, ShieldCheck, Server, HardDrive, Filter, X } from 'lucide-react';
import { scanRogueFilesApi, cleanupRogueFilesApi } from '../../api/vpsApi';

export default function RogueMediaScannerView() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [selectedServerId, setSelectedServerId] = useState('all');
  const [cleaningServers, setCleaningServers] = useState({});
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const data = await scanRogueFilesApi();
      setScanResults(data);
    } catch (err) {
      alert(`Gagal memindai file liar: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCleanup = (server) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Semua File Liar',
      message: `Yakin ingin HAPUS PERMANEN semua file liar (${server.rogueTotalFormatted}) dari POD ${server.serverName}?`,
      onConfirm: async () => {
        setCleaningServers(prev => ({ ...prev, [server.serverId]: true }));
        try {
          const rogueFilePaths = server.files.filter(f => f.isRogue).map(f => f.fullPath);
          const result = await cleanupRogueFilesApi(server.serverId, rogueFilePaths, false);

          setScanResults(prev => prev.map(s => {
            if (s.serverId === server.serverId) {
              return {
                ...s,
                rogueFilesCount: 0,
                rogueTotalBytes: 0,
                rogueTotalFormatted: '0 B',
                files: s.files.filter(f => !f.isRogue)
              };
            }
            return s;
          }));

          // We rely on optimistic update above, no need to rescan completely to save time.
          // handleScan();
        } catch (err) {
          alert(`Gagal membersihkan file liar: ${err.message}`);
        } finally {
          setCleaningServers(prev => ({ ...prev, [server.serverId]: false }));
        }
      }
    });
  };

  const handleDeleteSingleFile = (server, file) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus File Tunggal',
      message: `Yakin ingin HAPUS PERMANEN file ini dari POD ${server.serverName}?\n\n${file.filename}`,
      onConfirm: async () => {
        setCleaningServers(prev => ({ ...prev, [server.serverId + '_' + file.fullPath]: true }));
        try {
          await cleanupRogueFilesApi(server.serverId, [file.fullPath], false);

          setScanResults(prev => prev.map(s => {
            if (s.serverId === server.serverId) {
              const removedBytes = file.sizeBytes || 0;
              return {
                ...s,
                rogueFilesCount: Math.max(0, s.rogueFilesCount - 1),
                rogueTotalBytes: Math.max(0, s.rogueTotalBytes - removedBytes),
                files: s.files.filter(f => f.fullPath !== file.fullPath)
              };
            }
            return s;
          }));

          // handleScan();
        } catch (err) {
          alert(`Gagal menghapus file: ${err.message}`);
        } finally {
          setCleaningServers(prev => ({ ...prev, [server.serverId + '_' + file.fullPath]: false }));
        }
      }
    });
  };

  const filteredResults = scanResults?.filter(r =>
    selectedServerId === 'all' ? true : r.serverId.toString() === selectedServerId
  ) || [];

  const totalRogueBytes = scanResults?.reduce((acc, r) => acc + (r.rogueTotalBytes || 0), 0) || 0;
  const totalRogueCount = scanResults?.reduce((acc, r) => acc + (r.rogueFilesCount || 0), 0) || 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <div className="glass-card p-6 rounded-3xl border border-rose-500/30 bg-slate-900/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <AlertTriangle size={120} className="text-rose-500" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Search size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Rogue Media Scanner</h2>
              <p className="text-sm text-slate-400">Pindai file media fisik di POD yang tidak dikenali AWS S3 maupun Database Master.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-bold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={18} className={isScanning ? 'animate-spin' : ''} />
              <span>{isScanning ? 'Scanning...' : 'Scan Rogue File'}</span>
            </button>

            {scanResults && (
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-500" />
                <select
                  value={selectedServerId}
                  onChange={(e) => setSelectedServerId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-sm text-white rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
                >
                  <option value="all">Semua POD ({scanResults.length})</option>
                  {scanResults.map(r => (
                    <option key={r.serverId} value={r.serverId}>{r.serverName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {scanResults && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-rose-500/20 flex flex-col items-center justify-center text-center">
            <HardDrive size={24} className="text-rose-400 mb-2" />
            <span className="text-3xl font-black text-white font-mono">{totalRogueCount}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Total File Liar</span>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-rose-500/20 flex flex-col items-center justify-center text-center">
            <AlertTriangle size={24} className="text-rose-500 mb-2" />
            <span className="text-3xl font-black text-rose-400 font-mono">{(totalRogueBytes / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Total Kapasitas Terbuang</span>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-emerald-500/20 flex flex-col items-center justify-center text-center">
            <ShieldCheck size={24} className="text-emerald-400 mb-2" />
            <span className="text-3xl font-black text-white font-mono">{scanResults.length}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">POD Dipindai</span>
          </div>
        </div>
      )}

      {scanResults && (
        <div className="flex flex-col gap-4">
          {filteredResults.map(server => (
            <div key={server.serverId} className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 bg-slate-900 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <Server size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{server.serverName}</h3>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{server.totalFiles} Total File Fisik</span>
                      <span>&bull;</span>
                      <span className="text-rose-400 font-bold">{server.rogueFilesCount} File Liar ({server.rogueTotalFormatted})</span>
                    </div>
                  </div>
                </div>

                {server.rogueFilesCount > 0 && (
                  <button
                    onClick={() => handleCleanup(server)}
                    disabled={cleaningServers[server.serverId]}
                    className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {cleaningServers[server.serverId] ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    <span>Bersihkan {server.rogueTotalFormatted}</span>
                  </button>
                )}
              </div>

              {server.rogueFilesCount > 0 && (
                <div className="p-4 bg-slate-950/50 max-h-96 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {server.files?.filter(f => f.isRogue).map(f => (
                      <div key={f.fullPath} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-slate-300 truncate" title={f.filename}>{f.filename}</span>
                          <span className="text-[10px] font-mono text-rose-400 shrink-0 bg-rose-500/10 px-1.5 py-0.5 rounded">{f.sizeFormatted}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-[9px] text-slate-500 truncate" title={f.fullPath}>{f.fullPath}</span>
                          <button
                            onClick={() => handleDeleteSingleFile(server, f)}
                            disabled={cleaningServers[server.serverId + '_' + f.fullPath]}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-white transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                            title="Hapus file ini saja"
                          >
                            {cleaningServers[server.serverId + '_' + f.fullPath] ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {server.rogueFilesCount === 0 && (
                <div className="p-6 text-center text-slate-400 text-sm">
                  <ShieldCheck size={32} className="mx-auto text-emerald-500/50 mb-2" />
                  Tidak ada file liar di POD ini.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md rounded-3xl border border-rose-500/30 overflow-hidden shadow-2xl shadow-rose-900/20">
            <div className="p-6 bg-slate-900/90 flex flex-col items-center text-center relative">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mb-4 border border-rose-500/30">
                <AlertTriangle size={32} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">{confirmModal.title}</h3>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{confirmModal.message}</p>
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setConfirmModal({ ...confirmModal, isOpen: false });
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                }}
                className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
