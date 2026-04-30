import { Eyebrow } from "@/components/ui/editorial";
import { useAnalyses } from "@/shared/api/queries";
import { setState } from "@/store";
import type { AnalysisStatus, AnalysisSummary } from "@/types";

function StatusBadge({ status }: { status: AnalysisStatus }) {
  const statusStyles: Record<AnalysisStatus, string> = {
    queued: "text-muted-foreground",
    running: "text-primary",
    completed: "text-foreground",
    failed: "text-destructive",
    cancelled: "text-muted-foreground",
  };

  return (
    <span className={`font-mono text-[10.5px] uppercase tracking-[0.14em] ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

function AnalysisCard({ analysis }: { analysis: AnalysisSummary }) {
  const handleClick = () => {
    setState({
      view: "analysis",
      selectedAnalysisId: analysis.id,
    });
  };

  const date = new Date(analysis.created_at);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group flex w-full flex-col gap-2 border border-border bg-transparent p-4 text-left transition-colors hover:border-foreground hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-1 text-[13px] font-medium leading-snug text-foreground">
          {analysis.title}
        </span>
        <StatusBadge status={analysis.status} />
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          {analysis.intent.replace(/_/g, " ")}
        </span>
        <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground/70">
          {formattedDate}
        </span>
      </div>
    </button>
  );
}

export function RecentAnalyses() {
  const { data: analyses, isLoading } = useAnalyses();

  const recentAnalyses = analyses?.slice(0, 5) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <Eyebrow>Recent analyses</Eyebrow>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[72px] animate-pulse border border-border bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  if (recentAnalyses.length === 0) {
    return (
      <div className="space-y-4">
        <Eyebrow>Recent analyses</Eyebrow>
        <p className="text-[13px] text-muted-foreground">
          No analyses yet. Start by asking a question below.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <Eyebrow>Recent analyses</Eyebrow>
        <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground/70">
          {String(recentAnalyses.length).padStart(2, "0")}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {recentAnalyses.map((analysis) => (
          <AnalysisCard key={analysis.id} analysis={analysis} />
        ))}
      </div>
    </div>
  );
}
