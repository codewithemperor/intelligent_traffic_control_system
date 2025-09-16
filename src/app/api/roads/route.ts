import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Direction } from '@prisma/client'

export async function GET() {
  try {
    const roads = await db.road.findMany({
      include: {
        trafficLight: true,
        junction: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json(roads)
  } catch (error) {
    console.error('Error fetching roads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, direction, vehicleCount, maxCapacity, junctionId } = await request.json()

    if (!name || !direction || !junctionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!Object.values(Direction).includes(direction)) {
      return NextResponse.json({ error: 'Invalid direction' }, { status: 400 })
    }

    // Check if junction exists
    const junction = await db.junction.findUnique({
      where: { id: junctionId }
    })

    if (!junction) {
      return NextResponse.json({ error: 'Junction not found' }, { status: 404 })
    }

    const road = await db.road.create({
      data: {
        name,
        direction,
        vehicleCount: vehicleCount || 0,
        maxCapacity: maxCapacity || 50,
        junctionId,
        trafficLight: {
          create: {
            status: 'RED',
            timing: { red: 30, yellow: 5, green: 25 },
            priority: 1
          }
        }
      },
      include: {
        trafficLight: true,
        junction: true
      }
    })

    return NextResponse.json(road)
  } catch (error) {
    console.error('Error creating road:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}