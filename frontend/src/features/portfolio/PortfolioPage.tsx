import {
  CaretDown,
  ChartPieSlice,
  CircleNotch,
  Database,
  DotsThree,
  FileArrowUp,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { AgentModelOptions, hasAgentModelChoices } from "@/components/Agent/AgentModelOptions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRunAnalysis } from "@/features/run-analysis/useRunAnalysis";
import { getLogoPath } from "@/lib/agents";
import {
  createPortfolioAnalysis,
  getPortfolioDetail,
  getSettings,
  parsePortfolioCsv,
  updateSettings,
} from "@/shared/api/commands";
import {
  useAnalyses,
  useCreatePortfolio,
  useDeletePortfolio,
  useImportPortfolioCsv,
  usePriceHistory,
  useRenamePortfolio,
} from "@/shared/api/queries";
import { getState, setState, useAppStore } from "@/store";
import type {
  AgentCandidate,
  AnalysisSummary,
  PortfolioCsvImportInput,
  PortfolioCsvRow,
  PortfolioDetail,
  PortfolioHolding,
} from "@/types";

async function persistModelByAgent(map: Record<string, string | null>) {
  try {
    const settings = await getSettings();
    const next: Record<string, string> = {};
    for (const [id, value] of Object.entries(map)) {
      if (value) next[id] = value;
    }
    await updateSettings({ ...settings, model_by_agent: next });
  } catch {
    // non-critical
  }
}

interface PortfolioPageProps {
  agents: AgentCandidate[];
  onSelectAnalysis: (analysisId: string) => void | Promise<void>;
}

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD", "SEK", "NOK"] as const;

export function PortfolioPage({ agents, onSelectAnalysis }: PortfolioPageProps) {
  const selectedPortfolioId = useAppStore((state) => state.selectedPortfolioId);
  const selectedPortfolio = useAppStore((state) => state.selectedPortfolio);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [createCurrency, setCreateCurrency] = useState<string>("USD");

  const createPortfolioMutation = useCreatePortfolio();

  const selectPortfolio = async (portfolioId: string) => {
    setLoadingPortfolio(true);
    setState({ selectedPortfolioId: portfolioId, selectedPortfolio: null, view: "portfolio" });
    try {
      const detail = await getPortfolioDetail(portfolioId);
      setState({ selectedPortfolio: detail });
    } catch (err) {
      toast.error("Could not load portfolio", { description: String(err) });
    } finally {
      setLoadingPortfolio(false);
    }
  };

  useEffect(() => {
    if (selectedPortfolioId && !selectedPortfolio) {
      void selectPortfolio(selectedPortfolioId);
    }
  }, [selectedPortfolioId, selectedPortfolio]);

  const handleCreate = async () => {
    try {
      const portfolio = await createPortfolioMutation.mutateAsync({
        name: "Portfolio",
        baseCurrency: createCurrency,
      });
      toast.success("Portfolio created", {
        description: `${portfolio.name} · ${portfolio.base_currency}`,
      });
      const detail = await getPortfolioDetail(portfolio.id);
      setState({
        selectedPortfolioId: portfolio.id,
        selectedPortfolio: detail,
        view: "portfolio",
      });
    } catch (err) {
      toast.error("Could not create portfolio", { description: String(err) });
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#fbfbfa]">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-6 pb-12 pt-5 lg:px-8">
          {selectedPortfolio ? (
            <PortfolioView
              detail={selectedPortfolio}
              loading={loadingPortfolio}
              agents={agents}
              onSelectAnalysis={onSelectAnalysis}
            />
          ) : (
            <EmptyCreate
              disabled={createPortfolioMutation.isPending}
              currency={createCurrency}
              onCurrencyChange={setCreateCurrency}
              onCreate={handleCreate}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyCreate({
  disabled,
  currency,
  onCurrencyChange,
  onCreate,
}: {
  disabled: boolean;
  currency: string;
  onCurrencyChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <section className="relative min-h-[360px] overflow-hidden">
      <div className="relative z-10 flex min-h-[360px] flex-col justify-center px-8 py-9 sm:px-11 lg:w-[62%] xl:w-[58%]">
        <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3572ad]">
          Portfolio workspace
        </p>
        <h1 className="max-w-[560px] text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-[#111827] sm:text-[52px]">
          Create a portfolio.
        </h1>
        <p className="mt-5 max-w-[520px] text-[14.5px] leading-[1.55] text-[#3f4653]">
          Set up a portfolio, paste or upload the current holdings snapshot, and run portfolio-level
          research when you want it.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
              Base currency
            </span>
            <Select value={currency} onValueChange={onCurrencyChange}>
              <SelectTrigger className="h-10 w-[140px] rounded-[6px] border border-[#dfe5ee] bg-white/80 font-mono uppercase shadow-none hover:border-[#cbd5e1] hover:bg-white data-[state=open]:border-[#155dff]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((code) => (
                  <SelectItem key={code} value={code} className="font-mono">
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={onCreate}
            className="inline-flex h-10 items-center gap-3 rounded-[6px] border border-[#155dff] bg-[#155dff] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#0d4ad6] disabled:border-[#dfe5ee] disabled:bg-[#f1f5ff] disabled:text-[#155dff]/35"
          >
            {disabled && <SpinnerGap size={14} className="animate-spin" />}
            Create a portfolio
          </button>
        </div>
        <div className="mt-6 flex flex-wrap gap-2.5 lg:flex-nowrap">
          <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[5px] border border-[#dde6f2] bg-white/75 px-3 text-[12px] font-medium text-[#1c2430]">
            <ChartPieSlice size={17} weight="duotone" className="text-[#155dff]" />
            Portfolio tracking
          </span>
          <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[5px] border border-[#dde6f2] bg-white/75 px-3 text-[12px] font-medium text-[#1c2430]">
            <Database size={17} weight="duotone" className="text-[#155dff]" />
            Holdings snapshot
          </span>
        </div>
      </div>
    </section>
  );
}

function PortfolioView({
  detail,
  loading,
  agents,
  onSelectAnalysis,
}: {
  detail: PortfolioDetail;
  loading: boolean;
  agents: AgentCandidate[];
  onSelectAnalysis: (analysisId: string) => void | Promise<void>;
}) {
  const [snapshotText, setSnapshotText] = useState("");
  const [analysisStarting, setAnalysisStarting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(detail.portfolio.name);
  const lastImportAt = detail.import_batches[0]?.imported_at ?? null;
  const baseCurrency = detail.portfolio.base_currency || "USD";

  const importCsvMutation = useImportPortfolioCsv();
  const renameMutation = useRenamePortfolio();
  const deleteMutation = useDeletePortfolio();

  useEffect(() => {
    if (!editingName) setDraftName(detail.portfolio.name);
  }, [detail.portfolio.name, editingName]);

  const storeAgentId = useAppStore((state) => state.agentId);
  const hasAnyAvailableAgent = agents.some((agent) => agent.available);
  const availableAgents = agents.filter((agent) => agent.available);

  const { startWithAnalysisId } = useRunAnalysis({
    agentId: storeAgentId,
    agents,
    canRun: hasAnyAvailableAgent,
  });

  const totalsByCurrency = detail.totals_by_currency;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      setSnapshotText(text);
    } catch (err) {
      toast.error("Could not read file", { description: String(err) });
    }
  };

  const handleUpdate = async () => {
    const trimmed = snapshotText.trim();
    if (!trimmed) {
      toast.error("Paste or upload a snapshot first");
      return;
    }
    let rows: PortfolioCsvRow[];
    try {
      rows = await parsePortfolioCsv(trimmed);
    } catch (err) {
      toast.error("CSV parsing failed", { description: String(err) });
      return;
    }
    if (rows.length === 0) {
      toast.error("No importable rows detected");
      return;
    }
    try {
      const input: PortfolioCsvImportInput = {
        portfolio_id: detail.portfolio.id,
        portfolio_name: detail.portfolio.name,
        account_id: null,
        account_name: "Current snapshot",
        institution: null,
        account_type: "snapshot",
        base_currency: baseCurrency,
        source_name: "snapshot update",
        import_kind: "positions",
        rows,
      };
      const result = await importCsvMutation.mutateAsync(input);
      const reviewNote =
        result.review_count > 0
          ? ` · ${result.review_count} need review: ${result.warnings.map((w) => w.message).join("; ")}`
          : "";
      toast.success("Snapshot updated", {
        description: `${result.imported_count} rows imported${reviewNote}`,
      });
      const fresh = await getPortfolioDetail(result.portfolio_id);
      setState({ selectedPortfolio: fresh });
      setSnapshotText("");
    } catch (err) {
      toast.error("Update failed", { description: String(err) });
    }
  };

  const commitRename = async () => {
    const next = draftName.trim();
    setEditingName(false);
    if (!next || next === detail.portfolio.name) {
      setDraftName(detail.portfolio.name);
      return;
    }
    try {
      await renameMutation.mutateAsync({ portfolioId: detail.portfolio.id, name: next });
      setState({
        selectedPortfolio: {
          ...detail,
          portfolio: {
            ...detail.portfolio,
            name: next,
            updated_at: new Date().toISOString(),
          },
        },
      });
    } catch (err) {
      setDraftName(detail.portfolio.name);
      toast.error("Rename failed", { description: String(err) });
    }
  };

  const cancelRename = () => {
    setDraftName(detail.portfolio.name);
    setEditingName(false);
  };

  const handleNameKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void commitRename();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelRename();
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${detail.portfolio.name}"? This removes its holdings and snapshot history. Analyses already created from it stay.`,
    );
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(detail.portfolio.id);
      toast.success("Portfolio deleted");
      setState({
        selectedPortfolioId: null,
        selectedPortfolio: null,
        view: "portfolio",
      });
    } catch (err) {
      toast.error("Delete failed", { description: String(err) });
    }
  };

  const startAnalysisWith = async (pickedAgentId: string, pickedModelId: string | null) => {
    const agent = agents.find((candidate) => candidate.id === pickedAgentId);
    if (!agent?.available) {
      toast.error("That agent isn't available. Configure it in Settings.");
      return;
    }

    // Persist the choice so future clicks remember it.
    const prevMap = getState().modelByAgent;
    const nextMap: Record<string, string | null> = { ...prevMap, [pickedAgentId]: pickedModelId };
    setState({ agentId: pickedAgentId, modelByAgent: nextMap });
    void persistModelByAgent(nextMap);

    setAnalysisStarting(true);
    try {
      const { analysis_id, effective_prompt } = await createPortfolioAnalysis(
        detail.portfolio.id,
        null,
      );
      startWithAnalysisId(analysis_id, effective_prompt, {
        agentId: pickedAgentId,
        modelId: pickedModelId,
      });
    } catch (err) {
      toast.error("Could not start analysis", { description: String(err) });
    } finally {
      setAnalysisStarting(false);
    }
  };

  const sortedHoldings = detail.holdings;

  const placeholderCurrency = baseCurrency;
  const placeholder = `Paste CSV (market is optional — use it to pin a listing):\nSymbol, Market, Quantity, Price, Currency\nAAPL, NASDAQ, 10, 190, ${placeholderCurrency}`;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 space-y-3">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3572ad]">
            Portfolio
          </p>
          {editingName ? (
            <div className="space-y-1">
              <Input
                autoFocus
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={() => void commitRename()}
                onKeyDown={handleNameKeyDown}
                disabled={renameMutation.isPending}
                className="h-auto max-w-[640px] rounded-[6px] border border-[#155dff] bg-white p-3 text-[34px] font-semibold leading-[1.02] tracking-[-0.02em] text-[#111827] shadow-none focus-visible:border-[#155dff] focus-visible:ring-0 md:text-[48px]"
                aria-label="Portfolio name"
              />
              <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
                ↵ save · esc cancel
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="group block max-w-[640px] truncate text-left text-[34px] font-semibold leading-[1.02] tracking-[-0.02em] text-[#111827] hover:text-[#155dff] md:text-[48px]"
              title="Click to rename"
            >
              <span className="border-b border-transparent group-hover:border-[#155dff]">
                {detail.portfolio.name}
              </span>
            </button>
          )}
          <PortfolioMeta
            baseCurrency={baseCurrency}
            holdingCount={detail.holdings.length}
            totals={totalsByCurrency}
            lastImportAt={lastImportAt}
          />
        </div>
        <div className="flex items-center gap-1">
          <RunAnalysisMenu
            agents={agents}
            availableAgents={availableAgents}
            disabled={analysisStarting || detail.holdings.length === 0 || !hasAnyAvailableAgent}
            running={analysisStarting}
            onPick={(pickedAgentId, pickedModelId) => {
              void startAnalysisWith(pickedAgentId, pickedModelId);
            }}
          />
          <PortfolioOverflowMenu
            onRename={() => setEditingName(true)}
            onDelete={() => void handleDelete()}
            deleting={deleteMutation.isPending}
          />
        </div>
      </header>

      {!hasAnyAvailableAgent && (
        <div className="flex items-center gap-2 rounded-[6px] border border-[#f0a8a8] bg-[#fff5f5] px-4 py-3 text-xs text-[#c0392b]">
          <WarningCircle size={14} />
          <span>Configure an ACP agent binary in Settings before running analysis.</span>
        </div>
      )}

      <section className="space-y-5">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
            01 · Holdings
          </span>
          <div className="h-px flex-1 bg-[#dfe5ee]" />
          <span className="text-[13px] font-medium text-[#111827]">Current allocation</span>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 rounded-[10px] border border-[#e7e9ee] bg-white px-5 py-4 text-sm text-[#3f4653]">
            <SpinnerGap size={14} className="animate-spin" />
            Loading
          </div>
        ) : sortedHoldings.length === 0 ? (
          <div className="rounded-[10px] border border-[#e7e9ee] bg-white px-5 py-6 text-sm leading-[1.6] text-[#3f4653]">
            Update the snapshot to build the holdings view.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-[#e7e9ee] bg-white">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[minmax(150px,1.2fr)_80px_100px_100px_120px_90px] gap-3 border-b border-[#e7e9ee] px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
                <span>Instrument</span>
                <span className="text-right">30d</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Price</span>
                <span className="text-right">Value</span>
                <span className="text-right">Weight</span>
              </div>
              {sortedHoldings.map((holding) => (
                <HoldingRow
                  key={`${holding.symbol}-${holding.market ?? ""}-${holding.currency}`}
                  holding={holding}
                  baseCurrency={baseCurrency}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <PortfolioAnalysesSection
        portfolioId={detail.portfolio.id}
        onSelectAnalysis={onSelectAnalysis}
      />

      <section className="space-y-5">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
            03 · Snapshot
          </span>
          <div className="h-px flex-1 bg-[#dfe5ee]" />
          <span className="text-[13px] font-medium text-[#111827]">Update current holdings</span>
        </div>
        <div className="rounded-[10px] border border-[#e7e9ee] bg-white p-5">
          <textarea
            value={snapshotText}
            onChange={(event) => setSnapshotText(event.target.value)}
            placeholder={placeholder}
            className="min-h-[180px] w-full rounded-[6px] border border-[#dfe5ee] bg-[#fbfbfa] p-3 font-mono text-[12.5px] leading-[1.5] text-[#111827] shadow-none outline-none focus:border-[#155dff] placeholder:text-[#3f4653]/50"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#dfe5ee] bg-white/80 px-4 text-[13px] font-medium text-[#171b23] transition-colors hover:border-[#cbd5e1] hover:bg-white"
            >
              <FileArrowUp size={14} />
              Upload CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={handleFile}
            />
            <button
              type="button"
              disabled={importCsvMutation.isPending || snapshotText.trim().length === 0}
              onClick={handleUpdate}
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#155dff] bg-[#155dff] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#0d4ad6] disabled:border-[#dfe5ee] disabled:bg-[#f1f5ff] disabled:text-[#155dff]/35"
            >
              {importCsvMutation.isPending && <SpinnerGap size={14} className="animate-spin" />}
              Update snapshot
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function PortfolioMeta({
  baseCurrency,
  holdingCount,
  totals,
  lastImportAt,
}: {
  baseCurrency: string;
  holdingCount: number;
  totals: [string, number][];
  lastImportAt: string | null;
}) {
  // Empty state: don't fake "00 holdings" or an em-dash. The important fact is
  // "no snapshot yet" — everything else is noise.
  if (holdingCount === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
        <span>{baseCurrency}</span>
        <span aria-hidden className="text-[#3f4653]/40">
          ·
        </span>
        <span>No snapshot yet</span>
      </div>
    );
  }

  const segments: string[] = [baseCurrency, `${String(holdingCount).padStart(2, "0")} holdings`];
  if (totals.length === 1) {
    segments.push(formatMoney(totals[0][1], totals[0][0]));
  } else if (totals.length > 1) {
    segments.push(`${totals.length} currencies`);
  }
  if (lastImportAt) {
    segments.push(`Updated ${formatDate(lastImportAt)}`);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
        {segments.map((segment, index) => (
          <span key={segment} className="flex items-center gap-3">
            {index > 0 && (
              <span aria-hidden className="text-[#3f4653]/40">
                ·
              </span>
            )}
            <span className="tabular-nums">{segment}</span>
          </span>
        ))}
      </div>
      {totals.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]/50">
          {totals.map(([code, sum], index) => (
            <span key={code} className="flex items-center gap-3">
              {index > 0 && (
                <span aria-hidden className="text-[#3f4653]/20">
                  ·
                </span>
              )}
              <span className="tabular-nums">{formatMoney(sum, code)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioOverflowMenu({
  onRename,
  onDelete,
  deleting,
}: {
  onRename: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Portfolio actions"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[6px] border border-[#dfe5ee] bg-white/80 text-[#3f4653] transition-colors hover:border-[#cbd5e1] hover:bg-white data-[state=open]:border-[#155dff] data-[state=open]:bg-white"
        >
          <DotsThree size={18} weight="bold" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[180px] rounded-[10px] border border-[#e7e9ee] bg-white/95 p-1 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl"
      >
        <DropdownMenuItem
          onSelect={() => {
            // Defer so the menu animates closed before the input focuses.
            setTimeout(onRename, 0);
          }}
          className="gap-2 text-xs"
        >
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={deleting}
          onSelect={() => {
            setTimeout(onDelete, 0);
          }}
          className="gap-2 text-xs text-destructive focus:text-destructive"
        >
          {deleting ? "Deleting…" : "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RunAnalysisMenu({
  agents,
  availableAgents,
  disabled,
  running,
  onPick,
}: {
  agents: AgentCandidate[];
  availableAgents: AgentCandidate[];
  disabled: boolean;
  running: boolean;
  onPick: (agentId: string, modelId: string | null) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-[#155dff] bg-[#155dff] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#0d4ad6] disabled:border-[#dfe5ee] disabled:bg-[#f1f5ff] disabled:text-[#155dff]/35"
        >
          {running && <SpinnerGap size={14} className="animate-spin" />}
          <span>Run analysis</span>
          <CaretDown size={12} weight="bold" className="ml-1" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[240px] rounded-[10px] border border-[#e7e9ee] bg-white/95 p-1 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl"
      >
        {availableAgents.length === 0 && (
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            No available agents — open Settings
          </DropdownMenuItem>
        )}
        {agents.map((agent) => {
          const isUnavailable = !agent.available;
          const hasModels = hasAgentModelChoices(agent);

          if (hasModels && !isUnavailable) {
            return (
              <DropdownMenuSub key={agent.id}>
                <DropdownMenuSubTrigger className="gap-2 text-xs">
                  <img
                    src={getLogoPath(agent.label)}
                    alt={agent.label}
                    className="h-3.5 w-3.5 object-contain opacity-80"
                  />
                  <span className="flex-1 truncate">{agent.label}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-[220px] p-1">
                  <AgentModelOptions
                    agent={agent}
                    activeModelId={null}
                    isSelected={false}
                    onSelect={onPick}
                    showChecks={false}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            );
          }

          return (
            <DropdownMenuItem
              key={agent.id}
              disabled={isUnavailable}
              onSelect={() => onPick(agent.id, null)}
              className="gap-2 text-xs"
            >
              <img
                src={getLogoPath(agent.label)}
                alt={agent.label}
                className="h-3.5 w-3.5 object-contain opacity-80"
              />
              <span className="flex-1 truncate">{agent.label}</span>
              {isUnavailable && <span className="text-[10px] text-muted-foreground">offline</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HoldingRow({
  holding,
  baseCurrency,
}: {
  holding: PortfolioHolding;
  baseCurrency: string;
}) {
  const price =
    holding.market_value !== null && holding.quantity !== 0
      ? holding.market_value / holding.quantity
      : null;
  const currency = holding.currency || baseCurrency;
  return (
    <div className="grid grid-cols-[minmax(150px,1.2fr)_80px_100px_100px_120px_90px] items-center gap-3 border-t border-[#e7e9ee] px-5 py-3.5 text-[13px]">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-medium text-[#111827]">{holding.symbol}</span>
          {holding.market && (
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
              {holding.market}
            </span>
          )}
        </div>
        <div className="truncate text-xs text-[#3f4653]/70">
          {holding.name ?? holding.asset_type}
        </div>
      </div>
      <HoldingSparkline symbol={holding.symbol} market={holding.market} />
      <span className="text-right font-mono tabular-nums text-[#111827]">
        {formatNumber(holding.quantity)}
      </span>
      <span className="text-right font-mono tabular-nums text-[#111827]">
        {price !== null ? formatMoney(price, currency) : "—"}
      </span>
      <span className="text-right font-mono tabular-nums text-[#111827]">
        {holding.market_value !== null ? formatMoney(holding.market_value, currency) : "—"}
      </span>
      <span className="text-right font-mono tabular-nums text-[#111827]">
        {holding.allocation_pct !== null ? formatPercent(holding.allocation_pct) : "—"}
      </span>
    </div>
  );
}

function PortfolioAnalysesSection({
  portfolioId,
  onSelectAnalysis,
}: {
  portfolioId: string;
  onSelectAnalysis: (analysisId: string) => void | Promise<void>;
}) {
  const { data: analyses = [] } = useAnalyses();
  const linked = useMemo(
    () => analyses.filter((analysis) => analysis.portfolio_id === portfolioId),
    [analyses, portfolioId],
  );

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-4">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
          02 · Analyses
        </span>
        <div className="h-px flex-1 bg-[#dfe5ee]" />
        <span className="text-[13px] font-medium text-[#111827]">Linked research</span>
      </div>
      {linked.length === 0 ? (
        <div className="rounded-[10px] border border-[#e7e9ee] bg-white px-5 py-6 text-sm leading-[1.6] text-[#3f4653]">
          No analyses yet. Run one with the "Run analysis" action above.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-[#e7e9ee] bg-white">
          {linked.map((analysis) => (
            <AnalysisRow
              key={analysis.id}
              analysis={analysis}
              onSelect={() => void onSelectAnalysis(analysis.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AnalysisRow({ analysis, onSelect }: { analysis: AnalysisSummary; onSelect: () => void }) {
  const running =
    analysis.active_run_status === "running" || analysis.active_run_status === "queued";
  const statusText = running ? "RUNNING" : analysisStatusLabel(analysis);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-[#e7e9ee] px-5 py-3.5 text-left transition-colors hover:bg-[#f5f7fa] first:border-0"
    >
      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium text-[#111827]">{analysis.title}</div>
        <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#3f4653]">
          {formatDate(analysis.updated_at)}
          <span aria-hidden className="mx-2 text-[#3f4653]/40">
            ·
          </span>
          <span className="tabular-nums">{String(analysis.block_count).padStart(2, "0")}b</span>
          <span aria-hidden className="mx-2 text-[#3f4653]/40">
            ·
          </span>
          <span className="tabular-nums">{String(analysis.source_count).padStart(2, "0")}s</span>
        </div>
      </div>
      <span
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] ${running ? "bg-[#e4ecff] text-[#155dff]" : "bg-[#f1f5ff] text-[#3f4653]"}`}
      >
        {running && <CircleNotch size={10} className="animate-spin" />}
        {statusText}
      </span>
    </button>
  );
}

function analysisStatusLabel(analysis: AnalysisSummary): string {
  switch (analysis.status) {
    case "completed":
      return "DONE";
    case "failed":
      return "FAILED";
    case "cancelled":
      return "STOPPED";
    case "running":
      return "RUNNING";
    case "queued":
      return "QUEUED";
    default:
      return String(analysis.status).toUpperCase();
  }
}

function HoldingSparkline({ symbol, market }: { symbol: string; market: string | null }) {
  const { data: series } = usePriceHistory(symbol, market);

  if (!series || series.length < 2) {
    return (
      <span aria-hidden className="block text-right text-muted-foreground/40">
        —
      </span>
    );
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const width = 72;
  const height = 22;
  const step = width / (series.length - 1);
  const points = series
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = series[series.length - 1] >= series[0];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`ml-auto block h-[22px] w-[72px] ${up ? "text-foreground" : "text-muted-foreground"}`}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
      {label}
    </span>
  );
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
    }).format(value);
  } catch {
    // Fallback if the currency code isn't recognized by Intl.
    return `${value.toFixed(Math.abs(value) >= 1000 ? 0 : 2)} ${currency}`;
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
