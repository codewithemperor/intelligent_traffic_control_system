import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Status, Algorithm } from '@/types/traffic';

export async function POST(request: NextRequest) {
  try {
    // Get all intersections with their traffic lights and phases
    const intersections = await db.intersection.findMany({
      include: {
        trafficLights: {
          include: {
            road: {
              include: {
                vehicles: true
              }
            }
          }
        },
        phases: {
          include: {
            phaseLights: {
              include: {
                trafficLight: true
              }
            }
          },
          orderBy: {
            phaseNumber: 'asc'
          }
        },
        roads: {
          include: {
            vehicles: true
          }
        }
      }
    });

    const updatedIntersections = [];
    const updatedLights = [];
    const currentTime = new Date();

    for (const intersection of intersections) {
      if (!intersection.isActive) continue;

      // Apply intersection-specific traffic algorithm
      const algorithmResult = await processIntersectionCycle(intersection, currentTime);

      if (algorithmResult.hasChanges) {
        // Update traffic lights for this intersection
        const lightUpdates = algorithmResult.lightUpdates.map(update => 
          db.trafficLight.update({
            where: { id: update.lightId },
            data: {
              status: update.newStatus,
              lastChanged: currentTime,
              totalCycles: update.newStatus === Status.RED ? 
                (intersection.trafficLights.find(l => l.id === update.lightId)?.totalCycles || 0) + 1 : 
                (intersection.trafficLights.find(l => l.id === update.lightId)?.totalCycles || 0)
            }
          })
        );

        await Promise.all(lightUpdates);

        // Log the cycle changes
        const logEntries = algorithmResult.lightUpdates.map(update => {
          const light = intersection.trafficLights.find(l => l.id === update.lightId);
          const road = light?.road;
          return {
            intersectionId: intersection.id,
            trafficLightId: update.lightId,
            action: 'CYCLE_CHANGE',
            previousState: update.previousStatus,
            newState: update.newStatus,
            reason: update.reason,
            vehicleCount: road?.vehicleCount || 0,
            efficiency: algorithmResult.efficiency,
            waitTime: algorithmResult.waitTime
          };
        });

        await db.trafficLog.createMany({
          data: logEntries
        });

        updatedIntersections.push(intersection.id);
        updatedLights.push(...algorithmResult.lightUpdates.map(u => u.lightId));
      }
    }

    return NextResponse.json({
      message: `Processed ${intersections.length} intersections`,
      updatedIntersections: updatedIntersections.length,
      updatedLights: updatedLights.length,
      timestamp: currentTime.toISOString()
    });
  } catch (error) {
    console.error('Error in traffic cycle processing:', error);
    return NextResponse.json(
      { error: 'Failed to process traffic cycles' },
      { status: 500 }
    );
  }
}

async function processIntersectionCycle(intersection: any, currentTime: Date) {
  const algorithm = intersection.algorithm;
  const phases = intersection.phases;
  const trafficLights = intersection.trafficLights;
  
  const lightUpdates = [];
  let hasChanges = false;
  let efficiency = 0.8;
  let waitTime = 0;

  switch (algorithm) {
    case Algorithm.FIXED:
      // Fixed timing algorithm - cycle through phases
      const currentPhaseIndex = Math.floor((currentTime.getTime() / 1000) % 120) / 60; // 2-minute cycle
      const currentPhase = phases[currentPhaseIndex];
      
      if (currentPhase) {
        for (const phaseLight of currentPhase.phaseLights) {
          const light = trafficLights.find(l => l.id === phaseLight.trafficLightId);
          if (light && light.status !== phaseLight.status) {
            lightUpdates.push({
              lightId: phaseLight.trafficLightId,
              previousStatus: light.status,
              newStatus: phaseLight.status,
              reason: `Fixed timing - ${currentPhase.name}`
            });
            hasChanges = true;
          }
        }
      }
      break;

    case Algorithm.ADAPTIVE:
      // Adaptive algorithm - adjust based on vehicle count
      const totalVehicles = intersection.roads.reduce((sum, road) => sum + road.vehicleCount, 0);
      const maxCapacity = intersection.roads.reduce((sum, road) => sum + road.maxCapacity, 0);
      const congestionLevel = maxCapacity > 0 ? totalVehicles / maxCapacity : 0;

      // Simple adaptive logic: prioritize directions with more vehicles
      const roadsWithVehicles = intersection.roads
        .map(road => ({
          road,
          vehicleCount: road.vehicleCount,
          trafficLight: trafficLights.find(light => light.roadId === road.id)
        }))
        .filter(item => item.trafficLight)
        .sort((a, b) => b.vehicleCount - a.vehicleCount);

      if (roadsWithVehicles.length > 0) {
        // Give green to the road with most vehicles
        const prioritizedRoad = roadsWithVehicles[0];
        const otherRoads = roadsWithVehicles.slice(1);

        // Update prioritized road to green
        if (prioritizedRoad.trafficLight.status !== Status.GREEN) {
          lightUpdates.push({
            lightId: prioritizedRoad.trafficLight.id,
            previousStatus: prioritizedRoad.trafficLight.status,
            newStatus: Status.GREEN,
            reason: `Adaptive - High vehicle count (${prioritizedRoad.vehicleCount} vehicles)`
          });
          hasChanges = true;
        }

        // Set other roads to red
        for (const road of otherRoads) {
          if (road.trafficLight.status !== Status.RED) {
            lightUpdates.push({
              lightId: road.trafficLight.id,
              previousStatus: road.trafficLight.status,
              newStatus: Status.RED,
              reason: `Adaptive - Lower priority`
            });
            hasChanges = true;
          }
        }

        efficiency = 1 - congestionLevel;
        waitTime = Math.round(congestionLevel * 60); // Wait time in seconds
      }
      break;

    case Algorithm.AI_OPTIMIZED:
      // AI-optimized algorithm - consider multiple factors
      const aiTotalVehicles = intersection.roads.reduce((sum, road) => sum + road.vehicleCount, 0);
      const aiMaxCapacity = intersection.roads.reduce((sum, road) => sum + road.maxCapacity, 0);
      const aiCongestionLevel = aiMaxCapacity > 0 ? aiTotalVehicles / aiMaxCapacity : 0;
      
      // Consider time of day, current congestion, and historical patterns
      const hour = currentTime.getHours();
      let timeMultiplier = 1;
      
      if (hour >= 8 && hour <= 9 || hour >= 16 && hour <= 17) {
        timeMultiplier = 1.5; // Peak hours
      } else if (hour >= 22 || hour <= 6) {
        timeMultiplier = 0.3; // Night time
      }

      // Calculate optimal flow based on multiple factors
      const optimizedRoads = intersection.roads
        .map(road => ({
          road,
          vehicleCount: road.vehicleCount,
          congestionLevel: road.congestionLevel,
          avgSpeed: road.averageSpeed,
          trafficLight: trafficLights.find(light => light.roadId === road.id),
          score: (road.vehicleCount / road.maxCapacity) * timeMultiplier
        }))
        .filter(item => item.trafficLight)
        .sort((a, b) => b.score - a.score);

      if (optimizedRoads.length > 0) {
        // Implement intelligent phase selection
        const bestRoad = optimizedRoads[0];
        const threshold = 0.6; // Minimum score to get green light

        if (bestRoad.score > threshold && bestRoad.trafficLight.status !== Status.GREEN) {
          lightUpdates.push({
            lightId: bestRoad.trafficLight.id,
            previousStatus: bestRoad.trafficLight.status,
            newStatus: Status.GREEN,
            reason: `AI Optimized - Score: ${bestRoad.score.toFixed(2)}`
          });
          hasChanges = true;
        }

        // Set lower priority roads to red
        for (const road of optimizedRoads.slice(1)) {
          if (road.trafficLight.status !== Status.RED && road.score < threshold) {
            lightUpdates.push({
              lightId: road.trafficLight.id,
              previousStatus: road.trafficLight.status,
              newStatus: Status.RED,
              reason: `AI Optimized - Low priority`
            });
            hasChanges = true;
          }
        }

        efficiency = Math.max(0.5, 1 - aiCongestionLevel);
        waitTime = Math.round(aiCongestionLevel * 45); // Optimized wait time
      }
      break;

    case Algorithm.EMERGENCY:
      // Emergency mode - all lights should be green
      for (const light of trafficLights) {
        if (light.status !== Status.GREEN) {
          lightUpdates.push({
            lightId: light.id,
            previousStatus: light.status,
            newStatus: Status.GREEN,
            reason: 'Emergency mode - all green'
          });
          hasChanges = true;
        }
      }
      efficiency = 1.0;
      waitTime = 0;
      break;
  }

  return {
    hasChanges,
    lightUpdates,
    efficiency,
    waitTime
  };
}