import {
  ArrowUpDown,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  Bot,
  Braces,
  BrainCircuit,
  CheckCheck,
  ClipboardList,
  Combine,
  Database,
  DatabaseBackup,
  DatabaseZap,
  FileCode2,
  Filter,
  Gauge,
  GitCompareArrows,
  Globe,
  Gavel,
  History,
  MessageSquareReply,
  MessageSquareText,
  MessageSquareWarning,
  MessagesSquare,
  Route,
  Scale,
  ScanSearch,
  ScissorsLineDashed,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCheck,
  Waypoints,
  Workflow,
  Wrench,
} from 'lucide-react'

export interface IconProps {
  size?: number
  className?: string
}

type LucideIconComponent = typeof Bot

const createIcon = (Icon: LucideIconComponent) => {
  return function DiagramIcon({ size = 24, className }: IconProps) {
    return (
      <Icon
        size={size}
        className={className}
        strokeWidth={1.85}
        aria-hidden="true"
        focusable="false"
      />
    )
  }
}

export const LLMIcon = createIcon(BrainCircuit)
export const AgentIcon = createIcon(Bot)
export const PromptIcon = createIcon(MessageSquareText)
export const PromptTemplateIcon = createIcon(FileCode2)

export const DataLoaderIcon = createIcon(DatabaseBackup)
export const ChunkerIcon = createIcon(ScissorsLineDashed)
export const EmbeddingIcon = createIcon(Waypoints)
export const VectorDBIcon = createIcon(Database)
export const RetrieverIcon = createIcon(Search)
export const RerankerIcon = createIcon(ArrowUpDown)
export const CacheIcon = createIcon(DatabaseZap)

export const RouterIcon = createIcon(Route)
export const AggregatorIcon = createIcon(Combine)
export const ClassifierIcon = createIcon(Filter)

export const ToolCallIcon = createIcon(Wrench)
export const WebSearchIcon = createIcon(Globe)

export const OutputParserIcon = createIcon(Braces)
export const EvaluatorIcon = createIcon(Scale)
export const GuardrailsIcon = createIcon(ShieldCheck)
export const MemoryIcon = createIcon(History)

export const LLMJudgeIcon = createIcon(Gavel)
export const RubricIcon = createIcon(ClipboardList)
export const ComparatorIcon = createIcon(GitCompareArrows)
export const GroundTruthIcon = createIcon(BadgeCheck)
export const EvalMetricsIcon = createIcon(BarChart3)
export const CritiqueIcon = createIcon(MessageSquareWarning)
export const ThresholdGateIcon = createIcon(SlidersHorizontal)
export const HumanRaterIcon = createIcon(UserRoundCheck)
export const RAGEvalIcon = createIcon(BookOpenCheck)
export const SingleTurnEvalIcon = createIcon(MessageSquareReply)
export const MultiTurnEvalIcon = createIcon(MessagesSquare)
export const ToolUseEvalIcon = createIcon(ScanSearch)
export const TrajectoryEvalIcon = createIcon(Workflow)
export const TaskCompletionIcon = createIcon(CheckCheck)
export const AgentEfficiencyIcon = createIcon(Gauge)
