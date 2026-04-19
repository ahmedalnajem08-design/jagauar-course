import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ضمان إن أعمدة السوبر سيت والنص الحر موجودة في قاعدة البيانات
let schemaFixed = false
async function ensureSchema() {
  if (schemaFixed) return
  const alterCommands = [
    'ALTER TABLE CourseDayExercise ADD COLUMN freeText TEXT',
    'ALTER TABLE CourseDayExercise ADD COLUMN superSetId TEXT',
    'ALTER TABLE "CourseDayExercise" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0',
  ]
  for (const sql of alterCommands) {
    try {
      await db.$executeRawUnsafe(sql)
    } catch {
      // العمود موجود فعلاً - لا مشكلة
    }
  }
  schemaFixed = true
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    const trainerId = request.nextUrl.searchParams.get('trainerId')

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
    return NextResponse.json(courses)
  } catch (error) {
    console.error('[API /courses] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // تأكد إن الـ schema محدث قبل إنشاء الكورس
    await ensureSchema()

    const body = await request.json()
    const { traineeId, trainerId, numberOfDays, days } = body

    if (!traineeId || !trainerId || !numberOfDays || !days || !Array.isArray(days)) {
      return NextResponse.json({
        error: 'بيانات ناقصة',
        details: `traineeId: ${!!traineeId}, trainerId: ${!!trainerId}, numberOfDays: ${!!numberOfDays}, days: ${!!days}`
      }, { status: 400 })
    }

    const course = await db.course.create({
      data: {
        traineeId,
        trainerId,
        numberOfDays,
        days: {
          create: days.map((day: { dayNumber: number; exercises: { exerciseId: string; customSets?: number; customReps?: number; freeText?: string; superSetId?: string }[] }) => ({
            dayNumber: day.dayNumber,
            exercises: {
              create: day.exercises.map((ex: { exerciseId: string; customSets?: number; customReps?: number; freeText?: string; superSetId?: string }, index: number) => ({
                exerciseId: ex.exerciseId,
                customSets: ex.customSets ?? null,
                customReps: ex.customReps ?? null,
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
  } catch (error: any) {
    console.error('[API /courses] POST error:', error)
    const errorMessage = error?.message || 'خطأ غير معروف'
    const errorCode = error?.code || ''
    return NextResponse.json({
      error: 'فشل في إنشاء الكورس',
      details: errorMessage,
      code: errorCode
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // تأكد إن الـ schema محدث قبل تحديث الكورس
    await ensureSchema()

    const body = await request.json()
    const { id, traineeId, numberOfDays, days } = body

    if (!id || !traineeId || !numberOfDays || !days) {
      return NextResponse.json({
        error: 'بيانات ناقصة',
        details: `id: ${!!id}, traineeId: ${!!traineeId}, numberOfDays: ${!!numberOfDays}, days: ${!!days}`
      }, { status: 400 })
    }

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
          create: days.map((day: { dayNumber: number; exercises: { exerciseId: string; customSets?: number; customReps?: number; freeText?: string; superSetId?: string }[] }) => ({
            dayNumber: day.dayNumber,
            exercises: {
              create: day.exercises.map((ex: { exerciseId: string; customSets?: number; customReps?: number; freeText?: string; superSetId?: string }, index: number) => ({
                exerciseId: ex.exerciseId,
                customSets: ex.customSets ?? null,
                customReps: ex.customReps ?? null,
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
  } catch (error: any) {
    console.error('[API /courses] PUT error:', error)
    const errorMessage = error?.message || 'خطأ غير معروف'
    const errorCode = error?.code || ''
    return NextResponse.json({
      error: 'فشل في تحديث الكورس',
      details: errorMessage,
      code: errorCode
    }, { status: 500 })
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
