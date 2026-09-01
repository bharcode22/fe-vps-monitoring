import React, { useState, useEffect, useMemo } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config';
import {
  fetchPodActivityStatusApi,
  simulatePodActivityApi,
  reconnectPodActivityApi
} from '../api/podActivityApi';

// Modular Components
import PodActivityHeader from '../components/podActivity/PodActivityHeader';
import PodActivityKpiCards from '../components/podActivity/PodActivityKpiCards';
import PodActivitySimulatorPanel from '../components/podActivity/PodActivitySimulatorPanel';
import PodActivityToolbar from '../components/podActivity/PodActivityToolbar';
import PodActivityCardGrid from '../components/podActivity/PodActivityCardGrid';
import PodActivityTableView from '../components/podActivity/PodActivityTableView';
import PodActivityDetailPage from '../components/podActivity/PodActivityDetailPage';

export default function PodActivityPage({ onBack }) {
  const [data, setData] = useState({ summary: {}, pods: [], recentLogs: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // UI Filter & View states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'OCCUPIED' | 'VACANT'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [showSimulator, setShowSimulator] = useState(false);
  const [showMqttFeed, setShowMqttFeed] = useState(false);
  const [recentFlashPodId, setRecentFlashPodId] = useState(null);
  const [selectedPodForTopicModal, setSelectedPodForTopicModal] = useState(() => {
    try {
      const saved = sessionStorage.getItem('vps_monitoring_selected_pod');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    if (selectedPodForTopicModal) {
      sessionStorage.setItem('vps_monitoring_selected_pod', JSON.stringify(selectedPodForTopicModal));
    } else {
      sessionStorage.removeItem('vps_monitoring_selected_pod');
    }
  }, [selectedPodForTopicModal]);

  // Live raw MQTT log feed
  const [mqttActivityFeed, setMqttActivityFeed] = useState([]);

  // Live timer tick for real-time elapsed seconds update
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial Data Load
  useEffect(() => {
    loadStatus();
  }, []);

  // Socket.io Real-time Event Subscriptions
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      setIsSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    // When full initial state is delivered
    socket.on('pod-activity:initial', (initialData) => {
      if (initialData) {
        setData(initialData);
        setIsLoading(false);
      }
    });

    // When a single POD changes occupancy state (0 -> 1 or 1 -> 0)
    socket.on('pod-activity:state-changed', (eventPayload) => {
      const { pod, log, summary } = eventPayload || {};
      if (!pod) return;

      setRecentFlashPodId(pod.id);
      setTimeout(() => setRecentFlashPodId(null), 3000);

      setSelectedPodForTopicModal((prevSelected) => {
        if (prevSelected && prevSelected.id === pod.id) {
          return { ...prevSelected, ...pod };
        }
        return prevSelected;
      });

      setData((prev) => {
        const existingPods = prev.pods || [];
        const index = existingPods.findIndex((p) => p.id === pod.id);

        let updatedPods = [];
        if (index >= 0) {
          updatedPods = [...existingPods];
          updatedPods[index] = { ...updatedPods[index], ...pod };
        } else {
          updatedPods = [...existingPods, pod];
        }

        const existingLogs = prev.recentLogs || [];
        const updatedLogs = log ? [log, ...existingLogs.slice(0, 100)] : existingLogs;

        return {
          ...prev,
          summary: summary || prev.summary,
          pods: updatedPods,
          recentLogs: updatedLogs
        };
      });
    });

    // When a broker connection status changes
    socket.on('pod-activity:broker-status', ({ serverId, connected }) => {
      setData((prev) => {
        const pods = (prev.pods || []).map((p) =>
          p.id === serverId ? { ...p, brokerConnected: connected } : p
        );
        return { ...prev, pods };
      });
    });

    // When raw MQTT log stream is received
    socket.on('pod-activity:mqtt-log', (logEntry) => {
      setMqttActivityFeed((prev) => [logEntry, ...prev].slice(0, 200));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadStatus = async () => {
    setIsRefreshing(true);
    setError('');
    try {
      const res = await fetchPodActivityStatusApi();
      setData(res);
    } catch (err) {
      setError(err.message || 'Gagal memuat status aktivitas POD');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleReconnectMqtt = async () => {
    setIsRefreshing(true);
    try {
      const res = await reconnectPodActivityApi();
      if (res.data) setData(res.data);
      setActionSuccess('Berhasil menghubungkan ulang subscriber MQTT ke seluruh POD V3!');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      alert(`Gagal menghubungkan broker MQTT: ${err.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSimulate = async (serverId, value) => {
    try {
      const res = await simulatePodActivityApi(serverId, value, 'mod_chair/pob_state');
      setActionSuccess(res.message);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      alert(`Simulasi gagal: ${err.message}`);
    }
  };

  // Format elapsed duration (e.g. "14m 23s" or "1j 05m 12s")
  const formatDuration = (lastChangedAt) => {
    if (!lastChangedAt) return 'Menunggu event...';
    const elapsedSeconds = Math.max(
      0,
      Math.floor((nowTimestamp - new Date(lastChangedAt).getTime()) / 1000)
    );

    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    if (hours > 0) {
      return `${hours}j ${minutes < 10 ? '0' : ''}${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
    }
    return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  };

  // Filtered Pods
  const filteredPods = useMemo(() => {
    const pods = data.pods || [];
    return pods.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.host && p.host.toLowerCase().includes(q)) ||
        (p.code && String(p.code).toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (activeTab === 'OCCUPIED') return p.stateValue === 1;
      if (activeTab === 'VACANT') return p.stateValue === 0;
      if (activeTab === 'UNKNOWN') return p.stateValue === null;
      return true;
    });
  }, [data.pods, searchQuery, activeTab]);

  const summary = data.summary || {};
  const totalPods = summary.totalPods || (data.pods || []).length;
  const occupiedCount =
    summary.occupiedCount !== undefined
      ? summary.occupiedCount
      : (data.pods || []).filter((p) => p.stateValue === 1).length;
  const vacantCount =
    summary.vacantCount !== undefined
      ? summary.vacantCount
      : (data.pods || []).filter((p) => p.stateValue === 0).length;
  const brokersConnected =
    summary.brokersConnected !== undefined
      ? summary.brokersConnected
      : (data.pods || []).filter((p) => p.brokerConnected).length;

  if (selectedPodForTopicModal) {
    return (
      <PodActivityDetailPage
        pod={selectedPodForTopicModal}
        onBack={() => setSelectedPodForTopicModal(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1700px] mx-auto px-2 sm:px-4 lg:px-6 py-4 animate-in fade-in duration-200">
      {/* 1. Header & Actions */}
      <PodActivityHeader
        isSocketConnected={isSocketConnected}
        showSimulator={showSimulator}
        onToggleSimulator={() => setShowSimulator((prev) => !prev)}
        isRefreshing={isRefreshing}
        onReconnectMqtt={handleReconnectMqtt}
        onRefresh={loadStatus}
        actionSuccess={actionSuccess}
        error={error}
      />

      {/* 2. Top KPI Metric Cards */}
      <PodActivityKpiCards
        isLoading={isLoading}
        totalPods={totalPods}
        occupiedCount={occupiedCount}
        vacantCount={vacantCount}
        brokersConnected={brokersConnected}
      />

      {/* 3. Simulator Test Panel (Collapsible) */}
      <PodActivitySimulatorPanel
        showSimulator={showSimulator}
        pods={data.pods || []}
        onSimulate={handleSimulate}
      />

      {/* 4. Filter Toolbar */}
      <PodActivityToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalPods={totalPods}
        occupiedCount={occupiedCount}
        vacantCount={vacantCount}
        showMqttFeed={showMqttFeed}
        onToggleMqttFeed={() => setShowMqttFeed(!showMqttFeed)}
      />

      {/* 5. Main View: Live Cards Grid or Table */}
      {viewMode === 'cards' ? (
        <PodActivityCardGrid
          isLoading={isLoading}
          filteredPods={filteredPods}
          recentFlashPodId={recentFlashPodId}
          formatDuration={formatDuration}
          onSelectPod={setSelectedPodForTopicModal}
        />
      ) : (
        <PodActivityTableView
          filteredPods={filteredPods}
          formatDuration={formatDuration}
          onSelectPod={setSelectedPodForTopicModal}
        />
      )}
    </div>
  );
}
