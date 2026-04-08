import { toPng } from 'html-to-image'
import { getTransformForBounds } from 'reactflow'
import type { Node } from 'reactflow'
import gifWorkerUrl from 'gif.js.optimized/dist/gif.worker.js?url'

const EXPORT_PADDING = 48
const EXPORT_MIN_WIDTH = 1200
const EXPORT_MIN_HEIGHT = 800
const DEFAULT_NODE_WIDTH = 220
const DEFAULT_NODE_HEIGHT = 110
const DEFAULT_FRAME_WIDTH = 420
const DEFAULT_FRAME_HEIGHT = 260
const DEFAULT_TEXT_WIDTH = 320
const DEFAULT_TEXT_HEIGHT = 160

function getBgColor(isDark: boolean) {
  return isDark ? '#0F1117' : '#F8FAFC'
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getNodeSize(node: Node): { width: number; height: number } {
  const explicitWidth = typeof node.width === 'number' ? node.width : undefined
  const explicitHeight = typeof node.height === 'number' ? node.height : undefined
  const styleWidth = typeof node.style?.width === 'number' ? node.style.width : undefined
  const styleHeight = typeof node.style?.height === 'number' ? node.style.height : undefined
  const config = (node.data as { config?: Record<string, unknown> } | undefined)?.config
  const cfgWidth = typeof config?.width === 'number' ? config.width : undefined
  const cfgHeight = typeof config?.height === 'number' ? config.height : undefined

  const fallbackWidth = node.type === 'frame'
    ? DEFAULT_FRAME_WIDTH
    : node.type === 'text'
      ? DEFAULT_TEXT_WIDTH
      : DEFAULT_NODE_WIDTH
  const fallbackHeight = node.type === 'frame'
    ? DEFAULT_FRAME_HEIGHT
    : node.type === 'text'
      ? DEFAULT_TEXT_HEIGHT
      : DEFAULT_NODE_HEIGHT

  return {
    width: explicitWidth ?? styleWidth ?? cfgWidth ?? fallbackWidth,
    height: explicitHeight ?? styleHeight ?? cfgHeight ?? fallbackHeight,
  }
}

function getExportBounds(nodes: Node[]) {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: EXPORT_MIN_WIDTH, height: EXPORT_MIN_HEIGHT }
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const node of nodes) {
    const { width, height } = getNodeSize(node)
    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + width)
    maxY = Math.max(maxY, node.position.y + height)
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

/**
 * Builds the toPng options needed to frame the diagram tightly around nodes.
 */
function getExportOptions(nodes: Node[], isDark: boolean) {
  const bounds = getExportBounds(nodes)

  const imageWidth = Math.max(
    EXPORT_MIN_WIDTH,
    bounds.width + EXPORT_PADDING * 2,
  )
  const imageHeight = Math.max(
    EXPORT_MIN_HEIGHT,
    bounds.height + EXPORT_PADDING * 2,
  )

  const transform = getTransformForBounds(
    bounds,
    imageWidth,
    imageHeight,
    0.01,
    2,
  )

  return {
    backgroundColor: getBgColor(isDark),
    width: imageWidth,
    height: imageHeight,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
    },
  }
}

/** Downloads the canvas as a hi-res PNG file. */
export async function downloadAsPNG(
  nodes: Node[],
  flowName: string,
  isDark: boolean,
): Promise<void> {
  const viewport = document.querySelector(
    '.react-flow__viewport',
  ) as HTMLElement | null
  if (!viewport) return

  const dataUrl = await toPng(viewport, getExportOptions(nodes, isDark))

  const filename = flowName.trim().toLowerCase().replace(/\s+/g, '-') || 'agentflow'
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${filename}.png`
  a.click()
}

/** Copies the canvas as a PNG directly to the clipboard. */
export async function copyAsPNG(
  nodes: Node[],
  isDark: boolean,
): Promise<void> {
  const viewport = document.querySelector(
    '.react-flow__viewport',
  ) as HTMLElement | null
  if (!viewport) return

  const dataUrl = await toPng(viewport, getExportOptions(nodes, isDark))

  const res = await fetch(dataUrl)
  const blob = await res.blob()

  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ])
}

interface ExportPlaybackGIFOptions {
  nodes: Node[]
  flowName: string
  isDark: boolean
  fps?: number
  maxDurationMs?: number
  beforeCapture?: () => Promise<void> | void
  isPlaybackDone: () => boolean
  afterCapture?: () => Promise<void> | void
}

/**
 * Captures each frame using toPng (same path as the working PNG export)
 * then converts to canvas for the GIF encoder.
 */
async function pngFrameToCanvas(
  viewport: HTMLElement,
  options: ReturnType<typeof getExportOptions>,
): Promise<HTMLCanvasElement> {
  const dataUrl = await toPng(viewport, options)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = dataUrl
  })
  const canvas = document.createElement('canvas')
  canvas.width = options.width
  canvas.height = options.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, options.width, options.height)
  return canvas
}

/** Records the canvas while playback runs and downloads a GIF. */
export async function exportPlaybackAsGIF({
  nodes,
  flowName,
  isDark,
  fps = 12,
  maxDurationMs = 45_000,
  beforeCapture,
  isPlaybackDone,
  afterCapture,
}: ExportPlaybackGIFOptions): Promise<void> {
  const viewport = document.querySelector(
    '.react-flow__viewport',
  ) as HTMLElement | null
  if (!viewport) return

  type GIFInstance = {
    addFrame: (image: CanvasImageSource, options?: { copy?: boolean; delay?: number }) => void
    on: (event: string, cb: (...args: unknown[]) => void) => void
    render: () => void
  }
  type GIFCtor = new (options: {
    workers: number
    quality: number
    width: number
    height: number
    workerScript: string
  }) => GIFInstance

  const GIF = (await import('gif.js.optimized')).default as unknown as GIFCtor

  const options = getExportOptions(nodes, isDark)
  const frameDelay = Math.max(60, Math.round(1000 / Math.max(1, fps)))

  if (beforeCapture) {
    await beforeCapture()
    await sleep(80)
  }

  try {
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: options.width,
      height: options.height,
      workerScript: gifWorkerUrl,
    })

    const startedAt = performance.now()
    let lastFrameTime = startedAt
    let lastFrame: HTMLCanvasElement | null = null
    let capturedFrames = 0

    while ((performance.now() - startedAt) < maxDurationMs) {
      const frame = await pngFrameToCanvas(viewport, options)

      const now = performance.now()
      const realElapsed = Math.round(now - lastFrameTime)
      lastFrameTime = now

      gif.addFrame(frame, { copy: true, delay: Math.max(frameDelay, realElapsed) })
      lastFrame = frame
      capturedFrames += 1

      if (isPlaybackDone() && capturedFrames >= 2) break
      await sleep(frameDelay)
    }

    if (lastFrame) {
      gif.addFrame(lastFrame, { copy: true, delay: 500 })
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      gif.on('finished', (result: unknown) => resolve(result as Blob))
      gif.on('abort', () => reject(new Error('GIF rendering aborted')))
      gif.render()
    })

    const filename = flowName.trim().toLowerCase().replace(/\s+/g, '-') || 'agentflow'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.gif`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    if (afterCapture) await afterCapture()
  }
}
