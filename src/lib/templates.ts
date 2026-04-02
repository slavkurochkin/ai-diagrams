export interface FlowTemplate {
  id: string
  name: string
  description: string
  category: 'rag' | 'agent' | 'eval' | 'pipeline'
  yaml: string
  preferredLayoutDirection?: 'TB' | 'LR'
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  // ── RAG ────────────────────────────────────────────────────────────────────

  {
    id: 'basic-rag',
    name: 'Basic RAG',
    description: 'Load documents, chunk, embed, store in vector DB, then retrieve context and generate an answer.',
    category: 'rag',
    preferredLayoutDirection: 'LR',
    yaml: `name: Basic RAG Pipeline
nodes:
  - id: user_query
    type: promptTemplate
    label: User Query
    config:
      template: "{{question}}"
      inputVariables: question
  - id: loader
    type: dataLoader
    config:
      source: local
    note: "Loads PDF, HTML, or plain text documents"
  - id: chunker
    type: chunker
    config:
      chunkSize: 512
      overlap: 64
  - id: embedder
    type: embedding
    label: Embed Chunks
  - id: vectordb
    type: vectorDB
    config:
      provider: pinecone
  - id: prompt
    type: aggregator
    label: Prompt Builder
    config:
      strategy: concat
    note: "Combines the user question with retrieved context before generation"
  - id: llm
    type: llm
    label: Answer LLM
    config:
      model: gpt-4o
  - id: parser
    type: outputParser
edges:
  - from: user_query
    to: vectordb
    fromHandle: prompt
    toHandle: query
  - from: loader
    to: chunker
    fromHandle: documents
    toHandle: documents
  - from: chunker
    to: embedder
    fromHandle: chunks
    toHandle: text
  - from: embedder
    to: vectordb
    fromHandle: embedding
    toHandle: embedding
  - from: vectordb
    to: prompt
    fromHandle: documents
    toHandle: inputB
  - from: user_query
    to: prompt
    fromHandle: prompt
    toHandle: inputA
  - from: prompt
    to: llm
    fromHandle: merged
    toHandle: prompt
  - from: llm
    to: parser
    fromHandle: response
    toHandle: text`,
  },

  {
    id: 'query-expansion-rag',
    name: 'Query Expansion RAG',
    description: 'Expand the user query into multiple sub-queries, retrieve with each, re-rank merged contexts, then generate a richer answer.',
    category: 'rag',
    preferredLayoutDirection: 'LR',
    yaml: `name: Query Expansion RAG
nodes:
  - id: user_query
    type: promptTemplate
    label: User Query
    config:
      template: "{{question}}"
      inputVariables: question
  - id: expand_prompt
    type: promptTemplate
    label: Expansion Prompt
    note: "Generates N sub-queries from the original question"
  - id: expansion_context
    type: aggregator
    label: Expansion Context
    config:
      strategy: concat
  - id: llm_expand
    type: llm
    label: Query Expander
    config:
      model: gpt-4o-mini
      temperature: 0.3
  - id: query_embedder
    type: embedding
    label: Expanded Query Embedder
  - id: retriever_a
    type: retriever
    label: Retriever A
  - id: retriever_b
    type: retriever
    label: Retriever B
  - id: aggregator
    type: aggregator
    config:
      strategy: concat
  - id: reranker
    type: reranker
    config:
      topN: 5
  - id: answer_context
    type: aggregator
    label: Answer Context
    config:
      strategy: concat
    note: "Combines the original query with the re-ranked context"
  - id: llm_answer
    type: llm
    label: Answer LLM
    config:
      model: gpt-4o
  - id: parser
    type: outputParser
edges:
  - from: user_query
    to: expansion_context
    fromHandle: prompt
    toHandle: inputA
  - from: expand_prompt
    to: expansion_context
    fromHandle: prompt
    toHandle: inputB
  - from: expansion_context
    to: llm_expand
    fromHandle: merged
    toHandle: prompt
  - from: llm_expand
    to: query_embedder
    fromHandle: response
    toHandle: text
  - from: llm_expand
    to: retriever_a
    fromHandle: response
    toHandle: query
  - from: llm_expand
    to: retriever_b
    fromHandle: response
    toHandle: query
  - from: llm_expand
    to: reranker
    fromHandle: response
    toHandle: query
  - from: query_embedder
    to: retriever_a
    fromHandle: embedding
    toHandle: embedding
  - from: query_embedder
    to: retriever_b
    fromHandle: embedding
    toHandle: embedding
  - from: retriever_a
    to: aggregator
    fromHandle: documents
    toHandle: inputA
  - from: retriever_b
    to: aggregator
    fromHandle: documents
    toHandle: inputB
  - from: aggregator
    to: reranker
    fromHandle: merged
    toHandle: documents
  - from: user_query
    to: answer_context
    fromHandle: prompt
    toHandle: inputA
  - from: reranker
    to: answer_context
    fromHandle: documents
    toHandle: inputB
  - from: answer_context
    to: llm_answer
    fromHandle: merged
    toHandle: prompt
  - from: llm_answer
    to: parser
    fromHandle: response
    toHandle: text`,
  },

  {
    id: 'rag-with-cache',
    name: 'RAG with Semantic Cache',
    description: 'Basic RAG augmented with a semantic cache layer to avoid redundant LLM calls for similar queries.',
    category: 'rag',
    preferredLayoutDirection: 'LR',
    yaml: `name: RAG with Semantic Cache
nodes:
  - id: user_query
    type: promptTemplate
    label: User Query
    config:
      template: "{{question}}"
      inputVariables: question
  - id: embedder
    type: embedding
    label: Query Embedder
  - id: cache
    type: cache
    note: "Returns a cached answer if a semantically similar query was seen recently"
  - id: retriever
    type: retriever
  - id: prompt
    type: aggregator
    label: Prompt Builder
    config:
      strategy: concat
    note: "Combines the user question with retrieved context"
  - id: llm
    type: llm
    config:
      model: gpt-4o
  - id: guardrails
    type: guardrails
    note: "PII detection + toxicity filter"
  - id: parser
    type: outputParser
edges:
  - from: user_query
    to: embedder
    fromHandle: prompt
    toHandle: text
  - from: embedder
    to: cache
    fromHandle: embedding
    toHandle: key
  - from: embedder
    to: retriever
    fromHandle: embedding
    toHandle: embedding
  - from: user_query
    to: retriever
    fromHandle: prompt
    toHandle: query
  - from: user_query
    to: prompt
    fromHandle: prompt
    toHandle: inputA
  - from: retriever
    to: prompt
    fromHandle: documents
    toHandle: inputB
  - from: prompt
    to: llm
    fromHandle: merged
    toHandle: prompt
  - from: llm
    to: cache
    fromHandle: response
    toHandle: value
  - from: cache
    to: guardrails
    fromHandle: value
    toHandle: input
  - from: guardrails
    to: parser
    fromHandle: passed
    toHandle: text`,
  },

  // ── Agent ───────────────────────────────────────────────────────────────────

  {
    id: 'agentic-loop',
    name: 'Agentic Loop',
    description: 'A ReAct-style agent with memory writeback, tool requests, and tool observations flowing back into the loop.',
    category: 'agent',
    preferredLayoutDirection: 'LR',
    yaml: `name: Agentic Loop
nodes:
  - id: user_input
    type: promptTemplate
    label: User Query
    config:
      template: "{{question}}"
      inputVariables: question
    position:
      x: 100
      y: 180
  - id: memory
    type: memory
    config:
      memoryType: buffer
      windowSize: 10
    note: "Stores user messages and agent replies across turns"
    position:
      x: 100
      y: 340
  - id: agent
    type: agent
    config:
      maxIterations: 10
      instructions: "You are a helpful research assistant. Use web search to gather facts and code execution for computation."
    note: |
      **ReAct loop:**
      1. **Think** — reason about the next step
      2. **Act** — emit a tool request
      3. **Observe** — read tool results
      4. **Respond** — produce an answer and store it in memory
      5. Repeat until the task is done
    position:
      x: 430
      y: 260
  - id: search
    type: webSearch
    label: Web Search
    config:
      engine: brave
      maxResults: 5
    note: "Returns ranked web snippets to the agent"
    position:
      x: 810
      y: 120
  - id: toolcall
    type: toolCall
    label: Code Executor
    config:
      toolName: run_python
      timeout: 30
    note: "Executes Python code and returns stdout"
    position:
      x: 810
      y: 260
  - id: guardrails
    type: guardrails
    config:
      checks: toxicity, pii
    note: "PII detection + toxicity filter on final answer"
    position:
      x: 810
      y: 440
  - id: parser
    type: outputParser
    config:
      format: markdown
    position:
      x: 1110
      y: 440
edges:
  # User input enters both the live prompt path and the conversation memory
  - from: user_input
    to: agent
    fromHandle: prompt
    toHandle: prompt
  - from: user_input
    to: memory
    fromHandle: prompt
    toHandle: input
  - from: memory
    to: agent
    fromHandle: history
    toHandle: memory
  # Agent dispatches tool requests (ReAct "Act" step)
  - from: agent
    to: search
    fromHandle: toolRequests
    toHandle: query
  - from: agent
    to: toolcall
    fromHandle: toolRequests
    toHandle: call
  # Tool observations flow back into the agent (ReAct "Observe" step)
  - from: search
    to: agent
    fromHandle: results
    toHandle: tools
    kind: loopback
    lane: top
  - from: toolcall
    to: agent
    fromHandle: result
    toHandle: tools
    kind: loopback
    lane: bottom
  # Final answer is stored in memory and then sent through safety + formatting
  - from: agent
    to: memory
    fromHandle: response
    toHandle: input
  - from: agent
    to: guardrails
    fromHandle: response
    toHandle: input
  - from: guardrails
    to: parser
    fromHandle: passed
    toHandle: text`,
  },

  {
    id: 'rag-agentic-loop',
    name: 'RAG Agentic Loop',
    description: 'An Agentic Loop extended with retrieval, embeddings, and vector search, while keeping web search and code execution in the tool cycle.',
    category: 'agent',
    preferredLayoutDirection: 'LR',
    yaml: `name: RAG Agentic Loop
nodes:
  - id: user_input
    type: promptTemplate
    label: User Query
    config:
      template: "{{question}}"
      inputVariables: question
    position:
      x: 100
      y: 180
  - id: memory
    type: memory
    config:
      memoryType: buffer
      windowSize: 10
    note: "Stores user messages and agent replies across turns"
    position:
      x: 100
      y: 340
  - id: agent
    type: agent
    config:
      maxIterations: 10
      instructions: "You are a grounded research assistant. Use retrieval for internal knowledge, web search for fresh facts, and code execution for computation before answering."
    note: |
      **RAG agent loop:**
      1. Read the task and memory
      2. Choose the next tool: retrieval, web search, or code execution
      3. If retrieving, embed the request and query the retriever
      4. Observe tool results
      5. Respond and store the answer in memory
    position:
      x: 430
      y: 260
  - id: search
    type: webSearch
    label: Web Search
    config:
      engine: brave
      maxResults: 5
    note: "Used when the agent needs fresh or external information"
    position:
      x: 770
      y: 40
  - id: embedding
    type: embedding
    label: Query Embedder
    note: "Converts the agent's retrieval request into a vector embedding"
    position:
      x: 760
      y: 145
  - id: vector_db
    type: vectorDB
    label: Vector Store
    config:
      provider: pinecone
    note: "Persistent vector index that backs the retriever's similarity search"
    position:
      x: 1070
      y: 315
  - id: retriever
    type: retriever
    label: Retriever
    config:
      topK: 5
    note: "Queries the connected vector store for the most relevant context"
    position:
      x: 760
      y: 315
  - id: toolcall
    type: toolCall
    label: Code Executor
    config:
      toolName: run_python
      timeout: 30
    note: "Executes Python code and returns stdout"
    position:
      x: 800
      y: 430
  - id: guardrails
    type: guardrails
    config:
      checks: toxicity, pii
    note: "PII detection + toxicity filter on the final answer"
    position:
      x: 770
      y: 590
  - id: parser
    type: outputParser
    config:
      format: markdown
    position:
      x: 1080
      y: 590
edges:
  # User input enters both the live prompt path and the conversation memory
  - from: user_input
    to: agent
    fromHandle: prompt
    toHandle: prompt
  - from: user_input
    to: memory
    fromHandle: prompt
    toHandle: input
  - from: memory
    to: agent
    fromHandle: history
    toHandle: memory
  # Agent can choose between web search, retrieval, and code execution
  - from: agent
    to: search
    fromHandle: toolRequests
    toHandle: query
  - from: agent
    to: embedding
    fromHandle: toolRequests
    toHandle: text
  - from: agent
    to: retriever
    fromHandle: toolRequests
    toHandle: query
  - from: agent
    to: toolcall
    fromHandle: toolRequests
    toHandle: call
  - from: embedding
    to: vector_db
    fromHandle: embedding
    toHandle: embedding
  - from: vector_db
    to: retriever
    fromHandle: store
    toHandle: store
  - from: embedding
    to: retriever
    fromHandle: embedding
    toHandle: embedding
  # Tool observations loop back into the agent
  - from: search
    to: agent
    fromHandle: results
    toHandle: tools
    kind: loopback
    lane: top
  - from: retriever
    to: agent
    fromHandle: documents
    toHandle: tools
    kind: loopback
    lane: bottom
  - from: toolcall
    to: agent
    fromHandle: result
    toHandle: tools
    kind: loopback
    lane: right
  # Final answer is stored in memory and then sent through safety + formatting
  - from: agent
    to: memory
    fromHandle: response
    toHandle: input
  - from: agent
    to: guardrails
    fromHandle: response
    toHandle: input
  - from: guardrails
    to: parser
    fromHandle: passed
    toHandle: text`,
  },

  {
    id: 'rag-agentic-loop-eval',
    name: 'RAG Agentic Loop + Eval',
    description: 'A complete RAG Agentic Loop with web/code tools plus an attached evaluation suite for response quality, tool use, trajectory, completion, and efficiency.',
    category: 'agent',
    preferredLayoutDirection: 'LR',
    yaml: `name: RAG Agentic Loop + Eval
nodes:
  - id: user_input
    type: promptTemplate
    label: User Query
    config:
      template: "{{question}}"
      inputVariables: question
    position:
      x: 100
      y: 180
  - id: memory
    type: memory
    config:
      memoryType: buffer
      windowSize: 10
    note: "Stores user messages and agent replies across turns"
    position:
      x: 100
      y: 340
  - id: agent
    type: agent
    config:
      maxIterations: 10
      instructions: "You are a grounded research assistant. Use retrieval for internal knowledge, web search for fresh facts, and code execution for computation before answering."
    note: |
      **RAG agent loop:**
      1. Read the task and memory
      2. Choose the next tool: retrieval, web search, or code execution
      3. If retrieving, embed the request and query the retriever
      4. Observe tool results
      5. Respond and store the answer in memory
    position:
      x: 430
      y: 260
  - id: search
    type: webSearch
    label: Web Search
    config:
      engine: brave
      maxResults: 5
    note: "Used when the agent needs fresh or external information"
    position:
      x: 770
      y: 40
  - id: embedding
    type: embedding
    label: Query Embedder
    note: "Converts the agent's retrieval request into a vector embedding"
    position:
      x: 760
      y: 145
  - id: vector_db
    type: vectorDB
    label: Vector Store
    config:
      provider: pinecone
    note: "Persistent vector index that backs the retriever's similarity search"
    position:
      x: 1070
      y: 315
  - id: retriever
    type: retriever
    label: Retriever
    config:
      topK: 5
    note: "Queries the connected vector store for the most relevant context"
    position:
      x: 760
      y: 315
  - id: toolcall
    type: toolCall
    label: Code Executor
    config:
      toolName: run_python
      timeout: 30
    note: "Executes Python code and returns stdout"
    position:
      x: 800
      y: 430
  - id: guardrails
    type: guardrails
    config:
      checks: toxicity, pii
    note: "PII detection + toxicity filter on the final answer"
    position:
      x: 770
      y: 590
  - id: parser
    type: outputParser
    config:
      format: markdown
    position:
      x: 1080
      y: 590
  - id: response_criteria
    type: rubric
    label: Response Criteria
    config:
      criteria: "Correctness\\nGroundedness\\nHelpfulness"
    note: "Structured criteria for single-turn answer quality"
    position:
      x: 100
      y: 850
  - id: expected_tools
    type: rubric
    label: Expected Tools
    config:
      criteria: "Use retriever for internal knowledge\\nUse web search for fresh facts\\nUse code execution for calculations"
    note: "Expected tool behavior for this class of task"
    position:
      x: 100
      y: 1020
  - id: expected_trajectory
    type: rubric
    label: Ideal Trajectory
    config:
      criteria: "Understand task\\nChoose correct tool\\nInterpret outputs\\nRespond clearly"
    note: "Reference action pattern for trajectory evaluation"
    position:
      x: 100
      y: 1190
  - id: success_criteria
    type: rubric
    label: Success Criteria
    config:
      criteria: "Answers the task\\nUses tools appropriately\\nProduces a grounded final response"
    note: "Structured rubric for overall completion"
    position:
      x: 760
      y: 850
  - id: single_turn
    type: singleTurnEval
    label: Single-Turn Quality
    config:
      relevance: true
      correctness: true
      helpfulness: true
      judgeModel: gpt-4o
    position:
      x: 430
      y: 850
  - id: tool_eval
    type: toolUseEval
    label: Tool Use Eval
    config:
      toolSelection: true
      argumentCorrectness: true
      redundantCalls: true
      matchStrategy: semantic
    position:
      x: 430
      y: 1020
  - id: trajectory
    type: trajectoryEval
    label: Trajectory Eval
    config:
      strategy: llm
      terminalStateWeight: 0.6
      stepEfficiency: true
    position:
      x: 430
      y: 1190
  - id: completion
    type: taskCompletion
    label: Task Completion
    config:
      completionType: graded
      allowPartialCredit: true
    position:
      x: 1090
      y: 850
  - id: efficiency
    type: agentEfficiency
    label: Agent Efficiency
    config:
      trackSteps: true
      trackToolCalls: true
      trackTokens: true
      trackCost: true
    position:
      x: 760
      y: 1020
  - id: ground_truth
    type: groundTruth
    label: Ground Truth
    note: "Reference answers and relevant context expectations for retrieval quality checks"
    position:
      x: 1090
      y: 1020
  - id: rag_eval
    type: ragEvaluator
    label: RAG Evaluator
    config:
      recallAtK: true
      precisionAtK: true
      mrr: true
      faithfulness: true
      answerRelevancy: true
      contextPrecision: true
      contextRecall: true
      k: 5
    note: "Measures both retrieval quality and whether the final answer is grounded in the retrieved context"
    position:
      x: 1090
      y: 1190
  - id: rag_threshold
    type: thresholdGate
    label: RAG Threshold
    config:
      threshold: 0.75
      metric: faithfulness
    note: "Flags runs where retrieval grounding quality falls below the target threshold"
    position:
      x: 1090
      y: 1360
edges:
  # User input enters both the live prompt path and the conversation memory
  - from: user_input
    to: agent
    fromHandle: prompt
    toHandle: prompt
  - from: user_input
    to: memory
    fromHandle: prompt
    toHandle: input
  - from: memory
    to: agent
    fromHandle: history
    toHandle: memory
  # Agent can choose between web search, retrieval, and code execution
  - from: agent
    to: search
    fromHandle: toolRequests
    toHandle: query
  - from: agent
    to: embedding
    fromHandle: toolRequests
    toHandle: text
  - from: agent
    to: retriever
    fromHandle: toolRequests
    toHandle: query
  - from: agent
    to: toolcall
    fromHandle: toolRequests
    toHandle: call
  - from: embedding
    to: vector_db
    fromHandle: embedding
    toHandle: embedding
  - from: vector_db
    to: retriever
    fromHandle: store
    toHandle: store
  - from: embedding
    to: retriever
    fromHandle: embedding
    toHandle: embedding
  # Tool observations loop back into the agent
  - from: search
    to: agent
    fromHandle: results
    toHandle: tools
    kind: loopback
    lane: top
  - from: retriever
    to: agent
    fromHandle: documents
    toHandle: tools
    kind: loopback
    lane: bottom
  - from: toolcall
    to: agent
    fromHandle: result
    toHandle: tools
    kind: loopback
    lane: right
  # Final answer is stored in memory and then sent through safety + formatting
  - from: agent
    to: memory
    fromHandle: response
    toHandle: input
  - from: agent
    to: guardrails
    fromHandle: response
    toHandle: input
  - from: guardrails
    to: parser
    fromHandle: passed
    toHandle: text
  # Evaluation context derived from the same user task
  - from: user_input
    to: response_criteria
    fromHandle: prompt
    toHandle: task
    kind: eval
  - from: user_input
    to: expected_tools
    fromHandle: prompt
    toHandle: task
    kind: eval
  - from: user_input
    to: expected_trajectory
    fromHandle: prompt
    toHandle: task
    kind: eval
  - from: user_input
    to: success_criteria
    fromHandle: prompt
    toHandle: task
    kind: eval
  - from: user_input
    to: single_turn
    fromHandle: prompt
    toHandle: query
    kind: eval
  - from: user_input
    to: tool_eval
    fromHandle: prompt
    toHandle: task
    kind: eval
  - from: user_input
    to: trajectory
    fromHandle: prompt
    toHandle: goal
    kind: eval
  - from: user_input
    to: completion
    fromHandle: prompt
    toHandle: taskDescription
    kind: eval
  - from: user_input
    to: ground_truth
    fromHandle: prompt
    toHandle: query
    kind: eval
  - from: user_input
    to: rag_eval
    fromHandle: prompt
    toHandle: query
    kind: eval
  # Rubrics provide structured expectations to the evaluators
  - from: response_criteria
    to: single_turn
    fromHandle: criteria
    toHandle: criteria
    kind: eval
  - from: expected_tools
    to: tool_eval
    fromHandle: criteria
    toHandle: expectedTools
    kind: eval
  - from: expected_trajectory
    to: trajectory
    fromHandle: criteria
    toHandle: expectedTrajectory
    kind: eval
  - from: success_criteria
    to: completion
    fromHandle: criteria
    toHandle: successCriteria
    kind: eval
  # Agent outputs feed the evaluation layer
  - from: agent
    to: single_turn
    fromHandle: response
    toHandle: response
    kind: eval
  - from: agent
    to: completion
    fromHandle: response
    toHandle: result
    kind: eval
  - from: agent
    to: tool_eval
    fromHandle: actions
    toHandle: toolCalls
    kind: eval
  - from: agent
    to: trajectory
    fromHandle: actions
    toHandle: trajectory
    kind: eval
  - from: agent
    to: efficiency
    fromHandle: actions
    toHandle: trajectory
    kind: eval
  - from: retriever
    to: rag_eval
    fromHandle: documents
    toHandle: contexts
    kind: eval
  - from: agent
    to: rag_eval
    fromHandle: response
    toHandle: response
    kind: eval
  - from: ground_truth
    to: rag_eval
    fromHandle: reference
    toHandle: reference
    kind: eval
  - from: rag_eval
    to: rag_threshold
    fromHandle: scores
    toHandle: score
    kind: eval`,
  },

  {
    id: 'multi-agent',
    name: 'Multi-Agent System',
    description: 'A router dispatches tasks to specialised agents. Results are aggregated and synthesised by an LLM.',
    category: 'agent',
    preferredLayoutDirection: 'LR',
    yaml: `name: Multi-Agent System
nodes:
  - id: user_input
    type: promptTemplate
    label: User Request
    note: "Entry point — query is routed based on its type"
  - id: router
    type: router
    config:
      conditionType: llm
      condition: "Route to Research if the query asks for facts or citations. Route to Analysis if the query asks for reasoning or conclusions."
    note: "Routes to Research or Analysis agent based on the query type"
  - id: research_agent
    type: agent
    label: Research Agent
    config:
      instructions: "You are a research specialist. Gather facts, cite sources, and return structured summaries."
      maxIterations: 5
  - id: analysis_agent
    type: agent
    label: Analysis Agent
    config:
      instructions: "You are an analysis specialist. Reason over data, identify patterns, and draw well-supported conclusions."
      maxIterations: 5
  - id: aggregator
    type: aggregator
    config:
      strategy: concat
  - id: llm
    type: llm
    label: Synthesis LLM
    config:
      model: gpt-4o
  - id: parser
    type: outputParser
edges:
  - from: user_input
    to: router
    fromHandle: prompt
    toHandle: input
  - from: router
    to: research_agent
    fromHandle: routeA
    toHandle: prompt
  - from: router
    to: analysis_agent
    fromHandle: routeB
    toHandle: prompt
  - from: research_agent
    to: aggregator
    fromHandle: response
    toHandle: inputA
  - from: analysis_agent
    to: aggregator
    fromHandle: response
    toHandle: inputB
  - from: aggregator
    to: llm
    fromHandle: merged
    toHandle: prompt
  - from: llm
    to: parser
    fromHandle: response
    toHandle: text`,
  },

  // ── Evaluation ──────────────────────────────────────────────────────────────

  {
    id: 'llm-eval-pipeline',
    name: 'LLM Evaluation Pipeline',
    description: 'Run LLM outputs through an LLM judge, ground truth comparison, rubric scoring, and a threshold gate.',
    category: 'eval',
    preferredLayoutDirection: 'LR',
    yaml: `name: LLM Evaluation Pipeline
nodes:
  - id: test_data
    type: dataLoader
    label: Test Dataset
    config:
      source: local
    note: "JSONL with {query, reference_answer} pairs"
  - id: llm
    type: llm
    label: Model Under Test
    config:
      model: gpt-4o
  - id: ground_truth
    type: groundTruth
    note: "Reference answers loaded from test dataset"
  - id: rubric
    type: rubric
    config:
      criteria: "Factual accuracy\\nConciseness\\nTone appropriateness\\nCitation quality"
    note: "Defines scoring dimensions for the LLM judge"
  - id: judge
    type: llmJudge
    config:
      judgeModel: gpt-4o
      scoringScale: "1-5"
      requireReasoning: true
    note: "Scores correctness, relevance, and helpfulness"
  - id: metrics
    type: evalMetrics
    config:
      bleu: true
      rouge: true
      bertScore: true
  - id: threshold
    type: thresholdGate
    config:
      threshold: 0.7
    note: "Fails the run if the average score falls below 0.7"
edges:
  # Feed test data into the model and ground truth store
  - from: test_data
    to: llm
    fromHandle: documents
    toHandle: prompt
  - from: test_data
    to: ground_truth
    fromHandle: documents
    toHandle: query
  # Model response flows to all evaluators
  - from: llm
    to: judge
    fromHandle: response
    toHandle: response
  - from: llm
    to: metrics
    fromHandle: response
    toHandle: response
  # Ground truth flows to judge and automated metrics
  - from: ground_truth
    to: judge
    fromHandle: reference
    toHandle: reference
  - from: ground_truth
    to: metrics
    fromHandle: reference
    toHandle: reference
  # Rubric criteria feed into the LLM judge
  - from: rubric
    to: judge
    fromHandle: criteria
    toHandle: criteria
  # Scores flow into the threshold gate
  - from: judge
    to: threshold
    fromHandle: score
    toHandle: score
  - from: metrics
    to: threshold
    fromHandle: scores
    toHandle: score`,
  },

  {
    id: 'rag-eval',
    name: 'RAG Evaluation',
    description: 'Evaluate retrieval quality (Recall@k, NDCG@k) and generation quality (Faithfulness, Answer Relevancy) with a RAGAS-style evaluator.',
    category: 'eval',
    preferredLayoutDirection: 'LR',
    yaml: `name: RAG Evaluation Pipeline
nodes:
  - id: test_query
    type: promptTemplate
    label: Test Query
    config:
      template: "{{question}}"
      inputVariables: question
    note: "Evaluation question from the test set"
  - id: retriever
    type: retriever
    config:
      topK: 5
  - id: query_embedder
    type: embedding
    label: Query Embedder
  - id: llm
    type: llm
    label: Answer LLM
    config:
      model: gpt-4o
  - id: ground_truth
    type: groundTruth
    note: "Reference answers and relevant doc IDs from the test set"
  - id: rag_eval
    type: ragEvaluator
    config:
      recallAtK: true
      precisionAtK: true
      mrr: true
      ndcgAtK: true
      faithfulness: true
      answerRelevancy: true
      contextPrecision: true
      contextRecall: true
      k: 5
    note: |
      **RAGAS-style metrics:**
      - **Retrieval**: Recall@5, Precision@5, MRR, NDCG@5
      - **Generation**: Faithfulness, Answer Relevancy,
        Context Precision, Context Recall
  - id: threshold
    type: thresholdGate
    config:
      threshold: 0.75
      metric: faithfulness
edges:
  # Query feeds retriever and is also passed to the evaluator
  - from: test_query
    to: query_embedder
    fromHandle: prompt
    toHandle: text
  - from: test_query
    to: retriever
    fromHandle: prompt
    toHandle: query
  - from: query_embedder
    to: retriever
    fromHandle: embedding
    toHandle: embedding
  - from: test_query
    to: ground_truth
    fromHandle: prompt
    toHandle: query
  - from: test_query
    to: rag_eval
    fromHandle: prompt
    toHandle: query
  # Retrieved docs feed both the LLM and the evaluator
  - from: retriever
    to: llm
    fromHandle: documents
    toHandle: prompt
  - from: retriever
    to: rag_eval
    fromHandle: documents
    toHandle: contexts
  # LLM answer goes to evaluator
  - from: llm
    to: rag_eval
    fromHandle: response
    toHandle: response
  # Ground truth reference goes to evaluator
  - from: ground_truth
    to: rag_eval
    fromHandle: reference
    toHandle: reference
  # Evaluation scores flow to threshold gate
  - from: rag_eval
    to: threshold
    fromHandle: scores
    toHandle: score`,
  },

  {
    id: 'agent-eval',
    name: 'Agent Evaluation',
    description: 'Evaluate an agent across single-turn quality, tool usage correctness, trajectory optimality, and overall task completion.',
    category: 'eval',
    preferredLayoutDirection: 'LR',
    yaml: `name: Agent Evaluation Suite
nodes:
  - id: task_input
    type: promptTemplate
    label: Task Definition
    config:
      template: "{{task}}"
      inputVariables: task
    note: "The task description given to the agent under test"
  - id: agent
    type: agent
    label: Agent Under Test
    config:
      maxIterations: 10
  - id: response_criteria
    type: rubric
    label: Response Criteria
    config:
      criteria: "Correctness\\nRelevance\\nHelpfulness"
    note: "Evaluation rubric for single-turn quality"
  - id: expected_tools
    type: rubric
    label: Expected Tools
    config:
      criteria: "Use web search for factual lookup\\nUse code execution for calculations"
    note: "Structured expectation for which tools the agent should call"
  - id: expected_trajectory
    type: rubric
    label: Ideal Trajectory
    config:
      criteria: "Understand task\\nChoose tools\\nInterpret outputs\\nRespond clearly"
    note: "Reference action pattern for trajectory evaluation"
  - id: success_criteria
    type: rubric
    label: Success Criteria
    config:
      criteria: "Solves the task\\nUses tools appropriately\\nProduces a correct final answer"
    note: "Structured rubric for overall completion"
  - id: single_turn
    type: singleTurnEval
    config:
      relevance: true
      correctness: true
      helpfulness: true
      judgeModel: gpt-4o
    note: "Scores the final response on quality"
  - id: tool_eval
    type: toolUseEval
    config:
      toolSelection: true
      argumentCorrectness: true
      redundantCalls: true
      matchStrategy: semantic
    note: "Compares actual tool calls against the expected set"
  - id: trajectory
    type: trajectoryEval
    config:
      strategy: llm
      terminalStateWeight: 0.6
      stepEfficiency: true
    note: "Scores the full action sequence, not just the final answer"
  - id: completion
    type: taskCompletion
    config:
      completionType: graded
      allowPartialCredit: true
    note: "Did the agent actually complete the task?"
  - id: efficiency
    type: agentEfficiency
    config:
      trackSteps: true
      trackToolCalls: true
      trackTokens: true
      trackCost: true
    note: "Steps taken, tool calls made, tokens used, estimated cost"
edges:
  # Task definition feeds the agent and all evaluators that need task context
  - from: task_input
    to: agent
    fromHandle: prompt
    toHandle: prompt
  - from: task_input
    to: response_criteria
    fromHandle: prompt
    toHandle: task
  - from: task_input
    to: expected_tools
    fromHandle: prompt
    toHandle: task
  - from: task_input
    to: expected_trajectory
    fromHandle: prompt
    toHandle: task
  - from: task_input
    to: success_criteria
    fromHandle: prompt
    toHandle: task
  - from: task_input
    to: single_turn
    fromHandle: prompt
    toHandle: query
  - from: task_input
    to: tool_eval
    fromHandle: prompt
    toHandle: task
  - from: task_input
    to: trajectory
    fromHandle: prompt
    toHandle: goal
  - from: task_input
    to: completion
    fromHandle: prompt
    toHandle: taskDescription
  # Rubrics provide the structured expectations each evaluator needs
  - from: response_criteria
    to: single_turn
    fromHandle: criteria
    toHandle: criteria
  - from: expected_tools
    to: tool_eval
    fromHandle: criteria
    toHandle: expectedTools
  - from: expected_trajectory
    to: trajectory
    fromHandle: criteria
    toHandle: expectedTrajectory
  - from: success_criteria
    to: completion
    fromHandle: criteria
    toHandle: successCriteria
  # Agent response goes to single-turn and task completion evaluators
  - from: agent
    to: single_turn
    fromHandle: response
    toHandle: response
  - from: agent
    to: completion
    fromHandle: response
    toHandle: result
  # Agent actions (tool call log) go to tool, trajectory, and efficiency evaluators
  - from: agent
    to: tool_eval
    fromHandle: actions
    toHandle: toolCalls
  - from: agent
    to: trajectory
    fromHandle: actions
    toHandle: trajectory
  - from: agent
    to: efficiency
    fromHandle: actions
    toHandle: trajectory`,
  },
]

export const CATEGORY_LABELS: Record<FlowTemplate['category'], string> = {
  rag: 'RAG Pipelines',
  agent: 'Agents',
  eval: 'Evaluation',
  pipeline: 'Pipelines',
}
