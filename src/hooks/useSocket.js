import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config';

export function useSocket(onMetricsUpdate, onServerListUpdated) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket Connected');
      setIsConnected(true);
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

  return { isConnected };
}
