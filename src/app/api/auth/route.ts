import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, password } = body

    // Find trainer by phone or name
    const trainer = await db.trainer.findFirst({
      where: {
        OR: [
          { phone: phone },
          { name: phone },
        ],
        password: password,
      },
    })

    if (!trainer) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    }

    return NextResponse.json({
      id: trainer.id,
      name: trainer.name,
      phone: trainer.phone,
      role: trainer.role,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'فشل في تسجيل الدخول' }, { status: 500 })
  }
}
