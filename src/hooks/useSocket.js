import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { BACKEND_URL } from '../config';

export function useSocket(onMetricsUpdate) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
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

    socket.on('metrics_update', (updatedServers) => {
      if (onMetricsUpdate) {
        onMetricsUpdate(updatedServers);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [onMetricsUpdate]);

  return { isConnected };
}
