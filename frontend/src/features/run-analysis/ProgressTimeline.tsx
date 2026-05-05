import { CheckCircle, CircleNotch, MagnifyingGlass, XCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import MarkdownMessage from "@/components/Agent/MarkdownMessage";
import ToolCallCard from "@/components/Agent/ToolCallCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRunProgress } from "@/shared/api/commands";
import { setRunProgress } from "@/store";
import type { ProgressItem, RunState } from "@/types";
import { getTimelineBlocks, replayEvent } from "./progress";
import { TimelineErrorBlock } from "./TimelineErrorBlock";

interface ProgressTimelineProps {
  activeRuns: Record<string, RunState>;
  selectedRunTab: string | null;
  onSelectTab: (runId: string) => void;
  onExampleSelect: (prompt: string) => void;
}

const EXAMPLE_PROMPTS = [
  "Compare NVDA to AMD",
  "Analyze the energy sector",
  "Review US regional banks",
];

export function ProgressTimeline({
  activeRuns,
  selectedRunTab,
  onSelectTab,
  onExampleSelect,
}: ProgressTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const runEntries = Object.values(activeRuns);
  const hasRuns = runEntries.length > 0;
  const currentRun = selectedRunTab ? activeRuns[selectedRunTab] : null;
  const progress = currentRun?.progress ?? [];
  const isRunning = currentRun?.status === "running";
  const timelineBlocks = useMemo(() => getTimelineBlocks(progress), [progress]);

  const hydrateTab = useCallback(
    async (runId: string) => {
      const run = activeRuns[runId];
      if (!run || run.progress.length > 0) return;
      try {
        const events = await getRunProgress(runId);
        // Build progress items by replaying events into a temporary array
        const items: ProgressItem[] = [];
        for (const event of events) {
          replayEvent(event, items);
        }
        setRunProgress(runId, items);
      } catch {
        // non-critical — live stream will fill in
      }
    },
    [activeRuns],
  );

  useEffect(() => {
    if (selectedRunTab) {
      hydrateTab(selectedRunTab);
    }
  }, [selectedRunTab, hydrateTab]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 pb-32" ref={scrollRef}>
      <div className="mx-auto max-w-3xl space-y-8">
        {hasRuns && runEntries.length > 1 && (
          <Tabs value={selectedRunTab ?? undefined} onValueChange={onSelectTab} className="gap-0">
            <TabsList>
              {runEntries.map((run) => (
                <TabsTrigger key={run.runId} value={run.runId} className="flex-none px-3 text-xs">
                  <RunStatusIcon status={run.status} />
                  {run.agentLabel}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {!hasRuns && (
          <div className="flex flex-col items-center justify-center pt-24 text-center text-muted-foreground">
            <MagnifyingGlass size={32} className="mb-4 opacity-20" />
            <p className="text-sm">Enter a research prompt below to begin analysis.</p>
            <div className="mt-8 flex max-w-md flex-wrap justify-center gap-2">
              {EXAMPLE_PROMPTS.map((example) => (
                <Button
                  key={example}
                  variant="outline"
                  size="xs"
                  className="bg-card"
                  onClick={() => onExampleSelect(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        )}

        {timelineBlocks.map((block) => {
          if (block.type === "message") {
            return (
              <div key={block.id}>
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
              <TimelineErrorBlock
                key={block.id}
                message={block.content}
                kind={block.kind}
                details={block.details}
              />
            );
          }

          return null;
        })}

        {isRunning && (
          <div className="flex animate-pulse items-center gap-2 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 bg-primary/50" />
            Agent is working...
          </div>
        )}
      </div>
    </div>
  );
}

function RunStatusIcon({ status }: { status: RunState["status"] }) {
  switch (status) {
    case "running":
      return <CircleNotch size={12} className="animate-spin text-primary" />;
    case "completed":
      return <CheckCircle size={12} className="text-green-500" />;
    case "error":
      return <XCircle size={12} className="text-destructive" />;
    case "cancelled":
      return <XCircle size={12} className="text-muted-foreground" />;
  }
}
