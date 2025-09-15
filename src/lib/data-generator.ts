import { db } from '@/lib/db';
import { VehicleType, Direction, Algorithm, Status } from '@/types/traffic';
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
        const existing = await db.intersection.findFirst({
          where: { name: intersection.name }
        });
        
        if (!existing) {
          // Create intersection
          const newIntersection = await db.intersection.create({
            data: {
              name: intersection.name,
              location: intersection.name,
              algorithm: Algorithm.ADAPTIVE,
              priority: 1,
              isActive: true
            }
          });

          // Create roads for this intersection
          const createdRoads = [];
          for (let i = 0; i < intersection.roads.length; i++) {
            const roadName = intersection.roads[i];
            const direction = Object.values(Direction)[i % Object.values(Direction).length];
            
            const road = await db.road.create({
              data: {
                name: roadName,
                direction,
                vehicleCount: Math.floor(Math.random() * 5), // Start with fewer vehicles
                maxCapacity: 30, // Reduced capacity for faster cycling
                intersectionId: newIntersection.id,
                isActive: true,
                congestionLevel: Math.random() * 0.3, // Lower initial congestion
                averageSpeed: 25 + Math.random() * 15
              }
            });
            createdRoads.push(road);
          }

          // Create traffic lights for each road
          const createdTrafficLights = [];
          for (const road of createdRoads) {
            const trafficLight = await db.trafficLight.create({
              data: {
                intersectionId: newIntersection.id,
                roadId: road.id,
                direction: road.direction,
                status: Status.RED,
                timing: {
                  red: 15,
                  yellow: 3,
                  green: 8,
                  cycle: 26
                },
                isActive: true,
                currentCycleTime: 0
              }
            });
            createdTrafficLights.push(trafficLight);
          }

          // Create sensors for this intersection
          await db.sensor.createMany({
            data: [
              {
                name: `${intersection.name} - Main Sensor`,
                type: 'LOOP_DETECTOR',
                intersectionId: newIntersection.id,
                isActive: true,
                sensitivity: 1.0
              },
              {
                name: `${intersection.name} - Camera Sensor`,
                type: 'CAMERA',
                intersectionId: newIntersection.id,
                isActive: true,
                sensitivity: 0.9
              }
            ]
          });

          // Create road-specific sensors
          for (const road of createdRoads) {
            await db.sensor.create({
              data: {
                name: `${road.name} - Vehicle Counter`,
                type: 'PRESSURE',
                roadId: road.id,
                isActive: true,
                sensitivity: 1.0
              }
            });
          }

          console.log(`Created intersection: ${intersection.name} with ${createdRoads.length} roads and ${createdTrafficLights.length} traffic lights`);
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
    
    if (hour >= 8 && hour <= 9) return 1.5; // Peak morning - reduced from original
    if (hour >= 12 && hour <= 13) return 1.2; // Lunch 
    if (hour >= 16 && hour <= 17) return 1.5; // Peak evening
    if (hour >= 22 || hour <= 6) return 0.3; // Night time
    
    return 1.0; // Normal
  }

  /**
   * FAST vehicle generation - adds vehicles quickly to RED light roads
   * Generates every 2-3 seconds during active periods
   */
  static async generateVehicles(count: number = 1): Promise<any[]> {
    try {
      const roads = await db.road.findMany({
        where: { isActive: true },
        include: { 
          intersection: true,
          trafficLights: true
        }
      });

      if (roads.length === 0) {
        console.log('No active roads found');
        return [];
      }

      const generatedVehicles = [];
      const generationRate = this.getGenerationRate();

      // INCREASED generation for faster simulation
      const adjustedCount = Math.ceil(count * generationRate * 2); // Double the generation rate

      for (let i = 0; i < adjustedCount; i++) {
        // Prioritize RED light roads for vehicle accumulation
        const roadsWithStatus = roads.map(road => {
          const trafficLight = road.trafficLights?.[0];
          const lightStatus = trafficLight?.status || 'RED';
          
          let generationPriority = 1;
          if (lightStatus === 'RED') {
            generationPriority = 5; // VERY high priority for red lights
          } else if (lightStatus === 'YELLOW') {
            generationPriority = 2; // Medium priority for yellow lights
          } else if (lightStatus === 'GREEN') {
            generationPriority = 0.3; // Very low priority for green lights (cars moving)
          }
          
          // Prevent negative vehicle counts
          const currentVehicleCount = Math.max(0, road.vehicleCount);
          
          return {
            road,
            trafficLight,
            lightStatus,
            generationPriority,
            availableCapacity: Math.max(0, road.maxCapacity - currentVehicleCount),
            currentVehicleCount
          };
        });

        // Filter roads with available capacity and prioritize RED lights
        const availableRoads = roadsWithStatus
          .filter(item => item.availableCapacity > 0)
          .sort((a, b) => {
            // Primary sort: RED lights first
            if (a.lightStatus === 'RED' && b.lightStatus !== 'RED') return -1;
            if (b.lightStatus === 'RED' && a.lightStatus !== 'RED') return 1;
            // Secondary sort: by generation priority
            return b.generationPriority - a.generationPriority;
          });
        
        if (availableRoads.length === 0) {
          console.log('All roads at capacity');
          break;
        }

        // Select the highest priority road (prefer RED lights)
        const selectedRoad = availableRoads[0];
        const road = selectedRoad.road;
        
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

        // SAFE vehicle count increment with verification
        const currentRoad = await db.road.findUnique({ where: { id: road.id } });
        if (currentRoad) {
          const newVehicleCount = Math.max(0, currentRoad.vehicleCount) + 1;
          const newCongestionLevel = Math.min(newVehicleCount / currentRoad.maxCapacity, 1.0);
          
          await db.road.update({
            where: { id: road.id },
            data: {
              vehicleCount: newVehicleCount,
              congestionLevel: newCongestionLevel
            }
          });

          // Create sensor reading
          const sensor = await db.sensor.findFirst({
            where: { 
              OR: [
                { roadId: road.id },
                { intersectionId: road.intersectionId }
              ]
            }
          });

          if (sensor) {
            await db.sensorReading.create({
              data: {
                sensorId: sensor.id,
                value: 1,
                vehicleCount: newVehicleCount,
                avgSpeed: this.getRandomSpeed(vehicleType)
              }
            });
          }

          console.log(`Generated ${vehicleType} on ${road.name} (${selectedRoad.lightStatus} light) - Total: ${newVehicleCount} vehicles`);
          generatedVehicles.push(vehicle);
        }
      }

      console.log(`Generated ${generatedVehicles.length} vehicles (rate: ${generationRate}x)`);
      return generatedVehicles;
    } catch (error) {
      console.error('Error generating vehicles:', error);
      throw error;
    }
  }

  /**
   * OPTIMIZED vehicle movement and exit - removes vehicles efficiently during GREEN lights
   * Processes vehicle movement with batch database operations for better performance
   */
  static async simulateVehicleMovement(): Promise<{ movedVehicles: number; exitedVehicles: number }> {
    try {
      // Get all active vehicles with road and traffic light info
      const vehicles = await db.vehicle.findMany({
        where: { 
          isMoving: true,
          exitedAt: null 
        },
        include: {
          road: {
            include: {
              intersection: true,
              trafficLights: true
            }
          }
        }
      });

      let movedVehicles = 0;
      let exitedVehicles = 0;
      
      // Group vehicles by road for batch processing
      const vehiclesByRoad = new Map<string, typeof vehicles>();
      vehicles.forEach(vehicle => {
        if (vehicle.road) {
          if (!vehiclesByRoad.has(vehicle.road.id)) {
            vehiclesByRoad.set(vehicle.road.id, []);
          }
          vehiclesByRoad.get(vehicle.road.id)!.push(vehicle);
        }
      });

      // Process each road's vehicles
      for (const [roadId, roadVehicles] of vehiclesByRoad) {
        const road = roadVehicles[0]?.road;
        if (!road) continue;

        const trafficLight = road.trafficLights?.[0];
        if (!trafficLight) continue;

        const currentTime = new Date();
        const elapsed = (currentTime.getTime() - trafficLight.lastChanged.getTime()) / 1000;

        // Track vehicle updates for batch operations
        const vehicleUpdates: Array<{ id: string; position: number; isMoving?: boolean; exitedAt?: Date }> = [];
        let roadExitCount = 0;

        // Process vehicles on this road
        for (const vehicle of roadVehicles) {
          // GREEN LIGHT: Multiple vehicles can exit
          if (trafficLight.status === 'GREEN') {
            const greenTime = trafficLight.timing?.green || 8;
            const exitProbability = Math.min(0.9, 0.5 + (elapsed / greenTime) * 0.4); // 50-90% chance
            
            if (Math.random() < exitProbability || vehicle.position >= 0.8) {
              // Vehicle exits the road
              vehicleUpdates.push({
                id: vehicle.id,
                position: 1.0,
                isMoving: false,
                exitedAt: new Date()
              });
              roadExitCount++;
              exitedVehicles++;
            } else {
              // Vehicle moves forward
              const newPosition = Math.min(vehicle.position + 0.3, 1.0);
              vehicleUpdates.push({
                id: vehicle.id,
                position: newPosition
              });
              movedVehicles++;
            }
          }
          
          // YELLOW LIGHT: Some vehicles may exit if close to intersection
          else if (trafficLight.status === 'YELLOW') {
            const exitProbability = vehicle.position > 0.7 ? 0.7 : 0.2;
            
            if (Math.random() < exitProbability) {
              vehicleUpdates.push({
                id: vehicle.id,
                position: 1.0,
                isMoving: false,
                exitedAt: new Date()
              });
              roadExitCount++;
              exitedVehicles++;
            } else {
              // Slow movement during yellow
              const newPosition = Math.min(vehicle.position + 0.08, 1.0);
              vehicleUpdates.push({
                id: vehicle.id,
                position: newPosition
              });
              movedVehicles++;
            }
          }
          
          // RED LIGHT: Vehicles stop and queue up (minimal movement)
          else if (trafficLight.status === 'RED') {
            // Very minimal movement during red
            const newPosition = Math.min(vehicle.position + 0.02, 1.0);
            vehicleUpdates.push({
              id: vehicle.id,
              position: newPosition
            });
            movedVehicles++;
          }
        }

        // Batch update vehicles
        if (vehicleUpdates.length > 0) {
          await Promise.all(
            vehicleUpdates.map(update => 
              db.vehicle.update({
                where: { id: update.id },
                data: {
                  position: update.position,
                  ...(update.isMoving !== undefined && { isMoving: update.isMoving }),
                  ...(update.exitedAt && { exitedAt: update.exitedAt })
                }
              })
            )
          );
        }

        // Update road vehicle count if vehicles exited
        if (roadExitCount > 0) {
          const currentRoad = await db.road.findUnique({ where: { id: road.id } });
          if (currentRoad && currentRoad.vehicleCount > 0) {
            const newVehicleCount = Math.max(0, currentRoad.vehicleCount - roadExitCount);
            const newCongestionLevel = newVehicleCount > 0 ? 
              Math.max(0, newVehicleCount / currentRoad.maxCapacity) : 0;

            await db.road.update({
              where: { id: road.id },
              data: {
                vehicleCount: newVehicleCount,
                congestionLevel: newCongestionLevel
              }
            });

            if (roadExitCount > 0) {
              console.log(`${roadExitCount} vehicles exited ${road.name} during ${trafficLight.status} - Remaining: ${newVehicleCount}`);
            }
          }
        }
      }

      // Clean up old exited vehicles (older than 1 minute) - batch operation
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const deletedCount = await db.vehicle.deleteMany({
        where: {
          exitedAt: {
            lt: oneMinuteAgo
          }
        }
      });

      if (deletedCount.count > 0) {
        console.log(`Cleaned up ${deletedCount.count} old exited vehicles`);
      }

      return { movedVehicles, exitedVehicles };

    } catch (error) {
      console.error('Error simulating vehicle movement:', error);
      throw error;
    }
  }

  /**
   * Generate realistic traffic patterns with FASTER timing
   */
  static async generateTrafficPattern(): Promise<void> {
    try {
      const hour = new Date().getHours();
      let generationCount = 1;

      // INCREASED generation for faster simulation
      if (hour >= 8 && hour <= 9) generationCount = 2; // Morning rush (reduced from 3)
      if (hour >= 12 && hour <= 13) generationCount = 2; // Lunch rush 
      if (hour >= 16 && hour <= 17) generationCount = 2; // Evening rush
      if (hour >= 22 || hour <= 6) generationCount = 1; // Night time (increased from 0)

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
   * Start continuous traffic generation with FASTER intervals
   */
  static startContinuousGeneration(): void {
    console.log('Starting FAST continuous traffic generation...');
    
    // FASTER vehicle generation: every 3 seconds (was 5)
    setInterval(async () => {
      try {
        await this.generateTrafficPattern();
      } catch (error) {
        console.error('Error in continuous generation:', error);
      }
    }, 3000); // Every 3 seconds - FASTER

    // FASTER vehicle movement: every 2 seconds (was 2) 
    setInterval(async () => {
      try {
        await this.simulateVehicleMovement();
      } catch (error) {
        console.error('Error in vehicle movement simulation:', error);
      }
    }, 2000); // Every 2 seconds - MAINTAINED

    console.log('✅ FAST traffic simulation started - Generation: 3s, Movement: 2s');
  }

  /**
   * EMERGENCY: Fix negative vehicle counts across all roads
   */
  static async fixNegativeVehicleCounts(): Promise<void> {
    try {
      console.log('🔧 Fixing negative vehicle counts...');
      
      // Find all roads with negative or invalid vehicle counts
      const roads = await db.road.findMany();
      
      for (const road of roads) {
        if (road.vehicleCount < 0 || isNaN(road.vehicleCount)) {
          // Count actual vehicles on this road
          const actualVehicleCount = await db.vehicle.count({
            where: {
              roadId: road.id,
              isMoving: true,
              exitedAt: null
            }
          });

          // Update with correct count
          await db.road.update({
            where: { id: road.id },
            data: {
              vehicleCount: actualVehicleCount,
              congestionLevel: Math.max(0, actualVehicleCount / road.maxCapacity)
            }
          });

          console.log(`Fixed ${road.name}: was ${road.vehicleCount}, now ${actualVehicleCount}`);
        }
      }
      
      console.log('✅ Vehicle count fix completed');
    } catch (error) {
      console.error('Error fixing vehicle counts:', error);
      throw error;
    }
  }
}