import type { NodeTypes } from 'reactflow'
import LLMNode from './LLMNode'
import AgentNode from './AgentNode'
import PromptNode from './PromptNode'
import PromptTemplateNode from './PromptTemplateNode'
import MemoryNode from './MemoryNode'
import DataLoaderNode from './DataLoaderNode'
import ChunkerNode from './ChunkerNode'
import EmbeddingNode from './EmbeddingNode'
import VectorDBNode from './VectorDBNode'
import RetrieverNode from './RetrieverNode'
import RerankerNode from './RerankerNode'
import CacheNode from './CacheNode'
import RouterNode from './RouterNode'
import AggregatorNode from './AggregatorNode'
import ClassifierNode from './ClassifierNode'
import FrameNode from './FrameNode'
import TextNode from './TextNode'
import ToolCallNode from './ToolCallNode'
import WebSearchNode from './WebSearchNode'
import OutputParserNode from './OutputParserNode'
import EvaluatorNode from './EvaluatorNode'
import GuardrailsNode from './GuardrailsNode'
import LLMJudgeNode from './LLMJudgeNode'
import RubricNode from './RubricNode'
import ComparatorNode from './ComparatorNode'
import GroundTruthNode from './GroundTruthNode'
import EvalMetricsNode from './EvalMetricsNode'
import CritiqueNode from './CritiqueNode'
import ThresholdGateNode from './ThresholdGateNode'
import HumanRaterNode from './HumanRaterNode'
import RAGEvaluatorNode from './RAGEvaluatorNode'
import SingleTurnEvalNode from './SingleTurnEvalNode'
import MultiTurnEvalNode from './MultiTurnEvalNode'
import ToolUseEvalNode from './ToolUseEvalNode'
import TrajectoryEvalNode from './TrajectoryEvalNode'
import TaskCompletionNode from './TaskCompletionNode'
import AgentEfficiencyNode from './AgentEfficiencyNode'
import CharacterNode from './CharacterNode'
import GenericIntegrationNode from './GenericIntegrationNode'
import TriggerNode from './TriggerNode'
import StateNode from './StateNode'
import TracingNode from './TracingNode'
import MonitorNode from './MonitorNode'
import OutputNode from './OutputNode'
import SubAgentNode from './SubAgentNode'
import HumanApprovalNode from './HumanApprovalNode'
import LoopNode from './LoopNode'
import MCPServerNode from './MCPServerNode'
import CodeExecNode from './CodeExecNode'

/**
 * nodeTypes maps the `type` string on each React Flow Node to the
 * React component that renders it. The keys MUST match NodeDefinition.type
 * in src/lib/nodeDefinitions.ts.
 *
 * This object must be defined OUTSIDE of any component render function
 * (i.e., module-level) so React Flow receives a stable reference and does
 * not remount nodes on every parent re-render.
 */
export const nodeTypes: NodeTypes = {
  // Core
  trigger: TriggerNode,
  llm: LLMNode,
  agent: AgentNode,
  subAgent: SubAgentNode,
  prompt: PromptNode,
  promptTemplate: PromptTemplateNode,
  memory: MemoryNode,
  state: StateNode,
  output: OutputNode,
  // Data
  dataLoader: DataLoaderNode,
  chunker: ChunkerNode,
  embedding: EmbeddingNode,
  vectorDB: VectorDBNode,
  retriever: RetrieverNode,
  reranker: RerankerNode,
  cache: CacheNode,
  // Flow
  router: RouterNode,
  aggregator: AggregatorNode,
  classifier: ClassifierNode,
  humanApproval: HumanApprovalNode,
  loop: LoopNode,
  frame: FrameNode,
  text: TextNode,
  // Tools
  toolCall: ToolCallNode,
  webSearch: WebSearchNode,
  mcpServer: MCPServerNode,
  codeExec: CodeExecNode,
  // Output
  outputParser: OutputParserNode,
  evaluator: EvaluatorNode,
  guardrails: GuardrailsNode,
  tracing: TracingNode,
  monitor: MonitorNode,
  // Evaluation strategies
  llmJudge: LLMJudgeNode,
  rubric: RubricNode,
  comparator: ComparatorNode,
  groundTruth: GroundTruthNode,
  evalMetrics: EvalMetricsNode,
  critique: CritiqueNode,
  thresholdGate: ThresholdGateNode,
  humanRater: HumanRaterNode,
  ragEvaluator: RAGEvaluatorNode,
  // Agent evaluation
  singleTurnEval: SingleTurnEvalNode,
  multiTurnEval: MultiTurnEvalNode,
  toolUseEval: ToolUseEvalNode,
  trajectoryEval: TrajectoryEvalNode,
  taskCompletion: TaskCompletionNode,
  agentEfficiency: AgentEfficiencyNode,
  // Characters
  character: CharacterNode,
  // Integrations (generic)
  genericDocument: GenericIntegrationNode,
  genericImage: GenericIntegrationNode,
  genericVideo: GenericIntegrationNode,
  genericCloud: GenericIntegrationNode,
  genericScript: GenericIntegrationNode,
  genericMessenger: GenericIntegrationNode,
  genericEmail: GenericIntegrationNode,
  genericDatabase: GenericIntegrationNode,
  genericStorage: GenericIntegrationNode,
  genericWeb: GenericIntegrationNode,
  genericWebPage: GenericIntegrationNode,
  genericCalendar: GenericIntegrationNode,
  genericAutomation: GenericIntegrationNode,
  genericScheduler: GenericIntegrationNode,
  genericNotifications: GenericIntegrationNode,
  genericCrm: GenericIntegrationNode,
  genericSupport: GenericIntegrationNode,
  genericPayments: GenericIntegrationNode,
  genericVoice: GenericIntegrationNode,
  genericCode: GenericIntegrationNode,
  genericAnalytics: GenericIntegrationNode,
}

export {
  LLMNode, AgentNode, PromptNode, PromptTemplateNode, MemoryNode,
  DataLoaderNode, ChunkerNode, EmbeddingNode, VectorDBNode,
  RetrieverNode, RerankerNode, CacheNode,
  RouterNode, AggregatorNode, ClassifierNode,
  ToolCallNode, WebSearchNode,
  OutputParserNode, EvaluatorNode, GuardrailsNode,
}
