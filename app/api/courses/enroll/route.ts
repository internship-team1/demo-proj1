import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    // 1. 获取请求体中的课程码
    const { courseCode } = await request.json()
    
    if (!courseCode) {
      return NextResponse.json(
        { error: '课程码不能为空' },
        { status: 400 }
      )
    }

    // 2. 查询课程是否存在
    const course = await prisma.course.findUnique({
      where: { courseCode },
      select: {
        id: true,
        title: true,
        courseCode: true,
        organizer: {
          select: {
            username: true
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json(
        { error: '未找到该课程，请检查课程码是否正确' },
        { status: 404 }
      )
    }

    // 3. 返回课程信息（实际项目中这里应该创建关联关系）
    return NextResponse.json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        courseCode: course.courseCode,
        organizer: course.organizer.username
      }
    })

  } catch (error) {
    console.error('加入课程失败:', error)
    return NextResponse.json(
      { error: '服务器错误，请稍后再试' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}