import { useState, useEffect, useCallback } from 'react';
import {
  fetchMasterDatabasesApi,
  fetchMasterTablesApi,
  fetchFleetAuditApi
} from '../../../api/masterPodSyncApi';

/**
 * Custom hook to manage Master Databases, Table Catalog, and Fleet Disparity Audit.
 */
export function useMasterPodCatalog({ viewMode, onError }) {
  const [masterDatabases, setMasterDatabases] = useState([]);
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [tables, setTables] = useState([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // 1. Fetch Master Databases on Mount
  useEffect(() => {
    fetchMasterDatabasesApi()
      .then(dbs => {
        setMasterDatabases(dbs || []);
        if (dbs && dbs.length > 0) {
          setSelectedMasterId(String(dbs[0].id));
        }
      })
      .catch(err => {
        if (typeof onError === 'function') {
          onError(err.message || 'Gagal memuat Database Master.');
        }
      });
  }, [onError]);

  // 2. Fetch Tables when Master DB changes
  const loadMasterTables = useCallback(async (masterId) => {
    const targetId = masterId || selectedMasterId;
    if (!targetId) {
      setTables([]);
      return;
    }

    setIsLoadingTables(true);
    try {
      const res = await fetchMasterTablesApi(targetId);
      setTables(res.tables || []);
    } catch (err) {
      if (typeof onError === 'function') {
        onError(err.message || 'Gagal memuat daftar tabel master.');
      }
    } finally {
      setIsLoadingTables(false);
    }
  }, [selectedMasterId, onError]);

  // 2B. Fetch Fleet Audit Data across all tables & PODs
  const loadFleetAudit = useCallback(async (masterId) => {
    const targetId = masterId || selectedMasterId;
    if (!targetId) return;

    setIsLoadingAudit(true);
    try {
      const data = await fetchFleetAuditApi(targetId);
      setAuditData(data);
    } catch (err) {
      if (typeof onError === 'function') {
        onError(err.message || 'Gagal memindai disparitas armada.');
      }
    } finally {
      setIsLoadingAudit(false);
    }
  }, [selectedMasterId, onError]);

  // Trigger loading when selectedMasterId or viewMode changes
  useEffect(() => {
    if (selectedMasterId) {
      loadMasterTables(selectedMasterId);
      if (viewMode === 'audit') {
        loadFleetAudit(selectedMasterId);
      }
    }
  }, [selectedMasterId, viewMode, loadMasterTables, loadFleetAudit]);

  return {
    masterDatabases,
    selectedMasterId,
    setSelectedMasterId,
    tables,
    isLoadingTables,
    loadMasterTables,
    auditData,
    isLoadingAudit,
    loadFleetAudit
  };
}
