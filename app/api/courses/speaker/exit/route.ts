import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { courseId, speakerId } = await request.json()

    // 验证输入
    if (!courseId || !speakerId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 查询课程确认存在且确实是该演讲者
    const course = await prisma.course.findUnique({
      where: { id: Number(courseId) },
      select: { id: true, speakerId: true }
    })

    if (!course) {
      return NextResponse.json(
        { error: '课程不存在' },
        { status: 404 }
      )
    }

    if (course.speakerId !== Number(speakerId)) {
      return NextResponse.json(
        { error: '您不是此课程的演讲者' },
        { status: 403 }
      )
    }

    // 使用事务确保数据一致性
    await prisma.$transaction([
      // 1. 更新课程，移除演讲者
      prisma.course.update({
        where: { id: Number(courseId) },
        data: { speakerId: null }
      }),
      
      // 2. 从课程成员中移除该用户
      prisma.courseMember.delete({
        where: {
          courseId_userId: {
            courseId: Number(courseId),
            userId: Number(speakerId)
          }
        }
      })
    ])

    return NextResponse.json({ success: true, message: '已成功退出课程' })
  } catch (error) {
    console.error('[SPEAKER_EXIT_ERROR]', error)
    return NextResponse.json(
      { error: '退出课程失败' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 