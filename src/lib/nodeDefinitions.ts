import {
  LLMIcon,
  TriggerIcon,
  OutputIcon,
  SubAgentIcon,
  HumanApprovalIcon,
  LoopIcon,
  MCPServerIcon,
  CodeExecIcon,
  StateIcon,
  TracingIcon,
  MonitorIcon,
  AssertionIcon,
  EvalDatasetIcon,
  UserSimulatorIcon,
  AgentIcon,
  PromptIcon,
  PromptTemplateIcon,
  MemoryIcon,
  DataLoaderIcon,
  ChunkerIcon,
  EmbeddingIcon,
  VectorDBIcon,
  RetrieverIcon,
  RerankerIcon,
  CacheIcon,
  RouterIcon,
  AggregatorIcon,
  ClassifierIcon,
  FrameIcon,
  TextIcon,
  ToolCallIcon,
  WebSearchIcon,
  OutputParserIcon,
  EvaluatorIcon,
  GuardrailsIcon,
  LLMJudgeIcon,
  RubricIcon,
  ComparatorIcon,
  GroundTruthIcon,
  EvalMetricsIcon,
  CritiqueIcon,
  ThresholdGateIcon,
  HumanRaterIcon,
  RAGEvalIcon,
  SingleTurnEvalIcon,
  MultiTurnEvalIcon,
  ToolUseEvalIcon,
  TrajectoryEvalIcon,
  TaskCompletionIcon,
  AgentEfficiencyIcon,
  CharacterIcon,
  GenericDocumentIcon,
  GenericImageIcon,
  GenericVideoIcon,
  GenericMessengerIcon,
  GenericEmailIcon,
  GenericDatabaseIcon,
  GenericStorageIcon,
  GenericWebIcon,
  GenericWebPageIcon,
  GenericCloudIcon,
  GenericScriptIcon,
  GenericSchedulerIcon,
  GenericNotificationsIcon,
  GenericCalendarIcon,
  GenericAutomationIcon,
  GenericCrmIcon,
  GenericSupportIcon,
  GenericPaymentsIcon,
  GenericVoiceIcon,
  GenericCodeIcon,
  GenericAnalyticsIcon,
} from '../components/icons'
import type { ConfigField, NodeDefinition, PortDefinition } from '../types/nodes'
import {
  CHAT_MODEL_OPTIONS,
  DEFAULT_CHAT_MODEL,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_JUDGE_MODEL,
  DEFAULT_RERANK_MODEL,
  EFFORT_OPTIONS,
  MODELS_WITH_EFFORT,
  MODELS_WITH_TEMPERATURE,
  EMBEDDING_MODEL_OPTIONS,
  JUDGE_MODEL_OPTIONS,
  RERANK_MODEL_OPTIONS,
  resolveLegacySelectValue,
} from './modelCatalog'

// ── Node definitions ──────────────────────────────────────────────────────────
// Add new nodes here. The rest of the app picks them up automatically via
// `getAllNodeDefinitions()` and the nodeTypes map in components/nodes/index.ts.

/**
 * Built-in node definitions get their accent color from the registry below
 * (one primary color, one for eval nodes), so they don't declare their own.
 */
type CoreNodeDefinition = Omit<NodeDefinition, 'accentColor'>

// ── Config-driven port helpers ────────────────────────────────────────────────

const LETTERS = 'ABCDEFGH'
const MAX_DYNAMIC_PORTS = LETTERS.length

function clampCount(raw: unknown, fallback: number): number {
  const n = Math.round(Number(raw))
  if (!Number.isFinite(n)) return fallback
  return Math.min(MAX_DYNAMIC_PORTS, Math.max(2, n))
}

function splitList(raw: unknown): string[] {
  return String(raw ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

/** Stable port id for a classifier class name ("Billing issue" → "class_billing_issue"). */
export function classPortId(name: string): string {
  return `class_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`
}

const LLMNodeDefinition: CoreNodeDefinition = {
  type: 'llm',
  label: 'LLM',
  icon: LLMIcon,
  description: 'Large language model call with configurable provider and parameters.',
  category: 'core',
  inputs: [
    { id: 'prompt', label: 'Prompt', type: 'text' },
    { id: 'memory', label: 'Memory', type: 'memory' },
    { id: 'tools', label: 'Tools', type: 'tool-call' },
  ],
  outputs: [
    { id: 'response', label: 'Response', type: 'text' },
    { id: 'structured', label: 'Structured', type: 'structured' },
  ],
  configFields: [
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      defaultValue: DEFAULT_CHAT_MODEL,
      options: CHAT_MODEL_OPTIONS,
    },
    {
      key: 'effort',
      label: 'Reasoning Effort',
      type: 'select',
      defaultValue: 'default',
      options: EFFORT_OPTIONS,
      visibleWhen: { key: 'model', oneOf: MODELS_WITH_EFFORT },
      description: 'Thinking depth vs. cost/latency. Low for chat and classification; high or xhigh for coding and agentic work.',
    },
    {
      key: 'thinking',
      label: 'Show Reasoning',
      type: 'select',
      defaultValue: 'hidden',
      options: [
        { label: 'Hidden (default)', value: 'hidden' },
        { label: 'Summarized', value: 'summarized' },
        { label: 'Progress updates', value: 'updates' },
      ],
      visibleWhen: { key: 'model', oneOf: MODELS_WITH_EFFORT },
      description: 'Whether the reasoning is surfaced to the caller. It runs either way.',
    },
    {
      key: 'temperature',
      label: 'Temperature',
      type: 'slider',
      defaultValue: 0.7,
      min: 0,
      max: 2,
      step: 0.05,
      visibleWhen: { key: 'model', oneOf: MODELS_WITH_TEMPERATURE },
      description: 'Controls randomness. Lower = more deterministic. Not accepted by current reasoning models.',
    },
    {
      key: 'maxTokens',
      label: 'Max Tokens',
      type: 'number',
      defaultValue: 1024,
      min: 1,
      max: 128000,
      step: 1,
    },
    {
      key: 'systemPrompt',
      label: 'System Prompt',
      type: 'textarea',
      defaultValue: '',
      placeholder: 'You are a helpful assistant…',
    },
    {
      key: 'streaming',
      label: 'Streaming',
      type: 'boolean',
      defaultValue: false,
      description: 'Stream tokens as they are generated.',
    },
    {
      key: 'responseFormat',
      label: 'Response Format',
      type: 'select',
      defaultValue: 'text',
      options: [
        { label: 'Free text', value: 'text' },
        { label: 'JSON schema (structured output)', value: 'json-schema' },
      ],
      description: 'Structured output constrains the response to a schema — no Output Parser needed.',
    },
    {
      key: 'outputSchema',
      label: 'Output Schema',
      type: 'textarea',
      defaultValue: '',
      placeholder: '{"type":"object","properties":{"answer":{"type":"string"}},"required":["answer"]}',
      visibleWhen: { key: 'responseFormat', value: 'json-schema' },
    },
  ],
}

const PromptTemplateNodeDefinition: CoreNodeDefinition = {
  type: 'promptTemplate',
  label: 'Prompt Template',
  icon: PromptTemplateIcon,
  description: 'Renders a Jinja-style template with dynamic variable injection.',
  category: 'core',
  inputs: [
    { id: 'variables', label: 'Variables', type: 'structured' },
    { id: 'context', label: 'Context', type: 'text' },
  ],
  outputs: [
    { id: 'prompt', label: 'Prompt', type: 'text' },
  ],
  configFields: [
    {
      key: 'template',
      label: 'Template',
      type: 'textarea',
      defaultValue: 'Answer the following question:\n\n{{question}}\n\nContext:\n{{context}}',
      placeholder: 'Use {{variable}} for dynamic values…',
      description: 'Supports {{variable}} and {%- if -%} blocks.',
    },
    {
      key: 'inputVariables',
      label: 'Input Variables',
      type: 'text',
      defaultValue: 'question, context',
      placeholder: 'question, context, history',
      description: 'Comma-separated list of expected variable names.',
    },
  ],
}

const VectorDBNodeDefinition: CoreNodeDefinition = {
  type: 'vectorDB',
  label: 'Vector DB',
  icon: VectorDBIcon,
  description: 'Vector store index used as persistent retrieval backing storage.',
  category: 'data',
  inputs: [
    { id: 'query', label: 'Query', type: 'text' },
    { id: 'embedding', label: 'Embedding', type: 'embedding' },
  ],
  outputs: [
    { id: 'store', label: 'Store', type: 'any' },
    { id: 'documents', label: 'Documents', type: 'text' },
    { id: 'scores', label: 'Scores', type: 'structured' },
  ],
  configFields: [
    {
      key: 'provider',
      label: 'Provider',
      type: 'select',
      defaultValue: 'pinecone',
      options: [
        { label: 'Pinecone', value: 'pinecone' },
        { label: 'Weaviate', value: 'weaviate' },
        { label: 'Qdrant', value: 'qdrant' },
        { label: 'Chroma', value: 'chroma' },
        { label: 'pgvector', value: 'pgvector' },
        { label: 'FAISS (local)', value: 'faiss' },
      ],
    },
    {
      key: 'indexName',
      label: 'Index / Collection',
      type: 'text',
      defaultValue: '',
      placeholder: 'my-knowledge-base',
    },
    {
      key: 'topK',
      label: 'Top K Results',
      type: 'number',
      defaultValue: 5,
      min: 1,
      max: 100,
      step: 1,
    },
    {
      key: 'similarityThreshold',
      label: 'Similarity Threshold',
      type: 'slider',
      defaultValue: 0.7,
      min: 0,
      max: 1,
      step: 0.01,
      description: 'Minimum cosine similarity score to include a result.',
    },
  ],
}

const AgentNodeDefinition: CoreNodeDefinition = {
  type: 'agent',
  label: 'Agent',
  icon: AgentIcon,
  description: 'Autonomous agent that reasons, plans, and calls tools iteratively.',
  category: 'core',
  inputs: [
    { id: 'prompt', label: 'Prompt', type: 'text' },
    { id: 'tools', label: 'Observations', type: 'any' },
    { id: 'memory', label: 'Memory', type: 'memory' },
  ],
  outputs: [
    { id: 'toolRequests', label: 'Tool Requests', type: 'any' },
    { id: 'actions', label: 'Actions', type: 'structured' },
    { id: 'response', label: 'Response', type: 'text' },
  ],
  configFields: [
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      defaultValue: DEFAULT_CHAT_MODEL,
      options: CHAT_MODEL_OPTIONS,
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      defaultValue: 'You are a helpful assistant.',
      placeholder: 'Describe the agent\'s role and goals…',
    },
    {
      key: 'maxIterations',
      label: 'Max Iterations',
      type: 'number',
      defaultValue: 10,
      min: 1,
      max: 50,
      step: 1,
      description: 'Maximum tool-use loops before halting.',
    },
    {
      key: 'allowDelegation',
      label: 'Allow Delegation',
      type: 'boolean',
      defaultValue: false,
      description: 'Let the agent delegate subtasks to sub-agents.',
    },
  ],
}

const PromptNodeDefinition: CoreNodeDefinition = {
  type: 'prompt',
  label: 'Prompt',
  icon: PromptIcon,
  description: 'A single chat message with a fixed role and content.',
  category: 'core',
  inputs: [
    { id: 'variables', label: 'Variables', type: 'structured' },
  ],
  outputs: [
    { id: 'message', label: 'Message', type: 'text' },
  ],
  configFields: [
    {
      key: 'role',
      label: 'Role',
      type: 'select',
      defaultValue: 'user',
      options: [
        { label: 'System', value: 'system' },
        { label: 'User', value: 'user' },
        { label: 'Assistant', value: 'assistant' },
      ],
    },
    {
      key: 'content',
      label: 'Content',
      type: 'textarea',
      defaultValue: '',
      placeholder: 'Message content…',
    },
  ],
}

const MemoryNodeDefinition: CoreNodeDefinition = {
  type: 'memory',
  label: 'Memory',
  icon: MemoryIcon,
  description: 'Stores and retrieves conversation history or entity state.',
  category: 'core',
  inputs: [
    { id: 'input', label: 'Input', type: 'text' },
  ],
  outputs: [
    { id: 'history', label: 'History', type: 'memory' },
  ],
  configFields: [
    {
      key: 'memoryType',
      label: 'Memory Type',
      type: 'select',
      defaultValue: 'conversation',
      options: [
        { label: 'Conversation Buffer', value: 'conversation' },
        { label: 'Summary', value: 'summary' },
        { label: 'Entity', value: 'entity' },
        { label: 'Vector (long-term recall)', value: 'vector' },
        { label: 'Persistent Files (memory dir)', value: 'files' },
      ],
    },
    {
      key: 'windowSize',
      label: 'Window Size',
      type: 'number',
      defaultValue: 10,
      min: 1,
      max: 100,
      step: 1,
      description: 'Number of past exchanges to retain.',
    },
    {
      key: 'maxTokens',
      label: 'Max Tokens',
      type: 'number',
      defaultValue: 2000,
      min: 100,
      max: 32000,
      step: 100,
    },
  ],
}

const DataLoaderNodeDefinition: CoreNodeDefinition = {
  type: 'dataLoader',
  label: 'Data Loader',
  icon: DataLoaderIcon,
  description: 'Ingests documents from files, URLs, S3, or databases.',
  category: 'data',
  inputs: [],
  outputs: [
    { id: 'documents', label: 'Documents', type: 'text' },
  ],
  configFields: [
    {
      key: 'source',
      label: 'Source',
      type: 'select',
      defaultValue: 'file',
      options: [
        { label: 'File / Directory', value: 'file' },
        { label: 'URL / Web', value: 'url' },
        { label: 'Amazon S3', value: 's3' },
        { label: 'Database', value: 'database' },
      ],
    },
    {
      key: 'path',
      label: 'Path / URL',
      type: 'text',
      defaultValue: '',
      placeholder: '/data/docs  or  https://…',
    },
    {
      key: 'recursive',
      label: 'Recursive',
      type: 'boolean',
      defaultValue: false,
      description: 'Recurse into subdirectories.',
    },
  ],
}

const ChunkerNodeDefinition: CoreNodeDefinition = {
  type: 'chunker',
  label: 'Chunker',
  icon: ChunkerIcon,
  description: 'Splits documents into smaller overlapping text chunks.',
  category: 'data',
  inputs: [
    { id: 'documents', label: 'Documents', type: 'text' },
  ],
  outputs: [
    { id: 'chunks', label: 'Chunks', type: 'text' },
  ],
  configFields: [
    {
      key: 'strategy',
      label: 'Strategy',
      type: 'select',
      defaultValue: 'fixed',
      options: [
        { label: 'Fixed Size', value: 'fixed' },
        { label: 'Sentence', value: 'sentence' },
        { label: 'Paragraph', value: 'paragraph' },
        { label: 'Semantic', value: 'semantic' },
      ],
    },
    {
      key: 'chunkSize',
      label: 'Chunk Size (tokens)',
      type: 'number',
      defaultValue: 512,
      min: 64,
      max: 8192,
      step: 64,
    },
    {
      key: 'overlap',
      label: 'Overlap (tokens)',
      type: 'number',
      defaultValue: 64,
      min: 0,
      max: 512,
      step: 16,
    },
  ],
}

const EmbeddingNodeDefinition: CoreNodeDefinition = {
  type: 'embedding',
  label: 'Embedding',
  icon: EmbeddingIcon,
  description: 'Converts text into dense vector representations.',
  category: 'data',
  inputs: [
    { id: 'text', label: 'Text', type: 'text' },
  ],
  outputs: [
    { id: 'embedding', label: 'Embedding', type: 'embedding' },
  ],
  configFields: [
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      defaultValue: DEFAULT_EMBEDDING_MODEL,
      options: EMBEDDING_MODEL_OPTIONS,
    },
    {
      key: 'dimensions',
      label: 'Dimensions',
      type: 'number',
      defaultValue: 1536,
      min: 256,
      max: 3072,
      step: 256,
    },
    {
      key: 'normalize',
      label: 'Normalize',
      type: 'boolean',
      defaultValue: true,
      description: 'L2-normalize output vectors.',
    },
  ],
}

const RetrieverNodeDefinition: CoreNodeDefinition = {
  type: 'retriever',
  label: 'Retriever',
  icon: RetrieverIcon,
  description: 'Fetches the most relevant document chunks from a vector store.',
  category: 'data',
  inputs: [
    { id: 'store', label: 'Store', type: 'any' },
    { id: 'query', label: 'Query', type: 'text' },
    { id: 'embedding', label: 'Embedding', type: 'embedding' },
  ],
  outputs: [
    { id: 'documents', label: 'Documents', type: 'text' },
    { id: 'scores', label: 'Scores', type: 'structured' },
  ],
  configFields: [
    {
      key: 'strategy',
      label: 'Strategy',
      type: 'select',
      defaultValue: 'similarity',
      options: [
        { label: 'Similarity', value: 'similarity' },
        { label: 'MMR (diversity)', value: 'mmr' },
        { label: 'Hybrid (BM25 + dense)', value: 'hybrid' },
      ],
    },
    {
      key: 'topK',
      label: 'Top K',
      type: 'number',
      defaultValue: 5,
      min: 1,
      max: 50,
      step: 1,
    },
    {
      key: 'fetchK',
      label: 'Fetch K (MMR)',
      type: 'number',
      defaultValue: 20,
      min: 5,
      max: 200,
      step: 5,
      description: 'Candidate pool size before MMR re-ranking.',
    },
  ],
}

const RerankerNodeDefinition: CoreNodeDefinition = {
  type: 'reranker',
  label: 'Reranker',
  icon: RerankerIcon,
  description: 'Cross-encoder re-ranking to improve retrieval precision.',
  category: 'data',
  inputs: [
    { id: 'query', label: 'Query', type: 'text' },
    { id: 'documents', label: 'Documents', type: 'text' },
  ],
  outputs: [
    { id: 'documents', label: 'Documents', type: 'text' },
  ],
  configFields: [
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      defaultValue: DEFAULT_RERANK_MODEL,
      options: RERANK_MODEL_OPTIONS,
    },
    {
      key: 'topN',
      label: 'Top N',
      type: 'number',
      defaultValue: 3,
      min: 1,
      max: 20,
      step: 1,
      description: 'Number of documents to keep after re-ranking.',
    },
  ],
}

const CacheNodeDefinition: CoreNodeDefinition = {
  type: 'cache',
  label: 'Cache',
  icon: CacheIcon,
  description: 'Semantic or exact cache to avoid redundant LLM calls.',
  category: 'data',
  inputs: [
    { id: 'key', label: 'Key', type: 'text' },
    { id: 'value', label: 'Value', type: 'any' },
  ],
  outputs: [
    { id: 'value', label: 'Value', type: 'any' },
    { id: 'hit', label: 'Cache Hit', type: 'structured' },
  ],
  configFields: [
    {
      key: 'strategy',
      label: 'Strategy',
      type: 'select',
      defaultValue: 'exact',
      options: [
        { label: 'Exact Match', value: 'exact' },
        { label: 'Semantic (embedding)', value: 'semantic' },
      ],
    },
    {
      key: 'ttl',
      label: 'TTL (seconds)',
      type: 'number',
      defaultValue: 3600,
      min: 0,
      max: 86400,
      step: 60,
      description: 'Time-to-live. 0 = no expiry.',
    },
    {
      key: 'maxSize',
      label: 'Max Entries',
      type: 'number',
      defaultValue: 1000,
      min: 10,
      max: 100000,
      step: 100,
    },
  ],
}

const RouterNodeDefinition: CoreNodeDefinition = {
  type: 'router',
  label: 'Router',
  icon: RouterIcon,
  description: 'Conditionally routes flow to one of N downstream paths (routeCount 2–8 → outputs routeA…routeH, plus default).',
  category: 'flow',
  inputs: [
    { id: 'input', label: 'Input', type: 'any' },
  ],
  outputs: [
    { id: 'routeA', label: 'Route A', type: 'any' },
    { id: 'routeB', label: 'Route B', type: 'any' },
    { id: 'default', label: 'Default', type: 'any' },
  ],
  resolvePorts: (config) => {
    const count = clampCount(config.routeCount, 2)
    const names = splitList(config.routeLabels)
    const routes: PortDefinition[] = Array.from({ length: count }, (_, i) => ({
      id: `route${LETTERS[i]}`,
      label: names[i] ?? `Route ${LETTERS[i]}`,
      type: 'any',
    }))
    return {
      inputs: [{ id: 'input', label: 'Input', type: 'any' }],
      outputs: [...routes, { id: 'default', label: 'Default', type: 'any' }],
    }
  },
  configFields: [
    {
      key: 'routeCount',
      label: 'Routes',
      type: 'number',
      defaultValue: 2,
      min: 2,
      max: 8,
      step: 1,
      description: 'Number of branches (output ids routeA…routeH), plus a Default branch.',
    },
    {
      key: 'routeLabels',
      label: 'Route Names',
      type: 'text',
      defaultValue: '',
      placeholder: 'Billing, Technical, Sales',
      description: 'Optional comma-separated port labels, in order.',
    },
    {
      key: 'conditionType',
      label: 'Condition Type',
      type: 'select',
      defaultValue: 'llm',
      options: [
        { label: 'LLM decision', value: 'llm' },
        { label: 'Regex match', value: 'regex' },
        { label: 'Equality', value: 'equality' },
      ],
    },
    {
      key: 'condition',
      label: 'Condition',
      type: 'textarea',
      defaultValue: '',
      placeholder: 'Routing rule or regex pattern…',
    },
  ],
}

const AggregatorNodeDefinition: CoreNodeDefinition = {
  type: 'aggregator',
  label: 'Aggregator',
  icon: AggregatorIcon,
  description: 'Merges parallel upstream outputs into one result (inputCount 2–8 → inputs inputA…inputH).',
  category: 'flow',
  inputs: [
    { id: 'inputA', label: 'Input A', type: 'any' },
    { id: 'inputB', label: 'Input B', type: 'any' },
  ],
  outputs: [
    { id: 'merged', label: 'Merged', type: 'any' },
  ],
  resolvePorts: (config) => ({
    inputs: Array.from({ length: clampCount(config.inputCount, 2) }, (_, i) => ({
      id: `input${LETTERS[i]}`,
      label: `Input ${LETTERS[i]}`,
      type: 'any' as const,
    })),
    outputs: [{ id: 'merged', label: 'Merged', type: 'any' }],
  }),
  configFields: [
    {
      key: 'inputCount',
      label: 'Inputs',
      type: 'number',
      defaultValue: 2,
      min: 2,
      max: 8,
      step: 1,
      description: 'Number of upstream branches to merge (input ids inputA…inputH).',
    },
    {
      key: 'strategy',
      label: 'Strategy',
      type: 'select',
      defaultValue: 'concat',
      options: [
        { label: 'Concatenate', value: 'concat' },
        { label: 'Merge (JSON)', value: 'merge' },
        { label: 'Majority Vote', value: 'vote' },
        { label: 'LLM Synthesis', value: 'synthesize' },
        { label: 'First to Finish', value: 'first' },
      ],
    },
    {
      key: 'separator',
      label: 'Separator',
      type: 'text',
      defaultValue: '\\n\\n',
      placeholder: 'Text separator for concatenation…',
    },
  ],
}

const ClassifierNodeDefinition: CoreNodeDefinition = {
  type: 'classifier',
  label: 'Classifier',
  icon: ClassifierIcon,
  description: 'Assigns a discrete label to input text; with branchPerClass, adds one output per class (class_<name>) for branching.',
  category: 'flow',
  inputs: [
    { id: 'input', label: 'Input', type: 'text' },
  ],
  outputs: [
    { id: 'label', label: 'Label', type: 'text' },
    { id: 'confidence', label: 'Confidence', type: 'structured' },
  ],
  resolvePorts: (config) => {
    const base: PortDefinition[] = [
      { id: 'label', label: 'Label', type: 'text' },
      { id: 'confidence', label: 'Confidence', type: 'structured' },
    ]
    if (!config.branchPerClass) {
      return { inputs: [{ id: 'input', label: 'Input', type: 'text' }], outputs: base }
    }
    const seen = new Set<string>()
    const branches: PortDefinition[] = []
    for (const name of splitList(config.classes)) {
      const id = classPortId(name)
      if (id === 'class_' || seen.has(id)) continue
      seen.add(id)
      branches.push({ id, label: name, type: 'any' })
    }
    return { inputs: [{ id: 'input', label: 'Input', type: 'text' }], outputs: [...branches, ...base] }
  },
  configFields: [
    {
      key: 'classes',
      label: 'Classes',
      type: 'text',
      defaultValue: 'positive, negative, neutral',
      placeholder: 'comma-separated class names…',
    },
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      defaultValue: 'llm',
      options: [
        { label: 'LLM (zero-shot)', value: 'llm' },
        { label: 'Fine-tuned classifier', value: 'finetuned' },
      ],
    },
    {
      key: 'branchPerClass',
      label: 'Branch per Class',
      type: 'boolean',
      defaultValue: false,
      description: 'Add one output per class (ids class_<name>) so the flow can branch on the label.',
    },
    {
      key: 'threshold',
      label: 'Confidence Threshold',
      type: 'slider',
      defaultValue: 0.7,
      min: 0,
      max: 1,
      step: 0.05,
    },
  ],
}

/** Default frame tint strength (0–1). 15% keeps frames subtle; raise for a stronger panel. */
export const DEFAULT_FRAME_OPACITY = 0.15

const FrameNodeDefinition: CoreNodeDefinition = {
  type: 'frame',
  label: 'Frame',
  icon: FrameIcon,
  description: 'Resizable background section for grouping related nodes on the canvas.',
  category: 'flow',
  inputs: [],
  outputs: [],
  configFields: [
    {
      key: 'title',
      label: 'Title',
      type: 'text',
      defaultValue: 'Section',
      placeholder: 'Retrieval Layer',
    },
    {
      key: 'width',
      label: 'Width',
      type: 'number',
      defaultValue: 420,
      min: 180,
      max: 2400,
      step: 10,
    },
    {
      key: 'height',
      label: 'Height',
      type: 'number',
      defaultValue: 260,
      min: 120,
      max: 1800,
      step: 10,
    },
    {
      key: 'opacity',
      label: 'Opacity',
      type: 'slider',
      defaultValue: DEFAULT_FRAME_OPACITY,
      min: 0,
      max: 1,
      step: 0.05,
      description: '0% hides the frame; 100% uses a strong tint (near-solid). Default 15% for a light grouping tint.',
    },
    {
      key: 'groupGlow',
      label: 'Group Glow on Activity',
      type: 'boolean',
      defaultValue: false,
      description: 'When enabled, this frame glows during playback if any node inside it is active.',
    },
  ],
}

const TextNodeDefinition: CoreNodeDefinition = {
  type: 'text',
  label: 'Text',
  icon: TextIcon,
  description: 'Resizable annotation block for adding explanations and markdown notes directly on the canvas.',
  category: 'flow',
  inputs: [],
  outputs: [],
  configFields: [
    {
      key: 'content',
      label: 'Markdown',
      type: 'textarea',
      defaultValue: '## Section Title\n\n- Add explanation here\n- Use bullets or **bold**',
      placeholder: '## Title\n\n- Bullet point\n- **Bold emphasis**\n- `inline code`',
      description: 'Supports markdown headings, bullets, bold, italics, and inline code.',
    },
    {
      key: 'width',
      label: 'Width',
      type: 'number',
      defaultValue: 320,
      min: 160,
      max: 1600,
      step: 10,
    },
    {
      key: 'height',
      label: 'Height',
      type: 'number',
      defaultValue: 160,
      min: 100,
      max: 1200,
      step: 10,
    },
    {
      key: 'fontSize',
      label: 'Text Size',
      type: 'number',
      defaultValue: 20,
      min: 10,
      max: 72,
      step: 1,
    },
  ],
}

const ToolCallNodeDefinition: CoreNodeDefinition = {
  type: 'toolCall',
  label: 'Tool Call',
  icon: ToolCallIcon,
  description: 'Executes a named function/tool and returns the result.',
  category: 'tool',
  inputs: [
    { id: 'call', label: 'Call', type: 'tool-call' },
  ],
  outputs: [
    { id: 'result', label: 'Result', type: 'structured' },
  ],
  configFields: [
    {
      key: 'toolName',
      label: 'Tool Name',
      type: 'text',
      defaultValue: '',
      placeholder: 'my_function',
    },
    {
      key: 'schema',
      label: 'Input Schema (JSON)',
      type: 'textarea',
      defaultValue: '{}',
      placeholder: '{"param": "string"}',
      description: 'JSON Schema for tool inputs.',
    },
    {
      key: 'timeout',
      label: 'Timeout (s)',
      type: 'number',
      defaultValue: 30,
      min: 1,
      max: 300,
      step: 1,
    },
    {
      key: 'retries',
      label: 'Retries',
      type: 'number',
      defaultValue: 2,
      min: 0,
      max: 5,
      step: 1,
    },
  ],
}

const WebSearchNodeDefinition: CoreNodeDefinition = {
  type: 'webSearch',
  label: 'Web Search',
  icon: WebSearchIcon,
  description: 'Queries the web and returns ranked result snippets.',
  category: 'tool',
  inputs: [
    { id: 'query', label: 'Query', type: 'text' },
  ],
  outputs: [
    { id: 'results', label: 'Results', type: 'text', color: '#16A34A' },
  ],
  configFields: [
    {
      key: 'engine',
      label: 'Search Engine',
      type: 'select',
      defaultValue: 'brave',
      options: [
        { label: 'Brave Search', value: 'brave' },
        { label: 'Tavily', value: 'tavily' },
        { label: 'Exa', value: 'exa' },
        { label: 'Perplexity Search', value: 'perplexity' },
        { label: 'SerpAPI (Google)', value: 'serp' },
        { label: 'Model-native web search', value: 'native' },
      ],
    },
    {
      key: 'maxResults',
      label: 'Max Results',
      type: 'number',
      defaultValue: 5,
      min: 1,
      max: 20,
      step: 1,
    },
    {
      key: 'includeSnippets',
      label: 'Include Snippets',
      type: 'boolean',
      defaultValue: true,
    },
  ],
}

const OutputParserNodeDefinition: CoreNodeDefinition = {
  type: 'outputParser',
  label: 'Output Parser',
  icon: OutputParserIcon,
  description: 'Parses raw LLM text into structured JSON, YAML, or CSV.',
  category: 'output',
  inputs: [
    { id: 'text', label: 'Text', type: 'text' },
  ],
  outputs: [
    { id: 'structured', label: 'Structured', type: 'structured' },
  ],
  configFields: [
    {
      key: 'format',
      label: 'Output Format',
      type: 'select',
      defaultValue: 'json',
      options: [
        { label: 'JSON', value: 'json' },
        { label: 'YAML', value: 'yaml' },
        { label: 'CSV', value: 'csv' },
        { label: 'Markdown', value: 'markdown' },
        { label: 'Pydantic model', value: 'pydantic' },
      ],
    },
    {
      key: 'schema',
      label: 'Schema / Model',
      type: 'textarea',
      defaultValue: '{}',
      placeholder: 'JSON Schema or Pydantic class name…',
    },
    {
      key: 'strictMode',
      label: 'Strict Mode',
      type: 'boolean',
      defaultValue: false,
      description: 'Raise an error on parse failure instead of returning null.',
    },
  ],
}

const EvaluatorNodeDefinition: CoreNodeDefinition = {
  type: 'evaluator',
  label: 'Evaluator',
  icon: EvaluatorIcon,
  description: 'Scores LLM responses against a reference using automatic metrics.',
  category: 'output',
  inputs: [
    { id: 'response', label: 'Response', type: 'text' },
    { id: 'reference', label: 'Reference', type: 'text' },
  ],
  outputs: [
    { id: 'score', label: 'Score', type: 'structured' },
    { id: 'feedback', label: 'Feedback', type: 'text' },
  ],
  configFields: [
    {
      key: 'metric',
      label: 'Metric',
      type: 'select',
      defaultValue: 'faithfulness',
      options: [
        { label: 'Faithfulness', value: 'faithfulness' },
        { label: 'Relevance', value: 'relevance' },
        { label: 'Accuracy', value: 'accuracy' },
        { label: 'BLEU', value: 'bleu' },
        { label: 'ROUGE-L', value: 'rouge' },
        { label: 'LLM-as-judge', value: 'llm-judge' },
      ],
    },
    {
      key: 'threshold',
      label: 'Pass Threshold',
      type: 'slider',
      defaultValue: 0.8,
      min: 0,
      max: 1,
      step: 0.05,
    },
  ],
}

const GuardrailsNodeDefinition: CoreNodeDefinition = {
  type: 'guardrails',
  label: 'Guardrails',
  icon: GuardrailsIcon,
  description: 'Screens content for toxicity, PII, hallucination, or policy violations.',
  category: 'output',
  inputs: [
    { id: 'input', label: 'Input', type: 'text' },
  ],
  outputs: [
    { id: 'passed', label: 'Passed', type: 'text', color: '#16A34A' },
    { id: 'blocked', label: 'Blocked', type: 'structured', color: '#DC2626' },
  ],
  configFields: [
    {
      key: 'checks',
      label: 'Checks',
      type: 'text',
      defaultValue: 'toxicity, pii',
      placeholder: 'toxicity, pii, hallucination, bias…',
      description: 'Comma-separated list of guardrail checks to apply.',
    },
    {
      key: 'action',
      label: 'On Violation',
      type: 'select',
      defaultValue: 'block',
      options: [
        { label: 'Block', value: 'block' },
        { label: 'Warn', value: 'warn' },
        { label: 'Redact', value: 'redact' },
      ],
    },
  ],
}

// ── Entry / exit, orchestration & runtime nodes ──────────────────────────────

const TriggerNodeDefinition: CoreNodeDefinition = {
  type: 'trigger',
  label: 'Trigger',
  icon: TriggerIcon,
  description: 'Entry point that starts the workflow: user message, webhook, schedule, event, or API call.',
  category: 'core',
  inputs: [],
  outputs: [
    { id: 'payload', label: 'Payload', type: 'text' },
    { id: 'metadata', label: 'Metadata', type: 'structured' },
  ],
  configFields: [
    {
      key: 'triggerType',
      label: 'Trigger Type',
      type: 'select',
      defaultValue: 'user-message',
      options: [
        { label: 'User message (chat)', value: 'user-message' },
        { label: 'Webhook', value: 'webhook' },
        { label: 'Schedule (cron)', value: 'schedule' },
        { label: 'Event / queue', value: 'event' },
        { label: 'API request', value: 'api' },
        { label: 'File upload', value: 'file-upload' },
        { label: 'Manual run', value: 'manual' },
      ],
    },
    {
      key: 'schedule',
      label: 'Cron Schedule',
      type: 'text',
      defaultValue: '0 9 * * 1-5',
      placeholder: '0 9 * * 1-5',
      visibleWhen: { key: 'triggerType', value: 'schedule' },
    },
    {
      key: 'source',
      label: 'Source',
      type: 'text',
      defaultValue: '',
      placeholder: 'e.g. GitHub check_run, Stripe invoice.paid, /api/ask',
      description: 'What emits the trigger (endpoint, event name, or channel).',
    },
  ],
}

const OutputNodeDefinition: CoreNodeDefinition = {
  type: 'output',
  label: 'Output',
  icon: OutputIcon,
  description: 'Terminal node: delivers the final result to the user, an API response, a file, or another system.',
  category: 'core',
  inputs: [
    { id: 'input', label: 'Input', type: 'any' },
  ],
  outputs: [],
  configFields: [
    {
      key: 'destination',
      label: 'Destination',
      type: 'select',
      defaultValue: 'user',
      options: [
        { label: 'User (chat reply)', value: 'user' },
        { label: 'API response', value: 'api' },
        { label: 'File / artifact', value: 'file' },
        { label: 'Webhook / callback', value: 'webhook' },
        { label: 'Notification (Slack, email…)', value: 'notification' },
        { label: 'Database write', value: 'database' },
      ],
    },
    {
      key: 'format',
      label: 'Format',
      type: 'select',
      defaultValue: 'markdown',
      options: [
        { label: 'Plain text', value: 'text' },
        { label: 'Markdown', value: 'markdown' },
        { label: 'JSON', value: 'json' },
      ],
    },
    {
      key: 'streaming',
      label: 'Stream to Destination',
      type: 'boolean',
      defaultValue: false,
    },
  ],
}

const SubAgentNodeDefinition: CoreNodeDefinition = {
  type: 'subAgent',
  label: 'Sub-Agent',
  icon: SubAgentIcon,
  description: 'Specialist agent that an orchestrator agent delegates a task to; returns its result to the caller.',
  category: 'core',
  inputs: [
    { id: 'task', label: 'Task', type: 'text' },
    { id: 'context', label: 'Context', type: 'any' },
    { id: 'tools', label: 'Observations', type: 'any' },
  ],
  outputs: [
    { id: 'result', label: 'Result', type: 'text' },
    { id: 'artifacts', label: 'Artifacts', type: 'structured' },
    { id: 'toolRequests', label: 'Tool Requests', type: 'any' },
  ],
  configFields: [
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      defaultValue: 'claude-haiku-4-5',
      options: CHAT_MODEL_OPTIONS,
    },
    {
      key: 'role',
      label: 'Role / Instructions',
      type: 'textarea',
      defaultValue: '',
      placeholder: 'You research one topic and return a cited summary…',
    },
    {
      key: 'maxIterations',
      label: 'Max Iterations',
      type: 'number',
      defaultValue: 10,
      min: 1,
      max: 50,
      step: 1,
    },
    {
      key: 'returnMode',
      label: 'Returns',
      type: 'select',
      defaultValue: 'summary',
      options: [
        { label: 'Final summary only', value: 'summary' },
        { label: 'Structured result', value: 'structured' },
        { label: 'Full transcript', value: 'transcript' },
      ],
      description: 'How much of its work the sub-agent hands back to the orchestrator.',
    },
  ],
}

const HumanApprovalNodeDefinition: CoreNodeDefinition = {
  type: 'humanApproval',
  label: 'Human Approval',
  icon: HumanApprovalIcon,
  description: 'Pauses the run until a person approves, edits, or rejects a proposed action (human-in-the-loop).',
  category: 'flow',
  inputs: [
    { id: 'proposal', label: 'Proposal', type: 'any' },
    { id: 'context', label: 'Context', type: 'text' },
  ],
  outputs: [
    { id: 'approved', label: 'Approved', type: 'any', color: '#16A34A' },
    { id: 'rejected', label: 'Rejected', type: 'structured', color: '#DC2626' },
  ],
  configFields: [
    {
      key: 'channel',
      label: 'Review Channel',
      type: 'select',
      defaultValue: 'app',
      options: [
        { label: 'In-app review queue', value: 'app' },
        { label: 'Slack', value: 'slack' },
        { label: 'Email', value: 'email' },
        { label: 'Ticket (Jira, Linear…)', value: 'ticket' },
      ],
    },
    {
      key: 'approvers',
      label: 'Approvers',
      type: 'text',
      defaultValue: '',
      placeholder: 'on-call, finance-team',
    },
    {
      key: 'allowEdits',
      label: 'Allow Edits',
      type: 'boolean',
      defaultValue: true,
      description: 'Reviewer can modify the proposal before approving.',
    },
    {
      key: 'timeoutMinutes',
      label: 'Timeout (minutes)',
      type: 'number',
      defaultValue: 60,
      min: 0,
      max: 10080,
      step: 5,
      description: '0 = wait indefinitely.',
    },
    {
      key: 'onTimeout',
      label: 'On Timeout',
      type: 'select',
      defaultValue: 'reject',
      options: [
        { label: 'Reject', value: 'reject' },
        { label: 'Auto-approve', value: 'approve' },
        { label: 'Escalate', value: 'escalate' },
      ],
    },
  ],
}

const LoopNodeDefinition: CoreNodeDefinition = {
  type: 'loop',
  label: 'Loop / Map',
  icon: LoopIcon,
  description: 'Runs a sub-flow once per item (map, in parallel or in sequence) or repeats until a condition holds.',
  category: 'flow',
  inputs: [
    { id: 'items', label: 'Items', type: 'any' },
    { id: 'itemResult', label: 'Item Result', type: 'any' },
  ],
  outputs: [
    { id: 'item', label: 'Each Item', type: 'any' },
    { id: 'results', label: 'All Results', type: 'structured' },
  ],
  configFields: [
    {
      key: 'mode',
      label: 'Mode',
      type: 'select',
      defaultValue: 'parallel',
      options: [
        { label: 'Map — parallel', value: 'parallel' },
        { label: 'Map — sequential', value: 'sequential' },
        { label: 'Repeat while condition', value: 'while' },
      ],
    },
    {
      key: 'maxConcurrency',
      label: 'Max Concurrency',
      type: 'number',
      defaultValue: 5,
      min: 1,
      max: 100,
      step: 1,
      visibleWhen: { key: 'mode', value: 'parallel' },
    },
    {
      key: 'condition',
      label: 'Continue While',
      type: 'textarea',
      defaultValue: '',
      placeholder: 'score < 0.8',
      visibleWhen: { key: 'mode', value: 'while' },
    },
    {
      key: 'maxIterations',
      label: 'Max Iterations',
      type: 'number',
      defaultValue: 100,
      min: 1,
      max: 10000,
      step: 1,
    },
  ],
}

const MCPServerNodeDefinition: CoreNodeDefinition = {
  type: 'mcpServer',
  label: 'MCP Server',
  icon: MCPServerIcon,
  description: 'Model Context Protocol server exposing a set of tools (and resources) to an agent through one connection.',
  category: 'tool',
  inputs: [
    { id: 'call', label: 'Call', type: 'tool-call' },
  ],
  outputs: [
    { id: 'result', label: 'Result', type: 'structured' },
  ],
  configFields: [
    {
      key: 'serverName',
      label: 'Server Name',
      type: 'text',
      defaultValue: '',
      placeholder: 'github, linear, postgres…',
    },
    {
      key: 'transport',
      label: 'Transport',
      type: 'select',
      defaultValue: 'http',
      options: [
        { label: 'Streamable HTTP (remote)', value: 'http' },
        { label: 'stdio (local process)', value: 'stdio' },
      ],
    },
    {
      key: 'endpoint',
      label: 'URL / Command',
      type: 'text',
      defaultValue: '',
      placeholder: 'https://mcp.example.com/mcp  or  npx my-mcp-server',
    },
    {
      key: 'allowedTools',
      label: 'Allowed Tools',
      type: 'text',
      defaultValue: '',
      placeholder: 'search_issues, create_issue (blank = all)',
    },
    {
      key: 'requireApproval',
      label: 'Require Approval for Writes',
      type: 'boolean',
      defaultValue: false,
    },
  ],
}

const CodeExecNodeDefinition: CoreNodeDefinition = {
  type: 'codeExec',
  label: 'Code Execution',
  icon: CodeExecIcon,
  description: 'Runs model-written code in a sandbox (analysis, file transforms, calculations) and returns the output.',
  category: 'tool',
  inputs: [
    { id: 'call', label: 'Call', type: 'tool-call' },
    { id: 'files', label: 'Files', type: 'any' },
  ],
  outputs: [
    { id: 'result', label: 'Result', type: 'structured' },
    { id: 'stdout', label: 'Stdout', type: 'text' },
  ],
  configFields: [
    {
      key: 'language',
      label: 'Language',
      type: 'select',
      defaultValue: 'python',
      options: [
        { label: 'Python', value: 'python' },
        { label: 'JavaScript / TypeScript', value: 'javascript' },
        { label: 'Bash', value: 'bash' },
      ],
    },
    {
      key: 'sandbox',
      label: 'Sandbox',
      type: 'select',
      defaultValue: 'hosted',
      options: [
        { label: 'Provider-hosted (server tool)', value: 'hosted' },
        { label: 'Container (Docker, E2B…)', value: 'container' },
        { label: 'Local process', value: 'local' },
      ],
    },
    {
      key: 'timeout',
      label: 'Timeout (s)',
      type: 'number',
      defaultValue: 60,
      min: 1,
      max: 3600,
      step: 1,
    },
    {
      key: 'networkAccess',
      label: 'Network Access',
      type: 'boolean',
      defaultValue: false,
    },
  ],
}

const StateNodeDefinition: CoreNodeDefinition = {
  type: 'state',
  label: 'State',
  icon: StateIcon,
  description: 'Shared workflow state that steps read and write (status, decisions, intermediate results), optionally checkpointed so paused or failed runs can resume.',
  category: 'core',
  inputs: [
    { id: 'write', label: 'Write', type: 'any' },
  ],
  outputs: [
    { id: 'read', label: 'Read', type: 'any' },
  ],
  configFields: [
    {
      key: 'scope',
      label: 'Scope',
      type: 'select',
      defaultValue: 'run',
      options: [
        { label: 'Run (one execution)', value: 'run' },
        { label: 'Session (one conversation)', value: 'session' },
        { label: 'User (across sessions)', value: 'user' },
        { label: 'Global (shared by all runs)', value: 'global' },
      ],
    },
    {
      key: 'keys',
      label: 'Keys / Schema',
      type: 'textarea',
      defaultValue: '',
      placeholder: 'status, assignee, approval_decision  — or a JSON Schema',
      description: 'What the state holds. Comma-separated keys or a JSON Schema.',
    },
    {
      key: 'backend',
      label: 'Backend',
      type: 'select',
      defaultValue: 'memory',
      options: [
        { label: 'In-memory (not durable)', value: 'memory' },
        { label: 'Redis', value: 'redis' },
        { label: 'Postgres', value: 'postgres' },
      ],
    },
    {
      key: 'checkpointing',
      label: 'Checkpointing',
      type: 'select',
      defaultValue: 'pause',
      options: [
        { label: 'Off', value: 'off' },
        { label: 'Every step', value: 'step' },
        { label: 'Before tool calls', value: 'tools' },
        { label: 'When the run pauses (approval, waits)', value: 'pause' },
      ],
      visibleWhen: { key: 'backend', oneOf: ['redis', 'postgres'] },
      description: 'When to persist a snapshot the run can resume from.',
    },
    {
      key: 'retentionDays',
      label: 'Retention (days)',
      type: 'number',
      defaultValue: 30,
      min: 0,
      max: 3650,
      step: 1,
      visibleWhen: { key: 'backend', oneOf: ['redis', 'postgres'] },
      description: '0 = keep forever.',
    },
  ],
}

const TracingNodeDefinition: CoreNodeDefinition = {
  type: 'tracing',
  label: 'Tracing',
  icon: TracingIcon,
  description: 'Observability sink: records traces of every step (prompts, tool calls, tokens, latency) for the whole flow or its frame. Not wired with edges.',
  category: 'output',
  inputs: [],
  outputs: [],
  configFields: [
    {
      key: 'provider',
      label: 'Provider',
      type: 'select',
      defaultValue: 'opentelemetry',
      options: [
        { label: 'OpenTelemetry (OTLP)', value: 'opentelemetry' },
        { label: 'Langfuse', value: 'langfuse' },
        { label: 'LangSmith', value: 'langsmith' },
        { label: 'Arize Phoenix', value: 'phoenix' },
        { label: 'Datadog LLM Observability', value: 'datadog' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'scope',
      label: 'Scope',
      type: 'select',
      defaultValue: 'flow',
      options: [
        { label: 'Whole flow', value: 'flow' },
        { label: 'Nodes in the same frame', value: 'frame' },
      ],
    },
    {
      key: 'endpoint',
      label: 'Endpoint / Project',
      type: 'text',
      defaultValue: '',
      placeholder: 'https://otel-collector:4318  or  project name',
    },
    {
      key: 'captureContent',
      label: 'Capture Prompts & Responses',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'captureToolCalls',
      label: 'Capture Tool Calls',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'captureUsage',
      label: 'Capture Tokens & Cost',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'redactPII',
      label: 'Redact PII',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'sampleRate',
      label: 'Sample Rate',
      type: 'slider',
      defaultValue: 1,
      min: 0,
      max: 1,
      step: 0.05,
      description: 'Fraction of runs traced.',
    },
  ],
}

const MonitorNodeDefinition: CoreNodeDefinition = {
  type: 'monitor',
  label: 'Monitor',
  icon: MonitorIcon,
  description: 'Watches a runtime metric (latency, errors, cost, refusals, eval score) over a time window and raises an alert when it crosses a threshold.',
  category: 'output',
  inputs: [
    { id: 'metrics', label: 'Metrics', type: 'any' },
  ],
  outputs: [
    { id: 'alert', label: 'Alert', type: 'structured', color: '#DC2626' },
  ],
  configFields: [
    {
      key: 'metric',
      label: 'Metric',
      type: 'select',
      defaultValue: 'latencyP95',
      options: [
        { label: 'Latency p95 (s)', value: 'latencyP95' },
        { label: 'Error rate (%)', value: 'errorRate' },
        { label: 'Cost per run ($)', value: 'costPerRun' },
        { label: 'Refusal rate (%)', value: 'refusalRate' },
        { label: 'Eval score', value: 'evalScore' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customMetric',
      label: 'Custom Metric',
      type: 'text',
      defaultValue: '',
      placeholder: 'e.g. approval_wait_minutes',
      visibleWhen: { key: 'metric', value: 'custom' },
    },
    {
      key: 'operator',
      label: 'Alert When',
      type: 'select',
      defaultValue: '>',
      options: [
        { label: 'Above threshold', value: '>' },
        { label: 'Below threshold', value: '<' },
      ],
    },
    {
      key: 'threshold',
      label: 'Threshold',
      type: 'number',
      defaultValue: 10,
      min: 0,
      step: 0.1,
      description: 'In the metric\'s unit (seconds, %, $, or score).',
    },
    {
      key: 'window',
      label: 'Window',
      type: 'select',
      defaultValue: '1h',
      options: [
        { label: '5 minutes', value: '5m' },
        { label: '1 hour', value: '1h' },
        { label: '24 hours', value: '24h' },
      ],
    },
  ],
}

const EvalDatasetNodeDefinition: CoreNodeDefinition = {
  type: 'evalDataset',
  label: 'Eval Dataset',
  icon: EvalDatasetIcon,
  description: 'Versioned set of test cases (input + expected output) that starts an eval run; feed it into a Loop to run each case.',
  category: 'eval',
  inputs: [],
  outputs: [
    { id: 'cases', label: 'Test Cases', type: 'any' },
    { id: 'metadata', label: 'Metadata', type: 'structured' },
  ],
  configFields: [
    {
      key: 'source',
      label: 'Source',
      type: 'select',
      defaultValue: 'file',
      options: [
        { label: 'File (JSONL / CSV)', value: 'file' },
        { label: 'Eval platform dataset (Langfuse, LangSmith, Braintrust…)', value: 'platform' },
        { label: 'Hugging Face dataset', value: 'huggingface' },
        { label: 'Sampled production traces', value: 'traces' },
        { label: 'Synthetic (LLM-generated)', value: 'synthetic' },
      ],
    },
    {
      key: 'path',
      label: 'Path / Dataset Name',
      type: 'text',
      defaultValue: '',
      placeholder: 'data/eval_set.jsonl',
    },
    {
      key: 'version',
      label: 'Version',
      type: 'text',
      defaultValue: '',
      placeholder: 'v3 or a commit hash',
      description: 'Pin the dataset so results stay comparable across runs.',
    },
    {
      key: 'inputField',
      label: 'Input Field',
      type: 'text',
      defaultValue: 'input',
    },
    {
      key: 'expectedField',
      label: 'Expected Field',
      type: 'text',
      defaultValue: 'expected',
      description: 'Leave blank for reference-free evals.',
    },
    {
      key: 'split',
      label: 'Split',
      type: 'select',
      defaultValue: 'test',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Train / dev', value: 'train' },
        { label: 'Validation', value: 'validation' },
        { label: 'Test (held out)', value: 'test' },
      ],
    },
    {
      key: 'sampleSize',
      label: 'Sample Size',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 100000,
      step: 10,
      description: '0 = every case.',
    },
  ],
}

const AssertionNodeDefinition: CoreNodeDefinition = {
  type: 'assertion',
  label: 'Assertion',
  icon: AssertionIcon,
  description: 'Deterministic, rule-based check (JSON schema, contains, regex, exact match, code tests, end-state check). Cheaper and more reliable than an LLM judge when the property is checkable; use one node per check.',
  category: 'eval',
  inputs: [
    { id: 'output', label: 'Output', type: 'any' },
    { id: 'expected', label: 'Expected', type: 'any' },
  ],
  outputs: [
    { id: 'score', label: 'Pass / Fail', type: 'structured' },
    { id: 'failures', label: 'Failure Details', type: 'text' },
  ],
  configFields: [
    {
      key: 'checkType',
      label: 'Check',
      type: 'select',
      defaultValue: 'json-schema',
      options: [
        { label: 'Matches JSON schema', value: 'json-schema' },
        { label: 'Contains', value: 'contains' },
        { label: 'Does not contain', value: 'not-contains' },
        { label: 'Matches regex', value: 'regex' },
        { label: 'Equals expected', value: 'equals' },
        { label: 'Code runs & tests pass', value: 'code-tests' },
        { label: 'End state matches (DB / files / API)', value: 'state-check' },
        { label: 'Custom function', value: 'custom' },
      ],
    },
    {
      key: 'spec',
      label: 'Specification',
      type: 'textarea',
      defaultValue: '',
      placeholder: 'Schema, text, pattern, test command, or state query — depending on the check',
      description: 'For "equals", leave blank to compare against the Expected input.',
    },
    {
      key: 'caseSensitive',
      label: 'Case Sensitive',
      type: 'boolean',
      defaultValue: false,
      visibleWhen: { key: 'checkType', oneOf: ['contains', 'not-contains', 'regex', 'equals'] },
    },
    {
      key: 'timeout',
      label: 'Timeout (s)',
      type: 'number',
      defaultValue: 60,
      min: 1,
      max: 3600,
      step: 1,
      visibleWhen: { key: 'checkType', oneOf: ['code-tests', 'state-check', 'custom'] },
    },
  ],
}

const UserSimulatorNodeDefinition: CoreNodeDefinition = {
  type: 'userSimulator',
  label: 'User Simulator',
  icon: UserSimulatorIcon,
  description: 'LLM that plays a user with a persona and goal, conversing with the agent for several turns to produce conversations for multi-turn evals.',
  category: 'eval',
  inputs: [
    { id: 'scenario', label: 'Scenario', type: 'structured' },
    { id: 'agentReply', label: 'Agent Reply', type: 'text' },
  ],
  outputs: [
    { id: 'message', label: 'User Message', type: 'text' },
    { id: 'conversation', label: 'Conversation', type: 'structured' },
  ],
  configFields: [
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      defaultValue: DEFAULT_CHAT_MODEL,
      options: CHAT_MODEL_OPTIONS,
    },
    {
      key: 'persona',
      label: 'Persona',
      type: 'textarea',
      defaultValue: '',
      placeholder: 'Impatient small-business owner, not technical, double-charged last month…',
      description: 'Overridden per case when a Scenario is connected.',
    },
    {
      key: 'goal',
      label: 'Goal',
      type: 'textarea',
      defaultValue: '',
      placeholder: 'Get a refund for the duplicate charge',
    },
    {
      key: 'maxTurns',
      label: 'Max Turns',
      type: 'number',
      defaultValue: 8,
      min: 1,
      max: 50,
      step: 1,
    },
    {
      key: 'stopWhen',
      label: 'Stop When',
      type: 'select',
      defaultValue: 'goal-or-max',
      options: [
        { label: 'Goal reached or max turns', value: 'goal-or-max' },
        { label: 'Agent ends the conversation', value: 'agent-ends' },
        { label: 'Always run max turns', value: 'max-turns' },
      ],
    },
  ],
}

// ── Evaluation strategy nodes ─────────────────────────────────────────────────

const LLMJudgeNodeDefinition: CoreNodeDefinition = {
  type: 'llmJudge',
  label: 'LLM Judge',
  icon: LLMJudgeIcon,
  description: 'Uses an LLM to score or evaluate another model\'s output against a rubric.',
  category: 'eval',
  inputs: [
    { id: 'response', label: 'Response', type: 'text' },
    { id: 'criteria', label: 'Criteria', type: 'structured' },
    { id: 'reference', label: 'Reference', type: 'text' },
  ],
  outputs: [
    { id: 'score', label: 'Score', type: 'structured' },
    { id: 'reasoning', label: 'Reasoning', type: 'text' },
  ],
  configFields: [
    {
      key: 'judgeModel',
      label: 'Judge Model',
      type: 'select',
      defaultValue: DEFAULT_JUDGE_MODEL,
      options: JUDGE_MODEL_OPTIONS,
    },
    {
      key: 'scoringScale',
      label: 'Scoring Scale',
      type: 'select',
      defaultValue: '1-5',
      options: [
        { label: '1–5', value: '1-5' },
        { label: '1–10', value: '1-10' },
        { label: '0–1', value: '0-1' },
        { label: 'Pass / Fail', value: 'pass-fail' },
      ],
    },
    {
      key: 'systemPrompt',
      label: 'Judge Prompt',
      type: 'textarea',
      defaultValue: 'You are an expert evaluator. Score the response on the given criteria.',
      placeholder: 'Instructions for the judge LLM…',
    },
    {
      key: 'requireReasoning',
      label: 'Require Reasoning',
      type: 'boolean',
      defaultValue: true,
    },
  ],
}

const RubricNodeDefinition: CoreNodeDefinition = {
  type: 'rubric',
  label: 'Rubric',
  icon: RubricIcon,
  description: 'Defines evaluation criteria and scoring dimensions for downstream judges.',
  category: 'eval',
  inputs: [
    { id: 'task', label: 'Task', type: 'text' },
  ],
  outputs: [
    { id: 'criteria', label: 'Criteria', type: 'structured' },
  ],
  configFields: [
    {
      key: 'criteria',
      label: 'Criteria',
      type: 'textarea',
      defaultValue: 'Correctness\nRelevance\nCoherence\nConciseness',
      placeholder: 'One criterion per line…',
    },
    {
      key: 'scale',
      label: 'Scoring Scale',
      type: 'select',
      defaultValue: '1-5',
      options: [
        { label: '1–5', value: '1-5' },
        { label: '1–10', value: '1-10' },
        { label: '0–1', value: '0-1' },
        { label: 'Pass / Fail', value: 'pass-fail' },
      ],
    },
    {
      key: 'weighted',
      label: 'Weighted Scoring',
      type: 'boolean',
      defaultValue: false,
    },
  ],
}

const ComparatorNodeDefinition: CoreNodeDefinition = {
  type: 'comparator',
  label: 'A/B Comparator',
  icon: ComparatorIcon,
  description: 'Pairwise comparison of two model responses — picks the better one.',
  category: 'eval',
  inputs: [
    { id: 'responseA', label: 'Response A', type: 'text' },
    { id: 'responseB', label: 'Response B', type: 'text' },
    { id: 'criteria', label: 'Criteria', type: 'structured' },
  ],
  outputs: [
    { id: 'winner', label: 'Winner', type: 'structured' },
    { id: 'reasoning', label: 'Reasoning', type: 'text' },
  ],
  configFields: [
    {
      key: 'judgeModel',
      label: 'Judge Model',
      type: 'select',
      defaultValue: DEFAULT_JUDGE_MODEL,
      options: JUDGE_MODEL_OPTIONS,
    },
    {
      key: 'positionBias',
      label: 'Swap Position Bias',
      type: 'boolean',
      defaultValue: true,
      description: 'Run comparison twice with A/B swapped to reduce position bias',
    },
  ],
}

const GroundTruthNodeDefinition: CoreNodeDefinition = {
  type: 'groundTruth',
  label: 'Ground Truth',
  icon: GroundTruthIcon,
  description: 'Provides reference answers for evaluation — from dataset, DB, or manual entry.',
  category: 'eval',
  inputs: [
    { id: 'query', label: 'Query', type: 'text' },
  ],
  outputs: [
    { id: 'reference', label: 'Reference', type: 'text' },
    { id: 'metadata', label: 'Metadata', type: 'structured' },
  ],
  configFields: [
    {
      key: 'source',
      label: 'Source',
      type: 'select',
      defaultValue: 'manual',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Dataset (CSV/JSON)', value: 'dataset' },
        { label: 'Database', value: 'database' },
        { label: 'Annotation Tool', value: 'annotation' },
      ],
    },
    {
      key: 'answer',
      label: 'Reference Answer',
      type: 'textarea',
      defaultValue: '',
      placeholder: 'Enter expected answer…',
    },
    {
      key: 'datasetPath',
      label: 'Dataset Path',
      type: 'text',
      defaultValue: '',
      placeholder: 'data/eval_set.jsonl',
    },
  ],
}

const EvalMetricsNodeDefinition: CoreNodeDefinition = {
  type: 'evalMetrics',
  label: 'Metrics',
  icon: EvalMetricsIcon,
  description: 'Computes automated metrics: BLEU, ROUGE, BERTScore, F1, exact match.',
  category: 'eval',
  inputs: [
    { id: 'response', label: 'Response', type: 'text' },
    { id: 'reference', label: 'Reference', type: 'text' },
  ],
  outputs: [
    { id: 'scores', label: 'Scores', type: 'structured' },
  ],
  configFields: [
    {
      key: 'bleu',
      label: 'BLEU',
      type: 'boolean',
      defaultValue: false,
    },
    {
      key: 'rouge',
      label: 'ROUGE-L',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'bertScore',
      label: 'BERTScore',
      type: 'boolean',
      defaultValue: false,
    },
    {
      key: 'exactMatch',
      label: 'Exact Match',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'f1',
      label: 'Token F1',
      type: 'boolean',
      defaultValue: true,
    },
  ],
}

const CritiqueNodeDefinition: CoreNodeDefinition = {
  type: 'critique',
  label: 'Critique',
  icon: CritiqueIcon,
  description: 'Self-critique loop — model reviews its own output and optionally revises it.',
  category: 'eval',
  inputs: [
    { id: 'response', label: 'Response', type: 'text' },
    { id: 'task', label: 'Task', type: 'text' },
  ],
  outputs: [
    { id: 'critique', label: 'Critique', type: 'text' },
    { id: 'revised', label: 'Revised', type: 'text' },
  ],
  configFields: [
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      defaultValue: DEFAULT_CHAT_MODEL,
      options: CHAT_MODEL_OPTIONS,
    },
    {
      key: 'critiqueAspects',
      label: 'Critique Aspects',
      type: 'textarea',
      defaultValue: 'Factual accuracy\nCompleteness\nClarity\nTone',
      placeholder: 'One aspect per line…',
    },
    {
      key: 'autoRevise',
      label: 'Auto-Revise',
      type: 'boolean',
      defaultValue: true,
      description: 'Automatically generate a revised response after critique',
    },
    {
      key: 'maxIterations',
      label: 'Max Iterations',
      type: 'number',
      defaultValue: 1,
      min: 1,
      max: 5,
    },
  ],
}

const ThresholdGateNodeDefinition: CoreNodeDefinition = {
  type: 'thresholdGate',
  label: 'Threshold Gate',
  icon: ThresholdGateIcon,
  description: 'Routes flow based on whether a score passes or fails a defined threshold.',
  category: 'eval',
  inputs: [
    { id: 'score', label: 'Score', type: 'structured' },
    { id: 'payload', label: 'Payload', type: 'any' },
  ],
  outputs: [
    { id: 'pass', label: 'Pass', type: 'any' },
    { id: 'fail', label: 'Fail', type: 'any' },
  ],
  configFields: [
    {
      key: 'metric',
      label: 'Metric Key',
      type: 'text',
      defaultValue: 'score',
      placeholder: 'e.g. score, rouge_l, f1',
    },
    {
      key: 'threshold',
      label: 'Threshold',
      type: 'slider',
      defaultValue: 0.7,
      min: 0,
      max: 1,
      step: 0.05,
    },
    {
      key: 'operator',
      label: 'Operator',
      type: 'select',
      defaultValue: '>=',
      options: [
        { label: '≥ (pass if above)', value: '>=' },
        { label: '≤ (pass if below)', value: '<=' },
        { label: '= (exact match)', value: '=' },
      ],
    },
    {
      key: 'failAction',
      label: 'On Fail',
      type: 'select',
      defaultValue: 'route',
      options: [
        { label: 'Route to fail output', value: 'route' },
        { label: 'Retry upstream', value: 'retry' },
        { label: 'Raise error', value: 'error' },
      ],
    },
  ],
}

const HumanRaterNodeDefinition: CoreNodeDefinition = {
  type: 'humanRater',
  label: 'Human Rater',
  icon: HumanRaterIcon,
  description: 'Human-in-the-loop evaluation step — collects ratings and free-text feedback.',
  category: 'eval',
  inputs: [
    { id: 'response', label: 'Response', type: 'text' },
    { id: 'criteria', label: 'Criteria', type: 'structured' },
  ],
  outputs: [
    { id: 'rating', label: 'Rating', type: 'structured' },
    { id: 'feedback', label: 'Feedback', type: 'text' },
  ],
  configFields: [
    {
      key: 'ratingScale',
      label: 'Rating Scale',
      type: 'select',
      defaultValue: '1-5',
      options: [
        { label: '1–5 Stars', value: '1-5' },
        { label: 'Thumbs Up/Down', value: 'binary' },
        { label: '1–10', value: '1-10' },
        { label: 'Likert (Strongly disagree → Agree)', value: 'likert' },
      ],
    },
    {
      key: 'interface',
      label: 'Interface',
      type: 'select',
      defaultValue: 'form',
      options: [
        { label: 'Web Form', value: 'form' },
        { label: 'Label Studio', value: 'labelstudio' },
        { label: 'Argilla', value: 'argilla' },
        { label: 'Slack', value: 'slack' },
      ],
    },
    {
      key: 'requireFeedback',
      label: 'Require Free-Text Feedback',
      type: 'boolean',
      defaultValue: false,
    },
  ],
}

const RAGEvaluatorNodeDefinition: CoreNodeDefinition = {
  type: 'ragEvaluator',
  label: 'RAG Evaluator',
  icon: RAGEvalIcon,
  description: 'Measures retrieval and generation quality: Recall@k, Precision@k, MRR, NDCG@k, Faithfulness, Context Precision/Recall.',
  category: 'eval',
  inputs: [
    { id: 'query',     label: 'Query',     type: 'text' },
    { id: 'contexts',  label: 'Contexts',  type: 'text' },
    { id: 'response',  label: 'Response',  type: 'text' },
    { id: 'reference', label: 'Reference', type: 'text' },
  ],
  outputs: [
    { id: 'scores', label: 'Scores', type: 'structured' },
  ],
  configFields: [
    {
      key: 'k',
      label: 'k (top-k cutoff)',
      type: 'number',
      defaultValue: 5,
      min: 1,
      max: 20,
      description: 'Cutoff rank used for Recall@k, Precision@k, NDCG@k',
    },
    {
      key: 'recallAtK',
      label: 'Recall@k',
      type: 'boolean',
      defaultValue: true,
      description: 'Fraction of relevant docs found in top-k results',
    },
    {
      key: 'precisionAtK',
      label: 'Precision@k',
      type: 'boolean',
      defaultValue: true,
      description: 'Fraction of top-k results that are relevant',
    },
    {
      key: 'mrr',
      label: 'MRR (Mean Reciprocal Rank)',
      type: 'boolean',
      defaultValue: true,
      description: 'Rank of the first relevant document (1/rank)',
    },
    {
      key: 'ndcgAtK',
      label: 'NDCG@k',
      type: 'boolean',
      defaultValue: false,
      description: 'Normalised Discounted Cumulative Gain — rewards ranking relevant docs higher',
    },
    {
      key: 'faithfulness',
      label: 'Faithfulness',
      type: 'boolean',
      defaultValue: true,
      description: 'Is the generated answer grounded in the retrieved context? (LLM-based)',
    },
    {
      key: 'answerRelevancy',
      label: 'Answer Relevancy',
      type: 'boolean',
      defaultValue: true,
      description: 'Does the answer actually address the query? (LLM-based)',
    },
    {
      key: 'contextPrecision',
      label: 'Context Precision',
      type: 'boolean',
      defaultValue: false,
      description: 'Are the retrieved chunks relevant to the query?',
    },
    {
      key: 'contextRecall',
      label: 'Context Recall',
      type: 'boolean',
      defaultValue: false,
      description: 'Did retrieval surface all information needed to answer?',
    },
    {
      key: 'judgeModel',
      label: 'LLM Judge (for LLM-based metrics)',
      type: 'select',
      defaultValue: DEFAULT_JUDGE_MODEL,
      options: JUDGE_MODEL_OPTIONS,
    },
  ],
}

// ── Agent evaluation nodes ────────────────────────────────────────────────────

const SingleTurnEvalNodeDefinition: CoreNodeDefinition = {
  type: 'singleTurnEval',
  label: 'Single-Turn Eval',
  icon: SingleTurnEvalIcon,
  description: 'Evaluates one query-response exchange on relevance, correctness, and helpfulness.',
  category: 'eval',
  inputs: [
    { id: 'query',    label: 'Query',    type: 'text' },
    { id: 'response', label: 'Response', type: 'text' },
    { id: 'criteria', label: 'Criteria', type: 'structured' },
  ],
  outputs: [
    { id: 'score',     label: 'Score',     type: 'structured' },
    { id: 'reasoning', label: 'Reasoning', type: 'text' },
  ],
  configFields: [
    {
      key: 'judgeModel',
      label: 'Judge Model',
      type: 'select',
      defaultValue: DEFAULT_JUDGE_MODEL,
      options: JUDGE_MODEL_OPTIONS,
    },
    {
      key: 'relevance',
      label: 'Relevance',
      type: 'boolean',
      defaultValue: true,
      description: 'Does the response address the query?',
    },
    {
      key: 'correctness',
      label: 'Correctness',
      type: 'boolean',
      defaultValue: true,
      description: 'Is the response factually accurate?',
    },
    {
      key: 'helpfulness',
      label: 'Helpfulness',
      type: 'boolean',
      defaultValue: true,
      description: 'Is the response actionable and useful?',
    },
    {
      key: 'harmlessness',
      label: 'Harmlessness',
      type: 'boolean',
      defaultValue: false,
      description: 'Does the response avoid harmful content?',
    },
    {
      key: 'scale',
      label: 'Scoring Scale',
      type: 'select',
      defaultValue: '1-5',
      options: [
        { label: '1–5', value: '1-5' },
        { label: '1–10', value: '1-10' },
        { label: 'Pass / Fail', value: 'pass-fail' },
      ],
    },
  ],
}

const MultiTurnEvalNodeDefinition: CoreNodeDefinition = {
  type: 'multiTurnEval',
  label: 'Multi-Turn Eval',
  icon: MultiTurnEvalIcon,
  description: 'Evaluates a full conversation: coherence, goal progress, consistency across turns.',
  category: 'eval',
  inputs: [
    { id: 'conversation', label: 'Conversation', type: 'structured' },
    { id: 'goal',         label: 'Goal',         type: 'text' },
  ],
  outputs: [
    { id: 'scores',   label: 'Scores',   type: 'structured' },
    { id: 'analysis', label: 'Analysis', type: 'text' },
  ],
  configFields: [
    {
      key: 'judgeModel',
      label: 'Judge Model',
      type: 'select',
      defaultValue: DEFAULT_JUDGE_MODEL,
      options: JUDGE_MODEL_OPTIONS,
    },
    {
      key: 'coherence',
      label: 'Coherence',
      type: 'boolean',
      defaultValue: true,
      description: 'Does each response follow naturally from prior turns?',
    },
    {
      key: 'goalProgress',
      label: 'Goal Progress',
      type: 'boolean',
      defaultValue: true,
      description: 'Is the agent moving toward the stated goal?',
    },
    {
      key: 'consistency',
      label: 'Consistency',
      type: 'boolean',
      defaultValue: true,
      description: 'Does the agent avoid contradicting itself across turns?',
    },
    {
      key: 'contextRetention',
      label: 'Context Retention',
      type: 'boolean',
      defaultValue: false,
      description: 'Does the agent correctly recall earlier conversation details?',
    },
    {
      key: 'turnWindow',
      label: 'Turn Window',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 20,
      description: 'Evaluate last N turns only (0 = full conversation)',
    },
  ],
}

const ToolUseEvalNodeDefinition: CoreNodeDefinition = {
  type: 'toolUseEval',
  label: 'Tool Use Eval',
  icon: ToolUseEvalIcon,
  description: 'Checks whether the agent called the correct tools with correct arguments.',
  category: 'eval',
  inputs: [
    { id: 'toolCalls',      label: 'Tool Calls',      type: 'structured' },
    { id: 'expectedTools',  label: 'Expected Tools',  type: 'structured' },
    { id: 'task',           label: 'Task',            type: 'text' },
  ],
  outputs: [
    { id: 'scores', label: 'Scores', type: 'structured' },
  ],
  configFields: [
    {
      key: 'toolSelection',
      label: 'Tool Selection',
      type: 'boolean',
      defaultValue: true,
      description: 'Did the agent pick the right tools?',
    },
    {
      key: 'argumentCorrectness',
      label: 'Argument Correctness',
      type: 'boolean',
      defaultValue: true,
      description: 'Were the tool arguments valid and appropriate?',
    },
    {
      key: 'orderMatters',
      label: 'Order Matters',
      type: 'boolean',
      defaultValue: false,
      description: 'Penalise incorrect tool call ordering',
    },
    {
      key: 'redundantCalls',
      label: 'Flag Redundant Calls',
      type: 'boolean',
      defaultValue: true,
      description: 'Penalise unnecessary or duplicate tool calls',
    },
    {
      key: 'matchStrategy',
      label: 'Match Strategy',
      type: 'select',
      defaultValue: 'exact',
      options: [
        { label: 'Exact name match', value: 'exact' },
        { label: 'Semantic match (LLM)', value: 'semantic' },
        { label: 'Subset match', value: 'subset' },
      ],
    },
  ],
}

const TrajectoryEvalNodeDefinition: CoreNodeDefinition = {
  type: 'trajectoryEval',
  label: 'Trajectory Eval',
  icon: TrajectoryEvalIcon,
  description: 'Evaluates the full sequence of agent actions — not just the final answer.',
  category: 'eval',
  inputs: [
    { id: 'trajectory',         label: 'Trajectory',         type: 'structured' },
    { id: 'goal',               label: 'Goal',               type: 'text' },
    { id: 'expectedTrajectory', label: 'Expected Trajectory', type: 'structured' },
  ],
  outputs: [
    { id: 'score',    label: 'Score',    type: 'structured' },
    { id: 'feedback', label: 'Feedback', type: 'text' },
  ],
  configFields: [
    {
      key: 'judgeModel',
      label: 'Judge Model',
      type: 'select',
      defaultValue: DEFAULT_JUDGE_MODEL,
      options: JUDGE_MODEL_OPTIONS,
    },
    {
      key: 'strategy',
      label: 'Eval Strategy',
      type: 'select',
      defaultValue: 'llm',
      options: [
        { label: 'LLM-as-judge', value: 'llm' },
        { label: 'Exact trajectory match', value: 'exact' },
        { label: 'Subset match (any valid path)', value: 'subset' },
      ],
    },
    {
      key: 'terminalStateWeight',
      label: 'Terminal State Weight',
      type: 'slider',
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.1,
      description: 'How much to weight the final outcome vs intermediate steps',
    },
    {
      key: 'stepEfficiency',
      label: 'Penalise Extra Steps',
      type: 'boolean',
      defaultValue: false,
      description: 'Reduce score for unnecessary steps taken',
    },
  ],
}

const TaskCompletionNodeDefinition: CoreNodeDefinition = {
  type: 'taskCompletion',
  label: 'Task Completion',
  icon: TaskCompletionIcon,
  description: 'Binary or graded assessment of whether the agent achieved the specified goal.',
  category: 'eval',
  inputs: [
    { id: 'result',           label: 'Result',            type: 'any' },
    { id: 'taskDescription',  label: 'Task Description',  type: 'text' },
    { id: 'successCriteria',  label: 'Success Criteria',  type: 'structured' },
  ],
  outputs: [
    { id: 'completed', label: 'Completed', type: 'structured' },
    { id: 'score',     label: 'Score',     type: 'structured' },
    { id: 'reasoning', label: 'Reasoning', type: 'text' },
  ],
  configFields: [
    {
      key: 'completionType',
      label: 'Completion Type',
      type: 'select',
      defaultValue: 'graded',
      options: [
        { label: 'Binary (pass/fail)', value: 'binary' },
        { label: 'Graded (0–1)', value: 'graded' },
        { label: 'Multi-criteria', value: 'multi' },
      ],
    },
    {
      key: 'judgeModel',
      label: 'Judge Model',
      type: 'select',
      defaultValue: DEFAULT_JUDGE_MODEL,
      options: JUDGE_MODEL_OPTIONS,
    },
    {
      key: 'allowPartialCredit',
      label: 'Partial Credit',
      type: 'boolean',
      defaultValue: true,
      description: 'Award partial score for partially completed tasks',
    },
  ],
}

const AgentEfficiencyNodeDefinition: CoreNodeDefinition = {
  type: 'agentEfficiency',
  label: 'Agent Efficiency',
  icon: AgentEfficiencyIcon,
  description: 'Measures agent efficiency: steps taken, tool calls, tokens used, and estimated cost.',
  category: 'eval',
  inputs: [
    { id: 'trajectory', label: 'Trajectory', type: 'structured' },
  ],
  outputs: [
    { id: 'metrics', label: 'Metrics', type: 'structured' },
  ],
  configFields: [
    {
      key: 'trackSteps',
      label: 'Track Steps',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'trackToolCalls',
      label: 'Track Tool Calls',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'trackTokens',
      label: 'Track Tokens',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'trackCost',
      label: 'Track Estimated Cost',
      type: 'boolean',
      defaultValue: false,
    },
    {
      key: 'costPerMillionTokens',
      label: 'Cost per 1M Tokens ($)',
      type: 'number',
      defaultValue: 5,
      min: 0,
      step: 0.5,
    },
    {
      key: 'budgetThreshold',
      label: 'Budget Threshold ($)',
      type: 'number',
      defaultValue: 0.1,
      min: 0,
      step: 0.01,
      description: 'Flag runs exceeding this cost',
    },
  ],
}

// ── Generic integrations (vendor-neutral) ───────────────────────────────────

const genericIntegrationPorts = {
  inputs:  [{ id: 'data', label: 'Data in', type: 'any' as const }],
  outputs: [{ id: 'data', label: 'Data out', type: 'any' as const }],
}

const GenericDocumentNodeDefinition: NodeDefinition = {
  type: 'genericDocument',
  label: 'Document',
  accentColor: '#64748B',
  icon: GenericDocumentIcon,
  description: 'Generic document source (PDF, doc, page, spreadsheet export, etc.).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'documentKind',
      label: 'Document type',
      type: 'select' as const,
      defaultValue: 'pdf',
      options: [
        { label: 'PDF', value: 'pdf' },
        { label: 'Spreadsheet', value: 'spreadsheet' },
        { label: 'Markdown / Text', value: 'markdown' },
        { label: 'Web page', value: 'webPage' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customKindLabel',
      label: 'Custom type label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. Notion page, Confluence doc…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'documentKind', value: 'custom' },
    },
    { key: 'pathOrUrl', label: 'Path / URL', type: 'text' as const, defaultValue: '', placeholder: '/path/to/file.pdf or https://…' },
    { key: 'url', label: 'Secondary URL', type: 'text' as const, defaultValue: '', placeholder: 'optional' },
  ],
}

const GenericImageNodeDefinition: NodeDefinition = {
  type: 'genericImage',
  label: 'Image',
  accentColor: '#059669',
  icon: GenericImageIcon,
  description: 'Generic image source (photos, diagrams, UI screenshots, icons, etc.).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'imageKind',
      label: 'Image type',
      type: 'select' as const,
      defaultValue: 'raster',
      options: [
        { label: 'Raster (PNG, JPEG, WebP…)', value: 'raster' },
        { label: 'Vector (SVG, PDF page…)', value: 'vector' },
        { label: 'Diagram / chart export', value: 'diagram' },
        { label: 'Screenshot / capture', value: 'screenshot' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customImageKindLabel',
      label: 'Custom type label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. Figma frame, Miro board export…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'imageKind', value: 'custom' },
    },
    { key: 'pathOrUrl', label: 'Path / URL', type: 'text' as const, defaultValue: '', placeholder: '/path/to/image.png or https://…' },
    { key: 'url', label: 'Secondary URL', type: 'text' as const, defaultValue: '', placeholder: 'optional' },
  ],
}

const GenericVideoNodeDefinition: NodeDefinition = {
  type: 'genericVideo',
  label: 'Video',
  accentColor: '#D97706',
  icon: GenericVideoIcon,
  description: 'Generic video source (files, streams, clips, meeting recordings, etc.).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'videoKind',
      label: 'Video type',
      type: 'select' as const,
      defaultValue: 'file',
      options: [
        { label: 'File (MP4, MOV, WebM…)', value: 'file' },
        { label: 'Live / HLS / DASH stream', value: 'stream' },
        { label: 'Short clip / segment', value: 'clip' },
        { label: 'Meeting / webinar recording', value: 'meeting' },
        { label: 'Screen recording', value: 'screen' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customVideoKindLabel',
      label: 'Custom type label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. Loom embed, security DVR feed…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'videoKind', value: 'custom' },
    },
    { key: 'pathOrUrl', label: 'Path / URL', type: 'text' as const, defaultValue: '', placeholder: '/path/to/video.mp4 or https://…' },
    { key: 'url', label: 'Secondary URL', type: 'text' as const, defaultValue: '', placeholder: 'manifest, CDN, or embed URL' },
  ],
}

const GenericCloudNodeDefinition: NodeDefinition = {
  type: 'genericCloud',
  label: 'Cloud',
  accentColor: '#2563EB',
  icon: GenericCloudIcon,
  description: 'Generic cloud provider surface (AWS-like, GCP-like, Azure-like accounts and regions).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'cloudKind',
      label: 'Provider',
      type: 'select' as const,
      defaultValue: 'aws',
      options: [
        { label: 'AWS', value: 'aws' },
        { label: 'Google Cloud (GCP)', value: 'gcp' },
        { label: 'Microsoft Azure', value: 'azure' },
        { label: 'Oracle Cloud', value: 'oci' },
        { label: 'IBM Cloud', value: 'ibm' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customCloudKindLabel',
      label: 'Custom provider label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. Cloudflare, DigitalOcean…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'cloudKind', value: 'custom' },
    },
    { key: 'accountOrProject', label: 'Account / Project', type: 'text' as const, defaultValue: '', placeholder: 'account id, subscription, or project id' },
    { key: 'regionOrZone', label: 'Region / Zone', type: 'text' as const, defaultValue: '', placeholder: 'e.g. us-east-1, europe-west1' },
    { key: 'url', label: 'Console URL', type: 'text' as const, defaultValue: '', placeholder: 'https://…' },
  ],
}

const GenericScriptNodeDefinition: NodeDefinition = {
  type: 'genericScript',
  label: 'Script',
  accentColor: '#CA8A04',
  icon: GenericScriptIcon,
  description: 'Executable code or script (JavaScript, Python, Shell, etc.) — distinct from source-control hosts.',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'scriptLanguage',
      label: 'Language',
      type: 'select' as const,
      defaultValue: 'javascript',
      options: [
        { label: 'JavaScript', value: 'javascript' },
        { label: 'TypeScript', value: 'typescript' },
        { label: 'Python', value: 'python' },
        { label: 'Shell', value: 'shell' },
        { label: 'Ruby', value: 'ruby' },
        { label: 'Go', value: 'go' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customScriptLanguageLabel',
      label: 'Custom language label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. Deno, Bun, PowerShell…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'scriptLanguage', value: 'custom' },
    },
    { key: 'entryOrPath', label: 'Entry / path', type: 'text' as const, defaultValue: '', placeholder: 'main.py, ./scripts/run.sh, handler name…' },
    { key: 'url', label: 'Repo or gist URL', type: 'text' as const, defaultValue: '', placeholder: 'optional' },
  ],
}

const GenericMessengerNodeDefinition: NodeDefinition = {
  type: 'genericMessenger',
  label: 'Messenger',
  accentColor: '#8B5CF6',
  icon: GenericMessengerIcon,
  description: 'Generic chat/DM channel (Slack-like, Teams-like, Discord-like, etc.).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'messengerKind',
      label: 'Channel type',
      type: 'select' as const,
      defaultValue: 'channel',
      options: [
        { label: 'Public channel', value: 'channel' },
        { label: 'Direct message', value: 'dm' },
        { label: 'Group / thread', value: 'group' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customMessengerLabel',
      label: 'Custom channel label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. MS Teams channel…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'messengerKind', value: 'custom' },
    },
    { key: 'thread', label: 'Thread / Channel', type: 'text' as const, defaultValue: '', placeholder: '#support or thread id' },
    { key: 'url', label: 'Deep link', type: 'text' as const, defaultValue: '', placeholder: 'https://…' },
  ],
}

const GenericEmailNodeDefinition: NodeDefinition = {
  type: 'genericEmail',
  label: 'Email',
  accentColor: '#EA4335',
  icon: GenericEmailIcon,
  description: 'Generic mailbox integration (inbox triage, outbound send, routing).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'emailMode',
      label: 'Mode',
      type: 'select' as const,
      defaultValue: 'receive',
      options: [
        { label: 'Receive (inbox)', value: 'receive' },
        { label: 'Send (outbox)', value: 'send' },
        { label: 'Receive + Send', value: 'both' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customEmailModeLabel',
      label: 'Custom mode label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. Shared mailbox rules…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'emailMode', value: 'custom' },
    },
    { key: 'address', label: 'Mailbox / Address', type: 'text' as const, defaultValue: '', placeholder: 'ops@company.com' },
    { key: 'url', label: 'Provider URL', type: 'text' as const, defaultValue: '', placeholder: 'optional' },
  ],
}

const GenericDatabaseNodeDefinition: NodeDefinition = {
  type: 'genericDatabase',
  label: 'Database',
  accentColor: '#336791',
  icon: GenericDatabaseIcon,
  description: 'Generic database connection (SQL/NoSQL).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'dbKind',
      label: 'Engine',
      type: 'select' as const,
      defaultValue: 'sql',
      options: [
        { label: 'SQL (relational)', value: 'sql' },
        { label: 'Document store', value: 'document' },
        { label: 'Key-value', value: 'kv' },
        { label: 'Graph', value: 'graph' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customDbLabel',
      label: 'Custom engine label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. DuckDB, Databricks SQL…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'dbKind', value: 'custom' },
    },
    { key: 'connection', label: 'Connection / DSN', type: 'text' as const, defaultValue: '', placeholder: 'postgresql://…' },
    { key: 'url', label: 'Console URL', type: 'text' as const, defaultValue: '', placeholder: 'optional' },
  ],
}

const GenericStorageNodeDefinition: NodeDefinition = {
  type: 'genericStorage',
  label: 'Object Storage',
  accentColor: '#FF9900',
  icon: GenericStorageIcon,
  description: 'Generic object/file storage (S3-like, GCS-like, blob containers).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'storageKind',
      label: 'Backend',
      type: 'select' as const,
      defaultValue: 'objectStore',
      options: [
        { label: 'Object store (S3-like)', value: 'objectStore' },
        { label: 'File share / NFS', value: 'fileShare' },
        { label: 'Managed drive', value: 'drive' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customStorageLabel',
      label: 'Custom backend label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. MinIO, Azure Blob…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'storageKind', value: 'custom' },
    },
    { key: 'bucketOrPath', label: 'Bucket / Path', type: 'text' as const, defaultValue: '', placeholder: 's3://bucket/prefix' },
    { key: 'url', label: 'Console URL', type: 'text' as const, defaultValue: '', placeholder: 'optional' },
  ],
}

const GenericWebNodeDefinition: NodeDefinition = {
  type: 'genericWeb',
  label: 'Web / Scraper',
  accentColor: '#7C3AED',
  icon: GenericWebIcon,
  description: 'Generic web surface (site, portal, scraper target).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'webKind',
      label: 'Surface',
      type: 'select' as const,
      defaultValue: 'site',
      options: [
        { label: 'Website', value: 'site' },
        { label: 'Authenticated portal', value: 'portal' },
        { label: 'API endpoint', value: 'api' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customWebLabel',
      label: 'Custom surface label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. Authenticated job board…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'webKind', value: 'custom' },
    },
    { key: 'url', label: 'URL', type: 'text' as const, defaultValue: '', placeholder: 'https://…' },
  ],
}

const GenericWebPageNodeDefinition: NodeDefinition = {
  type: 'genericWebPage',
  label: 'Web page',
  accentColor: '#4F46E5',
  icon: GenericWebPageIcon,
  description: 'A browsable web page or screen (marketing site, docs, app UI, form, status).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'pageKind',
      label: 'Page type',
      type: 'select' as const,
      defaultValue: 'landing',
      options: [
        { label: 'Marketing / landing', value: 'landing' },
        { label: 'Documentation', value: 'docs' },
        { label: 'App / product UI', value: 'app' },
        { label: 'Form / flow', value: 'form' },
        { label: 'Status / health', value: 'status' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customPageKindLabel',
      label: 'Custom page label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. Admin console, checkout…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'pageKind', value: 'custom' },
    },
    { key: 'pageTitle', label: 'Title / name', type: 'text' as const, defaultValue: '', placeholder: 'short label for the page' },
    { key: 'url', label: 'URL', type: 'text' as const, defaultValue: '', placeholder: 'https://…' },
  ],
}

const GenericCalendarNodeDefinition: NodeDefinition = {
  type: 'genericCalendar',
  label: 'Calendar',
  accentColor: '#4285F4',
  icon: GenericCalendarIcon,
  description: 'Generic calendar integration (events, availability, scheduling).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'calendarScope',
      label: 'Scope',
      type: 'select' as const,
      defaultValue: 'personal',
      options: [
        { label: 'Personal', value: 'personal' },
        { label: 'Team / org', value: 'team' },
        { label: 'Resource (room/equipment)', value: 'resource' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customCalendarLabel',
      label: 'Custom scope label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. Interview scheduling pool…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'calendarScope', value: 'custom' },
    },
    { key: 'calendarId', label: 'Calendar / ID', type: 'text' as const, defaultValue: '', placeholder: 'calendar id or name' },
    { key: 'url', label: 'Link', type: 'text' as const, defaultValue: '', placeholder: 'optional' },
  ],
}

const GenericAutomationNodeDefinition: NodeDefinition = {
  type: 'genericAutomation',
  label: 'Automation Hub',
  accentColor: '#FF4A00',
  icon: GenericAutomationIcon,
  description: 'Generic automation hub (Zapier-like, Make-like, n8n-like webhooks).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'automationKind',
      label: 'Trigger style',
      type: 'select' as const,
      defaultValue: 'webhook',
      options: [
        { label: 'Webhook', value: 'webhook' },
        { label: 'Scheduled', value: 'schedule' },
        { label: 'App event', value: 'event' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customAutomationLabel',
      label: 'Custom trigger label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. Queue consumer…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'automationKind', value: 'custom' },
    },
    { key: 'workflow', label: 'Workflow / Webhook', type: 'text' as const, defaultValue: '', placeholder: 'workflow name or webhook id' },
    { key: 'url', label: 'Webhook URL', type: 'text' as const, defaultValue: '', placeholder: 'https://…' },
  ],
}

const GenericSchedulerNodeDefinition: NodeDefinition = {
  type: 'genericScheduler',
  label: 'Scheduler',
  accentColor: '#EA580C',
  icon: GenericSchedulerIcon,
  description: 'Time-based or queue-based scheduling (cron, job queues, calendar triggers, delays).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'schedulerKind',
      label: 'Schedule style',
      type: 'select' as const,
      defaultValue: 'cron',
      options: [
        { label: 'Cron / fixed cadence', value: 'cron' },
        { label: 'Queue / worker', value: 'queue' },
        { label: 'Calendar / event-based', value: 'calendar' },
        { label: 'Delay / retry policy', value: 'delay' },
        { label: 'Batch window', value: 'batch' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customSchedulerKindLabel',
      label: 'Custom style label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. Step Functions, Airflow DAG…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'schedulerKind', value: 'custom' },
    },
    { key: 'scheduleOrCron', label: 'Schedule / cron / rule', type: 'text' as const, defaultValue: '', placeholder: '0 * * * *  or  human description' },
    { key: 'jobOrQueue', label: 'Job / queue / resource', type: 'text' as const, defaultValue: '', placeholder: 'job name, queue id, or resource' },
    { key: 'url', label: 'Endpoint URL', type: 'text' as const, defaultValue: '', placeholder: 'optional callback or dashboard' },
  ],
}

const GenericNotificationsNodeDefinition: NodeDefinition = {
  type: 'genericNotifications',
  label: 'Notifications',
  accentColor: '#F97316',
  icon: GenericNotificationsIcon,
  description: 'Outbound alerts and notifications (push, email, SMS, in-app, webhooks, chat alerts).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'notificationKind',
      label: 'Channel',
      type: 'select' as const,
      defaultValue: 'push',
      options: [
        { label: 'Push (mobile / desktop)', value: 'push' },
        { label: 'Email', value: 'email' },
        { label: 'SMS', value: 'sms' },
        { label: 'In-app / feed', value: 'inApp' },
        { label: 'Webhook / callback', value: 'webhook' },
        { label: 'Chat / team alert', value: 'chat' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customNotificationKindLabel',
      label: 'Custom channel label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. PagerDuty, Opsgenie route…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'notificationKind', value: 'custom' },
    },
    { key: 'destination', label: 'Topic / audience / address', type: 'text' as const, defaultValue: '', placeholder: 'topic arn, segment, #channel, phone…' },
    { key: 'url', label: 'Webhook or console URL', type: 'text' as const, defaultValue: '', placeholder: 'https://…' },
  ],
}

const GenericCrmNodeDefinition: NodeDefinition = {
  type: 'genericCrm',
  label: 'CRM',
  accentColor: '#00A1E0',
  icon: GenericCrmIcon,
  description: 'Generic CRM object integration (accounts, leads, opportunities).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'crmObjectKind',
      label: 'Object template',
      type: 'select' as const,
      defaultValue: 'lead',
      options: [
        { label: 'Lead', value: 'lead' },
        { label: 'Contact / Account', value: 'contact' },
        { label: 'Opportunity / Deal', value: 'deal' },
        { label: 'Case / Ticket', value: 'case' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customCrmObjectLabel',
      label: 'Custom object label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. Partner record…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'crmObjectKind', value: 'custom' },
    },
    {
      key: 'objectType',
      label: 'Object name',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'Describe the CRM object…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'crmObjectKind', value: 'custom' },
    },
    { key: 'url', label: 'Record URL', type: 'text' as const, defaultValue: '', placeholder: 'optional' },
  ],
}

const GenericSupportNodeDefinition: NodeDefinition = {
  type: 'genericSupport',
  label: 'Support Desk',
  accentColor: '#03363D',
  icon: GenericSupportIcon,
  description: 'Generic ticketing/support surface (Zendesk-like, Intercom-like).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'supportKind',
      label: 'Desk type',
      type: 'select' as const,
      defaultValue: 'ticketing',
      options: [
        { label: 'Ticketing', value: 'ticketing' },
        { label: 'Live chat', value: 'chat' },
        { label: 'Knowledge base', value: 'kb' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customSupportLabel',
      label: 'Custom desk label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. VIP concierge…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'supportKind', value: 'custom' },
    },
    { key: 'queue', label: 'Queue / Inbox', type: 'text' as const, defaultValue: '', placeholder: 'queue name or id' },
    { key: 'url', label: 'Ticket URL', type: 'text' as const, defaultValue: '', placeholder: 'optional' },
  ],
}

const GenericPaymentsNodeDefinition: NodeDefinition = {
  type: 'genericPayments',
  label: 'Payments',
  accentColor: '#635BFF',
  icon: GenericPaymentsIcon,
  description: 'Generic payments/commerce integration (Stripe-like, Shopify-like).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'paymentsKind',
      label: 'Surface',
      type: 'select' as const,
      defaultValue: 'payments',
      options: [
        { label: 'Payments API', value: 'payments' },
        { label: 'E-commerce / storefront', value: 'commerce' },
        { label: 'Billing / subscriptions', value: 'billing' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customPaymentsLabel',
      label: 'Custom surface label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. Invoicing portal…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'paymentsKind', value: 'custom' },
    },
    { key: 'account', label: 'Account / Store', type: 'text' as const, defaultValue: '', placeholder: 'account id or store name' },
    { key: 'url', label: 'Dashboard URL', type: 'text' as const, defaultValue: '', placeholder: 'optional' },
  ],
}

const GenericVoiceNodeDefinition: NodeDefinition = {
  type: 'genericVoice',
  label: 'Voice / SMS',
  accentColor: '#F22F46',
  icon: GenericVoiceIcon,
  description: 'Generic telephony/SMS integration (Twilio-like providers).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'telephonyKind',
      label: 'Channel',
      type: 'select' as const,
      defaultValue: 'sms',
      options: [
        { label: 'SMS', value: 'sms' },
        { label: 'Voice call', value: 'voice' },
        { label: 'WhatsApp / rich messaging', value: 'rich' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customTelephonyLabel',
      label: 'Custom channel label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. RCS, fax gateway…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'telephonyKind', value: 'custom' },
    },
    { key: 'phoneNumber', label: 'Number / Sender ID', type: 'text' as const, defaultValue: '', placeholder: '+1…' },
    { key: 'url', label: 'Provider URL', type: 'text' as const, defaultValue: '', placeholder: 'optional' },
  ],
}

const GenericCodeNodeDefinition: NodeDefinition = {
  type: 'genericCode',
  label: 'Code Host',
  accentColor: '#24292E',
  icon: GenericCodeIcon,
  description: 'Generic source control surface (GitHub-like, GitLab-like).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'codeHostKind',
      label: 'Host type',
      type: 'select' as const,
      defaultValue: 'git',
      options: [
        { label: 'Git hosting', value: 'git' },
        { label: 'Package registry', value: 'registry' },
        { label: 'CI / build system', value: 'ci' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customCodeHostLabel',
      label: 'Custom host label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. Phabricator…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'codeHostKind', value: 'custom' },
    },
    { key: 'repository', label: 'Repo / Project', type: 'text' as const, defaultValue: '', placeholder: 'org/repo or project path' },
    { key: 'url', label: 'URL', type: 'text' as const, defaultValue: '', placeholder: 'https://…' },
  ],
}

const GenericAnalyticsNodeDefinition: NodeDefinition = {
  type: 'genericAnalytics',
  label: 'Analytics / BI',
  accentColor: '#0EA5E9',
  icon: GenericAnalyticsIcon,
  description: 'Generic analytics warehouse/BI (Snowflake-like, BigQuery-like).',
  category: 'integration',
  ...genericIntegrationPorts,
  configFields: [
    {
      key: 'analyticsKind',
      label: 'Workload',
      type: 'select' as const,
      defaultValue: 'warehouse',
      options: [
        { label: 'Warehouse / lakehouse', value: 'warehouse' },
        { label: 'BI / dashboards', value: 'bi' },
        { label: 'Metrics store', value: 'metrics' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      key: 'customAnalyticsLabel',
      label: 'Custom workload label',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'e.g. Experiment results DB…',
      rejectTrimmedCaseInsensitive: ['custom'],
      visibleWhen: { key: 'analyticsKind', value: 'custom' },
    },
    { key: 'projectOrDataset', label: 'Project / Dataset', type: 'text' as const, defaultValue: '', placeholder: 'project.dataset' },
    { key: 'url', label: 'Console URL', type: 'text' as const, defaultValue: '', placeholder: 'optional' },
  ],
}

const GENERIC_INTEGRATION_NODE_DEFINITIONS: NodeDefinition[] = [
  GenericDocumentNodeDefinition,
  GenericImageNodeDefinition,
  GenericVideoNodeDefinition,
  GenericCloudNodeDefinition,
  GenericScriptNodeDefinition,
  GenericMessengerNodeDefinition,
  GenericEmailNodeDefinition,
  GenericDatabaseNodeDefinition,
  GenericStorageNodeDefinition,
  GenericWebNodeDefinition,
  GenericWebPageNodeDefinition,
  GenericCalendarNodeDefinition,
  GenericAutomationNodeDefinition,
  GenericSchedulerNodeDefinition,
  GenericNotificationsNodeDefinition,
  GenericCrmNodeDefinition,
  GenericSupportNodeDefinition,
  GenericPaymentsNodeDefinition,
  GenericVoiceNodeDefinition,
  GenericCodeNodeDefinition,
  GenericAnalyticsNodeDefinition,
]

const CharacterNodeDefinition: NodeDefinition = {
  type: 'character',
  label: 'Character',
  accentColor: '#7C3AED',
  icon: CharacterIcon,
  description: 'A character figure for annotating diagrams with actors or personas.',
  category: 'character',
  inputs: [],
  outputs: [],
  configFields: [
    {
      key: 'variant',
      label: 'Character',
      type: 'select',
      defaultValue: 'person',
      options: [
        { label: 'Person',  value: 'person' },
        { label: 'Girl',    value: 'woman'  },
        { label: 'Cat',     value: 'cat'    },
        { label: 'Robot',   value: 'robot'  },
        { label: 'Kid',     value: 'kid'    },
        { label: 'Tiger',   value: 'tiger'  },
        { label: 'Bear',    value: 'bear'   },
      ],
    },
    {
      key: 'expression',
      label: 'Expression (Default)',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'None',      value: 'none'      },
        { label: 'Happy',     value: 'happy'     },
        { label: 'Sad',       value: 'sad'       },
        { label: 'Angry',     value: 'angry'     },
        { label: 'Surprised', value: 'surprised' },
        { label: 'Neutral',   value: 'neutral'   },
        { label: 'Thinking',  value: 'thinking'  },
      ],
    },
    {
      key: 'expressionBefore',
      label: 'Expression (Before)',
      type: 'select',
      defaultValue: 'inherit',
      options: [
        { label: 'Inherit default', value: 'inherit' },
        { label: 'None',            value: 'none' },
        { label: 'Happy',           value: 'happy' },
        { label: 'Sad',             value: 'sad' },
        { label: 'Angry',           value: 'angry' },
        { label: 'Surprised',       value: 'surprised' },
        { label: 'Neutral',         value: 'neutral' },
        { label: 'Thinking',        value: 'thinking' },
      ],
    },
    {
      key: 'expressionAfter',
      label: 'Expression (After)',
      type: 'select',
      defaultValue: 'inherit',
      options: [
        { label: 'Inherit default', value: 'inherit' },
        { label: 'None',            value: 'none' },
        { label: 'Happy',           value: 'happy' },
        { label: 'Sad',             value: 'sad' },
        { label: 'Angry',           value: 'angry' },
        { label: 'Surprised',       value: 'surprised' },
        { label: 'Neutral',         value: 'neutral' },
        { label: 'Thinking',        value: 'thinking' },
      ],
    },
    {
      key: 'cloudColor',
      label: 'Cloud Color',
      type: 'color',
      defaultValue: '#f0f9ff',
    },
    {
      key: 'speechHook',
      label: 'Speech Timing',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'Manual / Note rules', value: 'none' },
        { label: 'Before run starts', value: 'before' },
        { label: 'After run ends', value: 'after' },
        { label: 'Before + After', value: 'beforeAfter' },
      ],
    },
    {
      key: 'dependsOnCharacterId',
      label: 'Depends On Character',
      type: 'select',
      defaultValue: '',
      options: [
        { label: 'None', value: '' },
      ],
      description: 'Optional ordering dependency for before/after speech hooks.',
    },
    {
      key: 'speechDurationSeconds',
      label: 'Speech Duration (s)',
      type: 'number',
      defaultValue: 1.2,
      min: 0.2,
      max: 10,
      step: 0.1,
      description: 'How long before/after speech is shown during playback hooks (seconds).',
    },
    {
      key: 'noteBefore',
      label: 'Note (Before)',
      type: 'textarea',
      defaultValue: '',
      placeholder: 'What this character says before flow starts…',
    },
    {
      key: 'noteAfter',
      label: 'Note (After)',
      type: 'textarea',
      defaultValue: '',
      placeholder: 'What this character says after flow ends…',
    },
    {
      key: 'hairColor',
      label: 'Hair Color',
      type: 'color',
      defaultValue: '#a0522d',
      visibleWhen: { key: 'variant', value: 'woman' },
    },
    {
      key: 'dressColor',
      label: 'Outfit Color',
      type: 'color',
      defaultValue: '#6b7db3',
      visibleWhen: { key: 'variant', value: 'woman' },
    },
  ],
}

// ── Registry ──────────────────────────────────────────────────────────────────

const PRIMARY_NODE_ACCENT = '#2563EB'
const EVAL_NODE_ACCENT = '#38BDF8'

const NODE_DEFINITIONS: NodeDefinition[] = ([
  // Core
  TriggerNodeDefinition,
  LLMNodeDefinition,
  AgentNodeDefinition,
  SubAgentNodeDefinition,
  PromptNodeDefinition,
  PromptTemplateNodeDefinition,
  MemoryNodeDefinition,
  StateNodeDefinition,
  OutputNodeDefinition,
  // Data
  DataLoaderNodeDefinition,
  ChunkerNodeDefinition,
  EmbeddingNodeDefinition,
  VectorDBNodeDefinition,
  RetrieverNodeDefinition,
  RerankerNodeDefinition,
  CacheNodeDefinition,
  // Flow
  RouterNodeDefinition,
  AggregatorNodeDefinition,
  ClassifierNodeDefinition,
  HumanApprovalNodeDefinition,
  LoopNodeDefinition,
  FrameNodeDefinition,
  TextNodeDefinition,
  // Tools
  ToolCallNodeDefinition,
  WebSearchNodeDefinition,
  MCPServerNodeDefinition,
  CodeExecNodeDefinition,
  // Output
  OutputParserNodeDefinition,
  EvaluatorNodeDefinition,
  GuardrailsNodeDefinition,
  TracingNodeDefinition,
  MonitorNodeDefinition,
  // Evaluation strategies
  EvalDatasetNodeDefinition,
  AssertionNodeDefinition,
  LLMJudgeNodeDefinition,
  RubricNodeDefinition,
  ComparatorNodeDefinition,
  GroundTruthNodeDefinition,
  EvalMetricsNodeDefinition,
  CritiqueNodeDefinition,
  ThresholdGateNodeDefinition,
  HumanRaterNodeDefinition,
  RAGEvaluatorNodeDefinition,
  // Agent evaluation
  SingleTurnEvalNodeDefinition,
  MultiTurnEvalNodeDefinition,
  ToolUseEvalNodeDefinition,
  TrajectoryEvalNodeDefinition,
  UserSimulatorNodeDefinition,
  TaskCompletionNodeDefinition,
  AgentEfficiencyNodeDefinition,
] as CoreNodeDefinition[]).map((def) => ({
  ...def,
  accentColor:
    def.category === 'eval' || def.type === 'evaluator'
      ? EVAL_NODE_ACCENT
      : PRIMARY_NODE_ACCENT,
})).concat([...GENERIC_INTEGRATION_NODE_DEFINITIONS, CharacterNodeDefinition])

/** Returns all registered node definitions. */
export function getAllNodeDefinitions(): NodeDefinition[] {
  return NODE_DEFINITIONS
}

/** Looks up a definition by its type string. Returns undefined if not found. */
export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return NODE_DEFINITIONS.find((d) => d.type === type)
}

/**
 * Ports for a node instance. Prefer this over `def.inputs` / `def.outputs`:
 * some node types (router, aggregator, classifier) derive their ports from config.
 */
export function resolveNodePorts(
  def: NodeDefinition,
  config: Record<string, unknown> | undefined,
): { inputs: PortDefinition[]; outputs: PortDefinition[] } {
  if (!def.resolvePorts) return { inputs: def.inputs, outputs: def.outputs }
  return def.resolvePorts({
    ...buildDefaultConfig(def.type),
    ...((config ?? {}) as Record<string, string | number | boolean>),
  })
}

/** Whether a config field applies given the node's current config (see `ConfigField.visibleWhen`). */
export function isConfigFieldVisible(field: ConfigField, config: Record<string, unknown> | undefined): boolean {
  const cond = field.visibleWhen
  if (!cond) return true
  const current = config?.[cond.key]
  if ('oneOf' in cond) return cond.oneOf.some((v) => v === current)
  return current === cond.value
}

/** Builds the default config Record for a node type (all fields at defaultValue). */
export function buildDefaultConfig(type: string): Record<string, string | number | boolean> {
  const def = getNodeDefinition(type)
  if (!def) return {}
  return Object.fromEntries(
    def.configFields.map((f) => [f.key, f.defaultValue])
  )
}

/**
 * Rewrites retired select values (e.g. `gpt-4o`, `claude-3-5-sonnet-…`) in a saved config
 * to their current equivalents so old diagrams render and validate.
 */
export function upgradeLegacyConfig<T extends Record<string, unknown>>(type: string, config: T): T {
  const def = getNodeDefinition(type)
  if (!def) return config
  let out: Record<string, unknown> | null = null
  for (const field of def.configFields) {
    const v = config[field.key]
    if (field.type !== 'select' || typeof v !== 'string') continue
    const next = resolveLegacySelectValue(v, field.options)
    if (next !== v) (out ??= { ...config })[field.key] = next
  }
  return (out ?? config) as T
}

export {
  LLMNodeDefinition,
  AgentNodeDefinition,
  PromptNodeDefinition,
  PromptTemplateNodeDefinition,
  MemoryNodeDefinition,
  DataLoaderNodeDefinition,
  ChunkerNodeDefinition,
  EmbeddingNodeDefinition,
  VectorDBNodeDefinition,
  RetrieverNodeDefinition,
  RerankerNodeDefinition,
  CacheNodeDefinition,
  RouterNodeDefinition,
  AggregatorNodeDefinition,
  ClassifierNodeDefinition,
  ToolCallNodeDefinition,
  WebSearchNodeDefinition,
  OutputParserNodeDefinition,
  EvaluatorNodeDefinition,
  GuardrailsNodeDefinition,
}
