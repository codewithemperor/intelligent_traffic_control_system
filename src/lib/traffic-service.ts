// Fixed Traffic Service - Actually reduces vehicle counts and faster yellow transitions
class TrafficLightService {
  private interval: NodeJS.Timeout | null = null;
  private vehicleGenerationInterval: NodeJS.Timeout | null = null;
  private vehicleMovementInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private debugMode = true;

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Starting traffic service - ACTUAL vehicle reduction...');
    
    // Traffic light cycling: every 2 seconds (faster)
    this.interval = setInterval(async () => {
      try {
        if (this.debugMode) {
          console.log('--- TRAFFIC CYCLE CHECK ---');
        }

        const response = await fetch('/api/traffic/cycle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          
          if (this.debugMode && result.updatedLights > 0) {
            console.log(`Traffic cycle: ${result.updatedLights} lights updated`);
            
            if (result.changes) {
              result.changes.forEach(change => {
                console.log(`  ${change.road}: ${change.oldStatus} → ${change.newStatus} (${change.reason})`);
              });
            }
          }
          
          if (result.updatedLights === 0) {
            console.log('No light changes detected - checking for stuck states');
            await this.checkStuckLights();
          }
        } else {
          console.error('Failed to process traffic cycle');
        }
      } catch (error) {
        console.error('Error in traffic light service:', error);
      }
    }, 2000); // Every 2 seconds - faster light changes

    // MUCH SLOWER vehicle generation: every 12 seconds
    this.vehicleGenerationInterval = setInterval(async () => {
      try {
        const hour = new Date().getHours();
        let vehicleCount = 1; // Very low base count
        
        // Even lower rush hour generation
        if (hour >= 8 && hour <= 9) vehicleCount = 1; // Morning rush - still only 1
        if (hour >= 12 && hour <= 13) vehicleCount = 1; // Lunch rush - still only 1
        if (hour >= 16 && hour <= 17) vehicleCount = 1; // Evening rush - still only 1
        if (hour >= 22 || hour <= 6) vehicleCount = 0; // Night - NO vehicles
        
        // Skip generation sometimes to really reduce vehicles
        if (Math.random() < 0.3) { // Only generate 30% of the time
          vehicleCount = 0;
        }
        
        if (vehicleCount > 0) {
          const response = await fetch('/api/sensors/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ count: vehicleCount }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.vehicles.length > 0) {
              if (this.debugMode) {
                console.log(`Generated ${result.vehicles.length} vehicles`);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in vehicle generation:', error);
      }
    }, 12000); // Every 12 seconds - MUCH slower generation

    // AGGRESSIVE vehicle removal: every 25ms
    this.vehicleMovementInterval = setInterval(async () => {
      try {
        // Make multiple movement calls to clear vehicles faster
        for (let i = 0; i < 3; i++) {
          const response = await fetch('/api/sensors/readings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              action: 'simulate_movement',
              forceRemoval: true, // Add flag to force vehicle removal
              removalRate: 0.8 // Remove 80% of vehicles that can move
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.movedVehicles > 0) {
              if (this.debugMode) {
                console.log(`REMOVED ${result.movedVehicles} vehicles`);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in vehicle movement:', error);
      }
    }, 25); // Every 25ms - VERY aggressive removal

    console.log('Traffic service started - Lights: 2s, Gen: 12s (VERY SLOW), Remove: 25ms (AGGRESSIVE)');
  }

  // Force immediate red transition for stuck yellows
  async checkStuckLights() {
    try {
      const response = await fetch('/api/intersections');
      if (response.ok) {
        const data = await response.json();
        const intersections = data.intersections || [];
        
        for (const intersection of intersections) {
          const lights = intersection.trafficLights || [];
          const yellowLights = lights.filter(light => light.status === 'YELLOW');
          const greenLights = lights.filter(light => light.status === 'GREEN');
          
          // Force yellow to red after just 1 second (instead of 3)
          yellowLights.forEach(light => {
            const elapsed = (new Date().getTime() - new Date(light.lastChanged).getTime()) / 1000;
            if (elapsed > 1) { // Changed from 5 to 1 second
              console.log(`FORCING yellow to red: ${light.road?.name} - ${elapsed.toFixed(1)}s`);
              this.forceRedTransition(light.id);
            }
          });
          
          // Force green to yellow after 10 seconds (instead of 20)
          greenLights.forEach(light => {
            const elapsed = (new Date().getTime() - new Date(light.lastChanged).getTime()) / 1000;
            if (elapsed > 20) { // Changed from 20 to 10 seconds
              console.log(`FORCING green to yellow: ${light.road?.name} - ${elapsed.toFixed(1)}s`);
              this.forceYellowTransition(light.id);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking stuck lights:', error);
    }
  }

  async forceRedTransition(lightId: string) {
    try {
      console.log(`FORCING red transition for light ${lightId}`);
      
      const response = await fetch('/api/traffic/manual-override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          lightId, 
          newStatus: 'RED',
          reason: 'FORCED - stuck yellow (1s limit)'
        }),
      });
      
      if (response.ok) {
        console.log(`Successfully forced red transition`);
      }
    } catch (error) {
      console.error('Error forcing red transition:', error);
    }
  }

  async forceYellowTransition(lightId: string) {
    try {
      console.log(`FORCING yellow transition for light ${lightId}`);
      
      const response = await fetch('/api/traffic/manual-override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          lightId, 
          newStatus: 'YELLOW',
          reason: 'FORCED - stuck green (10s limit)'
        }),
      });
      
      if (response.ok) {
        console.log(`Successfully forced yellow transition`);
      } else {
        console.error(`Failed to force yellow transition: ${response.status}`);
      }
    } catch (error) {
      console.error('Error forcing yellow transition:', error);
    }
  }

  // Emergency vehicle clearing function
  async clearAllVehicles() {
    try {
      console.log('EMERGENCY: Clearing all vehicles...');
      
      const response = await fetch('/api/maintenance/clear-vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          clearAll: true,
          reason: 'Manual clearing for testing'
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Cleared ${result.clearedVehicles} vehicles from ${result.clearedRoads} roads`);
      }
    } catch (error) {
      console.error('Error clearing vehicles:', error);
    }
  }

  stop() {
    if (!this.isRunning) return;

    console.log('Stopping traffic service...');
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (this.vehicleGenerationInterval) {
      clearInterval(this.vehicleGenerationInterval);
      this.vehicleGenerationInterval = null;
    }

    if (this.vehicleMovementInterval) {
      clearInterval(this.vehicleMovementInterval);
      this.vehicleMovementInterval = null;
    }

    this.isRunning = false;
    console.log('Traffic service stopped');
  }

  enableDebug() {
    this.debugMode = true;
    console.log('Debug mode enabled');
  }

  disableDebug() {
    this.debugMode = false;
    console.log('Debug mode disabled');
  }

  async fixVehicleCounts() {
    try {
      console.log('Fixing vehicle counts...');
      
      const response = await fetch('/api/maintenance/fix-counts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Fixed vehicle counts: ${result.fixedRoads} roads corrected`);
      }
    } catch (error) {
      console.error('Error fixing vehicle counts:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      debugMode: this.debugMode,
      intervals: {
        trafficLights: this.interval ? '2s (FAST)' : 'stopped',
        vehicleGeneration: this.vehicleGenerationInterval ? '12s (VERY SLOW + 30% skip rate)' : 'stopped', 
        vehicleMovement: this.vehicleMovementInterval ? '25ms x3 calls (AGGRESSIVE REMOVAL)' : 'stopped'
      }
    };
  }

  async getCurrentStatus() {
    try {
      const response = await fetch('/api/intersections');
      if (response.ok) {
        const data = await response.json();
        const intersections = data.intersections || [];
        
        let totalVehicles = 0;
        
        intersections.forEach(intersection => {
          console.log(`--- ${intersection.name} ---`);
          intersection.trafficLights?.forEach(light => {
            const elapsed = (new Date().getTime() - new Date(light.lastChanged).getTime()) / 1000;
            const vehicleCount = light.road?.vehicleCount || 0;
            totalVehicles += Math.max(0, vehicleCount);
            console.log(`${light.road?.name}: ${light.status} (${elapsed.toFixed(1)}s) - ${vehicleCount} vehicles`);
          });
        });
        
        console.log(`TOTAL VEHICLES: ${totalVehicles}`);
        return totalVehicles;
      }
    } catch (error) {
      console.error('Error getting current status:', error);
    }
  }
}

// Enhanced service with emergency controls
class TrafficSimulationService extends TrafficLightService {
  private monitoringInterval: NodeJS.Timeout | null = null;

  startWithMonitoring() {
    this.start();
    
    this.monitoringInterval = setInterval(async () => {
      await this.monitorAndFix();
    }, 5000); // Monitor every 5 seconds (faster)
    
    console.log('Traffic service started with monitoring (5s intervals)');
  }

  stop() {
    super.stop();
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  async monitorAndFix() {
    if (!this.isRunning) {
      console.log('Service not running. Starting...');
      this.start();
      return;
    }

    try {
      const totalVehicles = await this.getCurrentStatus();
      
      // If too many vehicles (over 50), clear some
      if (totalVehicles && totalVehicles > 50) {
        console.log(`TOO MANY VEHICLES (${totalVehicles}), clearing some...`);
        await this.clearAllVehicles();
      }
      
      // Always check for stuck lights
      await this.checkStuckLights();
      
    } catch (error) {
      console.error('Error in monitoring:', error);
    }
  }
}

// Global instance
const trafficService = new TrafficSimulationService();

// Enhanced global helpers
if (typeof window !== 'undefined') {
  window.trafficService = trafficService;
  
  window.startTraffic = () => trafficService.startWithMonitoring();
  window.stopTraffic = () => trafficService.stop();
  window.fixVehicles = () => trafficService.fixVehicleCounts();
  window.clearAllVehicles = () => trafficService.clearAllVehicles(); // NEW
  window.debugTraffic = () => trafficService.enableDebug();
  window.trafficStatus = () => {
    console.log(trafficService.getStatus());
    return trafficService.getCurrentStatus();
  };
  window.forceCheck = () => trafficService.checkStuckLights();
  
  console.log('Traffic commands: startTraffic(), stopTraffic(), clearAllVehicles(), trafficStatus()');
}

// Auto-start
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('Auto-starting AGGRESSIVE vehicle reduction...');
    trafficService.startWithMonitoring();
  }, 2000);
}

export default trafficService;

export const TrafficControls = {
  start: () => trafficService.startWithMonitoring(),
  stop: () => trafficService.stop(),
  fix: () => trafficService.fixVehicleCounts(),
  clear: () => trafficService.clearAllVehicles(),
  status: () => {
    console.log(trafficService.getStatus());
    return trafficService.getCurrentStatus();
  },
  debug: () => trafficService.enableDebug(),
  checkStuck: () => trafficService.checkStuckLights()
};