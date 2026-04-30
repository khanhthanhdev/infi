import type { KeyboardEvent } from "react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store";
import type { AgentCandidate } from "@/types";
import { ExamplePromptsGrid } from "./ExamplePromptsGrid";
import { RecentAnalyses } from "./RecentAnalyses";
import { ResearchComposer } from "./ResearchComposer";
import { StockTickerChips } from "./StockTickerChips";
import { useRunAnalysis } from "./useRunAnalysis";

interface ResearchPageProps {
  agents: AgentCandidate[];
}

export function ResearchPage({ agents }: ResearchPageProps) {
  const [prompt, setPrompt] = useState("");
  const agentId = useAppStore((state) => state.agentId);

  const selectedAgent = agents.find((agent) => agent.id === agentId);
  const canRun = prompt.trim().length > 0 && !!selectedAgent?.available;

  const { localError, start } = useRunAnalysis({
    agentId,
    agents,
    canRun,
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (canRun) {
        start(prompt, null);
      }
    }
  };

  const handleTickerSelect = (symbol: string) => {
    setPrompt((prev) => {
      const trimmed = prev.trim();
      if (trimmed.length === 0) return symbol;
      return `${trimmed} ${symbol}`;
    });
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-8 pb-40 pt-16">
          {/* Header */}
          <h1 className="mb-12 text-[48px] font-semibold leading-[0.98] tracking-[-0.03em] sm:text-[64px]">
            What do you
            <br />
            want to know?
          </h1>

          {/* Dashboard sections */}
          <div className="space-y-12">
            {/* Stock tickers */}
            <StockTickerChips onSelect={handleTickerSelect} />

            {/* Recent analyses */}
            <RecentAnalyses />

            {/* Example prompts */}
            <ExamplePromptsGrid onSelect={setPrompt} />
          </div>
        </div>
      </div>

      {/* Absolute bottom input bar - contained within ResearchPage only */}
      <div className="absolute bottom-0 left-0 right-0 z-50 border-t border-border bg-background">
        <div className="mx-auto w-full max-w-5xl px-8 py-4">
          <div className="relative space-y-3">
            {/* Textarea */}
            <div className="border-t border-b border-border">
              <Textarea
                className="min-h-[80px] w-full resize-none border-0 bg-transparent px-0 py-4 text-[18px] leading-[1.35] tracking-[-0.01em] shadow-none outline-none placeholder:text-muted-foreground/40 focus-visible:border-transparent focus-visible:ring-0"
                rows={2}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your research question…"
              />
            </div>

            {/* Controls */}
            <ResearchComposer
              agentId={agentId}
              agents={agents}
              canRun={canRun}
              localError={localError}
              selectedAgent={selectedAgent}
              onRun={(enabledSources) => start(prompt, enabledSources)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
