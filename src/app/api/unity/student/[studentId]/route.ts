import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

function verifyApiKey(req: NextRequest) {
  const apiKey = req.headers.get('X-API-KEY')
  return apiKey === process.env.UNITY_API_KEY
}

export async function GET(
  req: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    if (!verifyApiKey(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const student = await prisma.user.findUnique({
      where: { id: params.studentId },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
      experimentsCompleted: student._count.sessions,
    })
  } catch (error) {
    console.error('Error fetching student:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}