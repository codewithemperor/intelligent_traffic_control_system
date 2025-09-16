import { PrismaClient, Status, Direction } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create junction
  const junction = await prisma.junction.create({
    data: {
      name: 'Main Campus Junction',
      location: 'Adeseun Ogundoyin Polytechnic',
      isActive: true,
    },
  })

  console.log('✅ Created junction:', junction.name)

  // Create roads with traffic lights
  const roads = [
    {
      name: 'North Gate Road',
      direction: Direction.NORTH,
      vehicleCount: 15,
      maxCapacity: 50,
      trafficLight: {
        status: Status.RED,
        timing: { red: 30, yellow: 5, green: 25 },
        priority: 1,
      },
    },
    {
      name: 'South Gate Road',
      direction: Direction.SOUTH,
      vehicleCount: 8,
      maxCapacity: 50,
      trafficLight: {
        status: Status.GREEN,
        timing: { red: 30, yellow: 5, green: 25 },
        priority: 2,
      },
    },
    {
      name: 'East Campus Road',
      direction: Direction.EAST,
      vehicleCount: 12,
      maxCapacity: 50,
      trafficLight: {
        status: Status.RED,
        timing: { red: 30, yellow: 5, green: 25 },
        priority: 3,
      },
    },
  ]

  for (const roadData of roads) {
    const road = await prisma.road.create({
      data: {
        name: roadData.name,
        direction: roadData.direction,
        vehicleCount: roadData.vehicleCount,
        maxCapacity: roadData.maxCapacity,
        junctionId: junction.id,
        trafficLight: {
          create: {
            status: roadData.trafficLight.status,
            timing: roadData.trafficLight.timing,
            priority: roadData.trafficLight.priority,
          },
        },
      },
    })
    console.log(`✅ Created road: ${road.name} with ${road.vehicleCount} vehicles`)
  }

  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })