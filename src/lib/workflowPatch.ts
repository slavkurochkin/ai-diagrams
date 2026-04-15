import type { ConfigField } from '../types/nodes'
import { buildDefaultConfig, getAllNodeDefinitions, getNodeDefinition } from './nodeDefinitions'

// ── Wire format (API / tool output) ───────────────────────────────────────────

export interface SerializedNode {
  id: string
  nodeType: string
  label: string
  config: Record<string, unknown>
}

export interface SerializedEdge {
  id: string
  source: string
  sourceHandle: string | null
  target: string
  targetHandle: string | null
}

export type WorkflowPatch =
  | {
      op: 'addNode'
      id: string
      nodeType: string
      label?: string
      config?: Record<string, unknown>
      position?: { x: number; y: number }
    }
  | { op: 'removeNode'; id: string }
  | {
      op: 'addEdge'
      id: string
      source: string
      sourceHandle: string | null
      target: string
      targetHandle: string | null
    }
  | { op: 'removeEdge'; id: string }
  | { op: 'setNodeConfig'; nodeId: string; config: Record<string, unknown>; merge?: boolean }
  | { op: 'setNodeLabel'; nodeId: string; label: string }

type SimNode = SerializedNode
type SimEdge = SerializedEdge

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** When addNode uses an id that already exists, assign a new id (models often reuse e.g. "frame"). */
function allocateUniqueAddNodeId(preferred: string, nodes: Map<string, SimNode>): string {
  const slug = preferred.trim().replace(/[^a-zA-Z0-9-_]/g, '') || 'node'
  for (let i = 0; i < 32; i++) {
    const candidate = `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    if (!nodes.has(candidate)) return candidate
  }
  return `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

function applyBatchNodeIdRewrite(ref: string, rewrites: Map<string, string>): string {
  return rewrites.get(ref) ?? ref
}

/** Omitted / null → null (resolved to real port ids later). Reject non-string values. */
function parseNullableHandle(
  raw: unknown,
  field: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, value: null }
  if (typeof raw === 'string') return { ok: true, value: raw }
  return { ok: false, error: `${field} must be a string, null, or omitted` }
}

function parsePatch(raw: unknown): { ok: true; patch: WorkflowPatch } | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: 'patch must be an object' }
  const op = raw.op
  if (typeof op !== 'string') return { ok: false, error: 'missing op' }

  if (op === 'addNode') {
    const id = raw.id
    const nodeType = raw.nodeType
    if (typeof id !== 'string' || !id) return { ok: false, error: 'addNode requires non-empty id' }
    if (typeof nodeType !== 'string' || !nodeType) return { ok: false, error: 'addNode requires nodeType' }
    const label = raw.label
    const config = raw.config
    const position = raw.position
    if (label !== undefined && typeof label !== 'string') return { ok: false, error: 'label must be a string' }
    if (config !== undefined && !isRecord(config)) return { ok: false, error: 'config must be an object' }
    let pos: { x: number; y: number } | undefined
    if (position !== undefined) {
      if (!isRecord(position)) return { ok: false, error: 'position must be an object' }
      if (typeof position.x !== 'number' || typeof position.y !== 'number') {
        return { ok: false, error: 'position requires numeric x and y' }
      }
      pos = { x: position.x, y: position.y }
    }
    return {
      ok: true,
      patch: {
        op: 'addNode',
        id,
        nodeType,
        ...(typeof label === 'string' ? { label } : {}),
        ...(config ? { config } : {}),
        ...(pos ? { position: pos } : {}),
      },
    }
  }

  if (op === 'removeNode') {
    const id = raw.id
    if (typeof id !== 'string' || !id) return { ok: false, error: 'removeNode requires id' }
    return { ok: true, patch: { op: 'removeNode', id } }
  }

  if (op === 'addEdge') {
    const id = typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const source = raw.source
    const target = raw.target
    if (typeof source !== 'string' || !source) return { ok: false, error: 'addEdge requires source' }
    if (typeof target !== 'string' || !target) return { ok: false, error: 'addEdge requires target' }
    const sh = parseNullableHandle(raw.sourceHandle, 'sourceHandle')
    if (!sh.ok) return { ok: false, error: sh.error }
    const th = parseNullableHandle(raw.targetHandle, 'targetHandle')
    if (!th.ok) return { ok: false, error: th.error }
    return {
      ok: true,
      patch: { op: 'addEdge', id, source, sourceHandle: sh.value, target, targetHandle: th.value },
    }
  }

  if (op === 'removeEdge') {
    const id = raw.id
    if (typeof id !== 'string' || !id) return { ok: false, error: 'removeEdge requires id' }
    return { ok: true, patch: { op: 'removeEdge', id } }
  }

  if (op === 'setNodeConfig') {
    const nodeId = raw.nodeId
    const config = raw.config
    if (typeof nodeId !== 'string' || !nodeId) return { ok: false, error: 'setNodeConfig requires nodeId' }
    if (!isRecord(config)) return { ok: false, error: 'setNodeConfig requires config object' }
    const merge = raw.merge
    if (merge !== undefined && typeof merge !== 'boolean') return { ok: false, error: 'merge must be boolean' }
    return { ok: true, patch: { op: 'setNodeConfig', nodeId, config, ...(merge === true ? { merge: true } : {}) } }
  }

  if (op === 'setNodeLabel') {
    const nodeId = raw.nodeId
    const label = raw.label
    if (typeof nodeId !== 'string' || !nodeId) return { ok: false, error: 'setNodeLabel requires nodeId' }
    if (typeof label !== 'string' || !label) return { ok: false, error: 'setNodeLabel requires non-empty label' }
    return { ok: true, patch: { op: 'setNodeLabel', nodeId, label } }
  }

  return { ok: false, error: `unknown op "${op}"` }
}

function coerceConfigValue(
  field: ConfigField,
  value: unknown,
): { ok: true; value: string | number | boolean } | { ok: false; error: string } {
  switch (field.type) {
    case 'text':
    case 'textarea':
      if (typeof value === 'string') return { ok: true, value }
      if (value === null || value === undefined) return { ok: false, error: 'expected string' }
      return { ok: true, value: String(value) }
    case 'number':
    case 'slider': {
      if (typeof value === 'number' && !Number.isNaN(value)) return { ok: true, value }
      if (typeof value === 'string' && value.trim() !== '') {
        const n = Number(value)
        if (!Number.isNaN(n)) return { ok: true, value: n }
      }
      return { ok: false, error: 'expected number' }
    }
    case 'boolean':
      if (typeof value === 'boolean') return { ok: true, value }
      return { ok: false, error: 'expected boolean' }
    case 'select': {
      if (typeof value !== 'string') return { ok: false, error: 'expected string for select' }
      if (value === 'default') return { ok: true, value: String(field.defaultValue) }
      const allowed = field.options?.map((o) => o.value) ?? []
      if (allowed.length > 0 && !allowed.includes(value)) {
        return { ok: false, error: `invalid select value "${value}"` }
      }
      return { ok: true, value }
    }
    case 'color':
      if (typeof value === 'string') return { ok: true, value }
      return { ok: false, error: 'expected color string' }
    default:
      return { ok: false, error: 'unsupported field type' }
  }
}

/**
 * Common LLM key aliases seen in patch outputs.
 * Keep this conservative: map only clear synonyms.
 */
const DROPPED_CONFIG_KEY = '__drop__'

const CONFIG_KEY_ALIASES: Record<string, string> = {
  sourceType: 'source',
  source_type: 'source',
  sources: 'source',
  inputSourceType: 'source',
  input_source_type: 'source',
  inputType: 'source',
  input_type: 'source',
  fileType: 'source',
  fileTypes: DROPPED_CONFIG_KEY,
  filePath: 'path',
  filepath: 'path',
  sourcePath: 'path',
  urlPath: 'path',
  indexType: 'indexName',
  retrievalCount: 'topK',
}

/**
 * Node-specific aliases are applied after global aliases so they can
 * intentionally override mappings when the same key exists across node types.
 */
const CONFIG_KEY_ALIASES_BY_NODE_TYPE: Record<string, Record<string, string>> = {
  dataLoader: {
    // Models often use "type" for file vs URL vs DB; our schema uses `source`.
    type: 'source',
    loaderType: 'source',
    loader_type: 'source',
    dataType: 'source',
    data_type: 'source',
    ingestType: 'source',
    ingest_type: 'source',
    // Common LLM output; our dataLoader doesn't expose a formats field.
    formats: DROPPED_CONFIG_KEY,
    format: DROPPED_CONFIG_KEY,
    // LLMs often send a file list; we only have a single path field.
    files: 'path',
    fileList: 'path',
    paths: 'path',
  },
  vectorDB: {
    persistent: DROPPED_CONFIG_KEY,
    persist: DROPPED_CONFIG_KEY,
    durability: DROPPED_CONFIG_KEY,
  },
  chunker: {
    method: 'strategy',
    chunkMethod: 'strategy',
    splitMethod: 'strategy',
  },
  retriever: {
    retrievalStrategy: 'strategy',
    retrievalMode: 'strategy',
    searchStrategy: 'strategy',
  },
  // Text→vector Embedding node (not vector DB): models often copy a "provider" field from LLMs.
  embedding: {
    provider: DROPPED_CONFIG_KEY,
    vendor: DROPPED_CONFIG_KEY,
    embeddingProvider: DROPPED_CONFIG_KEY,
  },
  llm: {
    provider: 'model',
  },
}

function applyConfigAliases(
  nodeType: string,
  config: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const typeAliases = CONFIG_KEY_ALIASES_BY_NODE_TYPE[nodeType] ?? {}
  for (const [k, v] of Object.entries(config)) {
    const mapped = typeAliases[k] ?? CONFIG_KEY_ALIASES[k] ?? k
    if (mapped === DROPPED_CONFIG_KEY) continue
    let val: unknown = v
    if (nodeType === 'dataLoader' && mapped === 'path') {
      if (Array.isArray(val)) {
        val = val.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(', ')
      } else if (val !== null && val !== undefined && typeof val === 'object') {
        val = JSON.stringify(val)
      }
    }
    // Explicit key in payload wins over alias collisions.
    if (out[mapped] === undefined || k === mapped) out[mapped] = val
  }
  return out
}

const SELECT_VALUE_ALIASES: Record<string, Record<string, Record<string, string>>> = {
  embedding: {
    model: {
      'openai-embedding': 'text-embedding-3-small',
      'openai-ada': 'text-embedding-3-small',
      'text-embedding-ada-002': 'text-embedding-3-small',
      // Prompt / tutorial placeholders from workflow-build models
      'example-embedding-model': 'text-embedding-3-small',
      'example_embedding_model': 'text-embedding-3-small',
      'placeholder-embedding': 'text-embedding-3-small',
      'embedding-model': 'text-embedding-3-small',
    },
  },
  llm: {
    model: {
      openai: 'gpt-4o',
      'gpt-4': 'gpt-4o',
      'gpt-4-turbo': 'gpt-4o',
      'gpt-4-1106-preview': 'gpt-4o',
      'text-davinci-003': 'gpt-4o',
      'gpt-3.5-turbo': 'gpt-4o',
      anthropic: 'claude-3-5-sonnet-20241022',
      google: 'gemini-1.5-pro',
      'example-llm-model': 'gpt-4o',
      example_llm_model: 'gpt-4o',
      'placeholder-llm': 'gpt-4o',
      'llm-model': 'gpt-4o',
    },
  },
  retriever: {
    strategy: {
      semantic: 'similarity',
      dense: 'similarity',
      vector: 'similarity',
      bm25: 'hybrid',
      hybrid_search: 'hybrid',
    },
  },
  dataLoader: {
    source: {
      // File-ish synonyms (PDF loaders, local dirs, etc.)
      pdf: 'file',
      directory: 'file',
      dir: 'file',
      local: 'file',
      disk: 'file',
      filesystem: 'file',
      'file-system': 'file',
      folder: 'file',
      upload: 'file',
      unstructured: 'file',
      // Web-ish
      http: 'url',
      https: 'url',
      web: 'url',
      link: 'url',
      website: 'url',
      // DB-ish
      postgres: 'database',
      postgresql: 'database',
      mysql: 'database',
      sql: 'database',
      db: 'database',
      rds: 'database',
      // Cloud object storage
      aws: 's3',
      bucket: 's3',
      objectstorage: 's3',
      'object-storage': 's3',
    },
  },
}

/** Merge with defaults and coerce every declared config field. */
function normalizeFullConfigForNodeType(
  nodeType: string,
  config: Record<string, unknown>,
): { ok: true; config: Record<string, string | number | boolean> } | { ok: false; error: string } {
  const def = getNodeDefinition(nodeType)
  if (!def) return { ok: false, error: `unknown nodeType "${nodeType}"` }
  const normalizedInput = applyConfigAliases(nodeType, config)
  for (const key of Object.keys(normalizedInput)) {
    if (!def.configFields.some((f) => f.key === key)) {
      return { ok: false, error: `unknown config key "${key}" for ${nodeType}` }
    }
  }
  const out: Record<string, string | number | boolean> = {}
  for (const field of def.configFields) {
    const rawVal = normalizedInput[field.key]
    if (rawVal === undefined) {
      out[field.key] = field.defaultValue
      continue
    }
    const rawAliasesForNode = SELECT_VALUE_ALIASES[nodeType]?.[field.key]
    const valueForField =
      field.type === 'select' && typeof rawVal === 'string'
        ? (rawAliasesForNode?.[rawVal] ??
            rawAliasesForNode?.[rawVal.toLowerCase()] ??
            rawVal)
        : rawVal
    const coerced = coerceConfigValue(field, valueForField)
    if (!coerced.ok) return { ok: false, error: `config.${field.key}: ${coerced.error}` }
    out[field.key] = coerced.value
  }
  return { ok: true, config: out }
}

function portIds(
  nodeType: string,
  kind: 'inputs' | 'outputs',
): string[] {
  const def = getNodeDefinition(nodeType)
  if (!def) return []
  return def[kind].map((p) => p.id)
}

/** Prefer these when the model omits handles (multi-port nodes). Order matters. */
const OUTPUT_HANDLE_PREFS = [
  'store',
  'documents',
  'response',
  'text',
  'passed',
  'label',
  'merged',
  'structured',
  'chunks',
  'output',
  'score',
  'feedback',
  'routeA',
  'routeB',
  'default',
  'value',
  'embedding',
  'hit',
  'confidence',
]
const INPUT_HANDLE_PREFS = [
  'store',
  'prompt',
  'query',
  'input',
  'text',
  'key',
  'user',
  'message',
  'documents',
  'memory',
  'embedding',
  'tools',
  'response',
]

const HANDLE_ALIASES_BY_NODE_TYPE: Record<string, { inputs?: Record<string, string>; outputs?: Record<string, string> }> = {
  vectorDB: {
    // Common model confusion: "store" is a vectorDB output, not an input.
    inputs: {
      store: 'embedding',
      vector: 'embedding',
      vectors: 'embedding',
      index: 'embedding',
    },
  },
  guardrails: {
    outputs: {
      output: 'passed',
      out: 'passed',
      result: 'passed',
      response: 'passed',
    },
  },
  outputParser: {
    inputs: {
      input: 'text',
      raw: 'text',
      content: 'text',
    },
    outputs: {
      output: 'structured',
      out: 'structured',
      result: 'structured',
      parsed: 'structured',
      json: 'structured',
    },
  },
  llm: {
    inputs: {
      input: 'prompt',
      message: 'prompt',
      user: 'prompt',
      text: 'prompt',
    },
  },
}

/**
 * For these types, an invalid explicit handle must not be swapped to another port
 * (would pick the wrong branch).
 */
const NO_GUESS_OUTPUT_HANDLE_FOR_TYPE = new Set(['router', 'classifier'])

/** Multi-input nodes where guessing would often attach to the wrong port. */
const NO_GUESS_INPUT_HANDLE_FOR_TYPE = new Set(['retriever', 'llm', 'agent'])

function guessLlmOutputHandle(nodeType: string, outIds: string[]): string | null {
  if (NO_GUESS_OUTPUT_HANDLE_FOR_TYPE.has(nodeType)) return null
  const hit = OUTPUT_HANDLE_PREFS.find((p) => outIds.includes(p))
  if (hit) return hit
  return outIds.length === 1 ? outIds[0] : null
}

function guessLlmInputHandle(nodeType: string, inIds: string[]): string | null {
  if (NO_GUESS_INPUT_HANDLE_FOR_TYPE.has(nodeType)) return null
  const hit = INPUT_HANDLE_PREFS.find((p) => inIds.includes(p))
  if (hit) return hit
  return inIds.length === 1 ? inIds[0] : null
}

function applyHandleAlias(
  nodeType: string,
  kind: 'inputs' | 'outputs',
  handle: string,
): string {
  const aliases = kind === 'inputs'
    ? HANDLE_ALIASES_BY_NODE_TYPE[nodeType]?.inputs
    : HANDLE_ALIASES_BY_NODE_TYPE[nodeType]?.outputs
  if (!aliases) return handle
  return aliases[handle] ?? aliases[handle.toLowerCase()] ?? handle
}

/**
 * Turn null/omitted handles into concrete port ids so React Flow edges attach to real handles.
 */
export function resolveEdgeHandles(
  srcType: string,
  tgtType: string,
  sourceHandle: string | null,
  targetHandle: string | null,
): { ok: true; sourceHandle: string; targetHandle: string } | { ok: false; error: string } {
  const outIds = portIds(srcType, 'outputs')
  const inIds = portIds(tgtType, 'inputs')
  if (outIds.length === 0) return { ok: false, error: `source type "${srcType}" has no outputs` }
  if (inIds.length === 0) return { ok: false, error: `target type "${tgtType}" has no inputs` }

  let sh: string
  if (sourceHandle !== null) {
    const mapped = applyHandleAlias(srcType, 'outputs', sourceHandle)
    if (outIds.includes(mapped)) {
      sh = mapped
    } else {
      const guess = guessLlmOutputHandle(srcType, outIds)
      if (guess === null) {
        return { ok: false, error: `invalid sourceHandle "${sourceHandle}" for ${srcType}` }
      }
      sh = guess
    }
  } else if (outIds.length === 1) {
    sh = outIds[0]
  } else {
    sh = OUTPUT_HANDLE_PREFS.find((p) => outIds.includes(p)) ?? outIds[0]
  }

  let th: string
  if (targetHandle !== null) {
    const mapped = applyHandleAlias(tgtType, 'inputs', targetHandle)
    if (inIds.includes(mapped)) {
      th = mapped
    } else {
      const guess = guessLlmInputHandle(tgtType, inIds)
      if (guess === null) {
        return { ok: false, error: `invalid targetHandle "${targetHandle}" for ${tgtType}` }
      }
      th = guess
    }
  } else if (inIds.length === 1) {
    th = inIds[0]
  } else {
    th = INPUT_HANDLE_PREFS.find((p) => inIds.includes(p)) ?? inIds[0]
  }

  return { ok: true, sourceHandle: sh, targetHandle: th }
}

/** Normalized ref token → canonical nodeType token (normalize()) for fuzzy resolution. */
const NODE_REF_ALIASES: Record<string, string> = {
  pdfloader: 'dataloader',
  fileloader: 'dataloader',
  loader: 'dataloader',
  embedder: 'embedding',
  embeddings: 'embedding',
  vectordatabase: 'vectordb',
  vectorstore: 'vectordb',
  vectorindex: 'vectordb',
}

function firstNodeIdByNormalizedType(nodes: Map<string, SimNode>, typeNorm: string): string | null {
  const candidates = Array.from(nodes.values())
    .filter((n) => n.nodeType.toLowerCase().replace(/[^a-z0-9]/g, '') === typeNorm)
    .sort((a, b) => a.id.localeCompare(b.id))
  return candidates.length > 0 ? candidates[0].id : null
}

let knownNodeTypeNorms: Set<string> | null = null
function normalizedRegisteredNodeTypes(): Set<string> {
  if (!knownNodeTypeNorms) {
    knownNodeTypeNorms = new Set(
      getAllNodeDefinitions().map((d) => d.type.toLowerCase().replace(/[^a-z0-9]/g, '')),
    )
  }
  return knownNodeTypeNorms
}

/** Put all addEdge ops last so target nodes exist when edges are validated (models often emit edges first). */
function reorderAddEdgesLast(patches: unknown[]): unknown[] {
  const nonEdge: unknown[] = []
  const edgeOps: unknown[] = []
  for (const p of patches) {
    if (isRecord(p) && p.op === 'addEdge') edgeOps.push(p)
    else nonEdge.push(p)
  }
  return [...nonEdge, ...edgeOps]
}

/**
 * Map model references (id, label, or nodeType when unique) to a concrete node id.
 */
export function resolveNodeRef(ref: string, nodes: Map<string, SimNode>): string | null {
  const t = ref.trim()
  if (!t) return null
  if (nodes.has(t)) return t

  const strippedNodeSuffix = t.replace(/node$/i, '')
  if (strippedNodeSuffix && strippedNodeSuffix !== t) {
    const viaStripped = resolveNodeRef(strippedNodeSuffix, nodes)
    if (viaStripped) return viaStripped
  }

  const lower = t.toLowerCase()
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const normRef = normalize(t)
  const aliasNormRef = NODE_REF_ALIASES[normRef]
  if (aliasNormRef && aliasNormRef !== normRef) {
    const viaAlias = resolveNodeRef(aliasNormRef, nodes)
    if (viaAlias) return viaAlias
    const first = firstNodeIdByNormalizedType(nodes, aliasNormRef)
    if (first) return first
  }
  const indexed = normRef.match(/^([a-z]+)(\d+)$/)
  let caseId: string | null = null
  for (const id of nodes.keys()) {
    if (id.toLowerCase() === lower) {
      if (caseId !== null && caseId !== id) return null
      caseId = id
    }
  }
  if (caseId) return caseId
  // relaxed id match: "pdfLoader" -> "pdf-loader"
  let normalizedId: string | null = null
  for (const id of nodes.keys()) {
    if (normalize(id) === normRef) {
      if (normalizedId !== null && normalizedId !== id) return null
      normalizedId = id
    }
  }
  if (normalizedId) return normalizedId

  const labelMatches: string[] = []
  for (const n of nodes.values()) {
    const lbl = n.label.trim()
    if (lbl.toLowerCase() === lower || lbl === t || normalize(lbl) === normRef) labelMatches.push(n.id)
  }
  if (labelMatches.length === 1) return labelMatches[0]

  const typeMatches: string[] = []
  for (const n of nodes.values()) {
    if (n.nodeType.toLowerCase() === lower || normalize(n.nodeType) === normRef) {
      typeMatches.push(n.id)
    }
  }
  if (typeMatches.length === 1) return typeMatches[0]

  // Bare type token (e.g. "dataLoader", "vectorDB", "llm"): pick first of that type when ambiguous.
  if (normalizedRegisteredNodeTypes().has(normRef)) {
    const first = firstNodeIdByNormalizedType(nodes, normRef)
    if (first) return first
  }

  // Fuzzy/semantic fallback: resolve unique partial matches across id/label/nodeType.
  const containsMatches = Array.from(nodes.values()).filter((n) => {
    const idNorm = normalize(n.id)
    const labelNorm = normalize(n.label)
    const typeNorm = normalize(n.nodeType)
    return (
      idNorm.includes(normRef) ||
      labelNorm.includes(normRef) ||
      typeNorm.includes(normRef) ||
      normRef.includes(idNorm) ||
      normRef.includes(labelNorm) ||
      normRef.includes(typeNorm)
    )
  })
  if (containsMatches.length === 1) return containsMatches[0].id

  // Accept refs like "dataLoader1" / "embedding2" by nodeType + 1-based index.
  if (indexed) {
    const refType = indexed[1]
    const refIndex = Number(indexed[2])
    if (Number.isFinite(refIndex) && refIndex >= 1) {
      const indexedMatches = Array.from(nodes.values())
        .filter((n) => normalize(n.nodeType) === refType)
        .sort((a, b) => a.id.localeCompare(b.id))
      if (indexedMatches.length >= refIndex) return indexedMatches[refIndex - 1].id
    }
  }

  return null
}

function validatePatchAgainstGraph(
  p: WorkflowPatch,
  nodes: Map<string, SimNode>,
  edges: Map<string, SimEdge>,
): string | null {
  if (p.op === 'addNode') {
    if (nodes.has(p.id)) return `node id "${p.id}" already exists`
    if (!getNodeDefinition(p.nodeType)) return `unknown nodeType "${p.nodeType}"`
    const base = { ...buildDefaultConfig(p.nodeType), ...(p.config ?? {}) } as Record<string, unknown>
    const n = normalizeFullConfigForNodeType(p.nodeType, base)
    if (!n.ok) return n.error
    return null
  }
  if (p.op === 'removeNode') {
    if (!nodes.has(p.id)) return `node "${p.id}" not found`
    return null
  }
  if (p.op === 'addEdge') {
    if (edges.has(p.id)) return `edge id "${p.id}" already exists`
    const src = nodes.get(p.source)
    const tgt = nodes.get(p.target)
    if (!src) return `source node "${p.source}" not found`
    if (!tgt) return `target node "${p.target}" not found`
    const outIds = portIds(src.nodeType, 'outputs')
    const inIds = portIds(tgt.nodeType, 'inputs')
    if (p.sourceHandle === null || !outIds.includes(p.sourceHandle)) {
      return p.sourceHandle === null
        ? `addEdge needs resolved sourceHandle for ${src.nodeType}`
        : `invalid sourceHandle "${p.sourceHandle}" for ${src.nodeType}`
    }
    if (p.targetHandle === null || !inIds.includes(p.targetHandle)) {
      return p.targetHandle === null
        ? `addEdge needs resolved targetHandle for ${tgt.nodeType}`
        : `invalid targetHandle "${p.targetHandle}" for ${tgt.nodeType}`
    }
    return null
  }
  if (p.op === 'removeEdge') {
    if (!edges.has(p.id)) return `edge "${p.id}" not found`
    return null
  }
  if (p.op === 'setNodeConfig') {
    const node = nodes.get(p.nodeId)
    if (!node) return `node "${p.nodeId}" not found`
    const merged: Record<string, unknown> =
      p.merge === false
        ? { ...buildDefaultConfig(node.nodeType), ...p.config }
        : { ...node.config, ...p.config }
    const n = normalizeFullConfigForNodeType(node.nodeType, merged)
    if (!n.ok) return n.error
    return null
  }
  if (p.op === 'setNodeLabel') {
    if (!nodes.has(p.nodeId)) return `node "${p.nodeId}" not found`
    return null
  }
  return 'invalid patch'
}

function applyPatchToSimulation(
  p: WorkflowPatch,
  nodes: Map<string, SimNode>,
  edges: Map<string, SimEdge>,
): void {
  if (p.op === 'addNode') {
    const base = { ...buildDefaultConfig(p.nodeType), ...(p.config ?? {}) } as Record<string, unknown>
    const n = normalizeFullConfigForNodeType(p.nodeType, base)
    const def = getNodeDefinition(p.nodeType)
    nodes.set(p.id, {
      id: p.id,
      nodeType: p.nodeType,
      label: p.label ?? def?.label ?? p.nodeType,
      config: (n.ok ? n.config : base) as Record<string, unknown>,
    })
    return
  }
  if (p.op === 'removeNode') {
    nodes.delete(p.id)
    for (const [eid, e] of edges) {
      if (e.source === p.id || e.target === p.id) edges.delete(eid)
    }
    return
  }
  if (p.op === 'addEdge') {
    edges.set(p.id, {
      id: p.id,
      source: p.source,
      sourceHandle: p.sourceHandle ?? null,
      target: p.target,
      targetHandle: p.targetHandle ?? null,
    })
    return
  }
  if (p.op === 'removeEdge') {
    edges.delete(p.id)
    return
  }
  if (p.op === 'setNodeConfig') {
    const node = nodes.get(p.nodeId)!
    const merged: Record<string, unknown> =
      p.merge === false
        ? { ...buildDefaultConfig(node.nodeType), ...p.config }
        : { ...node.config, ...p.config }
    const n = normalizeFullConfigForNodeType(node.nodeType, merged)
    if (n.ok) node.config = { ...n.config }
    return
  }
  if (p.op === 'setNodeLabel') {
    const node = nodes.get(p.nodeId)!
    node.label = p.label
  }
}

/**
 * Validates patches in order against an optional initial graph.
 * Only syntactically and semantically valid patches are returned; the rest yield error strings.
 */
export function validateWorkflowPatches(
  rawPatches: unknown[],
  initialNodes: SerializedNode[] = [],
  initialEdges: SerializedEdge[] = [],
): { validPatches: WorkflowPatch[]; errors: string[] } {
  const errors: string[] = []
  const validPatches: WorkflowPatch[] = []
  const nodes = new Map<string, SimNode>(
    initialNodes.map((n) => [n.id, { ...n, config: { ...n.config } }]),
  )
  const edges = new Map<string, SimEdge>(
    initialEdges.map((e) => [e.id, { ...e }]),
  )

  const orderedPatches = reorderAddEdgesLast(rawPatches)
  /** Model id → id actually used when addNode collided with an existing node id in this batch. */
  const batchNodeIdRewrites = new Map<string, string>()

  for (let i = 0; i < orderedPatches.length; i++) {
    const prefix = `patch[${i}]: `
    const parsed = parsePatch(orderedPatches[i])
    if (!parsed.ok) {
      errors.push(prefix + parsed.error)
      continue
    }
    let patch: WorkflowPatch = parsed.patch

    if (patch.op === 'addNode' && nodes.has(patch.id)) {
      const requested = patch.id
      const allocated = allocateUniqueAddNodeId(requested, nodes)
      patch = { ...patch, id: allocated }
      batchNodeIdRewrites.set(requested, allocated)
    }

    if (patch.op === 'removeNode') {
      const nodeId = resolveNodeRef(applyBatchNodeIdRewrite(patch.id, batchNodeIdRewrites), nodes)
      if (!nodeId) {
        errors.push(prefix + `node "${patch.id}" not found`)
        continue
      }
      patch = nodeId !== patch.id ? { ...patch, id: nodeId } : patch
    }
    if (patch.op === 'setNodeConfig') {
      const nodeId = resolveNodeRef(applyBatchNodeIdRewrite(patch.nodeId, batchNodeIdRewrites), nodes)
      if (!nodeId) {
        errors.push(
          prefix +
            `node "${patch.nodeId}" not found (use node id, label, or unique nodeType)`,
        )
        continue
      }
      patch = nodeId !== patch.nodeId ? { ...patch, nodeId } : patch
    }
    if (patch.op === 'setNodeLabel') {
      const nodeId = resolveNodeRef(applyBatchNodeIdRewrite(patch.nodeId, batchNodeIdRewrites), nodes)
      if (!nodeId) {
        errors.push(
          prefix +
            `node "${patch.nodeId}" not found (use node id, label, or unique nodeType)`,
        )
        continue
      }
      patch = nodeId !== patch.nodeId ? { ...patch, nodeId } : patch
    }
    if (patch.op === 'addEdge') {
      const srcId = resolveNodeRef(applyBatchNodeIdRewrite(patch.source, batchNodeIdRewrites), nodes)
      const tgtId = resolveNodeRef(applyBatchNodeIdRewrite(patch.target, batchNodeIdRewrites), nodes)
      if (!srcId) {
        errors.push(
          prefix +
            `source node "${patch.source}" not found (use addNode id, label, or unique nodeType)`,
        )
        continue
      }
      if (!tgtId) {
        errors.push(
          prefix +
            `target node "${patch.target}" not found (use addNode id, label, or unique nodeType)`,
        )
        continue
      }
      patch =
        srcId !== patch.source || tgtId !== patch.target
          ? { ...patch, source: srcId, target: tgtId }
          : patch
      const src = nodes.get(patch.source)!
      const tgt = nodes.get(patch.target)!
      const resolved = resolveEdgeHandles(
        src.nodeType,
        tgt.nodeType,
        patch.sourceHandle,
        patch.targetHandle,
      )
      if (!resolved.ok) {
        errors.push(prefix + resolved.error)
        continue
      }
      patch = {
        ...patch,
        sourceHandle: resolved.sourceHandle,
        targetHandle: resolved.targetHandle,
      }
    }
    const err = validatePatchAgainstGraph(patch, nodes, edges)
    if (err) {
      errors.push(prefix + err)
      continue
    }
    applyPatchToSimulation(patch, nodes, edges)
    validPatches.push(patch)
  }

  return { validPatches, errors }
}

/**
 * Resulting serialized graph after applying only patches that pass validation
 * (same semantics as {@link validateWorkflowPatches}).
 */
export function graphAfterValidPatches(
  initialNodes: SerializedNode[],
  initialEdges: SerializedEdge[],
  rawPatches: unknown[],
): {
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  validPatches: WorkflowPatch[]
  errors: string[]
} {
  const { validPatches, errors } = validateWorkflowPatches(rawPatches, initialNodes, initialEdges)
  const nodes = new Map<string, SimNode>(
    initialNodes.map((n) => [n.id, { ...n, config: { ...n.config } }]),
  )
  const edges = new Map<string, SimEdge>(
    initialEdges.map((e) => [e.id, { ...e }]),
  )
  for (const p of validPatches) {
    applyPatchToSimulation(p, nodes, edges)
  }
  return {
    nodes: Array.from(nodes.values()).map((n) => ({
      id: n.id,
      nodeType: n.nodeType,
      label: n.label,
      config: { ...n.config },
    })),
    edges: Array.from(edges.values()),
    validPatches,
    errors,
  }
}

/** Validate an ordered list of already-normalized patches against an initial graph (chain check). */
export function validatePatchChain(
  patches: WorkflowPatch[],
  initialNodes: SerializedNode[] = [],
  initialEdges: SerializedEdge[] = [],
): { validPatches: WorkflowPatch[]; errors: string[] } {
  return validateWorkflowPatches(patches as unknown[], initialNodes, initialEdges)
}
