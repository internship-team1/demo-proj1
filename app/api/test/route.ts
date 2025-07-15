import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ message: "测试成功" })
}