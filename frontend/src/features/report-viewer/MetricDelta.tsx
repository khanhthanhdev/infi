import { cn } from "@/lib/utils";

interface MetricDeltaProps {
  changePct: number | null;
  priorValue: number | null;
  className?: string;
}

export function MetricDelta({ changePct, priorValue, className }: MetricDeltaProps) {
  if (changePct === null && priorValue === null) return null;
  const pct = changePct ?? 0;
  const isPositive = pct > 0;
  const isNegative = pct < 0;
  const arrow = isPositive ? "↑" : isNegative ? "↓" : "·";
  const color = isPositive
    ? "text-[var(--accent-green)]"
    : isNegative
      ? "text-[var(--accent-red)]"
      : "text-muted-foreground";
  const sign = isPositive ? "+" : "";
  return (
    <span
      className={cn("inline-flex items-baseline gap-1 text-[11px] tabular-nums", color, className)}
      title={priorValue !== null ? `prior ${priorValue}` : undefined}
    >
      <span>{arrow}</span>
      {changePct !== null && (
        <span>
          {sign}
          {(pct * 100).toFixed(1)}%
        </span>
      )}
    </span>
  );
}
