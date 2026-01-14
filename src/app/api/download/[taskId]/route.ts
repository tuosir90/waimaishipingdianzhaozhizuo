import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getTempDir } from '@/lib/services/downloader'

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params
    const outputPath = path.join(getTempDir(), `${taskId}_output.mp4`)

    const fileBuffer = await fs.readFile(outputPath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="shop_video.mp4"`
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: '文件不存在' },
      { status: 404 }
    )
  }
}
