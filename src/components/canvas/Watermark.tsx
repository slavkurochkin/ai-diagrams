import { useFlowStore } from '../../hooks/useFlowStore'

/** Subtle brand watermark — visible in canvas and PNG exports. */
export default function Watermark() {
  const theme = useFlowStore((s) => s.theme)
  const isDark = theme === 'dark'

  return (
    <div
      className="absolute bottom-3 right-3 z-10 pointer-events-none select-none"
      aria-hidden="true"
    >
      <span className={`text-[10px] font-medium tracking-wide ${isDark ? 'text-white/20' : 'text-indigo-900/25'}`}>
        agentflow.app
      </span>
    </div>
  )
}
