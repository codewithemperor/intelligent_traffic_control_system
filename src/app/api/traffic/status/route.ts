import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get overall system status
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
        roads: {
          include: {
            vehicles: true
          }
        }
      }
    });

    const totalIntersections = intersections.length;
    const activeIntersections = intersections.filter(intersection => intersection.isActive).length;
    const totalTrafficLights = intersections.reduce((sum, intersection) => sum + intersection.trafficLights.length, 0);
    const activeTrafficLights = intersections.reduce((sum, intersection) => 
      sum + intersection.trafficLights.filter(light => light.isActive).length, 0
    );
    
    const totalVehicles = intersections.reduce((sum, intersection) => 
      sum + intersection.roads.reduce((roadSum, road) => 
        roadSum + road.vehicleCount, 0), 0
    );
    
    const totalCapacity = intersections.reduce((sum, intersection) => 
      sum + intersection.roads.reduce((roadSum, road) => 
        roadSum + road.maxCapacity, 0), 0
    );

    const averageCongestion = totalCapacity > 0 ? 
      intersections.reduce((sum, intersection) => 
        sum + intersection.roads.reduce((roadSum, road) => 
          roadSum + road.congestionLevel, 0), 0
      ) / intersections.reduce((sum, intersection) => sum + intersection.roads.length, 0) : 0;

    const averageSpeed = intersections.reduce((sum, intersection) => 
      sum + intersection.roads.reduce((roadSum, road) => 
        roadSum + road.averageSpeed, 0), 0
    ) / intersections.reduce((sum, intersection) => sum + intersection.roads.length, 0) || 0;

    // Get recent logs
    const recentLogs = await db.trafficLog.findMany({
      include: {
        intersection: true,
        trafficLight: {
          include: {
            road: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    });

    // Get status distribution
    const statusDistribution = intersections.reduce((acc, intersection) => {
      intersection.trafficLights.forEach(light => {
        acc[light.status] = (acc[light.status] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    // Get algorithm distribution
    const algorithmDistribution = intersections.reduce((acc, intersection) => {
      acc[intersection.algorithm] = (acc[intersection.algorithm] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate intersection-specific metrics
    const intersectionMetrics = intersections.map(intersection => {
      const intersectionVehicles = intersection.roads.reduce((sum, road) => sum + road.vehicleCount, 0);
      const intersectionCapacity = intersection.roads.reduce((sum, road) => sum + road.maxCapacity, 0);
      const intersectionCongestion = intersectionCapacity > 0 ? 
        intersection.roads.reduce((sum, road) => sum + road.congestionLevel, 0) / intersection.roads.length : 0;
      
      return {
        id: intersection.id,
        name: intersection.name,
        vehicleCount: intersectionVehicles,
        capacity: intersectionCapacity,
        congestionLevel: Math.round(intersectionCongestion * 100) / 100,
        efficiency: Math.round((1 - intersectionCongestion) * 100),
        algorithm: intersection.algorithm,
        isActive: intersection.isActive,
        trafficLightCount: intersection.trafficLights.length
      };
    });

    const systemStatus = {
      totalIntersections,
      activeIntersections,
      totalTrafficLights,
      activeTrafficLights,
      totalVehicles,
      totalCapacity,
      averageCongestion: Math.round(averageCongestion * 100) / 100,
      averageSpeed: Math.round(averageSpeed * 10) / 10,
      systemEfficiency: Math.round((1 - averageCongestion) * 100),
      statusDistribution,
      algorithmDistribution,
      intersectionMetrics,
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