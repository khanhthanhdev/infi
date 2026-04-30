import {
  ArrowRight,
  ChartLineUp,
  ChartPieSlice,
  FileText,
  PaperPlaneTilt,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";
import type { KeyboardEvent } from "react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import heroArtUrl from "@/public/research-hero-art.png";
import { useAppStore } from "@/store";
import type { AgentCandidate } from "@/types";
import { ExamplePromptsGrid } from "./ExamplePromptsGrid";
import { ResearchComposer } from "./ResearchComposer";
import { StockTickerChips } from "./StockTickerChips";
import { useRunAnalysis } from "./useRunAnalysis";

interface ResearchPageProps {
  agents: AgentCandidate[];
}

const HERO_FEATURES = [
  { label: "Source-backed blocks", icon: ShieldCheck },
  { label: "Filings & reports", icon: FileText },
  { label: "Market data", icon: ChartLineUp },
  { label: "Portfolio aware", icon: ChartPieSlice },
];

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
    <div className="relative flex h-full min-h-0 flex-col bg-[#fbfbfa]">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-6 pb-44 pt-5 lg:px-8">
          <section className="relative min-h-[360px] overflow-hidden">
            <div className="relative z-10 flex min-h-[360px] flex-col justify-center px-8 py-9 sm:px-11 lg:w-[62%] xl:w-[58%]">
              <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3572ad]">
                Source-backed investment research
              </p>
              <h1 className="max-w-[560px] text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-[#111827] sm:text-[52px]">
                Research your portfolio with clarity.
              </h1>
              <p className="mt-5 max-w-[520px] text-[14.5px] leading-[1.55] text-[#3f4653]">
                Infi is your personal AI-powered agent for stock and portfolio research. We assemble
                source-backed blocks, not prose--so you can decide with confidence.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById("research-composer-input")?.focus();
                  }}
                  className="group inline-flex h-10 items-center gap-3 rounded-[6px] border border-[#155dff] bg-[#155dff] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#0d4ad6]"
                >
                  <span>Start analysis</span>
                  <ArrowRight
                    size={15}
                    weight="bold"
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById("research-examples")?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }}
                  className="inline-flex h-10 items-center rounded-[6px] border border-[#dfe5ee] bg-white/80 px-5 text-[14px] font-medium text-[#171b23] transition-colors hover:border-[#cbd5e1] hover:bg-white"
                >
                  View examples
                </button>
              </div>
              <div className="mt-6 flex flex-wrap gap-2.5 lg:flex-nowrap">
                {HERO_FEATURES.map(({ label, icon: Icon }) => (
                  <span
                    key={label}
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[5px] border border-[#dde6f2] bg-white/75 px-3 text-[12px] font-medium text-[#1c2430]"
                  >
                    <Icon size={17} weight="duotone" className="text-[#155dff]" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] lg:block"
              aria-hidden
            >
              <img
                src={heroArtUrl}
                alt=""
                className="absolute right-[-48px] top-1/2 h-[445px] w-[675px] -translate-y-1/2 object-contain opacity-95"
              />
            </div>
          </section>

          <div className="mt-5 space-y-5">
            <StockTickerChips onSelect={handleTickerSelect} />
            <ExamplePromptsGrid onSelect={setPrompt} />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#fbfbfa] via-[#fbfbfa] to-[#fbfbfa]/70 pb-5 pt-3">
        <div className="w-full px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[10px] border border-[#e7e9ee] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
            <div className="flex items-start gap-3 px-5 py-3">
              <Sparkle size={20} weight="duotone" className="mt-2.5 shrink-0 text-[#155dff]" />
              <Textarea
                id="research-composer-input"
                className="min-h-[46px] flex-1 resize-none border-0 bg-transparent px-0 py-3 text-[15px] leading-[1.45] tracking-[-0.01em] text-[#171b23] shadow-none outline-none placeholder:text-muted-foreground/55 focus-visible:border-transparent focus-visible:ring-0"
                rows={2}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your research question…"
              />
              <button
                type="button"
                disabled={!canRun}
                onClick={() => {
                  if (canRun) start(prompt, null);
                }}
                className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1f5ff] text-[#155dff] transition-colors hover:bg-[#e4ecff] disabled:text-[#155dff]/35"
                aria-label="Run analysis"
              >
                <PaperPlaneTilt size={18} weight="fill" />
              </button>
            </div>
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
