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
                vehicleCount: Math.floor(Math.random() * 10),
                maxCapacity: 50,
                intersectionId: newIntersection.id,
                isActive: true,
                congestionLevel: Math.random() * 0.5,
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
                  red: 30,
                  yellow: 5,
                  green: 25,
                  cycle: 60
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
    
    if (hour >= 8 && hour <= 9) return VEHICLE_GENERATION_RULES.peakHourBoost; // Peak morning
    if (hour >= 12 && hour <= 13) return VEHICLE_GENERATION_RULES.peakHourBoost * 0.8; // Lunch
    if (hour >= 16 && hour <= 17) return VEHICLE_GENERATION_RULES.peakHourBoost; // Peak evening
    if (hour >= 22 || hour <= 6) return 0.3; // Night time
    
    return 1.0; // Normal
  }

  /**
   * Generate vehicles for all active roads - FIXED VERSION
   * - More likely to generate vehicles during RED lights (piling up)
   * - Less likely during GREEN lights (cars are moving)
   * - Each intersection works independently
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

      for (let i = 0; i < count; i++) {
        // Select roads based on traffic light status - prefer RED light roads for vehicle generation
        const roadsWithStatus = roads.map(road => {
          const trafficLight = road.trafficLights?.[0];
          const lightStatus = trafficLight?.status || 'RED';
          
          // RED lights should get more vehicles (piling up)
          // GREEN lights should get fewer vehicles (cars moving through)
          let generationPriority = 1;
          if (lightStatus === 'RED') {
            generationPriority = 3; // High priority for red lights
          } else if (lightStatus === 'GREEN') {
            generationPriority = 0.5; // Low priority for green lights
          } else if (lightStatus === 'YELLOW') {
            generationPriority = 1.5; // Medium priority for yellow lights
          }
          
          return {
            road,
            trafficLight,
            lightStatus,
            generationPriority,
            availableCapacity: Math.max(0, road.maxCapacity - road.vehicleCount)
          };
        });

        // Filter roads with available capacity and sort by priority
        const availableRoads = roadsWithStatus
          .filter(item => item.availableCapacity > 0)
          .sort((a, b) => b.generationPriority - a.generationPriority);
        
        if (availableRoads.length === 0) {
          console.log('All roads at capacity');
          break;
        }

        // Select road with highest priority (prefer RED lights)
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

        // Update road vehicle count - INCREASE
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
              { intersectionId: road.intersectionId }
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

        console.log(`Generated ${vehicleType} on ${road.name} (${selectedRoad.lightStatus} light) - Total: ${road.vehicleCount + 1} vehicles`);
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
   * Simulate vehicle movement and exit - FIXED VERSION
   * - Vehicles move and exit during GREEN lights
   * - Vehicles pile up during RED lights
   * - Each intersection works independently
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
              intersection: true,
              trafficLights: true
            }
          }
        }
      });

      for (const vehicle of vehicles) {
        const road = vehicle.road;
        const intersection = road.intersection;
        
        // Find the traffic light for this road
        const trafficLight = road.trafficLights?.[0];
        if (!trafficLight) continue;

        // Check if the light is GREEN - vehicles can move and exit
        if (trafficLight.status === 'GREEN') {
          // Calculate movement probability based on green time remaining
          const elapsed = (new Date().getTime() - trafficLight.lastChanged.getTime()) / 1000;
          const greenTime = trafficLight.timing?.green || 25;
          const timeRemaining = Math.max(0, greenTime - elapsed);
          
          // Higher chance to exit as green time progresses
          const exitProbability = Math.min(0.3 + (elapsed / greenTime) * 0.4, 0.7);
          
          if (Math.random() < exitProbability) {
            // Vehicle exits the road
            await db.vehicle.update({
              where: { id: vehicle.id },
              data: {
                isMoving: false,
                exitedAt: new Date()
              }
            });

            // Update road vehicle count - DECREASE during green
            if (road.vehicleCount > 0) {
              await db.road.update({
                where: { id: road.id },
                data: {
                  vehicleCount: {
                    decrement: 1
                  },
                  congestionLevel: Math.max(0, (road.vehicleCount - 1) / road.maxCapacity)
                }
              });
            }

            console.log(`Vehicle ${vehicle.plateNumber} exited ${road.name} during GREEN light`);
          } else {
            // Vehicle moves forward but hasn't exited yet
            const newPosition = Math.min(vehicle.position + 0.3, 1.0);
            await db.vehicle.update({
              where: { id: vehicle.id },
              data: {
                position: newPosition
              }
            });
          }
        } else if (trafficLight.status === 'RED') {
          // During RED light - vehicles pile up (increase vehicle count simulation)
          // Actually, during red light, vehicles should stop moving forward
          // But new vehicles might join the queue (handled by generateVehicles)
          
          // Just update position slightly to simulate creeping forward
          const newPosition = Math.min(vehicle.position + 0.05, 1.0);
          await db.vehicle.update({
            where: { id: vehicle.id },
            data: {
              position: newPosition
            }
          });
        }
        // YELLOW light - vehicles prepare to stop, some may exit if close to intersection
        else if (trafficLight.status === 'YELLOW') {
          const exitProbability = 0.1; // Low chance to exit during yellow
          
          if (Math.random() < exitProbability && vehicle.position > 0.8) {
            // Vehicle exits if close to intersection
            await db.vehicle.update({
              where: { id: vehicle.id },
              data: {
                isMoving: false,
                exitedAt: new Date()
              }
            });

            if (road.vehicleCount > 0) {
              await db.road.update({
                where: { id: road.id },
                data: {
                  vehicleCount: {
                    decrement: 1
                  },
                  congestionLevel: Math.max(0, (road.vehicleCount - 1) / road.maxCapacity)
                }
              });
            }
          } else {
            // Slow down movement
            const newPosition = Math.min(vehicle.position + 0.1, 1.0);
            await db.vehicle.update({
              where: { id: vehicle.id },
              data: {
                position: newPosition
              }
            });
          }
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