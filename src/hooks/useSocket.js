import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config';

export function useSocket(onMetricsUpdate, onServerListUpdated, currentView = 'dashboard') {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [totalActiveUsers, setTotalActiveUsers] = useState(0);
  const socketRef = useRef(null);

  // Initialize socket
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ WebSocket Connected');
      setIsConnected(true);

      // Join presence with user token if logged in
      const token = localStorage.getItem('vps_monitoring_token') || localStorage.getItem('token') || '';
      socket.emit('presence:join', { token, currentView });
      socket.emit('presence:request-snapshot');
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket Disconnected');
      setIsConnected(false);
    });

    socket.on('metrics_update', (updatedMetrics) => {
      if (onMetricsUpdate) {
        onMetricsUpdate(updatedMetrics);
      }
    });

    socket.on('server_list_updated', () => {
      console.log('🔔 Server list configuration updated via socket');
      if (onServerListUpdated) {
        onServerListUpdated();
      }
    });

    // Real-time active users presence update
    socket.on('presence:users-update', (data) => {
      if (data) {
        setActiveUsers(data.activeUsers || []);
        setTotalActiveUsers(data.totalActiveUsers || 0);
      }
    });

    // Setup 30s presence heartbeat interval
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('presence:heartbeat');
      }
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      socket.disconnect();
    };
  }, [onMetricsUpdate, onServerListUpdated]);

  // Emit presence navigation change when currentView changes
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('presence:navigate', { currentView });
    }
  }, [currentView]);

  const requestPresenceSnapshot = () => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('presence:request-snapshot');
    }
  };

  return {
    isConnected,
    activeUsers,
    totalActiveUsers,
    requestPresenceSnapshot
  };
}
