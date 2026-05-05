import { useMemo } from "react";
import { MetricExplanationTooltip } from "@/components/ui/MetricExplanationTooltip";
import { cn } from "@/lib/utils";
import { buildExplanationLookup } from "@/shared/lib/explanations";
import type { MetricExplanation, PortfolioHolding } from "@/types";
import { computePortfolioSummary } from "./portfolio-explanations";

interface PortfolioInsightsProps {
  holdings: PortfolioHolding[];
  baseCurrency: string;
  explanations: MetricExplanation[];
}

interface InsightMetric {
  key: string;
  label: string;
  value: string;
  emphasis?: boolean;
}

function computeInsights(holdings: PortfolioHolding[], baseCurrency: string): InsightMetric[] {
  if (holdings.length === 0) return [];

  const s = computePortfolioSummary(holdings, baseCurrency);
  const isConcentrated = s.top5Weight > 0.7;

  const metrics: InsightMetric[] = [
    {
      key: "portfolio:position_count",
      label: "Positions",
      value: String(holdings.length),
    },
    {
      key: "portfolio:concentration_top5",
      label: "Top 5 weight",
      value: `${(s.top5Weight * 100).toFixed(1)}%`,
      emphasis: isConcentrated,
    },
    {
      key: "portfolio:concentration_top3",
      label: "Top 3 weight",
      value: `${(s.top3Weight * 100).toFixed(1)}%`,
    },
    {
      key: "portfolio:largest_position",
      label: "Largest position",
      value: `${(s.largestWeight * 100).toFixed(1)}%`,
      emphasis: s.largestWeight > 0.15,
    },
    {
      key: "portfolio:currency_exposure",
      label: "Currencies",
      value: String(s.uniqueCurrencies),
    },
  ];

  if (holdings.some((h) => h.market)) {
    metrics.push({
      key: "portfolio:market_exposure",
      label: "Markets",
      value: String(s.uniqueMarkets),
    });
  }

  if (s.unrealizedPnl != null) {
    metrics.push({
      key: "portfolio:unrealized_pnl",
      label: "Unrealized P/L",
      value: `${s.unrealizedPnl >= 0 ? "+" : ""}${(s.unrealizedPnl * 100).toFixed(1)}%`,
      emphasis: s.unrealizedPnl < -0.1,
    });
  }

  return metrics;
}

export function PortfolioInsights({
  holdings,
  baseCurrency,
  explanations,
}: PortfolioInsightsProps) {
  const explanationLookup = useMemo(() => buildExplanationLookup(explanations), [explanations]);

  const insights = useMemo(() => computeInsights(holdings, baseCurrency), [holdings, baseCurrency]);

  if (insights.length === 0) {
    return (
      <div className="rounded-[10px] border border-border bg-card px-5 py-6 text-sm leading-[1.6] text-muted-foreground">
        Add holdings to see portfolio-level insights.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {insights.map((metric) => {
        const explanation = explanationLookup.get(metric.key);
        return (
          <div key={metric.key} className="rounded-[10px] border border-border bg-card px-4 py-3.5">
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              {explanation ? (
                <MetricExplanationTooltip explanation={explanation}>
                  <span className="cursor-help underline decoration-dotted underline-offset-2">
                    {metric.label}
                  </span>
                </MetricExplanationTooltip>
              ) : (
                metric.label
              )}
            </span>
            <div
              className={cn(
                "mt-1.5 text-[18px] tabular-nums leading-none",
                metric.emphasis ? "font-semibold text-foreground" : "font-medium text-foreground",
              )}
            >
              {explanation ? (
                <MetricExplanationTooltip explanation={explanation}>
                  <span className="cursor-help underline decoration-dotted underline-offset-2">
                    {metric.value}
                  </span>
                </MetricExplanationTooltip>
              ) : (
                metric.value
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
