/**
 * src/lib/socket.js
 * Shared Socket.IO client singleton.
 */

import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (socket?.connected) return socket;

  const token = localStorage.getItem('anom_token');
  if (!token) return null;

  if (!socket) {
    socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
  } else if (!socket.connected) {
    socket.auth = { token };
    socket.connect();
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
