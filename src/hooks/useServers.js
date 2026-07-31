import { useState, useCallback, useEffect } from 'react';
import { fetchServersApi, deleteServerApi, fetchSettingsApi, saveSettingApi } from '../api/vpsApi';

export function useServers() {
  const [servers, setServers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'vps' | 'pod' | 'pod_v3' | 'pod_v2'
  const [searchQuery, setSearchQuery] = useState('');
  const [customOrder, setCustomOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('vps_monitoring_order');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const fetchServers = useCallback(async () => {
    try {
      const data = await fetchServersApi();
      setServers(data);
    } catch (err) {
      console.error('Failed to fetch VPS list:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleMetricsUpdate = useCallback((updatedServers) => {
    setServers(updatedServers);
    setIsLoading(false);
  }, []);

  const handleDeleteServer = async (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus server "${name}" dari monitoring?`)) {
      try {
        await deleteServerApi(id);
        fetchServers();
      } catch (err) {
        console.error('Error deleting server:', err);
      }
    }
  };

  // Save custom order to localStorage & backend SQLite DB
  const saveOrder = (newOrderedList) => {
    const orderIds = newOrderedList.map(s => s.id);
    setCustomOrder(orderIds);
    localStorage.setItem('vps_monitoring_order', JSON.stringify(orderIds));
    saveSettingApi('server_order', JSON.stringify(orderIds));
  };

  const handleReorder = (sourceIndex, destinationIndex, filteredList) => {
    if (sourceIndex === destinationIndex || sourceIndex < 0 || destinationIndex < 0 || destinationIndex >= filteredList.length) return;
    const newList = [...filteredList];
    const [movedItem] = newList.splice(sourceIndex, 1);
    newList.splice(destinationIndex, 0, movedItem);
    saveOrder(newList);
  };

  const handleMoveUp = (index, filteredList) => {
    if (index <= 0) return;
    const newList = [...filteredList];
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;
    saveOrder(newList);
  };

  const handleMoveDown = (index, filteredList) => {
    if (index >= filteredList.length - 1) return;
    const newList = [...filteredList];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;
    saveOrder(newList);
  };

  // Sort servers according to stored customOrder
  const sortedServers = [...servers].sort((a, b) => {
    const idxA = customOrder.indexOf(a.id);
    const idxB = customOrder.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.id - b.id;
  });

  // Filter servers by type, pod_version & searchQuery
  const displayedServers = sortedServers.filter(s => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (s.name || '').toLowerCase().includes(q);
      const hostMatch = (s.host || '').toLowerCase().includes(q);
      const userMatch = (s.username || '').toLowerCase().includes(q);
      const typeMatch = (s.type || '').toLowerCase().includes(q);
      const podVerMatch = (s.pod_version || '').toLowerCase().includes(q);
      const gpuMatch = (s.currentMetrics?.gpu_name || '').toLowerCase().includes(q);

      if (!nameMatch && !hostMatch && !userMatch && !typeMatch && !podVerMatch && !gpuMatch) {
        return false;
      }
    }

    if (filterType === 'vps') return (s.type || 'vps') === 'vps';
    if (filterType === 'pod_v3') return s.type === 'pod' && (s.pod_version === 'v3' || !s.pod_version);
    if (filterType === 'pod_v2') return s.type === 'pod' && s.pod_version === 'v2';
    if (filterType === 'postgresql') return s.type === 'postgresql';
    if (filterType === 'storage') return s.type === 'minio' || s.type === 's3';
    return true; // 'all'
  });

  const vpsCount = servers.filter(s => (s.type || 'vps') === 'vps').length;
  const podV3Count = servers.filter(s => s.type === 'pod' && (s.pod_version === 'v3' || !s.pod_version)).length;
  const podV2Count = servers.filter(s => s.type === 'pod' && s.pod_version === 'v2').length;
  const postgresCount = servers.filter(s => s.type === 'postgresql').length;
  const storageCount = servers.filter(s => s.type === 'minio' || s.type === 's3').length;

  // Sync server order from backend DB on mount
  useEffect(() => {
    fetchServers();
    fetchSettingsApi().then(settings => {
      if (settings && settings.server_order) {
        try {
          const parsed = JSON.parse(settings.server_order);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCustomOrder(parsed);
            localStorage.setItem('vps_monitoring_order', JSON.stringify(parsed));
          }
        } catch (e) {}
      }
    });
  }, [fetchServers]);

  return {
    servers,
    displayedServers,
    isLoading,
    filterType,
    setFilterType,
    searchQuery,
    setSearchQuery,
    vpsCount,
    podV3Count,
    podV2Count,
    postgresCount,
    storageCount,
    fetchServers,
    handleMetricsUpdate,
    handleDeleteServer,
    handleMoveUp,
    handleMoveDown,
    handleReorder
  };
}
