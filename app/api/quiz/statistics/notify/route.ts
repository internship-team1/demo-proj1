import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = Number(req.nextUrl.searchParams.get("userId"));
  if (!userId) return NextResponse.json({ hasNewStatistics: false });

  // 获取用户
  const user = await prisma.users.findUnique({ where: { id: userId } });
  if (!user || (user.role !== "organizer" && user.role !== "speaker")) {
    return NextResponse.json({ hasNewStatistics: false });
  }

  // 获取相关课程
  let courses;
  if (user.role === "organizer") {
    courses = await prisma.course.findMany({ where: { organizerId: userId } });
  } else {
    courses = await prisma.course.findMany({ where: { speakerId: userId } });
  }

  if (!courses || courses.length === 0) {
    return NextResponse.json({ hasNewStatistics: false });
  }

  // 当前时间
  const now = new Date();

  // 存储需要通知的课程和问卷信息
  const pendingNotifications = [];
  
  // 对每个课程，找出最近结束的问卷
  for (const course of courses) {
    // 查找该课程下最近结束且处于活跃状态的问卷
    const latestQuiz = await prisma.quiz.findFirst({
    where: {
        courseId: course.id,
        endTime: { lte: now }, // 结束时间已过
        isActive: true
    },
      orderBy: { endTime: "desc" }
  });

    if (latestQuiz) {
      // 查找是否已经通知过这个问卷
      const notificationKey = `STAT_NOTIFY_${latestQuiz.id}_${userId}`;
      const existingNotification = await prisma.comment.findFirst({
        where: {
          content: notificationKey,
          userId
        }
      });
      
      // 如果没有通知过，则添加到待通知列表
      if (!existingNotification) {
        pendingNotifications.push({
          courseId: course.id,
          courseTitle: course.title,
          quizId: latestQuiz.id,
          quizTitle: latestQuiz.title,
          notificationKey
        });
      }
    }
  }
  
  // 如果有需要通知的问卷
  if (pendingNotifications.length > 0) {
    // 为每个通知在数据库中创建标记（使用Comment表作为临时存储）
    for (const notification of pendingNotifications) {
      await prisma.comment.create({
        data: {
          content: notification.notificationKey,
          userId,
          courseId: notification.courseId,
          quizId: notification.quizId,
          createdAt: now
        }
      });
    }
    
    return NextResponse.json({
      hasNewStatistics: true,
      notifications: pendingNotifications
    });
  }

  return NextResponse.json({ hasNewStatistics: false });
}
