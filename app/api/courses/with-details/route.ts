import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const speakerId = req.nextUrl.searchParams.get("speakerId");
  
  try {
    // 确保speakerId是有效的数字
    const speakerIdNum = speakerId ? Number(speakerId) : undefined;
    
    if (!speakerIdNum || isNaN(speakerIdNum)) {
      return NextResponse.json(
        { error: "请提供有效的演讲者ID" },
        { status: 400 }
      );
    }
    
    // 使用正确的查询条件查找演讲者关联的课程
    const courses = await prisma.course.findMany({
      where: { 
        speakerId: speakerIdNum 
      },
      select: {
        id: true,
        title: true,
        courseCode: true,
        organizer: { select: { username: true } },
        speaker: { select: { username: true } },
        _count: { select: { members: true } }
      }
    });

    // 调试日志，帮助排查问题
    console.log(`演讲者ID ${speakerIdNum} 找到了 ${courses.length} 个课程`);

    return NextResponse.json(
      courses.map(c => ({
        id: c.id,
        title: c.title,
        courseCode: c.courseCode,
        organizer: c.organizer.username,
        speakerName: c.speaker?.username,
        memberCount: c._count.members
      }))
    );
  } catch (error) {
    console.error("获取演讲者课程时出错:", error);
    return NextResponse.json(
      { error: "获取课程失败" },
      { status: 500 }
    );
  }
}