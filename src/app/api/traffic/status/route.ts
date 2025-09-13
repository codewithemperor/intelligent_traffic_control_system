import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get overall system status
    const trafficLights = await db.trafficLight.findMany({
      include: {
        roads: {
          include: {
            vehicles: true
          }
        }
      }
    });

    const totalLights = trafficLights.length;
    const activeLights = trafficLights.filter(light => light.isActive).length;
    const totalVehicles = trafficLights.reduce((sum, light) => 
      sum + light.roads.reduce((roadSum, road) => 
        roadSum + road.vehicleCount, 0), 0
    );
    
    const totalCapacity = trafficLights.reduce((sum, light) => 
      sum + light.roads.reduce((roadSum, road) => 
        roadSum + road.maxCapacity, 0), 0
    );

    const averageCongestion = totalCapacity > 0 ? 
      trafficLights.reduce((sum, light) => 
        sum + light.roads.reduce((roadSum, road) => 
          roadSum + road.congestionLevel, 0), 0
      ) / trafficLights.reduce((sum, light) => sum + light.roads.length, 0) : 0;

    const averageSpeed = trafficLights.reduce((sum, light) => 
      sum + light.roads.reduce((roadSum, road) => 
        roadSum + road.averageSpeed, 0), 0
    ) / trafficLights.reduce((sum, light) => sum + light.roads.length, 0) || 0;

    // Get recent logs
    const recentLogs = await db.trafficLog.findMany({
      include: {
        trafficLight: true
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    });

    // Get status distribution
    const statusDistribution = trafficLights.reduce((acc, light) => {
      acc[light.status] = (acc[light.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const systemStatus = {
      totalLights,
      activeLights,
      totalVehicles,
      totalCapacity,
      averageCongestion: Math.round(averageCongestion * 100) / 100,
      averageSpeed: Math.round(averageSpeed * 10) / 10,
      systemEfficiency: Math.round((1 - averageCongestion) * 100),
      statusDistribution,
      recentLogs,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(systemStatus);
  } catch (error) {
    console.error('Error fetching system status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system status' },
      { status: 500 }
    );
  }
}