import { promises as fs } from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import { VideoInfo } from './video-parser'

export async function parseXhsUrl(shareText: string): Promise<VideoInfo> {
  // 从分享文本中提取URL
  const url = extractUrl(shareText)
  if (!url) {
    throw new Error('未找到有效的小红书链接')
  }

  // 获取重定向后的真实URL
  const realUrl = await followRedirects(url)

  // 从页面提取视频信息
  const html = await fetchPage(realUrl)
  const videoInfo = extractVideoInfo(html)

  return videoInfo
}

function extractUrl(text: string): string | null {
  // 匹配 xhslink.com 短链接
  const shortMatch = text.match(/https?:\/\/xhslink\.com\/[a-zA-Z0-9]+/)
  if (shortMatch) {
    console.log('提取到短链接:', shortMatch[0])
    return shortMatch[0]
  }

  // 匹配 xiaohongshu.com 完整链接
  const fullMatch = text.match(/https?:\/\/www\.xiaohongshu\.com\/[^\s]+/)
  if (fullMatch) {
    console.log('提取到完整链接:', fullMatch[0])
    return fullMatch[0]
  }

  // 匹配 xiaohongshu.com 不带www
  const noWwwMatch = text.match(/https?:\/\/xiaohongshu\.com\/[^\s]+/)
  if (noWwwMatch) {
    console.log('提取到链接:', noWwwMatch[0])
    return noWwwMatch[0]
  }

  return null
}

async function followRedirects(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http

    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location
        if (location) {
          resolve(followRedirects(location))
        } else {
          reject(new Error('重定向无location'))
        }
      } else {
        resolve(url)
      }
    })

    req.on('error', reject)
    req.end()
  })
}

async function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http

    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    })

    req.on('error', reject)
    req.end()
  })
}

function extractVideoInfo(html: string): VideoInfo {
  console.log('HTML长度:', html.length)

  // 搜索可能的视频字段
  const videoPatterns = [
    /"originVideoKey":"([^"]+)"/,
    /"videoKey":"([^"]+)"/,
    /"video":\s*\{[^}]*"url":"([^"]+)"/,
    /https:\/\/sns-video[^"'\s]+\.mp4/,
    /https:\/\/[^"'\s]*xhscdn[^"'\s]*\.mp4/,
  ]

  let videoUrl = ''
  for (const pattern of videoPatterns) {
    const match = html.match(pattern)
    if (match) {
      console.log('匹配到视频:', pattern.toString(), match[1] || match[0])
      videoUrl = match[1] || match[0]
      if (!videoUrl.startsWith('http')) {
        videoUrl = `https://sns-video-bd.xhscdn.com/${videoUrl}`
      }
      break
    }
  }

  if (!videoUrl) {
    // 打印HTML中包含video的部分
    const videoIndex = html.indexOf('video')
    if (videoIndex > -1) {
      console.log('video关键字附近:', html.substring(videoIndex, videoIndex + 200))
    }
  }

  // 提取标题
  const titleMatch = html.match(/<title>([^<]+)<\/title>/)
  const title = titleMatch ? titleMatch[1] : '小红书视频'

  // 提取作者
  const authorMatch = html.match(/"nickname":"([^"]+)"/)
  const author = authorMatch ? authorMatch[1] : '未知作者'

  return { videoUrl, title, author }
}
