import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const speakerId = req.nextUrl.searchParams.get("speakerId");
  
  try {
    const courses = await prisma.course.findMany({
      where: { speakerId: Number(speakerId) },
      select: {
        id: true,
        title: true,
        courseCode: true,
        organizer: { select: { username: true } },
        speaker: { select: { username: true } },
        _count: { select: { members: true } }
      }
    });

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
    return NextResponse.json(
      { error: "获取课程失败" },
      { status: 500 }
    );
  }
}