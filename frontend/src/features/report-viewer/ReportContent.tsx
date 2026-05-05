import { ChartLineUp } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SectionHeader } from "@/components/ui/editorial";
import { MetricExplanationTooltip } from "@/components/ui/MetricExplanationTooltip";
import { getAnalysisReport, getStanceStaleMetrics, setActiveRun } from "@/shared/api/commands";
import { setSelectedReport, useAppStore } from "@/store";
import type {
  AllocationReview,
  AnalysisReport,
  Entity,
  HoldingReview,
  MetricExplanation,
  PortfolioExpectedReturnModel,
  PortfolioRisk,
  PortfolioScenarioAnalysis,
  RebalancingSuggestion,
  Source,
} from "@/types";
import { AnalysisSection } from "./AnalysisSection";
import { ArgumentSpine } from "./ArgumentSpine";
import { buildExplanationLookup } from "./explanation-utils";
import { MetricList } from "./MetricList";
import { ProjectionView } from "./ProjectionView";
import { ReportContextTray } from "./ReportContextTray";
import { ReportHero } from "./ReportHero";
import { SourceList } from "./SourceList";
import { StructuredArtifactView } from "./StructuredArtifactView";
import type { ReportSelection } from "./selection";

interface ReportContentProps {
  onAskFollowUp?: (prompt: string) => void;
}

export function ReportContent({ onAskFollowUp }: ReportContentProps = {}) {
  const report = useAppStore((state) => state.selectedReport);
  const selectedAnalysisId = useAppStore((state) => state.selectedAnalysisId);
  const [selection, setSelection] = useState<ReportSelection | null>(null);
  const sourceMap = useMemo(
    () =>
      report
        ? new Map<string, Source>(report.sources.map((s) => [s.id, s]))
        : new Map<string, Source>(),
    [report?.sources, report],
  );
  const entityMap = useMemo(
    () =>
      report
        ? new Map<string, Entity>(report.entities.map((e) => [e.id, e]))
        : new Map<string, Entity>(),
    [report?.entities, report],
  );

  const analysisId = report?.analysis.id;
  const switchRun = useCallback(
    async (runId: string) => {
      if (!analysisId) return;
      await setActiveRun(analysisId, runId);
      const updated = await getAnalysisReport(analysisId, runId);
      setSelectedReport(updated);
    },
    [analysisId],
  );

  if (!selectedAnalysisId) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-text-secondary">
        <ChartLineUp size={32} className="mb-4 opacity-20" />
        <p>No report selected.</p>
      </div>
    );
  }

  if (!report) {
    return <div className="flex h-full items-center justify-center text-sm">Loading report...</div>;
  }

  const plan = report.research_plan;
  const isPortfolio = report.analysis.intent === "portfolio";
  const hasProjections = report.projections.length > 0;
  const hasMetrics = report.metrics.length > 0;
  const hasEvidence = report.artifacts.length > 0;
  const hasAnalysis = report.blocks.length > 0;
  const hasSources = report.sources.length > 0;
  const hasHoldingReviews = isPortfolio && report.holding_reviews.length > 0;
  const hasAllocation = isPortfolio && report.allocation_reviews.length > 0;
  const hasPortfolioRisk = isPortfolio && report.portfolio_risks.length > 0;
  const hasRebalancing = isPortfolio && report.rebalancing_suggestions.length > 0;
  const hasPortfolioOutcomes =
    isPortfolio &&
    (report.portfolio_scenario_analyses.length > 0 ||
      report.portfolio_expected_return_models.length > 0);

  const sectionFlags: SectionFlags = {
    hasProjections,
    hasPortfolioOutcomes,
    hasHoldingReviews,
    hasAllocation,
    hasPortfolioRisk,
    hasRebalancing,
    hasMetrics,
    hasEvidence,
    hasAnalysis,
    hasSources,
  };

  const firstSectionKey = firstSection(sectionFlags);
  const sectionHeaderClass = (key: SectionKey) =>
    [sectionTone(key), "report-section-heading", key === firstSectionKey ? "border-t-0 pt-8" : ""]
      .filter(Boolean)
      .join(" ");

  const selectedId = selection?.id ?? null;

  return (
    <div className="report-surface mx-auto grid max-w-7xl gap-8 px-8 pb-32 xl:grid-cols-[minmax(0,1fr)_320px]">
      <article className="min-w-0">
        <div className="pt-10 pb-14">
          <ReportHero report={report} onSwitchRun={switchRun} />
        </div>

        <StaleStanceBanner report={report} />

        {report.final_stance && (
          <section className="pb-14">
            <ArgumentSpine stance={report.final_stance} />
          </section>
        )}

        {plan?.decision_criteria?.length ? (
          <section className="pb-12">
            <DecisionCriteria criteria={plan.decision_criteria} />
          </section>
        ) : null}

        {(hasProjections ||
          hasPortfolioOutcomes ||
          hasMetrics ||
          hasEvidence ||
          hasAnalysis ||
          hasSources) && <SectionJumpNav {...sectionFlags} />}

        {hasPortfolioOutcomes && (
          <section className="space-y-8 pb-16">
            <SectionHeader
              number={sectionNumber(sectionFlags, "outcomes")}
              label="Outcomes"
              title="Scenarios and model"
              id="outcomes"
              className={sectionHeaderClass("outcomes")}
            />
            <PortfolioOutcomesView
              scenarios={report.portfolio_scenario_analyses}
              models={report.portfolio_expected_return_models}
            />
          </section>
        )}

        {hasProjections && (
          <section className="space-y-8 pb-16">
            <SectionHeader
              number={sectionNumber(sectionFlags, "projections")}
              label="Projection"
              title="Forward view"
              meta={
                <span className="tabular-nums">
                  {report.projections.length.toString().padStart(2, "0")}{" "}
                  {report.projections.length === 1 ? "target" : "targets"}
                </span>
              }
              id="projections"
              className={sectionHeaderClass("projections")}
            />
            <ProjectionView
              projections={report.projections}
              entityMap={entityMap}
              sourceMap={sourceMap}
              selectedId={selectedId}
              onSelect={setSelection}
              explanations={report.explanations}
            />
          </section>
        )}

        {hasHoldingReviews && (
          <section className="space-y-8 pb-16">
            <SectionHeader
              number={sectionNumber(sectionFlags, "holdings")}
              label="Holdings"
              title="Position-by-position review"
              meta={
                <span className="tabular-nums">
                  {report.holding_reviews.length.toString().padStart(2, "0")} reviewed
                </span>
              }
              id="holdings"
              className={sectionHeaderClass("holdings")}
            />
            <HoldingReviewList
              reviews={report.holding_reviews}
              entityMap={entityMap}
              explanations={report.explanations}
            />
          </section>
        )}

        {hasAllocation && (
          <section className="space-y-8 pb-16">
            <SectionHeader
              number={sectionNumber(sectionFlags, "allocation")}
              label="Allocation"
              title="Portfolio composition"
              id="allocation"
              className={sectionHeaderClass("allocation")}
            />
            {report.allocation_reviews.map((review) => (
              <AllocationReviewView
                key={review.id}
                review={review}
                explanations={report.explanations}
              />
            ))}
          </section>
        )}

        {hasPortfolioRisk && (
          <section className="space-y-8 pb-16">
            <SectionHeader
              number={sectionNumber(sectionFlags, "risk")}
              label="Risk"
              title="Portfolio risk"
              id="risk"
              className={sectionHeaderClass("risk")}
            />
            {report.portfolio_risks.map((risk) => (
              <PortfolioRiskView key={risk.id} risk={risk} explanations={report.explanations} />
            ))}
          </section>
        )}

        {hasRebalancing && (
          <section className="space-y-8 pb-16">
            <SectionHeader
              number={sectionNumber(sectionFlags, "rebalancing")}
              label="Rebalancing"
              title="Rebalancing scenarios"
              id="rebalancing"
              className={sectionHeaderClass("rebalancing")}
            />
            {report.rebalancing_suggestions.map((suggestion) => (
              <RebalancingView
                key={suggestion.id}
                suggestion={suggestion}
                explanations={report.explanations}
              />
            ))}
          </section>
        )}

        {hasMetrics && (
          <section className="space-y-8 pb-16">
            <SectionHeader
              number={sectionNumber(sectionFlags, "metrics")}
              label="Metrics"
              title="Data points"
              meta={
                <span className="tabular-nums">
                  {report.metrics.length.toString().padStart(2, "0")} tracked
                </span>
              }
              id="metrics"
              className={sectionHeaderClass("metrics")}
            />
            <MetricList
              metrics={report.metrics}
              entityMap={entityMap}
              sourceMap={sourceMap}
              selectedId={selectedId}
              onSelect={setSelection}
              explanations={report.explanations}
            />
          </section>
        )}

        {hasEvidence && (
          <section className="space-y-2 pb-16">
            <SectionHeader
              number={sectionNumber(sectionFlags, "evidence")}
              label="Evidence"
              title="Structured evidence"
              meta={
                <span className="tabular-nums">
                  {report.artifacts.length.toString().padStart(2, "0")} artifacts
                </span>
              }
              id="evidence"
              className={sectionHeaderClass("evidence")}
            />
            <div>
              {report.artifacts.map((artifact, index) => (
                <StructuredArtifactView
                  key={artifact.id}
                  artifact={artifact}
                  isFirst={index === 0}
                  selectedId={selectedId}
                  onSelect={setSelection}
                  explanations={report.explanations}
                />
              ))}
            </div>
          </section>
        )}

        {hasAnalysis && (
          <section className="space-y-8 pb-16">
            <SectionHeader
              number={sectionNumber(sectionFlags, "analysis")}
              label="Analysis"
              title="The deeper read"
              meta={
                <span className="tabular-nums">
                  {report.blocks.length.toString().padStart(2, "0")} blocks
                </span>
              }
              id="analysis"
              className={sectionHeaderClass("analysis")}
            />
            <AnalysisSection
              blocks={report.blocks}
              sourceMap={sourceMap}
              explanations={report.explanations}
              selectedId={selectedId}
              onSelect={setSelection}
            />
          </section>
        )}

        {hasSources && (
          <section className="space-y-8 pb-16">
            <SectionHeader
              number={sectionNumber(sectionFlags, "sources")}
              label="Sources"
              title="Bibliography"
              meta={
                <span className="tabular-nums">
                  {report.sources.length.toString().padStart(2, "0")} cited
                </span>
              }
              id="sources"
              className={sectionHeaderClass("sources")}
            />
            <SourceList sources={report.sources} selectedId={selectedId} onSelect={setSelection} />
          </section>
        )}
      </article>
      <div className="hidden pt-28 xl:block">
        <ReportContextTray
          selection={selection}
          sourceMap={sourceMap}
          onClear={() => setSelection(null)}
          onAsk={onAskFollowUp}
        />
      </div>
      {selection && (
        <div className="xl:hidden">
          <ReportContextTray
            selection={selection}
            sourceMap={sourceMap}
            onClear={() => setSelection(null)}
            onAsk={onAskFollowUp}
          />
        </div>
      )}
    </div>
  );
}

type SectionFlags = {
  hasProjections: boolean;
  hasPortfolioOutcomes: boolean;
  hasHoldingReviews: boolean;
  hasAllocation: boolean;
  hasPortfolioRisk: boolean;
  hasRebalancing: boolean;
  hasMetrics: boolean;
  hasEvidence: boolean;
  hasAnalysis: boolean;
  hasSources: boolean;
};

type SectionKey =
  | "outcomes"
  | "projections"
  | "holdings"
  | "allocation"
  | "risk"
  | "rebalancing"
  | "metrics"
  | "evidence"
  | "analysis"
  | "sources";

const SECTION_ORDER: SectionKey[] = [
  "outcomes",
  "projections",
  "holdings",
  "allocation",
  "risk",
  "rebalancing",
  "metrics",
  "evidence",
  "analysis",
  "sources",
];

function presentSections(flags: SectionFlags): SectionKey[] {
  const present = new Set<SectionKey>();
  if (flags.hasPortfolioOutcomes) present.add("outcomes");
  if (flags.hasProjections) present.add("projections");
  if (flags.hasHoldingReviews) present.add("holdings");
  if (flags.hasAllocation) present.add("allocation");
  if (flags.hasPortfolioRisk) present.add("risk");
  if (flags.hasRebalancing) present.add("rebalancing");
  if (flags.hasMetrics) present.add("metrics");
  if (flags.hasEvidence) present.add("evidence");
  if (flags.hasAnalysis) present.add("analysis");
  if (flags.hasSources) present.add("sources");
  return SECTION_ORDER.filter((key) => present.has(key));
}

function sectionNumber(flags: SectionFlags, which: SectionKey): string {
  const idx = presentSections(flags).indexOf(which);
  return String(idx + 1).padStart(2, "0");
}

function StaleStanceBanner({ report }: { report: AnalysisReport }) {
  const [stale, setStale] = useState<string[]>([]);
  const analysisId = report.analysis.id;
  const activeRunId = report.analysis.active_run_id;
  useEffect(() => {
    let cancelled = false;
    getStanceStaleMetrics(analysisId, activeRunId ?? undefined)
      .then((names) => {
        if (!cancelled) setStale(names);
      })
      .catch(() => {
        if (!cancelled) setStale([]);
      });
    return () => {
      cancelled = true;
    };
  }, [analysisId, activeRunId]);

  if (stale.length === 0) return null;
  return (
    <section className="report-callout report-tone-negative mb-8 border-t px-4 py-4">
      <a
        href="#metrics"
        className="flex items-baseline justify-between gap-4 text-destructive transition-opacity hover:opacity-80"
      >
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive">
            Data freshness
          </span>
          <span className="text-[14px] font-medium leading-snug text-text-primary">
            {stale.length} metric{stale.length === 1 ? "" : "s"} used in this stance are over the
            freshness cap.
          </span>
        </div>
        <span className="text-[11px] tabular-nums uppercase tracking-[0.18em] text-text-secondary">
          Jump to metrics ↓
        </span>
      </a>
    </section>
  );
}

function firstSection(flags: SectionFlags): SectionKey | null {
  const seq = presentSections(flags);
  return seq[0] ?? null;
}

function DecisionCriteria({ criteria }: { criteria: string[] }) {
  return (
    <div className="report-callout report-tone-info flex flex-col gap-3 border-t px-4 py-5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
        Decision criteria
      </span>
      <ol className="divide-y divide-border/60 text-[13.5px] text-text-primary/85">
        {criteria.map((criterion, index) => (
          <li key={criterion} className="flex items-baseline gap-3 py-2 first:pt-0 last:pb-0">
            <span className="shrink-0 text-[11px] tabular-nums text-text-secondary">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="leading-[1.55]">{criterion.replace(/^\s*\d+[.)]\s+/, "")}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SectionJumpNav(flags: SectionFlags) {
  const items: { href: string; label: string; tone: string }[] = [];
  if (flags.hasPortfolioOutcomes)
    items.push({ href: "#outcomes", label: "Outcomes", tone: sectionTone("outcomes") });
  if (flags.hasProjections)
    items.push({ href: "#projections", label: "Projection", tone: sectionTone("projections") });
  if (flags.hasHoldingReviews)
    items.push({ href: "#holdings", label: "Holdings", tone: sectionTone("holdings") });
  if (flags.hasAllocation)
    items.push({ href: "#allocation", label: "Allocation", tone: sectionTone("allocation") });
  if (flags.hasPortfolioRisk)
    items.push({ href: "#risk", label: "Risk", tone: sectionTone("risk") });
  if (flags.hasRebalancing)
    items.push({ href: "#rebalancing", label: "Rebalancing", tone: sectionTone("rebalancing") });
  if (flags.hasMetrics)
    items.push({ href: "#metrics", label: "Metrics", tone: sectionTone("metrics") });
  if (flags.hasEvidence)
    items.push({ href: "#evidence", label: "Evidence", tone: sectionTone("evidence") });
  if (flags.hasAnalysis)
    items.push({ href: "#analysis", label: "Analysis", tone: sectionTone("analysis") });
  if (flags.hasSources)
    items.push({ href: "#sources", label: "Sources", tone: sectionTone("sources") });

  return (
    <nav className="report-section-nav sticky top-11 z-20 -mx-8 mb-8 flex h-12 items-center border-b border-border bg-card/95 px-8 backdrop-blur-xl">
      <div className="flex items-center gap-6">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
          Contents
        </span>
        <div className="flex items-center gap-5 text-[12.5px]">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`report-jump-link ${item.tone} transition-colors`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

function sectionTone(key: SectionKey): string {
  switch (key) {
    case "outcomes":
      return "report-tone-info";
    case "projections":
      return "report-tone-info";
    case "holdings":
      return "report-tone-neutral";
    case "allocation":
      return "report-tone-info";
    case "risk":
      return "report-tone-negative";
    case "rebalancing":
      return "report-tone-warning";
    case "metrics":
      return "report-tone-info";
    case "evidence":
      return "report-tone-neutral";
    case "analysis":
      return "report-tone-info";
    case "sources":
      return "report-tone-neutral";
  }
}

function PortfolioOutcomesView({
  scenarios,
  models,
}: {
  scenarios: PortfolioScenarioAnalysis[];
  models: PortfolioExpectedReturnModel[];
}) {
  return (
    <div className="space-y-10">
      {scenarios.map((analysis) => (
        <article
          key={analysis.id}
          className="space-y-6 rounded-[10px] border border-border bg-card p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
                Scenario analysis
              </span>
              <p>{analysis.methodology}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
              <span>{analysis.horizon}</span>
              <span>{analysis.base_currency}</span>
              <span>conf {(analysis.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="divide-y divide-border rounded-[6px] border border-border">
            <div className="grid grid-cols-[92px_90px_100px_minmax(0,1fr)] gap-4 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
              <span>Case</span>
              <span className="text-right">Prob.</span>
              <span className="text-right">Return</span>
              <span className="whitespace-nowrap">Read-through</span>
            </div>
            {[...analysis.scenarios]
              .sort((a, b) => scenarioRank(a.label) - scenarioRank(b.label))
              .map((scenario) => (
                <div
                  key={scenario.label}
                  className="grid grid-cols-[92px_90px_100px_minmax(0,1fr)] gap-4 px-4 py-3.5 text-[13.5px]"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary">
                    {scenario.label}
                  </span>
                  <span className="text-right tabular-nums text-text-primary">
                    {formatPercent(scenario.probability)}
                  </span>
                  <span className="text-right tabular-nums text-text-primary">
                    {formatSignedPercent(scenario.portfolio_return_pct)}
                  </span>
                  <span className="space-y-2 text-text-primary/80">
                    <span className="block leading-[1.55]">{scenario.rationale}</span>
                    {scenario.key_drivers.length > 0 && (
                      <span className="block text-text-secondary">
                        Drivers: {scenario.key_drivers.join("; ")}
                      </span>
                    )}
                    {scenario.watch_indicators.length > 0 && (
                      <span className="block text-text-secondary">
                        Watch: {scenario.watch_indicators.join("; ")}
                      </span>
                    )}
                  </span>
                </div>
              ))}
          </div>

          {analysis.stress_cases.length > 0 && (
            <div className="space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
                Stress cases
              </span>
              <div className="divide-y divide-border rounded-[6px] border border-border">
                {analysis.stress_cases.map((stress) => (
                  <div
                    key={stress.name}
                    className="grid gap-4 px-4 py-3.5 text-[13.5px] sm:grid-cols-[minmax(160px,1fr)_90px_minmax(0,1fr)]"
                  >
                    <span className="text-text-primary">{stress.name}</span>
                    <span className="tabular-nums text-text-primary sm:text-right">
                      {formatSignedPercent(stress.estimated_return_pct)}
                    </span>
                    <span className="space-y-1 text-text-primary/80">
                      <span className="block leading-[1.55]">{stress.rationale}</span>
                      <span className="block text-text-secondary">
                        Exposures: {stress.affected_exposures.join("; ")}
                      </span>
                      <span className="block text-text-secondary">
                        Mitigants: {stress.mitigants.join("; ")}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.key_assumptions.length > 0 && (
            <CompactList label="Key assumptions" items={analysis.key_assumptions} />
          )}
        </article>
      ))}

      {models.map((model) => (
        <article
          key={model.id}
          className="space-y-6 rounded-[10px] border border-border bg-card p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
                Expected-return model
              </span>
              <p>{model.summary}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
              <span>{model.model_type.replaceAll("_", " ")}</span>
              <span>{model.horizon}</span>
              <span>conf {(model.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="grid gap-4 rounded-[6px] border border-border p-4 sm:grid-cols-2">
            <MetricPair
              label="Expected return"
              value={formatSignedPercent(model.expected_return_pct)}
            />
            <MetricPair
              label="Volatility"
              value={
                model.volatility_pct == null ? "not modeled" : formatPercent(model.volatility_pct)
              }
            />
          </div>

          <div className="divide-y divide-border rounded-[6px] border border-border">
            <div className="grid grid-cols-[minmax(150px,1fr)_80px_90px_90px_minmax(0,1fr)] gap-4 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
              <span>Input</span>
              <span className="text-right">Weight</span>
              <span className="text-right">Return</span>
              <span className="text-right">Vol.</span>
              <span>Rationale</span>
            </div>
            {model.inputs.map((input) => (
              <div
                key={`${input.input_type}-${input.name}`}
                className="grid grid-cols-[minmax(150px,1fr)_80px_90px_90px_minmax(0,1fr)] gap-4 px-4 py-3.5 text-[13.5px]"
              >
                <span className="text-text-primary">
                  {input.name}
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                    {input.input_type}
                  </span>
                </span>
                <span className="text-right tabular-nums text-text-primary">
                  {formatPercent(input.weight)}
                </span>
                <span className="text-right tabular-nums text-text-primary">
                  {formatSignedPercent(input.expected_return_pct)}
                </span>
                <span className="text-right tabular-nums text-text-primary">
                  {input.volatility_pct == null ? "—" : formatPercent(input.volatility_pct)}
                </span>
                <span className="text-text-primary/75">{input.rationale}</span>
              </div>
            ))}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <CompactList label="Correlation assumptions" items={model.correlation_assumptions} />
            <CompactList label="Limitations" items={model.limitations} />
          </div>
        </article>
      ))}
    </div>
  );
}

function MetricPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
        {label}
      </span>
      <div className="text-[18px] tabular-nums text-text-primary">{value}</div>
    </div>
  );
}

function CompactList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
        {label}
      </span>
      <ul className="space-y-1.5 text-[13.5px] leading-[1.55] text-text-primary/85">
        {items.map((item, index) => (
          <li key={`${label}-${index}-${item.slice(0, 20)}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function scenarioRank(label: string) {
  if (label === "bull") return 0;
  if (label === "base") return 1;
  if (label === "bear") return 2;
  return 3;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  const pct = value * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function HoldingReviewList({
  reviews,
  entityMap,
  explanations = [],
}: {
  reviews: HoldingReview[];
  entityMap: Map<string, Entity>;
  explanations?: MetricExplanation[];
}) {
  const explanationLookup = useMemo(() => buildExplanationLookup(explanations), [explanations]);
  const sorted = [...reviews].sort((a, b) => a.display_order - b.display_order);
  return (
    <div className="rounded-[10px] border border-border bg-card">
      {sorted.map((review) => {
        const entity = entityMap.get(review.entity_id);
        const heading = entity?.name ?? review.entity_id;
        const symbol = entity?.symbol ?? review.entity_id;
        const stanceExplanation = explanationLookup.get(`portfolio:${review.id}:stance`);
        return (
          <article key={review.id} className="border-t border-border p-6 first:border-0">
            <header className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                  {symbol}
                </span>
                <h3 className="text-[17px] font-medium leading-[1.3] text-text-primary">
                  {heading}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {stanceExplanation ? (
                  <MetricExplanationTooltip explanation={stanceExplanation}>
                    <span className="cursor-help rounded-full border border-[var(--accent-blue)] bg-[var(--accent-blue-light)] px-2.5 py-0.5 text-[var(--accent-blue)] underline decoration-dotted underline-offset-2">
                      {review.stance}
                    </span>
                  </MetricExplanationTooltip>
                ) : (
                  <span className="rounded-full border border-[var(--accent-blue)] bg-[var(--accent-blue-light)] px-2.5 py-0.5 text-[var(--accent-blue)]">
                    {review.stance}
                  </span>
                )}
                <span className="tabular-nums">conf {(review.confidence * 100).toFixed(0)}%</span>
                <span>{review.importance}</span>
              </div>
            </header>
            <p className="mt-3 text-[14.5px] leading-[1.55] text-text-primary/85">
              {review.rationale}
            </p>
            <ReasonRiskGrid reasons={review.key_reasons} risks={review.key_risks} />
            {review.evidence_ids.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                <span>Sources</span>
                {review.evidence_ids.map((id) => (
                  <span key={id} className="rounded-[4px] border border-border px-1.5 py-0.5">
                    {id}
                  </span>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ReasonRiskGrid({ reasons, risks }: { reasons: string[]; risks: string[] }) {
  if (reasons.length === 0 && risks.length === 0) return null;
  return (
    <div className="mt-4 grid gap-5 rounded-[6px] border border-border p-4 sm:grid-cols-2">
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
          Key reasons
        </span>
        <ul className="space-y-1.5 text-[13.5px] leading-[1.55]">
          {reasons.map((reason, index) => (
            <li key={`r-${index}-${reason.slice(0, 20)}`} className="text-text-primary/85">
              {reason}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
          Key risks
        </span>
        <ul className="space-y-1.5 text-[13.5px] leading-[1.55]">
          {risks.map((risk, index) => (
            <li key={`k-${index}-${risk.slice(0, 20)}`} className="text-text-primary/85">
              {risk}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AllocationReviewView({
  review,
  explanations = [],
}: {
  review: AllocationReview;
  explanations?: MetricExplanation[];
}) {
  const explanationLookup = useMemo(() => buildExplanationLookup(explanations), [explanations]);
  return (
    <div className="space-y-6 rounded-[10px] border border-border bg-card p-6">
      <p>{review.summary}</p>
      <div className="space-y-8">
        {review.dimensions.map((dimension) => {
          const dimensionExplanation = explanationLookup.get(
            `portfolio:allocation:${review.id}:${dimension.dimension}`,
          );
          return (
            <div key={dimension.dimension} className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                {dimensionExplanation ? (
                  <MetricExplanationTooltip explanation={dimensionExplanation}>
                    <span className="cursor-help text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)] underline decoration-dotted underline-offset-2">
                      {dimension.dimension.replaceAll("_", " ")}
                    </span>
                  </MetricExplanationTooltip>
                ) : (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
                    {dimension.dimension.replaceAll("_", " ")}
                  </span>
                )}
                {dimension.concentration_flags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {dimension.concentration_flags.map((flag) => (
                      <span
                        key={flag}
                        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="divide-y divide-border rounded-[6px] border border-border">
                <div className="grid grid-cols-[minmax(160px,1fr)_90px_minmax(0,1fr)] gap-4 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                  <span>Bucket</span>
                  <span className="text-right">Weight</span>
                  <span>Notes</span>
                </div>
                {dimension.breakdown.map((bucket) => (
                  <div
                    key={bucket.label}
                    className="grid grid-cols-[minmax(160px,1fr)_90px_minmax(0,1fr)] gap-4 px-4 py-3 text-[13.5px]"
                  >
                    <span className="text-text-primary">{bucket.label}</span>
                    <span className="text-right tabular-nums text-text-primary">
                      {(bucket.weight * 100).toFixed(1)}%
                    </span>
                    <span className="text-text-primary/75">{bucket.commentary ?? ""}</span>
                  </div>
                ))}
              </div>
              {dimension.overlap_notes && (
                <p className="text-[13px] leading-[1.55] text-text-secondary">
                  {dimension.overlap_notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PortfolioRiskView({
  risk,
  explanations = [],
}: {
  risk: PortfolioRisk;
  explanations?: MetricExplanation[];
}) {
  const explanationLookup = useMemo(() => buildExplanationLookup(explanations), [explanations]);
  return (
    <div className="space-y-6 rounded-[10px] border border-border bg-card p-6">
      <p>{risk.summary}</p>

      {risk.factor_exposures.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
            Factor exposures
          </span>
          <div className="divide-y divide-border rounded-[6px] border border-border">
            {risk.factor_exposures.map((exposure, idx) => {
              const factorExplanation = explanationLookup.get(
                `portfolio:risk:${risk.id}:factor_${idx}`,
              );
              return (
                <div
                  key={`${exposure.factor}-${idx}`}
                  className="grid grid-cols-[minmax(180px,1fr)_80px_minmax(0,1fr)] gap-4 px-4 py-2.5 text-[13.5px]"
                >
                  {factorExplanation ? (
                    <MetricExplanationTooltip explanation={factorExplanation}>
                      <span className="cursor-help text-text-primary underline decoration-dotted underline-offset-2">
                        {exposure.factor}
                      </span>
                    </MetricExplanationTooltip>
                  ) : (
                    <span className="text-text-primary">{exposure.factor}</span>
                  )}
                  <span className="text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary">
                    {exposure.level}
                  </span>
                  <span className="text-text-primary/75">{exposure.commentary ?? ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CompactList label="Macro sensitivities" items={risk.macro_sensitivities} />
      <CompactList label="Single-name risks" items={risk.single_name_risks} />
      <CompactList label="Tail risks" items={risk.tail_risks} />

      {risk.correlation_notes && (
        <p className="text-[13px] leading-[1.55] text-text-secondary">{risk.correlation_notes}</p>
      )}
    </div>
  );
}

function RebalancingView({
  suggestion,
  explanations = [],
}: {
  suggestion: RebalancingSuggestion;
  explanations?: MetricExplanation[];
}) {
  const explanationLookup = useMemo(() => buildExplanationLookup(explanations), [explanations]);
  return (
    <div className="space-y-6 rounded-[10px] border border-border bg-card p-6">
      <p>{suggestion.rationale}</p>
      <div className="divide-y divide-border rounded-[6px] border border-border">
        <div className="grid grid-cols-[minmax(180px,1.2fr)_90px_90px_90px_minmax(0,1fr)] gap-4 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
          <span>Bucket</span>
          <span className="text-right">Current</span>
          <span className="text-right">Suggested</span>
          <span className="text-right">Δ</span>
          <span>Notes</span>
        </div>
        {suggestion.rows.map((row, idx) => {
          const rowExplanation = explanationLookup.get(
            `portfolio:rebalancing:${suggestion.id}:row_${idx}`,
          );
          return (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(180px,1.2fr)_90px_90px_90px_minmax(0,1fr)] gap-4 px-4 py-3 text-[13.5px]"
            >
              {rowExplanation ? (
                <MetricExplanationTooltip explanation={rowExplanation}>
                  <span className="cursor-help text-text-primary underline decoration-dotted underline-offset-2">
                    {row.label}
                  </span>
                </MetricExplanationTooltip>
              ) : (
                <span className="text-text-primary">{row.label}</span>
              )}
              <span className="text-right tabular-nums text-text-primary">
                {(row.current_weight * 100).toFixed(1)}%
              </span>
              <span className="text-right tabular-nums text-text-primary">
                {(row.suggested_weight * 100).toFixed(1)}%
              </span>
              <span className="text-right tabular-nums text-text-primary">
                {(row.delta * 100 >= 0 ? "+" : "") + (row.delta * 100).toFixed(1)}%
              </span>
              <span className="text-text-primary/75">{row.commentary ?? ""}</span>
            </div>
          );
        })}
      </div>
      {suggestion.scenarios.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
          <span>Scenarios</span>
          {suggestion.scenarios.map((scenario) => (
            <span key={scenario} className="rounded-[4px] border border-border px-1.5 py-0.5">
              {scenario}
            </span>
          ))}
        </div>
      )}
      {suggestion.caveats.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
            Caveats
          </span>
          <ul className="space-y-1.5 text-[13px] leading-[1.55] text-text-secondary">
            {suggestion.caveats.map((caveat, index) => (
              <li key={`caveat-${index}-${caveat.slice(0, 20)}`}>{caveat}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
