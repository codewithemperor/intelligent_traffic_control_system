import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (!action || !['start', 'stop', 'reset'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // For simulation control, we'll just return success
    // The actual simulation logic will be handled client-side
    return NextResponse.json({ success: true, action })
  } catch (error) {
    console.error('Error controlling simulation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}