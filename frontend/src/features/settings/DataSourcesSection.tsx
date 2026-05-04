import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SectionHeader } from "@/components/ui/editorial";
import { Input } from "@/components/ui/input";
import { refreshSourceKeyStatus } from "@/shared/api/commands";
import {
  queryKeys,
  useClearSourceKey,
  useSetEnabledSources,
  useSetSourceKey,
  useSources,
  useTestSourceKey,
} from "@/shared/api/queries";
import type { SourceCategoryId, SourceDescriptor } from "@/types";

const CATEGORY_ORDER: SourceCategoryId[] = [
  "web_search",
  "filings",
  "fundamentals",
  "market_data",
  "news",
  "forums",
  "screener",
];

const CATEGORY_LABEL: Record<SourceCategoryId, string> = {
  web_search: "Web Search",
  filings: "Filings",
  fundamentals: "Fundamentals",
  market_data: "Market Data",
  news: "News",
  forums: "Forums",
  screener: "Screener",
};

type TestState = { status: string; message: string } | null;

export function DataSourcesSection() {
  const queryClient = useQueryClient();
  const { data: sources, error: fetchError } = useSources();
  const [draftKey, setDraftKey] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, TestState>>({});

  const setSourceKeyMutation = useSetSourceKey();
  const clearSourceKeyMutation = useClearSourceKey();
  const testSourceKeyMutation = useTestSourceKey();
  const setEnabledSourcesMutation = useSetEnabledSources();

  const error = fetchError ? String(fetchError) : null;

  const grouped = useMemo(() => {
    const out: Record<string, SourceDescriptor[]> = {};
    if (!sources) return out;
    for (const category of CATEGORY_ORDER) out[category] = [];
    for (const src of sources) {
      (out[src.category] ||= []).push(src);
    }
    return out;
  }, [sources]);

  const activeCategories = useMemo(
    () => CATEGORY_ORDER.filter((c) => (grouped[c] ?? []).length > 0),
    [grouped],
  );

  const isBusy = (_id: string) =>
    setSourceKeyMutation.isPending ||
    clearSourceKeyMutation.isPending ||
    testSourceKeyMutation.isPending ||
    setEnabledSourcesMutation.isPending;

  const onSaveKey = async (id: string) => {
    const key = draftKey[id]?.trim();
    if (!key) return;
    try {
      await setSourceKeyMutation.mutateAsync({ providerId: id, key });
      setDraftKey((prev) => ({ ...prev, [id]: "" }));
      await refreshSourceKeyStatus();
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { status: "error", message: String(err) },
      }));
    }
  };

  const onClearKey = async (id: string) => {
    try {
      await clearSourceKeyMutation.mutateAsync(id);
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { status: "error", message: String(err) },
      }));
    }
  };

  const onTestKey = async (id: string) => {
    try {
      const result = await testSourceKeyMutation.mutateAsync(id);
      setTestResults((prev) => ({ ...prev, [id]: result }));
      setTimeout(() => setTestResults((prev) => ({ ...prev, [id]: null })), 4000);
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { status: "error", message: String(err) },
      }));
    }
  };

  const onToggleEnabled = async (id: string, enabled: boolean) => {
    if (!sources) return;
    const next = sources.filter((s) => (s.id === id ? enabled : s.enabled)).map((s) => s.id);
    try {
      await setEnabledSourcesMutation.mutateAsync(next);
    } catch {
      // Error handled by mutation
    }
  };

  const onRefresh = async () => {
    await refreshSourceKeyStatus();
    await queryClient.invalidateQueries({ queryKey: queryKeys.sources });
  };

  const enabledCount = sources?.filter((s) => s.enabled).length ?? 0;
  const keyedCount = sources?.filter((s) => s.has_key).length ?? 0;

  return (
    <section className="space-y-5">
      <SectionHeader
        number="03"
        label="Data Sources"
        title="Provider registry"
        meta={
          sources && (
            <span className="flex items-center gap-3 text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
              <span className="tabular-nums">{String(enabledCount).padStart(2, "0")} enabled</span>
              <span aria-hidden className="h-3 w-px bg-[#dfe5ee]" />
              <span className="tabular-nums">{String(keyedCount).padStart(2, "0")} keyed</span>
              <span aria-hidden className="h-3 w-px bg-[#dfe5ee]" />
              <button type="button" onClick={onRefresh} className="hover:text-[#111827]">
                Refresh
              </button>
            </span>
          )
        }
      />
      <p className="max-w-[60ch] text-[14px] leading-[1.6] text-[#3f4653]">
        Enable the providers the agent may call during a research run. Paid-tier keys live in your
        OS keychain — Infi never writes them to disk. Disable a provider globally here, or flip it
        off for a single run from the composer.
      </p>
      {error && <div className="text-sm text-destructive">{error}</div>}
      {!sources ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="rounded-[10px] border border-[#e7e9ee] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="divide-y divide-[#e7e9ee]">
            {activeCategories.map((category, idx) => {
              const rows = grouped[category] ?? [];
              const enabledInCat = rows.filter((s) => s.enabled).length;
              return (
                <div key={category} className="px-5 py-5">
                  {idx > 0 && <div className="border-t border-[#e7e9ee] pt-5 mb-5" />}
                  <header className="flex items-baseline justify-between gap-4">
                    <div className="flex items-baseline gap-3">
                      <span className="text-[10.5px] font-medium tabular-nums text-[#3f4653]">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[10.5px] uppercase tracking-[0.18em] text-[#3572ad]">
                        {CATEGORY_LABEL[category]}
                      </span>
                    </div>
                    <span className="text-[10.5px] uppercase tracking-[0.14em] tabular-nums text-[#3f4653]">
                      {String(enabledInCat).padStart(2, "0")} /{" "}
                      {String(rows.length).padStart(2, "0")}
                    </span>
                  </header>
                  <div className="mt-4 space-y-0">
                    {rows.map((src) => (
                      <ProviderRow
                        key={src.id}
                        src={src}
                        busy={isBusy(src.id)}
                        draft={draftKey[src.id] ?? ""}
                        testResult={testResults[src.id]}
                        onDraftChange={(value) =>
                          setDraftKey((prev) => ({ ...prev, [src.id]: value }))
                        }
                        onSave={() => void onSaveKey(src.id)}
                        onClear={() => void onClearKey(src.id)}
                        onTest={() => void onTestKey(src.id)}
                        onToggleEnabled={(enabled) => void onToggleEnabled(src.id, enabled)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

interface ProviderRowProps {
  src: SourceDescriptor;
  busy: boolean;
  draft: string;
  testResult: TestState;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
  onTest: () => void;
  onToggleEnabled: (enabled: boolean) => void;
}

function ProviderRow({
  src,
  busy,
  draft,
  testResult,
  onDraftChange,
  onSave,
  onClear,
  onTest,
  onToggleEnabled,
}: ProviderRowProps) {
  const hasDraft = draft.trim().length > 0;
  const canTest = !src.requires_key || src.has_key;

  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-x-8 gap-y-3 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 space-y-1">
        <div className="flex items-baseline gap-3">
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
            {src.requires_key ? (src.has_key ? "Key stored" : "Key required") : "No key"}
          </span>
          {src.rate_limit_hint && (
            <span className="text-[10.5px] tabular-nums text-[#3f4653]/70">
              {src.rate_limit_hint}
            </span>
          )}
        </div>
        <h3 className="text-[16px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#111827]">
          {src.display_name}
        </h3>
        <p className="max-w-[60ch] text-[13px] leading-[1.55] text-[#3f4653]">{src.description}</p>
      </div>
      <EnabledToggle enabled={src.enabled} disabled={busy} onChange={onToggleEnabled} />
      <div className="col-span-2 space-y-3 pt-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
          <a
            href={src.docs_url}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-[3px] hover:text-[#111827] hover:underline"
          >
            Docs
          </a>
          {src.key_acquisition_url && (
            <>
              <span aria-hidden className="h-3 w-px bg-[#dfe5ee]" />
              <a
                href={src.key_acquisition_url}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-[3px] hover:text-[#111827] hover:underline"
              >
                Get key
              </a>
            </>
          )}
          <span aria-hidden className="h-3 w-px bg-[#dfe5ee]" />
          <span>{src.id}</span>
        </div>

        {src.requires_key ? (
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              placeholder={src.has_key ? "Replace stored key" : "Paste API key"}
              onChange={(event) => onDraftChange(event.target.value)}
              className="h-9 max-w-sm flex-1 rounded-[6px] border-[#dfe5ee] bg-transparent text-[13px] text-[#111827]"
            />
            <button
              type="button"
              disabled={busy || !hasDraft}
              onClick={onSave}
              className="inline-flex h-9 items-center rounded-[6px] border border-[#155dff] bg-[#155dff] px-4 text-[10.5px] uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#0d4ad6] disabled:cursor-not-allowed disabled:border-[#dfe5ee] disabled:bg-transparent disabled:text-[#3f4653]/50"
            >
              {src.has_key ? "Replace" : "Save"}
            </button>
            <span aria-hidden className="h-4 w-px bg-[#dfe5ee]" />
            <button
              type="button"
              disabled={busy || !canTest}
              onClick={onTest}
              className="text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653] transition-colors hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Test
            </button>
            {src.has_key && (
              <>
                <span aria-hidden className="h-4 w-px bg-[#dfe5ee]" />
                <button
                  type="button"
                  disabled={busy}
                  onClick={onClear}
                  className="text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653] transition-colors hover:text-[#e53e3e] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear
                </button>
              </>
            )}
            {testResult && (
              <span
                className={
                  "ml-auto text-[10.5px] uppercase tracking-[0.14em] tabular-nums " +
                  (testResult.status === "ok" ? "text-[#38a169]" : "text-[#e53e3e]")
                }
              >
                {testResult.status === "ok"
                  ? "OK"
                  : `FAIL · ${testResult.message.slice(0, 40).toUpperCase()}`}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={onTest}
              className="text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653] transition-colors hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Test reachability
            </button>
            {testResult && (
              <span
                className={
                  "text-[10.5px] uppercase tracking-[0.14em] tabular-nums " +
                  (testResult.status === "ok" ? "text-[#38a169]" : "text-[#e53e3e]")
                }
              >
                {testResult.status === "ok"
                  ? "OK"
                  : `FAIL · ${testResult.message.slice(0, 40).toUpperCase()}`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface EnabledToggleProps {
  enabled: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}

function EnabledToggle({ enabled, disabled, onChange }: EnabledToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={
        "inline-flex h-7 items-center gap-2 rounded-[6px] border px-2.5 text-[10.5px] uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
        (enabled
          ? "border-[#155dff] bg-[#155dff] text-white hover:bg-[#0d4ad6]"
          : "border-[#dfe5ee] text-[#3f4653] hover:border-[#155dff] hover:text-[#155dff]")
      }
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-white" : "bg-[#3f4653]/40"}`}
      />
      <span>{enabled ? "Enabled" : "Disabled"}</span>
    </button>
  );
}
