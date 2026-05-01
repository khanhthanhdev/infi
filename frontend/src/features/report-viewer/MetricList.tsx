import { memo } from "react";
import { FreshnessChip } from "@/components/ui/editorial";
import { MetricExplanationTooltip } from "@/components/ui/MetricExplanationTooltip";
import { cn } from "@/lib/utils";
import type { Entity, MetricExplanation, MetricSnapshot, Source } from "@/types";
import { MetricDelta } from "./MetricDelta";
import { metricSelection, type SelectionProps } from "./selection";

interface MetricListProps extends SelectionProps {
  metrics: MetricSnapshot[];
  entityMap: Map<string, Entity>;
  sourceMap: Map<string, Source>;
  explanations?: MetricExplanation[];
}

export const MetricList = memo(function MetricList({
  metrics,
  entityMap,
  sourceMap,
  selectedId,
  onSelect,
  explanations = [],
}: MetricListProps) {
  const explanationMap = new Map(
    explanations
      .filter((e) => e.target_type === "metric")
      .map((e) => [e.target_key || normalizeExplanationKey(e.metric_name), e]),
  );

  if (metrics.length === 0) return null;

  return (
    <div className="rounded-[10px] border border-[#e7e9ee] bg-white">
      {metrics.map((metric, index) => {
        const entity = metric.entity_id ? entityMap.get(metric.entity_id) : null;
        const source = sourceMap.get(metric.source_id);
        const explanation = explanationMap.get(normalizeExplanationKey(metric.metric));
        const metricLabel = formatMetric(metric.metric);

        return (
          <button
            type="button"
            key={metric.id}
            onClick={() => onSelect?.(metricSelection(metric, source))}
            className={cn(
              "report-row-tint grid w-full grid-cols-[3ch_minmax(0,1fr)_auto] items-baseline gap-4 border-t border-[#e7e9ee] px-5 py-3.5 text-left transition-colors first:border-0",
              metricTone(metric.change_pct),
              selectedId === `metric:${metric.id}` && "report-selected",
            )}
          >
            <span className="font-mono text-[10.5px] tabular-nums text-[#3f4653]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                {explanation ? (
                  <MetricExplanationTooltip explanation={explanation}>
                    <span className="cursor-help text-[14px] font-medium text-[#111827] underline decoration-dotted underline-offset-2">
                      {metricLabel}
                    </span>
                  </MetricExplanationTooltip>
                ) : (
                  <span className="text-[14px] font-medium text-[#111827]">{metricLabel}</span>
                )}
                {entity && (
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]/80">
                    {entity.symbol || entity.name}
                  </span>
                )}
                {metric.period && (
                  <span className="font-mono text-[10.5px] tabular-nums text-[#3f4653]">
                    {metric.period}
                  </span>
                )}
                <FreshnessChip iso={metric.as_of} variant="metric" />
              </div>
              {source && (
                <div className="font-mono text-[10.5px] tabular-nums text-[#3f4653]/80">
                  {source.title}
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-2 whitespace-nowrap text-right">
              {(() => {
                const { value, suffix } = formatMetricValue(metric.numeric_value, metric.unit);
                return (
                  <>
                    <span className="font-mono text-[14px] tabular-nums text-[#111827]">
                      {value}
                    </span>
                    {suffix && (
                      <span className="font-mono text-[10.5px] tabular-nums text-[#3f4653]">
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

function normalizeExplanationKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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
