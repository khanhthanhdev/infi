import { memo } from "react";
import { Eyebrow, FreshnessChip } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";
import type { Entity, MetricSnapshot, Source } from "@/types";
import { MetricDelta } from "./MetricDelta";
import { metricSelection, type SelectionProps } from "./selection";

interface MetricListProps extends SelectionProps {
  metrics: MetricSnapshot[];
  entityMap: Map<string, Entity>;
  sourceMap: Map<string, Source>;
}

export const MetricList = memo(function MetricList({
  metrics,
  entityMap,
  sourceMap,
  selectedId,
  onSelect,
}: MetricListProps) {
  if (metrics.length === 0) return null;

  return (
    <div className="divide-y divide-border border-y border-border">
      {metrics.map((metric, index) => {
        const entity = metric.entity_id ? entityMap.get(metric.entity_id) : null;
        const source = sourceMap.get(metric.source_id);
        return (
          <button
            type="button"
            key={metric.id}
            onClick={() => onSelect?.(metricSelection(metric, source))}
            className={cn(
              "report-row-tint grid w-full grid-cols-[3ch_minmax(0,1fr)_auto] items-baseline gap-4 px-3 py-3 text-left transition-colors",
              metricTone(metric.change_pct),
              selectedId === `metric:${metric.id}` && "report-selected",
            )}
          >
            <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[14px] font-medium text-foreground">
                  {formatMetric(metric.metric)}
                </span>
                {entity && (
                  <Eyebrow className="text-muted-foreground/80">
                    {entity.symbol || entity.name}
                  </Eyebrow>
                )}
                {metric.period && (
                  <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
                    {metric.period}
                  </span>
                )}
                <FreshnessChip iso={metric.as_of} variant="metric" />
              </div>
              {source && (
                <div className="font-mono text-[10.5px] tabular-nums text-muted-foreground/80">
                  {source.title}
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-2 whitespace-nowrap text-right">
              {(() => {
                const { value, suffix } = formatMetricValue(metric.numeric_value, metric.unit);
                return (
                  <>
                    <span className="font-mono text-[14px] tabular-nums text-foreground">
                      {value}
                    </span>
                    {suffix && (
                      <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
                        {suffix}
                      </span>
                    )}
                  </>
                );
              })()}
              <MetricDelta changePct={metric.change_pct} priorValue={metric.prior_value} />
            </div>
          </button>
        );
      })}
    </div>
  );
});

function metricTone(changePct: number | null): string {
  if (changePct == null || changePct === 0) return "report-tone-neutral";
  return changePct > 0 ? "report-tone-positive" : "report-tone-negative";
}

function formatMetric(metric: string) {
  return metric.replace(/_/g, " ");
}

function formatNumeric(value: number): string {
  const abs = Math.abs(value);
  const maxFractionDigits = abs >= 1000 ? 0 : abs >= 10 ? 1 : 2;
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

export function formatMetricValue(
  value: number,
  unit: string | null,
): { value: string; suffix: string | null } {
  if (!unit) return { value: formatNumeric(value), suffix: null };
  const u = unit.trim();
  if (u === "") return { value: formatNumeric(value), suffix: null };
  if (u === "%") return { value: `${formatNumeric(value)}%`, suffix: null };
  if (u.toUpperCase() === "USD") {
    const abs = Math.abs(value);
    const maxFractionDigits = abs >= 1000 ? 0 : abs >= 10 ? 1 : 2;
    return {
      value: new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: maxFractionDigits,
      }).format(value),
      suffix: null,
    };
  }
  if (u === "x" || u === "X") {
    return { value: `${formatNumeric(value)}x`, suffix: null };
  }
  return { value: formatNumeric(value), suffix: u };
}
