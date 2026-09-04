import { useState, useEffect, useRef } from 'react';
import { getSharedSocket } from '../utils/socketService';

export function useSocket(onMetricsUpdate, onServerListUpdated, currentView = 'dashboard') {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [totalActiveUsers, setTotalActiveUsers] = useState(0);

  const onMetricsUpdateRef = useRef(onMetricsUpdate);
  const onServerListUpdatedRef = useRef(onServerListUpdated);
  const currentViewRef = useRef(currentView);

  useEffect(() => {
    onMetricsUpdateRef.current = onMetricsUpdate;
  }, [onMetricsUpdate]);

  useEffect(() => {
    onServerListUpdatedRef.current = onServerListUpdated;
  }, [onServerListUpdated]);

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  // Initialize socket using singleton
  useEffect(() => {
    const socket = getSharedSocket();
    setIsConnected(socket.connected);

    const handleConnect = () => {
      setIsConnected(true);
      const token = localStorage.getItem('vps_monitoring_token') || localStorage.getItem('token') || '';
      socket.emit('presence:join', { token, currentView: currentViewRef.current });
      socket.emit('presence:request-snapshot');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleMetricsUpdate = (updatedMetrics) => {
      if (onMetricsUpdateRef.current) {
        onMetricsUpdateRef.current(updatedMetrics);
      }
    };

    const handleServerListUpdated = () => {
      console.log('🔔 Server list configuration updated via socket');
      if (onServerListUpdatedRef.current) {
        onServerListUpdatedRef.current();
      }
    };

    const handleUsersUpdate = (data) => {
      if (data) {
        setActiveUsers(data.activeUsers || []);
        setTotalActiveUsers(data.totalActiveUsers || 0);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('metrics_update', handleMetricsUpdate);
    socket.on('server_list_updated', handleServerListUpdated);
    socket.on('presence:users-update', handleUsersUpdate);

    // If already connected when this component mounts, join presence immediately
    if (socket.connected) {
      handleConnect();
    }

    // 30s presence heartbeat interval
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('presence:heartbeat');
      }
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('metrics_update', handleMetricsUpdate);
      socket.off('server_list_updated', handleServerListUpdated);
      socket.off('presence:users-update', handleUsersUpdate);
    };
  }, []); // Run ONCE on mount using shared socket, no unnecessary disconnect loops

  // Emit presence navigation change when currentView changes
  useEffect(() => {
    const socket = getSharedSocket();
    if (socket && socket.connected) {
      socket.emit('presence:navigate', { currentView });
    }
  }, [currentView]);

  const requestPresenceSnapshot = () => {
    const socket = getSharedSocket();
    if (socket && socket.connected) {
      socket.emit('presence:request-snapshot');
    }
  };

  return {
    isConnected,
    activeUsers,
    totalActiveUsers,
    requestPresenceSnapshot
  };
}
