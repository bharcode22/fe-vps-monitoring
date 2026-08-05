import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Server,
  Activity,
  MessageSquare,
  Shuffle,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Edit3,
  Search,
  ChevronDown,
  ChevronUp,
  Cpu,
  Settings,
  X,
  Play,
  Square,
  Terminal,
  Sliders,
  Eye,
  ShieldCheck
} from 'lucide-react';
import {
  fetchRabbitMqsApi,
  createRabbitMqApi,
  updateRabbitMqApi,
  deleteRabbitMqApi,
  fetchRabbitMqStatusApi,
  fetchServersApi
} from '../api/vpsApi';
import io from 'socket.io-client';
import { BACKEND_URL } from '../config';

export default function RabbitMqMonitorPage({ onBack }) {
  const [servers, setServers] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [isLoadingServers, setIsLoadingServers] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [error, setError] = useState('');
  
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

  // Queue filtering and expand states
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQueue, setExpandedQueue] = useState(null); // name of queue

  // Tab state
  const [activeTab, setActiveTab] = useState('queues'); // 'queues' | 'tracer'

  // Log tracer state
  const [isTracing, setIsTracing] = useState(false);
  const [traceLogs, setTraceLogs] = useState([]);
  const [traceVhost, setTraceVhost] = useState('/');
  const [messageFilter, setMessageFilter] = useState('');
  const [queueFilter, setQueueFilter] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState('');

  const socketRef = useRef(null);
  const terminalRef = useRef(null);

  const startTracing = () => {
    stopTracing();
    setTraceLogs([
      {
        timestamp: new Date().toLocaleTimeString(),
        serverName: 'SYSTEM',
        text: '=== TRACING STARTED: Menghubungkan ke RabbitMQ Firehose...',
        type: 'info'
      }
    ]);
    setIsTracing(true);

    const token = localStorage.getItem('vps_monitoring_token') || '';
    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      setTraceLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          serverName: 'SYSTEM',
          text: `Terhubung ke monitoring socket. Memulai AMQP trace untuk Vhost "${traceVhost}"...`,
          type: 'info'
        }
      ]);

      socket.emit('rabbitmq:start-trace', {
        serverId: selectedServerId,
        token,
        vhost: traceVhost
      });
    });

    socket.on('rabbitmq:trace-connected', () => {
      setTraceLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          serverName: 'SYSTEM',
          text: `✅ Sukses terhubung ke Broker AMQP. Menunggu pesan masuk/keluar...`,
          type: 'info'
        }
      ]);
    });

    socket.on('rabbitmq:trace-data', (data) => {
      // data contains: timestamp, action ('publish'|'deliver'), exchange, queue, properties, body
      let formattedText = '';
      if (data.action === 'publish') {
        formattedText = `[PUBLISH] Exchange: ${data.exchange || '(direct)'} | RoutingKey: ${data.properties?.headers?.['x-original-routing-key'] || ''} | Body: ${data.body}`;
      } else {
        formattedText = `[DELIVER] Queue: ${data.queue} | RoutingKey: ${data.properties?.headers?.['x-original-routing-key'] || ''} | Body: ${data.body}`;
      }

      setTraceLogs(prev => [
        ...prev,
        {
          timestamp: data.timestamp,
          serverName: data.action.toUpperCase(), // 'PUBLISH' | 'DELIVER'
          text: formattedText,
          type: data.action, // 'publish' | 'deliver'
          rawExchange: data.exchange || '',
          rawQueue: data.queue || '',
          rawBody: data.body || ''
        }
      ].slice(-1000));
    });

    socket.on('rabbitmq:webhook-trace', (data) => {
      const bodyString = data.payload ? (typeof data.payload === 'object' ? JSON.stringify(data.payload) : data.payload) : '';
      let formattedText = '';
      if (data.action === 'publish') {
        formattedText = `[PUBLISH-WEBHOOK] Dari: ${data.serverName} | TraceID: ${data.traceId} | Body: ${bodyString}`;
      } else {
        formattedText = `[SUBSCRIBE-WEBHOOK] Diterima: ${data.serverName} | TraceID: ${data.traceId}`;
      }

      setTraceLogs(prev => [
        ...prev,
        {
          timestamp: data.timestamp,
          serverName: data.action === 'publish' ? 'PUBLISH-WEBHOOK' : 'SUBSCRIBE-WEBHOOK',
          text: formattedText,
          type: data.action === 'publish' ? 'publish-webhook' : 'subscribe-webhook',
          rawExchange: '',
          rawQueue: '',
          rawBody: `${data.traceId} ${data.serverName} ${bodyString}`
        }
      ].slice(-1000));
    });

    socket.on('rabbitmq:trace-error', (err) => {
      setTraceLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          serverName: 'SYSTEM',
          text: `❌ ERROR: ${err.error || 'Terputus dari broker'}`,
          type: 'error'
        }
      ]);
      setIsTracing(false);
    });

    socket.on('rabbitmq:trace-stopped', () => {
      setIsTracing(false);
    });

    socket.on('disconnect', () => {
      setTraceLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          serverName: 'SYSTEM',
          text: `Koneksi WebSocket terputus.`,
          type: 'info'
        }
      ]);
      setIsTracing(false);
    });
  };

  const stopTracing = () => {
    if (socketRef.current) {
      socketRef.current.emit('rabbitmq:stop-trace');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsTracing(false);
    setTraceLogs(prev => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        serverName: 'SYSTEM',
        text: '=== TRACING STOPPED ===',
        type: 'info'
      }
    ]);
  };

  // 1. Fetch configured servers
  const loadServers = async (autoSelectId = null) => {
    setIsLoadingServers(true);
    setError('');
    try {
      const data = await fetchRabbitMqsApi();
      setServers(data);
      if (data.length > 0) {
        // Auto-select first or newly added/edited server
        const selectId = autoSelectId || data[0].id;
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

  // Auto-scroll terminal log to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [traceLogs]);

  // Cleanup active tracing connection when unmounting or switching view
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedServerId) {
      loadStatus(selectedServerId);
      setExpandedQueue(null);
      setActiveTab('queues');
      stopTracing();
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

  const toggleExpandQueue = (qName) => {
    if (expandedQueue === qName) {
      setExpandedQueue(null);
    } else {
      setExpandedQueue(qName);
    }
  };

  // Filter queues
  const filteredQueues = liveStatus?.queues ? liveStatus.queues.filter(q => {
    if (searchQuery) {
      return q.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  }) : [];

  const currentSelectedServer = servers.find(s => s.id === selectedServerId);

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

      {/* Main Content split into Server List and Queue Details */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left column: Server Selector card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h3 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase mb-3 flex items-center gap-2">
              <Server size={14} />
              <span>Daftar Instance RMQ ({servers.length})</span>
            </h3>
            
            {isLoadingServers ? (
              <div className="space-y-2 py-4">
                <div className="h-10 bg-slate-800 rounded-xl animate-pulse"></div>
                <div className="h-10 bg-slate-800 rounded-xl animate-pulse"></div>
              </div>
            ) : servers.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Belum ada server RabbitMQ ditambahkan.
              </div>
            ) : (
              <div className="space-y-2.5">
                {servers.map(server => (
                  <div
                    key={server.id}
                    onClick={() => setSelectedServerId(server.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                      selectedServerId === server.id
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

        {/* Right column: Monitor dashboard area */}
        <div className="lg:col-span-3 space-y-6">
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
                  {/* Tab Switcher */}
                  <div className="flex border-b border-slate-800 gap-1.5 pb-0">
                    <button
                      onClick={() => setActiveTab('queues')}
                      className={`px-4 py-2 border-b-2 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeTab === 'queues'
                          ? 'border-cyan-500 text-cyan-400 font-extrabold'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <MessageSquare size={13} />
                      <span>Queues Monitor</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('tracer')}
                      className={`px-4 py-2 border-b-2 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeTab === 'tracer'
                          ? 'border-cyan-500 text-cyan-400 font-extrabold'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Terminal size={13} />
                      <span>Live Activity Tracer</span>
                    </button>
                  </div>

                  {activeTab === 'queues' ? (
                    <>
                      {/* Totals Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
                          <span className="text-slate-400 text-xs block mb-1">Total Queue</span>
                          <span className="text-2xl font-extrabold text-white">
                            {liveStatus.queues.length}
                          </span>
                        </div>
                        <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-4 text-center">
                          <span className="text-cyan-400 text-xs block mb-1">Total Pesan</span>
                          <span className="text-2xl font-extrabold text-cyan-400">
                            {liveStatus.totals.messages}
                          </span>
                        </div>
                        <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 text-center">
                          <span className="text-emerald-400 text-xs block mb-1">Pesan Ready (Antrean)</span>
                          <span className="text-2xl font-extrabold text-emerald-400">
                            {liveStatus.totals.messagesReady}
                          </span>
                        </div>
                        <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 text-center">
                          <span className="text-amber-400 text-xs block mb-1">Kecepatan Publish</span>
                          <span className="text-2xl font-extrabold text-amber-400 font-mono text-xl sm:text-2xl">
                            {liveStatus.totals.publishRate.toFixed(1)} <span className="text-xs">msg/s</span>
                          </span>
                        </div>
                      </div>

                      {/* Queues Table Container */}
                      <div className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl shadow-xl overflow-hidden">
                        {/* Toolbar */}
                        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Cari antrean (queue)..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-2 pl-9 rounded-lg outline-none focus:border-cyan-500 w-full sm:w-64"
                            />
                            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                          </div>
                          <span className="text-xs text-slate-400 font-bold">
                            Menampilkan {filteredQueues.length} Antrean
                          </span>
                        </div>

                        {/* Table */}
                        <div className="overflow-auto max-h-[60vh]">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-950 text-xs font-bold text-slate-400 border-b border-slate-800">
                                <th className="p-4 w-1/3">Nama Antrean (Queue)</th>
                                <th className="p-4 text-center w-24">Status</th>
                                <th className="p-4 text-center w-28">Ready</th>
                                <th className="p-4 text-center w-28">Unacked</th>
                                <th className="p-4 text-center w-28">Consumers (Pod)</th>
                                <th className="p-4 text-right w-32">Publish Rate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredQueues.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                                    Tidak ada antrean ditemukan.
                                  </td>
                                </tr>
                              ) : (
                                filteredQueues.map((q) => {
                                  const isExpanded = expandedQueue === q.name;
                                  const hasUnacked = q.messagesUnacknowledged > 0;
                                  
                                  return (
                                    <React.Fragment key={q.name}>
                                      {/* Queue Row */}
                                      <tr
                                        onClick={() => toggleExpandQueue(q.name)}
                                        className={`border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors cursor-pointer ${
                                          isExpanded ? 'bg-cyan-500/5' : ''
                                        }`}
                                      >
                                        <td className="p-4 font-bold text-slate-200 flex items-center gap-2">
                                          <MessageSquare size={14} className="text-cyan-500 shrink-0" />
                                          <span className="break-all">{q.name}</span>
                                          {isExpanded ? <ChevronUp size={14} className="text-slate-500 shrink-0 ml-auto" /> : <ChevronDown size={14} className="text-slate-500 shrink-0 ml-auto" />}
                                        </td>
                                        <td className="p-4 text-center">
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            q.status === 'running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
                                          }`}>
                                            {q.status}
                                          </span>
                                        </td>
                                        <td className="p-4 text-center font-mono font-bold text-xs">
                                          <span className={q.messagesReady > 0 ? 'text-amber-400' : 'text-slate-400'}>
                                            {q.messagesReady}
                                          </span>
                                        </td>
                                        <td className="p-4 text-center font-mono font-bold text-xs">
                                          <span className={hasUnacked ? 'text-orange-400' : 'text-slate-400'}>
                                            {q.messagesUnacknowledged}
                                          </span>
                                        </td>
                                        <td className="p-4 text-center font-mono text-xs">
                                          <span className={`px-2 py-0.5 rounded-lg border font-bold ${
                                            q.consumersCount > 0 ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-red-500/10 border-red-500/30 text-red-400'
                                          }`}>
                                            {q.consumersCount} Consumers
                                          </span>
                                        </td>
                                        <td className="p-4 text-right font-mono text-xs text-slate-300">
                                          {q.rates.publish > 0 ? (
                                            <span className="text-cyan-400 font-bold">{q.rates.publish.toFixed(1)}/s</span>
                                          ) : (
                                            <span className="text-slate-500">0.0/s</span>
                                          )}
                                        </td>
                                      </tr>

                                      {/* Expanded consumers details list */}
                                      {isExpanded && (
                                        <tr className="bg-slate-950/40 border-b border-slate-800">
                                          <td colSpan={6} className="p-4 pl-8 border-l-2 border-cyan-500">
                                            <div className="space-y-3">
                                              <h4 className="text-xs font-extrabold text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
                                                <Users size={12} />
                                                <span>Pod Subscribers Terkoneksi ({q.consumers.length})</span>
                                              </h4>
                                              
                                              {q.consumers.length === 0 ? (
                                                <p className="text-xs text-slate-500 italic">Tidak ada subscriber aktif mendengarkan queue ini saat ini. Aplikasi mungkin terputus dari RabbitMQ.</p>
                                              ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                  {q.consumers.map((c, idx) => (
                                                    <div key={idx} className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                                                      <div>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                          <span className="text-xs font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                                            IP: {c.peerHost}
                                                          </span>
                                                          <span className="text-[10px] font-bold text-slate-500 font-mono">Port: {c.peerPort}</span>
                                                        </div>
                                                        <p className="text-[10px] font-mono text-slate-400 truncate" title={c.connectionName}>
                                                          Conn: {c.connectionName}
                                                        </p>
                                                      </div>
                                                      
                                                      <div className="mt-2.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                                                        <span className="text-slate-500 font-mono">Tag: {c.consumerTag.substring(0, 18)}...</span>
                                                        <div className="flex items-center gap-1">
                                                          <span className={`w-1.5 h-1.5 rounded-full ${c.active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                          <span className={c.active ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                                                            {c.active ? 'Active' : 'Inactive'}
                                                          </span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                     /* Live Activity Tracer View */
                     <div className="space-y-6">
                       {/* Configuration panel */}
                       <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                           <div>
                             <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                               <Sliders size={16} className="text-cyan-400" />
                               <span>Konfigurasi RabbitMQ Firehose Tracer</span>
                             </h3>
                             <p className="text-[11px] text-slate-400 mt-0.5">
                               Pantau langsung aktivitas pengiriman (Publish) dan penerimaan (Deliver) pesan pada broker RabbitMQ secara real-time.
                             </p>
                           </div>

                           <div className="flex items-center gap-2">
                             {isTracing ? (
                               <button
                                 onClick={stopTracing}
                                 className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-500/20 cursor-pointer transition-all"
                               >
                                 <Square size={13} fill="white" />
                                 <span>Stop Tracing</span>
                               </button>
                             ) : (
                               <button
                                 onClick={startTracing}
                                 className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
                               >
                                 <Play size={13} fill="white" />
                                 <span>Start Tracing</span>
                               </button>
                             )}

                             <button
                               onClick={() => setTraceLogs([])}
                               className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 py-2 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                             >
                               Clear Console
                             </button>
                           </div>
                         </div>

                         {/* Info banner */}
                         <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3.5 flex items-start gap-3">
                           <ShieldCheck size={18} className="text-cyan-400 shrink-0 mt-0.5" />
                           <div>
                             <h4 className="text-xs font-bold text-cyan-400">RabbitMQ Firehose Active Tracer</h4>
                             <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                               Metode pelacakan ini mendeteksi pesan langsung dari broker RabbitMQ (di level exchange <code>amq.rabbitmq.trace</code>). 
                               Anda tidak perlu memasang SSH atau mengubah baris kode apa pun di Publisher/Subscriber. Pastikan Anda sudah mengaktifkan perintah <code>rabbitmqctl trace_on</code> pada container Docker RabbitMQ Anda.
                             </p>
                           </div>
                         </div>

                         {/* Dynamic Filters Configuration */}
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                           <div>
                             <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                               Virtual Host (vhost)
                             </label>
                             <input
                               disabled={isTracing}
                               type="text"
                               placeholder="Contoh: /"
                               value={traceVhost}
                               onChange={(e) => setTraceVhost(e.target.value)}
                               className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                             />
                             <p className="text-[10px] text-slate-500 mt-1">
                               Vhost target pelacakan broker.
                             </p>
                           </div>

                           <div>
                             <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                               <span>Filter Konten / ID (AND)</span>
                               <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.2 rounded font-bold font-mono">LIVE</span>
                             </label>
                             <input
                               type="text"
                               placeholder="Contoh: sound_id: 482 atau key"
                               value={messageFilter}
                               onChange={(e) => setMessageFilter(e.target.value)}
                               className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                             />
                             <p className="text-[10px] text-slate-500 mt-1">
                               Saring payload pesan yang lewat.
                             </p>
                           </div>

                           <div>
                             <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                               <span>Filter Queue (AND)</span>
                               <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.2 rounded font-bold font-mono">LIVE</span>
                             </label>
                             <input
                               type="text"
                               placeholder="Contoh: mobile-synch"
                               value={queueFilter}
                               onChange={(e) => setQueueFilter(e.target.value)}
                               className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                             />
                             <p className="text-[10px] text-slate-500 mt-1">
                               Hanya tampilkan untuk queue ini.
                             </p>
                           </div>

                           <div>
                             <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                               <span>Filter Exchange (AND)</span>
                               <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.2 rounded font-bold font-mono">LIVE</span>
                             </label>
                             <input
                               type="text"
                               placeholder="Contoh: SPREAD_DISCLAIMER"
                               value={exchangeFilter}
                               onChange={(e) => setExchangeFilter(e.target.value)}
                               className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                             />
                             <p className="text-[10px] text-slate-500 mt-1">
                               Hanya tampilkan untuk exchange ini.
                             </p>
                           </div>
                         </div>
                       </div>

                       {/* Unified Terminal Console */}
                       <div className="bg-slate-900/95 border border-cyan-500/20 rounded-2xl shadow-2xl overflow-hidden">
                         <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                             <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                             <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono ml-2">
                               RabbitMQ Firehose Console Timeline
                             </span>
                           </div>

                           {isTracing && (
                             <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-bold font-mono animate-pulse">
                               <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                               <span>FIREHOSE ACTIVE</span>
                             </span>
                           )}
                         </div>

                         <div
                           ref={terminalRef}
                           className="bg-black p-4 h-[55vh] overflow-y-auto font-mono text-[11px] leading-relaxed select-text space-y-1.5"
                         >
                           {traceLogs.length === 0 ? (
                             <div className="text-slate-600 text-center py-16">
                               Konfigurasi parameter di atas, lalu klik "Start Tracing" untuk memantau traffic real-time dari broker.
                             </div>
                           ) : (
                             traceLogs
                               .filter(log => {
                                 if (log.serverName === 'SYSTEM') return true;

                                 if (messageFilter && !log.rawBody.toLowerCase().includes(messageFilter.toLowerCase())) {
                                   return false;
                                 }
                                 if (queueFilter && !log.rawQueue.toLowerCase().includes(queueFilter.toLowerCase())) {
                                   return false;
                                 }
                                 if (exchangeFilter && !log.rawExchange.toLowerCase().includes(exchangeFilter.toLowerCase())) {
                                   return false;
                                 }

                                 return true;
                               })
                               .map((log, i) => {
                               return (
                                 <div key={i} className="hover:bg-slate-900/40 px-1 rounded transition-colors flex items-start gap-1 font-mono">
                                   <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                                   <span
                                     className="font-extrabold shrink-0 select-none"
                                     style={{
                                       color: (log.type === 'publish' || log.type === 'publish-webhook')
                                         ? '#fbbf24' 
                                         : (log.type === 'deliver' || log.type === 'subscribe-webhook') 
                                         ? '#34d399' 
                                         : '#94a3b8'
                                     }}
                                   >
                                     [{log.serverName}]
                                   </span>
                                   <span
                                     className={`break-all ${
                                       (log.type === 'publish' || log.type === 'publish-webhook')
                                         ? 'text-amber-400 font-bold'
                                         : (log.type === 'deliver' || log.type === 'subscribe-webhook')
                                         ? 'text-emerald-400 font-bold'
                                         : log.type === 'error'
                                         ? 'text-red-400 font-bold'
                                         : 'text-slate-400 italic'
                                     }`}
                                   >
                                     {log.text}
                                   </span>
                                 </div>
                               );
                             })
                           )}
                         </div>
                       </div>
                    </div>
                  )}
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
    </div>
  );
}
