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
export async function GET() {
  const courses = await prisma.course.findMany({
    include: { organizer: true },
  });
  return NextResponse.json(courses);
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