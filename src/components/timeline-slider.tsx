'use client'

import { useRef, useCallback } from 'react'

interface TimelineSliderProps {
  duration: number
  currentTime: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  onSeek?: (time: number) => void
}

export function TimelineSlider({ duration, currentTime, value, onChange, onSeek }: TimelineSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const getPosition = useCallback((clientX: number) => {
    if (!trackRef.current || !duration) return 0
    const rect = trackRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    return (x / rect.width) * duration
  }, [duration])

  const handlePlayheadDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.current = true

    const handleMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const time = getPosition(ev.clientX)
      if (onSeek) onSeek(time)
    }

    const handleUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }

  const handleTrackClick = (e: React.MouseEvent) => {
    if (isDragging.current) return
    const time = getPosition(e.clientX)
    if (onSeek) onSeek(time)
  }

  const handleStartDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.current = true

    const handleMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const pos = getPosition(ev.clientX)
      onChange([Math.min(pos, value[1] - 0.5), value[1]])
    }

    const handleUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }

  const handleEndDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.current = true

    const handleMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const pos = getPosition(ev.clientX)
      onChange([value[0], Math.max(pos, value[0] + 0.5)])
    }

    const handleUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }

  const startPercent = duration ? (value[0] / duration) * 100 : 0
  const endPercent = duration ? (value[1] / duration) * 100 : 100
  const playheadPercent = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>开始: {formatTime(value[0])}</span>
        <span>结束: {formatTime(value[1])}</span>
      </div>
      <div
        ref={trackRef}
        className="relative h-10 bg-muted rounded cursor-pointer select-none"
        onClick={handleTrackClick}
      >
        {/* 选中区域 */}
        <div
          className="absolute h-full bg-orange-200 rounded"
          style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
        />
        {/* 开始手柄 - 增大点击区域 */}
        <div
          className="absolute top-0 w-4 h-full bg-orange-500 rounded-l cursor-ew-resize z-10 hover:bg-orange-600 active:bg-orange-700 transition-colors"
          style={{ left: `${startPercent}%` }}
          onMouseDown={handleStartDrag}
        />
        {/* 结束手柄 - 增大点击区域 */}
        <div
          className="absolute top-0 w-4 h-full bg-orange-500 rounded-r cursor-ew-resize z-10 hover:bg-orange-600 active:bg-orange-700 transition-colors"
          style={{ left: `calc(${endPercent}% - 16px)` }}
          onMouseDown={handleEndDrag}
        />
        {/* 播放头 - 增大点击区域 */}
        <div
          className="absolute top-0 w-3 h-full cursor-ew-resize z-20 group"
          style={{ left: `calc(${playheadPercent}% - 6px)` }}
          onMouseDown={handlePlayheadDrag}
        >
          <div className="absolute left-1/2 -translate-x-1/2 w-1 h-full bg-red-500 group-hover:bg-red-600 group-active:bg-red-700 transition-colors" />
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-500 group-hover:border-t-red-600" />
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
