import type { SelectOption } from '../types/nodes'

// ── Shared model option lists ────────────────────────────────────────────────
// Single source of truth for every model dropdown in nodeDefinitions.ts.
// When a vendor ships a new model, update it here and every node picks it up.

export const DEFAULT_CHAT_MODEL = 'claude-sonnet-5-5'
export const DEFAULT_JUDGE_MODEL = 'claude-opus-5-5'

/** General-purpose chat / reasoning models (LLM, Agent, Critique, Classifier…). */
export const CHAT_MODEL_OPTIONS: SelectOption[] = [
  { label: 'Claude Fable 5.1', value: 'claude-fable-5-1' },
  { label: 'Claude Opus 5.5', value: 'claude-opus-5-5' },
  { label: 'Claude Sonnet 5.5', value: 'claude-sonnet-5-5' },
  { label: 'Claude Haiku 4.5', value: 'claude-haiku-4-5' },
  { label: 'GPT-5', value: 'gpt-5' },
  { label: 'GPT-5 Mini', value: 'gpt-5-mini' },
  { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
  { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
  { label: 'Llama 4 Maverick', value: 'llama-4-maverick' },
  { label: 'Custom / self-hosted', value: 'custom' },
]

/**
 * Sampling temperature is rejected by current Claude 5.x / Fable models and by GPT-5
 * reasoning models; it still applies to these.
 */
export const MODELS_WITH_TEMPERATURE: string[] = [
  'claude-haiku-4-5',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'llama-4-maverick',
  'custom',
]

/** Models with a reasoning-effort / thinking-depth control. */
export const MODELS_WITH_EFFORT: string[] = [
  'claude-fable-5-1',
  'claude-opus-5-5',
  'claude-sonnet-5-5',
  'gpt-5',
  'gpt-5-mini',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
]

export const EFFORT_OPTIONS: SelectOption[] = [
  { label: 'Provider default', value: 'default' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Extra high', value: 'xhigh' },
  { label: 'Max', value: 'max' },
]

/** Models used as evaluators — same list; judges should usually be the strongest tier. */
export const JUDGE_MODEL_OPTIONS: SelectOption[] = CHAT_MODEL_OPTIONS

export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small'

export const EMBEDDING_MODEL_OPTIONS: SelectOption[] = [
  { label: 'OpenAI text-embedding-3-small', value: 'text-embedding-3-small' },
  { label: 'OpenAI text-embedding-3-large', value: 'text-embedding-3-large' },
  { label: 'Voyage 3.5', value: 'voyage-3.5' },
  { label: 'Voyage 3.5 Lite', value: 'voyage-3.5-lite' },
  { label: 'Gemini Embedding', value: 'gemini-embedding-001' },
  { label: 'Cohere Embed v4', value: 'embed-v4.0' },
  { label: 'nomic-embed-text (local)', value: 'nomic-embed-text' },
  { label: 'BGE-M3 (local)', value: 'bge-m3' },
]

export const DEFAULT_RERANK_MODEL = 'cohere-rerank-3.5'

export const RERANK_MODEL_OPTIONS: SelectOption[] = [
  { label: 'Cohere Rerank 3.5', value: 'cohere-rerank-3.5' },
  { label: 'Voyage Rerank 2.5', value: 'voyage-rerank-2.5' },
  { label: 'Jina Reranker v2', value: 'jina-reranker-v2' },
  { label: 'BGE Reranker v2 (local)', value: 'bge-reranker-v2-m3' },
  { label: 'ms-marco-MiniLM (local)', value: 'ms-marco-minilm' },
  { label: 'LLM listwise rerank', value: 'llm' },
]

/**
 * Retired or renamed model ids → current option value. Applied when loading
 * AI-generated patches and saved configs, so old diagrams keep validating.
 */
export const LEGACY_MODEL_ALIASES: Record<string, string> = {
  // OpenAI chat
  'gpt-4o': 'gpt-5',
  'gpt-4o-mini': 'gpt-5-mini',
  'gpt-4': 'gpt-5',
  'gpt-4-turbo': 'gpt-5',
  'gpt-4-1106-preview': 'gpt-5',
  'gpt-4.1': 'gpt-5',
  'gpt-4.1-mini': 'gpt-5-mini',
  'gpt-3.5-turbo': 'gpt-5-mini',
  'text-davinci-003': 'gpt-5-mini',
  // Anthropic
  'claude-3-5-sonnet-20241022': 'claude-sonnet-5-5',
  'claude-3-5-sonnet': 'claude-sonnet-5-5',
  'claude-3-7-sonnet': 'claude-sonnet-5-5',
  'claude-sonnet-4': 'claude-sonnet-5-5',
  'claude-sonnet-4-5': 'claude-sonnet-5-5',
  'claude-sonnet-4-6': 'claude-sonnet-5-5',
  'claude-sonnet-5': 'claude-sonnet-5-5',
  'claude-3-haiku-20240307': 'claude-haiku-4-5',
  'claude-3-5-haiku': 'claude-haiku-4-5',
  'claude-3-opus': 'claude-opus-5-5',
  'claude-opus-4': 'claude-opus-5-5',
  'claude-opus-4-8': 'claude-opus-5-5',
  'claude-opus-5': 'claude-opus-5-5',
  'claude-fable-5': 'claude-fable-5-1',
  // Google
  'gemini-1.5-pro': 'gemini-2.5-pro',
  'gemini-1.5-flash': 'gemini-2.5-flash',
  'gemini-2.0-flash': 'gemini-2.5-flash',
  // Meta
  'llama-3.1-70b-instruct': 'llama-4-maverick',
  'llama-3.1-70b': 'llama-4-maverick',
  // Provider names used as model values
  openai: 'gpt-5',
  anthropic: 'claude-sonnet-5-5',
  claude: 'claude-sonnet-5-5',
  google: 'gemini-2.5-pro',
  gemini: 'gemini-2.5-pro',
  // Embeddings
  'text-embedding-ada-002': 'text-embedding-3-small',
  'embed-english-v3.0': 'embed-v4.0',
  'embed-multilingual-v3.0': 'embed-v4.0',
  // Rerankers
  'cohere-rerank-3': 'cohere-rerank-3.5',
  'cohere-rerank-3-nimble': 'cohere-rerank-3.5',
  'bge-reranker-large': 'bge-reranker-v2-m3',
  // Web search engines
  bing: 'brave',
}

/** Map a legacy value onto a current option when (and only when) the result is allowed. */
export function resolveLegacySelectValue(value: string, options: SelectOption[] | undefined): string {
  if (!options?.length) return value
  if (options.some((o) => o.value === value)) return value
  const mapped = LEGACY_MODEL_ALIASES[value] ?? LEGACY_MODEL_ALIASES[value.toLowerCase()]
  return mapped && options.some((o) => o.value === mapped) ? mapped : value
}
