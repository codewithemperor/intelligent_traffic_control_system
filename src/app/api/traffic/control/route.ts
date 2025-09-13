import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Status, Algorithm } from '@/types/traffic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, lightId, status, algorithm, timing, intersectionId } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    let updatedLight;
    let updatedIntersection;

    switch (action) {
      case 'manual_override':
        if (!lightId || !status) {
          return NextResponse.json(
            { error: 'Light ID and status are required for manual override' },
            { status: 400 }
          );
        }

        // Get current traffic light state
        const currentLight = await db.trafficLight.findUnique({
          where: { id: lightId },
          include: {
            intersection: true,
            road: {
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

        const totalVehicles = currentLight.road.vehicleCount;

        updatedLight = await db.trafficLight.update({
          where: { id: lightId },
          data: {
            status,
            lastChanged: new Date()
          },
          include: {
            intersection: true,
            road: {
              include: {
                vehicles: true
              }
            }
          }
        });

        // Log the manual override
        await db.trafficLog.create({
          data: {
            intersectionId: currentLight.intersectionId,
            trafficLightId: lightId,
            action: 'MANUAL_OVERRIDE',
            previousState: currentLight.status,
            newState: status,
            reason: 'Manual override by operator',
            vehicleCount: totalVehicles
          }
        });

        break;

      case 'intersection_emergency':
        if (!intersectionId) {
          return NextResponse.json(
            { error: 'Intersection ID is required for emergency mode' },
            { status: 400 }
          );
        }

        // Get intersection and all its traffic lights
        const intersection = await db.intersection.findUnique({
          where: { id: intersectionId },
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
            roads: {
              include: {
                vehicles: true
              }
            }
          }
        });

        if (!intersection) {
          return NextResponse.json(
            { error: 'Intersection not found' },
            { status: 404 }
          );
        }

        // Set all lights to green for emergency
        const emergencyUpdate = intersection.trafficLights.map(light => 
          db.trafficLight.update({
            where: { id: light.id },
            data: {
              status: Status.GREEN,
              lastChanged: new Date()
            }
          })
        );

        await Promise.all(emergencyUpdate);

        // Update intersection algorithm
        updatedIntersection = await db.intersection.update({
          where: { id: intersectionId },
          data: {
            algorithm: Algorithm.EMERGENCY
          },
          include: {
            trafficLights: {
              include: {
                road: {
                  include: {
                    vehicles: true
                  }
                }
              }
            }
          }
        });

        // Log emergency mode activation
        const totalIntersectionVehicles = intersection.roads.reduce((sum, road) => sum + road.vehicleCount, 0);
        await db.trafficLog.createMany({
          data: intersection.trafficLights.map(light => ({
            intersectionId,
            trafficLightId: light.id,
            action: 'EMERGENCY',
            previousState: light.status,
            newState: Status.GREEN,
            reason: 'Emergency mode activated',
            vehicleCount: totalIntersectionVehicles
          }))
        });

        return NextResponse.json(updatedIntersection);

      case 'change_intersection_algorithm':
        if (!intersectionId || !algorithm) {
          return NextResponse.json(
            { error: 'Intersection ID and algorithm are required' },
            { status: 400 }
          );
        }

        updatedIntersection = await db.intersection.update({
          where: { id: intersectionId },
          data: {
            algorithm
          },
          include: {
            trafficLights: {
              include: {
                road: {
                  include: {
                    vehicles: true
                  }
                }
              }
            }
          }
        });

        // Log algorithm change
        await db.trafficLog.create({
          data: {
            intersectionId,
            trafficLightId: updatedIntersection.trafficLights[0]?.id || '',
            action: 'ALGORITHM_CHANGE',
            previousState: Status.RED,
            newState: Status.RED,
            reason: `Algorithm changed to ${algorithm}`,
            vehicleCount: 0
          }
        });

        return NextResponse.json(updatedIntersection);

      case 'update_timing':
        if (!lightId || !timing) {
          return NextResponse.json(
            { error: 'Light ID and timing are required' },
            { status: 400 }
          );
        }

        const currentTimingLight = await db.trafficLight.findUnique({
          where: { id: lightId },
          include: {
            intersection: true,
            road: {
              include: {
                vehicles: true
              }
            }
          }
        });

        if (!currentTimingLight) {
          return NextResponse.json(
            { error: 'Traffic light not found' },
            { status: 404 }
          );
        }

        updatedLight = await db.trafficLight.update({
          where: { id: lightId },
          data: {
            timing,
            lastChanged: new Date()
          },
          include: {
            intersection: true,
            road: {
              include: {
                vehicles: true
              }
            }
          }
        });

        // Log timing update
        await db.trafficLog.create({
          data: {
            intersectionId: currentTimingLight.intersectionId,
            trafficLightId: lightId,
            action: 'TIMING_UPDATE',
            previousState: currentTimingLight.status,
            newState: currentTimingLight.status,
            reason: 'Timing parameters updated',
            vehicleCount: currentTimingLight.road.vehicleCount
          }
        });

        break;

      case 'reset_intersection':
        if (!intersectionId) {
          return NextResponse.json(
            { error: 'Intersection ID is required for reset' },
            { status: 400 }
          );
        }

        const resetIntersection = await db.intersection.findUnique({
          where: { id: intersectionId },
          include: {
            trafficLights: true
          }
        });

        if (!resetIntersection) {
          return NextResponse.json(
            { error: 'Intersection not found' },
            { status: 404 }
          );
        }

        // Reset all traffic lights in the intersection
        const resetUpdates = resetIntersection.trafficLights.map(light => 
          db.trafficLight.update({
            where: { id: light.id },
            data: {
              status: Status.RED,
              timing: {
                red: 30,
                yellow: 5,
                green: 25,
                cycle: 60
              },
              lastChanged: new Date(),
              totalCycles: 0
            }
          })
        );

        await Promise.all(resetUpdates);

        // Reset intersection algorithm
        updatedIntersection = await db.intersection.update({
          where: { id: intersectionId },
          data: {
            algorithm: Algorithm.ADAPTIVE
          },
          include: {
            trafficLights: {
              include: {
                road: {
                  include: {
                    vehicles: true
                  }
                }
              }
            }
          }
        });

        // Log reset
        await db.trafficLog.createMany({
          data: resetIntersection.trafficLights.map(light => ({
            intersectionId,
            trafficLightId: light.id,
            action: 'RESET',
            previousState: light.status,
            newState: Status.RED,
            reason: 'Intersection reset to default',
            vehicleCount: 0
          }))
        });

        return NextResponse.json(updatedIntersection);

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