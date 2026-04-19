import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// هذا الـ endpoint يختبر اتصال قاعدة البيانات ويشوف إذا الـ schema متزامن
// يُستخدم للتشخيص فقط
export async function GET(request: NextRequest) {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    database: process.env.TURSO_DATABASE_URL ? 'turso (cloud)' : 'local (sqlite)',
    env: {
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      tursoUrlPrefix: process.env.TURSO_DATABASE_URL?.substring(0, 30) + '...' || 'not set',
    },
    tests: {},
  }

  // Test 1: Basic connection
  try {
    await db.$queryRaw`SELECT 1`
    results.tests.connection = { status: 'ok' }
  } catch (e: any) {
    results.tests.connection = { status: 'error', message: e.message }
    return NextResponse.json(results, { status: 500 })
  }

  // Test 2: Check if tables exist
  try {
    const tables: any[] = await db.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    results.tests.tables = {
      status: 'ok',
      list: tables.map((t: any) => t.name),
    }
  } catch (e: any) {
    results.tests.tables = { status: 'error', message: e.message }
  }

  // Test 3: Check CourseDayExercise columns (specifically superSetId)
  try {
    const columns: any[] = await db.$queryRaw`PRAGMA table_info(CourseDayExercise)`
    results.tests.courseDayExerciseColumns = {
      status: 'ok',
      columns: columns.map((c: any) => ({ name: c.name, type: c.type })),
      hasSuperSetId: columns.some((c: any) => c.name === 'superSetId'),
    }
  } catch (e: any) {
    results.tests.courseDayExerciseColumns = { status: 'error', message: e.message }
  }

  // Test 4: Try a simple course creation and rollback
  try {
    const trainers = await db.trainer.findMany({ take: 1 })
    const trainees = await db.trainee.findMany({ take: 1 })
    const exercises = await db.exercise.findMany({ take: 1 })

    results.tests.data = {
      status: 'ok',
      trainerCount: await db.trainer.count(),
      traineeCount: await db.trainee.count(),
      exerciseCount: await db.exercise.count(),
      courseCount: await db.course.count(),
    }

    if (trainers.length > 0 && trainees.length > 0 && exercises.length > 0) {
      results.tests.createTest = {
        status: 'can_test',
        trainerId: trainers[0].id,
        traineeId: trainees[0].id,
        exerciseId: exercises[0].id,
      }
    } else {
      results.tests.createTest = {
        status: 'no_data',
        message: 'لا توجد بيانات كافية لاختبار إنشاء كورس (يحتاج مدرب، متدرب، وتمرين)',
      }
    }
  } catch (e: any) {
    results.tests.data = { status: 'error', message: e.message }
  }

  return NextResponse.json(results)
}

// POST: محاولة إنشاء كورس اختباري وحذفه فوراً
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { traineeId, trainerId, exerciseId } = body

    if (!traineeId || !trainerId || !exerciseId) {
      return NextResponse.json({ error: 'يرجى توفير traineeId, trainerId, exerciseId' }, { status: 400 })
    }

    // محاولة إنشاء كورس
    const course = await db.course.create({
      data: {
        traineeId,
        trainerId,
        numberOfDays: 1,
        days: {
          create: [{
            dayNumber: 1,
            exercises: {
              create: [{
                exerciseId,
                customSets: 3,
                customReps: 10,
                order: 0,
              }],
            },
          }],
        },
      },
      include: {
        days: { include: { exercises: true } },
      },
    })

    // حذف الكورس الاختباري
    await db.courseDayExercise.deleteMany({
      where: { courseDay: { courseId: course.id } },
    })
    await db.courseDay.deleteMany({
      where: { courseId: course.id },
    })
    await db.course.delete({ where: { id: course.id } })

    return NextResponse.json({
      status: 'ok',
      message: 'تم إنشاء وحذف كورس اختباري بنجاح - قاعدة البيانات تعمل بشكل صحيح',
      courseId: course.id,
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: 'فشل إنشاء كورس اختباري',
      error: error.message,
      code: error.code,
      meta: error.meta,
    }, { status: 500 })
  }
}
