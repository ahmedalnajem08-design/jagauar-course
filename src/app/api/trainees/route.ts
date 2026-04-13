import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const trainerId = request.nextUrl.searchParams.get('trainerId')

    const trainees = await db.trainee.findMany({
      where: trainerId ? { trainerId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { courses: true },
    })
    return NextResponse.json(trainees)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch trainees' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const trainee = await db.trainee.create({
      data: {
        name: body.name,
        phone: body.phone || '',
        gender: body.gender || 'male',
        weight: parseFloat(body.weight),
        height: parseFloat(body.height),
        age: parseInt(body.age),
        subscriptionDate: new Date(body.subscriptionDate),
        trainerId: body.trainerId,
      },
    })
    return NextResponse.json(trainee, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create trainee' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const trainee = await db.trainee.update({
      where: { id: body.id },
      data: {
        name: body.name,
        phone: body.phone || '',
        gender: body.gender || 'male',
        weight: parseFloat(body.weight),
        height: parseFloat(body.height),
        age: parseInt(body.age),
        subscriptionDate: new Date(body.subscriptionDate),
      },
    })
    return NextResponse.json(trainee)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update trainee' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    await db.trainee.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete trainee' }, { status: 500 })
  }
}
