import { memo } from "react";
import type { FinalStance } from "@/types";
import { getStanceAccent } from "./badge-styles";

interface ArgumentSpineProps {
  stance: FinalStance;
}

export const ArgumentSpine = memo(function ArgumentSpine({ stance }: ArgumentSpineProps) {
  const accent = getStanceAccent(stance.stance);
  const hasAny = stance.key_reasons.length + stance.what_would_change.length > 0;
  if (!hasAny) return null;

  return (
    <section className="grid gap-10 md:grid-cols-2 md:gap-8">
      <SpineColumn
        number="01"
        label="The case"
        items={stance.key_reasons}
        markerClass={accent.dot}
        markerStyle="tick"
      />
      <SpineColumn
        number="02"
        label="Would change our mind"
        items={stance.what_would_change}
        markerClass="bg-[var(--accent-purple)]"
        markerStyle="dot"
        toneClass="report-tone-warning"
      />
    </section>
  );
});

function SpineColumn({
  number,
  label,
  items,
  markerClass,
  markerStyle,
  toneClass = "report-tone-info",
}: {
  number: string;
  label: string;
  items: string[];
  markerClass: string;
  markerStyle: "tick" | "dot";
  toneClass?: string;
}) {
  return (
    <div className={`report-card-tint ${toneClass} flex flex-col gap-5 border-t px-4 py-4`}>
      <div className="flex items-baseline gap-2 border-b border-border pb-3">
        <span className="text-[11px] font-medium tabular-nums text-[var(--accent-blue)]">
          {number}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
          {label}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm italic text-muted-foreground/70">None stated.</p>
      ) : (
        <ol className="space-y-4 text-[15px] leading-[1.55] text-foreground">
          {items.map((item, index) => (
            <li key={`${index}-${item.slice(0, 32)}`} className="flex gap-3">
              {markerStyle === "tick" ? (
                <span className={`mt-[0.55em] h-[2px] w-3 shrink-0 ${markerClass}`} aria-hidden />
              ) : (
                <span
                  className={`mt-[0.7em] h-1 w-1 shrink-0 rounded-full ${markerClass}`}
                  aria-hidden
                />
              )}
              <span>{item}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
