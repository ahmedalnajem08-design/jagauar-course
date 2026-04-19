import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET: فحص حالة قاعدة البيانات
export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    database: process.env.TURSO_DATABASE_URL ? 'turso (cloud)' : 'local (sqlite)',
    env: {
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
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

  // Test 2: Check tables exist
  try {
    const tables: any[] = await db.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    results.tests.tables = {
      status: 'ok',
      list: tables.map((t: any) => t.name),
    }
  } catch (e: any) {
    results.tests.tables = { status: 'error', message: e.message }
  }

  // Test 3: Check data counts
  try {
    results.tests.data = {
      trainers: await db.trainer.count(),
      trainees: await db.trainee.count(),
      exercises: await db.exercise.count(),
      courses: await db.course.count(),
    }
  } catch (e: any) {
    results.tests.data = { status: 'error', message: e.message }
  }

  // Test 4: محاولة إنشاء كورس اختباري مباشرة
  try {
    const trainer = await db.trainer.findFirst()
    const trainee = await db.trainee.findFirst()
    const exercise = await db.exercise.findFirst()

    if (trainer && trainee && exercise) {
      const course = await db.course.create({
        data: {
          traineeId: trainee.id,
          trainerId: trainer.id,
          numberOfDays: 1,
          days: {
            create: [{
              dayNumber: 1,
              exercises: {
                create: [{
                  exerciseId: exercise.id,
                  customSets: 3,
                  customReps: 10,
                  freeText: null,
                  superSetId: null,
                  order: 0,
                }],
              },
            }],
          },
        },
      })

      // حذف الكورس الاختباري
      await db.courseDayExercise.deleteMany({ where: { courseDay: { courseId: course.id } } })
      await db.courseDay.deleteMany({ where: { courseId: course.id } })
      await db.course.delete({ where: { id: course.id } })

      results.tests.createCourse = { status: 'ok', message: 'إنشاء كورس اختباري ناجح!' }
    } else {
      results.tests.createCourse = { 
        status: 'no_data', 
        message: 'لا توجد بيانات (يحتاج مدرب + متدرب + تمرين)',
        hasTrainer: !!trainer,
        hasTrainee: !!trainee,
        hasExercise: !!exercise,
      }
    }
  } catch (e: any) {
    results.tests.createCourse = { 
      status: 'error', 
      message: e.message, 
      code: e.code,
      meta: e.meta ? JSON.stringify(e.meta) : undefined,
    }
  }

  return NextResponse.json(results)
}

// POST: إصلاح الـ schema - إضافة الأعمدة الناقصة مباشرة
export async function POST() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    database: process.env.TURSO_DATABASE_URL ? 'turso (cloud)' : 'local (sqlite)',
    fixes: [],
    errors: [],
  }

  // قائمة الأعمدة اللي ممكن تكون ناقصة مع أوامر SQL مباشرة
  const alterCommands = [
    { table: 'CourseDayExercise', column: 'freeText', sql: 'ALTER TABLE CourseDayExercise ADD COLUMN freeText TEXT' },
    { table: 'CourseDayExercise', column: 'superSetId', sql: 'ALTER TABLE CourseDayExercise ADD COLUMN superSetId TEXT' },
    { table: 'CourseDayExercise', column: 'order', sql: 'ALTER TABLE "CourseDayExercise" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0' },
  ]

  for (const cmd of alterCommands) {
    try {
      await db.$executeRawUnsafe(cmd.sql)
      results.fixes.push({ table: cmd.table, column: cmd.column, status: 'added' })
    } catch (e: any) {
      if (e.message?.includes('duplicate column name') || e.message?.includes('already exists')) {
        results.fixes.push({ table: cmd.table, column: cmd.column, status: 'already_exists' })
      } else {
        results.errors.push({ table: cmd.table, column: cmd.column, error: e.message })
      }
    }
  }

  // التحقق النهائي - محاولة إنشاء كورس اختباري
  try {
    const trainer = await db.trainer.findFirst()
    const trainee = await db.trainee.findFirst()
    const exercise = await db.exercise.findFirst()

    if (trainer && trainee && exercise) {
      const course = await db.course.create({
        data: {
          traineeId: trainee.id,
          trainerId: trainer.id,
          numberOfDays: 1,
          days: {
            create: [{
              dayNumber: 1,
              exercises: {
                create: [{
                  exerciseId: exercise.id,
                  customSets: 3,
                  customReps: 10,
                  freeText: null,
                  superSetId: null,
                  order: 0,
                }],
              },
            }],
          },
        },
      })

      // حذف الكورس الاختباري
      await db.courseDayExercise.deleteMany({ where: { courseDay: { courseId: course.id } } })
      await db.courseDay.deleteMany({ where: { courseId: course.id } })
      await db.course.delete({ where: { id: course.id } })

      results.testCreate = { status: 'ok', message: 'تم إنشاء وحذف كورس اختباري بنجاح! قاعدة البيانات تعمل بشكل صحيح ✅' }
    } else {
      results.testCreate = { 
        status: 'no_data', 
        message: 'لا توجد بيانات كافية للاختبار (يحتاج مدرب + متدرب + تمرين)',
        hasTrainer: !!trainer,
        hasTrainee: !!trainee,
        hasExercise: !!exercise,
      }
    }
  } catch (e: any) {
    results.testCreate = { 
      status: 'error', 
      message: e.message, 
      code: e.code,
      meta: e.meta ? JSON.stringify(e.meta) : undefined,
    }
  }

  return NextResponse.json(results)
}
