import { CaretRight, FileText } from "@phosphor-icons/react";
import { Eyebrow } from "@/components/ui/editorial";
import { useAnalyses } from "@/shared/api/queries";
import { setState } from "@/store";
import type { AnalysisStatus, AnalysisSummary } from "@/types";

function StatusBadge({ status }: { status: AnalysisStatus }) {
  const statusStyles: Record<AnalysisStatus, string> = {
    queued: "bg-[#f3f4f6] text-[#606a78]",
    running: "bg-[#eef4ff] text-[#155dff]",
    completed: "bg-[#e9f7ef] text-[#2f855a]",
    failed: "bg-[#fff1f1] text-[#d23f3f]",
    cancelled: "bg-[#f3f4f6] text-[#606a78]",
  };

  return (
    <span
      className={`inline-flex h-6 items-center rounded-[5px] px-3 text-[12px] font-medium ${statusStyles[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function formatIntent(intent: string) {
  return intent
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatStatus(status: AnalysisStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
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
      className="group flex min-h-[68px] w-full items-center gap-4 rounded-[6px] border border-[#e6e9ef] bg-white px-4 text-left transition-colors hover:border-[#c9d3e2] hover:bg-[#fbfdff]"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-[#eff5ff] text-[#155dff]">
        <FileText size={22} weight="duotone" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="line-clamp-1 text-[14px] font-semibold leading-snug text-[#171b23]">
          {analysis.title}
        </span>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-[12.5px] text-[#6b7280]">
          <span className="truncate">{formatIntent(analysis.intent)}</span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-[#d2d7df]" />
          <span className="shrink-0 tabular-nums">{formattedDate}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <StatusBadge status={analysis.status} />
        <CaretRight
          size={17}
          weight="bold"
          className="text-[#7b8493] transition-transform group-hover:translate-x-0.5 group-hover:text-[#171b23]"
        />
      </div>
    </button>
  );
}

export function RecentAnalyses() {
  const { data: analyses, isLoading } = useAnalyses();

  const recentAnalyses = analyses?.slice(0, 3) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <Eyebrow>Recent analyses</Eyebrow>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-[68px] animate-pulse rounded-[6px] border border-[#e6e9ef] bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  if (recentAnalyses.length === 0) {
    return (
      <div className="space-y-3">
        <Eyebrow>Recent analyses</Eyebrow>
        <p className="rounded-[6px] border border-[#e6e9ef] bg-white px-4 py-5 text-[13px] text-muted-foreground">
          No analyses yet. Start by asking a question below.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <Eyebrow>Recent analyses</Eyebrow>
        <button
          type="button"
          onClick={() => setState({ view: "analysis" })}
          className="inline-flex items-center gap-2 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
          <CaretRight size={14} weight="bold" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {recentAnalyses.map((analysis) => (
          <AnalysisCard key={analysis.id} analysis={analysis} />
        ))}
      </div>
    </div>
  );
}
