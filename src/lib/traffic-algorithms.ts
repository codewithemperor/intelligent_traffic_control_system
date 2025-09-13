import { Status, Algorithm } from '@/types/traffic';
import { FIXED_TIMING } from '@/constants/traffic-config';

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
    const timing = currentLight.timing as any;
    
    let newStatus = currentLight.status;
    
    // Simple state machine for fixed timing
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
      reason: `Fixed timing cycle - ${elapsed}s elapsed in ${currentLight.status} phase`
    };
  }

  /**
   * Adaptive timing algorithm - adjusts based on vehicle count with priority for more vehicles
   */
  static adaptiveTiming(currentLight: any, currentTime: Date): AlgorithmResult {
    const elapsed = (currentTime.getTime() - currentLight.lastChanged.getTime()) / 1000;
    const timing = { ...currentLight.timing } as any;
    
    // Get vehicle count and congestion from the associated road
    const vehicleCount = currentLight.road?.vehicleCount || 0;
    const congestion = currentLight.road?.congestionLevel || 0;
    
    // Calculate green time based on vehicle count (user's requirement)
    // Base green time + additional time based on vehicle count
    const baseGreenTime = 15; // Minimum green time
    const vehicleTimeMultiplier = 2; // 2 seconds per vehicle
    const calculatedGreenTime = baseGreenTime + (vehicleCount * vehicleTimeMultiplier);
    
    // Cap the green time to prevent excessively long cycles
    timing.green = Math.min(calculatedGreenTime, 60); // Max 60 seconds
    timing.red = Math.max(30 - (vehicleCount * 0.5), 15); // Reduce red time for busy roads, min 15s
    timing.cycle = timing.red + timing.yellow + timing.green;
    
    let newStatus = currentLight.status;
    
    // State machine with adjusted timing
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
      reason: `Adaptive timing - ${vehicleCount} vehicles, ${timing.green}s green time`,
      efficiency,
      waitTime: estimatedWaitTime
    };
  }

  /**
   * Smart intersection coordination - ensures at least one green light, prioritizes roads with more vehicles
   */
  static coordinateIntersection(intersection: any): { [lightId: string]: AlgorithmResult } {
    const results: { [lightId: string]: AlgorithmResult } = {};
    const trafficLights = intersection.trafficLights || [];
    
    if (trafficLights.length === 0) return results;
    
    // Sort traffic lights by vehicle count (descending) - busiest road gets priority
    const sortedLights = trafficLights.sort((a, b) => 
      (b.road?.vehicleCount || 0) - (a.road?.vehicleCount || 0)
    );
    
    // Ensure at least one light is green - the busiest road
    const busiestLight = sortedLights[0];
    const otherLights = sortedLights.slice(1);
    
    // Set the busiest road to GREEN
    const busiestVehicleCount = busiestLight.road?.vehicleCount || 0;
    const busiestCongestion = busiestLight.road?.congestionLevel || 0;
    
    // Calculate green time based on vehicle count (minimum 15s, maximum 60s)
    const baseGreenTime = 15;
    const vehicleTimeMultiplier = 2; // 2 seconds per vehicle
    const calculatedGreenTime = Math.min(baseGreenTime + (busiestVehicleCount * vehicleTimeMultiplier), 60);
    
    results[busiestLight.id] = {
      newStatus: Status.GREEN,
      timing: {
        green: calculatedGreenTime,
        yellow: 5,
        red: 30, // Other roads will be red for this duration
        cycle: calculatedGreenTime + 5 + 30
      },
      reason: `Priority green - ${busiestVehicleCount} vehicles, ${calculatedGreenTime}s green time`,
      efficiency: Math.max(0, 1 - busiestCongestion),
      waitTime: 0
    };
    
    // Set all other roads to RED
    otherLights.forEach(light => {
      const vehicleCount = light.road?.vehicleCount || 0;
      const congestion = light.road?.congestionLevel || 0;
      
      results[light.id] = {
        newStatus: Status.RED,
        timing: {
          green: 15, // Default green time for when it becomes their turn
          yellow: 5,
          red: calculatedGreenTime, // Wait for the busy road to finish
          cycle: calculatedGreenTime + 5 + 15
        },
        reason: `Wait priority - ${vehicleCount} vehicles waiting`,
        efficiency: Math.max(0, 1 - congestion),
        waitTime: calculatedGreenTime // Estimated wait time
      };
    });
    
    return results;
  }

  /**
   * AI-optimized algorithm - uses historical patterns and predictive analysis
   */
  static aiOptimized(currentLight: any, currentTime: Date): AlgorithmResult {
    const elapsed = (currentTime.getTime() - currentLight.lastChanged.getTime()) / 1000;
    const timing = { ...currentLight.timing } as any;
    
    // Get current traffic conditions from the associated road
    const vehicleCount = currentLight.road?.vehicleCount || 0;
    const congestion = currentLight.road?.congestionLevel || 0;
    const avgSpeed = currentLight.road?.averageSpeed || 30;
    
    // Time-based factors
    const hour = currentTime.getHours();
    const dayOfWeek = currentTime.getDay();
    
    // Peak hour detection
    const isPeakHour = (hour >= 8 && hour <= 9) || (hour >= 12 && hour <= 13) || (hour >= 16 && hour <= 17);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Calculate predictive factors
    let peakMultiplier = 1;
    if (isPeakHour) peakMultiplier = 1.8;
    if (isWeekend) peakMultiplier *= 0.6;
    
    // Speed factor - slower speeds indicate congestion
    const speedFactor = Math.max(0.5, avgSpeed / 40);
    
    // Combined optimization factor with emphasis on vehicle count
    const optimizationFactor = Math.min(
      (vehicleCount / 10) * peakMultiplier * (2 - speedFactor),
      3.0 // Increased max multiplier for more dramatic timing changes
    );
    
    // Apply AI-optimized timing with vehicle count priority
    timing.green = Math.min(Math.round(15 + (vehicleCount * 2) * optimizationFactor), 90);
    timing.red = Math.max(Math.round(45 / optimizationFactor), 10);
    timing.cycle = timing.red + timing.yellow + timing.green;
    
    let newStatus = currentLight.status;
    
    // Enhanced state machine with predictive elements
    if (currentLight.status === Status.RED && elapsed >= timing.red) {
      newStatus = Status.GREEN;
    } else if (currentLight.status === Status.GREEN && elapsed >= timing.green) {
      newStatus = Status.YELLOW;
    } else if (currentLight.status === Status.YELLOW && elapsed >= timing.yellow) {
      newStatus = Status.RED;
    }
    
    // Advanced efficiency calculation
    const flowRate = vehicleCount * (avgSpeed / 40) * (1 - congestion);
    const efficiency = Math.min(1, flowRate / Math.max(vehicleCount, 1));
    const estimatedWaitTime = vehicleCount > 0 ? Math.round(timing.red * congestion * (2 - speedFactor)) : 0;
    
    return {
      newStatus,
      timing,
      reason: `AI-optimized - ${vehicleCount} vehicles, ${timing.green}s green time, ${Math.round(congestion * 100)}% congestion`,
      efficiency,
      waitTime: estimatedWaitTime
    };
  }

  /**
   * Emergency algorithm - prioritizes emergency vehicles
   */
  static emergency(currentLight: any, currentTime: Date): AlgorithmResult {
    const elapsed = (currentTime.getTime() - currentLight.lastChanged.getTime()) / 1000;
    const timing = { ...currentLight.timing } as any;
    
    // Check for emergency vehicles in the associated road
    const hasEmergencyVehicles = currentLight.road?.vehicles?.some((vehicle: any) => 
      vehicle.type === 'EMERGENCY' && vehicle.priority === 2
    ) || false;
    
    let newStatus = currentLight.status;
    let reason = 'Emergency mode monitoring';
    
    if (hasEmergencyVehicles) {
      // Immediate green for emergency vehicles
      newStatus = Status.GREEN;
      timing.green = 45; // Extended green time for emergency vehicles
      timing.red = 15;   // Reduced red time
      timing.cycle = timing.red + timing.yellow + timing.green;
      reason = 'Emergency vehicle detected - priority clearance';
    } else {
      // Return to normal adaptive timing after emergency
      if (elapsed >= timing.green) {
        newStatus = Status.YELLOW;
      } else if (currentLight.status === Status.YELLOW && elapsed >= timing.yellow) {
        newStatus = Status.RED;
      } else if (currentLight.status === Status.RED && elapsed >= timing.red) {
        newStatus = Status.GREEN;
      }
      reason = 'Emergency mode - no emergency vehicles detected';
    }
    
    const vehicleCount = currentLight.road?.vehicleCount || 0;
    const congestion = currentLight.road?.congestionLevel || 0;
    
    return {
      newStatus,
      timing,
      reason,
      efficiency: hasEmergencyVehicles ? 1.0 : Math.max(0, 1 - congestion),
      waitTime: hasEmergencyVehicles ? 0 : Math.round(timing.red * congestion)
    };
  }

  /**
   * Main algorithm selector - chooses appropriate algorithm based on conditions
   */
  static selectAlgorithm(currentLight: any, currentTime: Date): AlgorithmResult {
    const hasEmergencyVehicles = currentLight.road?.vehicles?.some((vehicle: any) => 
      vehicle.type === 'EMERGENCY' && vehicle.priority === 2
    ) || false;
    
    // Force emergency mode if emergency vehicles detected
    if (hasEmergencyVehicles || currentLight.intersection?.algorithm === 'EMERGENCY') {
      return this.emergency(currentLight, currentTime);
    }
    
    // Use selected algorithm from intersection
    const algorithm = currentLight.intersection?.algorithm || 'ADAPTIVE';
    switch (algorithm) {
      case 'FIXED':
        return this.fixedTiming(currentLight, currentTime);
      case 'ADAPTIVE':
        return this.adaptiveTiming(currentLight, currentTime);
      case 'AI_OPTIMIZED':
        return this.aiOptimized(currentLight, currentTime);
      default:
        return this.adaptiveTiming(currentLight, currentTime); // Default to adaptive
    }
  }

  /**
   * Calculate countdown timing for traffic light display
   */
  static calculateCountdown(trafficLight: any): number {
    const elapsed = (new Date().getTime() - trafficLight.lastChanged.getTime()) / 1000;
    const timing = trafficLight.timing as any;
    
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

  /**
   * Get next traffic light status in intersection cycle
   */
  static getNextIntersectionStatus(intersection: any): { [lightId: string]: Status } {
    const nextStatus: { [lightId: string]: Status } = {};
    const trafficLights = intersection.trafficLights || [];
    
    // Sort by vehicle count to determine priority
    const sortedLights = trafficLights.sort((a, b) => 
      (b.road?.vehicleCount || 0) - (a.road?.vehicleCount || 0)
    );
    
    // Set highest priority road to green, others to red
    sortedLights.forEach((light, index) => {
      if (index === 0) {
        nextStatus[light.id] = Status.GREEN; // Most vehicles gets green
      } else {
        nextStatus[light.id] = Status.RED; // Others get red
      }
    });
    
    return nextStatus;
  }
}