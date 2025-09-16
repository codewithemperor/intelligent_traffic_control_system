import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Direction, Status } from '@prisma/client'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const road = await db.road.findUnique({
      where: { id: params.id },
      include: {
        trafficLight: true,
        junction: true
      }
    })

    if (!road) {
      return NextResponse.json({ error: 'Road not found' }, { status: 404 })
    }

    return NextResponse.json(road)
  } catch (error) {
    console.error('Error fetching road:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, direction, vehicleCount, maxCapacity } = await request.json()

    const existingRoad = await db.road.findUnique({
      where: { id: params.id }
    })

    if (!existingRoad) {
      return NextResponse.json({ error: 'Road not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (direction !== undefined && Object.values(Direction).includes(direction)) updateData.direction = direction
    if (vehicleCount !== undefined) updateData.vehicleCount = Math.max(0, vehicleCount)
    if (maxCapacity !== undefined) updateData.maxCapacity = Math.max(1, maxCapacity)

    const road = await db.road.update({
      where: { id: params.id },
      data: updateData,
      include: {
        trafficLight: true,
        junction: true
      }
    })

    return NextResponse.json(road)
  } catch (error) {
    console.error('Error updating road:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existingRoad = await db.road.findUnique({
      where: { id: params.id }
    })

    if (!existingRoad) {
      return NextResponse.json({ error: 'Road not found' }, { status: 404 })
    }

    await db.road.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true, message: 'Road deleted successfully' })
  } catch (error) {
    console.error('Error deleting road:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}