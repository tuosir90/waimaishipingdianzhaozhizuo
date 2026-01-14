import { NextRequest } from 'next/server'
import https from 'https'
import http from 'http'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

// Vercel 等 Serverless 环境只有 /tmp 可写
const TEMP_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'tmp')

// 缓存映射：URL hash -> 文件路径
const videoCache = new Map<string, { filePath: string; downloading: Promise<void> | null }>()

// 根据URL生成唯一的文件名
function getFileHash(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex')
}

// 确保临时目录存在
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true })
  } catch (e) {
    // 目录已存在
  }
}

// 检查文件是否存在
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

// 获取或下载视频文件（带缓存）
async function getOrDownloadVideo(videoUrl: string): Promise<string> {
  const hash = getFileHash(videoUrl)
  const filePath = path.join(TEMP_DIR, `video_${hash}.mp4`)

  // 检查内存缓存
  const cached = videoCache.get(hash)
  if (cached) {
    // 如果正在下载，等待下载完成
    if (cached.downloading) {
      await cached.downloading
    }
    // 验证文件确实存在
    if (await fileExists(cached.filePath)) {
      console.log('使用缓存文件:', cached.filePath)
      return cached.filePath
    }
  }

  // 检查磁盘缓存
  if (await fileExists(filePath)) {
    console.log('使用磁盘缓存:', filePath)
    videoCache.set(hash, { filePath, downloading: null })
    return filePath
  }

  // 需要下载
  console.log('开始下载视频到:', filePath)
  const downloadPromise = downloadToFile(videoUrl, filePath)
  videoCache.set(hash, { filePath, downloading: downloadPromise })

  try {
    await downloadPromise
    videoCache.set(hash, { filePath, downloading: null })
    console.log('视频下载完成:', filePath)
    return filePath
  } catch (error) {
    videoCache.delete(hash)
    throw error
  }
}

export async function GET(request: NextRequest) {
  const videoUrl = request.nextUrl.searchParams.get('url')

  if (!videoUrl) {
    return new Response(JSON.stringify({ error: '缺少视频URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    await ensureTempDir()

    // 获取缓存的视频文件（或下载新的）
    const filePath = await getOrDownloadVideo(videoUrl)

    // 读取文件信息
    const stat = await fs.stat(filePath)
    const fileSize = stat.size

    // 处理 Range 请求
    const range = request.headers.get('range')

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      const fileHandle = await fs.open(filePath, 'r')
      const buffer = Buffer.alloc(chunkSize)
      await fileHandle.read(buffer, 0, chunkSize, start)
      await fileHandle.close()

      return new Response(buffer, {
        status: 206,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': chunkSize.toString(),
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    // 非 Range 请求，返回整个文件
    const fileBuffer = await fs.readFile(filePath)

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    })

  } catch (error) {
    console.error('视频代理失败:', error)
    return new Response(JSON.stringify({ error: '视频获取失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

function downloadToFile(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http

    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://www.douyin.com/',
      },
    }, (res) => {
      // 处理重定向
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location
        if (location) {
          downloadToFile(location, filePath).then(resolve).catch(reject)
          return
        }
      }

      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks)
          await fs.writeFile(filePath, buffer)
          resolve()
        } catch (err) {
          reject(err)
        }
      })
      res.on('error', reject)
    })

    req.on('error', reject)
    req.end()
  })
}
