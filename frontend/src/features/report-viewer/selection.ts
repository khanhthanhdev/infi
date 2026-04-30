import type {
  AnalysisBlock,
  ArtifactPoint,
  MetricSnapshot,
  Projection,
  ProjectionScenario,
  Source,
  StructuredArtifact,
} from "@/types";

export type ReportSelectionType =
  | "artifact"
  | "artifact_row"
  | "artifact_point"
  | "metric"
  | "projection"
  | "scenario"
  | "analysis_block"
  | "source";

export interface ReportSelection {
  id: string;
  type: ReportSelectionType;
  title: string;
  subtitle?: string;
  values: Array<{ label: string; value: string }>;
  sourceIds: string[];
  evidenceIds: string[];
  json: unknown;
}

export interface SelectionProps {
  selectedId?: string | null;
  onSelect?: (selection: ReportSelection) => void;
}

export function artifactSelection(artifact: StructuredArtifact): ReportSelection {
  return {
    id: `artifact:${artifact.id}`,
    type: "artifact",
    title: artifact.title,
    subtitle: formatKind(artifact.kind),
    values: [
      { label: "Rows", value: String(artifact.rows.length) },
      { label: "Series", value: String(artifact.series.length) },
    ],
    sourceIds: rowSourceIds(artifact.rows),
    evidenceIds: artifact.evidence_ids,
    json: artifact,
  };
}

export function artifactRowSelection(
  artifact: StructuredArtifact,
  row: Record<string, unknown>,
  index: number,
): ReportSelection {
  const title = firstString(row, ["metric", "line_item", "factor", "name", "label", "group"]);
  return {
    id: `artifact_row:${artifact.id}:${index}`,
    type: "artifact_row",
    title: title || `Row ${String(index + 1).padStart(2, "0")}`,
    subtitle: artifact.title,
    values: artifact.columns
      .slice(0, 8)
      .map((column) => ({ label: column.label, value: formatValue(row[column.key]) })),
    sourceIds: rowSourceIds([row]),
    evidenceIds: artifact.evidence_ids,
    json: { artifact: pickArtifactShell(artifact), row, row_index: index },
  };
}

export function artifactPointSelection(
  artifact: StructuredArtifact,
  point: ArtifactPoint,
  series: string,
  index: number,
): ReportSelection {
  return {
    id: `artifact_point:${artifact.id}:${series}:${point.label}:${index}`,
    type: "artifact_point",
    title: point.label,
    subtitle: `${artifact.title} / ${series}`,
    values: [
      { label: "Series", value: series },
      { label: "Value", value: formatNumber(point.value) },
    ],
    sourceIds: point.source_id ? [point.source_id] : [],
    evidenceIds: artifact.evidence_ids,
    json: { artifact: pickArtifactShell(artifact), series, point },
  };
}

export function metricSelection(metric: MetricSnapshot, source?: Source): ReportSelection {
  return {
    id: `metric:${metric.id}`,
    type: "metric",
    title: metric.metric.replace(/_/g, " "),
    subtitle: metric.period ?? metric.as_of,
    values: [
      { label: "Value", value: `${formatNumber(metric.numeric_value)}${metric.unit ?? ""}` },
      {
        label: "Prior",
        value: metric.prior_value == null ? "—" : formatNumber(metric.prior_value),
      },
      {
        label: "Change",
        value: metric.change_pct == null ? "—" : `${formatNumber(metric.change_pct)}%`,
      },
      { label: "Source", value: source?.title ?? metric.source_id },
    ],
    sourceIds: [metric.source_id],
    evidenceIds: [metric.source_id],
    json: metric,
  };
}

export function projectionSelection(projection: Projection): ReportSelection {
  return {
    id: `projection:${projection.id}`,
    type: "projection",
    title: projection.metric.replace(/_/g, " "),
    subtitle: projection.horizon,
    values: [
      { label: "Current", value: projection.current_value_label },
      { label: "Confidence", value: `${Math.round(projection.confidence * 100)}%` },
      { label: "Method", value: projection.methodology },
    ],
    sourceIds: [],
    evidenceIds: projection.evidence_ids,
    json: projection,
  };
}

export function scenarioSelection(
  projection: Projection,
  scenario: ProjectionScenario,
): ReportSelection {
  return {
    id: `scenario:${projection.id}:${scenario.label}`,
    type: "scenario",
    title: `${scenario.label} case`,
    subtitle: projection.metric.replace(/_/g, " "),
    values: [
      { label: "Target", value: scenario.target_label },
      { label: "Probability", value: `${formatNumber(scenario.probability * 100)}%` },
      { label: "Rationale", value: scenario.rationale },
    ],
    sourceIds: [],
    evidenceIds: projection.evidence_ids,
    json: { projection: projectionSelection(projection).json, scenario },
  };
}

export function blockSelection(block: AnalysisBlock): ReportSelection {
  return {
    id: `analysis_block:${block.id}`,
    type: "analysis_block",
    title: block.title,
    subtitle: block.kind.replace(/_/g, " "),
    values: [
      { label: "Importance", value: block.importance },
      { label: "Confidence", value: `${Math.round(block.confidence * 100)}%` },
    ],
    sourceIds: [],
    evidenceIds: block.evidence_ids,
    json: block,
  };
}

export function sourceSelection(source: Source): ReportSelection {
  return {
    id: `source:${source.id}`,
    type: "source",
    title: source.title,
    subtitle: source.publisher ?? source.source_type.replace(/_/g, " "),
    values: [
      { label: "Reliability", value: source.reliability },
      { label: "Retrieved", value: source.retrieved_at },
      { label: "URL", value: source.url ?? "—" },
    ],
    sourceIds: [source.id],
    evidenceIds: [source.id],
    json: source,
  };
}

export function formatKind(kind: string) {
  return kind.replace(/_/g, " ");
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  return JSON.stringify(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: Math.abs(value) < 10 ? 2 : 1,
  }).format(value);
}

function firstString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function rowSourceIds(rows: Record<string, unknown>[]) {
  return [
    ...new Set(
      rows.flatMap((row) => {
        const raw = row.source_id ?? row.source_ids ?? row.evidence_id ?? row.evidence_ids;
        if (Array.isArray(raw)) return raw.filter((id): id is string => typeof id === "string");
        return typeof raw === "string" ? [raw] : [];
      }),
    ),
  ];
}

function pickArtifactShell(artifact: StructuredArtifact) {
  return {
    id: artifact.id,
    kind: artifact.kind,
    title: artifact.title,
    summary: artifact.summary,
    evidence_ids: artifact.evidence_ids,
  };
}
