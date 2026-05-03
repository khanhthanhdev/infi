import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { preprocessHighlightSyntax } from "@/lib/markdown-highlights";
import { cn } from "@/lib/utils";
import type { AnalysisBlock, MetricExplanation, Source } from "@/types";
import { ConfidenceBadge } from "./badge-styles";
import { createReportMarkdownComponents } from "./markdown-components";
import { blockSelection, type SelectionProps } from "./selection";

interface AnalysisBlockCardProps extends SelectionProps {
  block: AnalysisBlock;
  sourceMap?: Map<string, Source>;
  explanations?: MetricExplanation[];
  isFirstInGroup?: boolean;
}

export function AnalysisBlockCard({
  block,
  sourceMap,
  explanations = [],
  selectedId,
  onSelect,
}: AnalysisBlockCardProps) {
  const markdownComponents = createReportMarkdownComponents(explanations);

  return (
    <article
      className={cn(
        "report-card-tint grid gap-6 rounded-[10px] border border-[#e7e9ee] bg-white p-5 transition-colors md:grid-cols-[220px_minmax(0,1fr)] md:gap-10",
        importanceTone(block.importance),
        selectedId === `analysis_block:${block.id}` && "report-selected",
      )}
    >
      <header className="flex flex-col gap-2 md:sticky md:top-28 md:self-start">
        <div className="flex items-center gap-2">
          <ImportanceGlyph importance={block.importance} />
          <span
            className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3572ad]"
            style={{ "--report-accent": "#3572ad" } as React.CSSProperties}
          >
            {String(block.importance)}
          </span>
        </div>
        <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-[#111827]">
          {block.title}
        </h3>
        <ConfidenceBadge confidence={block.confidence} />
        <button
          type="button"
          onClick={() => onSelect?.(blockSelection(block))}
          className="w-fit font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653] transition-colors hover:text-[#155dff]"
        >
          Inspect
        </button>
      </header>

      <div className="min-w-0 space-y-5">
        <div className="max-w-[88ch] text-[15px] leading-[1.65] text-[#111827]/90 [&>*+*]:mt-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {preprocessHighlightSyntax(block.body)}
          </ReactMarkdown>
        </div>
        {block.evidence_ids.length > 0 && (
          <EvidenceRow ids={block.evidence_ids} sourceMap={sourceMap} />
        )}
      </div>
    </article>
  );
}

function ImportanceGlyph({ importance }: { importance: string }) {
  const cls =
    importance === "high"
      ? "bg-[#e03535]"
      : importance === "medium"
        ? "bg-[#d97706]"
        : "bg-[#0a8f8f]";
  return <span className={cn("h-2 w-2 shrink-0 rounded-full", cls)} aria-hidden />;
}

function importanceTone(importance: string): string {
  switch (importance) {
    case "high":
      return "report-tone-negative";
    case "medium":
      return "report-tone-warning";
    default:
      return "report-tone-neutral";
  }
}

function EvidenceRow({ ids, sourceMap }: { ids: string[]; sourceMap?: Map<string, Source> }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 border-t border-border pt-4">
      <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
        Cited
      </span>
      <TooltipProvider delayDuration={150}>
        {ids.map((id, index) => {
          const source = sourceMap?.get(id);
          const label = source?.title ?? id.slice(0, 8);
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <a
                  href={source?.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-baseline gap-1.5 text-[12.5px] text-foreground/80 underline-offset-4 hover:underline"
                >
                  <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="max-w-[24ch] truncate">{label}</span>
                </a>
              </TooltipTrigger>
              {source && (
                <TooltipContent
                  variant="editorial"
                  sideOffset={6}
                  className="max-w-xs space-y-1.5 text-left"
                >
                  <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Source
                  </span>
                  <p className="text-[13px] font-medium leading-snug text-foreground">
                    {source.title}
                  </p>
                  {source.publisher && (
                    <p className="text-[12px] text-foreground/70">{source.publisher}</p>
                  )}
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                    {source.reliability} reliability
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
