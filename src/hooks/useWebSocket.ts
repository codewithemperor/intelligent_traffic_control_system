'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useWebSocket = (url?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(url || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      path: '/api/socket',
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnected(false);
    });

    socketInstance.on('heartbeat', (data) => {
      console.log('Heartbeat received:', data);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [url]);

  return {
    socket,
    connected
  };
};