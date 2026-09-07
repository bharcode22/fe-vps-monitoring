import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { fetchPodLiveBackfillApi } from '../../../api/podActivityApi';
import { isCurrentChannel } from './liveStreamConfig';
import { getSharedSocket } from '../../../utils/socketService';

export function useLiveTelemetryStream({
  podId,
  selectedModule,
  windowSeconds,
  liveDataType,
  socket: propSocket
}) {
  const socket = propSocket || getSharedSocket();
  const [streamBuffer, setStreamBuffer] = useState([]);
  const [activeChannels, setActiveChannels] = useState({});
  const [isConnected, setIsConnected] = useState(Boolean(socket?.connected));
  const [isPaused, setIsPaused] = useState(false);
  const [lastTickTime, setLastTickTime] = useState(null);
  const [totalTicksReceived, setTotalTicksReceived] = useState(0);
  const [isLoadingBackfill, setIsLoadingBackfill] = useState(false);
  const [backfillInfo, setBackfillInfo] = useState(null);

  // Latest cumulative readings for ticker cards: { [chName]: value }
  const [latestValues, setLatestValues] = useState({});
  const [latestPort, setLatestPort] = useState(null);

  // References to avoid stale closures in socket callbacks
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const selectedModuleRef = useRef(selectedModule);
  selectedModuleRef.current = selectedModule;

  const windowSecondsRef = useRef(windowSeconds);
  windowSecondsRef.current = windowSeconds;

  const latestValuesRef = useRef({});

  // Function to load saved historical points from backend JSONL files
  const loadHistoryBackfill = useCallback(
    async (modId, winSec, type = 'current') => {
      if (!podId || !modId) return;
      setIsLoadingBackfill(true);
      try {
        const res = await fetchPodLiveBackfillApi(podId, {
          moduleId: modId,
          windowSeconds: winSec,
          type
        });
        if (res && res.success && Array.isArray(res.points) && res.points.length > 0) {
          setStreamBuffer(res.points);
          if (res.latestValues && Object.keys(res.latestValues).length > 0) {
            const merged = { ...latestValuesRef.current, ...res.latestValues };
            latestValuesRef.current = merged;
            setLatestValues(merged);
          }
          const lastPoint = res.points[res.points.length - 1];
          if (lastPoint?.time) {
            setLastTickTime(lastPoint.time);
          }
          setBackfillInfo({
            count: res.totalPoints,
            channels: res.channels || [],
            type: res.detectedType,
            windowSeconds: res.windowSeconds,
            stepSec: res.stepSec || 1
          });
        } else {
          setBackfillInfo(null);
        }
      } catch (err) {
        console.warn('⚠️ Gagal mengambil backfill riwayat live:', err.message);
      } finally {
        setIsLoadingBackfill(false);
      }
    },
    [podId]
  );

  // Initial backfill load on mount & module / pod / window / type change
  useEffect(() => {
    loadHistoryBackfill(selectedModule, windowSeconds, liveDataType);
  }, [podId, selectedModule, windowSeconds, liveDataType, loadHistoryBackfill]);

  // Socket Connection Status Tracker
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    setIsConnected(Boolean(socket.connected));

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  // Real-time batch heartbeat ingestion via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleBatch = (batchData) => {
      if (!batchData || typeof batchData !== 'object') return;

      const pId = Number(podId);
      const targetModId = Number(selectedModuleRef.current);
      let modData = null;

      // Primary source: backend object format { [podId]: { [modId]: { hb, port, timestamp, channels, telemetry, payload } } }
      const podBatch = batchData[pId] || batchData[String(pId)] || batchData[podId];
      if (podBatch && typeof podBatch === 'object') {
        modData = podBatch[targetModId] || podBatch[String(targetModId)];
      }

      // Fallback: array-based records format
      if (!modData && Array.isArray(batchData.records) && Number(batchData.podId) === pId) {
        const found = batchData.records.find((r) => Number(r.id) === targetModId);
        if (found) {
          modData = {
            hb: found.hb,
            port: batchData.port || found.port,
            timestamp: found.timestamp || Date.now(),
            channels: found.name && found.current !== undefined ? { [found.name]: found.current } : {},
            telemetry: {
              voltage: found.voltage,
              power: found.power,
              current: !found.name ? found.current : undefined,
              temp: found.temp,
              humi: found.humi,
              pob_raw: targetModId !== 502 ? found.pob_raw : undefined
            },
            payload: found
          };
        }
      }

      if (!modData || typeof modData !== 'object') return;

      const nowMs = modData.timestamp || Date.now();
      const timeStr = new Date(nowMs).toLocaleTimeString('id-ID', { hour12: false });
      const currentValues = {};

      // 1. Current Channels (e.g. PEMF_CUR, HM_CUR, EE_12V, EE_5V, SUB_12V, JAB5_A, JAB5_B, VAC_220, etc.)
      if (modData.channels && typeof modData.channels === 'object') {
        Object.entries(modData.channels).forEach(([k, v]) => {
          const num = parseFloat(v);
          if (!isNaN(num)) currentValues[k] = num;
        });
      }

      // 2. Multimetric Measurements (voltage, power, current, temp, humi, pob_raw)
      if (modData.telemetry && typeof modData.telemetry === 'object') {
        Object.entries(modData.telemetry).forEach(([k, v]) => {
          if (targetModId === 502 && k === 'pob_raw') return; // Exclude pob_raw for 502
          const num = parseFloat(v);
          if (!isNaN(num)) currentValues[k] = num;
        });
      }

      // 3. Raw payload fallback
      if (modData.payload && typeof modData.payload === 'object') {
        if (modData.payload.name && modData.payload.current !== undefined) {
          const num = parseFloat(modData.payload.current);
          if (!isNaN(num)) currentValues[String(modData.payload.name)] = num;
        } else if (modData.payload.current !== undefined && !modData.payload.name) {
          const num = parseFloat(modData.payload.current);
          if (!isNaN(num)) currentValues.current = num;
        }
        if (modData.payload.voltage !== undefined) {
          const num = parseFloat(modData.payload.voltage);
          if (!isNaN(num)) currentValues.voltage = num;
        }
        if (modData.payload.power !== undefined) {
          const num = parseFloat(modData.payload.power);
          if (!isNaN(num)) currentValues.power = num;
        }
        if (targetModId !== 502 && modData.payload.pob_raw !== undefined) {
          const num = parseFloat(modData.payload.pob_raw);
          if (!isNaN(num)) currentValues.pob_raw = num;
        }
        if (modData.payload.temp !== undefined) {
          const num = parseFloat(modData.payload.temp);
          if (!isNaN(num)) currentValues.temp = num;
        }
        if (modData.payload.humi !== undefined) {
          const num = parseFloat(modData.payload.humi);
          if (!isNaN(num)) currentValues.humi = num;
        }
      }

      // 4. Heartbeat pulse
      if (modData.hb !== null && modData.hb !== undefined) {
        const hbNum = Number(modData.hb);
        if (!isNaN(hbNum)) currentValues.hb = hbNum;
      }

      if (Object.keys(currentValues).length === 0) return;

      if (modData.port) {
        setLatestPort(modData.port);
      }

      setLastTickTime(timeStr);
      setTotalTicksReceived((prev) => prev + 1);

      const updatedLatest = { ...latestValuesRef.current, ...currentValues };
      latestValuesRef.current = updatedLatest;
      setLatestValues(updatedLatest);

      // If streaming is paused, do not append to chart buffer
      if (isPausedRef.current) return;

      // Construct continuous time-series point with all active values
      const point = {
        time: timeStr,
        timestamp: nowMs,
        ...updatedLatest
      };

      setStreamBuffer((prev) => {
        const next = [...prev, point];
        const cutoff = nowMs - windowSecondsRef.current * 1000;
        const pruned = next.filter((p) => p.timestamp >= cutoff);
        const maxCap = Math.max(360, Math.min(2400, windowSecondsRef.current * 2));
        return (pruned.length > 0 ? pruned : next).slice(-maxCap);
      });
    };

    socket.on('pod-heartbeat:batch-update', handleBatch);

    return () => {
      socket.off('pod-heartbeat:batch-update', handleBatch);
    };
  }, [socket, podId]);

  // Analyze active channels detected from incoming data & categorize current vs non-current
  const {
    currentChannels,
    envChannels,
    otherChannels,
    allChannels,
    hasCurrents,
    hasEnv,
    hasSensors,
    activeChannelKeys
  } = useMemo(() => {
    const rawKeys = new Set();
    Object.keys(latestValues).forEach((k) => {
      if (k !== 'time' && k !== 'timestamp') {
        if (Number(selectedModule) === 502 && k === 'pob_raw') return;
        rawKeys.add(k);
      }
    });
    streamBuffer.forEach((p) => {
      Object.keys(p).forEach((k) => {
        if (k !== 'time' && k !== 'timestamp') {
          if (Number(selectedModule) === 502 && k === 'pob_raw') return;
          rawKeys.add(k);
        }
      });
    });

    const currents = [];
    const envs = [];
    const others = [];

    rawKeys.forEach((k) => {
      if (k === 'hb' || k === 'time' || k === 'timestamp') return;
      if (Number(selectedModule) === 502 && k === 'pob_raw') return;
      if (isCurrentChannel(k)) {
        currents.push(k);
      } else if (k === 'temp' || k === 'humi') {
        envs.push(k);
      } else {
        others.push(k);
      }
    });

    const hasCurrents = currents.length > 0;
    const hasEnv = envs.length > 0;
    const hasSensors = currents.length > 0 || envs.length > 0 || others.length > 0;

    let activeKeys = [];
    if (liveDataType === 'current') {
      activeKeys = hasCurrents ? currents : (hasSensors ? [...currents, ...envs, ...others] : ['hb']);
    } else if (liveDataType === 'env') {
      activeKeys = hasEnv ? envs : (hasCurrents ? currents : ['hb']);
    } else if (liveDataType === 'hb') {
      activeKeys = ['hb'];
    } else {
      activeKeys = hasSensors ? [...currents, ...envs, ...others] : ['hb'];
    }

    return {
      currentChannels: currents,
      envChannels: envs,
      otherChannels: others,
      allChannels: [...currents, ...envs, ...others],
      hasCurrents,
      hasEnv,
      hasSensors,
      activeChannelKeys: activeKeys
    };
  }, [selectedModule, latestValues, streamBuffer, liveDataType]);

  // Channel visibility map
  const effectiveActiveChannels = useMemo(() => {
    const res = {};
    activeChannelKeys.forEach((ch) => {
      res[ch] = activeChannels[ch] !== undefined ? activeChannels[ch] : true;
    });
    return res;
  }, [activeChannelKeys, activeChannels]);

  const handleToggleChannel = useCallback((ch) => {
    setActiveChannels((prev) => ({
      ...prev,
      [ch]: prev[ch] !== undefined ? !prev[ch] : false
    }));
  }, []);

  const handleSelectAllChannels = useCallback(() => {
    const next = {};
    activeChannelKeys.forEach((ch) => { next[ch] = true; });
    setActiveChannels(next);
  }, [activeChannelKeys]);

  const handleDeselectAllChannels = useCallback(() => {
    const next = {};
    activeChannelKeys.forEach((ch) => { next[ch] = false; });
    setActiveChannels(next);
  }, [activeChannelKeys]);

  const handleResetBuffer = useCallback(() => {
    setStreamBuffer([]);
    setLatestValues({});
    latestValuesRef.current = {};
    loadHistoryBackfill(selectedModule, windowSeconds, liveDataType);
  }, [selectedModule, windowSeconds, liveDataType, loadHistoryBackfill]);

  // Decimated data for ultra-smooth Recharts rendering (caps at max ~600 points)
  const chartData = useMemo(() => {
    if (streamBuffer.length <= 600) return streamBuffer;
    const step = Math.ceil(streamBuffer.length / 600);
    return streamBuffer.filter((_, idx) => idx % step === 0 || idx === streamBuffer.length - 1);
  }, [streamBuffer]);

  return {
    streamBuffer,
    chartData,
    latestValues,
    latestPort,
    isConnected,
    isPaused,
    setIsPaused,
    lastTickTime,
    totalTicksReceived,
    isLoadingBackfill,
    backfillInfo,
    loadHistoryBackfill,
    handleResetBuffer,
    currentChannels,
    envChannels,
    otherChannels,
    allChannels,
    hasCurrents,
    hasEnv,
    hasSensors,
    activeChannelKeys,
    effectiveActiveChannels,
    handleToggleChannel,
    handleSelectAllChannels,
    handleDeselectAllChannels,
    setStreamBuffer,
    setLatestValues
  };
}
