import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 类型定义
type EnrollmentData = {
  courseCode: string
  userId: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: '需要用户ID参数' },
        { status: 400 }
      )
    }

    // 查询用户已加入的课程
    const enrollments = await prisma.courseMember.findMany({
      where: { 
        userId: parseInt(userId) 
      },
      include: {
        course: {
          include: {
            organizer: {
              select: { username: true }
            }
          }
        }
      }
    })

    return NextResponse.json({
      courses: enrollments.map(e => ({
        id: e.course.id,
        title: e.course.title,
        courseCode: e.course.courseCode,
        organizer: e.course.organizer.username,
        joinedAt: e.joinedAt
      }))
    })

  } catch (error) {
    console.error('[GET_ENROLLMENTS_ERROR]', error)
    return NextResponse.json(
      { error: '获取课程失败' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: Request) {
  try {
    const { courseCode, userId } = await request.json() as EnrollmentData

    // 验证输入
    if (!courseCode || !userId) {
      return NextResponse.json(
        { error: '缺少课程码或用户ID' },
        { status: 400 }
      )
    }

    // 查找课程
    const course = await prisma.course.findUnique({
      where: { courseCode },
      select: { id: true }
    })

    if (!course) {
      return NextResponse.json(
        { error: '课程不存在' },
        { status: 404 }
      )
    }

    // 创建关联记录
    const enrollment = await prisma.courseMember.create({
      data: {
        courseId: course.id,
        userId: userId,
        joinedAt: new Date()
      },
      include: {
        course: {
          include: {
            organizer: {
              select: { username: true }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        courseCode: enrollment.course.courseCode,
        organizer: enrollment.course.organizer.username
      }
    })

  } catch (error: any) {
    console.error('[ENROLL_ERROR]', error)
    
    // 处理重复选课错误
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '您已经加入过该课程' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: '选课失败' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

//删除功能
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const courseId = searchParams.get('courseId');

    if (!userId || !courseId) {
      return NextResponse.json(
        { error: '需要用户ID和课程ID' },
        { status: 400 }
      );
    }

    await prisma.courseMember.deleteMany({
      where: {
        userId: parseInt(userId),
        courseId: parseInt(courseId)
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[LEAVE_COURSE_ERROR]', error);
    return NextResponse.json(
      { error: '退出课程失败' },
      { status: 500 }
    );
  }
}
