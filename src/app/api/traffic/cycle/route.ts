import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TrafficAlgorithms } from '@/lib/traffic-algorithms';

export async function POST(request: NextRequest) {
  try {
    // Get all traffic lights
    const trafficLights = await db.trafficLight.findMany({
      include: {
        roads: {
          include: {
            vehicles: true
          }
        }
      }
    });

    const updatedLights = [];
    const currentTime = new Date();

    for (const light of trafficLights) {
      if (!light.isActive) continue;

      // Apply traffic algorithm to determine new state
      const algorithmResult = TrafficAlgorithms.selectAlgorithm(light, currentTime);

      // Update traffic light if status should change
      if (algorithmResult.newStatus !== light.status) {
        const updatedLight = await db.trafficLight.update({
          where: { id: light.id },
          data: {
            status: algorithmResult.newStatus,
            timing: algorithmResult.timing,
            lastChanged: currentTime,
            totalCycles: algorithmResult.newStatus === 'RED' ? light.totalCycles + 1 : light.totalCycles
          },
          include: {
            roads: {
              include: {
                vehicles: true
              }
            }
          }
        });

        // Log the cycle change
        await db.trafficLog.create({
          data: {
            trafficLightId: light.id,
            action: 'CYCLE_CHANGE',
            previousState: light.status,
            newState: algorithmResult.newStatus,
            reason: algorithmResult.reason,
            vehicleCount: light.roads.reduce((sum, road) => sum + road.vehicleCount, 0),
            efficiency: algorithmResult.efficiency,
            waitTime: algorithmResult.waitTime
          }
        });

        updatedLights.push(updatedLight);
      }
    }

    return NextResponse.json({
      message: `Processed ${trafficLights.length} traffic lights`,
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