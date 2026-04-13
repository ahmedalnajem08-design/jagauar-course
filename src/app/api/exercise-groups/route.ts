import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const trainerId = request.nextUrl.searchParams.get('trainerId')

    const groups = await db.exerciseGroup.findMany({
      where: trainerId ? { trainerId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { exercises: { orderBy: { createdAt: 'asc' } } },
    })
    return NextResponse.json(groups)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch exercise groups' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const group = await db.exerciseGroup.create({
      data: {
        name: body.name,
        description: body.description || null,
        trainerId: body.trainerId,
      },
    })
    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create exercise group' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const group = await db.exerciseGroup.update({
      where: { id: body.id },
      data: {
        name: body.name,
        description: body.description || null,
      },
    })
    return NextResponse.json(group)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update exercise group' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    await db.exerciseGroup.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete exercise group' }, { status: 500 })
  }
}
