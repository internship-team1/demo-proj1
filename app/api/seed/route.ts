import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

export async function GET() {
  try {
    // 检查是否已存在管理员用户
    const existingAdmin = await prisma.users.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      return NextResponse.json({
        success: true,
        message: '管理员用户已存在',
        admin: {
          id: existingAdmin.id,
          username: existingAdmin.username,
          role: existingAdmin.role
        }
      });
    }

    // 创建管理员用户
    const admin = await prisma.users.create({
      data: {
        username: 'gly',
        password: '123', // 生产环境应使用加密密码
        role: 'admin'
      }
    });

    return NextResponse.json({
      success: true,
      message: '管理员用户创建成功',
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Database seeding error:', error);
    return NextResponse.json(
      { success: false, message: '数据库初始化失败', error: String(error) },
      { status: 500 }
    );
  }
} 