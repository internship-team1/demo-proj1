import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// 创建课程
export async function POST(req: NextRequest) {
  const { title, description, organizerId, courseCode } = await req.json();
  if (!title || !organizerId || !courseCode) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }
  try {
    const course = await prisma.course.create({
      data: {
        title,
        description,
        organizerId,
        courseCode,
      },
    });
    return NextResponse.json(course);
  } catch (e) {
    return NextResponse.json({ error: "创建失败，可能课程码重复" }, { status: 500 });
  }
}

// 获取所有课程
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const speakerId = searchParams.get("speakerId");
  
  if (id) {
    // 查询单个课程
    const course = await prisma.course.findUnique({ where: { id: Number(id) } });
    if (course) {
      return NextResponse.json(course);
    } else {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }
  
  if (speakerId) {
    // 查询指定演讲者的所有课程
    const speakerCourses = await prisma.course.findMany({
      where: { speakerId: Number(speakerId) },
      include: {
        organizer: {
          select: {
            username: true
          }
        }
      }
    });
    
    // 格式化返回数据，添加organizer字段
    const formattedCourses = speakerCourses.map(course => ({
      id: course.id,
      title: course.title,
      courseCode: course.courseCode,
      organizer: course.organizer.username,
      description: course.description
    }));
    
    return NextResponse.json(formattedCourses);
  }
  
  // 查询所有课程
  const allCourses = await prisma.course.findMany();
  return NextResponse.json(allCourses);
}

// 删除课程
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "缺少课程id" }, { status: 400 });
  }
  try {
    await prisma.course.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "删除失败，课程可能不存在" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { id, title, speakerId } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "缺少课程id" }, { status: 400 });
  }
  try {
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (speakerId !== undefined) data.speakerId = speakerId;
    const updated = await prisma.course.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}