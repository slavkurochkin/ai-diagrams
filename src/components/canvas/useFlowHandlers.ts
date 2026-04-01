import { useCallback } from 'react'
import { useReactFlow } from 'reactflow'
import type { NodeChange, EdgeChange, Connection } from 'reactflow'
import { useFlowStore } from '../../hooks/useFlowStore'
import { getNodeDefinition } from '../../lib/nodeDefinitions'
import type { PortType } from '../../types/nodes'

const FULL_NODE_WIDTH = 220
const FULL_NODE_HEIGHT = 110
const COMPACT_NODE_SIZE = 80
const MIN_VERTICAL_GAP = 170
const MIN_HORIZONTAL_GAP = 280

/** Returns true when a source port type can connect to a target port type. */
function portsCompatible(src: PortType, tgt: PortType): boolean {
  if (src === 'any' || tgt === 'any') return true
  return src === tgt
}

function getPortOffset(index: number, total: number, span: number): number {
  const axisPercent = total === 1 ? 50 : 20 + (index / (total - 1)) * 60
  return (axisPercent / 100) * span
}

function getNodeSize(compactMode: boolean) {
  return compactMode
    ? { width: COMPACT_NODE_SIZE, height: COMPACT_NODE_SIZE }
    : { width: FULL_NODE_WIDTH, height: FULL_NODE_HEIGHT }
}

/**
 * Extracts all React Flow event handlers into a single hook to keep
 * FlowCanvas.tsx lean. Also owns the drop-target logic for sidebar drag.
 */
export function useFlowHandlers() {
  const { onNodesChange, onEdgesChange, addEdge, addNode, setNodes, setSelectedNode } =
    useFlowStore()
  const { screenToFlowPosition } = useReactFlow()

  // ── Node/Edge change passthrough ──────────────────────────────────────────

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes)
    },
    [onNodesChange],
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes)
    },
    [onEdgesChange],
  )

  // ── Connection validation & creation ──────────────────────────────────────

  const handleConnect = useCallback(
    (connection: Connection) => {
      // Basic guards
      if (!connection.source || !connection.target) return
      if (connection.source === connection.target) return

      // Port type compatibility check
      const { nodes, layoutDirection, compactMode } = useFlowStore.getState()
      const srcNode = nodes.find((n) => n.id === connection.source)
      const tgtNode = nodes.find((n) => n.id === connection.target)

      if (srcNode && tgtNode) {
        const srcDef = getNodeDefinition(srcNode.data.nodeType)
        const tgtDef = getNodeDefinition(tgtNode.data.nodeType)

        if (srcDef && tgtDef) {
          const srcPort = srcDef.outputs.find((p) => p.id === connection.sourceHandle)
          const tgtPort = tgtDef.inputs.find((p) => p.id === connection.targetHandle)

          if (srcPort && tgtPort && !portsCompatible(srcPort.type, tgtPort.type)) {
            console.warn(
              `[AgentFlow] Incompatible port types: ${srcPort.type} → ${tgtPort.type}`,
            )
            return
          }
        }

        const srcPortIndex = srcDef?.outputs.findIndex((p) => p.id === connection.sourceHandle) ?? -1
        const tgtPortIndex = tgtDef?.inputs.findIndex((p) => p.id === connection.targetHandle) ?? -1
        const srcPortTotal = srcDef?.outputs.length ?? 1
        const tgtPortTotal = tgtDef?.inputs.length ?? 1
        const { width: nodeWidth, height: nodeHeight } = getNodeSize(compactMode)

        const alignedNodes = nodes.map((node) => {
          if (node.id !== tgtNode.id) return node

          if (layoutDirection === 'TB') {
            const sourceHandleX =
              srcNode.position.x +
              getPortOffset(srcPortIndex >= 0 ? srcPortIndex : 0, srcPortTotal, nodeWidth)
            const targetHandleOffsetX = getPortOffset(
              tgtPortIndex >= 0 ? tgtPortIndex : 0,
              tgtPortTotal,
              nodeWidth,
            )
            const verticalDirection = tgtNode.position.y >= srcNode.position.y ? 1 : -1
            const currentGap = Math.abs(tgtNode.position.y - srcNode.position.y)
            const nextY =
              currentGap < MIN_VERTICAL_GAP
                ? srcNode.position.y + verticalDirection * MIN_VERTICAL_GAP
                : tgtNode.position.y

            return {
              ...node,
              position: {
                x: sourceHandleX - targetHandleOffsetX,
                y: nextY,
              },
            }
          }

          const sourceHandleY =
            srcNode.position.y +
            getPortOffset(srcPortIndex >= 0 ? srcPortIndex : 0, srcPortTotal, nodeHeight)
          const targetHandleOffsetY = getPortOffset(
            tgtPortIndex >= 0 ? tgtPortIndex : 0,
            tgtPortTotal,
            nodeHeight,
          )
          const horizontalDirection = tgtNode.position.x >= srcNode.position.x ? 1 : -1
          const currentGap = Math.abs(tgtNode.position.x - srcNode.position.x)
          const nextX =
            currentGap < MIN_HORIZONTAL_GAP
              ? srcNode.position.x + horizontalDirection * MIN_HORIZONTAL_GAP
              : tgtNode.position.x

          return {
            ...node,
            position: {
              x: nextX,
              y: sourceHandleY - targetHandleOffsetY,
            },
          }
        })

        setNodes(alignedNodes)
      }

      addEdge(connection)
    },
    [addEdge, setNodes],
  )

  // ── Node selection ────────────────────────────────────────────────────────

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNode(node.id)
    },
    [setSelectedNode],
  )

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

  // ── Sidebar drag-and-drop ─────────────────────────────────────────────────

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const nodeType = event.dataTransfer.getData('application/agentflow-node')
      if (!nodeType) return

      // Convert screen coords → flow canvas coords
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      addNode(nodeType, position)
    },
    [addNode, screenToFlowPosition],
  )

  return {
    handleNodesChange,
    handleEdgesChange,
    handleConnect,
    handleNodeClick,
    handlePaneClick,
    handleDragOver,
    handleDrop,
  }
}
