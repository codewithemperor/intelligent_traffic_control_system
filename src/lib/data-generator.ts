import { db } from '@/lib/db';
import { VehicleType, Direction, Algorithm } from '@/types/traffic';
import { CAMPUS_INTERSECTIONS, VEHICLE_GENERATION_RULES } from '@/constants/traffic-config';

export class DataGenerator {
  /**
   * Initialize the database with sample traffic intersections
   */
  static async initializeIntersections() {
    try {
      console.log('Initializing traffic intersections...');
      
      for (const intersection of CAMPUS_INTERSECTIONS) {
        // Check if intersection already exists
        const existing = await db.trafficLight.findFirst({
          where: { name: intersection.name }
        });
        
        if (!existing) {
          // Create traffic light
          const trafficLight = await db.trafficLight.create({
            data: {
              name: intersection.name,
              location: intersection.name,
              status: 'RED',
              timing: {
                red: 30,
                yellow: 5,
                green: 25,
                cycle: 60
              },
              algorithm: Algorithm.ADAPTIVE,
              priority: 1,
              isActive: true
            }
          });

          // Create roads for this intersection
          for (let i = 0; i < intersection.roads.length; i++) {
            const roadName = intersection.roads[i];
            const direction = Object.values(Direction)[i % Object.values(Direction).length];
            
            await db.road.create({
              data: {
                name: roadName,
                direction,
                vehicleCount: Math.floor(Math.random() * 10),
                maxCapacity: 50,
                trafficLightId: trafficLight.id,
                isActive: true,
                congestionLevel: Math.random() * 0.5,
                averageSpeed: 25 + Math.random() * 15
              }
            });
          }

          // Create sensors for this intersection
          await db.sensor.createMany({
            data: [
              {
                name: `${intersection.name} - Main Sensor`,
                type: 'LOOP_DETECTOR',
                trafficLightId: trafficLight.id,
                isActive: true,
                sensitivity: 1.0
              },
              {
                name: `${intersection.name} - Camera Sensor`,
                type: 'CAMERA',
                trafficLightId: trafficLight.id,
                isActive: true,
                sensitivity: 0.9
              }
            ]
          });

          console.log(`Created intersection: ${intersection.name}`);
        }
      }
      
      console.log('Traffic intersections initialized successfully');
    } catch (error) {
      console.error('Error initializing intersections:', error);
      throw error;
    }
  }

  /**
   * Generate Nigerian license plate number
   */
  static generateNigerianPlate(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    const firstLetter = letters[Math.floor(Math.random() * letters.length)];
    const secondLetter = letters[Math.floor(Math.random() * letters.length)];
    const thirdLetter = letters[Math.floor(Math.random() * letters.length)];
    
    const firstNumber = numbers[Math.floor(Math.random() * numbers.length)];
    const secondNumber = numbers[Math.floor(Math.random() * numbers.length)];
    const thirdNumber = numbers[Math.floor(Math.random() * numbers.length)];
    
    const stateCodes = ['AB', 'AD', 'AK', 'AN', 'BA', 'BY', 'BN', 'BO', 'CR', 'CB', 'DE', 'EB', 'ED', 'EK', 'EN', 'FC', 'GO', 'IM', 'JI', 'KD', 'KN', 'KO', 'KT', 'KB', 'KW', 'LA', 'NA', 'NG', 'OG', 'OY', 'OS', 'OD', 'OT', 'PL', 'RV', 'SO', 'TR', 'YB', 'ZA'];
    const stateCode = stateCodes[Math.floor(Math.random() * stateCodes.length)];
    
    return `${firstLetter}${secondLetter}${thirdLetter}-${firstNumber}${secondNumber}${thirdNumber}-${stateCode}`;
  }

  /**
   * Get random vehicle type based on weighted probabilities
   */
  static getRandomVehicleType(): VehicleType {
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

  /**
   * Get random speed based on vehicle type
   */
  static getRandomSpeed(vehicleType: VehicleType): number {
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

  /**
   * Get generation rate based on time of day
   */
  static getGenerationRate(): number {
    const hour = new Date().getHours();
    
    if (hour >= 8 && hour <= 9) return VEHICLE_GENERATION_RULES.peakHourBoost; // Peak morning
    if (hour >= 12 && hour <= 13) return VEHICLE_GENERATION_RULES.peakHourBoost * 0.8; // Lunch
    if (hour >= 16 && hour <= 17) return VEHICLE_GENERATION_RULES.peakHourBoost; // Peak evening
    if (hour >= 22 || hour <= 6) return 0.3; // Night time
    
    return 1.0; // Normal
  }

  /**
   * Generate vehicles for all active roads
   */
  static async generateVehicles(count: number = 1): Promise<any[]> {
    try {
      const roads = await db.road.findMany({
        where: { isActive: true },
        include: { trafficLight: true }
      });

      if (roads.length === 0) {
        console.log('No active roads found');
        return [];
      }

      const generatedVehicles = [];
      const generationRate = this.getGenerationRate();

      for (let i = 0; i < count; i++) {
        // Select a random road with capacity
        const availableRoads = roads.filter(road => road.vehicleCount < road.maxCapacity);
        
        if (availableRoads.length === 0) {
          console.log('All roads at capacity');
          break;
        }

        const road = availableRoads[Math.floor(Math.random() * availableRoads.length)];
        
        // Generate vehicle data
        const vehicleType = this.getRandomVehicleType();
        const isEmergency = vehicleType === VehicleType.EMERGENCY;
        const priority = isEmergency ? 2 : 1;
        
        const vehicle = await db.vehicle.create({
          data: {
            plateNumber: this.generateNigerianPlate(),
            type: vehicleType,
            roadId: road.id,
            speed: this.getRandomSpeed(vehicleType),
            position: 0.0,
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

        // Create sensor reading
        const sensor = await db.sensor.findFirst({
          where: { 
            OR: [
              { roadId: road.id },
              { trafficLightId: road.trafficLightId }
            ]
          }
        });

        if (sensor) {
          await db.sensorReading.create({
            data: {
              sensorId: sensor.id,
              value: 1,
              vehicleCount: road.vehicleCount + 1,
              avgSpeed: this.getRandomSpeed(vehicleType)
            }
          });
        }

        generatedVehicles.push(vehicle);
      }

      console.log(`Generated ${generatedVehicles.length} vehicles (rate: ${generationRate}x)`);
      return generatedVehicles;
    } catch (error) {
      console.error('Error generating vehicles:', error);
      throw error;
    }
  }

  /**
   * Simulate vehicle movement and exit
   */
  static async simulateVehicleMovement(): Promise<void> {
    try {
      // Get all active vehicles
      const vehicles = await db.vehicle.findMany({
        where: { 
          isMoving: true,
          exitedAt: null 
        },
        include: {
          road: {
            include: {
              trafficLight: true
            }
          }
        }
      });

      for (const vehicle of vehicles) {
        // Move vehicle forward
        const movementSpeed = vehicle.speed / 100; // Convert to position increment
        const newPosition = Math.min(vehicle.position + movementSpeed, 1.0);

        // Check if vehicle has reached the end of the road
        if (newPosition >= 1.0) {
          // Vehicle exits the road
          await db.vehicle.update({
            where: { id: vehicle.id },
            data: {
              isMoving: false,
              exitedAt: new Date()
            }
          });

          // Update road vehicle count
          await db.road.update({
            where: { id: vehicle.roadId },
            data: {
              vehicleCount: {
                decrement: 1
              },
              congestionLevel: Math.max(0, (vehicle.road.vehicleCount - 1) / vehicle.road.maxCapacity)
            }
          });

          console.log(`Vehicle ${vehicle.plateNumber} exited ${vehicle.road.name}`);
        } else {
          // Update vehicle position
          await db.vehicle.update({
            where: { id: vehicle.id },
            data: {
              position: newPosition
            }
          });
        }
      }
    } catch (error) {
      console.error('Error simulating vehicle movement:', error);
      throw error;
    }
  }

  /**
   * Generate realistic traffic patterns throughout the day
   */
  static async generateTrafficPattern(): Promise<void> {
    try {
      const hour = new Date().getHours();
      let generationCount = 1;

      // Adjust generation count based on time of day
      if (hour >= 8 && hour <= 9) generationCount = 3; // Morning rush
      if (hour >= 12 && hour <= 13) generationCount = 2; // Lunch rush
      if (hour >= 16 && hour <= 17) generationCount = 3; // Evening rush
      if (hour >= 22 || hour <= 6) generationCount = 0; // Night time

      if (generationCount > 0) {
        await this.generateVehicles(generationCount);
      }

      // Simulate vehicle movement
      await this.simulateVehicleMovement();
    } catch (error) {
      console.error('Error generating traffic pattern:', error);
      throw error;
    }
  }

  /**
   * Start continuous traffic generation
   */
  static startContinuousGeneration(): void {
    console.log('Starting continuous traffic generation...');
    
    // Generate traffic every 5 seconds
    setInterval(async () => {
      try {
        await this.generateTrafficPattern();
      } catch (error) {
        console.error('Error in continuous generation:', error);
      }
    }, 5000);

    // Simulate vehicle movement every 2 seconds
    setInterval(async () => {
      try {
        await this.simulateVehicleMovement();
      } catch (error) {
        console.error('Error in vehicle movement simulation:', error);
      }
    }, 2000);
  }
}