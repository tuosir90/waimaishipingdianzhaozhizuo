import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { downloadVideo } from '@/lib/services/downloader'
import { processVideo } from '@/lib/services/processor'
import { Platform } from '@/lib/services/video-parser'

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, crop, platform = 'xiaohongshu' } = await request.json() as {
      videoUrl: string
      crop?: any
      platform?: Platform
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: '请提供视频URL' },
        { status: 400 }
      )
    }

    const taskId = uuidv4()
    const inputFilename = `${taskId}_input.mp4`
    const outputFilename = `${taskId}_output.mp4`

    // 下载视频
    const inputPath = await downloadVideo(videoUrl, inputFilename, platform)

    // 处理视频
    const outputPath = await processVideo({
      inputPath,
      outputFilename,
      crop
    })

    return NextResponse.json({
      success: true,
      taskId,
      downloadPath: `/api/download/${taskId}`
    })

  } catch (error) {
    console.error('处理失败:', error)
    return NextResponse.json(
      { error: '视频处理失败' },
      { status: 500 }
    )
  }
}
