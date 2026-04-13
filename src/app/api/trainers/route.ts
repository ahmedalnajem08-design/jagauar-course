import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const trainers = await db.trainer.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            trainees: true,
            exerciseGroups: true,
            courses: true,
          },
        },
      },
    })
    return NextResponse.json(trainers)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch trainers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const trainer = await db.trainer.create({
      data: {
        name: body.name,
        phone: body.phone || '',
        password: body.password || '1234',
        role: body.role || 'trainer',
      },
    })
    return NextResponse.json(trainer, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create trainer' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const data: Record<string, unknown> = {
      name: body.name,
      phone: body.phone || '',
      role: body.role,
    }
    if (body.password) {
      data.password = body.password
    }
    const trainer = await db.trainer.update({
      where: { id: body.id },
      data,
    })
    return NextResponse.json(trainer)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update trainer' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    // Prevent deleting last admin
    const trainer = await db.trainer.findUnique({ where: { id } })
    if (trainer?.role === 'admin') {
      const adminCount = await db.trainer.count({ where: { role: 'admin' } })
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'لا يمكن حذف آخر حساب مدير' }, { status: 400 })
      }
    }

    await db.trainer.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete trainer' }, { status: 500 })
  }
}
