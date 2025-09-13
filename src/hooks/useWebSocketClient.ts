'use client';

import { useEffect, useState } from 'react';

interface WebSocketHookResult {
  socket: any | null;
  connected: boolean;
  lastMessage: any;
}

export const useWebSocket = (url?: string): WebSocketHookResult => {
  const [socket, setSocket] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    let socketInstance: any;

    const connectWebSocket = () => {
      try {
        // Import socket.io-client dynamically
        import('socket.io-client').then(({ io }) => {
          socketInstance = io(url || 'http://localhost:3001', {
            path: '/api/socket',
            transports: ['websocket', 'polling'],
            timeout: 5000,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
          });

          socketInstance.on('connect', () => {
            console.log('WebSocket connected');
            setConnected(true);
          });

          socketInstance.on('disconnect', () => {
            console.log('WebSocket disconnected');
            setConnected(false);
          });

          socketInstance.on('connect_error', (error: any) => {
            console.error('WebSocket connection error:', error);
            setConnected(false);
          });

          socketInstance.on('message', (data: any) => {
            setLastMessage(data);
          });

          socketInstance.on('heartbeat', (data: any) => {
            console.log('Heartbeat received:', data);
          });

          setSocket(socketInstance);
        }).catch((error) => {
          console.error('Failed to load socket.io-client:', error);
        });
      } catch (error) {
        console.error('Error setting up WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [url]);

  return {
    socket,
    connected,
    lastMessage
  };
};