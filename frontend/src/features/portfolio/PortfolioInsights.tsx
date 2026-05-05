import { useMemo } from "react";
import { MetricExplanationTooltip } from "@/components/ui/MetricExplanationTooltip";
import { cn } from "@/lib/utils";
import { buildExplanationLookup } from "@/shared/lib/explanations";
import type { MetricExplanation, PortfolioHolding } from "@/types";

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

  const weights = holdings
    .map((h) => h.allocation_pct ?? 0)
    .filter((w) => w > 0)
    .sort((a, b) => b - a);

  const top5Weight = weights.slice(0, 5).reduce((a, b) => a + b, 0);
  const top3Weight = weights.slice(0, 3).reduce((a, b) => a + b, 0);
  const largestWeight = weights[0] ?? 0;
  const uniqueMarkets = new Set(holdings.map((h) => h.market ?? "unknown")).size;
  const uniqueCurrencies = new Set(holdings.map((h) => h.currency || baseCurrency)).size;

  const totalMarketValue = holdings.reduce((sum, h) => sum + (h.market_value ?? 0), 0);
  const totalCostBasis = holdings.reduce((sum, h) => sum + (h.cost_basis ?? 0), 0);
  const hasCostBasis = holdings.some((h) => h.cost_basis != null && h.cost_basis > 0);

  const unrealizedPnl =
    hasCostBasis && totalCostBasis > 0
      ? (totalMarketValue - totalCostBasis) / totalCostBasis
      : null;

  const isConcentrated = top5Weight > 0.7;

  const metrics: InsightMetric[] = [
    {
      key: "portfolio:position_count",
      label: "Positions",
      value: String(holdings.length),
    },
    {
      key: "portfolio:concentration_top5",
      label: "Top 5 weight",
      value: `${(top5Weight * 100).toFixed(1)}%`,
      emphasis: isConcentrated,
    },
    {
      key: "portfolio:concentration_top3",
      label: "Top 3 weight",
      value: `${(top3Weight * 100).toFixed(1)}%`,
    },
    {
      key: "portfolio:largest_position",
      label: "Largest position",
      value: `${(largestWeight * 100).toFixed(1)}%`,
      emphasis: largestWeight > 0.15,
    },
    {
      key: "portfolio:currency_exposure",
      label: "Currencies",
      value: String(uniqueCurrencies),
    },
  ];

  if (holdings.some((h) => h.market)) {
    metrics.push({
      key: "portfolio:market_exposure",
      label: "Markets",
      value: String(uniqueMarkets),
    });
  }

  if (unrealizedPnl != null) {
    metrics.push({
      key: "portfolio:unrealized_pnl",
      label: "Unrealized P/L",
      value: `${unrealizedPnl >= 0 ? "+" : ""}${(unrealizedPnl * 100).toFixed(1)}%`,
      emphasis: unrealizedPnl < -0.1,
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
