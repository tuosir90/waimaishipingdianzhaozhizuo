import { NextRequest, NextResponse } from 'next/server'
import { parseXhsUrl } from '@/lib/services/xhs-parser'
import { parseDouyinUrl } from '@/lib/services/douyin-parser'
import { detectPlatform, VideoInfo } from '@/lib/services/video-parser'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: '请提供视频链接' },
        { status: 400 }
      )
    }

    // 检测平台
    const platform = detectPlatform(url)

    if (!platform) {
      return NextResponse.json(
        { error: '请提供有效的小红书或抖音链接' },
        { status: 400 }
      )
    }

    // 根据平台调用对应解析器
    let videoInfo: VideoInfo
    if (platform === 'xiaohongshu') {
      videoInfo = await parseXhsUrl(url)
      videoInfo.platform = 'xiaohongshu'
    } else {
      videoInfo = await parseDouyinUrl(url)
    }

    console.log('解析结果:', JSON.stringify(videoInfo, null, 2))

    if (!videoInfo.videoUrl) {
      return NextResponse.json(
        { error: '未找到视频，请确认链接包含视频' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: videoInfo
    })

  } catch (error) {
    console.error('解析失败:', error)
    return NextResponse.json(
      { error: '解析失败，请稍后重试' },
      { status: 500 }
    )
  }
}
