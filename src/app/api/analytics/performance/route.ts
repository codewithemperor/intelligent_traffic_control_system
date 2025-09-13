import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h'; // 24h, 7d, 30d

    // Calculate time range
    const now = new Date();
    let startTime: Date;
    
    switch (timeRange) {
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // 24h
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get traffic logs within time range
    const trafficLogs = await db.trafficLog.findMany({
      where: {
        timestamp: {
          gte: startTime
        }
      },
      include: {
        trafficLight: true
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    // Get sensor readings within time range
    const sensorReadings = await db.sensorReading.findMany({
      where: {
        timestamp: {
          gte: startTime
        }
      },
      include: {
        sensor: {
          include: {
            road: true,
            trafficLight: true
          }
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    // Calculate performance metrics
    const totalCycles = trafficLogs.filter(log => log.action === 'CYCLE_CHANGE').length;
    const manualOverrides = trafficLogs.filter(log => log.action === 'MANUAL_OVERRIDE').length;
    const emergencyEvents = trafficLogs.filter(log => log.action === 'EMERGENCY').length;

    // Calculate average efficiency
    const efficiencyLogs = trafficLogs.filter(log => log.efficiency !== null);
    const averageEfficiency = efficiencyLogs.length > 0 
      ? efficiencyLogs.reduce((sum, log) => sum + (log.efficiency || 0), 0) / efficiencyLogs.length 
      : 0;

    // Calculate average wait time
    const waitTimeLogs = trafficLogs.filter(log => log.waitTime !== null);
    const averageWaitTime = waitTimeLogs.length > 0 
      ? waitTimeLogs.reduce((sum, log) => sum + (log.waitTime || 0), 0) / waitTimeLogs.length 
      : 0;

    // Get traffic flow data
    const trafficFlowData = [];
    const interval = timeRange === '24h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 1 hour or 1 day
    
    for (let time = startTime.getTime(); time <= now.getTime(); time += interval) {
      const intervalStart = new Date(time);
      const intervalEnd = new Date(time + interval);
      
      const intervalReadings = sensorReadings.filter(reading => 
        reading.timestamp >= intervalStart && reading.timestamp < intervalEnd
      );
      
      const totalVehicles = intervalReadings.reduce((sum, reading) => sum + reading.vehicleCount, 0);
      const avgSpeed = intervalReadings.length > 0 
        ? intervalReadings.reduce((sum, reading) => sum + reading.avgSpeed, 0) / intervalReadings.length 
        : 0;
      
      trafficFlowData.push({
        timestamp: intervalStart.toISOString(),
        totalVehicles,
        avgSpeed: Math.round(avgSpeed * 10) / 10,
        readingsCount: intervalReadings.length
      });
    }

    // Get system health metrics
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

    const systemUptime = activeLights / totalLights * 100;

    // Get algorithm performance
    const algorithmPerformance = {};
    for (const light of trafficLights) {
      const lightLogs = trafficLogs.filter(log => log.trafficLightId === light.id);
      const algorithm = light.algorithm;
      
      if (!algorithmPerformance[algorithm]) {
        algorithmPerformance[algorithm] = {
          totalLights: 0,
          totalCycles: 0,
          averageEfficiency: 0,
          averageWaitTime: 0
        };
      }
      
      algorithmPerformance[algorithm].totalLights++;
      algorithmPerformance[algorithm].totalCycles += lightLogs.length;
      
      const algorithmEfficiencies = lightLogs.filter(log => log.efficiency !== null);
      if (algorithmEfficiencies.length > 0) {
        algorithmPerformance[algorithm].averageEfficiency = 
          algorithmEfficiencies.reduce((sum, log) => sum + (log.efficiency || 0), 0) / algorithmEfficiencies.length;
      }
      
      const algorithmWaitTimes = lightLogs.filter(log => log.waitTime !== null);
      if (algorithmWaitTimes.length > 0) {
        algorithmPerformance[algorithm].averageWaitTime = 
          algorithmWaitTimes.reduce((sum, log) => sum + (log.waitTime || 0), 0) / algorithmWaitTimes.length;
      }
    }

    const performance = {
      timeRange,
      summary: {
        totalCycles,
        manualOverrides,
        emergencyEvents,
        averageEfficiency: Math.round(averageEfficiency * 100) / 100,
        averageWaitTime: Math.round(averageWaitTime * 10) / 10,
        systemUptime: Math.round(systemUptime * 100) / 100,
        totalVehicles,
        activeLights,
        totalLights
      },
      trafficFlow: trafficFlowData,
      algorithmPerformance,
      recentEvents: trafficLogs.slice(-10).map(log => ({
        id: log.id,
        action: log.action,
        trafficLight: log.trafficLight.name,
        timestamp: log.timestamp,
        message: `${log.action} at ${log.trafficLight.name}`
      })),
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json(performance);
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    );
  }
}