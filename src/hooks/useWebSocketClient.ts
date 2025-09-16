'use client';

import { useEffect, useState, useCallback } from 'react';

interface TrafficSimulationState {
  isRunning: boolean;
  debugMode: boolean;
  intervals: {
    trafficLights: string;
    vehicleGeneration: string;
    vehicleMovement: string;
  };
}

interface UseTrafficSocketResult {
  socket: any | null;
  connected: boolean;
  simulationState: TrafficSimulationState | null;
  lastVehicleMovement: any;
  lastTrafficCycle: any;
  lastSystemAlert: any;
  startSimulation: () => void;
  stopSimulation: () => void;
  toggleDebug: () => void;
  requestTrafficData: () => void;
  overrideTrafficLight: (lightId: string, status: string) => void;
  error: string | null;
}

export const useWebSocket = (url?: string): UseTrafficSocketResult => {
  const [socket, setSocket] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [simulationState, setSimulationState] = useState<TrafficSimulationState | null>(null);
  const [lastVehicleMovement, setLastVehicleMovement] = useState<any>(null);
  const [lastTrafficCycle, setLastTrafficCycle] = useState<any>(null);
  const [lastSystemAlert, setLastSystemAlert] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    let socketInstance: any;

    const connectWebSocket = () => {
      try {
        console.log('🔌 Attempting to connect WebSocket...');
        const connectUrl =  process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
        console.log('🔌 Connecting to:', connectUrl);
        
        // Import socket.io-client dynamically
        import('socket.io-client').then(({ io }) => {
          console.log('🔌 socket.io-client loaded, creating connection...');
          socketInstance = io(connectUrl, {
            path: '/api/socketio',
            transports: ['websocket', 'polling'],
            timeout: 5000,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
          });

          console.log('🔌 Socket instance created, setting up event handlers...');

          // Connection events
          socketInstance.on('connect', () => {
            console.log('🚦 Traffic Control WebSocket connected');
            setConnected(true);
            setError(null);
          });

          socketInstance.on('disconnect', () => {
            console.log('🚦 Traffic Control WebSocket disconnected');
            setConnected(false);
          });

          socketInstance.on('connect_error', (err: any) => {
            console.error('WebSocket connection error 1:', err);
            setConnected(false);
            setError('Connection failed');
          });

          // Simulation state events
          socketInstance.on('simulation-state', (state: TrafficSimulationState) => {
            setSimulationState(state);
          });

          socketInstance.on('simulation-started', (data: any) => {
            console.log('✅ Simulation started:', data);
            setSimulationState(prev => prev ? { ...prev, isRunning: true } : null);
          });

          socketInstance.on('simulation-stopped', (data: any) => {
            console.log('🛑 Simulation stopped:', data);
            setSimulationState(prev => prev ? { ...prev, isRunning: false } : null);
          });

          // Vehicle movement events
          socketInstance.on('vehicle-movement-completed', (data: any) => {
            setLastVehicleMovement(data);
          });

          // Traffic cycle events
          socketInstance.on('traffic-cycle-completed', (data: any) => {
            setLastTrafficCycle(data);
          });

          // Vehicle generation events
          socketInstance.on('vehicles-generated', (data: any) => {
            console.log(`🚗 Generated ${data.count} vehicles`);
          });

          // System alerts
          socketInstance.on('system-alert', (data: any) => {
            setLastSystemAlert(data);
          });

          // Debug mode events
          socketInstance.on('debug-mode-toggled', (data: any) => {
            setSimulationState(prev => prev ? { ...prev, debugMode: data.enabled } : null);
          });

          // Error handling
          socketInstance.on('error', (data: any) => {
            console.error('Socket error:', data);
            setError(data.message);
          });

          // Success messages
          socketInstance.on('success', (data: any) => {
            console.log('Socket success:', data.message);
            setError(null);
          });

          // General messages
          socketInstance.on('message', (data: any) => {
            console.log('Socket message:', data.text);
          });

          // Test response handler
          socketInstance.on('test-response', (data: any) => {
            console.log('🧪 Test response received:', data);
          });

          setSocket(socketInstance);
        }).catch((err) => {
          console.error('Failed to load socket.io-client:', err);
          setError('Failed to load socket client');
        });
      } catch (err) {
        console.error('Error setting up WebSocket:', err);
        setError('Setup failed');
      }
    };

    connectWebSocket();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [url]);

  // Simulation control functions
  const startSimulation = useCallback(() => {
    console.log('🚀 startSimulation called, socket:', !!socket, 'connected:', connected);
    if (socket && connected) {
      console.log('🚀 Emitting start-simulation event...');
      socket.emit('start-simulation');
    } else {
      console.log('🚀 Cannot start simulation - socket:', !!socket, 'connected:', connected);
    }
  }, [socket, connected]);

  const stopSimulation = useCallback(() => {
    if (socket && connected) {
      socket.emit('stop-simulation');
    }
  }, [socket, connected]);

  const toggleDebug = useCallback(() => {
    if (socket && connected) {
      socket.emit('toggle-debug');
    }
  }, [socket, connected]);

  const requestTrafficData = useCallback(() => {
    if (socket && connected) {
      socket.emit('request-traffic-data');
    }
  }, [socket, connected]);

  const overrideTrafficLight = useCallback((lightId: string, status: string) => {
    if (socket && connected) {
      socket.emit('manual-override', { lightId, status });
    }
  }, [socket, connected]);

  return {
    socket,
    connected,
    simulationState,
    lastVehicleMovement,
    lastTrafficCycle,
    lastSystemAlert,
    startSimulation,
    stopSimulation,
    toggleDebug,
    requestTrafficData,
    overrideTrafficLight,
    error
  };
};