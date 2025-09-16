import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get the first junction (we'll only have one for simplicity)
    const junction = await db.junction.findFirst({
      include: {
        roads: {
          include: {
            trafficLight: true
          }
        }
      }
    })

    if (!junction) {
      return NextResponse.json({ error: 'No junction found' }, { status: 404 })
    }

    return NextResponse.json(junction)
  } catch (error) {
    console.error('Error fetching junction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}