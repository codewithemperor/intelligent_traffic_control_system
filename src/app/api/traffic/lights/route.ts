import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Status, Algorithm } from '@/types/traffic';

export async function GET() {
  try {
    const intersections = await db.intersection.findMany({
      include: {
        trafficLights: {
          include: {
            road: {
              include: {
                vehicles: true,
                sensors: true
              }
            },
            sensors: {
              include: {
                readings: {
                  orderBy: {
                    timestamp: 'desc'
                  },
                  take: 1
                }
              }
            },
            phaseLights: {
              include: {
                intersectionPhase: true
              }
            }
          }
        },
        roads: {
          include: {
            vehicles: true,
            sensors: true
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
        sensors: {
          include: {
            readings: {
              orderBy: {
                timestamp: 'desc'
              },
              take: 1
            }
          }
        },
        logs: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 5
        }
      },
      orderBy: {
        priority: 'asc'
      }
    });

    return NextResponse.json(intersections);
  } catch (error) {
    console.error('Error fetching intersections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch intersections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location, algorithm = Algorithm.ADAPTIVE, priority = 1 } = body;

    // Validate required fields
    if (!name || !location) {
      return NextResponse.json(
        { error: 'Name and location are required' },
        { status: 400 }
      );
    }

    const intersection = await db.intersection.create({
      data: {
        name,
        location,
        algorithm,
        priority
      },
      include: {
        trafficLights: {
          include: {
            road: true
          }
        },
        roads: true,
        phases: {
          include: {
            phaseLights: {
              include: {
                trafficLight: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(intersection, { status: 201 });
  } catch (error) {
    console.error('Error creating intersection:', error);
    return NextResponse.json(
      { error: 'Failed to create intersection' },
      { status: 500 }
    );
  }
}