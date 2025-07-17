import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// 获取测验留言
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get("quizId");
    
    if (!quizId) {
      return NextResponse.json(
        { error: "缺少测验ID" },
        { status: 400 }
      );
    }

    const comments = await prisma.comment.findMany({
      where: {
        quizId: parseInt(quizId),
      },
      include: {
        user: {
          select: {
            username: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(comments);
    
  } catch (error: any) {
    console.error("获取测验留言失败:", error);
    return NextResponse.json(
      { error: "获取测验留言失败", details: error.message },
      { status: 500 }
    );
  }
}

// 添加测验留言
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quizId, userId, content } = body;
    
    if (!quizId || !userId || !content) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 检查测验是否存在
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "测验不存在" },
        { status: 404 }
      );
    }

    // 检查用户是否存在
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    // 创建留言
    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        quizId
      },
      include: {
        user: {
          select: {
            username: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      comment
    });
    
  } catch (error: any) {
    console.error("添加测验留言失败:", error);
    return NextResponse.json(
      { error: "添加测验留言失败", details: error.message },
      { status: 500 }
    );
  }
} 