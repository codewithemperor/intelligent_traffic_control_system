import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary';
    const format = searchParams.get('format') || 'json';

    // Get basic system data
    const trafficLights = await db.trafficLight.findMany({
      include: {
        roads: {
          include: {
            vehicles: true
          }
        },
        logs: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 100
        }
      }
    });

    const totalLights = trafficLights.length;
    const activeLights = trafficLights.filter(light => light.isActive).length;
    
    // Calculate overall metrics
    const totalVehicles = trafficLights.reduce((sum, light) => 
      sum + light.roads.reduce((roadSum, road) => 
        roadSum + road.vehicleCount, 0), 0
    );

    const totalCapacity = trafficLights.reduce((sum, light) => 
      sum + light.roads.reduce((roadSum, road) => 
        roadSum + road.maxCapacity, 0), 0
    );

    const overallCongestion = totalCapacity > 0 ? 
      trafficLights.reduce((sum, light) => 
        sum + light.roads.reduce((roadSum, road) => 
          roadSum + road.congestionLevel, 0), 0
      ) / trafficLights.reduce((sum, light) => sum + light.roads.length, 0) : 0;

    const averageSpeed = trafficLights.reduce((sum, light) => 
      sum + light.roads.reduce((roadSum, road) => 
        roadSum + road.averageSpeed, 0), 0
    ) / trafficLights.reduce((sum, light) => sum + light.roads.length, 0) || 0;

    // Get recent activity
    const recentLogs = await db.trafficLog.findMany({
      include: {
        trafficLight: true
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 50
    });

    // Generate report based on type
    let report;
    
    switch (reportType) {
      case 'summary':
        report = {
          title: 'Traffic Control System Summary Report',
          generatedAt: new Date().toISOString(),
          period: {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          },
          overview: {
            totalIntersections: totalLights,
            activeIntersections: activeLights,
            systemUptime: Math.round((activeLights / totalLights) * 100),
            totalVehiclesProcessed: totalVehicles,
            systemEfficiency: Math.round((1 - overallCongestion) * 100)
          },
          performance: {
            averageCongestion: Math.round(overallCongestion * 100),
            averageSpeed: Math.round(averageSpeed * 10) / 10,
            totalCycles: trafficLights.reduce((sum, light) => sum + light.totalCycles, 0),
            manualInterventions: recentLogs.filter(log => log.action === 'MANUAL_OVERRIDE').length,
            emergencyEvents: recentLogs.filter(log => log.action === 'EMERGENCY').length
          },
          intersections: trafficLights.map(light => ({
            id: light.id,
            name: light.name,
            location: light.location,
            status: light.status,
            algorithm: light.algorithm,
            totalCycles: light.totalCycles,
            vehicleCount: light.roads.reduce((sum, road) => sum + road.vehicleCount, 0),
            congestionLevel: Math.round(light.roads.reduce((sum, road) => sum + road.congestionLevel, 0) / light.roads.length * 100)
          })),
          recommendations: generateRecommendations(trafficLights, overallCongestion, averageSpeed)
        };
        break;

      case 'detailed':
        const sensorReadings = await db.sensorReading.findMany({
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
          take: 500
        });

        report = {
          title: 'Detailed Traffic Control System Report',
          generatedAt: new Date().toISOString(),
          period: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          },
          intersections: trafficLights.map(light => ({
            ...light,
            roads: light.roads.map(road => ({
              ...road,
              efficiency: Math.round((1 - road.congestionLevel) * 100),
              utilization: Math.round((road.vehicleCount / road.maxCapacity) * 100)
            }))
          })),
          sensorData: sensorReadings.map(reading => ({
            timestamp: reading.timestamp,
            sensorName: reading.sensor.name,
            sensorType: reading.sensor.type,
            location: reading.sensor.road?.name || reading.sensor.trafficLight?.name,
            value: reading.value,
            vehicleCount: reading.vehicleCount,
            avgSpeed: reading.avgSpeed
          })),
          activityLog: recentLogs.map(log => ({
            timestamp: log.timestamp,
            intersection: log.trafficLight.name,
            action: log.action,
            previousState: log.previousState,
            newState: log.newState,
            reason: log.reason,
            vehicleCount: log.vehicleCount,
            efficiency: log.efficiency,
            waitTime: log.waitTime
          }))
        };
        break;

      case 'efficiency':
        const efficiencyData = await calculateEfficiencyData(trafficLights);
        report = {
          title: 'System Efficiency Analysis Report',
          generatedAt: new Date().toISOString(),
          overallEfficiency: Math.round((1 - overallCongestion) * 100),
          intersectionEfficiency: efficiencyData.intersectionEfficiency,
          algorithmComparison: efficiencyData.algorithmComparison,
          bottleneckAnalysis: efficiencyData.bottleneckAnalysis,
          recommendations: efficiencyData.recommendations
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    // Format response based on requested format
    if (format === 'csv') {
      const csv = convertToCSV(report);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="traffic-report-${reportType}-${Date.now()}.csv"`
        }
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

// Helper function to generate recommendations
function generateRecommendations(trafficLights: any[], congestion: number, speed: number) {
  const recommendations = [];

  if (congestion > 0.7) {
    recommendations.push({
      priority: 'high',
      category: 'Congestion Management',
      recommendation: 'High congestion detected. Consider adjusting traffic light timing or implementing adaptive algorithms.',
      impact: 'Reduce average wait times by 15-25%'
    });
  }

  if (speed < 25) {
    recommendations.push({
      priority: 'medium',
      category: 'Traffic Flow',
      recommendation: 'Low average speeds detected. Review intersection coordination and signal timing.',
      impact: 'Improve traffic flow by 20-30%'
    });
  }

  const manualOverrideCount = trafficLights.reduce((sum, light) => 
    sum + light.logs.filter(log => log.action === 'MANUAL_OVERRIDE').length, 0
  );

  if (manualOverrideCount > 10) {
    recommendations.push({
      priority: 'medium',
      category: 'Automation',
      recommendation: 'High number of manual overrides detected. Consider improving algorithm efficiency.',
      impact: 'Reduce manual interventions by 40-60%'
    });
  }

  recommendations.push({
    priority: 'low',
    category: 'Maintenance',
    recommendation: 'Regular system maintenance recommended to ensure optimal performance.',
    impact: 'Prevent system downtime and maintain efficiency'
  });

  return recommendations;
}

// Helper function to calculate efficiency data
async function calculateEfficiencyData(trafficLights: any[]) {
  const intersectionEfficiency = trafficLights.map(light => {
    const avgCongestion = light.roads.reduce((sum, road) => sum + road.congestionLevel, 0) / light.roads.length;
    return {
      intersectionId: light.id,
      name: light.name,
      efficiency: Math.round((1 - avgCongestion) * 100),
      vehicleCount: light.roads.reduce((sum, road) => sum + road.vehicleCount, 0),
      totalCycles: light.totalCycles
    };
  });

  const algorithmComparison = {};
  for (const light of trafficLights) {
    const algorithm = light.algorithm;
    if (!algorithmComparison[algorithm]) {
      algorithmComparison[algorithm] = {
        count: 0,
        avgEfficiency: 0,
        totalVehicles: 0
      };
    }
    
    const avgCongestion = light.roads.reduce((sum, road) => sum + road.congestionLevel, 0) / light.roads.length;
    algorithmComparison[algorithm].count++;
    algorithmComparison[algorithm].avgEfficiency += (1 - avgCongestion) * 100;
    algorithmComparison[algorithm].totalVehicles += light.roads.reduce((sum, road) => sum + road.vehicleCount, 0);
  }

  // Calculate averages
  for (const algorithm in algorithmComparison) {
    const data = algorithmComparison[algorithm];
    data.avgEfficiency = Math.round(data.avgEfficiency / data.count);
  }

  const bottleneckAnalysis = intersectionEfficiency
    .filter(item => item.efficiency < 50)
    .sort((a, b) => a.efficiency - b.efficiency);

  return {
    intersectionEfficiency,
    algorithmComparison,
    bottleneckAnalysis,
    recommendations: generateRecommendations(trafficLights, 0.5, 30)
  };
}

// Helper function to convert report to CSV
function convertToCSV(report: any): string {
  // This is a simplified CSV conversion - in a real implementation,
  // you would want more sophisticated CSV generation
  let csv = 'Report Data\n';
  csv += `Generated,${report.generatedAt}\n`;
  csv += `Title,${report.title}\n\n`;
  
  if (report.overview) {
    csv += 'Overview\n';
    csv += 'Metric,Value\n';
    Object.entries(report.overview).forEach(([key, value]) => {
      csv += `${key},${value}\n`;
    });
    csv += '\n';
  }
  
  if (report.intersections) {
    csv += 'Intersections\n';
    csv += 'ID,Name,Location,Status,Algorithm,VehicleCount,CongestionLevel\n';
    report.intersections.forEach((intersection: any) => {
      csv += `${intersection.id},${intersection.name},${intersection.location},${intersection.status},${intersection.algorithm},${intersection.vehicleCount},${intersection.congestionLevel}\n`;
    });
  }
  
  return csv;
}