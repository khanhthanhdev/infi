import { ArrowRight, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import AgentSelector from "@/components/Agent/AgentSelector";
import { getSettings, listSources, updateSettings } from "@/shared/api/commands";
import { getState, setState, useAppStore } from "@/store";
import type { AgentCandidate, SourceDescriptor } from "@/types";
import { SourcesPopover } from "./SourcesPopover";

async function persistModelByAgent(map: Record<string, string | null>) {
  try {
    const settings = await getSettings();
    const next: Record<string, string> = {};
    for (const [id, value] of Object.entries(map)) {
      if (value) next[id] = value;
    }
    await updateSettings({ ...settings, model_by_agent: next });
  } catch {
    // non-critical
  }
}

interface ResearchComposerProps {
  agentId: string;
  agents: AgentCandidate[];
  canRun: boolean;
  localError: string | null;
  selectedAgent: AgentCandidate | undefined;
  onRun: (enabledSources: string[] | null) => void;
}

export function ResearchComposer({
  agentId,
  agents,
  canRun,
  localError,
  selectedAgent,
  onRun,
}: ResearchComposerProps) {
  const modelByAgent = useAppStore((state) => state.modelByAgent);
  const [sources, setSources] = useState<SourceDescriptor[] | null>(null);
  const [runSources, setRunSources] = useState<Set<string>>(new Set());

  useEffect(() => {
    listSources()
      .then((list) => {
        setSources(list);
        // Seed per-run selection with the user's global enabled set
        setRunSources(new Set(list.filter((s) => s.enabled).map((s) => s.id)));
      })
      .catch(() => {});
  }, []);

  const availableSources = useMemo(
    () => (sources ? sources.filter((s) => s.enabled) : []),
    [sources],
  );

  const toggleSource = (id: string) => {
    setRunSources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRun = () => {
    const list = Array.from(runSources);
    onRun(list);
  };

  const handleSelectAgent = (id: string, modelId: string | null) => {
    const prev = getState().modelByAgent;
    const nextMap: Record<string, string | null> = { ...prev, [id]: modelId };
    setState({ agentId: id, modelByAgent: nextMap });
    void persistModelByAgent(nextMap);
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <AgentSelector
          agents={agents}
          selectedAgentId={agentId}
          modelByAgent={modelByAgent}
          onSelect={handleSelectAgent}
        />
        {sources !== null &&
          (availableSources.length > 0 ? (
            <SourcesPopover
              sources={availableSources}
              selected={runSources}
              onToggle={toggleSource}
            />
          ) : (
            <button
              type="button"
              onClick={() => setState({ view: "settings" })}
              className="inline-flex items-center gap-2 border border-dashed border-border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              title="No data sources enabled. Open Settings to turn some on."
            >
              <span>No sources</span>
              <span aria-hidden className="h-3 w-px bg-border" />
              <span>Enable in settings →</span>
            </button>
          ))}
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/70 sm:inline">
          {canRun ? "⌘ + ↵ to run" : ""}
        </span>
        <button
          type="button"
          disabled={!canRun}
          onClick={handleRun}
          className="group inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors hover:bg-background hover:text-foreground disabled:border-border disabled:bg-transparent disabled:text-muted-foreground/60"
        >
          <span>Run analysis</span>
          <ArrowRight
            size={14}
            weight="bold"
            className="transition-transform group-enabled:group-hover:translate-x-0.5"
          />
        </button>
      </div>

      {(!selectedAgent?.available || localError) && (
        <div className="absolute -top-10 right-0 flex items-center gap-2 text-xs text-destructive">
          <WarningCircle size={14} />
          <span>
            {!selectedAgent?.available
              ? "Configure an ACP agent binary before running analysis."
              : localError}
          </span>
        </div>
      )}
    </div>
  );
}
