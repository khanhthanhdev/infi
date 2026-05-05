import { formatMoney } from "@/lib/format";
import type { MetricExplanation, PortfolioHolding } from "@/types";

function uid(key: string): string {
  return `static_portfolio_${key}`;
}

/**
 * Compute portfolio-level summary values used in explanation assessments.
 */
export function computePortfolioSummary(holdings: PortfolioHolding[], baseCurrency: string) {
  const weights = holdings
    .map((h) => h.allocation_pct ?? 0)
    .filter((w) => w > 0)
    .sort((a, b) => b - a);

  const totalMarketValue = holdings.reduce((sum, h) => sum + (h.market_value ?? 0), 0);
  const totalCostBasis = holdings.reduce((sum, h) => sum + (h.cost_basis ?? 0), 0);
  const hasCostBasis = holdings.some((h) => h.cost_basis != null && h.cost_basis > 0);

  const top5Weight = weights.slice(0, 5).reduce((a, b) => a + b, 0);
  const top3Weight = weights.slice(0, 3).reduce((a, b) => a + b, 0);
  const largestWeight = weights[0] ?? 0;
  const uniqueMarkets = new Set(holdings.map((h) => h.market ?? "unknown")).size;
  const uniqueCurrencies = new Set(holdings.map((h) => h.currency || baseCurrency)).size;

  const unrealizedPnl =
    hasCostBasis && totalCostBasis > 0
      ? (totalMarketValue - totalCostBasis) / totalCostBasis
      : null;

  return {
    holdingCount: holdings.length,
    top5Weight,
    top3Weight,
    largestWeight,
    uniqueMarkets,
    uniqueCurrencies,
    totalMarketValue,
    totalCostBasis,
    unrealizedPnl,
    hasCostBasis,
    baseCurrency,
  };
}

function weightAssessment(_largest: number, top5: number, count: number): string {
  if (count === 0) return "No holdings in the portfolio.";
  if (top5 > 0.8)
    return `Top-5 holdings account for ${(top5 * 100).toFixed(0)}% — highly concentrated.`;
  if (top5 > 0.6)
    return `Top-5 holdings account for ${(top5 * 100).toFixed(0)}% — moderately concentrated.`;
  return `Top-5 holdings account for ${(top5 * 100).toFixed(0)}% — well diversified across positions.`;
}

/**
 * Generate static MetricExplanation objects for the portfolio page.
 * These cover both the holdings table columns and computed portfolio-level metrics.
 */
export function getPortfolioExplanations(
  holdings: PortfolioHolding[],
  baseCurrency: string,
): MetricExplanation[] {
  const s = computePortfolioSummary(holdings, baseCurrency);
  const now = new Date().toISOString();

  const make = (key: string, fields: Partial<MetricExplanation>): MetricExplanation => ({
    id: uid(key),
    run_id: "",
    target_type: "portfolio",
    target_key: `portfolio:${key}`,
    display_name: "",
    metric_name: "",
    definition: "",
    meaning: "",
    value_interpretation: "",
    good_threshold: null,
    current_value_assessment: "",
    source_id: null,
    created_at: now,
    ...fields,
  });

  return [
    // ── Holdings table column explanations ──────────────────────────────
    make("weight", {
      display_name: "Portfolio Weight",
      metric_name: "allocation_pct",
      definition: "The percentage of total portfolio value this holding represents.",
      meaning:
        "A higher weight means the holding has more influence on overall portfolio performance. If one position exceeds 10–15%, a large part of your returns depends on that single stock.",
      good_threshold:
        "Most advisors suggest no single position exceeds 10–15% for diversified portfolios. Context-dependent for high-conviction investors.",
      current_value_assessment: weightAssessment(s.largestWeight, s.top5Weight, s.holdingCount),
    }),

    make("market_value", {
      display_name: "Market Value",
      metric_name: "market_value",
      definition:
        "The current total value of this holding, calculated as quantity × current price.",
      meaning:
        "This is what the position is worth today in the market. Compare it to your cost basis to see if you're up or down.",
      good_threshold: null,
      current_value_assessment: `Total portfolio market value is ${formatMoney(s.totalMarketValue, s.baseCurrency)} across ${s.holdingCount} positions.`,
    }),

    make("quantity", {
      display_name: "Quantity",
      metric_name: "quantity",
      definition: "The number of shares or units of this holding you own.",
      meaning:
        "Quantity alone doesn't tell you the size of the position — combine it with price to understand the dollar exposure.",
      good_threshold: null,
      current_value_assessment: `${s.holdingCount} distinct positions in the portfolio.`,
    }),

    make("price", {
      display_name: "Price",
      metric_name: "price",
      definition: "The last known market price per unit of this holding.",
      meaning:
        "Price movements affect your portfolio value. A 10% price drop in a 20%-weighted position moves the whole portfolio by 2%.",
      good_threshold: null,
      current_value_assessment: "Current market price per unit.",
    }),

    make("price_change_30d", {
      display_name: "30-Day Price Change",
      metric_name: "price_change_30d",
      definition: "How the holding's price has moved over the last 30 calendar days.",
      meaning:
        "Shows recent momentum. A consistent uptrend may indicate positive sentiment; a sharp drop may signal a catalyst or broader market weakness.",
      good_threshold: null,
      current_value_assessment: "Shown as a sparkline in the 30d column.",
    }),

    // ── Portfolio-level computed metrics ────────────────────────────────
    make("concentration_top5", {
      display_name: "Concentration (Top 5)",
      metric_name: "concentration_top5",
      definition: "The combined portfolio weight of the five largest holdings.",
      meaning:
        "A high top-5 concentration means a few positions drive most of the portfolio's returns and risk. Lower concentration generally means more diversification.",
      good_threshold:
        "Below 50% is well diversified; 50–70% is moderate; above 70% is concentrated.",
      current_value_assessment:
        s.holdingCount === 0
          ? "No holdings to assess."
          : `Top-5 holdings represent ${(s.top5Weight * 100).toFixed(1)}% of the portfolio.`,
    }),

    make("concentration_top3", {
      display_name: "Concentration (Top 3)",
      metric_name: "concentration_top3",
      definition: "The combined portfolio weight of the three largest holdings.",
      meaning:
        "An even tighter view of concentration. If the top 3 positions account for more than half the portfolio, idiosyncratic risk is high.",
      good_threshold:
        "Below 35% is well diversified; 35–55% is moderate; above 55% is concentrated.",
      current_value_assessment:
        s.holdingCount === 0
          ? "No holdings to assess."
          : `Top-3 holdings represent ${(s.top3Weight * 100).toFixed(1)}% of the portfolio.`,
    }),

    make("largest_position", {
      display_name: "Largest Position",
      metric_name: "largest_position",
      definition: "The portfolio weight of the single largest holding.",
      meaning:
        "A very large position increases single-name risk. If it drops 20%, the portfolio impact is proportional to its weight.",
      good_threshold:
        "Below 5% is conservative; 5–10% is common for active portfolios; above 15% is high conviction or concentrated.",
      current_value_assessment:
        s.holdingCount === 0
          ? "No holdings to assess."
          : `Largest position is ${(s.largestWeight * 100).toFixed(1)}% of the portfolio.`,
    }),

    make("position_count", {
      display_name: "Position Count",
      metric_name: "position_count",
      definition: "The total number of distinct holdings in the portfolio.",
      meaning:
        "More positions generally mean more diversification, but there are diminishing benefits beyond 20–30 stocks for equity portfolios.",
      good_threshold:
        "1–10 is concentrated; 15–30 is typical for active equity; 50+ approaches index-like diversification.",
      current_value_assessment: `The portfolio holds ${s.holdingCount} position${s.holdingCount === 1 ? "" : "s"}.`,
    }),

    make("currency_exposure", {
      display_name: "Currency Exposures",
      metric_name: "currency_exposure",
      definition: "The number of distinct currencies across all holdings.",
      meaning:
        "Multi-currency portfolios carry currency risk — exchange rate movements can add to or erode returns independent of the underlying assets.",
      good_threshold:
        "Single-currency is simplest to manage; multi-currency adds diversification but introduces FX risk.",
      current_value_assessment: `Holdings are denominated in ${s.uniqueCurrencies} different currenc${s.uniqueCurrencies === 1 ? "y" : "ies"}.`,
    }),

    make("unrealized_pnl", {
      display_name: "Unrealized P/L",
      metric_name: "unrealized_pnl",
      definition:
        "The gain or loss across all holdings relative to their original purchase cost, expressed as a percentage.",
      meaning:
        "Shows how the portfolio has performed since purchase. Positive means the portfolio is worth more than what was paid; negative means it's worth less. This is 'on paper' — the gain or loss is only realized when positions are sold.",
      good_threshold: null,
      current_value_assessment:
        s.unrealizedPnl != null
          ? `Portfolio is ${s.unrealizedPnl >= 0 ? "up" : "down"} ${(Math.abs(s.unrealizedPnl) * 100).toFixed(1)}% from cost basis.`
          : "Cost basis data not available for all holdings.",
    }),
  ];
}
