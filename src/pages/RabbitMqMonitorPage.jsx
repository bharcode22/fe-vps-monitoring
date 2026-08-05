import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Server,
  Activity,
  Shuffle,
  AlertTriangle,
  Plus,
  Trash2,
  Edit3,
  X,
  Terminal,
  MessageSquare
} from 'lucide-react';
import {
  fetchRabbitMqsApi,
  createRabbitMqApi,
  updateRabbitMqApi,
  deleteRabbitMqApi,
  fetchRabbitMqStatusApi,
  fetchServersApi,
} from '../api/vpsApi';
import RabbitMqNodeGraph from '../components/rabbitmq/RabbitMqNodeGraph';
import LiveActivityTracer from '../components/rabbitmq/LiveActivityTracer';
import QueuesMonitor from '../components/rabbitmq/QueuesMonitor';
import ServerDetailModal from '../components/server/ServerDetailModal';

export default function RabbitMqMonitorPage({ onBack }) {
  const [servers, setServers] = useState([]);
  const [vpsServers, setVpsServers] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [isLoadingServers, setIsLoadingServers] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('graph'); // 'graph' | 'tracer' | 'queues'
  const [selectedDetailServer, setSelectedDetailServer] = useState(null);

  // Command Execution State
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [commandResult, setCommandResult] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingServer, setEditingServer] = useState(null);
  const [formName, setFormName] = useState('');
  const [formHost, setFormHost] = useState('');
  const [formPort, setFormPort] = useState('15672');
  const [formUsername, setFormUsername] = useState('guest');
  const [formPassword, setFormPassword] = useState('');
  const [formError, setFormError] = useState('');



  // 1. Fetch configured servers
  const loadServers = async (autoSelectId = null) => {
    setIsLoadingServers(true);
    setError('');
    try {
      const [rmqData, vpsData] = await Promise.all([
        fetchRabbitMqsApi(),
        fetchServersApi()
      ]);
      setServers(rmqData);
      setVpsServers(vpsData);
      if (rmqData.length > 0) {
        // Auto-select first or newly added/edited server
        const selectId = autoSelectId || rmqData[0].id;
        setSelectedServerId(selectId);
      } else {
        setSelectedServerId(null);
        setLiveStatus(null);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar server RabbitMQ');
    } finally {
      setIsLoadingServers(false);
    }
  };

  // 2. Fetch status for selected server
  const loadStatus = async (id) => {
    if (!id) return;
    setIsLoadingStatus(true);
    setError('');
    try {
      const data = await fetchRabbitMqStatusApi(id);
      setLiveStatus(data);
    } catch (err) {
      setError(err.message || 'Gagal memuat status live RabbitMQ');
      setLiveStatus({
        status: 'offline',
        error: err.message,
        queues: [],
        totals: { messages: 0, messagesReady: 0, messagesUnacknowledged: 0, publishRate: 0 }
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  useEffect(() => {
    if (selectedServerId) {
      loadStatus(selectedServerId);
    }
  }, [selectedServerId]);


  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingServer(null);
    setFormName('');
    setFormHost('');
    setFormPort('15672');
    setFormUsername('guest');
    setFormPassword('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (server) => {
    setModalMode('edit');
    setEditingServer(server);
    setFormName(server.name);
    setFormHost(server.host);
    setFormPort(String(server.port));
    setFormUsername(server.username || 'guest');
    setFormPassword(server.password || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formName || !formHost) {
      setFormError('Nama dan Host wajib diisi');
      return;
    }

    const payload = {
      name: formName,
      host: formHost,
      port: parseInt(formPort, 10) || 15672,
      username: formUsername,
      password: formPassword
    };

    try {
      if (modalMode === 'add') {
        const newServer = await createRabbitMqApi(payload);
        setIsModalOpen(false);
        await loadServers(newServer.id);
      } else {
        await updateRabbitMqApi(editingServer.id, payload);
        setIsModalOpen(false);
        await loadServers(editingServer.id);
      }
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan konfigurasi');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus server RabbitMQ "${name}"?`)) {
      try {
        await deleteRabbitMqApi(id);
        await loadServers();
      } catch (err) {
        setError(err.message || 'Gagal menghapus server RabbitMQ');
      }
    }
  };

  const currentSelectedServer = servers.find(s => s.id === selectedServerId);

  const handleRestartDocker = async (vpsId, containerName) => {
    if (!vpsId) return;
    setIsExecutingCommand(true);
    setCommandResult('');
    try {
      // Need to import restartDockerContainerApi from '../api/vpsApi'
      const { restartDockerContainerApi } = await import('../api/vpsApi');
      const res = await restartDockerContainerApi(vpsId, containerName);
      setCommandResult(`Success: ${res.message || 'Container restarted successfully.'}`);
    } catch (err) {
      setCommandResult(`Error: ${err.message}`);
    } finally {
      setIsExecutingCommand(false);
      setTimeout(() => setCommandResult(''), 5000);
    }
  };

  const handleRestartPm2 = async (vpsId, appName) => {
    if (!vpsId) return;
    setIsExecutingCommand(true);
    setCommandResult('');
    try {
      const { restartPm2AppApi } = await import('../api/vpsApi');
      const res = await restartPm2AppApi(vpsId, appName);
      setCommandResult(`Success: ${res.message || 'PM2 App restarted successfully.'}`);
    } catch (err) {
      setCommandResult(`Error: ${err.message}`);
    } finally {
      setIsExecutingCommand(false);
      setTimeout(() => setCommandResult(''), 5000);
    }
  };

  return (
    <div className="min-h-screen text-slate-100 pb-16">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 rounded-xl border border-cyan-500/30 transition-all cursor-pointer shadow-lg shadow-cyan-500/5 flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft size={16} />
            <span>Kembali</span>
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <div className="bg-cyan-500/20 p-2 rounded-xl border border-cyan-500/40">
                <Shuffle className="text-cyan-400 w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                RabbitMQ Pub/Sub Monitor
              </h1>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Pantau status antrean pesan real-time dan lacak alamat IP Pod subscriber (consumer).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddModal}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Tambah Server RMQ</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">

        {/* Top bar: Server Selector card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase shrink-0 flex items-center gap-2">
              <Server size={14} />
              <span>Daftar Instance RMQ ({servers.length})</span>
            </h3>

            {isLoadingServers ? (
              <div className="h-10 w-64 bg-slate-800 rounded-xl animate-pulse"></div>
            ) : servers.length === 0 ? (
              <div className="text-slate-500 text-xs italic">
                Belum ada server RabbitMQ ditambahkan.
              </div>
            ) : (
              <div className="flex overflow-x-auto gap-3 w-full scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pb-1">
                {servers.map(server => (
                  <div
                    key={server.id}
                    onClick={() => setSelectedServerId(server.id)}
                    className={`shrink-0 p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group min-w-[220px] ${selectedServerId === server.id
                      ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/5 border-cyan-500/40 text-white'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold text-xs truncate">{server.name}</p>
                      <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{server.host}:{server.port}</p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(server);
                        }}
                        className="p-1 hover:text-cyan-400 text-slate-500 rounded"
                        title="Edit server"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(server.id, server.name);
                        }}
                        className="p-1 hover:text-red-400 text-slate-500 rounded"
                        title="Hapus server"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {currentSelectedServer ? (
            <>
              {/* Status Banner */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-white">{currentSelectedServer.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">Endpoint: http://{currentSelectedServer.host}:{currentSelectedServer.port}</p>
                </div>

                <div className="flex items-center gap-3">
                  {liveStatus && (
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      {liveStatus.status === 'online' ? (
                        <>
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span>
                          <span className="text-emerald-400">Online {liveStatus.version && `(v${liveStatus.version})`}</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                          <span className="text-red-400">Offline / Gagal Hubung</span>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => loadStatus(selectedServerId)}
                    disabled={isLoadingStatus}
                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-400 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-cyan-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <RefreshCw size={12} className={isLoadingStatus ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {liveStatus?.status === 'offline' && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm flex items-start gap-3">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold">Gagal Menghubungi API Management RabbitMQ</h4>
                    <p className="text-xs text-red-300/80 mt-1">Error: {liveStatus.error}</p>
                    <p className="text-xs text-slate-400 mt-2 list-disc pl-4">
                      Pastikan rabbitmq_management plugin telah aktif di server ({currentSelectedServer.host}). Perintah: <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-[11px]">rabbitmq-plugins enable rabbitmq_management</code>.
                    </p>
                  </div>
                </div>
              )}

              {liveStatus?.status === 'online' && (
                <>
                  {commandResult && (
                    <div className={`mt-4 p-3 rounded-xl border text-xs font-bold ${commandResult.startsWith('Error') ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                      {commandResult}
                    </div>
                  )}

                  {/* Tabs Navigation */}
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-0 mt-6 overflow-x-auto">
                    <button
                      onClick={() => setActiveTab('graph')}
                      className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === 'graph' ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Activity size={16} />
                        <span>Arsitektur Node</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('tracer')}
                      className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === 'tracer' ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Terminal size={16} />
                        <span>Log Aktivitas</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('queues')}
                      className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === 'queues' ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare size={16} />
                        <span>Daftar Antrean</span>
                      </div>
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="mt-6">
                    {activeTab === 'graph' && (
                      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl animate-in fade-in duration-300">
                        <RabbitMqNodeGraph
                          liveStatus={liveStatus}
                          serverConfig={currentSelectedServer}
                          vpsServers={vpsServers}
                          onRestartPm2={handleRestartPm2}
                          onRestartDocker={handleRestartDocker}
                          onOpenServerDetail={(server) => {
                            console.log('[DEBUG MonitorPage] Membuka ServerDetailModal untuk server:', server);
                            setSelectedDetailServer(server);
                          }}
                        />
                      </div>
                    )}

                    {activeTab === 'tracer' && (
                      <div className="animate-in fade-in duration-300">
                        <LiveActivityTracer selectedServerId={selectedServerId} />
                      </div>
                    )}

                    {activeTab === 'queues' && (
                      <div className="animate-in fade-in duration-300">
                        <QueuesMonitor liveStatus={liveStatus} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </>

          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center h-[50vh] shadow-xl">
              <Shuffle size={48} className="text-slate-500 mb-4 animate-pulse" />
              <h3 className="text-lg font-bold text-white mb-2">Pilih Instance RabbitMQ</h3>
              <p className="text-slate-400 text-sm max-w-md">
                Silakan pilih salah satu server RabbitMQ dari menu sebelah kiri untuk memulai pemantauan antrean dan subscriber secara real-time.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit RabbitMQ Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
              <Shuffle className="text-cyan-400 w-5 h-5" />
              <span>{modalMode === 'add' ? 'Tambah Server RabbitMQ' : 'Edit Server RabbitMQ'}</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Nama Server</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: RMQ Cluster Utama"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Host / IP</label>
                  <input
                    type="text"
                    required
                    placeholder="10.20.10.15"
                    value={formHost}
                    onChange={(e) => setFormHost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">API Port</label>
                  <input
                    type="number"
                    required
                    placeholder="15672"
                    value={formPort}
                    onChange={(e) => setFormPort(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
                  <input
                    type="text"
                    placeholder="guest"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {formError && (
                <div className="text-red-400 text-xs flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl font-bold">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* VPS Server Detail Modal when Node is clicked */}
      {selectedDetailServer && (
        <ServerDetailModal
          server={selectedDetailServer}
          onClose={() => setSelectedDetailServer(null)}
        />
      )}
    </div>
  );
}
