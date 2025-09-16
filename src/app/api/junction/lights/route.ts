import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Status } from '@prisma/client'

export async function PUT(request: NextRequest) {
  try {
    const { roadId, status } = await request.json()

    if (!roadId || !Object.values(Status).includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const trafficLight = await db.trafficLight.update({
      where: { roadId },
      data: { status },
      include: {
        road: true
      }
    })

    return NextResponse.json(trafficLight)
  } catch (error) {
    console.error('Error updating traffic light:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}