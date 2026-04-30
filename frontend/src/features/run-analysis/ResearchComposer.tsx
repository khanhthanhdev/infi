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
    <div className="relative flex items-center justify-between gap-4 border-t border-[#edf0f4] px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
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
              className="inline-flex h-8 items-center gap-2 rounded-[5px] border border-[#e4e7ec] bg-white px-3 text-[12px] font-medium text-[#495260] transition-colors hover:border-[#c9d3e2] hover:text-[#171b23]"
              title="No data sources enabled. Open Settings to turn some on."
            >
              <span>No sources</span>
              <span aria-hidden className="h-3 w-px bg-[#d9dde5]" />
              <span>Enable in settings</span>
            </button>
          ))}
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/60 xl:inline">
          {canRun ? "⌘ + ↵ to run" : ""}
        </span>
        <button
          type="button"
          disabled={!canRun}
          onClick={handleRun}
          className="group inline-flex h-10 items-center gap-3 rounded-[6px] border border-[#155dff] bg-[#155dff] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#0d4ad6] disabled:border-[#dce2ec] disabled:bg-[#f5f7fb] disabled:text-[#9aa4b2]"
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
        <div className="absolute -top-8 right-4 flex items-center gap-2 text-xs text-destructive">
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
