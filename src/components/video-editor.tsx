'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Scissors } from 'lucide-react'
import { CropBox } from './crop-box'
import { TimelineSlider } from './timeline-slider'

interface VideoEditorProps {
  videoUrl: string
  onConfirm: (params: CropParams) => void
}

export interface CropParams {
  x: number
  y: number
  width: number
  height: number
  startTime: number
  endTime: number
}

export function VideoEditor({ videoUrl, onConfirm }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 0])
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 200, height: 113 })
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setTimeRange([0, video.duration])
      setVideoSize({ width: video.videoWidth, height: video.videoHeight })
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (video.currentTime >= timeRange[1]) {
        video.currentTime = timeRange[0]
      }
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [timeRange])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      if (video.currentTime < timeRange[0] || video.currentTime >= timeRange[1]) {
        video.currentTime = timeRange[0]
      }
      video.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleConfirm = () => {
    const container = containerRef.current
    if (!container || !videoSize.width) return

    const scaleX = videoSize.width / container.offsetWidth
    const scaleY = videoSize.height / container.offsetHeight

    onConfirm({
      x: Math.round(cropBox.x * scaleX),
      y: Math.round(cropBox.y * scaleY),
      width: Math.round(cropBox.width * scaleX),
      height: Math.round(cropBox.height * scaleY),
      startTime: timeRange[0],
      endTime: timeRange[1]
    })
  }

  const handleSeek = (time: number) => {
    const video = videoRef.current
    if (!video) return
    // 拖动时暂停视频，确保 seek 能正常工作
    if (isPlaying) {
      video.pause()
      setIsPlaying(false)
    }
    video.currentTime = time
  }

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full"
          onClick={togglePlay}
          preload="metadata"
          crossOrigin="anonymous"
        />
        <CropBox
          containerRef={containerRef}
          box={cropBox}
          onChange={setCropBox}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={togglePlay}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <span className="text-sm text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <TimelineSlider
        duration={duration}
        currentTime={currentTime}
        value={timeRange}
        onChange={setTimeRange}
        onSeek={handleSeek}
      />

      <Button onClick={handleConfirm} className="w-full">
        <Scissors className="mr-2 h-4 w-4" />
        确认裁剪
      </Button>
    </div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
