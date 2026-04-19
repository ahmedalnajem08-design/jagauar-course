import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    const trainerId = request.nextUrl.searchParams.get('trainerId')
    
    console.log('[API /courses] GET request - id:', id, 'trainerId:', trainerId)

    if (id) {
      const course = await db.course.findUnique({
        where: { id },
        include: {
          trainee: true,
          trainer: true,
          days: {
            orderBy: { dayNumber: 'asc' },
            include: {
              exercises: {
                orderBy: { order: 'asc' },
                include: { exercise: { include: { group: true } } },
              },
            },
          },
        },
      })
      if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      return NextResponse.json(course)
    }

    const courses = await db.course.findMany({
      where: trainerId ? { trainerId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        trainee: true,
        trainer: true,
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            exercises: {
              orderBy: { order: 'asc' },
              include: { exercise: true },
            },
          },
        },
      },
    })
    console.log('[API /courses] Returning', courses.length, 'courses for trainerId:', trainerId)
    return NextResponse.json(courses)
  } catch (error) {
    console.error('[API /courses] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { traineeId, trainerId, numberOfDays, days } = body
    
    console.log('[API /courses] POST - traineeId:', traineeId, 'trainerId:', trainerId, 'numberOfDays:', numberOfDays, 'days:', days?.length)

    const course = await db.course.create({
      data: {
        traineeId,
        trainerId,
        numberOfDays,
        days: {
          create: days.map((day: { dayNumber: number; exercises: { exerciseId: string; customSets?: number; customReps?: number; freeText?: string }[] }) => ({
            dayNumber: day.dayNumber,
            exercises: {
              create: day.exercises.map((ex: { exerciseId: string; customSets?: number; customReps?: number; freeText?: string; superSetId?: string }, index: number) => ({
                exerciseId: ex.exerciseId,
                customSets: ex.customSets,
                customReps: ex.customReps,
                freeText: ex.freeText || null,
                superSetId: ex.superSetId || null,
                order: index,
              })),
            },
          })),
        },
      },
      include: {
        trainee: true,
        trainer: true,
        days: { include: { exercises: { include: { exercise: true } } } },
      },
    })

    return NextResponse.json(course, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, traineeId, numberOfDays, days } = body

    // Delete existing days and recreate
    await db.courseDayExercise.deleteMany({
      where: { courseDay: { courseId: id } },
    })
    await db.courseDay.deleteMany({
      where: { courseId: id },
    })

    const course = await db.course.update({
      where: { id },
      data: {
        traineeId,
        numberOfDays,
        days: {
          create: days.map((day: { dayNumber: number; exercises: { exerciseId: string; customSets?: number; customReps?: number; freeText?: string }[] }) => ({
            dayNumber: day.dayNumber,
            exercises: {
              create: day.exercises.map((ex: { exerciseId: string; customSets?: number; customReps?: number; freeText?: string; superSetId?: string }, index: number) => ({
                exerciseId: ex.exerciseId,
                customSets: ex.customSets,
                customReps: ex.customReps,
                freeText: ex.freeText || null,
                superSetId: ex.superSetId || null,
                order: index,
              })),
            },
          })),
        },
      },
      include: {
        trainee: true,
        trainer: true,
        days: { include: { exercises: { include: { exercise: true } } } },
      },
    })

    return NextResponse.json(course)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    await db.courseDayExercise.deleteMany({
      where: { courseDay: { courseId: id } },
    })
    await db.courseDay.deleteMany({
      where: { courseId: id },
    })
    await db.course.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
  }
}
