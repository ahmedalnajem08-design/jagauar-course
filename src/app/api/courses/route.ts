import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')

    if (id) {
      const course = await db.course.findUnique({
        where: { id },
        include: {
          trainee: true,
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
      orderBy: { createdAt: 'desc' },
      include: {
        trainee: true,
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
    return NextResponse.json(courses)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { traineeId, numberOfDays, days } = body

    const course = await db.course.create({
      data: {
        traineeId,
        numberOfDays,
        days: {
          create: days.map((day: { dayNumber: number; exercises: { exerciseId: string; customSets?: number; customReps?: number }[] }) => ({
            dayNumber: day.dayNumber,
            exercises: {
              create: day.exercises.map((ex: { exerciseId: string; customSets?: number; customReps?: number }, index: number) => ({
                exerciseId: ex.exerciseId,
                customSets: ex.customSets,
                customReps: ex.customReps,
                order: index,
              })),
            },
          })),
        },
      },
      include: {
        trainee: true,
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
          create: days.map((day: { dayNumber: number; exercises: { exerciseId: string; customSets?: number; customReps?: number }[] }) => ({
            dayNumber: day.dayNumber,
            exercises: {
              create: day.exercises.map((ex: { exerciseId: string; customSets?: number; customReps?: number }, index: number) => ({
                exerciseId: ex.exerciseId,
                customSets: ex.customSets,
                customReps: ex.customReps,
                order: index,
              })),
            },
          })),
        },
      },
      include: {
        trainee: true,
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
