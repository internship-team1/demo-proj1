import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

// 获取所有课程（带上组织者和演讲者信息）
export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        courseCode: true,
        createdAt: true,
        organizer: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        speaker: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        members: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });
    
    return NextResponse.json(courses);
  } catch (error) {
    console.error('获取课程失败:', error);
    return NextResponse.json(
      { error: '获取课程失败' },
      { status: 500 }
    );
  }
}

// 删除课程
export async function DELETE(request: Request) {
  const { courseId } = await request.json();

  if (!courseId) {
    return NextResponse.json(
      { error: '课程ID不能为空' },
      { status: 400 }
    );
  }

  try {
    // 检查课程是否存在
    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) }
    });

    if (!course) {
      return NextResponse.json(
        { error: '课程不存在' },
        { status: 404 }
      );
    }

    // 删除课程（相关记录会通过级联删除自动处理）
    await prisma.course.delete({
      where: { id: parseInt(courseId) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除课程失败:', error);
    return NextResponse.json(
      { error: '删除课程失败' },
      { status: 500 }
    );
  }
} 