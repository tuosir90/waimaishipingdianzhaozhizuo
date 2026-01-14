import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '美团外卖视频店招快速制作',
  description: '下载小红书视频并处理为店招格式',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
