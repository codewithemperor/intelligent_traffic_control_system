import { Status, Algorithm } from '@/types/traffic';

export interface AlgorithmResult {
  newStatus: Status;
  timing: {
    red: number;
    yellow: number;
    green: number;
    cycle: number;
  };
  reason: string;
  efficiency?: number;
  waitTime?: number;
}

export class TrafficAlgorithms {
  /**
   * Fixed timing algorithm - consistent intervals regardless of traffic
   */
  static fixedTiming(currentLight: any, currentTime: Date): AlgorithmResult {
    const elapsed = (currentTime.getTime() - currentLight.lastChanged.getTime()) / 1000;
    const timing = {
      red: 15,
      yellow: 3,
      green: 8,
      cycle: 26
    };
    
    let newStatus = currentLight.status;
    
    // Proper state machine: RED → GREEN → YELLOW → RED
    if (currentLight.status === Status.RED && elapsed >= timing.red) {
      newStatus = Status.GREEN;
    } else if (currentLight.status === Status.GREEN && elapsed >= timing.green) {
      newStatus = Status.YELLOW;
    } else if (currentLight.status === Status.YELLOW && elapsed >= timing.yellow) {
      newStatus = Status.RED;
    }
    
    return {
      newStatus,
      timing,
      reason: `Fixed timing - ${elapsed}s elapsed in ${currentLight.status} phase`
    };
  }

  /**
   * Adaptive timing algorithm - SHORT timing with vehicle count priority
   */
  static adaptiveTiming(currentLight: any, currentTime: Date): AlgorithmResult {
    const elapsed = (currentTime.getTime() - currentLight.lastChanged.getTime()) / 1000;
    
    // Get vehicle count and ensure it's not negative
    const vehicleCount = Math.max(0, currentLight.road?.vehicleCount || 0);
    const congestion = Math.max(0, Math.min(1, currentLight.road?.congestionLevel || 0));
    
    // SHORT timing as requested: base 7-8 seconds, max 15 seconds
    const baseGreenTime = 7; // Base green time
    const vehicleTimeBonus = Math.min(vehicleCount * 0.5, 8); // Max 8 seconds bonus
    const greenTime = Math.min(baseGreenTime + vehicleTimeBonus, 15); // Cap at 15 seconds
    
    const timing = {
      red: Math.max(15 - vehicleCount, 8), // Shorter red for busy roads, min 8s
      yellow: 3, // Fixed yellow time
      green: greenTime,
      cycle: 0
    };
    timing.cycle = timing.red + timing.yellow + timing.green;
    
    let newStatus = currentLight.status;
    
    // Proper state transitions: RED → GREEN → YELLOW → RED
    if (currentLight.status === Status.RED && elapsed >= timing.red) {
      newStatus = Status.GREEN;
    } else if (currentLight.status === Status.GREEN && elapsed >= timing.green) {
      newStatus = Status.YELLOW;
    } else if (currentLight.status === Status.YELLOW && elapsed >= timing.yellow) {
      newStatus = Status.RED;
    }
    
    // Calculate efficiency metrics
    const efficiency = Math.max(0, 1 - congestion);
    const estimatedWaitTime = vehicleCount > 0 ? Math.round(timing.red * congestion) : 0;
    
    return {
      newStatus,
      timing,
      reason: `Adaptive - ${vehicleCount} vehicles, ${greenTime}s green`,
      efficiency,
      waitTime: estimatedWaitTime
    };
  }

  /**
   * Smart intersection coordination - FIXED with proper logic
   */
  static coordinateIntersection(intersection: any): { [lightId: string]: AlgorithmResult } {
    const results: { [lightId: string]: AlgorithmResult } = {};
    const trafficLights = intersection.trafficLights || [];
    
    if (trafficLights.length === 0) return results;
    
    const currentTime = new Date();
    
    // Find current green light
    const currentGreenLight = trafficLights.find(light => light.status === 'GREEN');
    const currentYellowLight = trafficLights.find(light => light.status === 'YELLOW');
    
    // If we have a yellow light, check if it should turn red and cycle to next
    if (currentYellowLight) {
      const elapsed = (currentTime.getTime() - currentYellowLight.lastChanged.getTime()) / 1000;
      
      if (elapsed >= 3) { // Yellow lasts 3 seconds
        // Yellow light turns RED
        results[currentYellowLight.id] = {
          newStatus: Status.RED,
          timing: { red: 15, yellow: 3, green: 8, cycle: 26 },
          reason: 'Yellow expired - turning red'
        };
        
        // Find next light to turn GREEN (priority by vehicle count)
        const otherLights = trafficLights.filter(light => light.id !== currentYellowLight.id);
        const nextGreenLight = otherLights.sort((a, b) => 
          Math.max(0, b.road?.vehicleCount || 0) - Math.max(0, a.road?.vehicleCount || 0)
        )[0];
        
        if (nextGreenLight) {
          const vehicleCount = Math.max(0, nextGreenLight.road?.vehicleCount || 0);
          const nextGreenTime = Math.min(7 + (vehicleCount * 0.5), 15); // 7-15 seconds
          
          results[nextGreenLight.id] = {
            newStatus: Status.GREEN,
            timing: {
              red: 15,
              yellow: 3,
              green: nextGreenTime,
              cycle: 18 + nextGreenTime
            },
            reason: `Next in cycle - ${vehicleCount} vehicles`,
            efficiency: Math.max(0, 1 - (nextGreenLight.road?.congestionLevel || 0)),
            waitTime: 0
          };
          
          // Set remaining lights to RED
          const remainingLights = otherLights.filter(light => 
            light.id !== nextGreenLight?.id
          );
          
          remainingLights.forEach(light => {
            const lightVehicleCount = Math.max(0, light.road?.vehicleCount || 0);
            results[light.id] = {
              newStatus: Status.RED,
              timing: { red: 15, yellow: 3, green: 8, cycle: 26 },
              reason: `Waiting - ${lightVehicleCount} vehicles`,
              efficiency: Math.max(0, 1 - (light.road?.congestionLevel || 0)),
              waitTime: nextGreenTime + 3 // FIXED: Use nextGreenTime instead of undefined greenTime
            };
          });
        }
        
        return results;
      }
    }
    
    // GREEN LIGHT logic - check if should turn to yellow
    if (currentGreenLight) {
      const elapsed = (currentTime.getTime() - currentGreenLight.lastChanged.getTime()) / 1000;
      const vehicleCount = Math.max(0, currentGreenLight.road?.vehicleCount || 0);
      const greenTime = Math.max(7, Math.min(7 + (vehicleCount * 0.5), 15));
      
      console.log(`Green light check: ${currentGreenLight.road?.name}, elapsed: ${elapsed}s, greenTime: ${greenTime}s, vehicles: ${vehicleCount}`);
      
      // IMMEDIATE red transition if NO vehicles and others have vehicles
      const otherRoadsHaveVehicles = trafficLights
        .filter(light => light.id !== currentGreenLight.id)
        .some(light => Math.max(0, light.road?.vehicleCount || 0) > 0);
      
      // Force immediate change if no vehicles and others are waiting
      if (vehicleCount === 0 && otherRoadsHaveVehicles && elapsed >= 3) {
        console.log(`IMMEDIATE switch - empty road with others waiting`);
        
        // Skip yellow, go straight to red for empty roads
        results[currentGreenLight.id] = {
          newStatus: Status.RED,
          timing: { red: 8, yellow: 2, green: 7, cycle: 17 },
          reason: 'IMMEDIATE red - no vehicles, others waiting'
        };
        
        // Find next road with most vehicles
        const nextLight = trafficLights
          .filter(light => light.id !== currentGreenLight.id)
          .sort((a, b) => Math.max(0, b.road?.vehicleCount || 0) - Math.max(0, a.road?.vehicleCount || 0))[0];
        
        if (nextLight && Math.max(0, nextLight.road?.vehicleCount || 0) > 0) {
          const nextVehicleCount = Math.max(0, nextLight.road?.vehicleCount || 0);
          const nextGreenTime = Math.max(7, Math.min(7 + (nextVehicleCount * 0.5), 15));
          
          console.log(`IMMEDIATE activation: ${nextLight.road?.name} with ${nextVehicleCount} vehicles`);
          
          results[nextLight.id] = {
            newStatus: Status.GREEN,
            timing: {
              red: 12,
              yellow: 2,
              green: nextGreenTime,
              cycle: 14 + nextGreenTime
            },
            reason: `IMMEDIATE priority - ${nextVehicleCount} vehicles, ${nextGreenTime}s`,
            efficiency: 1.0,
            waitTime: 0
          };
          
          // Set other lights to red
          trafficLights
            .filter(light => light.id !== currentGreenLight.id && light.id !== nextLight.id)
            .forEach(light => {
              const lightVehicles = Math.max(0, light.road?.vehicleCount || 0);
              results[light.id] = {
                newStatus: Status.RED,
                timing: { red: 12, yellow: 2, green: 8, cycle: 22 },
                reason: `Queue waiting - ${lightVehicles} vehicles`
              };
            });
        }
        
        return results;
      }
      
      // Normal green to yellow transition after allocated green time
      if (elapsed >= greenTime) {
        console.log(`Normal green to yellow transition after ${elapsed}s`);
        
        results[currentGreenLight.id] = {
          newStatus: Status.YELLOW,
          timing: {
            red: 12,
            yellow: 2,
            green: greenTime,
            cycle: 14 + greenTime
          },
          reason: `Green expired (${greenTime}s) - turning yellow`
        };
        
        // Other lights stay red during yellow transition
        trafficLights
          .filter(light => light.id !== currentGreenLight.id)
          .forEach(light => {
            const lightVehicles = Math.max(0, light.road?.vehicleCount || 0);
            results[light.id] = {
              newStatus: Status.RED,
              timing: { red: 12, yellow: 2, green: 8, cycle: 22 },
              reason: `Waiting for yellow completion - ${lightVehicles} vehicles`
            };
          });
        
        return results;
      } else {
        // Green light continues - show countdown
        const remaining = greenTime - elapsed;
        results[currentGreenLight.id] = {
          newStatus: Status.GREEN,
          timing: {
            red: 12,
            yellow: 2,
            green: greenTime,
            cycle: 14 + greenTime
          },
          reason: `Green continues - ${remaining.toFixed(1)}s remaining`
        };
        
        // Other lights stay red
        trafficLights
          .filter(light => light.id !== currentGreenLight.id)
          .forEach(light => {
            const lightVehicles = Math.max(0, light.road?.vehicleCount || 0);
            results[light.id] = {
              newStatus: Status.RED,
              timing: { red: 12, yellow: 2, green: 8, cycle: 22 },
              reason: `Waiting in queue - ${lightVehicles} vehicles`
            };
          });
        
        return results;
      }
    }
    
    // NO GREEN OR YELLOW LIGHT - Start new cycle with highest priority road
    if (!currentGreenLight && !currentYellowLight) {
      console.log(`No active lights - starting new cycle`);
      
      const priorityLight = trafficLights.sort((a, b) => 
        Math.max(0, b.road?.vehicleCount || 0) - Math.max(0, a.road?.vehicleCount || 0)
      )[0];
      
      if (priorityLight) {
        const vehicleCount = Math.max(0, priorityLight.road?.vehicleCount || 0);
        const greenTime = Math.max(7, Math.min(7 + (vehicleCount * 0.5), 15)); // Ensure minimum 7 seconds
        
        console.log(`Starting new cycle: ${priorityLight.road?.name} with ${vehicleCount} vehicles for ${greenTime}s`);
        
        results[priorityLight.id] = {
          newStatus: Status.GREEN,
          timing: {
            red: 12,
            yellow: 2,
            green: greenTime,
            cycle: 14 + greenTime
          },
          reason: `New cycle start - ${vehicleCount} vehicles, ${greenTime}s green`,
          efficiency: 1.0,
          waitTime: 0
        };
        
        // Set ALL others to red
        trafficLights
          .filter(light => light.id !== priorityLight.id)
          .forEach(light => {
            const lightVehicles = Math.max(0, light.road?.vehicleCount || 0);
            results[light.id] = {
              newStatus: Status.RED,
              timing: { red: 12, yellow: 2, green: 8, cycle: 22 },
              reason: `Initial queue - ${lightVehicles} vehicles`
            };
          });
      }
      
      return results;
    }
    
    // No changes needed
    trafficLights.forEach(light => {
      results[light.id] = {
        newStatus: light.status,
        timing: light.timing || { red: 15, yellow: 3, green: 8, cycle: 26 },
        reason: `No change - continuing current phase`
      };
    });
    
    return results;
  }

  /**
   * AI-optimized algorithm with SHORT timing
   */
  static aiOptimized(currentLight: any, currentTime: Date): AlgorithmResult {
    const elapsed = (currentTime.getTime() - currentLight.lastChanged.getTime()) / 1000;
    
    const vehicleCount = Math.max(0, currentLight.road?.vehicleCount || 0);
    const congestion = Math.max(0, Math.min(1, currentLight.road?.congestionLevel || 0));
    const avgSpeed = Math.max(5, currentLight.road?.averageSpeed || 30);
    
    // Time-based factors
    const hour = currentTime.getHours();
    const isPeakHour = (hour >= 8 && hour <= 9) || (hour >= 12 && hour <= 13) || (hour >= 16 && hour <= 17);
    
    // SHORT green times with AI optimization
    const baseGreenTime = 7;
    let vehicleBonus = vehicleCount * 0.4; // Reduced multiplier for shorter times
    if (isPeakHour) vehicleBonus *= 1.2;
    
    const greenTime = Math.min(baseGreenTime + vehicleBonus, 15); // Max 15 seconds
    
    const timing = {
      red: Math.max(12 - Math.floor(vehicleCount * 0.3), 6), // Shorter red for busy roads
      yellow: 3,
      green: Math.round(greenTime),
      cycle: 0
    };
    timing.cycle = timing.red + timing.yellow + timing.green;
    
    let newStatus = currentLight.status;
    
    // State machine
    if (currentLight.status === Status.RED && elapsed >= timing.red) {
      newStatus = Status.GREEN;
    } else if (currentLight.status === Status.GREEN && elapsed >= timing.green) {
      newStatus = Status.YELLOW;
    } else if (currentLight.status === Status.YELLOW && elapsed >= timing.yellow) {
      newStatus = Status.RED;
    }
    
    const flowRate = vehicleCount * (avgSpeed / 40) * (1 - congestion);
    const efficiency = Math.min(1, flowRate / Math.max(vehicleCount, 1));
    const estimatedWaitTime = vehicleCount > 0 ? Math.round(timing.red * congestion) : 0;
    
    return {
      newStatus,
      timing,
      reason: `AI-optimized - ${vehicleCount} vehicles, ${timing.green}s green`,
      efficiency,
      waitTime: estimatedWaitTime
    };
  }

  /**
   * Emergency algorithm - immediate green for emergency vehicles
   */
  static emergency(currentLight: any, currentTime: Date): AlgorithmResult {
    const elapsed = (currentTime.getTime() - currentLight.lastChanged.getTime()) / 1000;
    
    const hasEmergencyVehicles = currentLight.road?.vehicles?.some((vehicle: any) => 
      vehicle.type === 'EMERGENCY' && vehicle.priority === 2
    ) || false;
    
    let newStatus = currentLight.status;
    let reason = 'Emergency monitoring';
    
    const timing = {
      red: 5,   // Very short red
      yellow: 2, // Very short yellow  
      green: 20, // Extended green for emergency
      cycle: 27
    };
    
    if (hasEmergencyVehicles) {
      // Immediate green for emergency vehicles
      newStatus = Status.GREEN;
      reason = 'Emergency vehicle - immediate green';
    } else {
      // Normal transitions with short timing
      if (currentLight.status === Status.RED && elapsed >= timing.red) {
        newStatus = Status.GREEN;
      } else if (currentLight.status === Status.GREEN && elapsed >= timing.green) {
        newStatus = Status.YELLOW;
      } else if (currentLight.status === Status.YELLOW && elapsed >= timing.yellow) {
        newStatus = Status.RED;
      }
      reason = 'Emergency mode - no emergency vehicles';
    }
    
    const vehicleCount = Math.max(0, currentLight.road?.vehicleCount || 0);
    const congestion = Math.max(0, Math.min(1, currentLight.road?.congestionLevel || 0));
    
    return {
      newStatus,
      timing,
      reason,
      efficiency: hasEmergencyVehicles ? 1.0 : Math.max(0, 1 - congestion),
      waitTime: hasEmergencyVehicles ? 0 : Math.round(timing.red * congestion)
    };
  }

  /**
   * Main algorithm selector
   */
  static selectAlgorithm(currentLight: any, currentTime: Date): AlgorithmResult {
    const hasEmergencyVehicles = currentLight.road?.vehicles?.some((vehicle: any) => 
      vehicle.type === 'EMERGENCY' && vehicle.priority === 2
    ) || false;
    
    if (hasEmergencyVehicles || currentLight.intersection?.algorithm === 'EMERGENCY') {
      return this.emergency(currentLight, currentTime);
    }
    
    const algorithm = currentLight.intersection?.algorithm || 'ADAPTIVE';
    switch (algorithm) {
      case 'FIXED':
        return this.fixedTiming(currentLight, currentTime);
      case 'ADAPTIVE':
        return this.adaptiveTiming(currentLight, currentTime);
      case 'AI_OPTIMIZED':
        return this.aiOptimized(currentLight, currentTime);
      default:
        return this.adaptiveTiming(currentLight, currentTime);
    }
  }

  /**
   * Calculate countdown timing
   */
  static calculateCountdown(trafficLight: any): number {
    const elapsed = (new Date().getTime() - trafficLight.lastChanged.getTime()) / 1000;
    const timing = trafficLight.timing || { red: 15, yellow: 3, green: 8, cycle: 26 };
    
    let remainingTime = 0;
    
    switch (trafficLight.status) {
      case Status.RED:
        remainingTime = Math.max(0, timing.red - elapsed);
        break;
      case Status.GREEN:
        remainingTime = Math.max(0, timing.green - elapsed);
        break;
      case Status.YELLOW:
        remainingTime = Math.max(0, timing.yellow - elapsed);
        break;
      default:
        remainingTime = 0;
    }
    
    return Math.round(remainingTime);
  }
}