import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const courseIds = searchParams.get('courseIds')?.split(',').map(Number) || []
  const userId = searchParams.get('userId')

  // 基础验证
  if (!userId || courseIds.length === 0) {
    return NextResponse.json(
      { error: '缺少课程ID或用户ID' },
      { status: 400 }
    )
  }

  try {
    // 验证用户确实加入了这些课程（防止伪造请求）
    const validMemberships = await prisma.courseMember.findMany({
      where: {
        userId: Number(userId),
        courseId: { in: courseIds }
      },
      select: { courseId: true }
    })

    const validCourseIds = validMemberships.map((m: { courseId: any }) => m.courseId)
    if (validCourseIds.length === 0) {
      return NextResponse.json([]) // 用户没有加入任何传入的课程
    }

    // 获取最近24小时内创建的活跃问卷
    const quizzes = await prisma.quiz.findMany({
  where: {
    courseId: { in: validCourseIds },
    isActive: true,
    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  },
  select: {
    id: true,
    title: true,
    courseId: true,
    createdAt: true, // 显式包含该字段
    course: { select: { title: true } },
  },
});


    return NextResponse.json(quizzes)
  } catch (error) {
    console.error('[GET /api/quiz/recent] 错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}