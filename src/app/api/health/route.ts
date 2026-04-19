import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    database: 'unknown',
    checks: {},
  }

  try {
    // Check database connection
    const trainerCount = await db.trainer.count()
    results.checks.trainers = { status: 'ok', count: trainerCount }

    const traineeCount = await db.trainee.count()
    results.checks.trainees = { status: 'ok', count: traineeCount }

    const exerciseCount = await db.exercise.count()
    results.checks.exercises = { status: 'ok', count: exerciseCount }

    const courseCount = await db.course.count()
    results.checks.courses = { status: 'ok', count: courseCount }

    // Check if CourseDayExercise has superSetId column by trying a query
    try {
      const exWithSuperSet = await db.courseDayExercise.findFirst({
        where: { superSetId: { not: null } },
      })
      results.checks.superSetId_column = { status: 'ok', hasData: !!exWithSuperSet }
    } catch (e: any) {
      results.checks.superSetId_column = {
        status: 'error',
        message: e.message,
        hint: 'عمود superSetId غير موجود - يحتاج prisma db push'
      }
    }

    // Check Turso vs Local
    results.database = process.env.TURSO_DATABASE_URL ? 'turso (cloud)' : 'local (sqlite)'
    results.environment = {
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    }

    return NextResponse.json(results)
  } catch (error: any) {
    results.checks.connection = {
      status: 'error',
      message: error.message,
      code: error.code,
    }
    return NextResponse.json(results, { status: 500 })
  }
}
