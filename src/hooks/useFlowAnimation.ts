import { useState, useRef, useCallback, useEffect } from 'react'
import { useFlowStore } from './useFlowStore'
import { sequenceFlow, sequenceFlowFrom } from '../lib/animationSequencer'
import type { AnimationStatus, AnimationSpeed, AnimationStep } from '../types/animation'
import { filterGraphForAI } from '../lib/aiGraphFilter'
import type { BaseNodeData } from '../types/nodes'
import type { Node } from 'reactflow'

interface ActiveEdge {
  edgeId: string
  color: string
  duration: number  // ms — passed to DataToken so it times its path animation
}

interface FlowAnimationAPI {
  status: AnimationStatus
  speed: AnimationSpeed
  activeEdges: ActiveEdge[]
  play: () => void
  playFrom: (nodeId: string) => void
  pause: () => void
  reset: () => void
  setSpeed: (s: AnimationSpeed) => void
}

const DEFAULT_HOOK_MS = 1200

function coerceHookMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(200, Math.min(10000, Math.round(value * 1000)))
  }
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n)) return Math.max(200, Math.min(10000, Math.round(n * 1000)))
  }
  return DEFAULT_HOOK_MS
}

function getHookDurationMs(nodes: Node<BaseNodeData>[], phase: 'before' | 'after'): number {
  let maxMs = 0
  for (const n of nodes) {
    if (n.data.nodeType !== 'character') continue
    const cfg = n.data.config as Record<string, unknown>
    const speechHook = typeof cfg.speechHook === 'string' ? cfg.speechHook : 'none'
    const noteBefore = typeof cfg.noteBefore === 'string' ? cfg.noteBefore.trim() : ''
    const noteAfter = typeof cfg.noteAfter === 'string' ? cfg.noteAfter.trim() : ''
    const expressionBefore = typeof cfg.expressionBefore === 'string' ? cfg.expressionBefore : 'inherit'
    const expressionAfter = typeof cfg.expressionAfter === 'string' ? cfg.expressionAfter : 'inherit'
    const beforeEnabled = speechHook === 'before' || speechHook === 'beforeAfter' || noteBefore.length > 0 || expressionBefore !== 'inherit'
    const afterEnabled = speechHook === 'after' || speechHook === 'beforeAfter' || noteAfter.length > 0 || expressionAfter !== 'inherit'
    const enabled = phase === 'before' ? beforeEnabled : afterEnabled
    if (!enabled) continue
    // Prefer the new seconds-based field, but support legacy ms-based flows.
    const legacyMsRaw = cfg.speechDurationMs
    const legacyMs =
      typeof legacyMsRaw === 'number' && Number.isFinite(legacyMsRaw)
        ? Math.max(200, Math.min(10000, Math.round(legacyMsRaw)))
        : typeof legacyMsRaw === 'string' && Number.isFinite(Number(legacyMsRaw))
          ? Math.max(200, Math.min(10000, Math.round(Number(legacyMsRaw))))
          : DEFAULT_HOOK_MS
    const ms = cfg.speechDurationSeconds !== undefined ? coerceHookMs(cfg.speechDurationSeconds) : legacyMs
    if (ms > maxMs) maxMs = ms
  }
  return maxMs || DEFAULT_HOOK_MS
}

interface CharacterHookMeta {
  nodeId: string
  dependsOnCharacterId: string
  durationMs: number
  order: number
}

function getCharacterHooksForPhase(
  nodes: Node<BaseNodeData>[],
  phase: 'before' | 'after',
): CharacterHookMeta[] {
  return nodes
    .map((n, idx): CharacterHookMeta | null => {
      if (n.data.nodeType !== 'character') return null
      const cfg = n.data.config as Record<string, unknown>
      const speechHook = typeof cfg.speechHook === 'string' ? cfg.speechHook : 'none'
      const noteBefore = typeof cfg.noteBefore === 'string' ? cfg.noteBefore.trim() : ''
      const noteAfter = typeof cfg.noteAfter === 'string' ? cfg.noteAfter.trim() : ''
      const expressionBefore = typeof cfg.expressionBefore === 'string' ? cfg.expressionBefore : 'inherit'
      const expressionAfter = typeof cfg.expressionAfter === 'string' ? cfg.expressionAfter : 'inherit'
      const beforeEnabled = speechHook === 'before' || speechHook === 'beforeAfter' || noteBefore.length > 0 || expressionBefore !== 'inherit'
      const afterEnabled = speechHook === 'after' || speechHook === 'beforeAfter' || noteAfter.length > 0 || expressionAfter !== 'inherit'
      const enabled = phase === 'before' ? beforeEnabled : afterEnabled
      if (!enabled) return null
      const dependsOnCharacterId = typeof cfg.dependsOnCharacterId === 'string' ? cfg.dependsOnCharacterId.trim() : ''
      const legacyMsRaw = cfg.speechDurationMs
      const legacyMs =
        typeof legacyMsRaw === 'number' && Number.isFinite(legacyMsRaw)
          ? Math.max(200, Math.min(10000, Math.round(legacyMsRaw)))
          : typeof legacyMsRaw === 'string' && Number.isFinite(Number(legacyMsRaw))
            ? Math.max(200, Math.min(10000, Math.round(Number(legacyMsRaw))))
            : DEFAULT_HOOK_MS
      const durationMs = cfg.speechDurationSeconds !== undefined ? coerceHookMs(cfg.speechDurationSeconds) : legacyMs
      return { nodeId: n.id, dependsOnCharacterId, durationMs, order: idx }
    })
    .filter((v): v is CharacterHookMeta => v !== null)
}

function orderHooksByDependency(hooks: CharacterHookMeta[]): CharacterHookMeta[] {
  if (hooks.length <= 1) return hooks
  const byId = new Map(hooks.map((h) => [h.nodeId, h]))
  const indegree = new Map<string, number>()
  const outgoing = new Map<string, string[]>()
  for (const h of hooks) {
    indegree.set(h.nodeId, 0)
    outgoing.set(h.nodeId, [])
  }
  for (const h of hooks) {
    if (!h.dependsOnCharacterId || !byId.has(h.dependsOnCharacterId) || h.dependsOnCharacterId === h.nodeId) continue
    indegree.set(h.nodeId, (indegree.get(h.nodeId) ?? 0) + 1)
    outgoing.get(h.dependsOnCharacterId)?.push(h.nodeId)
  }
  const queue = hooks
    .filter((h) => (indegree.get(h.nodeId) ?? 0) === 0)
    .sort((a, b) => a.order - b.order)
    .map((h) => h.nodeId)
  const orderedIds: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    orderedIds.push(id)
    for (const next of outgoing.get(id) ?? []) {
      const nextDeg = (indegree.get(next) ?? 0) - 1
      indegree.set(next, nextDeg)
      if (nextDeg === 0) queue.push(next)
    }
    queue.sort((a, b) => (byId.get(a)?.order ?? 0) - (byId.get(b)?.order ?? 0))
  }
  if (orderedIds.length < hooks.length) {
    const added = new Set(orderedIds)
    hooks
      .filter((h) => !added.has(h.nodeId))
      .sort((a, b) => a.order - b.order)
      .forEach((h) => orderedIds.push(h.nodeId))
  }
  return orderedIds.map((id) => byId.get(id)!).filter(Boolean)
}

export function useFlowAnimation(): FlowAnimationAPI {
  const {
    nodes,
    edges,
    setNodeAnimationState,
    resetAllAnimationStates,
    setPlaybackRunning,
    setPlaybackPhase,
    setActiveCharacterHookNodeIds,
  } = useFlowStore()

  const [status, setStatus]           = useState<AnimationStatus>('idle')
  const [speed, setSpeed]             = useState<AnimationSpeed>(1)
  const [activeEdges, setActiveEdges] = useState<ActiveEdge[]>([])

  // Mutable refs so callbacks always see fresh values
  const stepsRef      = useRef<AnimationStep[]>([])
  const stepIndexRef  = useRef(0)
  const statusRef     = useRef<AnimationStatus>('idle')
  const speedRef      = useRef<AnimationSpeed>(1)
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prePlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const afterHookTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hookTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const edgeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearCharacterHookTimers = useCallback(() => {
    for (const timer of hookTimersRef.current) clearTimeout(timer)
    hookTimersRef.current = []
  }, [])

  const runCharacterHookPhase = useCallback((
    phase: 'before' | 'after',
    onComplete: () => void,
  ) => {
    clearCharacterHookTimers()
    const orderedHooks = orderHooksByDependency(getCharacterHooksForPhase(nodes, phase))
    if (orderedHooks.length === 0) {
      setActiveCharacterHookNodeIds([])
      onComplete()
      return
    }
    setPlaybackPhase(phase)
    setActiveCharacterHookNodeIds([])
    let cursorMs = 0
    for (const hook of orderedHooks) {
      const activateTimer = setTimeout(() => {
        setActiveCharacterHookNodeIds([hook.nodeId])
      }, cursorMs)
      hookTimersRef.current.push(activateTimer)
      cursorMs += hook.durationMs
    }
    const doneTimer = setTimeout(() => {
      setActiveCharacterHookNodeIds([])
      onComplete()
    }, cursorMs)
    hookTimersRef.current.push(doneTimer)
  }, [clearCharacterHookTimers, nodes, setActiveCharacterHookNodeIds, setPlaybackPhase])

  // Keep refs in sync
  useEffect(() => { statusRef.current = status }, [status])
  useEffect(() => { speedRef.current  = speed  }, [speed])

  // ── Step executor ──────────────────────────────────────────────────────────

  const executeStep = useCallback(() => {
    if (statusRef.current !== 'playing') return

    const steps = stepsRef.current
    const idx   = stepIndexRef.current

    if (idx >= steps.length) {
      // Done
      setStatus('done')
      setPlaybackRunning(false)
      setActiveEdges([])
      runCharacterHookPhase('after', () => {
        setPlaybackPhase('idle')
      })
      return
    }

    const step = steps[idx]
    stepIndexRef.current = idx + 1

    const scaledDuration = (ms: number) => ms / speedRef.current
    const clearEdgeTimers = () => {
      for (const timer of edgeTimersRef.current) clearTimeout(timer)
      edgeTimersRef.current = []
    }
    const markSignalReceived = (nodeId: string) => {
      const node = useFlowStore.getState().nodes.find((n) => n.id === nodeId)
      if (!node) return
      const state = node.data.animationState ?? 'idle'
      if (state === 'idle') setNodeAnimationState(nodeId, 'active')
    }
    const clearSignalReceived = (nodeId: string) => {
      const node = useFlowStore.getState().nodes.find((n) => n.id === nodeId)
      if (!node) return
      const state = node.data.animationState ?? 'idle'
      if (state === 'active') setNodeAnimationState(nodeId, 'idle')
    }
    const getEdgeDurationMs = (edgeId: string, fallbackMs: number) => {
      const edge = useFlowStore.getState().edges.find((e) => e.id === edgeId)
      const speed = typeof edge?.data?.travelSpeed === 'number' ? edge.data.travelSpeed : 1
      const safeSpeed = Math.max(0.25, Math.min(3, speed))
      return scaledDuration(fallbackMs / safeSpeed)
    }

    switch (step.type) {

      case 'activate-node':
        setNodeAnimationState(step.nodeId, 'processing')
        timerRef.current = setTimeout(executeStep, scaledDuration(step.duration))
        break

      case 'activate-nodes':
        for (const nodeId of step.nodeIds) {
          setNodeAnimationState(nodeId, 'processing')
        }
        timerRef.current = setTimeout(executeStep, scaledDuration(step.duration))
        break

      case 'traverse-edge': {
        markSignalReceived(step.targetNodeId)
        const duration = getEdgeDurationMs(step.edgeId, step.duration)
        const entry: ActiveEdge = {
          edgeId:   step.edgeId,
          color:    step.color,
          duration,
        }
        setActiveEdges((prev) => [...prev, entry])
        clearEdgeTimers()
        timerRef.current = setTimeout(() => {
          setActiveEdges((prev) => prev.filter((e) => e.edgeId !== step.edgeId))
          clearSignalReceived(step.targetNodeId)
          executeStep()
        }, duration)
        break
      }

      case 'traverse-edges': {
        clearEdgeTimers()
        const entries: ActiveEdge[] = step.edges.map((edge) => ({
          edgeId: edge.edgeId,
          color: edge.color,
          duration: getEdgeDurationMs(edge.edgeId, step.duration),
        }))
        const maxDuration = entries.reduce((max, edge) => Math.max(max, edge.duration), 0)
        const targetNodeIds = [...new Set(step.edges.map((edge) => edge.targetNodeId))]

        for (const edge of step.edges) markSignalReceived(edge.targetNodeId)
        setActiveEdges((prev) => [...prev, ...entries])
        for (let i = 0; i < entries.length; i += 1) {
          const edge = entries[i]
          const removalTimer = setTimeout(() => {
            setActiveEdges((prev) => prev.filter((existing) => existing.edgeId !== edge.edgeId))
          }, edge.duration)
          edgeTimersRef.current.push(removalTimer)
        }
        timerRef.current = setTimeout(() => {
          for (const nodeId of targetNodeIds) clearSignalReceived(nodeId)
          executeStep()
        }, maxDuration)
        break
      }

      case 'deactivate-node':
        setNodeAnimationState(step.nodeId, 'done')
        executeStep()   // immediate — no delay
        break

      case 'pause':
        timerRef.current = setTimeout(executeStep, scaledDuration(step.duration))
        break
    }
  }, [runCharacterHookPhase, setNodeAnimationState, setPlaybackPhase, setPlaybackRunning])

  // ── Controls ───────────────────────────────────────────────────────────────

  const play = useCallback(() => {
    if (statusRef.current === 'done' || statusRef.current === 'idle') {
      // Fresh run
      resetAllAnimationStates()
      setActiveEdges([])
      const { nodes: aiNodes, edges: aiEdges } = filterGraphForAI(nodes, edges)
      stepsRef.current   = sequenceFlow(aiNodes, aiEdges)
      stepIndexRef.current = 0
    }
    setStatus('playing')
    statusRef.current = 'playing'
    setPlaybackRunning(true)
    if (afterHookTimerRef.current) clearTimeout(afterHookTimerRef.current)
    runCharacterHookPhase('before', () => {
      if (statusRef.current !== 'playing') return
      setPlaybackPhase('running')
      executeStep()
    })
  }, [nodes, edges, resetAllAnimationStates, runCharacterHookPhase, setPlaybackPhase, setPlaybackRunning, executeStep])

  const playFrom = useCallback((nodeId: string) => {
    resetAllAnimationStates()
    setActiveEdges([])
    const { nodes: aiNodes, edges: aiEdges } = filterGraphForAI(nodes, edges)
    stepsRef.current     = sequenceFlowFrom(aiNodes, aiEdges, nodeId)
    stepIndexRef.current = 0
    setStatus('playing')
    statusRef.current    = 'playing'
    setPlaybackRunning(true)
    if (afterHookTimerRef.current) clearTimeout(afterHookTimerRef.current)
    runCharacterHookPhase('before', () => {
      if (statusRef.current !== 'playing') return
      setPlaybackPhase('running')
      executeStep()
    })
  }, [nodes, edges, resetAllAnimationStates, runCharacterHookPhase, setPlaybackPhase, setPlaybackRunning, executeStep])

  const pause = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (prePlayTimerRef.current) clearTimeout(prePlayTimerRef.current)
    if (afterHookTimerRef.current) clearTimeout(afterHookTimerRef.current)
    clearCharacterHookTimers()
    for (const timer of edgeTimersRef.current) clearTimeout(timer)
    edgeTimersRef.current = []
    setStatus('paused')
    statusRef.current = 'paused'
    setPlaybackRunning(false)
    setPlaybackPhase('idle')
    setActiveCharacterHookNodeIds([])
  }, [clearCharacterHookTimers, setActiveCharacterHookNodeIds, setPlaybackPhase, setPlaybackRunning])

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (prePlayTimerRef.current) clearTimeout(prePlayTimerRef.current)
    if (afterHookTimerRef.current) clearTimeout(afterHookTimerRef.current)
    clearCharacterHookTimers()
    for (const timer of edgeTimersRef.current) clearTimeout(timer)
    edgeTimersRef.current = []
    setStatus('idle')
    statusRef.current    = 'idle'
    setPlaybackRunning(false)
    setPlaybackPhase('idle')
    setActiveCharacterHookNodeIds([])
    stepIndexRef.current = 0
    stepsRef.current     = []
    setActiveEdges([])
    resetAllAnimationStates()
  }, [clearCharacterHookTimers, resetAllAnimationStates, setActiveCharacterHookNodeIds, setPlaybackPhase, setPlaybackRunning])

  const handleSetSpeed = useCallback((s: AnimationSpeed) => {
    setSpeed(s)
    speedRef.current = s
  }, [])

  // Cleanup on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (prePlayTimerRef.current) clearTimeout(prePlayTimerRef.current)
    if (afterHookTimerRef.current) clearTimeout(afterHookTimerRef.current)
    clearCharacterHookTimers()
    for (const timer of edgeTimersRef.current) clearTimeout(timer)
  }, [clearCharacterHookTimers])

  return { status, speed, activeEdges, play, playFrom, pause, reset, setSpeed: handleSetSpeed }
}
