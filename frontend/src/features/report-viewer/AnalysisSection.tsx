import { type CSSProperties, memo } from "react";
import type { AnalysisBlock, BlockKind, MetricExplanation, Source } from "@/types";
import { AnalysisBlockCard } from "./AnalysisBlockCard";
import type { SelectionProps } from "./selection";

interface AnalysisSectionProps extends SelectionProps {
  blocks: AnalysisBlock[];
  sourceMap: Map<string, Source>;
  explanations?: MetricExplanation[];
}

interface BlockGroup {
  id: string;
  label: string;
  kinds: BlockKind[];
}

const GROUPS: BlockGroup[] = [
  { id: "thesis", label: "Thesis & Business Quality", kinds: ["thesis", "business_quality"] },
  {
    id: "financials",
    label: "Financial Case",
    kinds: ["financials", "valuation", "peer_comparison"],
  },
  { id: "context", label: "Context", kinds: ["sector_context", "technical_context"] },
  { id: "path", label: "Path Ahead", kinds: ["catalysts", "risks"] },
  { id: "open", label: "Open Questions", kinds: ["open_questions", "other"] },
];

export const AnalysisSection = memo(function AnalysisSection({
  blocks,
  sourceMap,
  explanations = [],
  selectedId,
  onSelect,
}: AnalysisSectionProps) {
  if (blocks.length === 0) return null;

  const sorted = [...blocks].sort((a, b) => a.display_order - b.display_order);
  const grouped = GROUPS.map((group) => ({
    ...group,
    blocks: sorted.filter((b) => group.kinds.includes(b.kind as BlockKind)),
  })).filter((group) => group.blocks.length > 0);

  return (
    <div className="space-y-14">
      {grouped.map((group) => (
        <div key={group.id} className="space-y-2">
          <div
            className={`report-section-nav ${groupTone(group.id)} sticky top-12 z-10 -mx-8 flex h-12 items-center border-b border-[#e7e9ee] bg-white/95 px-8 backdrop-blur-xl`}
          >
            <div className="flex flex-1 items-baseline justify-between gap-4">
              <span
                className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3572ad]"
                style={{ "--report-accent": "#3572ad" } as CSSProperties}
              >
                {group.label}
              </span>
              <span
                className="font-mono text-[10.5px] tabular-nums text-[#3f4653]"
                style={{ "--report-accent": "#3572ad" } as CSSProperties}
              >
                {String(group.blocks.length).padStart(2, "0")}
              </span>
            </div>
          </div>
          <div className="rounded-[10px] border border-[#e7e9ee] bg-white">
            {group.blocks.map((block, index) => (
              <AnalysisBlockCard
                key={block.id}
                block={block}
                sourceMap={sourceMap}
                explanations={explanations}
                isFirstInGroup={index === 0}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

function groupTone(id: string): string {
  switch (id) {
    case "thesis":
      return "report-tone-info";
    case "financials":
      return "report-tone-info";
    case "context":
      return "report-tone-neutral";
    case "path":
      return "report-tone-warning";
    default:
      return "report-tone-neutral";
  }
}
