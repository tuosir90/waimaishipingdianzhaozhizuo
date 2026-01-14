import https from 'https'
import http from 'http'
import { createWriteStream } from 'fs'
import { promises as fs } from 'fs'
import path from 'path'
import { Platform } from './video-parser'

// Vercel 等 Serverless 环境只有 /tmp 可写
const TEMP_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'tmp')

export async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true })
  } catch (e) {
    // 目录已存在
  }
}

export async function downloadVideo(
  videoUrl: string,
  filename: string,
  platform: Platform = 'xiaohongshu'
): Promise<string> {
  await ensureTempDir()

  const filePath = path.join(TEMP_DIR, filename)
  const protocol = videoUrl.startsWith('https') ? https : http

  // 根据平台设置不同的 Referer
  const referer = platform === 'douyin'
    ? 'https://www.douyin.com/'
    : 'https://www.xiaohongshu.com/'

  return new Promise((resolve, reject) => {
    const file = createWriteStream(filePath)

    const req = protocol.get(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': referer
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        const location = res.headers.location
        if (location) {
          downloadVideo(location, filename, platform)
            .then(resolve)
            .catch(reject)
        }
        return
      }

      res.pipe(file)

      file.on('finish', () => {
        file.close()
        resolve(filePath)
      })
    })

    req.on('error', (err) => {
      file.close()
      reject(err)
    })
  })
}

export function getTempDir() {
  return TEMP_DIR
}
