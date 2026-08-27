import React, { useState, useMemo, useEffect } from 'react';
import PodDataHeader from './podDataViewer/PodDataHeader';
import PodDataFilterBar from './podDataViewer/PodDataFilterBar';
import PodDataRowsTable from './podDataViewer/PodDataRowsTable';
import PodColumnsTable from './podDataViewer/PodColumnsTable';
import PodRowInspectModal from './podDataViewer/PodRowInspectModal';

export default function PodDataViewer({
  pod,
  masterInfo,
  loadingPodId = null,
  isLoading = false,
  onInspectPod = null,
  dataMatrix = [],
  columnsMatrix = [],
  podUuidMap = {},
  pods = [],
  onSyncPod,
  onSyncPodToMaster,
  onDeletePodRow,
  onDeleteMultiplePodRows,
  onSyncSingleRowToPod,
  onSyncSinglePodRowToMaster,
  onBulkSyncPodRowsToMaster,
  onQuickSyncSingleRow
}) {
  const [activeSubTab, setActiveSubTab] = useState('data'); // 'data' | 'columns'
  const [dataStatusFilter, setDataStatusFilter] = useState('all'); // 'all' | 'present' | 'missing'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [inspectingRow, setInspectingRow] = useState(null);

  const pkColumn =
    masterInfo?.pkColumn ||
    (columnsMatrix || []).find((c) => c.isPk)?.columnName ||
    'id';

  // Helper to map registerd_at UUID to Server / POD metadata
  const getPodInfoByUuid = (uuid) => {
    if (!uuid) return null;
    if (podUuidMap && podUuidMap[uuid]) return podUuidMap[uuid];
    if (Array.isArray(pods)) {
      const found = pods.find((p) => p.pod_uuid === uuid);
      if (found) return found;
    }
    return null;
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Present count in this POD
  const presentCountInThisPod = useMemo(() => {
    return dataMatrix.filter((item) => Boolean(item.presence?.[pod?.id]?.present)).length;
  }, [dataMatrix, pod?.id]);

  // Missing count in this POD
  const missingCountInThisPod = useMemo(() => {
    return dataMatrix.filter((item) => !item.presence?.[pod?.id]?.present).length;
  }, [dataMatrix, pod?.id]);

  // Filter rows for this specific POD
  const filteredData = useMemo(() => {
    return dataMatrix.filter((item) => {
      const presence = item.presence?.[pod?.id];
      const isPresent = Boolean(presence?.present);

      if (dataStatusFilter === 'present' && !isPresent) return false;
      if (dataStatusFilter === 'missing' && isPresent) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const keyMatch = item.rowKey.toLowerCase().includes(q);
        const sampleMatch = Object.values(item.sampleData || {}).some((val) =>
          String(val || '').toLowerCase().includes(q)
        );
        if (!keyMatch && !sampleMatch) return false;
      }

      return true;
    });
  }, [dataMatrix, pod?.id, dataStatusFilter, searchQuery]);

  // Automatically prune selectedKeys if rows are deleted / removed from dataMatrix
  useEffect(() => {
    setSelectedKeys((prev) => {
      if (!prev || prev.size === 0) return prev;
      const existingKeys = new Set(
        filteredData.map((item) => {
          const pkVal =
            item.sampleData?.[pkColumn] !== undefined ? item.sampleData[pkColumn] : item.rowKey;
          return String(pkVal);
        })
      );
      const next = new Set();
      for (const key of prev) {
        if (existingKeys.has(key)) {
          next.add(key);
        }
      }
      return next.size === prev.size ? prev : next;
    });
  }, [filteredData, pkColumn]);

  // Reset selectedKeys when pod or table changes
  useEffect(() => {
    setSelectedKeys(new Set());
  }, [pod?.id, masterInfo?.tableName]);

  // Prevent background scrolling when inspection modal is open
  useEffect(() => {
    if (inspectingRow) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [inspectingRow]);

  // Selection handlers
  const toggleSelectRow = (key) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
  };

  const isAllFilteredSelected =
    filteredData.length > 0 &&
    filteredData.every((item) => {
      const pkVal =
        item.sampleData?.[pkColumn] !== undefined ? String(item.sampleData[pkColumn]) : item.rowKey;
      return selectedKeys.has(pkVal);
    });

  const isSomeFilteredSelected = filteredData.some((item) => {
    const pkVal =
      item.sampleData?.[pkColumn] !== undefined ? String(item.sampleData[pkColumn]) : item.rowKey;
    return selectedKeys.has(pkVal);
  });

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const next = new Set(selectedKeys);
      filteredData.forEach((item) => {
        const pkVal =
          item.sampleData?.[pkColumn] !== undefined
            ? String(item.sampleData[pkColumn])
            : item.rowKey;
        next.delete(pkVal);
      });
      setSelectedKeys(next);
    } else {
      const next = new Set(selectedKeys);
      filteredData.forEach((item) => {
        const pkVal =
          item.sampleData?.[pkColumn] !== undefined
            ? String(item.sampleData[pkColumn])
            : item.rowKey;
        next.add(pkVal);
      });
      setSelectedKeys(next);
    }
  };

  const clearSelection = () => setSelectedKeys(new Set());

  // Handle Bulk Delete in POD
  const handleBulkDeletePod = () => {
    if (selectedKeys.size === 0) return;
    const pkValues = Array.from(selectedKeys);
    if (onDeleteMultiplePodRows) {
      onDeleteMultiplePodRows({
        targetType: 'pod',
        serverId: pod?.id,
        serverName: pod?.name,
        tableName: masterInfo?.tableName,
        pkColumn,
        pkValues
      });
    } else if (onDeletePodRow) {
      onDeletePodRow({
        serverId: pod?.id,
        serverName: pod?.name,
        pkColumn,
        pkValues
      });
    }
    clearSelection();
  };

  const hasBeenCompared = Boolean(
    pod && pod.tableExists !== null && pod.rowCount !== null && pod.status !== 'NOT_LOADED'
  );

  // If not ready, PodDataHeader displays the empty / loading / offline / uncompared state
  if (!pod || isLoading || (loadingPodId && String(loadingPodId) === String(pod?.id)) || !hasBeenCompared || !pod?.isOnline) {
    return (
      <PodDataHeader
        pod={pod}
        masterInfo={masterInfo}
        isLoading={isLoading}
        loadingPodId={loadingPodId}
        onInspectPod={onInspectPod}
        onSyncPod={onSyncPod}
        onSyncPodToMaster={onSyncPodToMaster}
      />
    );
  }

  return (
    <div className="bg-slate-900/80 border border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-4">
      {/* 1. Header Bar: POD Status & Actions */}
      <PodDataHeader
        pod={pod}
        masterInfo={masterInfo}
        isLoading={isLoading}
        loadingPodId={loadingPodId}
        onInspectPod={onInspectPod}
        onSyncPod={onSyncPod}
        onSyncPodToMaster={onSyncPodToMaster}
      />

      {/* 2. Sub-Tabs & Filter Bar */}
      <PodDataFilterBar
        pod={pod}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        dataMatrix={dataMatrix}
        columnsMatrix={columnsMatrix}
        dataStatusFilter={dataStatusFilter}
        setDataStatusFilter={setDataStatusFilter}
        presentCountInThisPod={presentCountInThisPod}
        missingCountInThisPod={missingCountInThisPod}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedKeys={selectedKeys}
        filteredData={filteredData}
        pkColumn={pkColumn}
        onBulkSyncPodRowsToMaster={onBulkSyncPodRowsToMaster}
        handleBulkDeletePod={handleBulkDeletePod}
        clearSelection={clearSelection}
      />

      {/* 3. Sub-Tab 1: Data Rows Table */}
      {activeSubTab === 'data' && (
        <PodDataRowsTable
          pod={pod}
          filteredData={filteredData}
          dataStatusFilter={dataStatusFilter}
          selectedKeys={selectedKeys}
          toggleSelectRow={toggleSelectRow}
          toggleSelectAllFiltered={toggleSelectAllFiltered}
          isAllFilteredSelected={isAllFilteredSelected}
          isSomeFilteredSelected={isSomeFilteredSelected}
          pkColumn={pkColumn}
          copiedKey={copiedKey}
          handleCopy={handleCopy}
          onSyncSinglePodRowToMaster={onSyncSinglePodRowToMaster}
          onDeletePodRow={onDeletePodRow}
          onSyncSingleRowToPod={onSyncSingleRowToPod}
          setInspectingRow={setInspectingRow}
        />
      )}

      {/* 4. Sub-Tab 2: Columns DDL Schema Table */}
      {activeSubTab === 'columns' && (
        <PodColumnsTable pod={pod} columnsMatrix={columnsMatrix} />
      )}

      {/* 5. Row Inspect Modal (Portal) */}
      <PodRowInspectModal
        inspectingRow={inspectingRow}
        setInspectingRow={setInspectingRow}
        pod={pod}
        masterInfo={masterInfo}
        pkColumn={pkColumn}
        getPodInfoByUuid={getPodInfoByUuid}
        onSyncSingleRowToPod={onSyncSingleRowToPod}
      />
    </div>
  );
}
