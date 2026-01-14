import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import { getTempDir } from './downloader'

interface ProcessOptions {
  inputPath: string
  outputFilename: string
  crop?: {
    x: number
    y: number
    width: number
    height: number
    startTime: number
    endTime: number
  }
}

interface VideoInfo {
  width: number
  height: number
  isPortrait: boolean
}

// 获取视频尺寸信息
async function getVideoInfo(inputPath: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err)
        return
      }
      const stream = metadata.streams.find(s => s.codec_type === 'video')
      if (!stream || !stream.width || !stream.height) {
        reject(new Error('无法获取视频尺寸'))
        return
      }
      const width = stream.width
      const height = stream.height
      resolve({
        width,
        height,
        isPortrait: height > width
      })
    })
  })
}

export async function processVideo(options: ProcessOptions): Promise<string> {
  const { inputPath, outputFilename, crop } = options
  const outputPath = path.join(getTempDir(), outputFilename)

  let filters: string[]
  let inputOptions: string[] = []

  if (crop) {
    // 使用用户自定义裁剪参数
    console.log('自定义裁剪:', crop)
    filters = [
      `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`,
      'scale=692:390'
    ]
    inputOptions = [
      `-ss ${crop.startTime}`,
      `-t ${crop.endTime - crop.startTime}`
    ]
  } else {
    // 自动模式
    const videoInfo = await getVideoInfo(inputPath)
    console.log('视频信息:', videoInfo)

    if (videoInfo.isPortrait) {
      filters = [
        'crop=in_w:in_h*0.72:0:in_h*0.08',
        'scale=692:-1',
        'crop=692:390:0:(ih-390)/2'
      ]
    } else {
      filters = [
        'crop=in_w:in_h*0.72:0:in_h*0.08',
        'scale=692:390'
      ]
    }
  }

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(inputPath)

    if (inputOptions.length > 0) {
      cmd = cmd.inputOptions(inputOptions)
    }

    cmd
      .videoFilters(filters)
      .noAudio()
      .format('mp4')
      .outputOptions(['-c:v libx264', '-preset fast', '-crf 23'])
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath)
  })
}
