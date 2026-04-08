import { useState, useRef, useCallback, useEffect } from 'react'
import { useFlowStore } from './useFlowStore'
import { sequenceFlow } from '../lib/animationSequencer'
import type { AnimationStatus, AnimationSpeed, AnimationStep } from '../types/animation'

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
  pause: () => void
  reset: () => void
  setSpeed: (s: AnimationSpeed) => void
}

export function useFlowAnimation(): FlowAnimationAPI {
  const {
    nodes,
    edges,
    setNodeAnimationState,
    resetAllAnimationStates,
    setPlaybackRunning,
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
  const edgeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

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
  }, [setNodeAnimationState])

  // ── Controls ───────────────────────────────────────────────────────────────

  const play = useCallback(() => {
    if (statusRef.current === 'done' || statusRef.current === 'idle') {
      // Fresh run
      resetAllAnimationStates()
      setActiveEdges([])
      stepsRef.current   = sequenceFlow(nodes, edges)
      stepIndexRef.current = 0
    }
    setStatus('playing')
    statusRef.current = 'playing'
    setPlaybackRunning(true)
    executeStep()
  }, [nodes, edges, resetAllAnimationStates, setPlaybackRunning, executeStep])

  const pause = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    for (const timer of edgeTimersRef.current) clearTimeout(timer)
    edgeTimersRef.current = []
    setStatus('paused')
    statusRef.current = 'paused'
    setPlaybackRunning(false)
  }, [setPlaybackRunning])

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    for (const timer of edgeTimersRef.current) clearTimeout(timer)
    edgeTimersRef.current = []
    setStatus('idle')
    statusRef.current    = 'idle'
    setPlaybackRunning(false)
    stepIndexRef.current = 0
    stepsRef.current     = []
    setActiveEdges([])
    resetAllAnimationStates()
  }, [resetAllAnimationStates, setPlaybackRunning])

  const handleSetSpeed = useCallback((s: AnimationSpeed) => {
    setSpeed(s)
    speedRef.current = s
  }, [])

  // Cleanup on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    for (const timer of edgeTimersRef.current) clearTimeout(timer)
  }, [])

  return { status, speed, activeEdges, play, pause, reset, setSpeed: handleSetSpeed }
}
