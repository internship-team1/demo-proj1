import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseIds = searchParams.get('courseIds')?.split(',').map(Number) || [];
  const userId = searchParams.get('userId');

  try {
    // 简化查询 - 先只获取基础数据
    const quizzes = await prisma.quiz.findMany({
      where: {
        courseId: { in: courseIds },
        isActive: true,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        courseId: true,
        createdAt: true
      }
    });

    return NextResponse.json(quizzes || []); // 确保返回数组
  } catch (error) {
    console.error('API错误详情:', error);
    return NextResponse.json([], { status: 500 });
  }
}