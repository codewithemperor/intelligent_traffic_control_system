import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Status, Algorithm } from '@/types/traffic';

export async function GET() {
  try {
    const trafficLights = await db.trafficLight.findMany({
      include: {
        roads: {
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

    return NextResponse.json(trafficLights);
  } catch (error) {
    console.error('Error fetching traffic lights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch traffic lights' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location, timing, algorithm = Algorithm.ADAPTIVE, priority = 1 } = body;

    // Validate required fields
    if (!name || !location) {
      return NextResponse.json(
        { error: 'Name and location are required' },
        { status: 400 }
      );
    }

    // Default timing if not provided
    const defaultTiming = timing || {
      red: 30,
      yellow: 5,
      green: 25,
      cycle: 60
    };

    const trafficLight = await db.trafficLight.create({
      data: {
        name,
        location,
        timing: defaultTiming,
        algorithm,
        priority,
        status: Status.RED
      },
      include: {
        roads: true,
        sensors: true
      }
    });

    return NextResponse.json(trafficLight, { status: 201 });
  } catch (error) {
    console.error('Error creating traffic light:', error);
    return NextResponse.json(
      { error: 'Failed to create traffic light' },
      { status: 500 }
    );
  }
}