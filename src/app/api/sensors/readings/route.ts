import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const readings = await db.sensorReading.findMany({
      include: {
        sensor: {
          include: {
            road: true,
            trafficLight: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 100
    });

    return NextResponse.json(readings);
  } catch (error) {
    console.error('Error fetching sensor readings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sensor readings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sensorId, value, vehicleCount, avgSpeed } = body;

    if (!sensorId || value === undefined) {
      return NextResponse.json(
        { error: 'SensorId and value are required' },
        { status: 400 }
      );
    }

    // Check if sensor exists
    const sensor = await db.sensor.findUnique({
      where: { id: sensorId }
    });

    if (!sensor) {
      return NextResponse.json(
        { error: 'Sensor not found' },
        { status: 404 }
      );
    }

    // Create sensor reading
    const reading = await db.sensorReading.create({
      data: {
        sensorId,
        value,
        vehicleCount: vehicleCount || 0,
        avgSpeed: avgSpeed || 0
      },
      include: {
        sensor: {
          include: {
            road: true,
            trafficLight: true
          }
        }
      }
    });

    // Update sensor's last reading
    await db.sensor.update({
      where: { id: sensorId },
      data: {
        lastReading: value
      }
    });

    // If sensor is associated with a road, update road metrics
    if (sensor.roadId) {
      await db.road.update({
        where: { id: sensor.roadId },
        data: {
          vehicleCount: vehicleCount || Math.round(value),
          averageSpeed: avgSpeed || 30,
          congestionLevel: Math.min((vehicleCount || Math.round(value)) / 50, 1.0)
        }
      });
    }

    return NextResponse.json(reading, { status: 201 });
  } catch (error) {
    console.error('Error creating sensor reading:', error);
    return NextResponse.json(
      { error: 'Failed to create sensor reading' },
      { status: 500 }
    );
  }
}