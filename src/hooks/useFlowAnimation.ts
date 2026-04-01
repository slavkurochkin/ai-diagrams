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
  const { nodes, edges, setNodeAnimationState, resetAllAnimationStates } = useFlowStore()

  const [status, setStatus]           = useState<AnimationStatus>('idle')
  const [speed, setSpeed]             = useState<AnimationSpeed>(1)
  const [activeEdges, setActiveEdges] = useState<ActiveEdge[]>([])

  // Mutable refs so callbacks always see fresh values
  const stepsRef      = useRef<AnimationStep[]>([])
  const stepIndexRef  = useRef(0)
  const statusRef     = useRef<AnimationStatus>('idle')
  const speedRef      = useRef<AnimationSpeed>(1)
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      setActiveEdges([])
      return
    }

    const step = steps[idx]
    stepIndexRef.current = idx + 1

    const scaledDuration = (ms: number) => ms / speedRef.current

    switch (step.type) {

      case 'activate-node':
        setNodeAnimationState(step.nodeId, 'processing')
        timerRef.current = setTimeout(executeStep, scaledDuration(step.duration))
        break

      case 'traverse-edge': {
        const entry: ActiveEdge = {
          edgeId:   step.edgeId,
          color:    step.color,
          duration: scaledDuration(step.duration),
        }
        setActiveEdges((prev) => [...prev, entry])
        timerRef.current = setTimeout(() => {
          setActiveEdges((prev) => prev.filter((e) => e.edgeId !== step.edgeId))
          executeStep()
        }, scaledDuration(step.duration))
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
    executeStep()
  }, [nodes, edges, resetAllAnimationStates, executeStep])

  const pause = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setStatus('paused')
    statusRef.current = 'paused'
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setStatus('idle')
    statusRef.current    = 'idle'
    stepIndexRef.current = 0
    stepsRef.current     = []
    setActiveEdges([])
    resetAllAnimationStates()
  }, [resetAllAnimationStates])

  const handleSetSpeed = useCallback((s: AnimationSpeed) => {
    setSpeed(s)
    speedRef.current = s
  }, [])

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return { status, speed, activeEdges, play, pause, reset, setSpeed: handleSetSpeed }
}
