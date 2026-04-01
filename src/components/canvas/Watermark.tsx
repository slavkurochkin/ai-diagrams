/** Subtle brand watermark — visible in canvas and PNG exports. */
export default function Watermark() {
  return (
    <div
      className="absolute bottom-3 right-3 z-10 pointer-events-none select-none"
      aria-hidden="true"
    >
      <span className="text-[10px] text-white/20 font-medium tracking-wide">
        agentflow.app
      </span>
    </div>
  )
}
