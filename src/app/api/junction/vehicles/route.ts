import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
    const { roadId, vehicleCount } = await request.json()

    if (!roadId || typeof vehicleCount !== 'number') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const road = await db.road.update({
      where: { id: roadId },
      data: { vehicleCount: Math.max(0, vehicleCount) },
      include: {
        trafficLight: true
      }
    })

    return NextResponse.json(road)
  } catch (error) {
    console.error('Error updating vehicle count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}