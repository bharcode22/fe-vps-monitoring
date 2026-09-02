import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, RefreshCw, Zap, CheckCircle2 } from 'lucide-react';
import { fetchPodTopicMatrixApi, syncPodTopicsApi } from '../api/podTopicApi';
import PodTopicSkeleton from '../components/podTopic/PodTopicSkeleton';
import PodTopicStatsCards from '../components/podTopic/PodTopicStatsCards';
import PodTopicToolbar from '../components/podTopic/PodTopicToolbar';
import PodTopicMatrixTable from '../components/podTopic/PodTopicMatrixTable';
import PodTopicSyncModal from '../components/podTopic/PodTopicSyncModal';
import { useLanguage } from '../context/LanguageContext';

export default function PodTopicDebuggerPage({ onBack }) {
  const { t } = useLanguage();
  const [matrixData, setMatrixData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Matrix Filter States
  const [topicTypeFilter, setTopicTypeFilter] = useState('pod_topic'); // 'pod_topic' | 'socket_topic'
  const [onlyMissingFilter, setOnlyMissingFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourcePodId, setSourcePodId] = useState('');

  // Sync Modal State
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncTargetPodIds, setSyncTargetPodIds] = useState([]);
  const [syncTopicKeys, setSyncTopicKeys] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Copy helper
  const [copiedKey, setCopiedKey] = useState(null);
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Load Matrix Data directly from PostgreSQL <100ms
  const loadMatrix = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchPodTopicMatrixApi();
      setMatrixData(data);
      if (data.pods && data.pods.length > 0) {
        const firstOnline = data.pods.find(p => p.isOnline !== false && p.success);
        if (firstOnline) {
          if (!sourcePodId) setSourcePodId(firstOnline.id);
        } else {
          if (!sourcePodId) setSourcePodId(data.pods[0].id);
        }
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat matriks topic POD.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, []);

  // Filtered Matrix List
  const activeMatrixList = useMemo(() => {
    const list = topicTypeFilter === 'socket_topic'
      ? (matrixData?.socketTopicMatrix || [])
      : (matrixData?.podTopicMatrix || []);

    return list.filter(item => {
      const key = (item.topicKey || item.socketKey || '').toLowerCase();
      const desc = (item.sampleRow?.description || '').toLowerCase();
      const type = (item.sampleRow?.type || '').toLowerCase();

      // Calculate whether this item is missing in at least 1 online POD
      const isMissingInOnline = matrixData?.pods?.some(
        pod => pod.isOnline !== false && !item.presence?.[pod.id]?.present
      );

      if (onlyMissingFilter && !isMissingInOnline) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!key.includes(q) && !desc.includes(q) && !type.includes(q)) return false;
      }
      return true;
    });
  }, [matrixData, topicTypeFilter, onlyMissingFilter, searchQuery]);

  // Dynamic count of missing topics in active view
  const currentMissingCount = useMemo(() => {
    const list = topicTypeFilter === 'socket_topic'
      ? (matrixData?.socketTopicMatrix || [])
      : (matrixData?.podTopicMatrix || []);

    return list.filter(item => {
      return matrixData?.pods?.some(
        pod => pod.isOnline !== false && !item.presence?.[pod.id]?.present
      );
    }).length;
  }, [matrixData, topicTypeFilter]);

  // Overall missing count across both pod_topics and socket_topics
  const overallMissingCount = useMemo(() => {
    let count = 0;
    const check = (list) => {
      (list || []).forEach(item => {
        const isMissing = matrixData?.pods?.some(
          pod => pod.isOnline !== false && !item.presence?.[pod.id]?.present
        );
        if (isMissing) count++;
      });
    };
    check(matrixData?.podTopicMatrix);
    check(matrixData?.socketTopicMatrix);
    return count;
  }, [matrixData]);

  // Execute 1-Click Sync
  const handlePerformSync = async () => {
    if (!sourcePodId || syncTargetPodIds.length === 0) {
      setError('Pilih POD Sumber dan minimal satu POD Target yang online.');
      return;
    }

    setIsSyncing(true);
    setError('');
    try {
      const res = await syncPodTopicsApi({
        sourceServerId: sourcePodId,
        targetServerIds: syncTargetPodIds,
        topicKeys: syncTopicKeys,
        type: topicTypeFilter === 'socket_topic' ? 'socket_topics' : 'pod_topics'
      });

      setSuccessMsg(`Berhasil sinkronisasi ${res.data?.rowsCount || 0} topic ke ${syncTargetPodIds.length} POD target!`);
      setSyncModalOpen(false);
      await loadMatrix();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Gagal melakukan sinkronisasi topic.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Quick Sync Single Topic Trigger (only target online pods)
  const triggerQuickSyncTopic = (topicKey, missingPodIds) => {
    const onlineMissingPodIds = (missingPodIds || []).filter(id => {
      const pod = matrixData?.pods?.find(p => String(p.id) === String(id));
      return pod && pod.isOnline !== false;
    });

    if (onlineMissingPodIds.length === 0) {
      setError(`POD yang kekurangan topic ini sedang OFFLINE. Pastikan server POD menyala terlebih dahulu.`);
      return;
    }

    setSyncTopicKeys([topicKey]);
    setSyncTargetPodIds(onlineMissingPodIds);
    setSyncModalOpen(true);
  };

  // Trigger Bulk Missing Topics Sync (only targets online pods)
  const triggerBulkSyncMissing = () => {
    if (!matrixData) return;
    const currentList = topicTypeFilter === 'socket_topic' ? matrixData.socketTopicMatrix : matrixData.podTopicMatrix;
    const missingKeys = [];
    const missingPodIds = new Set();

    currentList.forEach(item => {
      const rowMissingPodIds = [];
      matrixData?.pods?.forEach(pod => {
        if (pod.isOnline !== false && !item.presence?.[pod.id]?.present) {
          rowMissingPodIds.push(pod.id);
          missingPodIds.add(Number(pod.id) || pod.id);
        }
      });
      if (rowMissingPodIds.length > 0) {
        missingKeys.push(item.topicKey || item.socketKey);
      }
    });

    if (missingKeys.length === 0 || missingPodIds.size === 0) {
      setError('Seluruh POD yang online sudah memiliki data topic lengkap.');
      return;
    }

    setSyncTopicKeys(missingKeys);
    setSyncTargetPodIds(Array.from(missingPodIds));
    setSyncModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 text-slate-100 w-full">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                POD Topic &amp; Database Matrix
              </h1>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                POD V3
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Audit Konsistensi Database <code className="font-mono text-cyan-300">regenesis</code> (<code className="text-cyan-300">pod_topics</code> &amp; <code className="text-purple-300">socket_topics</code>)
            </p>
          </div>
        </div>

        {/* Action Button: Refresh & Global Quick Sync */}
        <div className="flex items-center gap-3">
          {overallMissingCount > 0 && (
            <button
              onClick={triggerBulkSyncMissing}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <Zap size={15} className="fill-slate-950" />
              <span>Sync Semua ({overallMissingCount} Topic Kurang)</span>
            </button>
          )}

          <button
            onClick={loadMatrix}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer shadow-sm"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Muat Ulang Matriks</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 bg-red-500/15 border border-red-500/30 text-red-300 rounded-2xl text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-white font-bold ml-2">Tutup</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={16} /> {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white font-bold ml-2">Tutup</button>
        </div>
      )}

      {/* RENDER SKELETON LOADER OR REAL MATRIX */}
      {isLoading ? (
        <PodTopicSkeleton />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Summary Stat Cards */}
          <PodTopicStatsCards
            summary={matrixData?.summary}
            overallMissingCount={overallMissingCount}
            onBulkSync={triggerBulkSyncMissing}
          />

          {/* Matrix Toolbar Controls */}
          <PodTopicToolbar
            topicTypeFilter={topicTypeFilter}
            setTopicTypeFilter={setTopicTypeFilter}
            onlyMissingFilter={onlyMissingFilter}
            setOnlyMissingFilter={setOnlyMissingFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            currentMissingCount={currentMissingCount}
            totalPodTopics={matrixData?.summary?.totalPodTopics}
            totalSocketTopics={matrixData?.summary?.totalSocketTopics}
            onBulkSync={triggerBulkSyncMissing}
          />

          {/* Matrix Table */}
          <PodTopicMatrixTable
            activeMatrixList={activeMatrixList}
            pods={matrixData?.pods}
            topicTypeFilter={topicTypeFilter}
            copiedKey={copiedKey}
            onCopy={handleCopy}
            onQuickSyncTopic={triggerQuickSyncTopic}
          />
        </div>
      )}

      {/* SINKRONISASI MODAL */}
      <PodTopicSyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        sourcePodId={sourcePodId}
        setSourcePodId={setSourcePodId}
        syncTargetPodIds={syncTargetPodIds}
        setSyncTargetPodIds={setSyncTargetPodIds}
        syncTopicKeys={syncTopicKeys}
        topicTypeFilter={topicTypeFilter}
        pods={matrixData?.pods}
        isSyncing={isSyncing}
        onPerformSync={handlePerformSync}
      />
    </div>
  );
}
