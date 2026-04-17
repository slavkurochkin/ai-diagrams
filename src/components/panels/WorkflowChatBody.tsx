import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useReactFlow } from "reactflow";
import {
  Loader2,
  Send,
  Wand2,
  AlertTriangle,
  X,
  CheckSquare,
  FileText,
  Info,
  RotateCw,
  Square,
  Link2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ReviewExitShimmerOverlay } from "../ReviewExitShimmerOverlay";
import { useFlowStore } from "../../hooks/useFlowStore";
import { applyWorkflowPatchesToFlow } from "../../lib/applyWorkflowPatches";
import { applyAutoLayout } from "../../lib/autoLayout";
import type { Node as FlowNode } from "reactflow";
import type { BaseNodeData } from "../../types/nodes";
import {
  serializeFlowForWorkflowApi,
  workflowBuildChat,
  type WorkflowBuildMessage,
} from "../../lib/api/workflowBuild";
import { generateDesignReview } from "../../lib/api/designReview";
import {
  reviewApplyRowMotion,
  reviewDecisionCardMotion,
  reviewDecisionPanelMotion,
} from "../../lib/reviewDecisionMotion";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  validationErrors?: string[];
  appliedPatches?: number;
  kind?: "builder" | "reviewer" | "system";
}

export type DecisionStatus = "pending" | "accepted" | "declined";

export interface ReviewDecision {
  id: string;
  text: string;
  status: DecisionStatus;
  note: string;
  selected: boolean;
}

const DECISION_SECTION_START = "<!-- review-decisions:start -->";
const DECISION_SECTION_END = "<!-- review-decisions:end -->";

const AUTO_REVIEW_IMPROVE_CYCLES_KEY = "agentflow:autoReviewImproveCycles";
/** Brief pause so the UI can show new suggestions as pending, then all-accepted, before improve runs. */
const AUTO_ACCEPT_UI_MS = 140;
/** Pause after auto-improve so exit animations can play before the list clears or the next review loads. */
const DECISION_CLEAR_AFTER_APPLY_MS = 520;

function buildImproveInstructionContent(
  selected: ReviewDecision[],
  declined: ReviewDecision[],
): string {
  return (
    "Apply ONLY these approved review suggestions as targeted graph edits.\n" +
    selected
      .map(
        (s, i) =>
          `${i + 1}. ${s.text}${s.note.trim() ? `\n   rationale: ${s.note.trim()}` : ""}`,
      )
      .join("\n") +
    (declined.length
      ? "\n\nDo NOT apply these declined suggestions unless user explicitly changes decision:\n" +
        declined
          .map(
            (s, i) =>
              `${i + 1}. ${s.text}${s.note.trim() ? `\n   reason declined: ${s.note.trim()}` : ""}`,
          )
          .join("\n")
      : "")
  );
}

const REVIEWER_TURN_PREFIX = "Reviewer\n\n";

function rawMarkdownFromReviewerTurn(turn: ChatTurn): string | null {
  if (turn.role !== "assistant" || turn.kind !== "reviewer") return null;
  if (!turn.content.startsWith(REVIEWER_TURN_PREFIX))
    return turn.content.trim() || null;
  return turn.content.slice(REVIEWER_TURN_PREFIX.length).trim();
}

/** User message for one-click “wire from descriptions” — aligned with workflowBuild system prompt. */
const BUILD_FLOW_FROM_NODES_CONTEXT_MESSAGE = `Wire and complete the agent (or pipeline) using the nodes already on the canvas.

Use the context on those nodes (each node's description, label, and type) as the main guide for what each step does and how data should flow. Follow the Flow Context if it is set.

Prefer addEdge with the exact existing node ids. Only addNode when a catalog node type is clearly missing for a coherent pipeline. Remove or replace edges if needed so the graph has one entry point and valid connectivity (including tool loops where applicable).`;

const ARCHITECT_REFINE_TEMPLATE = `You are refactoring the CURRENT graph, not rebuilding from scratch.

Goal:
Design a production-ready AI agent workflow with:
1) A lean online/runtime path
2) Clear control logic (routing, gating, fallbacks)
3) Evaluation/QA separated from core runtime where possible

Context:
- This workflow may be RAG, tool-using, automation, classifier/router, multi-agent, or hybrid.
- Adapt recommendations to the existing graph type instead of forcing a RAG pattern.

Constraints:
- Preserve existing good components and configs unless they conflict with goals.
- Prefer targeted edits (addEdge/removeEdge/setNodeConfig/removeNode/addNode only when needed).
- Keep node count minimal and avoid redundant branches.
- Make decision logic deterministic and explainable.
- Do not merge uncertain/untrusted paths blindly without a gate.

Required architecture outcomes:

A) Runtime path clarity:
- Identify and enforce one primary runtime path from input to final output.
- Keep runtime latency-sensitive; move heavy/optional checks out when possible.

B) Explicit routing + fallback behavior:
- Add/clarify router/classifier conditions and branch intent.
- Define when fallback paths are triggered vs skipped.
- Ensure each fallback path has a clear return path or terminal behavior.

C) Evaluation strategy:
- If eval nodes exist, separate runtime-critical flow from evaluation/analysis flow when possible.
- Keep essential runtime guardrails, but avoid unnecessary runtime eval latency.

D) Failure handling:
- Add explicit handling for key failure modes relevant to this graph type
  (e.g. empty inputs/results, tool failure, low confidence, policy violation, parser failure).
- Define outcome per failure path (retry, fallback, block, human handoff, or safe response).

E) Observability hooks:
- Ensure flow exposes where to capture key metrics/signals for this architecture
  (quality, latency, cost, failure rate, and branch usage).

Output format:
1) Brief architecture summary (5-8 bullets max)
2) Exact patch operations to apply
3) Final checklist:
   - runtime path clear and lean
   - routing/fallback logic explicit
   - eval strategy appropriate
   - failure modes covered
   - observability points identified`;

export interface WorkflowChatBodyProps {
  /** When true, omit top header (parent panel supplies title). */
  embedded?: boolean;
  /** Standalone aside: show header row with close. */
  showHeader?: boolean;
  onClose?: () => void;
  /** For parent header spinner (e.g. Explain panel). */
  onBusyChange?: (busy: boolean) => void;
  /** Open Flow Context modal with mapped draft from reviewer text. */
  onUseReviewInContext?: (draft: {
    description: string;
    howItWorks: string;
  }) => void;
  /** Optional externally-controlled decisions state (for workspace left panel). */
  externalDecisions?: ReviewDecision[];
  onDecisionsChange?: (next: ReviewDecision[]) => void;
  /** Hide inline decisions UI when rendered elsewhere. */
  showDecisions?: boolean;
  /** Optional bridge for parent-controlled Improve action. */
  onRegisterImproveAction?: (action: (() => void) | null) => void;
}

export default function WorkflowChatBody({
  embedded = false,
  showHeader = true,
  onClose,
  onBusyChange,
  onUseReviewInContext,
  externalDecisions,
  onDecisionsChange,
  showDecisions = true,
  onRegisterImproveAction,
}: WorkflowChatBodyProps) {
  const theme = useFlowStore((s) => s.theme);
  const flowName = useFlowStore((s) => s.flowName);
  const flowContext = useFlowStore((s) => s.flowContext);
  const setFlowContext = useFlowStore((s) => s.setFlowContext);
  const canvasNodeCount = useFlowStore((s) => s.nodes.length);
  const { fitView } = useReactFlow();

  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [improving, setImproving] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoReviewImproveCycles, setAutoReviewImproveCycles] = useState(0);
  const autoRunCancelledRef = useRef(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [localDecisions, setLocalDecisions] = useState<ReviewDecision[]>([]);
  const [designDoc, setDesignDoc] = useState("");
  const [showContextProposal, setShowContextProposal] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isDark = theme === "dark";
  const decisions = externalDecisions ?? localDecisions;
  const setDecisions = useCallback(
    (updater: (prev: ReviewDecision[]) => ReviewDecision[]) => {
      if (onDecisionsChange)
        onDecisionsChange(updater(externalDecisions ?? []));
      else setLocalDecisions((prev) => updater(prev));
    },
    [onDecisionsChange, externalDecisions],
  );

  useEffect(() => {
    onBusyChange?.(loading || reviewing || improving || autoRunning);
  }, [loading, reviewing, improving, autoRunning, onBusyChange]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTO_REVIEW_IMPROVE_CYCLES_KEY);
      if (raw == null) return;
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0 && n <= 10)
        setAutoReviewImproveCycles(Math.floor(n));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        AUTO_REVIEW_IMPROVE_CYCLES_KEY,
        String(autoReviewImproveCycles),
      );
    } catch {
      /* ignore */
    }
  }, [autoReviewImproveCycles]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, loading, autoRunning]);

  const docStorageKey = `agentflow:build-doc:${flowName || "untitled"}`;
  useEffect(() => {
    const stored = localStorage.getItem(docStorageKey);
    setDesignDoc(stored ?? "");
  }, [docStorageKey]);

  useEffect(() => {
    localStorage.setItem(docStorageKey, designDoc);
  }, [docStorageKey, designDoc]);

  const appendToDesignDoc = useCallback((title: string, body: string) => {
    const text = body.trim();
    if (!text) return;
    const stamp = new Date().toISOString().replace("T", " ").slice(0, 16);
    setDesignDoc((prev) => {
      const section = `\n## ${title} (${stamp})\n${text}\n`;
      return prev.trim() ? `${prev.trim()}\n${section}` : section.trimStart();
    });
  }, []);

  const buildDecisionSection = useCallback((items: ReviewDecision[]) => {
    if (items.length === 0) return "";
    const accepted = items.filter((d) => d.status === "accepted");
    const declined = items.filter((d) => d.status === "declined");
    const pending = items.filter((d) => d.status === "pending");
    const lines: string[] = [DECISION_SECTION_START, "## Review decisions", ""];
    const pushGroup = (title: string, list: ReviewDecision[]) => {
      lines.push(`### ${title}`);
      if (list.length === 0) {
        lines.push("- (none)", "");
        return;
      }
      for (const d of list) {
        lines.push(`- ${d.text}`);
        if (d.note.trim()) lines.push(`  - rationale: ${d.note.trim()}`);
        if (d.status === "accepted") {
          lines.push(`  - include in improve: ${d.selected ? "yes" : "no"}`);
        }
      }
      lines.push("");
    };
    pushGroup("Accepted during review", accepted);
    pushGroup("Declined during review", declined);
    pushGroup("Pending review decisions", pending);
    lines.push(DECISION_SECTION_END);
    return lines.join("\n").trim();
  }, []);

  const upsertDecisionSection = useCallback((base: string, section: string) => {
    const start = base.indexOf(DECISION_SECTION_START);
    const end = base.indexOf(DECISION_SECTION_END);
    if (!section) {
      if (start >= 0 && end > start) {
        const before = base.slice(0, start).trimEnd();
        const after = base.slice(end + DECISION_SECTION_END.length).trimStart();
        return [before, after].filter(Boolean).join("\n\n").trim();
      }
      return base;
    }
    if (start >= 0 && end > start) {
      const before = base.slice(0, start).trimEnd();
      const after = base.slice(end + DECISION_SECTION_END.length).trimStart();
      return [before, section, after].filter(Boolean).join("\n\n").trim();
    }
    // Recover gracefully from partially edited docs where start marker exists but end marker doesn't.
    if (start >= 0 && end < 0) {
      const before = base.slice(0, start).trimEnd();
      return [before, section].filter(Boolean).join("\n\n").trim();
    }
    return [base.trim(), section].filter(Boolean).join("\n\n").trim();
  }, []);

  // Keep an up-to-date decision log block in the working doc.
  useEffect(() => {
    setDesignDoc((prev) => {
      const section = buildDecisionSection(decisions);
      const next = upsertDecisionSection(prev, section);
      return next === prev ? prev : next;
    });
  }, [decisions, buildDecisionSection, upsertDecisionSection]);

  const extractSuggestions = useCallback((review: string): ReviewDecision[] => {
    const lines = review
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const picked: string[] = [];
    for (const line of lines) {
      if (line.startsWith("#")) continue;
      const bullet = line.match(/^[-*]\s+(.+)/);
      const numbered = line.match(/^\d+\.\s+(.+)/);
      const text = bullet?.[1] ?? numbered?.[1];
      if (!text) continue;
      if (text.length < 16) continue;
      if (picked.includes(text)) continue;
      picked.push(text);
      if (picked.length >= 8) break;
    }
    return picked.map((text, i) => ({
      id: `s-${Date.now()}-${i}`,
      text,
      status: "pending",
      note: "",
      selected: false,
    }));
  }, []);

  const callBuilderOnce = useCallback(
    async (localTurns: ChatTurn[]) => {
      const latest = useFlowStore.getState();
      const apiMessages: WorkflowBuildMessage[] = localTurns.map((t) => ({
        role: t.role,
        content: t.content,
      }));
      const { nodes: sn, edges: se } = serializeFlowForWorkflowApi(
        latest.nodes,
        latest.edges,
      );
      const res = await workflowBuildChat(apiMessages, {
        nodes: sn,
        edges: se,
        flowName: latest.flowName,
        flowContext: latest.flowContext ?? null,
      });

      const applied = res.validatedPatches?.length ?? 0;
      if (applied > 0) {
        const wasEmpty = useFlowStore.getState().nodes.length === 0;
        applyWorkflowPatchesToFlow(res.validatedPatches);
        if (wasEmpty) {
          const { nodes: laidNodes, edges: laidEdges, setNodes } = useFlowStore.getState();
          if (laidEdges.length > 0) {
            const laid = applyAutoLayout(laidNodes, laidEdges, 'LR');
            setNodes(laid as FlowNode<BaseNodeData>[]);
          }
        }
        window.requestAnimationFrame(() => {
          fitView({ padding: 0.2, duration: 280 });
        });
      }

      const builderTurn: ChatTurn = {
        role: "assistant",
        kind: "builder",
        content: res.content?.trim() || "Builder update completed.",
        validationErrors: res.validationErrors?.length
          ? res.validationErrors
          : undefined,
        appliedPatches: applied > 0 ? applied : undefined,
      };
      return builderTurn;
    },
    [fitView],
  );

  const fetchReviewMarkdown = useCallback(async (): Promise<string> => {
    const latest = useFlowStore.getState();
    return generateDesignReview(
      latest.nodes as Parameters<typeof generateDesignReview>[0],
      latest.edges,
      latest.flowName,
      latest.flowContext ?? null,
    );
  }, []);

  const runAutoReviewImproveSequences = useCallback(
    async (
      startTurns: ChatTurn[],
      cycles: number,
      useExistingTailReview?: boolean,
    ) => {
      if (cycles <= 0) return;
      try {
        appendToDesignDoc(
          "Auto design",
          `Running ${cycles} automatic review → improve cycle(s). Parsed bullets are auto-accepted each round.`,
        );
        let chatTurns = startTurns;
        for (let i = 0; i < cycles; i++) {
          if (autoRunCancelledRef.current) {
            appendToDesignDoc(
              "Auto design",
              `Stopped early after ${i} cycle(s).`,
            );
            break;
          }
          let reviewRaw: string;
          let reusedChatReviewer = false;

          if (useExistingTailReview && i === 0) {
            const tail = chatTurns[chatTurns.length - 1];
            const fromTurn = tail ? rawMarkdownFromReviewerTurn(tail) : null;
            if (fromTurn != null) {
              reviewRaw = fromTurn;
              reusedChatReviewer = true;
            } else {
              setReviewing(true);
              try {
                reviewRaw = (await fetchReviewMarkdown()).trim();
              } finally {
                setReviewing(false);
              }
              if (autoRunCancelledRef.current) break;
              const reviewTurn: ChatTurn = {
                role: "assistant",
                kind: "reviewer",
                content: `${REVIEWER_TURN_PREFIX}${reviewRaw || "No review output."}`,
              };
              chatTurns = [...chatTurns, reviewTurn];
              setTurns(chatTurns);
            }
          } else {
            setReviewing(true);
            try {
              reviewRaw = (await fetchReviewMarkdown()).trim();
            } finally {
              setReviewing(false);
            }
            if (autoRunCancelledRef.current) break;

            const reviewTurn: ChatTurn = {
              role: "assistant",
              kind: "reviewer",
              content: `${REVIEWER_TURN_PREFIX}${reviewRaw || "No review output."}`,
            };
            chatTurns = [...chatTurns, reviewTurn];
            setTurns(chatTurns);
          }

          const suggestions = extractSuggestions(reviewRaw);
          setDecisions(() => suggestions);
          appendToDesignDoc(
            `Auto review (cycle ${i + 1}/${cycles})`,
            reusedChatReviewer
              ? `(using review from chat)\n${reviewRaw || "(empty)"}`
              : reviewRaw || "(empty)",
          );

          if (suggestions.length === 0) {
            appendToDesignDoc(
              "Auto design",
              "No review bullets parsed; stopping auto loop.",
            );
            break;
          }

          const accepted = suggestions.map((s) => ({
            ...s,
            status: "accepted" as const,
            selected: true,
          }));
          const declined: ReviewDecision[] = [];

          if (autoRunCancelledRef.current) break;

          // Let the panel paint “pending” bullets, then show all-accepted while improve runs.
          await new Promise((r) => window.setTimeout(r, AUTO_ACCEPT_UI_MS));
          if (autoRunCancelledRef.current) break;
          setDecisions(() => accepted);

          const instruction: ChatTurn = {
            role: "user",
            kind: "system",
            content: buildImproveInstructionContent(accepted, declined),
          };
          chatTurns = [...chatTurns, instruction];
          setTurns(chatTurns);

          if (autoRunCancelledRef.current) break;

          setImproving(true);
          let builderTurn: ChatTurn;
          try {
            builderTurn = await callBuilderOnce(chatTurns);
          } finally {
            setImproving(false);
          }
          chatTurns = [...chatTurns, builderTurn];
          setTurns(chatTurns);
          appendToDesignDoc(
            `Auto improve (cycle ${i + 1}/${cycles})`,
            builderTurn.content,
          );
          await new Promise((r) =>
            window.setTimeout(r, DECISION_CLEAR_AFTER_APPLY_MS),
          );
          if (!autoRunCancelledRef.current) setDecisions(() => []);
        }
      } finally {
        setAutoReviewImproveCycles(0);
      }
    },
    [
      fetchReviewMarkdown,
      extractSuggestions,
      callBuilderOnce,
      appendToDesignDoc,
      setDecisions,
      setAutoReviewImproveCycles,
    ],
  );

  const submitBuilderMessage = useCallback(
    async (
      text: string,
      options?: {
        skipContextProposal?: boolean;
        /** After patches, run LR auto-layout when there is at least one edge (e.g. wiring existing nodes). */
        reflowAfter?: boolean;
        /** Default true: clear the compose box. Set false for one-click actions so a draft is preserved. */
        clearDraft?: boolean;
      },
    ) => {
      const trimmed = text.trim();
      if (!trimmed || loading || reviewing || improving || autoRunning) return;

      if (turns.length === 0 && !options?.skipContextProposal) {
        setShowContextProposal(true);
      }
      if (options?.skipContextProposal && turns.length === 0) {
        setShowContextProposal(false);
      }

      if (options?.clearDraft !== false) {
        setDraft("");
      }
      setRequestError(null);
      appendToDesignDoc("User request", trimmed);
      const nextTurns: ChatTurn[] = [
        ...turns,
        { role: "user", content: trimmed },
      ];
      setTurns(nextTurns);
      setLoading(true);
      autoRunCancelledRef.current = false;

      const apiMessages: WorkflowBuildMessage[] = nextTurns.map((t) => ({
        role: t.role,
        content: t.content,
      }));

      let turnsAfterSend: ChatTurn[] | null = null;
      try {
        const latest = useFlowStore.getState();
        const { nodes: sn, edges: se } = serializeFlowForWorkflowApi(
          latest.nodes,
          latest.edges,
        );
        const res = await workflowBuildChat(apiMessages, {
          nodes: sn,
          edges: se,
          flowName: latest.flowName,
          flowContext: latest.flowContext ?? null,
        });

        const assistantText = res.content?.trim() || "(No text reply.)";
        const applied = res.validatedPatches?.length ?? 0;
        if (applied > 0) {
          const wasEmpty = useFlowStore.getState().nodes.length === 0;
          applyWorkflowPatchesToFlow(res.validatedPatches);
          const after = useFlowStore.getState();
          const shouldReflow =
            after.edges.length > 0 && (wasEmpty || options?.reflowAfter);
          if (shouldReflow) {
            const laid = applyAutoLayout(after.nodes, after.edges, "LR");
            after.setNodes(laid as FlowNode<BaseNodeData>[]);
          }
          window.requestAnimationFrame(() => {
            fitView({ padding: 0.2, duration: 280 });
          });
        }

        const assistantTurn: ChatTurn = {
          role: "assistant",
          content: assistantText,
          validationErrors: res.validationErrors?.length
            ? res.validationErrors
            : undefined,
          appliedPatches: applied > 0 ? applied : undefined,
          kind: "builder",
        };
        turnsAfterSend = [...nextTurns, assistantTurn];
        setTurns(turnsAfterSend);
        appendToDesignDoc("Builder response", assistantText);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Request failed";
        setRequestError(msg);
        setTurns((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }

      if (turnsAfterSend && autoReviewImproveCycles > 0) {
        autoRunCancelledRef.current = false;
        setAutoRunning(true);
        try {
          await runAutoReviewImproveSequences(
            turnsAfterSend,
            autoReviewImproveCycles,
            false,
          );
        } catch (autoErr) {
          const msg =
            autoErr instanceof Error ? autoErr.message : "Auto design failed";
          setRequestError(msg);
        } finally {
          setAutoRunning(false);
        }
      }
    },
    [
      loading,
      reviewing,
      improving,
      autoRunning,
      turns,
      fitView,
      appendToDesignDoc,
      autoReviewImproveCycles,
      runAutoReviewImproveSequences,
    ],
  );

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    await submitBuilderMessage(text, {});
  }, [draft, submitBuilderMessage]);

  const handleBuildFromNodesContext = useCallback(async () => {
    await submitBuilderMessage(BUILD_FLOW_FROM_NODES_CONTEXT_MESSAGE, {
      skipContextProposal: true,
      reflowAfter: true,
      clearDraft: false,
    });
  }, [submitBuilderMessage]);

  const runDesignReview = useCallback(async (): Promise<ChatTurn[]> => {
    const review = (await fetchReviewMarkdown()).trim();
    const reviewTurn: ChatTurn = {
      role: "assistant",
      kind: "reviewer",
      content: `${REVIEWER_TURN_PREFIX}${review || "No review output."}`,
    };
    let nextTurns: ChatTurn[] = [];
    setTurns((prev) => {
      nextTurns = [...prev, reviewTurn];
      return nextTurns;
    });
    setDecisions(() => extractSuggestions(review));
    appendToDesignDoc("Reviewer output", review);
    return nextTurns;
  }, [fetchReviewMarkdown, extractSuggestions, appendToDesignDoc]);

  const handleReviewOnly = useCallback(async () => {
    if (loading || reviewing || improving || autoRunning) return;
    setRequestError(null);
    setReviewing(true);
    let nextTurns: ChatTurn[] | null = null;
    try {
      nextTurns = await runDesignReview();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Review failed";
      setRequestError(msg);
    } finally {
      setReviewing(false);
    }

    if (!nextTurns || autoReviewImproveCycles <= 0) return;

    autoRunCancelledRef.current = false;
    setAutoRunning(true);
    try {
      await runAutoReviewImproveSequences(
        nextTurns,
        autoReviewImproveCycles,
        true,
      );
    } catch (autoErr) {
      const msg =
        autoErr instanceof Error ? autoErr.message : "Auto design failed";
      setRequestError(msg);
    } finally {
      setAutoRunning(false);
    }
  }, [
    loading,
    reviewing,
    improving,
    autoRunning,
    runDesignReview,
    autoReviewImproveCycles,
    runAutoReviewImproveSequences,
  ]);

  const handleRetryLastReview = useCallback(async () => {
    if (loading || reviewing || improving || autoRunning || turns.length === 0)
      return;
    const last = turns[turns.length - 1];
    if (last.role !== "assistant" || last.kind !== "reviewer") return;
    setRequestError(null);
    setReviewing(true);
    try {
      const trimmed = turns.slice(0, -1);
      setTurns(trimmed);
      setDecisions(() => []);
      appendToDesignDoc("Review retry", "User requested a new review pass.");
      await runDesignReview();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Review failed";
      setRequestError(msg);
    } finally {
      setReviewing(false);
    }
  }, [
    loading,
    reviewing,
    improving,
    autoRunning,
    turns,
    runDesignReview,
    appendToDesignDoc,
  ]);

  const RETRY_BUILDER_NUDGE =
    "Please try again with a different approach. The previous reply did not match what I wanted.";

  const handleRetryLastBuilder = useCallback(async () => {
    if (loading || reviewing || improving || autoRunning || turns.length === 0)
      return;
    const last = turns[turns.length - 1];
    if (last.role !== "assistant" || last.kind === "reviewer") return;

    const hadAppliedPatches =
      typeof last.appliedPatches === "number" && last.appliedPatches > 0;

    setRequestError(null);
    if (hadAppliedPatches) {
      useFlowStore.getState().restoreLastWorkflowApply();
      window.requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 280 });
      });
      appendToDesignDoc(
        "Retry (builder)",
        "Reverted the previous builder's graph changes on the canvas.",
      );
    }

    const baseTurns = turns.slice(0, -1);
    const nudge: ChatTurn = { role: "user", content: RETRY_BUILDER_NUDGE };
    const nextTurns = [...baseTurns, nudge];
    setTurns(nextTurns);
    setLoading(true);
    appendToDesignDoc("Retry (builder)", RETRY_BUILDER_NUDGE);

    const apiMessages: WorkflowBuildMessage[] = nextTurns.map((t) => ({
      role: t.role,
      content: t.content,
    }));

    try {
      const latest = useFlowStore.getState();
      const { nodes: sn, edges: se } = serializeFlowForWorkflowApi(
        latest.nodes,
        latest.edges,
      );
      const res = await workflowBuildChat(apiMessages, {
        nodes: sn,
        edges: se,
        flowName: latest.flowName,
        flowContext: latest.flowContext ?? null,
      });

      const assistantText = res.content?.trim() || "(No text reply.)";
      const applied = res.validatedPatches?.length ?? 0;
      if (applied > 0) {
        const wasEmpty = useFlowStore.getState().nodes.length === 0;
        applyWorkflowPatchesToFlow(res.validatedPatches);
        if (wasEmpty) {
          const { nodes: laidNodes, edges: laidEdges, setNodes } = useFlowStore.getState();
          if (laidEdges.length > 0) {
            const laid = applyAutoLayout(laidNodes, laidEdges, 'LR');
            setNodes(laid as FlowNode<BaseNodeData>[]);
          }
        }
        window.requestAnimationFrame(() => {
          fitView({ padding: 0.2, duration: 280 });
        });
      }

      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantText,
          validationErrors: res.validationErrors?.length
            ? res.validationErrors
            : undefined,
          appliedPatches: applied > 0 ? applied : undefined,
          kind: "builder",
        },
      ]);
      appendToDesignDoc("Builder response (retry)", assistantText);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      setRequestError(msg);
      setTurns((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    reviewing,
    improving,
    autoRunning,
    turns,
    fitView,
    appendToDesignDoc,
  ]);

  const setDecisionStatus = useCallback(
    (id: string, status: DecisionStatus) => {
      setDecisions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status,
                // auto-select accepted suggestions for improve
                selected: status === "accepted" ? true : false,
              }
            : s,
        ),
      );
    },
    [setDecisions],
  );

  const updateDecisionNote = useCallback(
    (id: string, note: string) => {
      setDecisions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, note } : s)),
      );
    },
    [setDecisions],
  );

  const toggleDecisionSelected = useCallback(
    (id: string) => {
      setDecisions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)),
      );
    },
    [setDecisions],
  );

  const acceptAllDecisions = useCallback(() => {
    setDecisions((prev) =>
      prev.map((s) => ({ ...s, status: "accepted", selected: true })),
    );
  }, [setDecisions]);

  const declineAllDecisions = useCallback(() => {
    setDecisions((prev) =>
      prev.map((s) => ({ ...s, status: "declined", selected: false })),
    );
  }, [setDecisions]);

  const handleImproveSelected = useCallback(async () => {
    if (loading || reviewing || improving || autoRunning) return;
    const accepted = decisions.filter((s) => s.status === "accepted");
    const selected = accepted.filter((s) => s.selected);
    if (selected.length === 0) {
      setRequestError("Accept (and select) at least one suggestion first.");
      return;
    }
    setRequestError(null);
    setImproving(true);
    try {
      const declined = decisions.filter((s) => s.status === "declined");
      const instruction: ChatTurn = {
        role: "user",
        kind: "system",
        content: buildImproveInstructionContent(selected, declined),
      };
      const localTurns = [...turns, instruction];
      setTurns(localTurns);
      const builderTurn = await callBuilderOnce(localTurns);
      setTurns((prev) => [...prev, builderTurn]);
      appendToDesignDoc(
        "Improve pass",
        `Accepted suggestions:\n${selected.map((s, i) => `${i + 1}. ${s.text}${s.note ? ` — ${s.note}` : ""}`).join("\n")}`,
      );
      await new Promise((r) =>
        window.setTimeout(r, DECISION_CLEAR_AFTER_APPLY_MS),
      );
      setDecisions(() => []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Improve selected failed";
      setRequestError(msg);
      setTurns((prev) => prev.slice(0, -1));
    } finally {
      setImproving(false);
    }
  }, [
    loading,
    reviewing,
    improving,
    autoRunning,
    decisions,
    turns,
    callBuilderOnce,
    appendToDesignDoc,
    setDecisions,
  ]);

  useEffect(() => {
    if (!onRegisterImproveAction) return;
    onRegisterImproveAction(() => {
      void handleImproveSelected();
    });
    return () => onRegisterImproveAction(null);
  }, [onRegisterImproveAction, handleImproveSelected]);

  const insertArchitectTemplate = useCallback(() => {
    setDraft((prev) =>
      prev.trim()
        ? `${prev.trim()}\n\n${ARCHITECT_REFINE_TEMPLATE}`
        : ARCHITECT_REFINE_TEMPLATE,
    );
  }, []);

  const mapReviewToContextDraft = useCallback((reviewText: string) => {
    const lines = reviewText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !/^#+\s/.test(l));

    const clean = (s: string) =>
      s
        .replace(/^[-*]\s+/, "")
        .replace(/^\d+\.\s+/, "")
        .trim();
    const textLines = lines.map(clean).filter(Boolean);

    const description =
      textLines.find(
        (l) =>
          l.length > 40 && !/^Strengths$/i.test(l) && !/^Weaknesses$/i.test(l),
      ) ?? "Refined based on AI reviewer guidance.";

    const bullets = textLines
      .filter(
        (l) =>
          l.length > 20 &&
          !/^final verdict$/i.test(l) &&
          !/^strengths$/i.test(l) &&
          !/^weaknesses$/i.test(l),
      )
      .slice(0, 8);

    const howItWorks =
      bullets.length > 0
        ? `Reviewer guidance:\n- ${bullets.join("\n- ")}`
        : reviewText.trim();

    return { description, howItWorks };
  }, []);

  const border = isDark ? "border-white/10" : "border-indigo-200/80";
  const subText = isDark ? "text-white/50" : "text-slate-500";
  const panelBusy = loading || reviewing || improving || autoRunning;

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!panelBusy) void handleSend();
    }
  };

  const rootClass = embedded
    ? "flex flex-col flex-1 min-h-0 min-w-0"
    : "flex flex-col h-full min-h-0";

  return (
    <div className={rootClass}>
      {showHeader && !embedded && (
        <div
          className={`flex items-center gap-2 px-4 py-3 border-b shrink-0 ${border}`}
        >
          <Wand2
            size={16}
            className={isDark ? "text-violet-400" : "text-violet-600"}
          />
          <span
            className={`text-[13px] font-semibold tracking-tight flex-1 ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Design with AI
          </span>
          {(loading || autoRunning) && (
            <Loader2
              size={14}
              className="text-violet-500 animate-spin shrink-0"
            />
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`p-1 rounded-md transition-colors ${
                isDark
                  ? "text-white/40 hover:text-white hover:bg-white/10"
                  : "text-slate-400 hover:text-slate-800 hover:bg-slate-200/80"
              }`}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <div className={`px-4 py-1.5 border-b shrink-0 ${border}`}>
        <div className={`flex items-center gap-1.5 text-[10px] ${subText}`}>
          <Info size={11} />
          Uses current graph + flow context each turn.
        </div>
      </div>

      <div className={`px-4 py-2 border-b shrink-0 ${border}`}>
        <div
          className={`flex flex-wrap items-center gap-2 text-[10px] ${subText}`}
        >
          <span className="shrink-0">Then run</span>
          <select
            value={autoReviewImproveCycles}
            onChange={(e) => setAutoReviewImproveCycles(Number(e.target.value))}
            disabled={panelBusy}
            title="After a successful Send or after Review: runs N cycles of design review → auto-accept parsed bullets → improve the graph. First cycle after Review reuses the review you just ran."
            className={`rounded border px-1.5 py-0.5 text-[10px] min-w-[9rem] ${
              isDark
                ? "bg-white/5 border-white/15 text-white/85"
                : "bg-white border-slate-300 text-slate-800"
            } disabled:opacity-40`}
          >
            {[0, 1, 2, 3, 5, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "Off (manual only)" : `${n}× review → improve`}
              </option>
            ))}
          </select>
          {autoRunning && (
            <button
              type="button"
              onClick={() => {
                autoRunCancelledRef.current = true;
              }}
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium ${
                isDark
                  ? "border-rose-500/50 text-rose-200 hover:bg-rose-950/50"
                  : "border-rose-400 text-rose-800 hover:bg-rose-50"
              }`}
            >
              <Square size={10} />
              Stop auto
            </button>
          )}
        </div>
      </div>

      {!flowContext && (
        <div className={`px-4 py-2 border-b shrink-0 ${border}`}>
          <p
            className={`text-[11px] leading-snug ${isDark ? "text-amber-300/85" : "text-amber-700"}`}
          >
            Tip: add <strong>Flow Context</strong> (use case + constraints) for
            better AI build quality.
          </p>
        </div>
      )}

      <div className={`px-3 py-2 border-b shrink-0 ${border}`}>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={insertArchitectTemplate}
            disabled={panelBusy}
            className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] border transition-colors ${
              isDark
                ? "border-violet-500/35 text-violet-200 bg-violet-900/20 hover:bg-violet-900/30"
                : "border-violet-300 text-violet-800 bg-violet-50 hover:bg-violet-100"
            } disabled:opacity-40`}
            title="Insert reusable architecture-refinement prompt"
          >
            Insert template
          </button>
          <button
            type="button"
            onClick={() => setDocModalOpen(true)}
            className={`w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] border ${
              isDark
                ? "border-white/15 text-white/75 hover:bg-white/10"
                : "border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
            title="Open working document"
          >
            <FileText size={12} />
            Working doc
          </button>
        </div>
      </div>

      {showDecisions && (
        <AnimatePresence initial={false}>
          {decisions.length > 0 && (
            <motion.div
              key="workflow-review-decisions-panel"
              {...reviewDecisionPanelMotion}
              className={`relative overflow-hidden px-3 py-2 border-b shrink-0 ${border}`}
            >
              <ReviewExitShimmerOverlay variant={isDark ? "dark" : "light"} />
              {(() => {
                const acceptedCount = decisions.filter(
                  (s) => s.status === "accepted",
                ).length;
                const declinedCount = decisions.filter(
                  (s) => s.status === "declined",
                ).length;
                const pendingCount = decisions.filter(
                  (s) => s.status === "pending",
                ).length;
                return (
                  <>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className={`text-[11px] ${subText}`}>
                        Architecture decisions from review
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={acceptAllDecisions}
                          className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                            isDark
                              ? "border-emerald-500/45 text-emerald-300 hover:bg-emerald-900/25"
                              : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          Accept all
                        </button>
                        <button
                          type="button"
                          onClick={declineAllDecisions}
                          className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                            isDark
                              ? "border-amber-500/45 text-amber-300 hover:bg-amber-900/25"
                              : "border-amber-300 text-amber-700 hover:bg-amber-50"
                          }`}
                        >
                          Decline all
                        </button>
                      </div>
                    </div>
                    <div className={`text-[10px] mb-2 ${subText}`}>
                      Accepted: {acceptedCount} · Declined: {declinedCount} ·
                      Pending: {pendingCount}
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 sidebar-scroll">
                      {(["accepted", "declined", "pending"] as const).map(
                        (section) => {
                          const items = decisions.filter(
                            (d) => d.status === section,
                          );
                          if (items.length === 0) return null;
                          const title =
                            section === "accepted"
                              ? "Accepted during review"
                              : section === "declined"
                                ? "Declined during review"
                                : "Pending review decisions";
                          const titleColor =
                            section === "accepted"
                              ? isDark
                                ? "text-emerald-300/90"
                                : "text-emerald-700"
                              : section === "declined"
                                ? isDark
                                  ? "text-amber-300/90"
                                  : "text-amber-700"
                                : subText;
                          return (
                            <div key={section} className="space-y-1.5">
                              <div
                                className={`text-[10px] uppercase tracking-wide ${titleColor}`}
                              >
                                {title} ({items.length})
                              </div>
                              <AnimatePresence initial={false} mode="popLayout">
                                {items.map((s) => (
                                  <motion.div
                                    key={s.id}
                                    {...reviewDecisionCardMotion}
                                    className={`rounded-md border p-2 space-y-1 overflow-hidden transition-[border-color,box-shadow] duration-300 ${
                                      isDark
                                        ? s.status === "accepted"
                                          ? "border-emerald-500/45 bg-white/[0.04] shadow-[0_0_0_1px_rgba(52,211,153,0.12)]"
                                          : s.status === "declined"
                                            ? "border-amber-500/40 bg-white/[0.03]"
                                            : "border-white/10 bg-white/[0.03]"
                                        : s.status === "accepted"
                                          ? "border-emerald-400 bg-emerald-50/80 shadow-sm"
                                          : s.status === "declined"
                                            ? "border-amber-300 bg-amber-50/50"
                                            : "border-slate-200 bg-white"
                                    }`}
                                  >
                                    <div
                                      className={`text-[11px] leading-snug ${isDark ? "text-white/75" : "text-slate-700"}`}
                                    >
                                      {s.text}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDecisionStatus(s.id, "accepted")
                                        }
                                        className={`text-[10px] px-2 py-1 rounded border ${
                                          s.status === "accepted"
                                            ? isDark
                                              ? "bg-emerald-900/40 border-emerald-500/50 text-emerald-300"
                                              : "bg-emerald-100 border-emerald-300 text-emerald-800"
                                            : isDark
                                              ? "border-white/15 text-white/65 hover:bg-white/10"
                                              : "border-slate-300 text-slate-700 hover:bg-slate-100"
                                        }`}
                                      >
                                        Accept
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDecisionStatus(s.id, "declined")
                                        }
                                        className={`text-[10px] px-2 py-1 rounded border ${
                                          s.status === "declined"
                                            ? isDark
                                              ? "bg-amber-900/35 border-amber-500/50 text-amber-300"
                                              : "bg-amber-100 border-amber-300 text-amber-800"
                                            : isDark
                                              ? "border-white/15 text-white/65 hover:bg-white/10"
                                              : "border-slate-300 text-slate-700 hover:bg-slate-100"
                                        }`}
                                      >
                                        Decline
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDecisionStatus(s.id, "pending")
                                        }
                                        className={`text-[10px] px-2 py-1 rounded border ${
                                          s.status === "pending"
                                            ? isDark
                                              ? "bg-slate-800 border-slate-500/50 text-white/85"
                                              : "bg-slate-100 border-slate-300 text-slate-800"
                                            : isDark
                                              ? "border-white/15 text-white/65 hover:bg-white/10"
                                              : "border-slate-300 text-slate-700 hover:bg-slate-100"
                                        }`}
                                      >
                                        Pending
                                      </button>
                                      {s.status === "accepted" && (
                                        <label
                                          className={`ml-auto flex items-center gap-1 text-[10px] ${subText}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={s.selected}
                                            onChange={() =>
                                              toggleDecisionSelected(s.id)
                                            }
                                            className="accent-violet-500"
                                          />
                                          Include in improve
                                        </label>
                                      )}
                                    </div>
                                    <textarea
                                      value={s.note}
                                      onChange={(e) =>
                                        updateDecisionNote(s.id, e.target.value)
                                      }
                                      rows={2}
                                      placeholder={
                                        s.status === "declined"
                                          ? "Why declined? (optional but recommended)"
                                          : "Decision rationale / constraints (optional)"
                                      }
                                      className={`w-full rounded-md px-2 py-1 text-[10px] resize-y min-h-[40px] max-h-24 border ${
                                        isDark
                                          ? "bg-white/5 border-white/10 text-white/80 placeholder:text-white/35"
                                          : "bg-white border-slate-300 text-slate-700 placeholder:text-slate-400"
                                      }`}
                                    />
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 sidebar-scroll"
      >
        {turns.length === 0 && !panelBusy && (
          <div className={`text-[12px] leading-relaxed space-y-2 ${subText}`}>
            <p>
              <span className={isDark ? "text-white/70" : "text-slate-700"}>
                First message:
              </span>{" "}
              &ldquo;Create a RAG pipeline: PDFs → chunk → embed → vector DB →
              retriever → LLM.&rdquo;
            </p>
            <p>
              <span className={isDark ? "text-white/70" : "text-slate-700"}>
                Then refine:
              </span>{" "}
              &ldquo;Add guardrails before the LLM&rdquo; or &ldquo;Connect
              retriever output to the prompt input.&rdquo;
            </p>
            <p>
              <span className={isDark ? "text-white/70" : "text-slate-700"}>
                From the canvas:
              </span>{" "}
              Place nodes, write each node&rsquo;s Description in the properties
              panel, then use &ldquo;Build from nodes context&rdquo; below to wire
              the flow automatically.
            </p>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i}>
          <div
            className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                t.role === "user"
                  ? isDark
                    ? "bg-violet-600/90 text-white"
                    : "bg-violet-600 text-white"
                  : isDark
                    ? "bg-white/8 text-white/85 border border-white/10"
                    : "bg-white text-slate-800 border border-slate-200 shadow-sm"
              }`}
            >
              <div className="whitespace-pre-wrap">{t.content}</div>
              {t.kind === "reviewer" && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p
                    className={`text-[10px] ${isDark ? "text-sky-300/80" : "text-sky-700"}`}
                  >
                    Reviewer findings available for context.
                  </p>
                  {onUseReviewInContext && (
                    <button
                      type="button"
                      onClick={() =>
                        onUseReviewInContext(mapReviewToContextDraft(t.content))
                      }
                      className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                        isDark
                          ? "border-sky-500/40 text-sky-300 hover:bg-sky-900/25"
                          : "border-sky-300 text-sky-700 hover:bg-sky-50"
                      }`}
                    >
                      Use in Flow Context
                    </button>
                  )}
                </div>
              )}
              {t.appliedPatches != null && t.appliedPatches > 0 && (
                <p
                  className={`mt-2 text-[10px] font-medium ${
                    isDark ? "text-emerald-400/90" : "text-emerald-700"
                  }`}
                >
                  Applied {t.appliedPatches} graph update
                  {t.appliedPatches === 1 ? "" : "s"}.
                </p>
              )}
              {t.validationErrors && t.validationErrors.length > 0 && (
                <div
                  className={`mt-2 pt-2 border-t space-y-1 ${
                    isDark ? "border-white/10" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-1 text-amber-500 text-[10px] font-semibold">
                    <AlertTriangle size={11} />
                    Patch validation
                  </div>
                  <ul className="text-[10px] opacity-90 list-disc pl-3 space-y-0.5">
                    {t.validationErrors.slice(0, 6).map((err, j) => (
                      <li key={j}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              {i === turns.length - 1 &&
                !panelBusy &&
                t.role === "assistant" && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {t.kind !== "reviewer" && (
                      <button
                        type="button"
                        onClick={() => void handleRetryLastBuilder()}
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-colors ${
                          isDark
                            ? "border-white/20 text-white/75 hover:bg-white/10"
                            : "border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                        title="Ask the builder for a different approach (previous reply is removed from context)"
                      >
                        <RotateCw size={11} />
                        Try again
                      </button>
                    )}
                    {t.kind === "reviewer" && (
                      <button
                        type="button"
                        onClick={() => void handleRetryLastReview()}
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-colors ${
                          isDark
                            ? "border-sky-500/40 text-sky-300 hover:bg-sky-900/25"
                            : "border-sky-300 text-sky-700 hover:bg-sky-50"
                        }`}
                        title="Run review again and refresh suggestions"
                      >
                        <RotateCw size={11} />
                        New review
                      </button>
                    )}
                  </div>
                )}
            </div>
          </div>
          {i === 0 && t.role === "user" && showContextProposal && (
            <div className="flex justify-end mt-1">
              <div className={`max-w-[92%] rounded-xl px-3 py-2 text-[11px] border ${
                isDark
                  ? "bg-white/5 border-white/15 text-white/80"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}>
                <p className="mb-2">Save this as flow context for better reviews?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFlowContext({ description: t.content, howItWorks: "", documents: [] });
                      setShowContextProposal(false);
                    }}
                    className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                      isDark
                        ? "border-violet-500/45 text-violet-300 hover:bg-violet-900/25"
                        : "border-violet-300 text-violet-700 hover:bg-violet-50"
                    }`}
                  >
                    Save as context
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowContextProposal(false)}
                    className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                      isDark
                        ? "border-white/15 text-white/50 hover:bg-white/8"
                        : "border-slate-300 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
        ))}
        {improving &&
          autoRunning &&
          decisions.length > 0 &&
          (() => {
            const n = decisions.filter(
              (d) => d.status === "accepted" && d.selected,
            ).length;
            return (
              <p
                className={`text-[11px] leading-snug rounded-lg px-2.5 py-2 border ${
                  isDark
                    ? "border-emerald-500/35 bg-emerald-950/40 text-emerald-200/95"
                    : "border-emerald-200 bg-emerald-50 text-emerald-900"
                }`}
              >
                Auto-run: applying {n} auto-accepted suggestion
                {n === 1 ? "" : "s"} to the graph…
              </p>
            );
          })()}
        {requestError && (
          <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-2 py-1.5">
            {requestError}
          </p>
        )}
      </div>

      <div className={`p-3 border-t shrink-0 space-y-2 ${border}`}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={panelBusy}
          rows={6}
          placeholder="Describe what to build or improve… (Enter = send, Shift+Enter = newline). The builder sees the current graph, each node’s Description, and Flow Context."
          className={`w-full rounded-lg px-3 py-2 text-[12px] resize-y min-h-[120px] max-h-[45vh] outline-none border ${
            isDark
              ? "bg-white/5 border-white/15 text-white placeholder:text-white/35 focus:border-violet-500/50"
              : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-violet-500/70"
          }`}
        />
        <button
          type="button"
          onClick={() => void handleBuildFromNodesContext()}
          disabled={panelBusy || canvasNodeCount === 0}
          title={
            canvasNodeCount === 0
              ? "Add nodes on the canvas first"
              : "Connect existing nodes using descriptions on each node plus Flow Context"
          }
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-medium transition-opacity border ${
            isDark
              ? "bg-indigo-600/85 hover:bg-indigo-500/90 text-white border-indigo-400/35 disabled:opacity-40"
              : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-800/25 disabled:opacity-40"
          }`}
        >
          <Link2 size={14} />
          Build from nodes context
        </button>
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={panelBusy || !draft.trim()}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-medium transition-opacity border ${
            isDark
              ? "bg-violet-600 hover:bg-violet-500 text-white border-violet-500/40 disabled:opacity-40"
              : "bg-violet-600 hover:bg-violet-500 text-white border-violet-700/30 disabled:opacity-40"
          }`}
        >
          <Send size={14} />
          Send
        </button>
        <div
          className={`grid gap-2 ${
            showDecisions && (decisions.length > 0 || improving)
              ? "grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          <button
            type="button"
            onClick={() => void handleReviewOnly()}
            disabled={panelBusy}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-medium transition-opacity border ${
              isDark
                ? "bg-sky-700/80 hover:bg-sky-600/90 text-white border-sky-500/40 disabled:opacity-40"
                : "bg-sky-600 hover:bg-sky-500 text-white border-sky-700/30 disabled:opacity-40"
            }`}
          >
            {reviewing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckSquare size={14} />
            )}
            {reviewing ? "Reviewing…" : "Review"}
          </button>
          {showDecisions && (
            <AnimatePresence initial={false}>
              {(decisions.length > 0 || improving) && (
                <motion.div
                  key="workflow-improve-button"
                  {...reviewApplyRowMotion}
                  className="relative overflow-hidden min-w-0"
                >
                  <ReviewExitShimmerOverlay
                    variant={isDark ? "dark" : "light"}
                  />
                  <button
                    type="button"
                    onClick={() => void handleImproveSelected()}
                    disabled={panelBusy}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-medium transition-opacity border ${
                      isDark
                        ? "bg-emerald-700/80 hover:bg-emerald-600/90 text-white border-emerald-500/40 disabled:opacity-40"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700/30 disabled:opacity-40"
                    }`}
                  >
                    {improving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Wand2 size={14} />
                    )}
                    {improving ? "Applying…" : "Improve"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      <AnimatePresence>
        {docModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setDocModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
            >
              <div
                className={`w-full max-w-2xl max-h-[82vh] rounded-xl border shadow-2xl flex flex-col overflow-hidden ${
                  isDark
                    ? "bg-gray-950 border-white/15"
                    : "bg-white border-slate-300"
                }`}
              >
                <div
                  className={`flex items-center justify-between px-4 py-3 border-b ${border}`}
                >
                  <div
                    className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${isDark ? "text-white" : "text-slate-900"}`}
                  >
                    <FileText size={14} />
                    Working document
                  </div>
                  <button
                    type="button"
                    onClick={() => setDocModalOpen(false)}
                    className={`p-1 rounded ${isDark ? "text-white/60 hover:bg-white/10" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col gap-2">
                  <textarea
                    value={designDoc}
                    onChange={(e) => setDesignDoc(e.target.value)}
                    rows={16}
                    placeholder="Notes from build/review are tracked here. You can edit freely."
                    className={`w-full flex-1 rounded-md px-2.5 py-2 text-[11px] leading-relaxed resize-y min-h-[220px] outline-none border ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white/80 placeholder:text-white/35"
                        : "bg-white border-slate-300 text-slate-700 placeholder:text-slate-400"
                    }`}
                  />
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] ${subText}`}>
                      Auto-saved locally per flow name.
                    </span>
                    <button
                      type="button"
                      onClick={() => setDesignDoc("")}
                      className={`text-[10px] px-2 py-1 rounded border ${
                        isDark
                          ? "border-white/15 text-white/65 hover:bg-white/10"
                          : "border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Clear doc
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
