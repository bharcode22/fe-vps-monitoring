/**
 * Pure immutable state updater functions for Master Multi-POD Matrix Data.
 * Decoupled from React lifecycle to enable zero-delay optimistic updates and easy testing.
 */

/**
 * Merges single POD comparison results into current matrix state
 */
export function mergeSinglePodComparison(prev, podId, result) {
  if (!prev || !result?.success || !result.podSummary) return prev;

  // 1. Update pods array
  const updatedPods = (prev.pods || []).map(p => {
    if (String(p.id) === String(podId)) {
      return { ...p, ...result.podSummary, hasCompared: true };
    }
    return p;
  });

  // 2. Update columnsMatrix
  const updatedColumns = (prev.columnsMatrix || []).map(col => {
    const colPresence = result.columnPresenceMap?.[col.columnName] || { isOnline: false, exists: false, typeMatch: false };
    return {
      ...col,
      presence: {
        ...(col.presence || {}),
        [podId]: colPresence
      }
    };
  });

  // 3. Update dataMatrix presence
  const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
    const presence = result.dataPresenceMap?.[item.rowKey] || { isOnline: false, present: false };
    return {
      ...item,
      presence: {
        ...(item.presence || {}),
        [podId]: presence
      }
    };
  });

  // 4. Append any podOnlyRows if not already present
  if (result.podOnlyRows && result.podOnlyRows.length > 0) {
    const existingKeys = new Set(updatedDataMatrix.map(d => d.rowKey));
    result.podOnlyRows.forEach(por => {
      if (!existingKeys.has(por.rowKey)) {
        updatedDataMatrix.push(por);
      }
    });
  }

  // 5. Recalculate summary for loaded pods
  const onlinePods = updatedPods.filter(p => p.isOnline).length;
  const syncedPods = updatedPods.filter(p => p.status === 'SYNCED').length;
  const mismatchPods = updatedPods.filter(p => p.isOnline && p.status !== 'SYNCED' && p.status !== 'NOT_LOADED').length;

  return {
    ...prev,
    pods: updatedPods,
    columnsMatrix: updatedColumns,
    dataMatrix: updatedDataMatrix,
    summary: {
      ...prev.summary,
      onlinePods,
      syncedPods,
      mismatchPods
    }
  };
}

/**
 * Optimistic update after bulk table sync from Master to PODs
 */
export function applyOptimisticBulkSync(prev, successfulTargetIdsInput, syncColumns = true) {
  if (!prev) return prev;
  const successfulTargetIds = new Set(
    Array.from(successfulTargetIdsInput || []).map(Number)
  );
  if (successfulTargetIds.size === 0) return prev;

  const masterRowCount = prev.master?.rowCount || 0;

  // 1. Update POD status & row count
  const updatedPods = (prev.pods || []).map(p => {
    if (successfulTargetIds.has(Number(p.id))) {
      return {
        ...p,
        status: 'SYNCED',
        rowCount: masterRowCount
      };
    }
    return p;
  });

  // 2. Update presence for Master rows in dataMatrix
  const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
    if (item.inMaster) {
      const updatedPresence = { ...(item.presence || {}) };
      let newPresentCount = item.presentCount || 0;
      for (const pId of successfulTargetIds) {
        if (!updatedPresence[pId] || !updatedPresence[pId].present) {
          updatedPresence[pId] = { isOnline: true, present: true };
          newPresentCount++;
        }
      }
      return {
        ...item,
        presence: updatedPresence,
        presentCount: Math.min(newPresentCount, prev.pods?.length || newPresentCount)
      };
    }
    return item;
  });

  // 3. Update columns presence if syncColumns was enabled
  const updatedColumns = (prev.columns || []).map(col => {
    if (!syncColumns) return col;
    const updatedColPresence = { ...(col.presence || {}) };
    let colPresentCount = col.presentCount || 0;
    for (const pId of successfulTargetIds) {
      if (!updatedColPresence[pId] || !updatedColPresence[pId].exists) {
        updatedColPresence[pId] = {
          isOnline: true,
          exists: true,
          typeMatch: true,
          podType: col.dataType
        };
        colPresentCount++;
      }
    }
    return {
      ...col,
      presence: updatedColPresence,
      presentCount: Math.min(colPresentCount, prev.pods?.length || colPresentCount)
    };
  });

  return {
    ...prev,
    pods: updatedPods,
    dataMatrix: updatedDataMatrix,
    columns: updatedColumns
  };
}

/**
 * Optimistic update when editing a Master row field
 */
export function applyOptimisticMasterRowUpdate(prev, pkColumn, pkValue, updatedFields) {
  if (!prev) return prev;
  const strVal = String(pkValue);
  const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
    const currentPk = item.sampleData?.[pkColumn] !== undefined ? item.sampleData[pkColumn] : item.rowKey;
    if (String(currentPk) === strVal) {
      return {
        ...item,
        sampleData: {
          ...(item.sampleData || {}),
          ...updatedFields
        }
      };
    }
    return item;
  });
  return {
    ...prev,
    dataMatrix: updatedDataMatrix
  };
}

/**
 * Optimistic update when deleting rows from Master Database
 */
export function applyOptimisticMasterDelete(prev, pkColumn, valuesToDelete, deletedCount = 0) {
  if (!prev) return prev;
  const keysSet = new Set((valuesToDelete || []).map(String));
  const count = deletedCount || keysSet.size;

  const updatedDataMatrix = (prev.dataMatrix || []).filter(item => {
    const pkVal = item.sampleData?.[pkColumn] !== undefined ? item.sampleData[pkColumn] : item.rowKey;
    return !keysSet.has(String(pkVal));
  });

  const updatedPods = (prev.pods || []).map(p => ({
    ...p,
    rowCount: Math.max(0, (p.rowCount || 0) - count)
  }));

  return {
    ...prev,
    master: {
      ...prev.master,
      rowCount: Math.max(0, (prev.master?.rowCount || 0) - count)
    },
    pods: updatedPods,
    dataMatrix: updatedDataMatrix
  };
}

/**
 * Optimistic update when deleting rows from specific POD(s)
 */
export function applyOptimisticPodDelete(prev, pkColumn, valuesToDelete, targetIds, deletedCount = 0) {
  if (!prev) return prev;
  const keysSet = new Set((valuesToDelete || []).map(String));
  const targetIdsSet = new Set((targetIds || []).map(Number));
  const count = deletedCount || keysSet.size;

  const updatedDataMatrix = (prev.dataMatrix || []).filter(item => {
    const pkVal = item.sampleData?.[pkColumn] !== undefined ? item.sampleData[pkColumn] : item.rowKey;
    const key = String(pkVal);

    if (keysSet.has(key)) {
      if (item.isPodOnly || !item.inMaster) {
        return false;
      }
      if (item.presence) {
        for (const sId of targetIdsSet) {
          if (item.presence[sId] && item.presence[sId].present) {
            item.presence[sId] = { isOnline: true, present: false };
            item.presentCount = Math.max(0, (item.presentCount || 1) - 1);
          }
        }
      }
    }
    return true;
  });

  const updatedPods = (prev.pods || []).map(p => {
    if (targetIdsSet.has(Number(p.id))) {
      return {
        ...p,
        rowCount: Math.max(0, (p.rowCount || 0) - count)
      };
    }
    return p;
  });

  return {
    ...prev,
    pods: updatedPods,
    dataMatrix: updatedDataMatrix
  };
}

/**
 * Optimistic update when syncing a single row from Master to POD(s)
 */
export function applyOptimisticSingleRowMasterToPod(prev, pkColumn, pkValue, targetPodIds) {
  if (!prev) return prev;
  const targetSet = new Set((targetPodIds || []).map(Number));
  const strKey = String(pkValue);

  const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
    const pkVal = item.sampleData?.[pkColumn] !== undefined ? item.sampleData[pkColumn] : item.rowKey;
    if (String(pkVal) === strKey) {
      const updatedPresence = { ...(item.presence || {}) };
      let count = item.presentCount || 0;
      for (const pId of targetSet) {
        if (!updatedPresence[pId] || !updatedPresence[pId].present) {
          updatedPresence[pId] = { isOnline: true, present: true };
          count++;
        }
      }
      return {
        ...item,
        presence: updatedPresence,
        presentCount: Math.min(count, prev.pods?.length || count)
      };
    }
    return item;
  });

  const updatedPods = (prev.pods || []).map(p => {
    if (targetSet.has(Number(p.id))) {
      return {
        ...p,
        rowCount: (p.rowCount || 0) + 1
      };
    }
    return p;
  });

  return {
    ...prev,
    pods: updatedPods,
    dataMatrix: updatedDataMatrix
  };
}

/**
 * Optimistic update when pulling all data from a POD into Master DB
 */
export function applyOptimisticPodToMasterSync(prev, targetPodId) {
  if (!prev) return prev;
  const targetId = Number(targetPodId);
  let addedToMasterCount = 0;

  const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
    if (item.presence?.[targetId]?.present) {
      if (!item.inMaster) {
        addedToMasterCount++;
      }
      return {
        ...item,
        inMaster: true,
        isPodOnly: false
      };
    }
    return item;
  });

  return {
    ...prev,
    master: {
      ...prev.master,
      rowCount: (prev.master?.rowCount || 0) + addedToMasterCount
    },
    dataMatrix: updatedDataMatrix
  };
}

/**
 * Optimistic update when uploading a single POD-only row to Master DB
 */
export function applyOptimisticSinglePodRowToMaster(prev, pkColumn, pkValue) {
  if (!prev) return prev;
  const strKey = String(pkValue);

  const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
    const itemKey = String(item.rowKey || '');
    const samplePk = item.sampleData && pkColumn && item.sampleData[pkColumn] !== undefined ? String(item.sampleData[pkColumn]) : '';
    const sampleId = item.sampleData && item.sampleData.id !== undefined ? String(item.sampleData.id) : '';
    const sampleKey = item.sampleData && item.sampleData.key !== undefined ? String(item.sampleData.key) : '';
    const sampleTopic = item.sampleData && item.sampleData.topic !== undefined ? String(item.sampleData.topic) : '';
    const sampleCode = item.sampleData && item.sampleData.code !== undefined ? String(item.sampleData.code) : '';

    const isMatch =
      itemKey === strKey ||
      samplePk === strKey ||
      sampleId === strKey ||
      sampleKey === strKey ||
      sampleTopic === strKey ||
      sampleCode === strKey;

    if (isMatch) {
      return {
        ...item,
        inMaster: true,
        isPodOnly: false
      };
    }
    return item;
  });

  const remainingPodOnly = updatedDataMatrix.filter(d => !d.inMaster).length;

  return {
    ...prev,
    master: {
      ...prev.master,
      rowCount: (prev.master?.rowCount || 0) + 1
    },
    dataMatrix: updatedDataMatrix,
    summary: {
      ...prev.summary,
      podOnlyRowsCount: remainingPodOnly
    }
  };
}

/**
 * Optimistic update when batch uploading multiple selected rows from POD to Master DB
 */
export function applyOptimisticBulkPodRowsToMaster(prev, syncedKeys, pkColumn, successCount) {
  if (!prev || !syncedKeys || syncedKeys.length === 0) return prev;
  const syncedSet = new Set(syncedKeys.map(String));

  const updatedDataMatrix = (prev.dataMatrix || []).map(item => {
    const itemKey = String(item.rowKey || '');
    const samplePk = item.sampleData && pkColumn && item.sampleData[pkColumn] !== undefined ? String(item.sampleData[pkColumn]) : '';
    const sampleId = item.sampleData && item.sampleData.id !== undefined ? String(item.sampleData.id) : '';
    const sampleKey = item.sampleData && item.sampleData.key !== undefined ? String(item.sampleData.key) : '';
    const sampleTopic = item.sampleData && item.sampleData.topic !== undefined ? String(item.sampleData.topic) : '';
    const sampleCode = item.sampleData && item.sampleData.code !== undefined ? String(item.sampleData.code) : '';

    const isMatch =
      (itemKey && syncedSet.has(itemKey)) ||
      (samplePk && syncedSet.has(samplePk)) ||
      (sampleId && syncedSet.has(sampleId)) ||
      (sampleKey && syncedSet.has(sampleKey)) ||
      (sampleTopic && syncedSet.has(sampleTopic)) ||
      (sampleCode && syncedSet.has(sampleCode));

    if (isMatch) {
      return {
        ...item,
        inMaster: true,
        isPodOnly: false
      };
    }
    return item;
  });

  const remainingPodOnly = updatedDataMatrix.filter(d => !d.inMaster).length;

  return {
    ...prev,
    master: {
      ...prev.master,
      rowCount: (prev.master?.rowCount || 0) + successCount
    },
    dataMatrix: updatedDataMatrix,
    summary: {
      ...prev.summary,
      podOnlyRowsCount: remainingPodOnly
    }
  };
}
