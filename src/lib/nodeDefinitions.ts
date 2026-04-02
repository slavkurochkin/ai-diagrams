import {
  LLMIcon,
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
} from '../components/icons'
import type { NodeDefinition } from '../types/nodes'

// ── Node definitions ──────────────────────────────────────────────────────────
// Add new nodes here. The rest of the app picks them up automatically via
// `getAllNodeDefinitions()` and the nodeTypes map in components/nodes/index.ts.

const LLMNodeDefinition: NodeDefinition = {
  type: 'llm',
  label: 'LLM',
  accentColor: '#0F766E',
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
      defaultValue: 'gpt-4o',
      options: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
        { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
        { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
        { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
        { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
        { label: 'Llama 3.1 70B', value: 'llama-3.1-70b-instruct' },
      ],
    },
    {
      key: 'temperature',
      label: 'Temperature',
      type: 'slider',
      defaultValue: 0.7,
      min: 0,
      max: 2,
      step: 0.05,
      description: 'Controls randomness. Lower = more deterministic.',
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
  ],
}

const PromptTemplateNodeDefinition: NodeDefinition = {
  type: 'promptTemplate',
  label: 'Prompt Template',
  accentColor: '#2563EB',
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

const VectorDBNodeDefinition: NodeDefinition = {
  type: 'vectorDB',
  label: 'Vector DB',
  accentColor: '#0891B2',
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

const AgentNodeDefinition: NodeDefinition = {
  type: 'agent',
  label: 'Agent',
  accentColor: '#E11D48',
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

const PromptNodeDefinition: NodeDefinition = {
  type: 'prompt',
  label: 'Prompt',
  accentColor: '#0EA5E9',
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

const MemoryNodeDefinition: NodeDefinition = {
  type: 'memory',
  label: 'Memory',
  accentColor: '#CA8A04',
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

const DataLoaderNodeDefinition: NodeDefinition = {
  type: 'dataLoader',
  label: 'Data Loader',
  accentColor: '#475569',
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

const ChunkerNodeDefinition: NodeDefinition = {
  type: 'chunker',
  label: 'Chunker',
  accentColor: '#78716C',
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

const EmbeddingNodeDefinition: NodeDefinition = {
  type: 'embedding',
  label: 'Embedding',
  accentColor: '#4F46E5',
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
      defaultValue: 'text-embedding-3-small',
      options: [
        { label: 'text-embedding-3-small', value: 'text-embedding-3-small' },
        { label: 'text-embedding-3-large', value: 'text-embedding-3-large' },
        { label: 'text-embedding-ada-002', value: 'text-embedding-ada-002' },
        { label: 'embed-english-v3.0', value: 'embed-english-v3.0' },
        { label: 'nomic-embed-text', value: 'nomic-embed-text' },
      ],
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

const RetrieverNodeDefinition: NodeDefinition = {
  type: 'retriever',
  label: 'Retriever',
  accentColor: '#0D9488',
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

const RerankerNodeDefinition: NodeDefinition = {
  type: 'reranker',
  label: 'Reranker',
  accentColor: '#DB2777',
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
      defaultValue: 'cohere-rerank-3',
      options: [
        { label: 'Cohere Rerank 3', value: 'cohere-rerank-3' },
        { label: 'Cohere Rerank 3 Nimble', value: 'cohere-rerank-3-nimble' },
        { label: 'BGE Reranker (local)', value: 'bge-reranker-large' },
        { label: 'ms-marco-MiniLM (local)', value: 'ms-marco-minilm' },
      ],
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

const CacheNodeDefinition: NodeDefinition = {
  type: 'cache',
  label: 'Cache',
  accentColor: '#059669',
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

const RouterNodeDefinition: NodeDefinition = {
  type: 'router',
  label: 'Router',
  accentColor: '#D97706',
  icon: RouterIcon,
  description: 'Conditionally routes flow to one of several downstream paths.',
  category: 'flow',
  inputs: [
    { id: 'input', label: 'Input', type: 'any' },
  ],
  outputs: [
    { id: 'routeA', label: 'Route A', type: 'any' },
    { id: 'routeB', label: 'Route B', type: 'any' },
    { id: 'default', label: 'Default', type: 'any' },
  ],
  configFields: [
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

const AggregatorNodeDefinition: NodeDefinition = {
  type: 'aggregator',
  label: 'Aggregator',
  accentColor: '#65A30D',
  icon: AggregatorIcon,
  description: 'Merges multiple upstream outputs into a single result.',
  category: 'flow',
  inputs: [
    { id: 'inputA', label: 'Input A', type: 'any' },
    { id: 'inputB', label: 'Input B', type: 'any' },
  ],
  outputs: [
    { id: 'merged', label: 'Merged', type: 'any' },
  ],
  configFields: [
    {
      key: 'strategy',
      label: 'Strategy',
      type: 'select',
      defaultValue: 'concat',
      options: [
        { label: 'Concatenate', value: 'concat' },
        { label: 'Merge (JSON)', value: 'merge' },
        { label: 'Majority Vote', value: 'vote' },
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

const ClassifierNodeDefinition: NodeDefinition = {
  type: 'classifier',
  label: 'Classifier',
  accentColor: '#C026D3',
  icon: ClassifierIcon,
  description: 'Assigns a discrete label to input text using an LLM or classifier.',
  category: 'flow',
  inputs: [
    { id: 'input', label: 'Input', type: 'text' },
  ],
  outputs: [
    { id: 'label', label: 'Label', type: 'text' },
    { id: 'confidence', label: 'Confidence', type: 'structured' },
  ],
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

const FrameNodeDefinition: NodeDefinition = {
  type: 'frame',
  label: 'Frame',
  accentColor: '#64748B',
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
  ],
}

const TextNodeDefinition: NodeDefinition = {
  type: 'text',
  label: 'Text',
  accentColor: '#94A3B8',
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

const ToolCallNodeDefinition: NodeDefinition = {
  type: 'toolCall',
  label: 'Tool Call',
  accentColor: '#EA580C',
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

const WebSearchNodeDefinition: NodeDefinition = {
  type: 'webSearch',
  label: 'Web Search',
  accentColor: '#1D4ED8',
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
        { label: 'SerpAPI (Google)', value: 'serp' },
        { label: 'Bing Search', value: 'bing' },
        { label: 'Tavily', value: 'tavily' },
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

const OutputParserNodeDefinition: NodeDefinition = {
  type: 'outputParser',
  label: 'Output Parser',
  accentColor: '#0F766E',
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

const EvaluatorNodeDefinition: NodeDefinition = {
  type: 'evaluator',
  label: 'Evaluator',
  accentColor: '#16A34A',
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

const GuardrailsNodeDefinition: NodeDefinition = {
  type: 'guardrails',
  label: 'Guardrails',
  accentColor: '#DC2626',
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

// ── Evaluation strategy nodes ─────────────────────────────────────────────────

const LLMJudgeNodeDefinition: NodeDefinition = {
  type: 'llmJudge',
  label: 'LLM Judge',
  accentColor: '#BE185D',
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
      defaultValue: 'gpt-4o',
      options: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
        { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
        { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
      ],
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

const RubricNodeDefinition: NodeDefinition = {
  type: 'rubric',
  label: 'Rubric',
  accentColor: '#2563EB',
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

const ComparatorNodeDefinition: NodeDefinition = {
  type: 'comparator',
  label: 'A/B Comparator',
  accentColor: '#D97706',
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
      defaultValue: 'gpt-4o',
      options: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
        { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
      ],
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

const GroundTruthNodeDefinition: NodeDefinition = {
  type: 'groundTruth',
  label: 'Ground Truth',
  accentColor: '#0D9488',
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

const EvalMetricsNodeDefinition: NodeDefinition = {
  type: 'evalMetrics',
  label: 'Metrics',
  accentColor: '#4F46E5',
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

const CritiqueNodeDefinition: NodeDefinition = {
  type: 'critique',
  label: 'Critique',
  accentColor: '#EA580C',
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
      defaultValue: 'gpt-4o',
      options: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
      ],
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

const ThresholdGateNodeDefinition: NodeDefinition = {
  type: 'thresholdGate',
  label: 'Threshold Gate',
  accentColor: '#DC2626',
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

const HumanRaterNodeDefinition: NodeDefinition = {
  type: 'humanRater',
  label: 'Human Rater',
  accentColor: '#CA8A04',
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

const RAGEvaluatorNodeDefinition: NodeDefinition = {
  type: 'ragEvaluator',
  label: 'RAG Evaluator',
  accentColor: '#0891B2',
  icon: RAGEvalIcon,
  description: 'Measures retrieval and generation quality: Recall@k, Precision@k, MRR, NDCG@k, Faithfulness, Context Precision/Recall.',
  category: 'eval',
  inputs: [
    { id: 'query',     label: 'Query',     type: 'text' },
    { id: 'contexts',  label: 'Contexts',  type: 'structured' },
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
      defaultValue: 'gpt-4o',
      options: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
        { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
      ],
    },
  ],
}

// ── Agent evaluation nodes ────────────────────────────────────────────────────

const SingleTurnEvalNodeDefinition: NodeDefinition = {
  type: 'singleTurnEval',
  label: 'Single-Turn Eval',
  accentColor: '#0F766E',
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
      defaultValue: 'gpt-4o',
      options: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
        { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
      ],
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

const MultiTurnEvalNodeDefinition: NodeDefinition = {
  type: 'multiTurnEval',
  label: 'Multi-Turn Eval',
  accentColor: '#6D28D9',
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
      defaultValue: 'gpt-4o',
      options: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
      ],
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

const ToolUseEvalNodeDefinition: NodeDefinition = {
  type: 'toolUseEval',
  label: 'Tool Use Eval',
  accentColor: '#EA580C',
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

const TrajectoryEvalNodeDefinition: NodeDefinition = {
  type: 'trajectoryEval',
  label: 'Trajectory Eval',
  accentColor: '#0D9488',
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
      defaultValue: 'gpt-4o',
      options: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
      ],
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

const TaskCompletionNodeDefinition: NodeDefinition = {
  type: 'taskCompletion',
  label: 'Task Completion',
  accentColor: '#16A34A',
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
      defaultValue: 'gpt-4o',
      options: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
      ],
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

const AgentEfficiencyNodeDefinition: NodeDefinition = {
  type: 'agentEfficiency',
  label: 'Agent Efficiency',
  accentColor: '#CA8A04',
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

// ── Registry ──────────────────────────────────────────────────────────────────

const PRIMARY_NODE_ACCENT = '#2563EB'
const EVAL_NODE_ACCENT = '#38BDF8'

const NODE_DEFINITIONS: NodeDefinition[] = [
  // Core
  LLMNodeDefinition,
  AgentNodeDefinition,
  PromptNodeDefinition,
  PromptTemplateNodeDefinition,
  MemoryNodeDefinition,
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
  FrameNodeDefinition,
  TextNodeDefinition,
  // Tools
  ToolCallNodeDefinition,
  WebSearchNodeDefinition,
  // Output
  OutputParserNodeDefinition,
  EvaluatorNodeDefinition,
  GuardrailsNodeDefinition,
  // Evaluation strategies
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
  TaskCompletionNodeDefinition,
  AgentEfficiencyNodeDefinition,
].map((def) => ({
  ...def,
  accentColor:
    def.category === 'eval' || def.type === 'evaluator'
      ? EVAL_NODE_ACCENT
      : PRIMARY_NODE_ACCENT,
}))

/** Returns all registered node definitions. */
export function getAllNodeDefinitions(): NodeDefinition[] {
  return NODE_DEFINITIONS
}

/** Looks up a definition by its type string. Returns undefined if not found. */
export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return NODE_DEFINITIONS.find((d) => d.type === type)
}

/** Builds the default config Record for a node type (all fields at defaultValue). */
export function buildDefaultConfig(type: string): Record<string, string | number | boolean> {
  const def = getNodeDefinition(type)
  if (!def) return {}
  return Object.fromEntries(
    def.configFields.map((f) => [f.key, f.defaultValue])
  )
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
