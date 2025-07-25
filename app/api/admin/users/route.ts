import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

// 获取所有用户
export async function GET() {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('获取用户失败:', error);
    return NextResponse.json(
      { error: '获取用户失败' },
      { status: 500 }
    );
  }
}

// 删除用户
export async function DELETE(request: Request) {
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json(
      { error: '用户ID不能为空' },
      { status: 400 }
    );
  }

  try {
    // 检查用户是否存在
    const user = await prisma.users.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 防止删除管理员账号
    if (user.role === 'admin') {
      return NextResponse.json(
        { error: '不能删除管理员账号' },
        { status: 403 }
      );
    }

    // 检查用户是否有关联数据（外键约束）
    const hasConstraints = await Promise.all([
      prisma.course.findFirst({ where: { organizerId: parseInt(userId) } }),
      prisma.file.findFirst({ where: { uploaderId: parseInt(userId) } }),
      prisma.answer.findFirst({ where: { userId: parseInt(userId) } }),
      prisma.comment.findFirst({ where: { userId: parseInt(userId) } })
    ]);

    const [organizedCourses, uploadedFiles, userAnswers, userComments] = hasConstraints;

    if (organizedCourses || uploadedFiles || userAnswers || userComments) {
      let errorDetails = [];
      if (organizedCourses) errorDetails.push('已组织的课程');
      if (uploadedFiles) errorDetails.push('上传的文件');
      if (userAnswers) errorDetails.push('测验答题记录');
      if (userComments) errorDetails.push('评论留言');

      return NextResponse.json(
        { 
          error: `该用户有关联数据，无法删除。存在：${errorDetails.join('、')}。请先清理相关数据或联系技术支持处理。` 
        },
        { status: 400 }
      );
    }

    // 删除用户
    await prisma.users.delete({
      where: { id: parseInt(userId) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json(
      { error: '删除用户失败' },
      { status: 500 }
    );
  }
} 