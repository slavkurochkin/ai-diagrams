// ── Animation step types ──────────────────────────────────────────────────────

export type AnimationStep =
  | { type: 'activate-node';   nodeId: string; duration: number }
  | { type: 'traverse-edge';   edgeId: string; duration: number; color: string }
  | { type: 'deactivate-node'; nodeId: string }
  | { type: 'pause';           duration: number }

// ── Player control types ──────────────────────────────────────────────────────

export type AnimationStatus = 'idle' | 'playing' | 'paused' | 'done'
export type AnimationSpeed  = 0.5 | 1 | 2
