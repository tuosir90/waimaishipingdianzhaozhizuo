'use client'

import { useState } from 'react'
import { Download, Video, Scissors, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { VideoEditor, CropParams } from '@/components/video-editor'

type Status = 'idle' | 'downloading' | 'editing' | 'processing' | 'done' | 'error'
type Platform = 'xiaohongshu' | 'douyin'

export default function Home() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState<{ videoUrl: string; platform?: Platform } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    try {
      setStatus('downloading')
      setProgress(20)
      setMessage('正在解析链接...')

      const parseRes = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      const parseData = await parseRes.json()
      if (!parseRes.ok) {
        throw new Error(parseData.error || '解析失败')
      }

      setProgress(100)
      setMessage('解析完成，请编辑视频')
      setVideoInfo(parseData.data)

      // 抖音视频需要通过代理访问（绕过CORS限制）
      const videoUrl = parseData.data.videoUrl
      if (parseData.data.platform === 'douyin') {
        setPreviewUrl(`/api/proxy-video?url=${encodeURIComponent(videoUrl)}`)
      } else {
        setPreviewUrl(videoUrl)
      }
      setStatus('editing')

    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '处理失败')
    }
  }

  const resetForm = () => {
    setUrl('')
    setStatus('idle')
    setProgress(0)
    setMessage('')
    setDownloadUrl('')
    setPreviewUrl('')
    setVideoInfo(null)
  }

  const handleCropConfirm = async (params: CropParams) => {
    if (!videoInfo) return

    try {
      setStatus('processing')
      setProgress(30)
      setMessage('正在处理视频...')

      const processRes = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: videoInfo.videoUrl,
          crop: params,
          platform: videoInfo.platform
        })
      })

      const processData = await processRes.json()
      if (!processRes.ok) {
        throw new Error(processData.error || '处理失败')
      }

      setProgress(100)
      setStatus('done')
      setMessage('处理完成！')
      setDownloadUrl(processData.downloadPath)

    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '处理失败')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <Card className="border-orange-200 shadow-lg shadow-orange-100/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
              <Video className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              美团外卖视频店招快速制作
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              下载视频并自动处理为店招格式 (692×390)
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 功能说明 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <FeatureItem icon={<Download className="h-4 w-4" />} text="小红书/抖音视频" />
              <FeatureItem icon={<Scissors className="h-4 w-4" />} text="自定义裁剪区域" />
              <FeatureItem icon={<Video className="h-4 w-4" />} text="输出 692×390" />
              <FeatureItem icon={<Volume2 className="h-4 w-4" />} text="自动去除原声" />
            </div>

            {/* 输入表单 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="粘贴小红书或抖音分享链接..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={status !== 'idle'}
                className="border-orange-200 focus-visible:ring-orange-400 h-12"
              />

              {status === 'idle' && (
                <Button type="submit" className="w-full h-12 text-base font-medium" disabled={!url.trim()}>
                  <Download className="mr-2 h-5 w-5" />
                  开始处理
                </Button>
              )}
            </form>

            {/* 进度显示 */}
            {(status === 'downloading' || status === 'processing') && (
              <div className="space-y-3">
                <Progress value={progress} />
                <p className="text-center text-sm text-muted-foreground">
                  {message}
                </p>
              </div>
            )}

            {/* 视频编辑器 */}
            {status === 'editing' && previewUrl && (
              <VideoEditor
                videoUrl={previewUrl}
                onConfirm={handleCropConfirm}
              />
            )}

            {/* 下载按钮 */}
            {status === 'done' && (
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = downloadUrl
                    link.download = 'shop_video.mp4'
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  下载视频
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  重新开始
                </Button>
              </div>
            )}

            {/* 错误状态 */}
            {status === 'error' && (
              <div className="space-y-3">
                <p className="text-center text-sm text-red-500">{message}</p>
                <Button variant="outline" onClick={resetForm} className="w-full">
                  重新开始
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <div className="mt-6 text-center text-sm text-muted-foreground space-y-1">
          <p>支持格式：</p>
          <p>小红书：xhslink.com、xiaohongshu.com</p>
          <p>抖音：v.douyin.com、douyin.com/video</p>
          <p className="mt-2">输出：692×390 无声 MP4</p>
        </div>

        {/* 品牌标识 */}
        <div className="mt-8 pt-6 border-t border-orange-100 text-center">
          <p className="text-sm font-medium bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
            呈尚策划
          </p>
        </div>
      </div>
    </main>
  )
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 p-3 border border-orange-100">
      <span className="text-orange-500">{icon}</span>
      <span className="text-foreground/80">{text}</span>
    </div>
  )
}
