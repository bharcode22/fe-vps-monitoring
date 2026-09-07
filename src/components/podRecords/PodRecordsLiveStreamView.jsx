import React, { useState, useEffect } from 'react';
import { useLiveTelemetryStream } from './liveStream/useLiveTelemetryStream';
import LiveStreamToolbar from './liveStream/LiveStreamToolbar';
import LiveNoticeBanner from './liveStream/LiveNoticeBanner';
import LiveCategoryTabs from './liveStream/LiveCategoryTabs';
import LiveTickerCards from './liveStream/LiveTickerCards';
import LiveTelemetryChart from './liveStream/LiveTelemetryChart';

export default function PodRecordsLiveStreamView({
  podId,
  podName,
  socket,
  initialModuleId = 508,
  onBackToFiles,
  onSelectPod,
  availablePods: _availablePods = []
}) {
  // Persistent state across browser reloads
  const [selectedModule, setSelectedModule] = useState(() => {
    const saved =
      localStorage.getItem(`vps_live_stream_module_${podId}`) ||
      localStorage.getItem('vps_live_stream_module');
    return saved ? Number(saved) : initialModuleId;
  });

  const [liveDataType, setLiveDataType] = useState(() => {
    return localStorage.getItem('vps_live_stream_data_type') || 'current';
  });

  const [windowSeconds, setWindowSeconds] = useState(() => {
    const saved = localStorage.getItem('vps_live_stream_window_seconds');
    return saved ? Number(saved) : 300; // 300s = 5m default
  });

  // Sync state to localStorage
  useEffect(() => {
    if (selectedModule) {
      localStorage.setItem('vps_live_stream_module', String(selectedModule));
      if (podId) {
        localStorage.setItem(`vps_live_stream_module_${podId}`, String(selectedModule));
      }
    }
  }, [selectedModule, podId]);

  useEffect(() => {
    if (liveDataType) {
      localStorage.setItem('vps_live_stream_data_type', liveDataType);
    }
  }, [liveDataType]);

  useEffect(() => {
    if (windowSeconds) {
      localStorage.setItem('vps_live_stream_window_seconds', String(windowSeconds));
    }
  }, [windowSeconds]);

  // Hook managing socket stream, backfill, sliding buffer, and channel visibility
  const {
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
    allChannels,
    hasEnv,
    hasSensors,
    activeChannelKeys,
    effectiveActiveChannels,
    handleToggleChannel,
    handleSelectAllChannels,
    handleDeselectAllChannels,
    setStreamBuffer,
    setLatestValues
  } = useLiveTelemetryStream({
    podId,
    selectedModule,
    windowSeconds,
    liveDataType,
    socket
  });

  // Module switcher handler
  const handleModuleChange = (newModId) => {
    setSelectedModule(newModId);
    setStreamBuffer([]);
    setLatestValues({});
    setLiveDataType('current');
    loadHistoryBackfill(newModId, windowSeconds, 'current');
  };

  // Window duration switcher handler
  const handleWindowChange = (newSec) => {
    setWindowSeconds(newSec);
    loadHistoryBackfill(selectedModule, newSec, liveDataType);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. TOP STREAMING CONTROL TOOLBAR (2-TIER) */}
      <LiveStreamToolbar
        onBackToFiles={onBackToFiles}
        isConnected={isConnected}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((prev) => !prev)}
        isLoadingBackfill={isLoadingBackfill}
        backfillInfo={backfillInfo}
        podName={podName}
        lastTickTime={lastTickTime}
        selectedModule={selectedModule}
        onModuleChange={handleModuleChange}
        windowSeconds={windowSeconds}
        onWindowChange={handleWindowChange}
        onResetBuffer={handleResetBuffer}
      />

      {/* 2. NOTICE BANNER (IF CURRENT MODULE HAS NO PHYSICAL POWER SENSORS) */}
      <LiveNoticeBanner
        hasSensors={hasSensors}
        latestHb={latestValues.hb}
        selectedModule={selectedModule}
        podName={podName}
        onSelectPod={onSelectPod}
      />

      {/* 2.5 LIVE TELEMETRY CATEGORY FILTER (STRICT CURRENT SEPARATION) */}
      <LiveCategoryTabs
        liveDataType={liveDataType}
        onSelectType={(t) => setLiveDataType(t)}
        currentChannelsCount={currentChannels.length}
        hasEnv={hasEnv}
        envChannelsCount={envChannels.length}
        allChannelsCount={allChannels.length}
      />

      {/* 3. REAL-TIME TELEMETRY TICKER CARDS */}
      <LiveTickerCards
        hasSensors={hasSensors}
        activeChannelKeys={activeChannelKeys}
        effectiveActiveChannels={effectiveActiveChannels}
        onToggleChannel={handleToggleChannel}
        latestValues={latestValues}
        latestPort={latestPort}
        isConnected={isConnected}
        totalTicksReceived={totalTicksReceived}
      />

      {/* 4. LIVE STREAMING RECHARTS CANVAS */}
      <LiveTelemetryChart
        chartData={chartData}
        streamBufferLength={streamBuffer.length}
        selectedModule={selectedModule}
        windowSeconds={windowSeconds}
        liveDataType={liveDataType}
        activeChannelKeys={activeChannelKeys}
        effectiveActiveChannels={effectiveActiveChannels}
        onToggleChannel={handleToggleChannel}
        onSelectAllChannels={handleSelectAllChannels}
        onDeselectAllChannels={handleDeselectAllChannels}
        backfillInfo={backfillInfo}
        totalTicksReceived={totalTicksReceived}
      />
    </div>
  );
}
