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
    type: trigger
    label: User Question
    config:
      triggerType: user-message
  - id: loader
    type: dataLoader
    config:
      source: file
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
      model: claude-sonnet-5-5
  - id: answer
    type: output
    label: Answer
    config:
      destination: user
      format: markdown
edges:
  - from: user_query
    to: vectordb
    fromHandle: payload
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
    fromHandle: payload
    toHandle: inputA
  - from: prompt
    to: llm
    fromHandle: merged
    toHandle: prompt
  - from: llm
    to: answer
    fromHandle: response
    toHandle: input`,
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
    type: trigger
    label: User Question
    config:
      triggerType: user-message
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
      model: claude-haiku-4-5
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
      model: claude-sonnet-5-5
  - id: answer
    type: output
    label: Answer
    config:
      destination: user
      format: markdown
edges:
  - from: user_query
    to: expansion_context
    fromHandle: payload
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
    fromHandle: payload
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
    to: answer
    fromHandle: response
    toHandle: input`,
  },

  {
    id: 'conversational-rag',
    name: 'Conversational RAG',
    description: 'Multi-turn RAG with conversation memory — the LLM answers questions grounded in retrieved context while retaining the full conversation history.',
    category: 'rag',
    preferredLayoutDirection: 'LR',
    yaml: `name: Conversational RAG
nodes:
  # ── Main pipeline (top row, left → right) ──────────────────────────────────
  - id: user_query
    type: trigger
    label: User Question
    config:
      triggerType: user-message
    note: "The current user turn — feeds the retrieval path, the prompt builder, and memory"
    position:
      x: 60
      y: 160
  - id: embedder
    type: embedding
    label: Query Embedder
    note: "Encodes the current question into a vector for semantic search"
    position:
      x: 340
      y: 40
  - id: retriever
    type: retriever
    config:
      topK: 5
      strategy: similarity
    note: "Fetches the most relevant chunks for the current question — history is not used here, only the current turn"
    position:
      x: 620
      y: 40
  - id: prompt
    type: aggregator
    label: Prompt Builder
    config:
      inputCount: 3
      strategy: concat
    note: "Assembles three inputs: (A) current question, (B) conversation history, (C) retrieved context"
    position:
      x: 900
      y: 160
  - id: llm
    type: llm
    config:
      model: claude-sonnet-5-5
    note: "Generates an answer grounded in retrieved context and aware of prior conversation turns"
    position:
      x: 1160
      y: 160
  - id: answer
    type: output
    label: Answer
    config:
      destination: user
      format: markdown
    position:
      x: 1420
      y: 160
  # ── Memory layer (bottom row) ───────────────────────────────────────────────
  - id: memory
    type: memory
    label: Conversation Memory
    config:
      memoryType: conversation
      windowSize: 10
    note: "Reads: injects prior turns into the prompt\\nWrites: the LLM reply loops back here so next turn has full context"
    position:
      x: 620
      y: 380
edges:
  # Retrieval path
  - from: user_query
    to: embedder
    fromHandle: payload
    toHandle: text
  - from: embedder
    to: retriever
    fromHandle: embedding
    toHandle: embedding
  - from: user_query
    to: retriever
    fromHandle: payload
    toHandle: query
  # Prompt assembly
  - from: user_query
    to: prompt
    fromHandle: payload
    toHandle: inputA
  - from: memory
    to: prompt
    fromHandle: history
    toHandle: inputB
  - from: retriever
    to: prompt
    fromHandle: documents
    toHandle: inputC
  # Generation
  - from: prompt
    to: llm
    fromHandle: merged
    toHandle: prompt
  - from: llm
    to: answer
    fromHandle: response
    toHandle: input
  # Memory write — user input in, LLM response loops back
  - from: user_query
    to: memory
    fromHandle: payload
    toHandle: input
  - from: llm
    to: memory
    fromHandle: response
    toHandle: input
    kind: loopback`,
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
    type: trigger
    label: User Message
    config:
      triggerType: user-message
    position:
      x: 100
      y: 180
  - id: memory
    type: memory
    config:
      memoryType: conversation
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
      y: 300
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
    type: codeExec
    label: Code Execution
    config:
      language: python
      sandbox: hosted
      timeout: 30
    note: "Runs model-written Python in a sandbox and returns the result"
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
  - id: answer
    type: output
    label: Answer
    config:
      destination: user
      format: markdown
    position:
      x: 1110
      y: 440
edges:
  # User input enters both the live prompt path and the conversation memory
  - from: user_input
    to: agent
    fromHandle: payload
    toHandle: prompt
    executionPriority: 1
  - from: user_input
    to: memory
    fromHandle: payload
    toHandle: input
    executionPriority: 1
  - from: memory
    to: agent
    fromHandle: history
    toHandle: memory
    executionPriority: 2
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
    to: answer
    fromHandle: passed
    toHandle: input`,
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
    type: trigger
    label: User Message
    config:
      triggerType: user-message
    position:
      x: 100
      y: 180
  - id: memory
    type: memory
    config:
      memoryType: conversation
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
      y: 20
  - id: embedding
    type: embedding
    label: Query Embedder
    note: "Converts the agent's retrieval request into a vector embedding"
    position:
      x: 760
      y: 240
  - id: vector_db
    type: vectorDB
    label: Vector Store
    config:
      provider: pinecone
    note: "Persistent vector index that backs the retriever's similarity search"
    position:
      x: 1140
      y: 430
  - id: retriever
    type: retriever
    label: Retriever
    config:
      topK: 5
    note: "Queries the connected vector store for the most relevant context"
    position:
      x: 760
      y: 430
  - id: toolcall
    type: codeExec
    label: Code Execution
    config:
      language: python
      sandbox: hosted
      timeout: 30
    note: "Runs model-written Python in a sandbox and returns the result"
    position:
      x: 800
      y: 620
  - id: guardrails
    type: guardrails
    config:
      checks: toxicity, pii
    note: "PII detection + toxicity filter on the final answer"
    position:
      x: 770
      y: 810
  - id: answer
    type: output
    label: Answer
    config:
      destination: user
      format: markdown
    position:
      x: 1140
      y: 810
edges:
  # User input enters both the live prompt path and the conversation memory
  - from: user_input
    to: agent
    fromHandle: payload
    toHandle: prompt
    executionPriority: 1
  - from: user_input
    to: memory
    fromHandle: payload
    toHandle: input
    executionPriority: 1
  - from: memory
    to: agent
    fromHandle: history
    toHandle: memory
    executionPriority: 2
  # Agent can choose between web search, retrieval, and code execution
  - from: agent
    to: search
    fromHandle: toolRequests
    toHandle: query
    executionPriority: 3
  - from: agent
    to: embedding
    fromHandle: toolRequests
    toHandle: text
    executionPriority: 1
  - from: agent
    to: retriever
    fromHandle: toolRequests
    toHandle: query
    executionPriority: 2
  - from: agent
    to: toolcall
    fromHandle: toolRequests
    toHandle: call
    executionPriority: 4
  - from: embedding
    to: vector_db
    fromHandle: embedding
    toHandle: embedding
    executionPriority: 2
  - from: vector_db
    to: retriever
    fromHandle: store
    toHandle: store
    executionPriority: 3
  - from: embedding
    to: retriever
    fromHandle: embedding
    toHandle: embedding
    executionPriority: 3
  # Tool observations loop back into the agent
  - from: search
    to: agent
    fromHandle: results
    toHandle: tools
    kind: loopback
    lane: top
    executionPriority: 1
  - from: retriever
    to: agent
    fromHandle: documents
    toHandle: tools
    kind: loopback
    lane: bottom
    executionPriority: 1
  - from: toolcall
    to: agent
    fromHandle: result
    toHandle: tools
    kind: loopback
    lane: right
    executionPriority: 1
  # Final answer is stored in memory and then sent through safety + formatting
  - from: agent
    to: memory
    fromHandle: response
    toHandle: input
    executionPriority: 5
  - from: agent
    to: guardrails
    fromHandle: response
    toHandle: input
    executionPriority: 5
  - from: guardrails
    to: answer
    fromHandle: passed
    toHandle: input
    executionPriority: 6`,
  },

  {
    id: 'multi-agent',
    name: 'Multi-Agent System',
    description: 'An orchestrator agent breaks the request into subtasks, delegates them to specialist sub-agents, and synthesises their results.',
    category: 'agent',
    preferredLayoutDirection: 'LR',
    yaml: `name: Multi-Agent System
nodes:
  - id: user_input
    type: trigger
    label: User Request
    config:
      triggerType: user-message
  - id: orchestrator
    type: agent
    label: Orchestrator
    config:
      model: claude-opus-5-5
      instructions: "Break the request into research and analysis subtasks, delegate each to the right specialist, then synthesise one answer from their results."
      maxIterations: 8
      allowDelegation: true
    note: |
      **Orchestrator–worker:**
      1. Plan subtasks
      2. Delegate to specialists (in parallel when independent)
      3. Read their results
      4. Synthesise the final answer
  - id: research_agent
    type: subAgent
    label: Research Agent
    config:
      model: claude-sonnet-5-5
      role: "Gather facts and cite sources for the assigned subtask. Return a concise, cited summary."
      returnMode: summary
  - id: analysis_agent
    type: subAgent
    label: Analysis Agent
    config:
      model: claude-sonnet-5-5
      role: "Reason over the provided data, identify patterns, and return well-supported conclusions."
      returnMode: structured
  - id: search
    type: webSearch
    label: Web Search
    note: "The research sub-agent's own tool"
  - id: answer
    type: output
    label: Answer
    config:
      destination: user
      format: markdown
edges:
  - from: user_input
    to: orchestrator
    fromHandle: payload
    toHandle: prompt
  # Delegation: sub-agents are called like tools and report back
  - from: orchestrator
    to: research_agent
    fromHandle: toolRequests
    toHandle: task
  - from: orchestrator
    to: analysis_agent
    fromHandle: toolRequests
    toHandle: task
  - from: research_agent
    to: orchestrator
    fromHandle: result
    toHandle: tools
    kind: loopback
    lane: top
  - from: analysis_agent
    to: orchestrator
    fromHandle: artifacts
    toHandle: tools
    kind: loopback
    lane: bottom
  # The research sub-agent runs its own tool loop
  - from: research_agent
    to: search
    fromHandle: toolRequests
    toHandle: query
  - from: search
    to: research_agent
    fromHandle: results
    toHandle: tools
    kind: loopback
  - from: orchestrator
    to: answer
    fromHandle: response
    toHandle: input`,
  },

  {
    id: 'support-triage',
    name: 'Support Ticket Triage',
    description: 'A webhook-triggered support flow: route tickets by type, let specialist agents act through MCP servers, require human approval before replying, with checkpointed state and tracing.',
    category: 'agent',
    preferredLayoutDirection: 'LR',
    yaml: `name: Support Ticket Triage
nodes:
  - id: ticket
    type: trigger
    label: New Ticket
    config:
      triggerType: webhook
      source: helpdesk ticket.created
  - id: triage
    type: router
    label: Triage
    config:
      routeCount: 3
      routeLabels: Billing, Technical, Account
      conditionType: llm
      condition: "Classify the ticket as Billing (charges, refunds, invoices), Technical (bugs, errors, outages), or Account (login, access, settings). Use Default if unsure."
  - id: billing_agent
    type: agent
    label: Billing Agent
    config:
      model: claude-sonnet-5-5
      instructions: "Resolve billing tickets. Look up the customer's charges and draft a reply; propose a refund only when policy allows."
      maxIterations: 6
  - id: billing_mcp
    type: mcpServer
    label: Billing MCP
    config:
      serverName: stripe
      transport: http
      allowedTools: search_charges, get_invoice, create_refund
      requireApproval: true
  - id: tech_agent
    type: agent
    label: Technical Agent
    config:
      model: claude-sonnet-5-5
      instructions: "Diagnose technical tickets. Search known issues, link or file a bug, and draft a reply with next steps."
      maxIterations: 8
  - id: tracker_mcp
    type: mcpServer
    label: Issue Tracker MCP
    config:
      serverName: linear
      transport: http
      allowedTools: search_issues, create_issue
  - id: approval
    type: humanApproval
    label: Approve Reply
    config:
      channel: slack
      approvers: support-leads
      allowEdits: true
      timeoutMinutes: 120
      onTimeout: escalate
    note: "Agents draft; a person approves, edits, or rejects before anything reaches the customer"
  - id: send_reply
    type: output
    label: Send Reply
    config:
      destination: api
      format: markdown
  - id: human_queue
    type: output
    label: Human Queue
    config:
      destination: notification
      format: text
    note: "Account issues, unclear tickets, and rejected drafts go to a human agent"
  - id: ticket_state
    type: state
    label: Ticket State
    config:
      scope: run
      keys: ticket_id, customer_id, category, approval_decision, reviewer_notes
      backend: postgres
      checkpointing: pause
      retentionDays: 90
    note: "Checkpointed when the run pauses for approval, so it resumes hours later exactly where it stopped"
  - id: tracing
    type: tracing
    label: Tracing
    config:
      provider: langfuse
      scope: flow
      redactPII: true
    note: "Traces every step — routing decision, MCP calls, drafts, approval wait — with customer PII redacted"
edges:
  - from: ticket
    to: triage
    fromHandle: payload
    toHandle: input
  - from: triage
    to: billing_agent
    fromHandle: routeA
    toHandle: prompt
  - from: triage
    to: tech_agent
    fromHandle: routeB
    toHandle: prompt
  - from: triage
    to: human_queue
    fromHandle: routeC
    toHandle: input
  - from: triage
    to: human_queue
    fromHandle: default
    toHandle: input
  # Tool loops through MCP servers
  - from: billing_agent
    to: billing_mcp
    fromHandle: toolRequests
    toHandle: call
  - from: billing_mcp
    to: billing_agent
    fromHandle: result
    toHandle: tools
    kind: loopback
    lane: top
  - from: tech_agent
    to: tracker_mcp
    fromHandle: toolRequests
    toHandle: call
  - from: tracker_mcp
    to: tech_agent
    fromHandle: result
    toHandle: tools
    kind: loopback
    lane: bottom
  # Drafts go through human approval
  - from: billing_agent
    to: approval
    fromHandle: response
    toHandle: proposal
  - from: tech_agent
    to: approval
    fromHandle: response
    toHandle: proposal
  - from: approval
    to: send_reply
    fromHandle: approved
    toHandle: input
  - from: approval
    to: human_queue
    fromHandle: rejected
    toHandle: input
  # Shared state: ticket facts in, decisions recorded, reviewer sees context
  - from: ticket
    to: ticket_state
    fromHandle: metadata
    toHandle: write
  - from: approval
    to: ticket_state
    fromHandle: rejected
    toHandle: write
  - from: ticket_state
    to: approval
    fromHandle: read
    toHandle: context`,
  },

  // ── Evaluation ──────────────────────────────────────────────────────────────

  {
    id: 'llm-eval-pipeline',
    name: 'LLM Evaluation Pipeline',
    description: 'Run every case in a pinned test set through the model, score each with an assertion, an LLM judge, and automatic metrics, then gate the aggregate score.',
    category: 'eval',
    preferredLayoutDirection: 'LR',
    yaml: `name: LLM Evaluation Pipeline
nodes:
  - id: test_data
    type: evalDataset
    label: Test Dataset
    config:
      source: file
      path: data/eval_set.jsonl
      version: v1
      inputField: query
      expectedField: reference_answer
      split: test
    note: "Pinned, held-out test split — results stay comparable across runs"
  - id: cases
    type: loop
    label: For Each Test Case
    config:
      mode: parallel
      maxConcurrency: 10
    note: "Runs the model and scorers once per case, then collects all scores"
  - id: llm
    type: llm
    label: Model Under Test
    config:
      model: claude-sonnet-5-5
      effort: medium
  - id: ground_truth
    type: groundTruth
    config:
      source: dataset
    note: "Reference answer for the current case"
  - id: rubric
    type: rubric
    config:
      criteria: "Factual accuracy\\nConciseness\\nTone appropriateness\\nCitation quality"
    note: "Defines scoring dimensions for the LLM judge"
  - id: judge
    type: llmJudge
    config:
      judgeModel: claude-opus-5-5
      scoringScale: "1-5"
      requireReasoning: true
  - id: metrics
    type: evalMetrics
    config:
      bleu: true
      rouge: true
      bertScore: true
  - id: cites_source
    type: assertion
    label: Cites a Source
    config:
      checkType: regex
      spec: '\\[\\d+\\]'
    note: "Deterministic check — free and exact, so it runs before any judgement call"
  - id: threshold
    type: thresholdGate
    config:
      threshold: 0.7
    note: "Passes only if the average score across all cases is at least 0.7"
  - id: report
    type: output
    label: Eval Report
    config:
      destination: file
      format: json
  - id: alert
    type: output
    label: Regression Alert
    config:
      destination: notification
      format: text
edges:
  - from: test_data
    to: cases
    fromHandle: cases
    toHandle: items
  # Per case: model answer + reference
  - from: cases
    to: llm
    fromHandle: item
    toHandle: prompt
  - from: cases
    to: ground_truth
    fromHandle: item
    toHandle: query
  - from: llm
    to: judge
    fromHandle: response
    toHandle: response
  - from: llm
    to: metrics
    fromHandle: response
    toHandle: response
  - from: ground_truth
    to: judge
    fromHandle: reference
    toHandle: reference
  - from: ground_truth
    to: metrics
    fromHandle: reference
    toHandle: reference
  - from: rubric
    to: judge
    fromHandle: criteria
    toHandle: criteria
  # Per-case scores are collected by the loop
  - from: judge
    to: cases
    fromHandle: score
    toHandle: itemResult
    kind: loopback
  - from: metrics
    to: cases
    fromHandle: scores
    toHandle: itemResult
    kind: loopback
  - from: llm
    to: cites_source
    fromHandle: response
    toHandle: output
  - from: cites_source
    to: cases
    fromHandle: score
    toHandle: itemResult
    kind: loopback
  # Aggregate scores are gated
  - from: cases
    to: threshold
    fromHandle: results
    toHandle: score
  - from: threshold
    to: report
    fromHandle: pass
    toHandle: input
  - from: threshold
    to: alert
    fromHandle: fail
    toHandle: input`,
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
    type: trigger
    label: Test Query
    config:
      triggerType: manual
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
      model: claude-sonnet-5-5
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
    fromHandle: payload
    toHandle: text
  - from: test_query
    to: retriever
    fromHandle: payload
    toHandle: query
  - from: query_embedder
    to: retriever
    fromHandle: embedding
    toHandle: embedding
  - from: test_query
    to: ground_truth
    fromHandle: payload
    toHandle: query
  - from: test_query
    to: rag_eval
    fromHandle: payload
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
    type: trigger
    label: Task Definition
    config:
      triggerType: manual
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
      judgeModel: claude-opus-5-5
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
    fromHandle: payload
    toHandle: prompt
  - from: task_input
    to: response_criteria
    fromHandle: payload
    toHandle: task
  - from: task_input
    to: expected_tools
    fromHandle: payload
    toHandle: task
  - from: task_input
    to: expected_trajectory
    fromHandle: payload
    toHandle: task
  - from: task_input
    to: success_criteria
    fromHandle: payload
    toHandle: task
  - from: task_input
    to: single_turn
    fromHandle: payload
    toHandle: query
  - from: task_input
    to: tool_eval
    fromHandle: payload
    toHandle: task
  - from: task_input
    to: trajectory
    fromHandle: payload
    toHandle: goal
  - from: task_input
    to: completion
    fromHandle: payload
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

  {
    id: 'multi-turn-agent-eval',
    name: 'Multi-Turn Agent Eval',
    description: 'Simulated users with per-case personas and goals converse with the agent; score the conversations and check the resulting system state.',
    category: 'eval',
    preferredLayoutDirection: 'LR',
    yaml: `name: Multi-Turn Agent Eval
nodes:
  - id: scenarios
    type: evalDataset
    label: Support Scenarios
    config:
      source: file
      path: data/support_scenarios.jsonl
      version: v1
      inputField: persona_and_goal
      expectedField: expected_end_state
      split: test
    note: "Each case: a persona, a goal, and the system state a correct agent should leave behind"
  - id: cases
    type: loop
    label: For Each Scenario
    config:
      mode: parallel
      maxConcurrency: 5
  - id: sim
    type: userSimulator
    label: Simulated Customer
    config:
      model: claude-sonnet-5-5
      maxTurns: 10
      stopWhen: goal-or-max
    note: "Plays the scenario's persona and pursues its goal until done or out of turns"
  - id: agent
    type: agent
    label: Support Agent (under test)
    config:
      model: claude-sonnet-5-5
      instructions: "Resolve billing issues. Verify the charge before issuing any refund."
      maxIterations: 8
  - id: billing
    type: mcpServer
    label: Billing MCP (sandbox)
    config:
      serverName: stripe-sandbox
      transport: http
      allowedTools: search_charges, create_refund
  - id: conversation_eval
    type: multiTurnEval
    label: Conversation Quality
    config:
      judgeModel: claude-opus-5-5
      coherence: true
      goalProgress: true
      consistency: true
  - id: end_state
    type: assertion
    label: Correct End State
    config:
      checkType: state-check
      spec: "SELECT status, amount FROM refunds WHERE charge_id = :charge_id"
      timeout: 30
    note: "Checks what the agent actually did in the sandbox, not what it said it did"
  - id: gate
    type: thresholdGate
    config:
      threshold: 0.9
  - id: report
    type: output
    label: Eval Report
    config:
      destination: file
      format: json
  - id: alert
    type: output
    label: Regression Alert
    config:
      destination: notification
      format: text
edges:
  - from: scenarios
    to: cases
    fromHandle: cases
    toHandle: items
  - from: cases
    to: sim
    fromHandle: item
    toHandle: scenario
  # Simulated conversation
  - from: sim
    to: agent
    fromHandle: message
    toHandle: prompt
  - from: agent
    to: sim
    fromHandle: response
    toHandle: agentReply
    kind: loopback
  # Agent's tool loop against the sandbox
  - from: agent
    to: billing
    fromHandle: toolRequests
    toHandle: call
  - from: billing
    to: agent
    fromHandle: result
    toHandle: tools
    kind: loopback
  # Scoring
  - from: sim
    to: conversation_eval
    fromHandle: conversation
    toHandle: conversation
  - from: cases
    to: conversation_eval
    fromHandle: item
    toHandle: goal
  - from: agent
    to: end_state
    fromHandle: actions
    toHandle: output
  - from: cases
    to: end_state
    fromHandle: item
    toHandle: expected
  - from: conversation_eval
    to: cases
    fromHandle: scores
    toHandle: itemResult
    kind: loopback
  - from: end_state
    to: cases
    fromHandle: score
    toHandle: itemResult
    kind: loopback
  # Aggregate
  - from: cases
    to: gate
    fromHandle: results
    toHandle: score
  - from: gate
    to: report
    fromHandle: pass
    toHandle: input
  - from: gate
    to: alert
    fromHandle: fail
    toHandle: input`,
  },

  // ── Pipeline ─────────────────────────────────────────────────────────────────

  {
    id: 'structured-output',
    name: 'Structured Output',
    description: 'Extract typed fields from raw documents (invoices, contracts, forms) with schema-constrained generation, then auto-accept confident results and send the rest to human review.',
    category: 'pipeline',
    preferredLayoutDirection: 'LR',
    yaml: `name: Structured Output Pipeline
nodes:
  - id: loader
    type: dataLoader
    label: Document Loader
    config:
      source: file
    note: "Load raw source documents — PDFs, emails, contracts, HTML pages, etc."
  - id: chunker
    type: chunker
    label: Chunker
    config:
      chunkSize: 2048
      overlap: 128
    note: "Large chunks work well for extraction — fields often span full sentences"
  - id: prompt
    type: promptTemplate
    label: Extraction Prompt
    config:
      template: "Extract the invoice fields from this document. Use null for anything not present.\\n\\n{{document}}"
      inputVariables: document
  - id: llm
    type: llm
    label: Extractor
    config:
      model: claude-sonnet-5-5
      effort: low
      responseFormat: json-schema
      outputSchema: '{"type":"object","properties":{"company_name":{"type":"string"},"invoice_date":{"type":"string","format":"date"},"total_amount":{"type":"number"},"line_items":{"type":"array","items":{"type":"object"}},"confidence":{"type":"number"}},"required":["company_name","invoice_date","total_amount","confidence"]}'
    note: "Structured output constrains the response to the schema — no separate parser needed. Low effort is enough for extraction."
  - id: gate
    type: thresholdGate
    label: Confidence Gate
    config:
      metric: confidence
      threshold: 0.85
  - id: review
    type: humanApproval
    label: Review Extraction
    config:
      channel: app
      allowEdits: true
      timeoutMinutes: 0
    note: "Low-confidence extractions are checked and corrected by a person"
  - id: store
    type: output
    label: Write to Database
    config:
      destination: database
      format: json
edges:
  - from: loader
    to: chunker
    fromHandle: documents
    toHandle: documents
  - from: chunker
    to: prompt
    fromHandle: chunks
    toHandle: context
  - from: prompt
    to: llm
    fromHandle: prompt
    toHandle: prompt
  - from: llm
    to: gate
    fromHandle: structured
    toHandle: score
  - from: llm
    to: gate
    fromHandle: structured
    toHandle: payload
  - from: gate
    to: store
    fromHandle: pass
    toHandle: input
  - from: gate
    to: review
    fromHandle: fail
    toHandle: proposal
  - from: review
    to: store
    fromHandle: approved
    toHandle: input`,
  },
]

export const CATEGORY_LABELS: Record<FlowTemplate['category'], string> = {
  rag: 'RAG Pipelines',
  agent: 'Agents',
  eval: 'Evaluation',
  pipeline: 'Pipelines',
}
