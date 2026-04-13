import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const exercise = await db.exercise.create({
      data: {
        name: body.name,
        description: body.description || null,
        sets: parseInt(body.sets) || 3,
        reps: parseInt(body.reps) || 10,
        groupId: body.groupId,
      },
    })
    return NextResponse.json(exercise, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create exercise' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const exercise = await db.exercise.update({
      where: { id: body.id },
      data: {
        name: body.name,
        description: body.description || null,
        sets: parseInt(body.sets) || 3,
        reps: parseInt(body.reps) || 10,
        groupId: body.groupId,
      },
    })
    return NextResponse.json(exercise)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update exercise' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    await db.exercise.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete exercise' }, { status: 500 })
  }
}
