import { type ReactNode, useEffect, useRef } from "react";
import { useExpandableOverflow } from "@/hooks/useExpandableOverflow";
import type { AnalysisIntent, AnalysisStatus } from "@/types";

export interface ReportShellAnalysis {
  id: string | null;
  title: string;
  user_prompt: string | null;
  intent: AnalysisIntent | null;
  status: AnalysisStatus | null;
  created_at: string | null;
}

interface ReportShellProps {
  analysis: ReportShellAnalysis;
  compactLabel?: string;
  compactShortLabel?: string;
  introLabel?: string;
  isRunning?: boolean;
  controls?: ReactNode;
  actions?: ReactNode;
  compactTrailing?: ReactNode;
  children: ReactNode;
}

export function ReportShell({
  analysis,
  compactLabel,
  compactShortLabel,
  introLabel = compactLabel ?? "Report",
  isRunning = false,
  controls,
  actions,
  compactTrailing,
  children,
}: ReportShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prompt = analysis.user_prompt || null;
  const {
    contentRef: promptRef,
    expanded: promptExpanded,
    overflows: promptOverflows,
    toggleExpanded: togglePromptExpanded,
  } = useExpandableOverflow<HTMLParagraphElement>({
    measureKey: prompt,
    resetKey: analysis.id ?? analysis.title,
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let frame = 0;
    const updateCompactTitle = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rawProgress = Math.min(1, Math.max(0, el.scrollTop / 104));
        const progress = 1 - (1 - rawProgress) ** 3;
        el.style.setProperty("--report-compact-offset", `${(1 - progress) * -48}px`);
        el.style.setProperty("--report-title-offset", `${(1 - progress) * -10}px`);
        el.style.setProperty("--report-title-rotate", `${(1 - progress) * -18}deg`);
        el.style.setProperty("--report-title-scale", String(0.96 + progress * 0.04));
      });
    };

    updateCompactTitle();
    el.addEventListener("scroll", updateCompactTitle, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      el.removeEventListener("scroll", updateCompactTitle);
      el.style.removeProperty("--report-compact-offset");
      el.style.removeProperty("--report-title-offset");
      el.style.removeProperty("--report-title-rotate");
      el.style.removeProperty("--report-title-scale");
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div ref={scrollRef} className="report-shell-scroll min-h-0 flex-1 overflow-auto">
        <div className="pointer-events-none sticky top-0 z-30 h-0">
          <div className="report-compact-bar report-section-nav pointer-events-auto border-b border-border bg-card/95 backdrop-blur-xl">
            <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-4 px-8">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {compactLabel && (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)] sm:hidden">
                    {compactShortLabel ?? compactLabel}
                  </span>
                )}
                {compactLabel && (
                  <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)] sm:inline">
                    {compactLabel}
                  </span>
                )}
                <span className="report-compact-title flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                  <span className="h-1 w-1 rounded-full bg-[var(--accent-blue)]" aria-hidden />
                  <span className="min-w-0 truncate text-[13px] font-medium leading-none tracking-normal text-text-primary">
                    {analysis.title}
                  </span>
                </span>
              </div>
              {compactTrailing && <div className="shrink-0">{compactTrailing}</div>}
            </div>
          </div>
        </div>

        <header className="report-hero-panel report-tone-info border-b border-border">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 px-8 pt-10 pb-5">
            <ReportShellMetaLine
              analysis={analysis}
              introLabel={introLabel}
              isRunning={isRunning}
            />

            <div className="space-y-4">
              <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] text-text-primary">
                {analysis.title}
              </h1>
              {prompt &&
                (promptExpanded ? (
                  <p
                    ref={promptRef}
                    className="max-w-[62ch] whitespace-pre-wrap break-words text-[14.5px] leading-[1.55] text-text-secondary"
                  >
                    {prompt}
                    <button
                      type="button"
                      onClick={togglePromptExpanded}
                      className="ml-2 align-baseline text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary transition-colors hover:text-text-primary"
                    >
                      Show less
                    </button>
                  </p>
                ) : (
                  <div className="flex max-w-[62ch] items-baseline gap-2">
                    <p
                      ref={promptRef}
                      className="min-w-0 flex-1 truncate text-[14.5px] leading-[1.55] text-text-secondary"
                    >
                      {prompt}
                    </p>
                    {promptOverflows && (
                      <button
                        type="button"
                        onClick={togglePromptExpanded}
                        className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary transition-colors hover:text-text-primary"
                      >
                        Show more
                      </button>
                    )}
                  </div>
                ))}
            </div>

            {(controls || actions) && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                {controls}
                {actions}
              </div>
            )}
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

function ReportShellMetaLine({
  analysis,
  introLabel,
  isRunning,
}: {
  analysis: ReportShellAnalysis;
  introLabel: string;
  isRunning: boolean;
}) {
  const intent = analysis.intent;
  const status = analysis.status;
  const created = analysis.created_at;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
        {introLabel}
      </span>
      {intent && (
        <>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
            {intent.replace(/_/g, " ")}
          </span>
        </>
      )}
      {status && (
        <>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <span
            className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isRunning ? "text-[var(--accent-blue)]" : "text-text-secondary"}`}
          >
            {isRunning ? "Running" : status}
          </span>
        </>
      )}
      {created && (
        <>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
            {formatCreated(created)}
          </span>
        </>
      )}
    </div>
  );
}

function formatCreated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
