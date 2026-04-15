import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type EdgeTypes,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyStart,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  Send,
  Trophy,
} from "lucide-react";
import {
  workflowBuildChat,
  type WorkflowBuildMessage,
  type WorkflowProvider,
} from "../lib/api/workflowBuild";
import { runParallelJudge, type JudgeDecision } from "../lib/api/parallelJudge";
import { saveFlow } from "../lib/flowSerializer";
import type { WorkflowPatch } from "../lib/workflowPatch";
import { buildDefaultConfig, getNodeDefinition } from "../lib/nodeDefinitions";
import { applyAutoLayout } from "../lib/autoLayout";
import { nodeTypes } from "../components/nodes";
import CustomEdge from "../components/canvas/CustomEdge";
import type { BaseNodeData } from "../types/nodes";

type LocalNode = {
  id: string;
  nodeType: string;
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
};

type LaneState = {
  id: string;
  name: string;
  provider: WorkflowProvider;
  nodes: LocalNode[];
  edges: Edge[];
  turns: WorkflowBuildMessage[];
  lastReply: string;
  lastError: string | null;
  transientStatus: string | null;
};

type JudgeProviderState = {
  status: "idle" | "running" | "done" | "error";
  decision: JudgeDecision | null;
  error: string | null;
};

type SelfHealRunResult = {
  updatedLane: LaneState;
  patchesApplied: number;
  error?: string;
};

const edgeTypes: EdgeTypes = { smoothstep: CustomEdge };

const PROVIDER_OPTIONS: Array<{ value: WorkflowProvider; label: string }> = [
  { value: "openai", label: "OpenAI" },
  { value: "claude", label: "Claude" },
  { value: "gemini", label: "Gemini" },
];

const LANE_DEFAULTS: LaneState[] = [
  {
    id: "lane-openai",
    name: "Canvas A",
    provider: "openai",
    nodes: [],
    edges: [],
    turns: [],
    lastReply: "",
    lastError: null,
    transientStatus: null,
  },
  {
    id: "lane-claude",
    name: "Canvas B",
    provider: "claude",
    nodes: [],
    edges: [],
    turns: [],
    lastReply: "",
    lastError: null,
    transientStatus: null,
  },
  {
    id: "lane-gemini",
    name: "Canvas C",
    provider: "gemini",
    nodes: [],
    edges: [],
    turns: [],
    lastReply: "",
    lastError: null,
    transientStatus: null,
  },
];

const JUDGE_PROVIDERS: WorkflowProvider[] = ["openai", "claude", "gemini"];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitErrorMessage(message: string): boolean {
  return /\b429\b|rate.?limit|too many requests/i.test(message);
}

interface HeaderMenuActionProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}

function HeaderMenuAction({
  onClick,
  icon,
  label,
  description,
}: HeaderMenuActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 bg-[#0F1720] text-white/75 hover:bg-[#16212C] hover:text-white"
    >
      <div className="mt-0.5 shrink-0 text-white/45">{icon}</div>
      <div className="min-w-0">
        <div className="text-[12px] font-medium leading-tight">{label}</div>
        <div className="mt-0.5 text-[10px] leading-snug text-white/35">
          {description}
        </div>
      </div>
    </button>
  );
}

function providerHighlightClasses(provider: WorkflowProvider): string {
  switch (provider) {
    case "openai":
      return "border-emerald-400/45 bg-emerald-600/20 text-emerald-200";
    case "claude":
      return "border-amber-400/45 bg-amber-600/20 text-amber-200";
    case "gemini":
      return "border-sky-400/45 bg-sky-600/20 text-sky-200";
    default:
      return "border-white/20 bg-white/10 text-white/80";
  }
}

function nextGridPosition(index: number): { x: number; y: number } {
  const cols = 3;
  const spacingX = 320;
  const spacingY = 190;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: 48 + col * spacingX, y: 64 + row * spacingY };
}

function applyPatches(
  currentNodes: LocalNode[],
  currentEdges: Edge[],
  patches: WorkflowPatch[],
): { nodes: LocalNode[]; edges: Edge[] } {
  let nodes = [...currentNodes];
  let edges = [...currentEdges];

  for (const patch of patches) {
    switch (patch.op) {
      case "addNode": {
        if (nodes.some((n) => n.id === patch.id)) break;
        const def = getNodeDefinition(patch.nodeType);
        nodes.push({
          id: patch.id,
          nodeType: patch.nodeType,
          label: patch.label ?? def?.label ?? patch.nodeType,
          config: { ...buildDefaultConfig(patch.nodeType), ...(patch.config ?? {}) },
          position: patch.position ?? nextGridPosition(nodes.length),
        });
        break;
      }
      case "removeNode": {
        nodes = nodes.filter((n) => n.id !== patch.id);
        edges = edges.filter((e) => e.source !== patch.id && e.target !== patch.id);
        break;
      }
      case "addEdge": {
        if (edges.some((e) => e.id === patch.id)) break;
        edges.push({
          id: patch.id,
          source: patch.source,
          target: patch.target,
          sourceHandle: patch.sourceHandle,
          targetHandle: patch.targetHandle,
          type: "smoothstep",
        });
        break;
      }
      case "removeEdge": {
        edges = edges.filter((e) => e.id !== patch.id);
        break;
      }
      case "setNodeConfig": {
        nodes = nodes.map((n) =>
          n.id === patch.nodeId
            ? {
                ...n,
                config: patch.merge === false ? { ...patch.config } : { ...n.config, ...patch.config },
              }
            : n,
        );
        break;
      }
      case "setNodeLabel": {
        nodes = nodes.map((n) => (n.id === patch.nodeId ? { ...n, label: patch.label } : n));
        break;
      }
      default:
        break;
    }
  }

  return { nodes, edges };
}

export default function ParallelBuildPage() {
  const [lanes, setLanes] = useState<LaneState[]>(LANE_DEFAULTS);
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [winnerLaneId, setWinnerLaneId] = useState<string | null>(null);
  const [panelSplit, setPanelSplit] = useState<"horizontal" | "vertical">(
    "horizontal",
  );
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState("");
  const [judgeStates, setJudgeStates] = useState<
    Record<WorkflowProvider, JudgeProviderState>
  >({
    openai: { status: "idle", decision: null, error: null },
    claude: { status: "idle", decision: null, error: null },
    gemini: { status: "idle", decision: null, error: null },
  });
  const [judgesCollapsed, setJudgesCollapsed] = useState(false);
  const [autoHealCycles, setAutoHealCycles] = useState(2);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const headerRef = useRef<HTMLElement>(null);

  const canSend = prompt.trim().length > 0 && !running;
  const laneCount = lanes.length;
  const hasFixableWork = lanes.some(
    (lane) => lane.nodes.length > 0 || !!lane.lastError,
  );

  useEffect(() => {
    const saved = window.localStorage.getItem("parallel-build:panel-split");
    if (saved === "horizontal" || saved === "vertical") {
      setPanelSplit(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("parallel-build:panel-split", panelSplit);
  }, [panelSplit]);

  useEffect(() => {
    const saved = window.localStorage.getItem("parallel-build:auto-heal-cycles");
    if (!saved) return;
    const n = Number(saved);
    if (Number.isFinite(n) && n >= 1 && n <= 8) setAutoHealCycles(Math.floor(n));
  }, []);

  useEffect(() => {
    window.localStorage.setItem("parallel-build:auto-heal-cycles", String(autoHealCycles));
  }, [autoHealCycles]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!viewMenuOpen) return;
      const headerEl = headerRef.current;
      if (!headerEl) return;
      const path = event.composedPath?.() ?? [];
      if (!path.includes(headerEl)) setViewMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [viewMenuOpen]);

  const sendPrompt = async () => {
    const text = prompt.trim();
    if (!text || running) return;
    setRunning(true);
    setPrompt("");
    setLastSubmittedPrompt(text);

    const updateLane = (laneId: string, patch: Partial<LaneState>) => {
      setLanes((prev) =>
        prev.map((lane) => (lane.id === laneId ? { ...lane, ...patch } : lane)),
      );
    };

    const runLane = async (lane: LaneState) => {
      const nextTurns: WorkflowBuildMessage[] = [
        ...lane.turns,
        { role: "user", content: text },
      ];
      updateLane(lane.id, {
        turns: nextTurns,
        lastError: null,
        transientStatus: "Sending request…",
      });

      const runBuild = async () =>
        workflowBuildChat(nextTurns, {
          nodes: lane.nodes.map((n) => ({
            id: n.id,
            nodeType: n.nodeType,
            label: n.label,
            config: { ...n.config },
          })),
          edges: lane.edges.map((e) => ({
            id: e.id,
            source: e.source,
            sourceHandle: e.sourceHandle ?? null,
            target: e.target,
            targetHandle: e.targetHandle ?? null,
          })),
          flowName: lane.name,
          flowContext: null,
          provider: lane.provider,
        });

      try {
        const res = await runBuild();
        const { nodes, edges } = applyPatches(
          lane.nodes,
          lane.edges,
          res.validatedPatches ?? [],
        );
        updateLane(lane.id, {
          nodes,
          edges,
          turns: [
            ...nextTurns,
            {
              role: "assistant",
              content: res.content?.trim() || "(No assistant message.)",
            },
          ],
          lastReply: res.content?.trim() || "(No assistant message.)",
          lastError: null,
          transientStatus: null,
        });
      } catch (error) {
        const firstMessage =
          error instanceof Error ? error.message : "Unknown error";
        const shouldRetryGemini =
          lane.provider === "gemini" && isRateLimitErrorMessage(firstMessage);
        if (shouldRetryGemini) {
          for (let seconds = 5; seconds > 0; seconds--) {
            updateLane(lane.id, {
              transientStatus: `Gemini rate-limited. Auto-retrying in ${seconds}s…`,
            });
            await sleep(1000);
          }

          try {
            const retryRes = await runBuild();
            const { nodes, edges } = applyPatches(
              lane.nodes,
              lane.edges,
              retryRes.validatedPatches ?? [],
            );
            updateLane(lane.id, {
              nodes,
              edges,
              turns: [
                ...nextTurns,
                {
                  role: "assistant",
                  content: retryRes.content?.trim() || "(No assistant message.)",
                },
              ],
              lastReply: retryRes.content?.trim() || "(No assistant message.)",
              lastError: null,
              transientStatus: null,
            });
            return;
          } catch (retryError) {
            updateLane(lane.id, {
              lastError:
                retryError instanceof Error ? retryError.message : "Unknown error",
              transientStatus: null,
            });
            return;
          }
        }

        updateLane(lane.id, {
          lastError: firstMessage,
          transientStatus: null,
        });
      }
    };

    await Promise.all(
      lanes.map(async (lane) => {
        await runLane(lane);
      }),
    );
    setRunning(false);
  };

  const selfHealLane = async (
    lane: LaneState,
    options?: { cycle?: number; totalCycles?: number },
  ): Promise<SelfHealRunResult> => {
    const cycleTag =
      options && options.totalCycles && options.totalCycles > 1
        ? ` (cycle ${options.cycle}/${options.totalCycles})`
        : "";
    const instruction = lane.lastError
      ? `Self-heal this workflow. The previous build attempt failed with this error:

${lane.lastError}

Apply minimal targeted graph patches to fix the issue while preserving intent.
If the design is already correct after review, return no patches and explicitly say DONE_NO_CHANGES.`
      : `Self-critique this workflow and apply targeted improvements.
Focus on wiring correctness, missing safeguards, and robustness.
Keep changes minimal and high-impact.
Do not add components unless strictly needed.
If this workflow is already solid and no meaningful change is needed, return no patches and explicitly say DONE_NO_CHANGES.`;

    const nextTurns: WorkflowBuildMessage[] = [
      ...lane.turns,
      { role: "user", content: instruction },
    ];

    setLanes((prev) =>
      prev.map((x) =>
        x.id === lane.id
          ? {
              ...x,
              turns: nextTurns,
              transientStatus: lane.lastError
                ? `Fixing from error with same provider…${cycleTag}`
                : `Running self-critique and fixes…${cycleTag}`,
              lastError: null,
            }
          : x,
      ),
    );

    try {
      const res = await workflowBuildChat(nextTurns, {
        nodes: lane.nodes.map((n) => ({
          id: n.id,
          nodeType: n.nodeType,
          label: n.label,
          config: { ...n.config },
        })),
        edges: lane.edges.map((e) => ({
          id: e.id,
          source: e.source,
          sourceHandle: e.sourceHandle ?? null,
          target: e.target,
          targetHandle: e.targetHandle ?? null,
        })),
        flowName: lane.name,
        flowContext: null,
        provider: lane.provider,
      });

      const { nodes, edges } = applyPatches(
        lane.nodes,
        lane.edges,
        res.validatedPatches ?? [],
      );
      const patchesApplied = res.validatedPatches?.length ?? 0;
      const updatedLane: LaneState = {
        ...lane,
        nodes,
        edges,
        turns: [
          ...nextTurns,
          {
            role: "assistant",
            content: res.content?.trim() || "(No assistant message.)",
          },
        ],
        lastReply: res.content?.trim() || "(No assistant message.)",
        lastError: null,
        transientStatus: null,
      };

      setLanes((prev) =>
        prev.map((x) =>
          x.id === lane.id
            ? updatedLane
            : x,
        ),
      );
      return { updatedLane, patchesApplied };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Self-heal failed";
      const updatedLane: LaneState = {
        ...lane,
        lastError: msg,
        transientStatus: null,
      };
      setLanes((prev) =>
        prev.map((x) =>
          x.id === lane.id
            ? updatedLane
            : x,
        ),
      );
      return { updatedLane, patchesApplied: 0, error: msg };
    }
  };

  const selfHealLaneLoop = async (lane: LaneState, cycles: number) => {
    let currentLane = lane;
    for (let cycle = 1; cycle <= cycles; cycle++) {
      const run = await selfHealLane(currentLane, {
        cycle,
        totalCycles: cycles,
      });
      currentLane = run.updatedLane;
      if (run.error) break;
      if (run.patchesApplied === 0) {
        setLanes((prev) =>
          prev.map((x) =>
            x.id === currentLane.id
              ? {
                  ...x,
                  transientStatus: `Loop stopped at cycle ${cycle}: no meaningful changes needed.`,
                }
              : x,
          ),
        );
        window.setTimeout(() => {
          setLanes((prev) =>
            prev.map((x) =>
              x.id === currentLane.id ? { ...x, transientStatus: null } : x,
            ),
          );
        }, 2200);
        break;
      }
    }
  };

  const selfHealAllLanes = async () => {
    if (running) return;
    setRunning(true);
    try {
      await Promise.all(
        lanes.map(async (lane) => selfHealLaneLoop(lane, Math.max(1, autoHealCycles))),
      );
    } finally {
      setRunning(false);
    }
  };

  const sendLaneToMainCanvas = (lane: LaneState) => {
    const flowNodes: Node<BaseNodeData>[] = lane.nodes.map((n) => ({
      id: n.id,
      type: n.nodeType,
      position: n.position,
      data: {
        nodeType: n.nodeType,
        label: n.label,
        config: n.config as Record<string, string | number | boolean>,
      },
    }));
    const contextDescription = lastSubmittedPrompt.trim();
    const contextHowItWorks = lane.lastReply.trim();
    const flowContext =
      contextDescription || contextHowItWorks
        ? {
            description: contextDescription || "Imported from Parallel Build Lab",
            howItWorks: contextHowItWorks,
            documents: [],
          }
        : undefined;

    saveFlow(
      flowNodes,
      lane.edges,
      { x: 0, y: 0, zoom: 1 },
      `${lane.name} winner`,
      flowContext,
      "LR",
    );
    window.location.assign("/");
  };

  const runJudges = async () => {
    const judgePrompt = lastSubmittedPrompt.trim();
    if (!judgePrompt) return;

    const candidates = lanes.map((lane, index) => ({
      id: `design-${index + 1}`,
      label: `Design ${String.fromCharCode(65 + index)}`,
      nodes: lane.nodes.map((n) => ({
        id: n.id,
        nodeType: n.nodeType,
        label: n.label,
        config: { ...n.config },
      })),
      edges: lane.edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle ?? null,
        target: e.target,
        targetHandle: e.targetHandle ?? null,
      })),
      assistantSummary: lane.lastReply || undefined,
    }));

    setJudgeStates({
      openai: { status: "running", decision: null, error: null },
      claude: { status: "running", decision: null, error: null },
      gemini: { status: "running", decision: null, error: null },
    });

    await Promise.all(
      JUDGE_PROVIDERS.map(async (provider) => {
        try {
          const result = await runParallelJudge(provider, judgePrompt, candidates);
          setJudgeStates((prev) => ({
            ...prev,
            [provider]: { status: "done", decision: result.decision, error: null },
          }));
        } catch (error) {
          setJudgeStates((prev) => ({
            ...prev,
            [provider]: {
              status: "error",
              decision: null,
              error: error instanceof Error ? error.message : "Judge failed",
            },
          }));
        }
      }),
    );
  };

  const useLaneAsBaseline = (sourceLaneId: string) => {
    const sourceLane = lanes.find((lane) => lane.id === sourceLaneId);
    if (!sourceLane) return;
    setWinnerLaneId(sourceLaneId);
    setLanes((prev) =>
      prev.map((lane) => ({
        ...lane,
        nodes: sourceLane.nodes.map((n) => ({
          ...n,
          position: { ...n.position },
          config: { ...n.config },
        })),
        edges: sourceLane.edges.map((e) => ({ ...e })),
      })),
    );
  };

  const resetLane = (laneId: string) => {
    setLanes((prev) =>
      prev.map((lane) =>
        lane.id === laneId
          ? {
              ...lane,
              nodes: [],
              edges: [],
              turns: [],
              lastReply: "",
              lastError: null,
              transientStatus: null,
            }
          : lane,
      ),
    );
    if (winnerLaneId === laneId) {
      setWinnerLaneId(null);
    }
  };

  const relayoutAllLanes = (direction: "LR" | "TB") => {
    setLanes((prev) =>
      prev.map((lane) => {
        if (lane.nodes.length === 0) return lane;
        const flowNodes: Node<BaseNodeData>[] = lane.nodes.map((n) => ({
          id: n.id,
          type: n.nodeType,
          position: n.position,
          data: {
            nodeType: n.nodeType,
            label: n.label,
            config: n.config as Record<string, string | number | boolean>,
          },
        }));
        const laidOut = applyAutoLayout(flowNodes, lane.edges, direction);
        const nextById = new Map(laidOut.map((n) => [n.id, n]));
        return {
          ...lane,
          nodes: lane.nodes.map((n) => ({
            ...n,
            position: nextById.get(n.id)?.position ?? n.position,
          })),
        };
      }),
    );
  };

  const laneColsClass = useMemo(() => {
    if (panelSplit === "vertical") return "grid-cols-1";
    if (laneCount <= 1) return "grid-cols-1";
    if (laneCount === 2) return "grid-cols-2";
    return "grid-cols-3";
  }, [laneCount, panelSplit]);

  const designNameById = useMemo(() => {
    const map = new Map<string, string>();
    lanes.forEach((_, index) => {
      map.set(`design-${index + 1}`, `Design ${String.fromCharCode(65 + index)}`);
    });
    return map;
  }, [lanes]);

  const combinedResult = useMemo(() => {
    const completed = Object.values(judgeStates)
      .map((state) => state.decision)
      .filter((d): d is JudgeDecision => !!d);
    if (completed.length === 0) return null;

    const voteCount = new Map<string, number>();
    const scoreTotals = new Map<string, { total: number; count: number }>();
    for (const decision of completed) {
      voteCount.set(decision.winnerId, (voteCount.get(decision.winnerId) ?? 0) + 1);
      for (const score of decision.scores) {
        const current = scoreTotals.get(score.designId) ?? { total: 0, count: 0 };
        scoreTotals.set(score.designId, {
          total: current.total + score.score,
          count: current.count + 1,
        });
      }
    }

    const allIds = Array.from(designNameById.keys());
    const winnerId = allIds.sort((a, b) => {
      const voteDiff = (voteCount.get(b) ?? 0) - (voteCount.get(a) ?? 0);
      if (voteDiff !== 0) return voteDiff;
      const avgA = scoreTotals.get(a);
      const avgB = scoreTotals.get(b);
      const aVal = avgA ? avgA.total / avgA.count : 0;
      const bVal = avgB ? avgB.total / avgB.count : 0;
      return bVal - aVal;
    })[0];

    const averages = allIds.map((id) => {
      const score = scoreTotals.get(id);
      const avg = score ? score.total / score.count : 0;
      return {
        id,
        label: designNameById.get(id) ?? id,
        votes: voteCount.get(id) ?? 0,
        averageScore: Math.round(avg),
      };
    });

    return {
      winnerId,
      winnerLabel: designNameById.get(winnerId) ?? winnerId,
      judgeCount: completed.length,
      averages,
    };
  }, [judgeStates, designNameById]);

  return (
    <div className="h-screen w-screen bg-[#0F1117] text-white flex flex-col overflow-hidden">
      <header
        ref={headerRef}
        className="h-12 shrink-0 border-b border-white/10 px-4 flex items-center justify-between"
      >
        <div className="text-[12px] tracking-wide text-white/80">
          Parallel Build Lab
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-white/45">
            3 canvases in parallel · select best · iterate
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setViewMenuOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium border transition-all duration-150 select-none ${
                viewMenuOpen
                  ? "bg-white/10 border-white/15 text-white"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
              title="Layout and view options"
            >
              View
              <ChevronDown
                size={13}
                className="transition-transform duration-150"
                style={{ transform: viewMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
            {viewMenuOpen && (
              <div
                className="absolute top-[calc(100%+8px)] right-0 z-30 min-w-52 rounded-xl overflow-hidden"
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#0B1117",
                  boxShadow: "0 18px 42px rgba(0,0,0,0.52)",
                }}
              >
                <div className="p-1.5 space-y-1 bg-[#0B1117]">
                  <HeaderMenuAction
                    onClick={() => {
                      relayoutAllLanes("LR");
                      setViewMenuOpen(false);
                    }}
                    icon={<AlignHorizontalJustifyStart size={14} />}
                    label="Horizontal layout"
                    description="Auto-arrange nodes left-to-right"
                  />
                  <HeaderMenuAction
                    onClick={() => {
                      relayoutAllLanes("TB");
                      setViewMenuOpen(false);
                    }}
                    icon={<AlignVerticalJustifyStart size={14} />}
                    label="Vertical layout"
                    description="Auto-arrange nodes top-to-bottom"
                  />
                  <div className="my-1 border-t border-white/10" role="separator" />
                  <HeaderMenuAction
                    onClick={() => {
                      setPanelSplit("horizontal");
                      setViewMenuOpen(false);
                    }}
                    icon={<AlignHorizontalJustifyStart size={14} />}
                    label="Horizontal split"
                    description="Place canvases side-by-side"
                  />
                  <HeaderMenuAction
                    onClick={() => {
                      setPanelSplit("vertical");
                      setViewMenuOpen(false);
                    }}
                    icon={<AlignVerticalJustifyStart size={14} />}
                    label="Vertical split"
                    description="Stack canvases top-to-bottom"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className={`grid ${laneColsClass} gap-2 p-2 flex-1 min-h-0`}>
        {lanes.map((lane, laneIndex) => {
          const laneDesignId = `design-${laneIndex + 1}`;
          const isJudgeWinner = combinedResult?.winnerId === laneDesignId;
          return (
          <section
            key={lane.id}
            className="min-h-0 rounded-xl border border-white/10 bg-black/20 flex flex-col overflow-hidden"
          >
            <div className="relative px-3 py-2 border-b border-white/10 flex items-center gap-2">
              <div className="text-[12px] font-medium text-white/90">{lane.name}</div>
              <span
                className={`absolute left-1/2 -translate-x-1/2 inline-flex items-center rounded-lg border px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-[0_0_0_1px_rgba(255,255,255,0.04)] ${providerHighlightClasses(
                  lane.provider,
                )}`}
              >
                {lane.provider}
              </span>
              {winnerLaneId === lane.id && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-amber-400/40 text-amber-200 bg-amber-500/10">
                  <Trophy size={10} />
                  selected baseline
                </span>
              )}
              {isJudgeWinner && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-yellow-400/45 text-yellow-200 bg-yellow-500/10">
                  <Trophy size={10} />
                  judge winner
                </span>
              )}
              <div className="ml-auto">
                <select
                  value={lane.provider}
                  onChange={(e) => {
                    const provider = e.target.value as WorkflowProvider;
                    setLanes((prev) =>
                      prev.map((x) => (x.id === lane.id ? { ...x, provider } : x)),
                    );
                  }}
                  className="bg-black/40 border border-white/15 rounded px-2 py-1 text-[11px]"
                  disabled={running}
                >
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {(() => {
                const flowNodes: Node<BaseNodeData>[] = lane.nodes.map((n) => ({
                  id: n.id,
                  type: n.nodeType,
                  position: n.position,
                  data: {
                    nodeType: n.nodeType,
                    label: n.label,
                    config: n.config as Record<string, string | number | boolean>,
                  },
                }));
                return (
              <ReactFlow
                nodes={flowNodes}
                edges={lane.edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={20} color="#ffffff14" />
                <Controls
                  showInteractive={false}
                  className="!bg-gray-900/80 !border-white/10 !shadow-xl [&_button]:!bg-transparent [&_button]:!border-white/10 [&_button]:!text-zinc-300 [&_button:hover]:!bg-white/10 [&_button:hover]:!text-white [&_button:disabled]:!text-zinc-600 [&_button:disabled]:!opacity-70"
                />
              </ReactFlow>
                );
              })()}
            </div>

            <div className="px-3 py-2 border-t border-white/10 space-y-2">
              {lane.transientStatus && (
                <p className="text-[11px] text-amber-200/90 bg-amber-950/30 border border-amber-500/35 rounded px-2 py-1">
                  {lane.transientStatus}
                </p>
              )}
              {lane.lastError && (
                <p className="text-[11px] text-rose-300/90 bg-rose-900/20 border border-rose-500/30 rounded px-2 py-1">
                  {lane.lastError}
                </p>
              )}
              {lane.lastReply && (
                <div className="space-y-1">
                  <p
                    className={`text-[11px] text-white/75 ${
                      expandedReplies[lane.id] ? "" : "line-clamp-3"
                    }`}
                  >
                    {lane.lastReply}
                  </p>
                  {lane.lastReply.length > 220 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedReplies((prev) => ({
                          ...prev,
                          [lane.id]: !prev[lane.id],
                        }))
                      }
                      className="text-[10px] px-2 py-1 rounded border border-white/15 text-white/70 hover:bg-white/10"
                    >
                      {expandedReplies[lane.id] ? "View less" : "View more"}
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => useLaneAsBaseline(lane.id)}
                  className="text-[11px] px-2 py-1 rounded border border-emerald-400/40 text-emerald-200 hover:bg-emerald-600/20"
                  disabled={running || lane.nodes.length === 0}
                >
                  Apply as baseline
                </button>
                <button
                  type="button"
                  onClick={() => sendLaneToMainCanvas(lane)}
                  className="text-[11px] px-2 py-1 rounded border border-sky-400/35 text-sky-200 hover:bg-sky-600/20"
                  disabled={lane.nodes.length === 0}
                >
                  Send to main canvas
                </button>
                <button
                  type="button"
                  onClick={() => void selfHealLane(lane)}
                  className="text-[11px] px-2 py-1 rounded border border-amber-400/35 text-amber-200 hover:bg-amber-600/20"
                  disabled={running}
                >
                  Fix
                </button>
                <button
                  type="button"
                  onClick={() => resetLane(lane.id)}
                  className="text-[11px] px-2 py-1 rounded border border-white/15 text-white/70 hover:bg-white/10 inline-flex items-center gap-1"
                  disabled={running}
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              </div>
            </div>
          </section>
          );
        })}
      </main>

      <section className="shrink-0 border-t border-white/10 bg-black/35 px-3 py-2">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-[11px] text-white/60">
              Blind judge review (OpenAI / Claude / Gemini) - judges do not see builder providers.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setJudgesCollapsed((v) => !v)}
                className="px-2.5 py-1.5 rounded-md border border-white/20 bg-white/5 hover:bg-white/10 text-[11px] text-white inline-flex items-center gap-1.5"
              >
                {judgesCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                {judgesCollapsed ? "Expand judges" : "Minimize judges"}
              </button>
              <label className="inline-flex items-center gap-1.5 text-[10px] text-white/65 rounded-md border border-white/15 bg-white/5 px-2 py-1.5">
                Loop
                <select
                  value={autoHealCycles}
                  onChange={(e) => setAutoHealCycles(Number(e.target.value))}
                  className="bg-black/40 border border-white/20 rounded px-1.5 py-0.5 text-[10px] text-white"
                  disabled={running}
                  title="Max self-review/fix cycles for Fix all lanes"
                >
                  {[1, 2, 3, 4, 5, 8].map((n) => (
                    <option key={n} value={n}>
                      {n}x
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void selfHealAllLanes()}
                disabled={running || !hasFixableWork}
                title={
                  hasFixableWork
                    ? "Run self-review/fix loop on all lanes"
                    : "Build or load a lane first"
                }
                className="px-3 py-1.5 rounded-md border border-amber-500/40 bg-amber-700/60 hover:bg-amber-600/80 disabled:opacity-40 text-[11px] text-white"
              >
                Fix all lanes (loop)
              </button>
              <button
                type="button"
                onClick={() => void runJudges()}
                disabled={
                  !lastSubmittedPrompt.trim() ||
                  Object.values(judgeStates).some((s) => s.status === "running")
                }
                className="px-3 py-1.5 rounded-md border border-sky-500/40 bg-sky-700/70 hover:bg-sky-600/85 disabled:opacity-40 text-[11px] text-white"
              >
                Run 3 judges
              </button>
            </div>
          </div>

          {!judgesCollapsed && (
            <div className="grid grid-cols-3 gap-2">
              {JUDGE_PROVIDERS.map((provider) => {
                const state = judgeStates[provider];
                return (
                  <div
                    key={provider}
                    className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 space-y-1.5 min-h-[120px]"
                  >
                    <div className="flex items-center justify-between">
                      <p
                        className={`inline-flex items-center rounded-lg border px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-[0_0_0_1px_rgba(255,255,255,0.04)] ${providerHighlightClasses(
                          provider,
                        )}`}
                      >
                        {provider} judge
                      </p>
                      {state.status === "running" && (
                        <Loader2 size={12} className="animate-spin text-sky-300" />
                      )}
                    </div>
                    {state.status === "idle" && (
                      <p className="text-[11px] text-white/45">
                        No decision yet. Run judges after generating designs.
                      </p>
                    )}
                    {state.status === "error" && (
                      <p className="text-[11px] text-rose-300/90">{state.error}</p>
                    )}
                    {state.status === "done" && state.decision && (
                      <>
                        <p className="text-[11px] text-emerald-200">
                          Winner:{" "}
                          <span className="font-medium">
                            {designNameById.get(state.decision.winnerId) ?? state.decision.winnerId}
                          </span>
                        </p>
                        <p className="text-[11px] text-white/70 line-clamp-3">
                          {state.decision.overallReasoning}
                        </p>
                        <div className="space-y-1">
                          {state.decision.scores.map((score) => (
                            <p key={score.designId} className="text-[10px] text-white/55">
                              {designNameById.get(score.designId) ?? score.designId}: {score.score}
                              /100 - {score.reasoning}
                            </p>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {combinedResult && (
            <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-900/15 px-3 py-2">
              <p className="text-[11px] text-emerald-200">
                Combined winner:{" "}
                <span className="font-semibold">{combinedResult.winnerLabel}</span> (
                {combinedResult.judgeCount} judges)
              </p>
              <div className="mt-1 flex flex-wrap gap-3">
                {combinedResult.averages.map((item) => (
                  <p key={item.id} className="text-[10px] text-emerald-100/85">
                    {item.label}: {item.votes} vote(s), avg {item.averageScore}/100
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="shrink-0 border-t border-white/10 bg-black/50 p-3">
        <div className="max-w-[1800px] mx-auto">
          <div className="rounded-xl border border-white/15 bg-black/35 px-3 py-2">
            <div className="text-[11px] text-white/50 mb-2">
              Prompt terminal — sends to all canvases in parallel
            </div>
            <div className="flex items-end gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the flow to build or how to improve the current baseline..."
                rows={3}
                className="flex-1 rounded-md border border-white/15 bg-black/30 px-3 py-2 text-[12px] text-white placeholder:text-white/35 resize-none focus:outline-none focus:ring-1 focus:ring-violet-400/60"
                disabled={running}
              />
              <button
                type="button"
                onClick={() => void sendPrompt()}
                disabled={!canSend}
                className="h-10 px-4 rounded-md border border-violet-500/40 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-[12px] inline-flex items-center gap-2"
              >
                {running ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {running ? "Running…" : "Run parallel"}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
