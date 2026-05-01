import { Copy, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Source } from "@/types";
import type { ReportSelection } from "./selection";

interface ReportContextTrayProps {
  selection: ReportSelection | null;
  sourceMap: Map<string, Source>;
  onClear: () => void;
  onAsk?: (prompt: string) => void;
}

export function ReportContextTray({
  selection,
  sourceMap,
  onClear,
  onAsk,
}: ReportContextTrayProps) {
  const [question, setQuestion] = useState("");
  const json = useMemo(
    () => (selection ? JSON.stringify(selection.json, null, 2) : ""),
    [selection],
  );

  if (!selection) return null;

  const sourceIds = [...new Set([...selection.sourceIds, ...selection.evidenceIds])];
  const askEnabled = Boolean(onAsk && question.trim());

  return (
    <aside className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto border-l border-border pl-5">
      <div className="space-y-5">
        <header className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div className="min-w-0 space-y-2">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
              {selection.type.replace(/_/g, " ")}
            </span>
            <h3 className="text-[16px] font-semibold leading-snug tracking-tight">
              {selection.title}
            </h3>
            {selection.subtitle ? (
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                {selection.subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close context"
          >
            <X size={14} />
          </button>
        </header>

        {selection.values.length > 0 && (
          <section className="space-y-2">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
              Values
            </span>
            <dl className="divide-y divide-border/70 border-y border-border text-[12.5px]">
              {selection.values.map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className="grid grid-cols-[96px_1fr] gap-3 py-2"
                >
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="min-w-0 break-words font-mono tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {sourceIds.length > 0 && (
          <section className="space-y-2">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
              Sources
            </span>
            <div className="divide-y divide-border/70 border-y border-border">
              {sourceIds.map((id) => {
                const source = sourceMap.get(id);
                return (
                  <a
                    key={id}
                    href={source?.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="block py-2 text-[12.5px] leading-snug text-foreground/85 underline-offset-4 hover:underline"
                  >
                    <span className="block font-mono text-[10.5px] text-muted-foreground">
                      {id.slice(0, 8)}
                    </span>
                    {source?.title ?? id}
                  </a>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
              JSON context
            </span>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(json)}
              className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Copy size={13} />
              Copy
            </button>
          </div>
          <pre className="max-h-56 overflow-auto border-y border-border py-3 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
            {json}
          </pre>
        </section>

        {onAsk ? (
          <section className="space-y-3 border-t border-border pt-4">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
              Ask about this
            </span>
            <Textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a follow-up grounded in this selection..."
              className="min-h-24 rounded-none border-x-0 border-y border-border px-0 text-[13px] shadow-none focus-visible:ring-0"
            />
            <Button
              type="button"
              size="sm"
              disabled={!askEnabled}
              onClick={() => {
                if (!askEnabled) return;
                onAsk?.(buildFollowUpPrompt(selection, question));
                setQuestion("");
              }}
              className="rounded-none border border-foreground bg-foreground text-background shadow-none hover:bg-background hover:text-foreground"
            >
              <PaperPlaneTilt size={14} />
              Ask
            </Button>
          </section>
        ) : null}
      </div>
    </aside>
  );
}

function buildFollowUpPrompt(selection: ReportSelection, question: string) {
  return [
    "Follow up on this selected report context.",
    "",
    `Selection type: ${selection.type}`,
    `Selection title: ${selection.title}`,
    selection.subtitle ? `Selection subtitle: ${selection.subtitle}` : null,
    `Question: ${question.trim()}`,
    "",
    "Structured context JSON:",
    JSON.stringify(selection.json, null, 2),
    "",
    "Use the existing report evidence where applicable. If more source work is needed, gather it and cite sources before updating the report.",
  ]
    .filter(Boolean)
    .join("\n");
}
