import { Status, Algorithm, TrafficLight, Road } from '@/types/traffic';
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
  static fixedTiming(currentLight: TrafficLight, currentTime: Date): AlgorithmResult {
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
   * Adaptive timing algorithm - adjusts based on vehicle count
   */
  static adaptiveTiming(currentLight: TrafficLight, currentTime: Date): AlgorithmResult {
    const elapsed = (currentTime.getTime() - currentLight.lastChanged.getTime()) / 1000;
    const timing = { ...currentLight.timing } as any;
    
    // Calculate total vehicles and congestion
    const totalVehicles = currentLight.roads?.reduce((sum, road) => sum + road.vehicleCount, 0) || 0;
    const avgCongestion = currentLight.roads?.reduce((sum, road) => sum + road.congestionLevel, 0) / (currentLight.roads?.length || 1) || 0;
    
    // Adjust timing based on traffic conditions
    const congestionFactor = Math.min(avgCongestion * 2, 2); // Max 2x extension
    const vehicleFactor = Math.min(totalVehicles / 20, 1.5); // Max 1.5x extension
    
    const adjustmentFactor = Math.max(congestionFactor, vehicleFactor);
    
    // Adjust green time based on traffic
    const adjustedGreenTime = Math.round(timing.green * adjustmentFactor);
    const adjustedRedTime = Math.round(timing.red / adjustmentFactor); // Reduce red time when traffic is heavy
    
    timing.green = Math.min(adjustedGreenTime, 60); // Max 60 seconds green
    timing.red = Math.max(adjustedRedTime, 15); // Min 15 seconds red
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
    const efficiency = Math.max(0, 1 - avgCongestion);
    const estimatedWaitTime = totalVehicles > 0 ? Math.round(timing.red * avgCongestion) : 0;
    
    return {
      newStatus,
      timing,
      reason: `Adaptive timing - ${totalVehicles} vehicles, ${Math.round(avgCongestion * 100)}% congestion`,
      efficiency,
      waitTime: estimatedWaitTime
    };
  }

  /**
   * AI-optimized algorithm - uses historical patterns and predictive analysis
   */
  static aiOptimized(currentLight: TrafficLight, currentTime: Date): AlgorithmResult {
    const elapsed = (currentTime.getTime() - currentLight.lastChanged.getTime()) / 1000;
    const timing = { ...currentLight.timing } as any;
    
    // Get current traffic conditions
    const totalVehicles = currentLight.roads?.reduce((sum, road) => sum + road.vehicleCount, 0) || 0;
    const avgCongestion = currentLight.roads?.reduce((sum, road) => sum + road.congestionLevel, 0) / (currentLight.roads?.length || 1) || 0;
    const avgSpeed = currentLight.roads?.reduce((sum, road) => sum + road.averageSpeed, 0) / (currentLight.roads?.length || 1) || 30;
    
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
    
    // Combined optimization factor
    const optimizationFactor = Math.min(
      (totalVehicles / 15) * peakMultiplier * (2 - speedFactor),
      2.5
    );
    
    // Apply AI-optimized timing
    timing.green = Math.min(Math.round(timing.green * optimizationFactor), 90);
    timing.red = Math.max(Math.round(timing.red / optimizationFactor), 10);
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
    const flowRate = totalVehicles * (avgSpeed / 40) * (1 - avgCongestion);
    const efficiency = Math.min(1, flowRate / Math.max(totalVehicles, 1));
    const estimatedWaitTime = totalVehicles > 0 ? Math.round(timing.red * avgCongestion * (2 - speedFactor)) : 0;
    
    return {
      newStatus,
      timing,
      reason: `AI-optimized - ${totalVehicles} vehicles, ${Math.round(avgCongestion * 100)}% congestion, ${avgSpeed.toFixed(1)}km/h avg speed`,
      efficiency,
      waitTime: estimatedWaitTime
    };
  }

  /**
   * Emergency algorithm - prioritizes emergency vehicles
   */
  static emergency(currentLight: TrafficLight, currentTime: Date): AlgorithmResult {
    const elapsed = (currentTime.getTime() - currentLight.lastChanged.getTime()) / 1000;
    const timing = { ...currentLight.timing } as any;
    
    // Check for emergency vehicles
    const hasEmergencyVehicles = currentLight.roads?.some(road => 
      road.vehicles?.some(vehicle => vehicle.type === 'EMERGENCY' && vehicle.priority === 2)
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
    
    const totalVehicles = currentLight.roads?.reduce((sum, road) => sum + road.vehicleCount, 0) || 0;
    const avgCongestion = currentLight.roads?.reduce((sum, road) => sum + road.congestionLevel, 0) / (currentLight.roads?.length || 1) || 0;
    
    return {
      newStatus,
      timing,
      reason,
      efficiency: hasEmergencyVehicles ? 1.0 : Math.max(0, 1 - avgCongestion),
      waitTime: hasEmergencyVehicles ? 0 : Math.round(timing.red * avgCongestion)
    };
  }

  /**
   * Main algorithm selector - chooses appropriate algorithm based on conditions
   */
  static selectAlgorithm(currentLight: TrafficLight, currentTime: Date): AlgorithmResult {
    const hasEmergencyVehicles = currentLight.roads?.some(road => 
      road.vehicles?.some(vehicle => vehicle.type === 'EMERGENCY' && vehicle.priority === 2)
    ) || false;
    
    // Force emergency mode if emergency vehicles detected
    if (hasEmergencyVehicles || currentLight.algorithm === Algorithm.EMERGENCY) {
      return this.emergency(currentLight, currentTime);
    }
    
    // Use selected algorithm
    switch (currentLight.algorithm) {
      case Algorithm.FIXED:
        return this.fixedTiming(currentLight, currentTime);
      case Algorithm.ADAPTIVE:
        return this.adaptiveTiming(currentLight, currentTime);
      case Algorithm.AI_OPTIMIZED:
        return this.aiOptimized(currentLight, currentTime);
      default:
        return this.adaptiveTiming(currentLight, currentTime); // Default to adaptive
    }
  }

  /**
   * Calculate intersection coordination for multiple traffic lights
   */
  static coordinateIntersections(trafficLights: TrafficLight[]): { [lightId: string]: number } {
    const coordination: { [lightId: string]: number } = {};
    
    // Simple coordination - offset timing based on distance and priority
    trafficLights.forEach((light, index) => {
      const baseOffset = index * 15; // 15 second offset between lights
      const priorityOffset = (light.priority - 1) * 5; // Priority adjustment
      coordination[light.id] = (baseOffset + priorityOffset) % 60; // Keep within 60 second cycle
    });
    
    return coordination;
  }

  /**
   * Predict traffic flow based on historical patterns
   */
  static predictTrafficFlow(historicalData: any[], timeAhead: number = 30): number {
    if (historicalData.length < 2) return 0;
    
    // Simple linear prediction based on recent trends
    const recent = historicalData.slice(-5);
    const trend = recent.reduce((sum, data, index) => {
      if (index === 0) return 0;
      return sum + (data.vehicleCount - recent[index - 1].vehicleCount);
    }, 0) / (recent.length - 1);
    
    const current = recent[recent.length - 1].vehicleCount;
    const predicted = current + (trend * timeAhead / 5); // Scale prediction based on time ahead
    
    return Math.max(0, predicted);
  }
}