import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET: فحص حالة قاعدة البيانات والتشخيص
export async function GET(request: NextRequest) {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    database: process.env.TURSO_DATABASE_URL ? 'turso (cloud)' : 'local (sqlite)',
    env: {
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    },
    tests: {},
    fixes: [],
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

  // Test 3: Check all table columns
  const requiredTables = ['CourseDayExercise', 'CourseDay', 'Course', 'Exercise', 'ExerciseGroup', 'Trainee', 'Trainer']
  for (const tableName of requiredTables) {
    try {
      const columns: any[] = await db.$queryRaw`PRAGMA table_info(${tableName})`
      results.tests[`${tableName}_columns`] = {
        status: 'ok',
        columns: columns.map((c: any) => ({ name: c.name, type: c.type, notnull: c.notnull })),
      }
    } catch (e: any) {
      results.tests[`${tableName}_columns`] = { status: 'error', message: e.message }
    }
  }

  return NextResponse.json(results)
}

// POST: إصلاح الـ schema تلقائياً - إضافة الأعمدة الناقصة
export async function POST(request: NextRequest) {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    database: process.env.TURSO_DATABASE_URL ? 'turso (cloud)' : 'local (sqlite)',
    fixes: [],
    errors: [],
  }

  // قائمة الأعمدة المطلوبة لكل جدول
  const requiredColumns: Record<string, { name: string; type: string; sql: string }[]> = {
    CourseDayExercise: [
      { name: 'freeText', type: 'TEXT', sql: 'ALTER TABLE CourseDayExercise ADD COLUMN freeText TEXT' },
      { name: 'superSetId', type: 'TEXT', sql: 'ALTER TABLE CourseDayExercise ADD COLUMN superSetId TEXT' },
      { name: 'order', type: 'INTEGER', sql: 'ALTER TABLE CourseDayExercise ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0' },
    ],
    CourseDay: [],
    Course: [],
    Exercise: [],
    ExerciseGroup: [],
    Trainee: [],
    Trainer: [],
  }

  for (const [tableName, columns] of Object.entries(requiredColumns)) {
    if (columns.length === 0) continue

    try {
      // الحصول على الأعمدة الموجودة
      const existingColumns: any[] = await db.$queryRaw`PRAGMA table_info(${tableName})`
      const existingNames = new Set(existingColumns.map((c: any) => c.name))

      for (const col of columns) {
        if (!existingNames.has(col.name)) {
          try {
            await db.$executeRawUnsafe(col.sql)
            results.fixes.push({ table: tableName, column: col.name, status: 'added' })
          } catch (e: any) {
            // إذا العمود موجود فعلاً، لا تعتبره خطأ
            if (e.message?.includes('duplicate column name')) {
              results.fixes.push({ table: tableName, column: col.name, status: 'already_exists' })
            } else {
              results.errors.push({ table: tableName, column: col.name, error: e.message })
            }
          }
        } else {
          results.fixes.push({ table: tableName, column: col.name, status: 'already_exists' })
        }
      }
    } catch (e: any) {
      results.errors.push({ table: tableName, error: e.message })
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

      results.testCreate = { status: 'ok', message: 'تم إنشاء وحذف كورس اختباري بنجاح!' }
    } else {
      results.testCreate = { status: 'skipped', message: 'لا توجد بيانات كافية للاختبار (يحتاج مدرب + متدرب + تمرين)' }
    }
  } catch (e: any) {
    results.testCreate = { status: 'error', message: e.message, code: e.code, meta: e.meta }
  }

  return NextResponse.json(results)
}
