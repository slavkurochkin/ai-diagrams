// ── Animation step types ──────────────────────────────────────────────────────

export type AnimationStep =
  | { type: 'activate-node';   nodeId: string; duration: number }
  | { type: 'activate-nodes';  nodeIds: string[]; duration: number }
  | { type: 'traverse-edge';   edgeId: string; targetNodeId: string; duration: number; color: string }
  | { type: 'traverse-edges';  edges: { edgeId: string; targetNodeId: string; color: string }[]; duration: number }
  | { type: 'deactivate-node'; nodeId: string }
  | { type: 'pause';           duration: number }

// ── Player control types ──────────────────────────────────────────────────────

export type AnimationStatus = 'idle' | 'playing' | 'paused' | 'done'
export type AnimationSpeed  = 0.5 | 1 | 2
