// app/api/comments/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')

  if (!courseId) {
    return NextResponse.json(
      { error: '缺少 courseId 参数' },
      { status: 400 }
    )
  }

  try {
    const comments = await prisma.comment.findMany({
      where: { 
        courseId: Number(courseId),
        // 排除系统通知记录
        NOT: {
          content: {
            startsWith: "QUIZ_NOTIFY_",
          },
        },
        AND: {
          NOT: {
            content: {
              startsWith: "STAT_NOTIFY_",
            },
          },
        }
      },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(comments)
  } catch (error) {
    return NextResponse.json(
      { error: '获取留言失败' },
      { status: 500 }
    )
  }
}
// app/api/comments/route.ts (续)
export async function POST(request: Request) {
  const { content, courseId, userId } = await request.json()

  if (!content || !courseId || !userId) {
    return NextResponse.json(
      { error: '缺少必要字段' },
      { status: 400 }
    )
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        content,
        courseId: Number(courseId),
        userId: Number(userId)
      },
      include: { user: true }
    })
    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: '留言提交失败' },
      { status: 500 }
    )
  }
}