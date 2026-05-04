import { CaretDown, Copy, DownloadSimple, Stop, Trash, UploadSimple } from "@phosphor-icons/react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import MarkdownMessage from "@/components/Agent/MarkdownMessage";
import ToolCallCard from "@/components/Agent/ToolCallCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dot } from "@/components/ui/editorial";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportContent } from "@/features/report-viewer/ReportContent";
import { ReportShell, type ReportShellAnalysis } from "@/features/report-viewer/ReportShell";
import { getTimelineBlocks } from "@/features/run-analysis/progress";
import { TimelineErrorBlock } from "@/features/run-analysis/TimelineErrorBlock";
import { useRunAnalysis } from "@/features/run-analysis/useRunAnalysis";
import {
  exportAnalysisHtml,
  exportAnalysisMarkdown,
  getRunProgress,
  publishAnalysisHtml,
  stopAnalysis,
} from "@/shared/api/commands";
import { useAnalyses, useDeleteAnalysis } from "@/shared/api/queries";
import { addRun, addRunProgress, setRunProgress, setState, useAppStore } from "@/store";
import type { AgentCandidate, ProgressItem, RunState } from "@/types";

interface AnalysisPageProps {
  agents: AgentCandidate[];
}

export function AnalysisPage({ agents }: AnalysisPageProps) {
  const selectedAnalysisId = useAppStore((state) => state.selectedAnalysisId);
  const report = useAppStore((state) => state.selectedReport);
  const activeRuns = useAppStore((state) => state.activeRuns);
  const subTab = useAppStore((state) => state.analysisSubTab);
  const agentId = useAppStore((state) => state.agentId);
  const [copyState, setCopyState] = useState<string | null>(null);
  const [exportState, setExportState] = useState<string | null>(null);

  const { data: analyses = [] } = useAnalyses();
  const deleteAnalysisMutation = useDeleteAnalysis();
  const { startWithAnalysisId } = useRunAnalysis({
    agentId,
    agents,
    canRun: agents.some((agent) => agent.available),
  });

  const selectedAnalysis = useMemo(
    () => analyses.find((analysis) => analysis.id === selectedAnalysisId) ?? null,
    [analyses, selectedAnalysisId],
  );

  // Find the run for this analysis
  const currentRun = useMemo(() => {
    if (!selectedAnalysisId) return null;
    return (
      Object.values(activeRuns).find((r) => r.runId === report?.analysis.active_run_id) ?? null
    );
  }, [activeRuns, selectedAnalysisId, report]);

  const activeRunMeta = report?.runs.find((r) => r.id === report.analysis.active_run_id);
  const runId = currentRun?.runId ?? report?.analysis.active_run_id ?? null;
  const isRunning = currentRun?.status === "running";
  const title = report?.analysis.title ?? selectedAnalysis?.title ?? "Analysis";
  const prompt = report?.analysis.user_prompt ?? selectedAnalysis?.user_prompt ?? null;
  const shellAnalysis: ReportShellAnalysis = {
    id: report?.analysis.id ?? selectedAnalysis?.id ?? selectedAnalysisId,
    title,
    user_prompt: prompt,
    intent: report?.analysis.intent ?? selectedAnalysis?.intent ?? null,
    status: report?.analysis.status ?? selectedAnalysis?.status ?? null,
    created_at: report?.analysis.created_at ?? selectedAnalysis?.created_at ?? null,
  };

  const remove = useCallback(async () => {
    if (!report) return;

    await deleteAnalysisMutation.mutateAsync(report.analysis.id);
    setState({ selectedAnalysisId: null, selectedReport: null, view: "new-analysis" });
  }, [deleteAnalysisMutation, report]);

  const copyMarkdown = useCallback(async () => {
    if (!report) return;

    const markdown = await exportAnalysisMarkdown(report.analysis.id);
    await writeText(markdown);
    setCopyState("Copied!");
    setTimeout(() => setCopyState(null), 1500);
  }, [report]);

  const exportHtml = useCallback(async () => {
    if (!report) return;
    setExportState("Exporting…");
    try {
      const result = await exportAnalysisHtml(report.analysis.id);
      if (result) {
        setExportState(null);
        toast.success("Report saved", { description: result.path });
      } else {
        setExportState(null);
      }
    } catch (err) {
      console.error("export html failed:", err);
      setExportState(null);
      toast.error("Export failed", { description: String(err) });
    }
  }, [report]);

  const publishHtml = useCallback(async () => {
    if (!report) return;
    setExportState("Publishing…");
    const toastId = toast.loading("Publishing to PageDrop.io…");
    try {
      const published = await publishAnalysisHtml(report.analysis.id);
      await writeText(published.url);
      console.info("published report:", published);
      toast.success("Link copied to clipboard", {
        id: toastId,
        description: published.url,
      });
    } catch (err) {
      console.error("publish html failed:", err);
      toast.error("Publish failed", { id: toastId, description: String(err) });
    } finally {
      setExportState(null);
    }
  }, [report]);

  if (!selectedAnalysisId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#3f4653]">
        No analysis selected.
      </div>
    );
  }

  return (
    <Tabs
      value={subTab}
      onValueChange={(value) => setState({ analysisSubTab: value as "report" | "agent" })}
      className="h-full gap-0"
    >
      <ReportShell
        analysis={shellAnalysis}
        compactLabel="Analysis"
        introLabel="Analysis"
        isRunning={isRunning}
        controls={
          <TabsList className="h-auto w-fit gap-6 rounded-[6px] bg-[#f1f5ff] p-1">
            <TabsTrigger
              value="report"
              className="h-auto flex-none rounded-[5px] border-0 bg-transparent px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#3f4653] shadow-none data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-none"
            >
              Report
            </TabsTrigger>
            <TabsTrigger
              value="agent"
              className="h-auto flex-none rounded-[5px] border-0 bg-transparent px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#3f4653] shadow-none data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-none"
            >
              Agent
              {isRunning && <Dot className="-ml-0.5 size-1.5 animate-pulse bg-[#155dff]" />}
            </TabsTrigger>
          </TabsList>
        }
        actions={
          report ? (
            <div className="flex items-center gap-5 text-[12.5px]">
              <button
                type="button"
                onClick={copyMarkdown}
                className="inline-flex items-center gap-1.5 text-[#3f4653] transition-colors hover:text-[#111827]"
              >
                <Copy size={13} />
                <span>{copyState || "Copy as markdown"}</span>
              </button>
              <span aria-hidden className="h-3 w-px bg-[#dfe5ee]" />
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1.5 text-[#3f4653] transition-colors outline-none hover:text-[#111827] data-[state=open]:text-[#111827]">
                  <DownloadSimple size={13} />
                  <span>{exportState || "Export"}</span>
                  <CaretDown size={11} />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-[320px] min-w-[320px] rounded-[10px] border border-[#e7e9ee] bg-white/95 p-0 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl"
                >
                  <DropdownMenuItem
                    onSelect={() => {
                      void exportHtml();
                    }}
                    className="flex items-start gap-3 rounded-[6px] border-b border-[#e7e9ee] px-4 py-4 focus:bg-[#f5f7fa]"
                  >
                    <DownloadSimple size={15} className="mt-[3px] shrink-0 text-[#111827]" />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13px] font-medium text-[#111827]">Save as file…</span>
                      <span className="text-[11px] leading-[1.45] text-[#3f4653]">
                        Local HTML — stays on your machine.
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      void publishHtml();
                    }}
                    className="flex items-start gap-3 rounded-[6px] px-4 py-4 focus:bg-[#f5f7fa]"
                  >
                    <UploadSimple size={15} className="mt-[3px] shrink-0 text-[#111827]" />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13px] font-medium text-[#111827]">
                        Publish via PageDrop.io
                      </span>
                      <span className="text-[11px] leading-[1.45] text-[#3f4653]">
                        Third-party host — anyone with the link can read.
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <p className="border-t border-[#e7e9ee] bg-[#f5f7fa] px-4 py-3 text-[10.5px] leading-[1.45] text-[#3f4653]">
                    Publish uploads your report HTML to PageDrop.io, a third-party service not
                    operated by Infi. The host can read the contents. Use Save if that's not
                    acceptable.
                  </p>
                </DropdownMenuContent>
              </DropdownMenu>
              <span aria-hidden className="h-3 w-px bg-[#dfe5ee]" />
              <button
                type="button"
                onClick={remove}
                className="inline-flex items-center gap-1.5 text-[#3f4653] transition-colors hover:text-[#c0392b]"
              >
                <Trash size={13} />
                <span>Delete</span>
              </button>
            </div>
          ) : null
        }
      >
        <TabsContent value="report" className="mt-0 outline-none">
          <ReportContent
            onAskFollowUp={
              report ? (prompt) => startWithAnalysisId(report.analysis.id, prompt) : undefined
            }
          />
        </TabsContent>
        <TabsContent
          value="agent"
          className="mt-0 min-h-[calc(100vh-44px)] overflow-hidden border-t border-[#e7e9ee] outline-none"
        >
          <AgentTimeline
            runId={runId}
            run={currentRun}
            isRunning={isRunning}
            agentLabel={
              activeRunMeta
                ? activeRunMeta.agent_id +
                  (activeRunMeta.model_id ? ` · ${activeRunMeta.model_id}` : "")
                : null
            }
          />
        </TabsContent>
      </ReportShell>
    </Tabs>
  );
}

function AgentTimeline({
  runId,
  run,
  isRunning,
  agentLabel,
}: {
  runId: string | null;
  run: RunState | null;
  isRunning: boolean;
  agentLabel: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const progress = run?.progress ?? [];
  const timelineBlocks = useMemo(() => getTimelineBlocks(progress), [progress]);

  // Hydrate progress from DB if we have a runId but no in-memory progress
  useEffect(() => {
    if (!runId || (run && run.progress.length > 0)) return;
    getRunProgress(runId)
      .then((events) => {
        const items: ProgressItem[] = [];
        for (const event of events) {
          replayEvent(event, items);
        }
        // Create a RunState if one doesn't exist in memory (e.g. past completed analysis)
        if (!run) {
          addRun({
            runId,
            agentId: "",
            agentLabel: agentLabel || "Agent",
            status: "completed",
            progress: items,
            plan: [],
          });
        } else {
          setRunProgress(runId, items);
        }
      })
      .catch(() => {
        // non-critical
      });
  }, [runId, run, agentLabel]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const handleStop = useCallback(async () => {
    if (!runId) return;
    addRunProgress(runId, "error", "Stop requested");
    await stopAnalysis(runId);
  }, [runId]);

  if (!runId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#3f4653]">
        No agent activity for this analysis.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-6" ref={scrollRef}>
        <div className="mx-auto max-w-3xl">
          {timelineBlocks.map((block) => {
            if (block.type === "message") {
              return (
                <div key={block.id} className="py-4">
                  <MarkdownMessage text={block.content} />
                </div>
              );
            }

            if (block.type === "tool") {
              return (
                <div key={block.id}>
                  <ToolCallCard
                    title={block.title}
                    toolName={block.toolName}
                    toolKind={block.kind}
                    arguments={block.arguments}
                    result={block.result}
                    status={block.status}
                  />
                </div>
              );
            }

            if (block.type === "error") {
              return (
                <div key={block.id} className="py-2">
                  <TimelineErrorBlock
                    message={block.content}
                    kind={block.kind}
                    details={block.details}
                  />
                </div>
              );
            }

            return null;
          })}

          {isRunning && (
            <div className="flex animate-pulse items-center gap-2 py-2 text-xs text-[#3f4653]">
              <Dot className="size-1.5 bg-[#155dff]" />
              Agent is working...
            </div>
          )}
        </div>
      </div>

      {isRunning && (
        <div className="shrink-0 border-t border-[#e7e9ee]">
          <div className="mx-auto max-w-3xl px-6 py-3">
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#dfe5ee] bg-white px-4 py-2 text-[12.5px] text-[#3f4653] transition-colors hover:border-[#c0392b] hover:bg-white hover:text-[#c0392b]"
            >
              <Stop size={13} weight="fill" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Replay a single persisted event into a progress items array.
 */
function replayEvent(payload: import("@/types").ProgressEventPayload, items: ProgressItem[]) {
  const push = (type: ProgressItem["type"], message: string, data?: unknown) => {
    items.push({ id: crypto.randomUUID(), type, message, timestamp: Date.now(), data });
  };
  const appendLast = (type: ProgressItem["type"], delta: string) => {
    const last = items[items.length - 1];
    if (last && last.type === type) {
      items[items.length - 1] = { ...last, message: last.message + delta };
    } else {
      items.push({ id: crypto.randomUUID(), type, message: delta, timestamp: Date.now() });
    }
  };

  switch (payload.event) {
    case "MessageDelta":
      appendLast("agent_message", payload.data.delta);
      break;
    case "ThoughtDelta":
      appendLast("agent_thought", payload.data.delta);
      break;
    case "ToolCallStarted":
      push("tool_call", payload.data.title, payload.data);
      break;
    case "ToolCallComplete":
      push("tool_result", `${payload.data.title || "tool"} ${payload.data.status}`, payload.data);
      break;
    case "Plan":
      push("plan", "Plan updated", payload.data);
      break;
    case "PlanSubmitted":
      push("submitted", "Research plan submitted");
      break;
    case "SourceSubmitted":
      push("submitted", "Source submitted");
      break;
    case "MetricSubmitted":
      push("submitted", "Metric submitted");
      break;
    case "ArtifactSubmitted":
      push("submitted", "Structured artifact submitted");
      break;
    case "BlockSubmitted":
      push("submitted", "Analysis block submitted");
      break;
    case "StanceSubmitted":
      push("submitted", "Final stance submitted");
      break;
    case "Completed":
      push("completed", "Analysis complete");
      break;
    case "Error":
      push("error", payload.data.message);
      break;
    case "Log":
      push("log", payload.data);
      break;
  }
}
