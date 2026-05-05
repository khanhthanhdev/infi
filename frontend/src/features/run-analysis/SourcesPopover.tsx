import { ArrowUpRight, CaretDown, Check } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { setState } from "@/store";
import type { SourceDescriptor } from "@/types";

interface SourcesPopoverProps {
  sources: SourceDescriptor[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}

export function SourcesPopover({ sources, selected, onToggle }: SourcesPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        if (panelRef.current && !panelRef.current.contains(target)) {
          setOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.top - 8, left: rect.left });
  }, [open]);

  const availableCount = sources.filter((s) => !s.requires_key || s.has_key).length;
  const activeCount = sources.filter(
    (s) => selected.has(s.id) && (!s.requires_key || s.has_key),
  ).length;

  const sorted = [...sources].sort((a, b) => {
    const aActive = selected.has(a.id) && (!a.requires_key || a.has_key) ? 0 : 1;
    const bActive = selected.has(b.id) && (!b.requires_key || b.has_key) ? 0 : 1;
    return aActive - bActive;
  });

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-8 items-center gap-2 rounded-[5px] border border-border bg-surface-app px-3 text-[10.5px] uppercase tracking-[0.14em] font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
      >
        <span>RUN SOURCES</span>
        <span className="tabular-nums text-foreground">
          {String(activeCount).padStart(2, "0")} / {String(availableCount).padStart(2, "0")}
        </span>
        <CaretDown size={10} weight="bold" />
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, transform: "translateY(-100%)" }}
            className="z-50 mb-2 w-80 border border-border bg-popover"
          >
            <div className="border-b border-border px-3 py-2 text-[10.5px] uppercase tracking-[0.14em] text-text-secondary">
              Per-run sources
            </div>
            <div className="max-h-80 divide-y divide-border overflow-auto">
              {sources.length === 0 && (
                <div className="px-3 py-3 text-[12.5px] text-text-secondary">
                  No data sources enabled in Settings.
                </div>
              )}
              {sorted.map((src) => {
                const isSelected = selected.has(src.id);
                const missingKey = src.requires_key && !src.has_key;
                const active = isSelected && !missingKey;
                return (
                  <button
                    key={src.id}
                    type="button"
                    disabled={missingKey}
                    onClick={() => onToggle(src.id)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      active
                        ? "bg-state-selected hover:bg-state-selected-strong"
                        : "hover:bg-state-hover"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[13px] ${active ? "font-medium text-text-primary" : ""}`}
                      >
                        {src.display_name}
                      </span>
                      <span className="block text-[10.5px] uppercase tracking-[0.14em] text-text-secondary">
                        {src.category.replaceAll("_", " ")}
                        {missingKey ? " · no key" : ""}
                      </span>
                    </span>
                    <span
                      className={`flex h-4 w-4 items-center justify-center border ${
                        active ? "border-accent-blue bg-accent-blue text-white" : "border-border"
                      }`}
                    >
                      {active ? <Check size={10} weight="bold" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setState({ view: "settings" });
                setOpen(false);
              }}
              className="flex w-full items-center justify-between border-t border-border px-3 py-2.5 text-[10.5px] uppercase tracking-[0.14em] text-text-secondary transition-colors hover:bg-state-hover hover:text-text-primary"
            >
              <span>Manage sources</span>
              <ArrowUpRight size={12} weight="bold" />
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
