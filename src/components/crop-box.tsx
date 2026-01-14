'use client'

import { useRef, useEffect, useState } from 'react'

interface CropBoxProps {
  containerRef: React.RefObject<HTMLDivElement>
  box: { x: number; y: number; width: number; height: number }
  onChange: (box: { x: number; y: number; width: number; height: number }) => void
}

const ASPECT_RATIO = 692 / 390

export function CropBox({ containerRef, box, onChange }: CropBoxProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const startPos = useRef({ x: 0, y: 0, boxX: 0, boxY: 0, boxW: 0, boxH: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()

      if (isDragging) {
        const dx = e.clientX - startPos.current.x
        const dy = e.clientY - startPos.current.y
        let newX = startPos.current.boxX + dx
        let newY = startPos.current.boxY + dy

        newX = Math.max(0, Math.min(newX, rect.width - box.width))
        newY = Math.max(0, Math.min(newY, rect.height - box.height))

        onChange({ ...box, x: newX, y: newY })
      }

      if (isResizing) {
        const dx = e.clientX - startPos.current.x
        let newW = startPos.current.boxW + dx
        newW = Math.max(100, Math.min(newW, rect.width - box.x))
        const newH = newW / ASPECT_RATIO

        if (box.y + newH <= rect.height) {
          onChange({ ...box, width: newW, height: newH })
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, box, onChange, containerRef])

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startPos.current = { x: e.clientX, y: e.clientY, boxX: box.x, boxY: box.y, boxW: box.width, boxH: box.height }
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    startPos.current = { x: e.clientX, y: e.clientY, boxX: box.x, boxY: box.y, boxW: box.width, boxH: box.height }
  }

  return (
    <div
      className="absolute border-2 border-white cursor-move"
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
      onMouseDown={handleDragStart}
    >
      <div className="absolute inset-0 bg-white/10" />
      <div
        className="absolute -right-2 -bottom-2 w-4 h-4 bg-white rounded-full cursor-se-resize"
        onMouseDown={handleResizeStart}
      />
      <div className="absolute top-1 left-1 text-xs text-white bg-black/50 px-1 rounded">
        692×390
      </div>
    </div>
  )
}
