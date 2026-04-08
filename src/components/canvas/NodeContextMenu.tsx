import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Trash2, Copy, Sparkles, FlaskConical } from 'lucide-react'

interface NodeContextMenuProps {
  x: number
  y: number
  nodeId: string
  evalTargetNodeIds: string[]
  onDelete: (nodeId: string) => void
  onDuplicate: (nodeId: string) => void
  onExplainNode: (nodeId: string) => void
  onEvalTargets: (nodeIds: string[]) => void
  onClose: () => void
}

export default function NodeContextMenu({
  x, y, nodeId,
  evalTargetNodeIds,
  onDelete, onDuplicate, onExplainNode, onEvalTargets, onClose,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const items = [
    { icon: Copy, label: 'Duplicate', action: () => { onDuplicate(nodeId); onClose() } },
    { icon: Sparkles, label: 'Explain this node', action: () => { onExplainNode(nodeId); onClose() } },
    {
      icon: FlaskConical,
      label: evalTargetNodeIds.length > 1 ? `Eval selected group (${evalTargetNodeIds.length})` : 'Eval this node',
      action: () => { onEvalTargets(evalTargetNodeIds); onClose() },
    },
    { icon: Trash2, label: 'Delete', action: () => { onDelete(nodeId); onClose() }, danger: true },
  ]

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      style={{ position: 'fixed', left: x, top: y, zIndex: 9999 }}
      className="
        min-w-[160px] py-1 rounded-xl
        bg-gray-950 border border-white/10 shadow-2xl
        overflow-hidden
      "
    >
      {items.map(({ icon: Icon, label, action, danger }) => (
        <button
          key={label}
          type="button"
          onClick={action}
          className={`
            w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium
            transition-colors duration-100
            ${danger
              ? 'text-red-400 hover:bg-red-900/30 hover:text-red-300'
              : 'text-white/70 hover:bg-white/8 hover:text-white'
            }
          `}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </motion.div>
  )
}
