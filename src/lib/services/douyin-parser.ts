import https from 'https'
import http from 'http'
import { VideoInfo } from './video-parser'

export async function parseDouyinUrl(shareText: string): Promise<VideoInfo> {
  const url = extractDouyinUrl(shareText)
  if (!url) {
    throw new Error('未找到有效的抖音链接')
  }

  console.log('提取到抖音链接:', url)

  // 获取重定向URL，提取视频ID
  const redirectUrl = await getRedirectUrl(url)
  console.log('重定向URL:', redirectUrl)

  // 从URL中提取视频ID
  const videoId = extractVideoId(redirectUrl)
  console.log('提取到视频ID:', videoId)

  if (!videoId) {
    throw new Error('无法从链接中提取视频ID')
  }

  // 访问移动端分享页面
  const sharePageUrl = `https://www.iesdouyin.com/share/video/${videoId}/`
  console.log('访问移动端分享页面:', sharePageUrl)

  const html = await fetchMobilePage(sharePageUrl)
  console.log('HTML长度:', html.length)

  const videoInfo = extractVideoInfo(html, videoId)

  return { ...videoInfo, platform: 'douyin' }
}

function extractDouyinUrl(text: string): string | null {
  // 匹配短链接：https://v.douyin.com/xxxxx/
  const shortMatch = text.match(/https?:\/\/v\.douyin\.com\/[a-zA-Z0-9]+\/?/)
  if (shortMatch) {
    return shortMatch[0]
  }

  // 匹配完整链接：https://www.douyin.com/video/xxxxx
  const fullMatch = text.match(/https?:\/\/(www\.)?douyin\.com\/video\/\d+/)
  if (fullMatch) {
    return fullMatch[0]
  }

  return null
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /\/video\/(\d+)/,
    /\/share\/video\/(\d+)/,
    /item_ids=(\d+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

// 获取重定向URL（不跟踪重定向）
async function getRedirectUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http

    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    }, (res) => {
      // 获取重定向位置，但不跟踪
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) {
        const location = res.headers.location
        if (location) {
          resolve(location)
        } else {
          reject(new Error('重定向无location'))
        }
      } else {
        // 如果没有重定向，返回原URL
        resolve(url)
      }
    })

    req.on('error', reject)
    req.end()
  })
}

// 获取移动端分享页面
async function fetchMobilePage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http

    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 30000,
    }, (res) => {
      // 处理重定向
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location
        if (location) {
          fetchMobilePage(location).then(resolve).catch(reject)
          return
        }
      }

      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    })

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('请求超时'))
    })
    req.end()
  })
}

function extractVideoInfo(html: string, videoId: string): Omit<VideoInfo, 'platform'> {
  let videoUrl = ''
  let title = '抖音视频'
  let author = '未知作者'

  // 从 _ROUTER_DATA 中提取数据
  const routerPattern = /window\._ROUTER_DATA\s*=\s*(\{.+?\})<\/script>/s
  const match = html.match(routerPattern)

  if (match) {
    try {
      // 解码 unicode 转义
      let jsonStr = match[1]
      jsonStr = jsonStr.replace(/\\u002F/g, '/')

      const data = JSON.parse(jsonStr)
      console.log('成功解析 _ROUTER_DATA')

      // 导航到视频信息
      const loaderData = data.loaderData || {}
      const pageData = loaderData[`video_(id)/page`] || loaderData['video_(id)'] || {}
      const videoRes = pageData.videoInfoRes || {}
      const itemList = videoRes.item_list || []

      if (itemList.length > 0) {
        const item = itemList[0]

        // 提取标题
        title = item.desc || '抖音视频'

        // 提取作者
        author = item.author?.nickname || '未知作者'

        // 获取播放地址
        const playAddr = item.video?.play_addr || {}
        const urlList = playAddr.url_list || []

        if (urlList.length > 0) {
          // 使用无水印地址
          videoUrl = urlList[0].replace('playwm', 'play')
          console.log('获取到视频URL:', videoUrl.substring(0, 100))
        }
      } else {
        console.log('item_list 为空，尝试其他路径')
        // 打印可用的 keys
        console.log('loaderData keys:', Object.keys(loaderData))
      }

    } catch (e) {
      console.log('_ROUTER_DATA 解析失败:', e)
    }
  } else {
    console.log('未找到 _ROUTER_DATA')

    // 备用：尝试其他模式
    const patterns = [
      /window\.__INITIAL_STATE__\s*=\s*(\{.+?\});/s,
      /<script id="RENDER_DATA"[^>]*>([^<]+)<\/script>/,
    ]

    for (const pattern of patterns) {
      const m = html.match(pattern)
      if (m) {
        console.log('找到备用数据源')
        try {
          let jsonStr = m[1]
          if (pattern.toString().includes('RENDER_DATA')) {
            jsonStr = decodeURIComponent(jsonStr)
          }
          // 尝试提取视频URL
          const urlMatch = jsonStr.match(/"play_addr"[^}]*"url_list":\s*\["([^"]+)"/)
          if (urlMatch) {
            videoUrl = urlMatch[1].replace(/\\u002F/g, '/').replace('playwm', 'play')
            console.log('从备用数据源获取到URL')
            break
          }
        } catch (e) {
          console.log('备用数据源解析失败:', e)
        }
      }
    }
  }

  return { videoUrl, title, author }
}
