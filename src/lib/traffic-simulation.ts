// Traffic Simulation Service
// This service runs traffic light cycles and vehicle generation automatically

class TrafficSimulationService {
  private intervalId: NodeJS.Timeout | null = null;
  private vehicleIntervalId: NodeJS.Timeout | null = null;
  private vehicleMovementIntervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  async startSimulation() {
    if (this.isRunning) return;
    
    console.log('🚦 Starting traffic simulation...');
    this.isRunning = true;

    // Start traffic light cycling - every 10 seconds
    this.intervalId = setInterval(async () => {
      try {
        const response = await fetch('/api/traffic/cycle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`🔄 Traffic cycle processed: ${result.updatedLights} lights updated`);
        }
      } catch (error) {
        console.error('Error in traffic cycle:', error);
      }
    }, 10000); // Process every 10 seconds

    // Start vehicle generation - every 5 seconds
    this.vehicleIntervalId = setInterval(async () => {
      try {
        const response = await fetch('/api/sensors/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            count: Math.floor(Math.random() * 3) + 1 // Generate 1-3 vehicles
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`🚗 Generated ${result.vehicles.length} vehicles`);
        }
      } catch (error) {
        console.error('Error in vehicle generation:', error);
      }
    }, 5000); // Generate every 5 seconds

    // Start vehicle movement simulation - every 3 seconds
    this.vehicleMovementIntervalId = setInterval(async () => {
      try {
        const response = await fetch('/api/sensors/readings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            action: 'simulate_movement'
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`🚙 Vehicle movement processed: ${result.movedVehicles || 0} vehicles moved`);
        }
      } catch (error) {
        console.error('Error in vehicle movement:', error);
      }
    }, 3000); // Process every 3 seconds

    console.log('✅ Traffic simulation started successfully');
  }

  stopSimulation() {
    if (!this.isRunning) return;

    console.log('🛑 Stopping traffic simulation...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.vehicleIntervalId) {
      clearInterval(this.vehicleIntervalId);
      this.vehicleIntervalId = null;
    }

    if (this.vehicleMovementIntervalId) {
      clearInterval(this.vehicleMovementIntervalId);
      this.vehicleMovementIntervalId = null;
    }

    this.isRunning = false;
    console.log('✅ Traffic simulation stopped');
  }

  isSimulationRunning() {
    return this.isRunning;
  }
}

// Global instance
const trafficSimulation = new TrafficSimulationService();

// Export for global access
declare global {
  interface Window {
    trafficSimulation: typeof trafficSimulation;
  }
}

// Make it available globally
if (typeof window !== 'undefined') {
  window.trafficSimulation = trafficSimulation;
}

export default trafficSimulation;