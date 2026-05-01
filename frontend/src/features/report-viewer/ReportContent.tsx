import { ChartLineUp } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SectionHeader } from "@/components/ui/editorial";
import { getAnalysisReport, getStanceStaleMetrics, setActiveRun } from "@/shared/api/commands";
import { setSelectedReport, useAppStore } from "@/store";
import type {
  AllocationReview,
  AnalysisReport,
  Entity,
  HoldingReview,
  PortfolioExpectedReturnModel,
  PortfolioRisk,
  PortfolioScenarioAnalysis,
  RebalancingSuggestion,
  Source,
} from "@/types";
import { AnalysisSection } from "./AnalysisSection";
import { ArgumentSpine } from "./ArgumentSpine";
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
      <div className="flex h-full flex-col items-center justify-center text-[#3f4653]">
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
                <span className="font-mono tabular-nums">
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
                <span className="font-mono tabular-nums">
                  {report.holding_reviews.length.toString().padStart(2, "0")} reviewed
                </span>
              }
              id="holdings"
              className={sectionHeaderClass("holdings")}
            />
            <HoldingReviewList reviews={report.holding_reviews} entityMap={entityMap} />
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
              <AllocationReviewView key={review.id} review={review} />
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
              <PortfolioRiskView key={risk.id} risk={risk} />
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
              <RebalancingView key={suggestion.id} suggestion={suggestion} />
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
                <span className="font-mono tabular-nums">
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
                <span className="font-mono tabular-nums">
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
                <span className="font-mono tabular-nums">
                  {report.blocks.length.toString().padStart(2, "0")} blocks
                </span>
              }
              id="analysis"
              className={sectionHeaderClass("analysis")}
            />
            <AnalysisSection
              blocks={report.blocks}
              sourceMap={sourceMap}
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
                <span className="font-mono tabular-nums">
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
        className="flex items-baseline justify-between gap-4 text-[#c0392b] transition-opacity hover:opacity-80"
      >
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#c0392b]">
            Data freshness
          </span>
          <span className="text-[14px] font-medium leading-snug text-[#111827]">
            {stale.length} metric{stale.length === 1 ? "" : "s"} used in this stance are over the
            freshness cap.
          </span>
        </div>
        <span className="font-mono text-[10.5px] tabular-nums uppercase tracking-[0.14em] text-[#3f4653]">
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
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3572ad]">
        Decision criteria
      </span>
      <ol className="divide-y divide-[#dfe5ee]/60 text-[13.5px] text-[#111827]/85">
        {criteria.map((criterion, index) => (
          <li key={criterion} className="flex items-baseline gap-3 py-2 first:pt-0 last:pb-0">
            <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-[#3f4653]">
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
    <nav className="report-section-nav sticky top-11 z-20 -mx-8 mb-8 flex h-12 items-center border-b border-[#e7e9ee] bg-white/95 px-8 backdrop-blur-xl">
      <div className="flex items-center gap-6">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3572ad]">
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
          className="space-y-6 rounded-[10px] border border-[#e7e9ee] bg-white p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="space-y-2">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3572ad]">
                Scenario analysis
              </span>
              <p>{analysis.methodology}</p>
            </div>
            <div className="flex flex-wrap gap-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
              <span>{analysis.horizon}</span>
              <span>{analysis.base_currency}</span>
              <span>conf {(analysis.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="divide-y divide-[#dfe5ee] rounded-[6px] border border-[#e7e9ee]">
            <div className="grid grid-cols-[92px_90px_100px_minmax(0,1fr)] gap-4 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
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
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#111827]">
                    {scenario.label}
                  </span>
                  <span className="text-right font-mono tabular-nums text-[#111827]">
                    {formatPercent(scenario.probability)}
                  </span>
                  <span className="text-right font-mono tabular-nums text-[#111827]">
                    {formatSignedPercent(scenario.portfolio_return_pct)}
                  </span>
                  <span className="space-y-2 text-[#111827]/80">
                    <span className="block leading-[1.55]">{scenario.rationale}</span>
                    {scenario.key_drivers.length > 0 && (
                      <span className="block text-[#3f4653]">
                        Drivers: {scenario.key_drivers.join("; ")}
                      </span>
                    )}
                    {scenario.watch_indicators.length > 0 && (
                      <span className="block text-[#3f4653]">
                        Watch: {scenario.watch_indicators.join("; ")}
                      </span>
                    )}
                  </span>
                </div>
              ))}
          </div>

          {analysis.stress_cases.length > 0 && (
            <div className="space-y-3">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3572ad]">
                Stress cases
              </span>
              <div className="divide-y divide-[#dfe5ee] rounded-[6px] border border-[#e7e9ee]">
                {analysis.stress_cases.map((stress) => (
                  <div
                    key={stress.name}
                    className="grid gap-4 px-4 py-3.5 text-[13.5px] sm:grid-cols-[minmax(160px,1fr)_90px_minmax(0,1fr)]"
                  >
                    <span className="text-[#111827]">{stress.name}</span>
                    <span className="font-mono tabular-nums text-[#111827] sm:text-right">
                      {formatSignedPercent(stress.estimated_return_pct)}
                    </span>
                    <span className="space-y-1 text-[#111827]/80">
                      <span className="block leading-[1.55]">{stress.rationale}</span>
                      <span className="block text-[#3f4653]">
                        Exposures: {stress.affected_exposures.join("; ")}
                      </span>
                      <span className="block text-[#3f4653]">
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
          className="space-y-6 rounded-[10px] border border-[#e7e9ee] bg-white p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="space-y-2">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3572ad]">
                Expected-return model
              </span>
              <p>{model.summary}</p>
            </div>
            <div className="flex flex-wrap gap-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
              <span>{model.model_type.replaceAll("_", " ")}</span>
              <span>{model.horizon}</span>
              <span>conf {(model.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="grid gap-4 rounded-[6px] border border-[#e7e9ee] p-4 sm:grid-cols-2">
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

          <div className="divide-y divide-[#dfe5ee] rounded-[6px] border border-[#e7e9ee]">
            <div className="grid grid-cols-[minmax(150px,1fr)_80px_90px_90px_minmax(0,1fr)] gap-4 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
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
                <span className="text-[#111827]">
                  {input.name}
                  <span className="block font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
                    {input.input_type}
                  </span>
                </span>
                <span className="text-right font-mono tabular-nums text-[#111827]">
                  {formatPercent(input.weight)}
                </span>
                <span className="text-right font-mono tabular-nums text-[#111827]">
                  {formatSignedPercent(input.expected_return_pct)}
                </span>
                <span className="text-right font-mono tabular-nums text-[#111827]">
                  {input.volatility_pct == null ? "—" : formatPercent(input.volatility_pct)}
                </span>
                <span className="text-[#111827]/75">{input.rationale}</span>
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
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3572ad]">
        {label}
      </span>
      <div className="font-mono text-[18px] tabular-nums text-[#111827]">{value}</div>
    </div>
  );
}

function CompactList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3572ad]">
        {label}
      </span>
      <ul className="space-y-1.5 text-[13.5px] leading-[1.55] text-[#111827]/85">
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
}: {
  reviews: HoldingReview[];
  entityMap: Map<string, Entity>;
}) {
  const sorted = [...reviews].sort((a, b) => a.display_order - b.display_order);
  return (
    <div className="rounded-[10px] border border-[#e7e9ee] bg-white">
      {sorted.map((review) => {
        const entity = entityMap.get(review.entity_id);
        const heading = entity?.name ?? review.entity_id;
        const symbol = entity?.symbol ?? review.entity_id;
        return (
          <article key={review.id} className="border-t border-[#e7e9ee] p-6 first:border-0">
            <header className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
                  {symbol}
                </span>
                <h3 className="text-[17px] font-medium leading-[1.3] text-[#111827]">{heading}</h3>
              </div>
              <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
                <span className="rounded-full border border-[#155dff] bg-[#e4ecff] px-2.5 py-0.5 text-[#155dff]">
                  {review.stance}
                </span>
                <span className="tabular-nums">conf {(review.confidence * 100).toFixed(0)}%</span>
                <span>{review.importance}</span>
              </div>
            </header>
            <p className="mt-3 text-[14px] leading-[1.6] text-[#111827]/85">{review.rationale}</p>
            <ReasonRiskGrid reasons={review.key_reasons} risks={review.key_risks} />
            {review.evidence_ids.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
                <span>Sources</span>
                {review.evidence_ids.map((id) => (
                  <span key={id} className="rounded-[4px] border border-[#dfe5ee] px-1.5 py-0.5">
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
    <div className="mt-4 grid gap-5 rounded-[6px] border border-[#e7e9ee] p-4 sm:grid-cols-2">
      <div className="space-y-2">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3572ad]">
          Key reasons
        </span>
        <ul className="space-y-1.5 text-[13.5px] leading-[1.55]">
          {reasons.map((reason, index) => (
            <li key={`r-${index}-${reason.slice(0, 20)}`} className="text-[#111827]/85">
              {reason}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-2">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3572ad]">
          Key risks
        </span>
        <ul className="space-y-1.5 text-[13.5px] leading-[1.55]">
          {risks.map((risk, index) => (
            <li key={`k-${index}-${risk.slice(0, 20)}`} className="text-[#111827]/85">
              {risk}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AllocationReviewView({ review }: { review: AllocationReview }) {
  return (
    <div className="space-y-6 rounded-[10px] border border-[#e7e9ee] bg-white p-6">
      <p>{review.summary}</p>
      <div className="space-y-8">
        {review.dimensions.map((dimension) => (
          <div key={dimension.dimension} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3572ad]">
                {dimension.dimension.replace("_", " ")}
              </span>
              {dimension.concentration_flags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {dimension.concentration_flags.map((flag) => (
                    <span
                      key={flag}
                      className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="divide-y divide-[#dfe5ee] rounded-[6px] border border-[#e7e9ee]">
              <div className="grid grid-cols-[minmax(160px,1fr)_90px_minmax(0,1fr)] gap-4 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
                <span>Bucket</span>
                <span className="text-right">Weight</span>
                <span>Notes</span>
              </div>
              {dimension.breakdown.map((bucket) => (
                <div
                  key={bucket.label}
                  className="grid grid-cols-[minmax(160px,1fr)_90px_minmax(0,1fr)] gap-4 px-4 py-3 text-[13.5px]"
                >
                  <span className="text-[#111827]">{bucket.label}</span>
                  <span className="text-right font-mono tabular-nums text-[#111827]">
                    {(bucket.weight * 100).toFixed(1)}%
                  </span>
                  <span className="text-[#111827]/75">{bucket.commentary ?? ""}</span>
                </div>
              ))}
            </div>
            {dimension.overlap_notes && (
              <p className="text-[13px] leading-[1.55] text-[#3f4653]">{dimension.overlap_notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PortfolioRiskView({ risk }: { risk: PortfolioRisk }) {
  return (
    <div className="space-y-6 rounded-[10px] border border-[#e7e9ee] bg-white p-6">
      <p>{risk.summary}</p>

      {risk.factor_exposures.length > 0 && (
        <div className="space-y-2">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3572ad]">
            Factor exposures
          </span>
          <div className="divide-y divide-[#dfe5ee] rounded-[6px] border border-[#e7e9ee]">
            {risk.factor_exposures.map((exposure) => (
              <div
                key={exposure.factor}
                className="grid grid-cols-[minmax(180px,1fr)_80px_minmax(0,1fr)] gap-4 px-4 py-2.5 text-[13.5px]"
              >
                <span className="text-[#111827]">{exposure.factor}</span>
                <span className="text-right font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#111827]">
                  {exposure.level}
                </span>
                <span className="text-[#111827]/75">{exposure.commentary ?? ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <RiskList label="Macro sensitivities" items={risk.macro_sensitivities} />
      <RiskList label="Single-name risks" items={risk.single_name_risks} />
      <RiskList label="Tail risks" items={risk.tail_risks} />

      {risk.correlation_notes && (
        <p className="text-[13px] leading-[1.55] text-[#3f4653]">{risk.correlation_notes}</p>
      )}
    </div>
  );
}

function RiskList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3572ad]">
        {label}
      </span>
      <ul className="space-y-1.5 text-[13.5px] leading-[1.55] text-[#111827]/85">
        {items.map((item, index) => (
          <li key={`${label}-${index}-${item.slice(0, 20)}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function RebalancingView({ suggestion }: { suggestion: RebalancingSuggestion }) {
  return (
    <div className="space-y-6 rounded-[10px] border border-[#e7e9ee] bg-white p-6">
      <p>{suggestion.rationale}</p>
      <div className="divide-y divide-[#dfe5ee] rounded-[6px] border border-[#e7e9ee]">
        <div className="grid grid-cols-[minmax(180px,1.2fr)_90px_90px_90px_minmax(0,1fr)] gap-4 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
          <span>Bucket</span>
          <span className="text-right">Current</span>
          <span className="text-right">Suggested</span>
          <span className="text-right">Δ</span>
          <span>Notes</span>
        </div>
        {suggestion.rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[minmax(180px,1.2fr)_90px_90px_90px_minmax(0,1fr)] gap-4 px-4 py-3 text-[13.5px]"
          >
            <span className="text-[#111827]">{row.label}</span>
            <span className="text-right font-mono tabular-nums text-[#111827]">
              {(row.current_weight * 100).toFixed(1)}%
            </span>
            <span className="text-right font-mono tabular-nums text-[#111827]">
              {(row.suggested_weight * 100).toFixed(1)}%
            </span>
            <span className="text-right font-mono tabular-nums text-[#111827]">
              {(row.delta * 100 >= 0 ? "+" : "") + (row.delta * 100).toFixed(1)}%
            </span>
            <span className="text-[#111827]/75">{row.commentary ?? ""}</span>
          </div>
        ))}
      </div>
      {suggestion.scenarios.length > 0 && (
        <div className="flex flex-wrap gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
          <span>Scenarios</span>
          {suggestion.scenarios.map((scenario) => (
            <span key={scenario} className="rounded-[4px] border border-[#dfe5ee] px-1.5 py-0.5">
              {scenario}
            </span>
          ))}
        </div>
      )}
      {suggestion.caveats.length > 0 && (
        <div className="space-y-2">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3572ad]">
            Caveats
          </span>
          <ul className="space-y-1.5 text-[13px] leading-[1.55] text-[#3f4653]">
            {suggestion.caveats.map((caveat, index) => (
              <li key={`caveat-${index}-${caveat.slice(0, 20)}`}>{caveat}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
