import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const junctions = await db.junction.findMany({
      include: {
        roads: {
          include: {
            trafficLight: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json(junctions)
  } catch (error) {
    console.error('Error fetching junctions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}