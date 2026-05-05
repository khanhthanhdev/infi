import { ArrowUpRight } from "@phosphor-icons/react";
import { memo } from "react";
import { FreshnessChip } from "@/components/ui/editorial";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Source } from "@/types";
import { type SelectionProps, sourceSelection } from "./selection";

interface SourceListProps extends SelectionProps {
  sources: Source[];
}

export const SourceList = memo(function SourceList({
  sources,
  selectedId,
  onSelect,
}: SourceListProps) {
  if (sources.length === 0) return null;

  const sorted = [...sources].sort(
    (a, b) => reliabilityRank(b.reliability) - reliabilityRank(a.reliability),
  );

  return (
    <div className="rounded-[10px] border border-border bg-card">
      {sorted.map((source, index) => (
        <SourceRow
          key={source.id}
          source={source}
          index={index}
          selected={selectedId === `source:${source.id}`}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});

function SourceRow({
  source,
  index,
  selected,
  onSelect,
}: {
  source: Source;
  index: number;
  selected?: boolean;
  onSelect?: (selection: ReturnType<typeof sourceSelection>) => void;
}) {
  const content = (
    <>
      <span className="text-[11px] tabular-nums text-text-secondary">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <ReliabilityPill reliability={source.reliability} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary/80">
            {source.source_type.replace(/_/g, " ")}
          </span>
          {source.publisher && (
            <span className="text-[12px] text-text-secondary">{source.publisher}</span>
          )}
          <FreshnessChip iso={source.retrieved_at} variant="source" />
          <span className="text-[11px] tabular-nums text-text-secondary/60">
            {formatDate(source.retrieved_at)}
          </span>
          {source.last_verification_status === "dead" && (
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive"
              title={
                source.last_verified_at
                  ? `Verified dead on ${formatDate(source.last_verified_at)}`
                  : "Link dead"
              }
            >
              LINK DEAD
            </span>
          )}
        </div>
        <div className="flex items-start gap-1.5 text-[14.5px] font-medium leading-snug text-text-primary">
          <span className="min-w-0 flex-1 truncate">{source.title}</span>
          {source.url && (
            <ArrowUpRight
              size={14}
              className="mt-[3px] shrink-0 text-text-secondary transition-colors group-hover:text-text-primary"
            />
          )}
        </div>
        {source.summary && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-text-secondary">
            {source.summary}
          </p>
        )}
      </div>
    </>
  );

  const baseClass = cn(
    "report-row-tint group flex items-start gap-4 border-t border-border px-5 py-4 text-left transition-colors first:border-0",
    reliabilityTone(source.reliability),
    selected && "report-selected",
  );

  if (source.url) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        onClick={() => onSelect?.(sourceSelection(source))}
        className={baseClass}
      >
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={() => onSelect?.(sourceSelection(source))} className={baseClass}>
      {content}
    </button>
  );
}

export function ReliabilityPill({ reliability }: { reliability: Source["reliability"] }) {
  const accent = reliabilityAccent(reliability);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", accent.dot)} aria-hidden />
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground">
        {reliability}
      </span>
    </span>
  );
}

function reliabilityRank(reliability: Source["reliability"]) {
  switch (reliability) {
    case "primary":
      return 3;
    case "high":
      return 2;
    case "medium":
      return 1;
    default:
      return 0;
  }
}

function reliabilityAccent(reliability: Source["reliability"]) {
  switch (reliability) {
    case "primary":
      return { dot: "bg-[var(--accent-blue)]" };
    case "high":
      return { dot: "bg-[var(--accent-gray)]" };
    case "medium":
      return { dot: "bg-[var(--accent-yellow)]" };
    default:
      return { dot: "bg-[var(--accent-gray)]" };
  }
}

function reliabilityTone(reliability: Source["reliability"]) {
  switch (reliability) {
    case "primary":
      return "report-tone-info";
    case "high":
      return "report-tone-neutral";
    case "medium":
      return "report-tone-warning";
    default:
      return "report-tone-negative";
  }
}
