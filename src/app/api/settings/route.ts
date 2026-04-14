import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const settings = await db.setting.findMany()
    const result: Record<string, string> = {}
    settings.forEach((s) => {
      result[s.key] = s.value
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.settings) {
      // Bulk update
      const entries = Object.entries(body.settings) as [string, string][]
      for (const [key, value] of entries) {
        await db.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      }
      return NextResponse.json({ success: true })
    }

    // Single update
    await db.setting.upsert({
      where: { key: body.key },
      update: { value: body.value },
      create: { key: body.key, value: body.value },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
