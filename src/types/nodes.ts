import type { ComponentType } from 'react'
import type { IconProps } from '../components/icons'

// ── Port types ────────────────────────────────────────────────────────────────

export type PortType =
  | 'text'
  | 'embedding'
  | 'tool-call'
  | 'memory'
  | 'structured'
  | 'any'

export interface PortDefinition {
  id: string
  label: string
  type: PortType
  color?: string
}

export type NotePlacement = 'auto' | 'right' | 'bottom'

// ── Config field definitions ──────────────────────────────────────────────────

export type ConfigFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'boolean'
  | 'slider'

export interface SelectOption {
  label: string
  value: string
}

export interface ConfigField {
  key: string
  label: string
  type: ConfigFieldType
  defaultValue: string | number | boolean
  placeholder?: string
  options?: SelectOption[]     // for 'select' type
  min?: number                 // for 'number' / 'slider'
  max?: number
  step?: number
  description?: string
}

// ── Node definition (static metadata, not instance data) ─────────────────────

export interface NodeDefinition {
  /** Matches the key in React Flow's nodeTypes map */
  type: string
  label: string
  /** Hex accent color used for header gradient and port highlights */
  accentColor: string
  /** Icon component — must accept { size, className } */
  icon: ComponentType<IconProps>
  inputs: PortDefinition[]
  outputs: PortDefinition[]
  configFields: ConfigField[]
  /** Short description shown in the sidebar palette */
  description: string
  /** Sidebar category for grouping */
  category: 'core' | 'data' | 'flow' | 'tool' | 'output' | 'eval'
}

// ── Per-node config data (stored in React Flow node.data) ────────────────────

export interface BaseNodeData {
  /** Back-reference to NodeDefinition type */
  nodeType: string
  /** Display label (can be renamed by user) */
  label: string
  /** Optional accent color override for this specific node instance. */
  accentColor?: string
  /** Freeform config values keyed by ConfigField.key */
  config: Record<string, string | number | boolean>
  /** Animation state for Phase 2 */
  animationState?: 'idle' | 'active' | 'processing' | 'done' | 'error'
  /** Optional markdown note shown beside the node during animation playback */
  note?: string
  /** If true, note is always visible — not just during playback */
  noteAlwaysVisible?: boolean
  /** Optional placement override for the rendered note card. */
  notePlacement?: NotePlacement
}

// ── Typed data shapes per node type ──────────────────────────────────────────

export interface LLMNodeConfig {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  streaming: boolean
}

export interface PromptTemplateNodeConfig {
  template: string
  inputVariables: string
}

export interface VectorDBNodeConfig {
  provider: string
  indexName: string
  topK: number
  similarityThreshold: number
}

export interface FrameNodeConfig {
  title: string
  width: number
  height: number
}

export interface TextNodeConfig {
  content: string
  width: number
  height: number
  fontSize: number
}
