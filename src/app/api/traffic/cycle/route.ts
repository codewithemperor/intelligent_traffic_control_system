import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Status, Algorithm } from '@/types/traffic';
import { TrafficAlgorithms } from '@/lib/traffic-algorithms';

export async function POST(request: NextRequest) {
  try {
    // Get all intersections with their traffic lights and roads
    const intersections = await db.intersection.findMany({
      include: {
        trafficLights: {
          include: {
            road: {
              include: {
                vehicles: true
              }
            },
            intersection: true
          }
        },
        roads: {
          include: {
            vehicles: true,
            trafficLights: true
          }
        }
      }
    });

    const updatedIntersections = [];
    const updatedLights = [];
    const currentTime = new Date();

    // Process each intersection INDEPENDENTLY
    for (const intersection of intersections) {
      if (!intersection.isActive) continue;

      // Each intersection makes its own decisions based on its own traffic data
      // No coordination between different intersections
      const algorithmResults = TrafficAlgorithms.coordinateIntersection(intersection);

      // Update traffic lights for this intersection based on algorithm results
      const lightUpdates = [];
      for (const [lightId, result] of Object.entries(algorithmResults)) {
        const light = intersection.trafficLights.find(l => l.id === lightId);
        if (!light) continue;

        // Only update if status has changed
        if (light.status !== result.newStatus) {
          lightUpdates.push(
            db.trafficLight.update({
              where: { id: lightId },
              data: {
                status: result.newStatus,
                timing: result.timing,
                lastChanged: currentTime,
                totalCycles: result.newStatus === Status.RED ? 
                  (light.totalCycles || 0) + 1 : 
                  (light.totalCycles || 0),
                currentCycleTime: 0 // Reset cycle time when status changes
              }
            })
          );
        }
      }

      if (lightUpdates.length > 0) {
        await Promise.all(lightUpdates);

        // Log the cycle changes for this intersection only
        const logEntries = Object.entries(algorithmResults).map(([lightId, result]) => {
          const light = intersection.trafficLights.find(l => l.id === lightId);
          const road = light?.road;
          return {
            intersectionId: intersection.id,
            trafficLightId: lightId,
            action: 'CYCLE_CHANGE',
            previousState: light?.status || Status.RED,
            newState: result.newStatus,
            reason: result.reason,
            vehicleCount: road?.vehicleCount || 0,
            efficiency: result.efficiency,
            waitTime: result.waitTime
          };
        });

        await db.trafficLog.createMany({
          data: logEntries
        });

        updatedIntersections.push(intersection.id);
        updatedLights.push(...Object.keys(algorithmResults));
      }
    }

    return NextResponse.json({
      message: `Processed ${intersections.length} independent intersections`,
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