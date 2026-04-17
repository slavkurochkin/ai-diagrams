import {
  AppWindow,
  ArrowUpDown,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpenCheck,
  Bot,
  Braces,
  BrainCircuit,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  Cloud,
  Combine,
  CreditCard,
  Database,
  DatabaseBackup,
  DatabaseZap,
  FileCode2,
  FileText,
  Filter,
  Gauge,
  GitBranch,
  GitCompareArrows,
  Globe,
  Gavel,
  HardDrive,
  Headset,
  History,
  Image,
  LineChart,
  Mail,
  MessageSquareReply,
  MessageSquareText,
  MessageSquareWarning,
  MessagesSquare,
  Phone,
  Route,
  Scale,
  ScanSearch,
  ScissorsLineDashed,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Terminal,
  UserRoundCheck,
  Users,
  Video,
  Waypoints,
  Webhook,
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
export const FrameIcon = createIcon(Square)
export const TextIcon = createIcon(MessageSquareText)
export const CharacterIcon = createIcon(Users)

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

// ── Generic integration primitives (vendor-neutral) ───────────────────────────

export const GenericDocumentIcon = createIcon(FileText)
export const GenericImageIcon = createIcon(Image)
export const GenericVideoIcon = createIcon(Video)
export const GenericMessengerIcon = createIcon(MessagesSquare)
export const GenericEmailIcon = createIcon(Mail)
export const GenericDatabaseIcon = createIcon(Database)
export const GenericStorageIcon = createIcon(HardDrive)
export const GenericWebIcon = createIcon(Globe)
export const GenericWebPageIcon = createIcon(AppWindow)
export const GenericCloudIcon = createIcon(Cloud)
export const GenericScriptIcon = createIcon(Terminal)
export const GenericSchedulerIcon = createIcon(CalendarClock)
export const GenericNotificationsIcon = createIcon(Bell)
export const GenericCalendarIcon = createIcon(CalendarDays)
export const GenericAutomationIcon = createIcon(Webhook)
export const GenericCrmIcon = createIcon(Building2)
export const GenericSupportIcon = createIcon(Headset)
export const GenericPaymentsIcon = createIcon(CreditCard)
export const GenericVoiceIcon = createIcon(Phone)
export const GenericCodeIcon = createIcon(GitBranch)
export const GenericAnalyticsIcon = createIcon(LineChart)
