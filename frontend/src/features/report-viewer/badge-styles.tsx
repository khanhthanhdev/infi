import { cn } from "@/lib/utils";

export function getImportanceClasses(importance: string): string {
  switch (importance) {
    case "high":
      return "border-foreground/20 bg-foreground text-background";
    case "medium":
      return "border-border bg-transparent text-foreground";
    case "low":
      return "border-border bg-transparent text-muted-foreground";
    default:
      return "";
  }
}

export interface StanceAccent {
  tick: string;
  text: string;
  rule: string;
  dot: string;
  label: string;
}

export function getStanceAccent(stance: string): StanceAccent {
  switch (stance) {
    case "bullish":
      return {
        tick: "bg-[var(--accent-green)]",
        text: "text-[var(--accent-green)]",
        rule: "bg-[var(--accent-green)]",
        dot: "bg-[var(--accent-green)]",
        label: "Bullish",
      };
    case "bearish":
      return {
        tick: "bg-[var(--accent-red)]",
        text: "text-[var(--accent-red)]",
        rule: "bg-[var(--accent-red)]",
        dot: "bg-[var(--accent-red)]",
        label: "Bearish",
      };
    case "mixed":
      return {
        tick: "bg-[var(--accent-orange)]",
        text: "text-[var(--accent-orange)]",
        rule: "bg-[var(--accent-orange)]",
        dot: "bg-[var(--accent-orange)]",
        label: "Mixed",
      };
    case "neutral":
      return {
        tick: "bg-[var(--accent-gray)]",
        text: "text-[var(--accent-gray)]",
        rule: "bg-[var(--accent-gray)]",
        dot: "bg-[var(--accent-gray)]",
        label: "Neutral",
      };
    default:
      return {
        tick: "bg-muted-foreground/60",
        text: "text-muted-foreground",
        rule: "bg-muted-foreground/40",
        dot: "bg-muted-foreground/60",
        label: "Insufficient data",
      };
  }
}

export function getStanceClasses(stance: string): string {
  const accent = getStanceAccent(stance);
  return cn("border-transparent bg-transparent", accent.text);
}

export function ConfidenceBadge({
  confidence,
  className,
}: {
  confidence: number;
  className?: string;
}) {
  const pct = Math.round(confidence * 100);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground",
        className,
      )}
    >
      <span className="inline-block h-px w-10 bg-border">
        <span className="block h-full bg-foreground/70" style={{ width: `${pct}%` }} />
      </span>
      <span>{pct}%</span>
    </span>
  );
}

export function ConfidenceRail({
  confidence,
  accentClass,
  className,
}: {
  confidence: number;
  accentClass: string;
  className?: string;
}) {
  const pct = Math.round(confidence * 100);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-px flex-1 overflow-hidden bg-border">
        <div
          className={cn("absolute inset-y-0 left-0", accentClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-foreground">{pct}%</span>
    </div>
  );
}
