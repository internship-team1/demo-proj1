import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const data = await prisma.course.findMany({
      select: {
        id: true,
        organizer: { select: { username: true } },
        speaker: { select: { username: true } },
        _count: { select: { members: true } }
      }
    });

   const result = data.reduce((acc, course) => {
  acc[String(course.id)] = { // 显式转为字符串
    organizer: course.organizer.username,
    speaker: course.speaker?.username || null,
    members: course._count.members
  };
  return acc;
}, {} as Record<string, { organizer: string; speaker: string | null; members: number }>);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: '获取课程额外信息失败' },
      { status: 500 }
    );
  }
}