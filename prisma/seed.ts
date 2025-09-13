import { PrismaClient } from '@prisma/client';
import { DataGenerator } from '../src/lib/data-generator';

const prisma = new PrismaClient();

async function main() {
  console.log('🚦 Starting database seed...');

  try {
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    await prisma.sensorReading.deleteMany();
    await prisma.trafficLog.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.sensor.deleteMany();
    await prisma.road.deleteMany();
    await prisma.trafficLight.deleteMany();

    // Initialize traffic intersections
    console.log('🏗️  Initializing traffic intersections...');
    await DataGenerator.initializeIntersections();

    // Generate some initial vehicles
    console.log('🚗 Generating initial vehicles...');
    await DataGenerator.generateVehicles(20);

    // Generate some sensor readings
    console.log('📊 Generating sensor readings...');
    const roads = await prisma.road.findMany();
    const sensors = await prisma.sensor.findMany();

    for (const sensor of sensors) {
      await prisma.sensorReading.create({
        data: {
          sensorId: sensor.id,
          value: Math.random() * 10,
          vehicleCount: Math.floor(Math.random() * 15),
          avgSpeed: 20 + Math.random() * 20
        }
      });
    }

    // Generate some traffic logs
    console.log('📝 Generating traffic logs...');
    const trafficLights = await prisma.trafficLight.findMany();

    for (const light of trafficLights) {
      await prisma.trafficLog.create({
        data: {
          trafficLightId: light.id,
          action: 'CYCLE_CHANGE',
          previousState: 'RED',
          newState: 'GREEN',
          reason: 'System initialization',
          vehicleCount: Math.floor(Math.random() * 10),
          efficiency: 0.8 + Math.random() * 0.2,
          waitTime: Math.floor(Math.random() * 30)
        }
      });
    }

    console.log('✅ Database seed completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Traffic Lights: ${trafficLights.length}`);
    console.log(`   - Roads: ${roads.length}`);
    console.log(`   - Sensors: ${sensors.length}`);
    console.log(`   - Initial vehicles: ${await prisma.vehicle.count()}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });