import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Status, Algorithm } from '@/types/traffic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, lightId, status, algorithm, timing } = body;

    if (!action || !lightId) {
      return NextResponse.json(
        { error: 'Action and lightId are required' },
        { status: 400 }
      );
    }

    // Get current traffic light state
    const currentLight = await db.trafficLight.findUnique({
      where: { id: lightId },
      include: {
        roads: {
          include: {
            vehicles: true
          }
        }
      }
    });

    if (!currentLight) {
      return NextResponse.json(
        { error: 'Traffic light not found' },
        { status: 404 }
      );
    }

    let updatedLight;
    const totalVehicles = currentLight.roads.reduce((sum, road) => sum + road.vehicleCount, 0);

    switch (action) {
      case 'manual_override':
        if (!status) {
          return NextResponse.json(
            { error: 'Status is required for manual override' },
            { status: 400 }
          );
        }

        updatedLight = await db.trafficLight.update({
          where: { id: lightId },
          data: {
            status,
            lastChanged: new Date(),
            algorithm: Algorithm.EMERGENCY
          },
          include: {
            roads: {
              include: {
                vehicles: true
              }
            }
          }
        });

        // Log the manual override
        await db.trafficLog.create({
          data: {
            trafficLightId: lightId,
            action: 'MANUAL_OVERRIDE',
            previousState: currentLight.status,
            newState: status,
            reason: 'Manual override by operator',
            vehicleCount: totalVehicles
          }
        });

        break;

      case 'emergency_mode':
        updatedLight = await db.trafficLight.update({
          where: { id: lightId },
          data: {
            status: Status.GREEN,
            lastChanged: new Date(),
            algorithm: Algorithm.EMERGENCY
          },
          include: {
            roads: {
              include: {
                vehicles: true
              }
            }
          }
        });

        // Log emergency mode activation
        await db.trafficLog.create({
          data: {
            trafficLightId: lightId,
            action: 'EMERGENCY',
            previousState: currentLight.status,
            newState: Status.GREEN,
            reason: 'Emergency mode activated',
            vehicleCount: totalVehicles
          }
        });

        break;

      case 'change_algorithm':
        if (!algorithm) {
          return NextResponse.json(
            { error: 'Algorithm is required' },
            { status: 400 }
          );
        }

        updatedLight = await db.trafficLight.update({
          where: { id: lightId },
          data: {
            algorithm,
            lastChanged: new Date()
          },
          include: {
            roads: {
              include: {
                vehicles: true
              }
            }
          }
        });

        // Log algorithm change
        await db.trafficLog.create({
          data: {
            trafficLightId: lightId,
            action: 'ALGORITHM_CHANGE',
            previousState: currentLight.status,
            newState: currentLight.status,
            reason: `Algorithm changed to ${algorithm}`,
            vehicleCount: totalVehicles
          }
        });

        break;

      case 'update_timing':
        if (!timing) {
          return NextResponse.json(
            { error: 'Timing is required' },
            { status: 400 }
          );
        }

        updatedLight = await db.trafficLight.update({
          where: { id: lightId },
          data: {
            timing,
            lastChanged: new Date()
          },
          include: {
            roads: {
              include: {
                vehicles: true
              }
            }
          }
        });

        // Log timing update
        await db.trafficLog.create({
          data: {
            trafficLightId: lightId,
            action: 'TIMING_UPDATE',
            previousState: currentLight.status,
            newState: currentLight.status,
            reason: 'Timing parameters updated',
            vehicleCount: totalVehicles
          }
        });

        break;

      case 'reset':
        updatedLight = await db.trafficLight.update({
          where: { id: lightId },
          data: {
            status: Status.RED,
            algorithm: Algorithm.ADAPTIVE,
            timing: {
              red: 30,
              yellow: 5,
              green: 25,
              cycle: 60
            },
            lastChanged: new Date(),
            totalCycles: 0
          },
          include: {
            roads: {
              include: {
                vehicles: true
              }
            }
          }
        });

        // Log reset
        await db.trafficLog.create({
          data: {
            trafficLightId: lightId,
            action: 'RESET',
            previousState: currentLight.status,
            newState: Status.RED,
            reason: 'Traffic light reset to default',
            vehicleCount: totalVehicles
          }
        });

        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json(updatedLight);
  } catch (error) {
    console.error('Error in traffic control:', error);
    return NextResponse.json(
      { error: 'Failed to perform traffic control action' },
      { status: 500 }
    );
  }
}