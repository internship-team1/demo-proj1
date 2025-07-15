import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { userId, newUsername, currentPassword, newPassword } = await req.json()

    // 获取当前用户信息
    const user = await prisma.users.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    // 如果需要更新密码
if (newPassword) {
  // 明文验证当前密码
  if (user.password !== currentPassword) {
    return NextResponse.json(
      { success: false, message: '当前密码不正确' },
      { status: 401 }
    );
  }

  // 直接存储明文密码
  const updatedUser = await prisma.users.update({
    where: { id: userId },
    data: { password: newPassword }, // 存明文
    select: { id: true, username: true }
  });

  return NextResponse.json({
    success: true,
    message: '密码更新成功',
    user: updatedUser
  });
}
    // 如果需要更新用户名
    if (newUsername) {
      // 检查用户名是否已存在
      const existingUser = await prisma.users.findFirst({
        where: { username: newUsername, NOT: { id: userId } }
      })

      if (existingUser) {
        return NextResponse.json(
          { success: false, message: '用户名已被使用' },
          { status: 400 }
        )
      }

      // 更新用户名
      const updatedUser = await prisma.users.update({
        where: { id: userId },
        data: { username: newUsername },
        select: { id: true, username: true }
      })

      return NextResponse.json({
        success: true,
        message: '用户名更新成功',
        user: updatedUser
      })
    }

    return NextResponse.json(
      { success: false, message: '没有提供更新内容' },
      { status: 400 }
    )
  } catch (error) {
    console.error('更新失败:', error)
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    )
  }
}