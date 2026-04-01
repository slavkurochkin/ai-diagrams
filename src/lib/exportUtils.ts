import { toPng } from 'html-to-image'
import { getRectOfNodes, getTransformForBounds } from 'reactflow'
import type { Node } from 'reactflow'

const EXPORT_PADDING = 48
const EXPORT_MIN_WIDTH = 1200
const EXPORT_MIN_HEIGHT = 800

function getBgColor(isDark: boolean) {
  return isDark ? '#0F1117' : '#F8FAFC'
}

/**
 * Builds the toPng options needed to frame the diagram tightly around nodes.
 */
function getExportOptions(nodes: Node[], isDark: boolean) {
  const bounds = getRectOfNodes(nodes)

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
    0.5,
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
