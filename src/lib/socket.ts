import { Server } from 'socket.io';
import { DataGenerator } from '@/lib/data-generator';
import { db } from '@/lib/db';

interface TrafficSimulationState {
  isRunning: boolean;
  vehicleGenerationInterval: NodeJS.Timeout | null;
  vehicleMovementInterval: NodeJS.Timeout | null;
  trafficLightInterval: NodeJS.Timeout | null;
  debugMode: boolean;
}

// Global simulation state
const simulationState: TrafficSimulationState = {
  isRunning: false,
  vehicleGenerationInterval: null,
  vehicleMovementInterval: null,
  trafficLightInterval: null,
  debugMode: true
};

export const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('🚦 Traffic control client connected:', socket.id);
    
    // Test event handler
    socket.on('test', (data) => {
      console.log('🧪 Test event received:', data);
      socket.emit('test-response', { message: 'Server received your test!', data });
    });
    
    // Send current simulation state to new client
    socket.emit('simulation-state', {
      isRunning: simulationState.isRunning,
      debugMode: simulationState.debugMode
    });

    // Start traffic simulation
    socket.on('start-simulation', async () => {
      try {
        if (simulationState.isRunning) {
          socket.emit('error', { message: 'Simulation is already running' });
          return;
        }

        console.log('🚦 Starting socket-based traffic simulation...');
        simulationState.isRunning = true;

        // Start traffic light cycling (every 3 seconds)
        simulationState.trafficLightInterval = setInterval(async () => {
          try {
            const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
            console.log('🚦 Making traffic cycle request to:', baseUrl);
            
            const response = await fetch(`${baseUrl}/api/traffic/cycle`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
              const result = await response.json();
              if (simulationState.debugMode && result.updatedLights > 0) {
                console.log(`✅ Traffic cycle: ${result.updatedLights} lights updated`);
              }
              
              // Broadcast traffic light updates to all clients
              io.emit('traffic-cycle-completed', result);
            }
          } catch (error) {
            console.error('❌ Error in traffic light cycle:', error);
          }
        }, 3001);

        // Start vehicle generation (every 8 seconds)
        simulationState.vehicleGenerationInterval = setInterval(async () => {
          try {
            const hour = new Date().getHours();
            let vehicleCount = 1;
            
            // Adjust generation based on time of day
            if (hour >= 8 && hour <= 9) vehicleCount = 2;
            if (hour >= 12 && hour <= 13) vehicleCount = 2;
            if (hour >= 16 && hour <= 17) vehicleCount = 2;
            if (hour >= 22 || hour <= 6) vehicleCount = 1;
            
            const vehicles = await DataGenerator.generateVehicles(vehicleCount);
            
            // Broadcast vehicle generation to all clients
            io.emit('vehicles-generated', {
              count: vehicles.length,
              vehicles: vehicles.map(v => ({
                id: v.id,
                plateNumber: v.plateNumber,
                type: v.type,
                roadId: v.roadId
              })),
              timestamp: new Date().toISOString()
            });

            if (simulationState.debugMode) {
              console.log(`🚗 Generated ${vehicles.length} vehicles via socket`);
            }
          } catch (error) {
            console.error('❌ Error in vehicle generation:', error);
          }
        }, 8000);

        // Start vehicle movement (every 100ms - much faster than HTTP)
        simulationState.vehicleMovementInterval = setInterval(async () => {
          try {
            const result = await DataGenerator.simulateVehicleMovement();
            
            // Broadcast vehicle movement to all clients
            io.emit('vehicle-movement-completed', {
              movedVehicles: result.movedVehicles,
              exitedVehicles: result.exitedVehicles,
              timestamp: new Date().toISOString()
            });

            if (simulationState.debugMode && (result.movedVehicles > 0 || result.exitedVehicles > 0)) {
              console.log(`🚙 Socket movement: ${result.movedVehicles} moved, ${result.exitedVehicles} exited`);
            }
          } catch (error) {
            console.error('❌ Error in vehicle movement:', error);
          }
        }, 100); // Every 100ms - much faster than HTTP 50ms

        // Broadcast simulation started to all clients
        io.emit('simulation-started', {
          message: 'Traffic simulation started',
          intervals: {
            trafficLights: '3s',
            vehicleGeneration: '8s',
            vehicleMovement: '100ms'
          },
          timestamp: new Date().toISOString()
        });

        socket.emit('success', { message: 'Simulation started successfully' });

      } catch (error) {
        console.error('Error starting simulation:', error);
        socket.emit('error', { message: 'Failed to start simulation' });
      }
    });

    // Stop traffic simulation
    socket.on('stop-simulation', () => {
      try {
        if (!simulationState.isRunning) {
          socket.emit('error', { message: 'Simulation is not running' });
          return;
        }

        console.log('🛑 Stopping socket-based traffic simulation...');
        
        // Clear all intervals
        if (simulationState.trafficLightInterval) {
          clearInterval(simulationState.trafficLightInterval);
          simulationState.trafficLightInterval = null;
        }
        
        if (simulationState.vehicleGenerationInterval) {
          clearInterval(simulationState.vehicleGenerationInterval);
          simulationState.vehicleGenerationInterval = null;
        }
        
        if (simulationState.vehicleMovementInterval) {
          clearInterval(simulationState.vehicleMovementInterval);
          simulationState.vehicleMovementInterval = null;
        }

        simulationState.isRunning = false;

        // Broadcast simulation stopped to all clients
        io.emit('simulation-stopped', {
          message: 'Traffic simulation stopped',
          timestamp: new Date().toISOString()
        });

        socket.emit('success', { message: 'Simulation stopped successfully' });

      } catch (error) {
        console.error('Error stopping simulation:', error);
        socket.emit('error', { message: 'Failed to stop simulation' });
      }
    });

    // Get simulation status
    socket.on('get-simulation-status', () => {
      socket.emit('simulation-status', {
        isRunning: simulationState.isRunning,
        debugMode: simulationState.debugMode,
        intervals: {
          trafficLights: simulationState.trafficLightInterval ? '3s' : 'stopped',
          vehicleGeneration: simulationState.vehicleGenerationInterval ? '8s' : 'stopped',
          vehicleMovement: simulationState.vehicleMovementInterval ? '100ms' : 'stopped'
        }
      });
    });

    // Toggle debug mode
    socket.on('toggle-debug', () => {
      simulationState.debugMode = !simulationState.debugMode;
      io.emit('debug-mode-toggled', {
        enabled: simulationState.debugMode,
        timestamp: new Date().toISOString()
      });
      socket.emit('success', { 
        message: `Debug mode ${simulationState.debugMode ? 'enabled' : 'disabled'}` 
      });
    });

    // Manual traffic light override
    socket.on('manual-override', async (data: { lightId: string; status: string }) => {
      try {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
        console.log('🔧 Manual override request:', data, 'to:', baseUrl);
        
        const response = await fetch(`${baseUrl}/api/traffic/control`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'manual_override',
            lightId: data.lightId,
            status: data.status
          }),
        });

        if (response.ok) {
          const result = await response.json();
          io.emit('traffic-light-overridden', {
            lightId: data.lightId,
            newStatus: data.status,
            result,
            timestamp: new Date().toISOString()
          });
          socket.emit('success', { message: 'Traffic light overridden successfully' });
        } else {
          socket.emit('error', { message: 'Failed to override traffic light' });
        }
      } catch (error) {
        console.error('Error in manual override:', error);
        socket.emit('error', { message: 'Failed to override traffic light' });
      }
    });

    // Request current traffic data
    socket.on('request-traffic-data', async () => {
      try {
        const intersections = await db.intersection.findMany({
          include: {
            trafficLights: {
              include: {
                road: true
              }
            },
            roads: true
          }
        });

        socket.emit('traffic-data', {
          intersections,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error fetching traffic data:', error);
        socket.emit('error', { message: 'Failed to fetch traffic data' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Traffic control client disconnected:', socket.id);
    });

    // Send welcome message
    socket.emit('message', {
      text: 'Connected to Intelligent Traffic Control System!',
      senderId: 'system',
      timestamp: new Date().toISOString(),
    });
  });
};

// Helper function to broadcast system alerts
export const broadcastSystemAlert = (io: Server, alert: { type: string; message: string }) => {
  io.emit('system-alert', {
    ...alert,
    timestamp: new Date().toISOString()
  });
};

// Helper function to broadcast performance metrics
export const broadcastPerformanceMetrics = (io: Server, metrics: any) => {
  io.emit('performance-updated', {
    ...metrics,
    timestamp: new Date().toISOString()
  });
};