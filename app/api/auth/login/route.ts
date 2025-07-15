import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: '用户名和密码是必填的' },
        { status: 400 }
      );
    }

    const user = await prisma.users.findFirst({
      where: { username }
    });

    // 直接比较明文密码
    if (user && user.password === password) {
      const { password, ...userWithoutPassword } = user;
      return NextResponse.json({
        success: true,
        user: userWithoutPassword
      });
    }

    return NextResponse.json(
      { success: false, message: '用户名或密码错误' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}