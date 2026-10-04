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
  { label: 'GPT-5.6 Terra', value: 'gpt-5.6-terra' },
  { label: 'GPT-5.5', value: 'gpt-5.5' },
  { label: 'GPT-5.4 Mini', value: 'gpt-5.4-mini' },
  { label: 'Gemini 3.1 Pro', value: 'gemini-3.1-pro' },
  { label: 'Gemini 3.8 Flash', value: 'gemini-3.8-flash' },
  { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
  { label: 'Llama 4 Maverick', value: 'llama-4-maverick' },
  { label: 'Custom / self-hosted', value: 'custom' },
]

// ── Reasoning controls by provider ───────────────────────────────────────────
// Each provider exposes reasoning differently, so the LLM node shows one field per
// family. Checked against vendor docs, Oct 2026 — re-check when adding models.

/** Claude 5.x / Fable: `output_config.effort`; sampling parameters are rejected. */
export const CLAUDE_EFFORT_MODELS: string[] = ['claude-fable-5-1', 'claude-opus-5-5', 'claude-sonnet-5-5']

export const CLAUDE_EFFORT_OPTIONS: SelectOption[] = [
  { label: 'Model default', value: 'default' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Extra high', value: 'xhigh' },
  { label: 'Max', value: 'max' },
]

/** OpenAI GPT-5.x: `reasoning.effort`. `max` exists only on GPT-5.6 Terra. */
export const OPENAI_REASONING_MODELS: string[] = ['gpt-5.6-terra', 'gpt-5.5', 'gpt-5.4-mini']

export const OPENAI_REASONING_OPTIONS: SelectOption[] = [
  { label: 'Model default', value: 'default' },
  { label: 'None (no reasoning)', value: 'none' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Extra high', value: 'xhigh' },
  { label: 'Max (GPT-5.6 Terra only)', value: 'max' },
]

/** Gemini 3.x: `thinkingLevel`. Thinking cannot be turned off on these. */
export const GEMINI_THINKING_LEVEL_MODELS: string[] = ['gemini-3.1-pro', 'gemini-3.8-flash']

export const GEMINI_THINKING_LEVEL_OPTIONS: SelectOption[] = [
  { label: 'Model default', value: 'default' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

/** Token-budget thinking: Claude Haiku 4.5 (`budget_tokens`) and Gemini 2.5 Flash (`thinkingBudget`). */
export const THINKING_BUDGET_MODELS: string[] = ['claude-haiku-4-5', 'gemini-2.5-flash']

/**
 * Models that accept sampling temperature. Claude 5.x and Gemini 3.x reject or discourage it;
 * GPT-5.x accepts it only with reasoning effort `none`, so it is not listed here.
 */
export const MODELS_WITH_TEMPERATURE: string[] = [
  'claude-haiku-4-5',
  'gemini-2.5-flash',
  'llama-4-maverick',
  'custom',
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
  'gpt-4o': 'gpt-5.5',
  'gpt-4o-mini': 'gpt-5.4-mini',
  'gpt-4': 'gpt-5.5',
  'gpt-4-turbo': 'gpt-5.5',
  'gpt-4-1106-preview': 'gpt-5.5',
  'gpt-4.1': 'gpt-5.5',
  'gpt-4.1-mini': 'gpt-5.4-mini',
  'gpt-3.5-turbo': 'gpt-5.4-mini',
  'text-davinci-003': 'gpt-5.4-mini',
  'gpt-5': 'gpt-5.5',
  'gpt-5-mini': 'gpt-5.4-mini',
  'gpt-5-nano': 'gpt-5.4-mini',
  'gpt-5.1': 'gpt-5.5',
  'gpt-5.2': 'gpt-5.5',
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
  'gemini-1.5-pro': 'gemini-3.1-pro',
  'gemini-2.5-pro': 'gemini-3.1-pro',
  'gemini-3-pro': 'gemini-3.1-pro',
  'gemini-1.5-flash': 'gemini-3.8-flash',
  'gemini-2.0-flash': 'gemini-3.8-flash',
  'gemini-3-flash': 'gemini-3.8-flash',
  // Meta
  'llama-3.1-70b-instruct': 'llama-4-maverick',
  'llama-3.1-70b': 'llama-4-maverick',
  // Provider names used as model values
  openai: 'gpt-5.5',
  anthropic: 'claude-sonnet-5-5',
  claude: 'claude-sonnet-5-5',
  google: 'gemini-3.1-pro',
  gemini: 'gemini-3.1-pro',
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
