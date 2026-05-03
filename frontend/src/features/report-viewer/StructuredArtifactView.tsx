import { memo, type ReactElement, useMemo } from "react";
import { MetricExplanationTooltip } from "@/components/ui/MetricExplanationTooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ArtifactPoint, MetricExplanation, StructuredArtifact } from "@/types";
import { buildExplanationLookup } from "./explanation-utils";
import {
  artifactPointSelection,
  artifactRowSelection,
  artifactSelection,
  formatKind,
  formatNumber,
  formatValue,
  type SelectionProps,
} from "./selection";

interface StructuredArtifactViewProps extends SelectionProps {
  artifact: StructuredArtifact;
  isFirst?: boolean;
  explanations?: MetricExplanation[];
}

export const StructuredArtifactView = memo(function StructuredArtifactView({
  artifact,
  isFirst,
  selectedId,
  onSelect,
  explanations = [],
}: StructuredArtifactViewProps) {
  const Renderer = rendererByKind[artifact.kind] ?? DefaultArtifactRenderer;
  const active = selectedId === `artifact:${artifact.id}`;

  return (
    <article
      className={cn(
        "report-card-tint report-tone-neutral px-4",
        isFirst ? "space-y-6 py-8" : "space-y-6 border-t border-border py-8",
        active && "report-selected",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect?.(artifactSelection(artifact))}
        className="block w-full text-left"
      >
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="space-y-2">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
              {formatKind(artifact.kind)}
            </span>
            <h3 className="text-[17px] font-semibold leading-snug tracking-tight">
              {artifact.title}
            </h3>
            {artifact.summary && (
              <p className="max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
                {artifact.summary}
              </p>
            )}
          </div>
          {artifact.evidence_ids.length > 0 && (
            <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
              {String(artifact.evidence_ids.length).padStart(2, "0")} sources
            </span>
          )}
        </header>
      </button>
      <Renderer
        artifact={artifact}
        selectedId={selectedId}
        onSelect={onSelect}
        explanations={explanations}
      />
    </article>
  );
});

type ArtifactRenderer = (props: {
  artifact: StructuredArtifact;
  selectedId?: string | null;
  onSelect?: (selection: ReturnType<typeof artifactSelection>) => void;
  explanations?: MetricExplanation[];
}) => ReactElement | null;

const rendererByKind: Partial<Record<StructuredArtifact["kind"], ArtifactRenderer>> = {
  kpi_grid: KpiGrid,
  financial_statement: FinancialStatement,
  grouped_bar_chart: GroupedBarChart,
  ratio_snapshot: RatioSnapshot,
  factor_list: FactorList,
  bar_chart: LegacyBarChart,
  line_chart: LegacyLineChart,
  area_chart: LegacyAreaChart,
};

function DefaultArtifactRenderer({
  artifact,
  selectedId,
  onSelect,
  explanations = [],
}: RendererProps) {
  return artifact.columns.length > 0 && artifact.rows.length > 0 ? (
    <ArtifactTable
      artifact={artifact}
      selectedId={selectedId}
      onSelect={onSelect}
      explanations={explanations}
    />
  ) : null;
}

type RendererProps = {
  artifact: StructuredArtifact;
  selectedId?: string | null;
  onSelect?: (selection: ReturnType<typeof artifactSelection>) => void;
  explanations?: MetricExplanation[];
};

function KpiGrid({ artifact, selectedId, onSelect, explanations = [] }: RendererProps) {
  const explanationLookup = useMemo(() => buildExplanationLookup(explanations), [explanations]);
  return (
    <div className="grid gap-px border-y border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {artifact.rows.map((row, index) => {
        const title = textValue(row.metric) || textValue(row.label) || `KPI ${index + 1}`;
        const value = row.value ?? row.numeric_value;
        const selected = selectedId === `artifact_row:${artifact.id}:${index}`;
        const explanation = explanationLookup.get(`artifact:${artifact.id}:row_${index}`);
        return (
          <TooltipProvider key={`${artifact.id}-kpi-${index}`} delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelect?.(artifactRowSelection(artifact, row, index))}
                  className={cn(
                    "report-row-tint min-h-[126px] bg-background p-4 text-left transition-colors",
                    rowTone(index),
                    selected && "report-selected",
                  )}
                >
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
                    {textValue(row.period) || textValue(row.group) || "Metric"}
                  </span>
                  <div className="mt-3 font-mono text-[22px] tabular-nums tracking-normal text-foreground">
                    {formatValue(value)}
                    {row.unit ? (
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        {formatValue(row.unit)}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      "mt-2 text-[13px] leading-snug text-foreground/80",
                      explanation && "cursor-help underline decoration-dotted underline-offset-2",
                    )}
                  >
                    {title}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10.5px] tabular-nums text-muted-foreground">
                    {row.prior_value != null && <span>prior {formatValue(row.prior_value)}</span>}
                    {row.change_pct != null && <span>chg {formatValue(row.change_pct)}%</span>}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent variant="editorial" className="max-w-xs space-y-1.5 text-left">
                {explanation && (
                  <div className="space-y-1.5 border-b border-border pb-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {explanation.display_name || explanation.metric_name}
                    </span>
                    <p className="text-[13px] font-medium leading-snug">{explanation.definition}</p>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      {explanation.meaning}
                    </p>
                  </div>
                )}
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
                  Details
                </span>
                {Object.entries(row)
                  .slice(0, 8)
                  .map(([key, val]) => (
                    <p key={key} className="text-[12px]">
                      <span className="text-muted-foreground">{key.replace(/_/g, " ")}: </span>
                      {formatValue(val)}
                    </p>
                  ))}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

function FinancialStatement(props: RendererProps) {
  return <ArtifactTable {...props} dense />;
}

function RatioSnapshot({ artifact, selectedId, onSelect, explanations = [] }: RendererProps) {
  const explanationLookup = useMemo(() => buildExplanationLookup(explanations), [explanations]);
  const groups = groupRows(artifact.rows, "group");
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {groups.map(([group, rows]) => (
        <section key={group} className="border-t border-border pt-3">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
            {group}
          </span>
          <div className="mt-3 divide-y divide-border/70">
            {rows.map((row) => {
              const index = artifact.rows.indexOf(row);
              const selected = selectedId === `artifact_row:${artifact.id}:${index}`;
              const metricName = textValue(row.metric) || "Ratio";
              const explanation = explanationLookup.get(`artifact:${artifact.id}:row_${index}`);
              return (
                <button
                  type="button"
                  key={`${group}-${index}`}
                  onClick={() => onSelect?.(artifactRowSelection(artifact, row, index))}
                  className={cn(
                    "report-row-tint grid w-full grid-cols-[minmax(0,1fr)_auto] gap-4 py-3 text-left text-[13.5px]",
                    rowTone(index),
                    selected && "report-selected",
                  )}
                >
                  {explanation ? (
                    <MetricExplanationTooltip explanation={explanation}>
                      <span className="min-w-0 cursor-help truncate underline decoration-dotted underline-offset-2">
                        {metricName}
                      </span>
                    </MetricExplanationTooltip>
                  ) : (
                    <span className="min-w-0 truncate">{metricName}</span>
                  )}
                  <span className="font-mono tabular-nums">
                    {formatValue(row.value ?? row.numeric_value)}
                    {row.unit ? ` ${formatValue(row.unit)}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function FactorList({ artifact, selectedId, onSelect, explanations = [] }: RendererProps) {
  const explanationLookup = useMemo(() => buildExplanationLookup(explanations), [explanations]);
  const groups = groupRows(artifact.rows, "group");
  return (
    <div className="grid gap-7 md:grid-cols-2">
      {groups.map(([group, rows]) => (
        <section key={group} className="space-y-3 border-t border-border pt-3">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
            {group}
          </span>
          <div className="divide-y divide-border/70">
            {rows.map((row) => {
              const index = artifact.rows.indexOf(row);
              const selected = selectedId === `artifact_row:${artifact.id}:${index}`;
              const factorName = textValue(row.factor) || textValue(row.metric) || "Factor";
              const explanation = explanationLookup.get(`artifact:${artifact.id}:factor_${index}`);
              return (
                <button
                  type="button"
                  key={`${group}-${index}`}
                  onClick={() => onSelect?.(artifactRowSelection(artifact, row, index))}
                  className={cn(
                    "report-row-tint w-full py-3 text-left",
                    rowTone(index),
                    selected && "report-selected",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    {explanation ? (
                      <MetricExplanationTooltip explanation={explanation}>
                        <span className="cursor-help text-[14px] font-medium underline decoration-dotted underline-offset-2">
                          {factorName}
                        </span>
                      </MetricExplanationTooltip>
                    ) : (
                      <span className="text-[14px] font-medium">{factorName}</span>
                    )}
                    {row.importance ? (
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
                        {formatValue(row.importance)}
                      </span>
                    ) : null}
                  </div>
                  {row.detail ? (
                    <p className="mt-1 text-[13px] leading-[1.55] text-muted-foreground">
                      {formatValue(row.detail)}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function GroupedBarChart({ artifact, selectedId, onSelect, explanations = [] }: RendererProps) {
  return (
    <SvgBarChart
      artifact={artifact}
      grouped
      selectedId={selectedId}
      onSelect={onSelect}
      explanations={explanations}
    />
  );
}

function LegacyBarChart(props: RendererProps) {
  return <SvgBarChart {...props} />;
}

function LegacyLineChart({ artifact, selectedId, onSelect, explanations = [] }: RendererProps) {
  const points = chartPoints(artifact);
  return points.length > 1 ? (
    <LineAreaChart
      artifact={artifact}
      points={points}
      selectedId={selectedId}
      onSelect={onSelect}
      area={false}
      explanations={explanations}
    />
  ) : (
    <DefaultArtifactRenderer
      artifact={artifact}
      selectedId={selectedId}
      onSelect={onSelect}
      explanations={explanations}
    />
  );
}

function LegacyAreaChart({ artifact, selectedId, onSelect, explanations = [] }: RendererProps) {
  const points = chartPoints(artifact);
  return points.length > 1 ? (
    <LineAreaChart
      artifact={artifact}
      points={points}
      selectedId={selectedId}
      onSelect={onSelect}
      area
      explanations={explanations}
    />
  ) : (
    <DefaultArtifactRenderer
      artifact={artifact}
      selectedId={selectedId}
      onSelect={onSelect}
      explanations={explanations}
    />
  );
}

function ArtifactTable({
  artifact,
  selectedId,
  onSelect,
  dense = false,
  explanations = [],
}: RendererProps & { dense?: boolean }) {
  const explanationLookup = useMemo(() => buildExplanationLookup(explanations), [explanations]);
  const columnIsNumeric = artifact.columns.map((column) =>
    artifact.rows.every((row) => {
      const value = row[column.key];
      return value === null || value === undefined || typeof value === "number";
    }),
  );

  return (
    <div className="overflow-x-auto">
      <Table className={cn("text-[13px]", dense && "text-[12.5px]")}>
        <TableHeader>
          <TableRow className="border-b border-border">
            {artifact.columns.map((column, colIndex) => {
              const explanation = explanationLookup.get(`artifact:${artifact.id}:col_${colIndex}`);
              return (
                <TableHead
                  key={column.key}
                  title={column.description ?? undefined}
                  className={cn(
                    "px-3 align-top text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground",
                    columnIsNumeric[colIndex]
                      ? "min-w-[96px] whitespace-nowrap text-right"
                      : "min-w-[180px] max-w-[420px]",
                  )}
                >
                  {explanation ? (
                    <MetricExplanationTooltip explanation={explanation}>
                      <span className="cursor-help underline decoration-dotted underline-offset-2">
                        {column.label}
                      </span>
                    </MetricExplanationTooltip>
                  ) : (
                    column.label
                  )}
                  {column.unit && (
                    <span className="ml-1 normal-case tracking-normal">({column.unit})</span>
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {artifact.rows.map((row, index) => {
            const selected = selectedId === `artifact_row:${artifact.id}:${index}`;
            return (
              <TableRow
                key={index}
                onClick={() => onSelect?.(artifactRowSelection(artifact, row, index))}
                className={cn(
                  "cursor-pointer border-b border-border/60 hover:bg-muted/40",
                  rowTone(index),
                  selected && "report-selected",
                )}
              >
                {artifact.columns.map((column, colIndex) => {
                  const value = row[column.key];
                  const numeric = columnIsNumeric[colIndex];
                  return (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "px-3 align-top",
                        numeric
                          ? "min-w-[96px] whitespace-nowrap text-right font-mono tabular-nums"
                          : "min-w-[180px] max-w-[420px] whitespace-normal leading-[1.55]",
                      )}
                    >
                      {formatValue(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SvgBarChart({
  artifact,
  selectedId,
  onSelect,
  explanations = [],
  grouped = false,
}: RendererProps & { grouped?: boolean }) {
  const groups = grouped
    ? artifact.series
    : [{ label: artifact.title, points: chartPoints(artifact) }];
  const points = groups.flatMap((series) =>
    series.points.map((point) => ({ ...point, series: series.label })),
  );
  if (points.length === 0)
    return (
      <DefaultArtifactRenderer
        artifact={artifact}
        selectedId={selectedId}
        onSelect={onSelect}
        explanations={explanations}
      />
    );

  const max = Math.max(...points.map((point) => Math.abs(point.value)), 1);
  return (
    <div className="space-y-2">
      {points.map((point, index) => {
        const selection = artifactPointSelection(artifact, point, point.series, index);
        const selected = selectedId === selection.id;
        return (
          <button
            type="button"
            key={`${point.series}-${point.label}-${index}`}
            onClick={() => onSelect?.(selection)}
            title={`${point.series} / ${point.label}: ${formatNumber(point.value)}`}
            className={cn(
              "grid w-full items-center gap-3 text-left text-[13px] hover:bg-muted/40 sm:grid-cols-[minmax(140px,220px)_1fr_auto]",
              rowTone(index),
              selected && "report-selected",
            )}
          >
            <div className="truncate text-foreground">
              {grouped && <span className="text-muted-foreground">{point.series} / </span>}
              {point.label}
            </div>
            <svg viewBox="0 0 100 8" role="img" className="h-2 w-full bg-border/60">
              <title>
                {point.series} / {point.label}: {formatNumber(point.value)}
              </title>
              <rect
                x="0"
                y="0"
                height="8"
                width={Math.max(4, (Math.abs(point.value) / max) * 100)}
                className={valueFillTone(point.value)}
              />
            </svg>
            <div className="font-mono tabular-nums text-muted-foreground">
              {formatNumber(point.value)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function LineAreaChart({
  artifact,
  points,
  selectedId,
  onSelect,
  area,
}: RendererProps & { points: Array<ArtifactPoint & { series: string }>; area: boolean }) {
  const width = 640;
  const height = 180;
  const padding = 20;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : padding + (index / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point.value - min) / span) * (height - padding * 2);
    return { x, y, point };
  });
  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const baselineY = height - padding;
  const areaPath = [
    `M${coords[0].x},${baselineY}`,
    ...coords.map((c) => `L${c.x},${c.y}`),
    `L${coords[coords.length - 1].x},${baselineY}`,
    "Z",
  ].join(" ");
  const gradientId = `area-gradient-${artifact.id}`;

  return (
    <div className="space-y-3">
      <div className="border-y border-border py-3">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" className="h-48 w-full">
          {area && (
            <>
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#${gradientId})`} className="text-[#3572ad]" />
            </>
          )}
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            points={linePoints}
            className="text-[#3572ad]"
          />
          {coords.map((c, index) => {
            const selection = artifactPointSelection(artifact, c.point, c.point.series, index);
            return (
              <circle
                key={`${c.point.label}-${index}`}
                cx={c.x}
                cy={c.y}
                r={selectedId === selection.id ? 5 : 3}
                fill="currentColor"
                className={valueTextTone(c.point.value)}
              />
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums text-muted-foreground">
        {points.map((point, index) => (
          <button
            type="button"
            key={`${point.label}-${index}`}
            onClick={() => onSelect?.(artifactPointSelection(artifact, point, point.series, index))}
            className="hover:text-foreground"
          >
            {point.label} · {formatNumber(point.value)}
          </button>
        ))}
      </div>
    </div>
  );
}

function chartPoints(artifact: StructuredArtifact): Array<ArtifactPoint & { series: string }> {
  return artifact.series.flatMap((series) =>
    series.points.map((point) => ({ ...point, series: series.label })),
  );
}

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function groupRows(rows: Record<string, unknown>[], key: string) {
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const label = textValue(row[key]) || "Other";
    groups.set(label, [...(groups.get(label) ?? []), row]);
  }
  return [...groups.entries()];
}

function rowTone(index: number): string {
  return index % 2 === 0 ? "report-tone-neutral" : "report-tone-info";
}

function valueFillTone(value: number): string {
  if (value > 0) return "fill-[#38a169]";
  if (value < 0) return "fill-[#e03535]";
  return "fill-[#3572ad]";
}

function valueTextTone(value: number): string {
  if (value > 0) return "text-[#38a169]";
  if (value < 0) return "text-[#e03535]";
  return "text-[#3572ad]";
}
