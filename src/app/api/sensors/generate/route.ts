import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { VehicleType, Direction } from '@/types/traffic';
import { CAMPUS_INTERSECTIONS, VEHICLE_GENERATION_RULES } from '@/constants/traffic-config';

// Helper function to generate Nigerian plate number
function generateNigerianPlate(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  const firstLetter = letters[Math.floor(Math.random() * letters.length)];
  const secondLetter = letters[Math.floor(Math.random() * letters.length)];
  const thirdLetter = letters[Math.floor(Math.random() * letters.length)];
  
  const firstNumber = numbers[Math.floor(Math.random() * numbers.length)];
  const secondNumber = numbers[Math.floor(Math.random() * numbers.length)];
  const thirdNumber = numbers[Math.floor(Math.random() * numbers.length)];
  
  const stateCode = ['AB', 'AD', 'AK', 'AN', 'BA', 'BY', 'BN', 'BO', 'CR', 'CB', 'DE', 'EB', 'ED', 'EK', 'EN', 'FC', 'GO', 'IM', 'JI', 'KD', 'KN', 'KO', 'KT', 'KB', 'KW', 'LA', 'NA', 'NG', 'OG', 'OY', 'OS', 'OD', 'OT', 'PL', 'RV', 'SO', 'TR', 'YB', 'ZA'][Math.floor(Math.random() * 37)];
  
  return `${firstLetter}${secondLetter}${thirdLetter}-${firstNumber}${secondNumber}${thirdNumber}-${stateCode}`;
}

// Helper function to get random vehicle type based on weights
function getRandomVehicleType(): VehicleType {
  const rand = Math.random();
  const weights = {
    [VehicleType.CAR]: 0.7,
    [VehicleType.BUS]: 0.1,
    [VehicleType.MOTORCYCLE]: 0.15,
    [VehicleType.TRUCK]: 0.03,
    [VehicleType.EMERGENCY]: 0.015,
    [VehicleType.BICYCLE]: 0.005
  };

  let cumulative = 0;
  for (const [type, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (rand <= cumulative) {
      return type as VehicleType;
    }
  }
  
  return VehicleType.CAR;
}

// Helper function to get random speed based on vehicle type
function getRandomSpeed(vehicleType: VehicleType): number {
  const baseSpeeds = {
    [VehicleType.CAR]: 40,
    [VehicleType.BUS]: 30,
    [VehicleType.MOTORCYCLE]: 50,
    [VehicleType.TRUCK]: 25,
    [VehicleType.EMERGENCY]: 60,
    [VehicleType.BICYCLE]: 15
  };

  const baseSpeed = baseSpeeds[vehicleType];
  const variation = (Math.random() - 0.5) * 20; // ±10 km/h variation
  
  return Math.max(5, baseSpeed + variation);
}

// Helper function to get generation rate based on time of day
function getGenerationRate(): number {
  const hour = new Date().getHours();
  
  if (hour >= 8 && hour <= 9) return VEHICLE_GENERATION_RULES.peakHourBoost; // Peak morning
  if (hour >= 12 && hour <= 13) return VEHICLE_GENERATION_RULES.peakHourBoost * 0.8; // Lunch
  if (hour >= 16 && hour <= 17) return VEHICLE_GENERATION_RULES.peakHourBoost; // Peak evening
  if (hour >= 22 || hour <= 6) return 0.3; // Night time
  
  return 1.0; // Normal
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { count = 1, roadId } = body;

    // Get all roads if no specific roadId is provided
    let roads = [];
    if (roadId) {
      const road = await db.road.findUnique({
        where: { id: roadId },
        include: { trafficLights: true }
      });
      if (!road) {
        return NextResponse.json(
          { error: 'Road not found' },
          { status: 404 }
        );
      }
      roads = [road];
    } else {
      roads = await db.road.findMany({
        where: { isActive: true },
        include: { trafficLights: true }
      });
    }

    if (roads.length === 0) {
      return NextResponse.json(
        { error: 'No active roads found' },
        { status: 404 }
      );
    }

    const generatedVehicles = [];
    const generationRate = getGenerationRate();

    for (let i = 0; i < count; i++) {
      // Select a random road
      const road = roads[Math.floor(Math.random() * roads.length)];
      
      // Check if road has capacity
      if (road.vehicleCount >= road.maxCapacity) {
        continue; // Skip this road if it's full
      }

      // Generate vehicle data
      const vehicleType = getRandomVehicleType();
      const isEmergency = vehicleType === VehicleType.EMERGENCY;
      const priority = isEmergency ? 2 : 1;
      
      const vehicle = await db.vehicle.create({
        data: {
          plateNumber: generateNigerianPlate(),
          type: vehicleType,
          roadId: road.id,
          speed: getRandomSpeed(vehicleType),
          position: 0.0, // Start at beginning of road
          isMoving: true,
          priority,
          enteredAt: new Date()
        }
      });

      // Update road vehicle count
      await db.road.update({
        where: { id: road.id },
        data: {
          vehicleCount: {
            increment: 1
          },
          congestionLevel: Math.min((road.vehicleCount + 1) / road.maxCapacity, 1.0)
        }
      });

      // Create sensor reading for this vehicle
      const sensor = await db.sensor.findFirst({
        where: { 
          OR: [
            { roadId: road.id },
            { trafficLightId: road.trafficLights[0]?.id }
          ]
        }
      });

      if (sensor) {
        await db.sensorReading.create({
          data: {
            sensorId: sensor.id,
            value: 1,
            vehicleCount: road.vehicleCount + 1,
            avgSpeed: getRandomSpeed(vehicleType)
          }
        });
      }

      generatedVehicles.push(vehicle);
    }

    return NextResponse.json({
      message: `Generated ${generatedVehicles.length} vehicles`,
      vehicles: generatedVehicles,
      generationRate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to generate vehicles' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get current generation statistics
    const totalVehicles = await db.vehicle.count({
      where: { exitedAt: null }
    });

    const totalRoads = await db.road.count({
      where: { isActive: true }
    });

    const averageCongestion = await db.road.aggregate({
      _avg: {
        congestionLevel: true
      }
    });

    const generationRate = getGenerationRate();

    const stats = {
      totalVehicles,
      totalRoads,
      averageCongestion: averageCongestion._avg.congestionLevel || 0,
      generationRate,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching generation stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generation stats' },
      { status: 500 }
    );
  }
}