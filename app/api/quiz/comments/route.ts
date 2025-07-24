import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get("quizId");
    
    if (!quizId) {
      return NextResponse.json({ error: "缺少问卷ID" }, { status: 400 });
    }
    
    // 获取问卷评论，但排除系统通知记录
    const comments = await prisma.comment.findMany({
      where: {
        quizId: parseInt(quizId),
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
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });
    
    return NextResponse.json(comments);
    
  } catch (error) {
    console.error("获取评论失败:", error);
    return NextResponse.json({ error: "获取评论失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quizId, userId, content } = body;
    
    if (!quizId || !userId || !content) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }
    
    // 创建新评论
    const comment = await prisma.comment.create({
      data: {
        quizId: parseInt(quizId.toString()),
        userId: parseInt(userId.toString()),
        content,
      },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });
    
    return NextResponse.json(comment);
    
  } catch (error) {
    console.error("发布评论失败:", error);
    return NextResponse.json({ error: "发布评论失败" }, { status: 500 });
  }
} 