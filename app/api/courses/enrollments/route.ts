import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    // 获取所有课程注册信息
    const enrollments = await prisma.courseMember.findMany({
      include: {
        course: true,
        user: {
          select: {
            id: true,
            username: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json({ enrollments })
  } catch (error) {
    console.error('[GET_ENROLLMENTS_ERROR]', error)
    return NextResponse.json(
      { error: '获取注册信息失败' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
