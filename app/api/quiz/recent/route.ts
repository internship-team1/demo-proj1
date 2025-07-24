import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseIds = searchParams.get('courseIds')?.split(',').map(Number) || [];
  const userId = Number(searchParams.get('userId')) || 0;

  if (!userId || courseIds.length === 0) {
    return NextResponse.json({ hasNewQuizzes: false });
  }

  try {
    // 查找用户加入的所有课程的最新问卷
    const pendingQuizzes = [];
    
    for (const courseId of courseIds) {
      // 查询该课程最新创建的活跃问卷
      const latestQuiz = await prisma.quiz.findFirst({
        where: {
          courseId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' },
        include: {
          course: {
            select: {
              title: true
            }
          }
        }
      });
      
      if (latestQuiz) {
        // 查找是否已经通知过这个问卷
        const notificationKey = `QUIZ_NOTIFY_${latestQuiz.id}_${userId}`;
        const existingNotification = await prisma.comment.findFirst({
          where: {
            content: notificationKey,
            userId
          }
        });
        
        // 如果没有通知过，则添加到待通知列表
        if (!existingNotification) {
          pendingQuizzes.push({
            quizId: latestQuiz.id,
            quizTitle: latestQuiz.title,
            courseId: latestQuiz.courseId,
            courseTitle: latestQuiz.course.title,
            notificationKey
          });
          
          // 创建通知记录
          await prisma.comment.create({
            data: {
              content: notificationKey,
              userId,
              courseId: latestQuiz.courseId,
              quizId: latestQuiz.id,
              createdAt: new Date()
            }
          });
        }
      }
    }
    
    if (pendingQuizzes.length > 0) {
      return NextResponse.json({ 
        hasNewQuizzes: true,
        quizzes: pendingQuizzes
      });
    }

    return NextResponse.json({ hasNewQuizzes: false });
  } catch (error) {
    console.error('API错误详情:', error);
    return NextResponse.json({ hasNewQuizzes: false, error: String(error) }, { status: 500 });
  }
}