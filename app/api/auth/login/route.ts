import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: '用户名和密码是必填的' },
        { status: 400 }
      );
    }

    // 使用Prisma查找用户
    const user = await prisma.users.findUnique({
      where: { username }
    });

    // 验证密码 (生产环境应使用加密比较)
    if (user && user.password === password) {
      // 不要在响应中包含密码
      const { password, ...userWithoutPassword } = user;
      
      return NextResponse.json({
        success: true,
        message: '登录成功',
        user: userWithoutPassword
      });
    } else {
      return NextResponse.json(
        { success: false, message: '用户名或密码错误' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
} 