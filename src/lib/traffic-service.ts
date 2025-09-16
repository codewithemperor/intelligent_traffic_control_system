// Updated Traffic Service - Less vehicle generation, more frequent movement
class TrafficLightService {
  private interval: NodeJS.Timeout | null = null;
  private vehicleGenerationInterval: NodeJS.Timeout | null = null;
  private vehicleMovementInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private debugMode = true;

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚦 Starting traffic service - Less generation, more movement...');
    
    // Traffic light cycling: every 3 seconds
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
            console.log(`✅ Traffic cycle: ${result.updatedLights} lights updated`);
            
            if (result.changes) {
              result.changes.forEach(change => {
                console.log(`  ${change.road}: ${change.oldStatus} → ${change.newStatus} (${change.reason})`);
              });
            }
          }
          
          if (result.updatedLights === 0) {
            console.log('⚠️ No light changes detected - checking for stuck states');
            await this.checkStuckLights();
          }
        } else {
          console.error('❌ Failed to process traffic cycle');
        }
      } catch (error) {
        console.error('❌ Error in traffic light service:', error);
      }
    }, 8000);

    // SLOWER vehicle generation: every 8 seconds (was 5)
    this.vehicleGenerationInterval = setInterval(async () => {
      try {
        const hour = new Date().getHours();
        let vehicleCount = 1; // Keep low base count
        
        // Reduced rush hour generation
        if (hour >= 8 && hour <= 9) vehicleCount = 2; // Morning rush (reduced from 3)
        if (hour >= 12 && hour <= 13) vehicleCount = 2; // Lunch rush (reduced from 3)
        if (hour >= 16 && hour <= 17) vehicleCount = 2; // Evening rush (reduced from 3)
        if (hour >= 22 || hour <= 6) vehicleCount = 1; // Night
        
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
              console.log(`🚗 Generated ${result.vehicles.length} vehicles`);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in vehicle generation:', error);
      }
    }, 4000); // Every 3 seconds - SLOWER generation

    // FASTER vehicle movement: every 50ms (was 100ms)
    this.vehicleMovementInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/sensors/readings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'simulate_movement' }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.movedVehicles > 0) {
            if (this.debugMode) {
              console.log(`🚙 Moved/Exited ${result.movedVehicles} vehicles`);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in vehicle movement:', error);
      }
    }, 500); // Every 50ms - MUCH FASTER movement

    console.log('✅ Traffic service started - Lights: 3s, Gen: 8s (slower), Move: 50ms (faster)');
  }

  // Rest of your methods remain the same...
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
          
          yellowLights.forEach(light => {
            const elapsed = (new Date().getTime() - new Date(light.lastChanged).getTime()) / 1000;
            if (elapsed > 5) {
              console.log(`🚨 STUCK YELLOW DETECTED: ${light.road?.name} - ${elapsed.toFixed(1)}s`);
              this.forceRedTransition(light.id);
            }
          });
          
          greenLights.forEach(light => {
            const elapsed = (new Date().getTime() - new Date(light.lastChanged).getTime()) / 1000;
            if (elapsed > 20) {
              console.log(`🚨 STUCK GREEN DETECTED: ${light.road?.name} - ${elapsed.toFixed(1)}s`);
              this.forceYellowTransition(light.id);
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Error checking stuck lights:', error);
    }
  }

  async forceRedTransition(lightId: string) {
    try {
      console.log(`🔧 FORCING red transition for light ${lightId}`);
      
      const response = await fetch('/api/traffic/manual-override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          lightId, 
          newStatus: 'RED',
          reason: 'FORCED - stuck yellow'
        }),
      });
      
      if (response.ok) {
        console.log(`✅ Successfully forced red transition`);
      }
    } catch (error) {
      console.error('❌ Error forcing red transition:', error);
    }
  }

  async forceYellowTransition(lightId: string) {
    try {
      console.log(`🔧 FORCING yellow transition for light ${lightId}`);
      
      const response = await fetch('/api/traffic/manual-override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          lightId, 
          newStatus: 'YELLOW',
          reason: 'FORCED - stuck green'
        }),
      });
      
      if (response.ok) {
        console.log(`✅ Successfully forced yellow transition`);
      } else {
        console.error(`❌ Failed to force yellow transition: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error forcing yellow transition:', error);
    }
  }

  async handleVehicleMovement() {
    try {
      const response = await fetch('/api/sensors/readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'simulate_movement' }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.movedVehicles > 0) {
          console.log(`🚙 Moved ${result.movedVehicles} vehicles`);
        }
      }
    } catch (error) {
      console.error('❌ Error in vehicle movement:', error);
    }
  }

  stop() {
    if (!this.isRunning) return;

    console.log('🛑 Stopping traffic service...');
    
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
    console.log('✅ Traffic service stopped');
  }

  enableDebug() {
    this.debugMode = true;
    console.log('✅ Debug mode enabled');
  }

  disableDebug() {
    this.debugMode = false;
    console.log('✅ Debug mode disabled');
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
        trafficLights: this.interval ? '3s' : 'stopped',
        vehicleGeneration: this.vehicleGenerationInterval ? '8s (SLOWER)' : 'stopped', 
        vehicleMovement: this.vehicleMovementInterval ? '50ms (FASTER)' : 'stopped'
      }
    };
  }

  async getCurrentStatus() {
    try {
      const response = await fetch('/api/intersections');
      if (response.ok) {
        const data = await response.json();
        const intersections = data.intersections || [];
        
        intersections.forEach(intersection => {
          console.log(`--- ${intersection.name} ---`);
          intersection.trafficLights?.forEach(light => {
            const elapsed = (new Date().getTime() - new Date(light.lastChanged).getTime()) / 1000;
            console.log(`${light.road?.name}: ${light.status} (${elapsed.toFixed(1)}s) - ${light.road?.vehicleCount} vehicles`);
          });
        });
      }
    } catch (error) {
      console.error('Error getting current status:', error);
    }
  }
}

// Enhanced Traffic Simulation Service with monitoring
class TrafficSimulationService extends TrafficLightService {
  private monitoringInterval: NodeJS.Timeout | null = null;

  startWithMonitoring() {
    this.start();
    
    this.monitoringInterval = setInterval(async () => {
      await this.monitorAndFix();
    }, 10000);
    
    console.log('Traffic service started with monitoring (10s intervals)');
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
      const response = await fetch('/api/intersections');
      if (response.ok) {
        const data = await response.json();
        const intersections = data.intersections || [];
        
        let hasNegativeCounts = false;
        let totalVehicles = 0;
        let stuckLights = 0;
        
        for (const intersection of intersections) {
          for (const road of intersection.roads || []) {
            if (road.vehicleCount < 0) {
              hasNegativeCounts = true;
              if (this.debugMode) {
                console.log(`Negative count detected: ${road.name} = ${road.vehicleCount}`);
              }
            }
            totalVehicles += Math.max(0, road.vehicleCount);
          }
          
          for (const light of intersection.trafficLights || []) {
            const elapsed = (new Date().getTime() - new Date(light.lastChanged).getTime()) / 1000;
            if ((light.status === 'YELLOW' && elapsed > 5) || 
                (light.status === 'GREEN' && elapsed > 20)) {
              stuckLights++;
            }
          }
        }

        if (hasNegativeCounts) {
          console.log('Negative counts detected, fixing...');
          await this.fixVehicleCounts();
        }

        if (stuckLights > 0) {
          console.log(`${stuckLights} stuck lights detected, checking...`);
          await this.checkStuckLights();
        }

        if (this.debugMode) {
          console.log(`Status: ${totalVehicles} vehicles, ${intersections.length} intersections, ${stuckLights} stuck lights`);
        }
      }
    } catch (error) {
      console.error('Error in monitoring:', error);
    }
  }
}

// Global instance
const trafficService = new TrafficSimulationService();

// Global helpers
if (typeof window !== 'undefined') {
  window.trafficService = trafficService;
  
  window.startTraffic = () => trafficService.startWithMonitoring();
  window.stopTraffic = () => trafficService.stop();
  window.fixVehicles = () => trafficService.fixVehicleCounts();
  window.debugTraffic = () => trafficService.enableDebug();
  window.trafficStatus = () => {
    console.log(trafficService.getStatus());
    trafficService.getCurrentStatus();
  };
  window.forceCheck = () => trafficService.checkStuckLights();
  
  console.log('Traffic debugging commands available: startTraffic(), stopTraffic(), fixVehicles(), debugTraffic(), trafficStatus(), forceCheck()');
}

// Auto-start
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('Auto-starting traffic simulation - Less generation, more movement...');
    trafficService.startWithMonitoring();
  }, 2000);
}

export default trafficService;

export const TrafficControls = {
  start: () => trafficService.startWithMonitoring(),
  stop: () => trafficService.stop(),
  fix: () => trafficService.fixVehicleCounts(),
  status: () => {
    console.log(trafficService.getStatus());
    return trafficService.getCurrentStatus();
  },
  debug: () => trafficService.enableDebug(),
  checkStuck: () => trafficService.checkStuckLights()
};