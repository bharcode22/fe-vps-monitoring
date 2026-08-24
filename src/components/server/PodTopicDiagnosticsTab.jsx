import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Copy, Check, Search, Layers } from 'lucide-react';
import { fetchPodTopicDetailApi } from '../../api/podTopicApi';

export default function PodTopicDiagnosticsTab({ serverId }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('pod_topic'); // 'pod_topic' | 'socket_topic'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchPodTopicDetailApi(serverId);
      setData(res);
    } catch (err) {
      setError(err.message || 'Gagal mengambil data topic database POD.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (serverId) loadData();
  }, [serverId]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
        <RefreshCw size={24} className="animate-spin text-cyan-400" />
        <span className="text-xs font-mono">Membaca tabel pod_topics &amp; socket_topics dari database regenesis...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex flex-col gap-2">
        <div className="flex items-center gap-2 font-bold text-red-400">
          <XCircle size={16} />
          <span>Gagal Mengambil Data Database POD</span>
        </div>
        <p className="font-mono">{error}</p>
        <button
          onClick={loadData}
          className="self-start px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-xs font-semibold mt-2 cursor-pointer transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const podTopics = (data?.podTopics || []).filter(t => {
    const key = (t.topic || t.topic_name || t.name || '').toLowerCase();
    return !searchQuery || key.includes(searchQuery.toLowerCase());
  });

  const socketTopics = (data?.socketTopics || []).filter(t => {
    const key = (t.topic || t.topic_name || t.event || '').toLowerCase();
    return !searchQuery || key.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Sub Tabs Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('pod_topic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'pod_topic'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            pod_topics ({data?.podTopics?.length || 0})
          </button>

          <button
            onClick={() => setActiveSubTab('socket_topic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'socket_topic'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            socket_topics ({data?.socketTopics?.length || 0})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Cari topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none w-44"
            />
          </div>

          <button
            onClick={loadData}
            title="Muat ulang dari database"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* View 1: POD TOPICS (MQTT) */}
      {activeSubTab === 'pod_topic' && (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                <th className="p-2.5">Topic</th>
                <th className="p-2.5">Type / Action</th>
                <th className="p-2.5">Deskripsi</th>
                <th className="p-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {podTopics.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-500">Tidak ada topic pod_topics ditemukan.</td>
                </tr>
              ) : (
                podTopics.map((row, idx) => {
                  const topicName = row.topic || row.topic_name || row.name || '';
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="p-2.5 font-bold text-cyan-400">{topicName}</td>
                      <td className="p-2.5 text-slate-300 font-sans">{row.type || row.action || '-'}</td>
                      <td className="p-2.5 text-slate-400 font-sans">{row.description || '-'}</td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => handleCopy(topicName, `p_${idx}`)}
                          className="p-1 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {copiedKey === `p_${idx}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* View 2: SOCKET TOPICS (WebSockets) */}
      {activeSubTab === 'socket_topic' && (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                <th className="p-2.5">Socket Event</th>
                <th className="p-2.5">Deskripsi / Mapping</th>
                <th className="p-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {socketTopics.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-slate-500">Tidak ada socket topic ditemukan.</td>
                </tr>
              ) : (
                socketTopics.map((row, idx) => {
                  const eventName = row.event || row.topic || row.name || '';
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="p-2.5 font-bold text-purple-400">{eventName}</td>
                      <td className="p-2.5 text-slate-400">{row.description || row.action || '-'}</td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => handleCopy(eventName, `s_${idx}`)}
                          className="p-1 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {copiedKey === `s_${idx}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
