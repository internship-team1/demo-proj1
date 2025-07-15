import { prisma } from '../../../lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'

export async function POST(req: Request) {
  const { userId, newUsername, newPassword } = await req.json()

  try {
    // 检查用户名是否已被占用
    const existingUser = await prisma.users.findFirst({
      where: {
        username: newUsername,
        NOT: { id: userId }
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: '用户名已被使用' },
        { status: 400 }
      )
    }

    // 执行更新
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        username: newUsername,
        password: newPassword ? await bcrypt.hash(newPassword, 10) : undefined
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username
      }
    })
  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json(
      { success: false, message: '数据库更新失败' },
      { status: 500 }
    )
  }
}