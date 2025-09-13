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
                status: Status.RED,
                timing: {
                  red: 30,
                  yellow: 5,
                  green: 25,
                  cycle: 60
                },
                isActive: true
              }
            });
            createdTrafficLights.push(trafficLight);
          }

          // Create intersection phases for coordinated traffic control
          const phases = this.createIntersectionPhases(createdTrafficLights, intersection.roads.length);
          const createdPhases = [];
          
          for (let i = 0; i < phases.length; i++) {
            const phase = await db.intersectionPhase.create({
              data: {
                intersectionId: newIntersection.id,
                name: phases[i].name,
                phaseNumber: phases[i].phaseNumber,
                timing: phases[i].timing,
                isActive: true
              }
            });
            createdPhases.push(phase);

            // Create phase light mappings
            for (const phaseLight of phases[i].lights) {
              await db.phaseLight.create({
                data: {
                  intersectionPhaseId: phase.id,
                  trafficLightId: phaseLight.trafficLightId,
                  status: phaseLight.status
                }
              });
            }
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
   * Create intersection phases for coordinated traffic control
   */
  private static createIntersectionPhases(trafficLights: any[], roadCount: number) {
    const phases = [];
    
    if (roadCount === 3) {
      // 3-way intersection: Phase 1 (North-South), Phase 2 (East)
      phases.push({
        name: 'North-South Flow',
        phaseNumber: 1,
        timing: { green: 25, yellow: 5, red: 30, allRed: 2 },
        lights: [
          { trafficLightId: trafficLights[0].id, status: Status.GREEN },
          { trafficLightId: trafficLights[1].id, status: Status.GREEN },
          { trafficLightId: trafficLights[2].id, status: Status.RED }
        ]
      });
      
      phases.push({
        name: 'East Flow',
        phaseNumber: 2,
        timing: { green: 20, yellow: 5, red: 35, allRed: 2 },
        lights: [
          { trafficLightId: trafficLights[0].id, status: Status.RED },
          { trafficLightId: trafficLights[1].id, status: Status.RED },
          { trafficLightId: trafficLights[2].id, status: Status.GREEN }
        ]
      });
    } else if (roadCount === 4) {
      // 4-way intersection: Phase 1 (North-South), Phase 2 (East-West)
      phases.push({
        name: 'North-South Flow',
        phaseNumber: 1,
        timing: { green: 25, yellow: 5, red: 30, allRed: 2 },
        lights: [
          { trafficLightId: trafficLights[0].id, status: Status.GREEN },
          { trafficLightId: trafficLights[1].id, status: Status.GREEN },
          { trafficLightId: trafficLights[2].id, status: Status.RED },
          { trafficLightId: trafficLights[3].id, status: Status.RED }
        ]
      });
      
      phases.push({
        name: 'East-West Flow',
        phaseNumber: 2,
        timing: { green: 25, yellow: 5, red: 30, allRed: 2 },
        lights: [
          { trafficLightId: trafficLights[0].id, status: Status.RED },
          { trafficLightId: trafficLights[1].id, status: Status.RED },
          { trafficLightId: trafficLights[2].id, status: Status.GREEN },
          { trafficLightId: trafficLights[3].id, status: Status.GREEN }
        ]
      });
    } else {
      // Default: single phase for all lights
      phases.push({
        name: 'All Flow',
        phaseNumber: 1,
        timing: { green: 30, yellow: 5, red: 25, allRed: 2 },
        lights: trafficLights.map(light => ({
          trafficLightId: light.id,
          status: Status.GREEN
        }))
      });
    }
    
    return phases;
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
              intersection: true,
              trafficLights: true
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