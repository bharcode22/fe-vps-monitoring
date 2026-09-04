import io from 'socket.io-client';
import { SOCKET_URL } from '../config';

/**
 * Singleton Socket.IO Manager
 * Ensures that only ONE WebSocket connection is opened per browser tab,
 * preventing Cloudflare Tunnel congestion, connection drops, and mutual interference.
 */

let sharedSocket = null;

export function getSharedSocket() {
  if (!sharedSocket) {
    sharedSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    sharedSocket.on('connect', () => {
      console.log('🔌 [SharedSocket] Terhubung:', sharedSocket.id);
    });

    sharedSocket.on('disconnect', (reason) => {
      console.log('⚠️ [SharedSocket] Terputus:', reason);
    });

    sharedSocket.on('connect_error', (err) => {
      console.warn('❌ [SharedSocket] Connect error:', err.message);
    });
  }

  return sharedSocket;
}

export function disconnectSharedSocket() {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }
}
