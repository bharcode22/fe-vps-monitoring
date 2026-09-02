import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config';

export function useSocket(onMetricsUpdate, onServerListUpdated, currentView = 'dashboard') {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ WebSocket Connected');
      setIsConnected(true);
      const token = localStorage.getItem('vps_monitoring_token') || localStorage.getItem('token') || '';
      if (token) {
        socket.emit('presence:join', { token, currentView });
      }
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

    return () => {
      socket.disconnect();
    };
  }, [onMetricsUpdate, onServerListUpdated]);

  // Presence heartbeat & navigation sync
  useEffect(() => {
    if (socketRef.current && isConnected) {
      const token = localStorage.getItem('vps_monitoring_token') || localStorage.getItem('token') || '';
      if (token) {
        socketRef.current.emit('presence:join', { token, currentView });
      }
      socketRef.current.emit('presence:navigate', { currentView });
    }
  }, [currentView, isConnected]);

  return { isConnected, socket: socketRef.current };
}
