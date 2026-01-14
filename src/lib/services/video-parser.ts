export type Platform = 'xiaohongshu' | 'douyin'

export interface VideoInfo {
  videoUrl: string
  title: string
  author: string
  platform?: Platform
}

export function detectPlatform(text: string): Platform | null {
  if (text.includes('xhslink.com') || text.includes('xiaohongshu.com')) {
    return 'xiaohongshu'
  }
  if (text.includes('v.douyin.com') || text.includes('douyin.com/video') || text.includes('douyin.com/note')) {
    return 'douyin'
  }
  return null
}
