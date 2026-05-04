import {
  CaretDown,
  CircleNotch,
  FolderSimple,
  MagnifyingGlass,
  Plus,
  Tray,
  X,
} from "@phosphor-icons/react";
import {
  type CSSProperties,
  type KeyboardEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AppView } from "@/app/navigation";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/editorial";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { AnalysisSummary, PortfolioSummary } from "@/types";

interface AppSidebarProps {
  analyses: AnalysisSummary[];
  portfolios: PortfolioSummary[];
  currentView: AppView;
  selectedAnalysisId: string | null;
  selectedPortfolioId: string | null;
  onViewChange: (view: AppView) => void;
  onSelectAnalysis: (analysisId: string) => void | Promise<void>;
  onSelectPortfolio: (portfolioId: string) => void | Promise<void>;
  onNewPortfolio: () => void | Promise<void>;
  currentVersion: string | null;
  updateAvailable: boolean;
  onUpdateClick: () => void;
}

const SECTION_CAP = 5;
const SEARCH_MIN = 15;

export function AppSidebar({
  analyses,
  portfolios,
  currentView,
  selectedAnalysisId,
  selectedPortfolioId,
  onViewChange,
  onSelectAnalysis,
  onSelectPortfolio,
  onNewPortfolio,
  currentVersion,
  updateAvailable,
  onUpdateClick,
}: AppSidebarProps) {
  const [analysesExpanded, setAnalysesExpanded] = useState(false);
  const [portfoliosExpanded, setPortfoliosExpanded] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [search, setSearch] = useState("");

  const filteredAnalyses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return analyses;
    return analyses.filter((analysis) => analysis.title.toLowerCase().includes(query));
  }, [analyses, search]);

  const visibleAnalyses = analysesExpanded
    ? filteredAnalyses
    : filteredAnalyses.slice(0, SECTION_CAP);
  const hiddenAnalysesCount = Math.max(0, filteredAnalyses.length - SECTION_CAP);

  const visiblePortfolios = portfoliosExpanded ? portfolios : portfolios.slice(0, SECTION_CAP);
  const hiddenPortfoliosCount = Math.max(0, portfolios.length - SECTION_CAP);

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar" variant="sidebar">
      <div data-tauri-drag-region className="h-10 shrink-0" />

      <SidebarContent className="overflow-y-auto">
        <SidebarGroup className="px-0 py-0">
          <SidebarGroupContent className="flex flex-col gap-0">
            <section className="border-b border-sidebar-border px-2 pb-4 pt-2">
              <FilterItem
                icon={<Tray size={16} weight="fill" />}
                label="Analyses"
                count={analyses.length}
                active={currentView === "analysis" || currentView === "new-analysis"}
                onClick={() => onViewChange("new-analysis")}
              />
              <FilterItem
                icon={<FolderSimple size={16} weight="fill" />}
                label="Portfolios"
                count={portfolios.length}
                active={currentView === "portfolio"}
                onClick={() => {
                  if (selectedPortfolioId) {
                    void onSelectPortfolio(selectedPortfolioId);
                  }
                }}
              />
            </section>

            <section className="px-1 py-2">
              <SectionBandHeader
                label="Analyses"
                accentClass="text-[var(--accent-red)]"
                actions={
                  <div className="flex items-center gap-2">
                    {analyses.length >= SEARCH_MIN && (
                      <IconButton
                        ariaLabel="Search analyses"
                        onClick={() => setSearchActive((active) => !active)}
                      >
                        <MagnifyingGlass size={12} weight="bold" />
                      </IconButton>
                    )}
                    <IconButton
                      ariaLabel="New analysis"
                      onClick={() => onViewChange("new-analysis")}
                    >
                      <Plus size={12} weight="bold" />
                    </IconButton>
                  </div>
                }
              />
            </section>

            <section className="px-2 pb-2">
              {searchActive && (
                <SearchHeader
                  value={search}
                  onChange={setSearch}
                  onClose={() => {
                    setSearch("");
                    setSearchActive(false);
                  }}
                />
              )}
              {analyses.length === 0 ? (
                <EmptyCta
                  label="New analysis"
                  onClick={() => onViewChange("new-analysis")}
                  isActive={currentView === "new-analysis"}
                />
              ) : filteredAnalyses.length === 0 ? (
                <p className="mt-2 px-2 text-[12px] leading-[1.55] text-sidebar-foreground/55">
                  No match for "{search.trim()}".
                </p>
              ) : (
                <>
                  <SidebarMenu className="mt-1 gap-0.5">
                    {visibleAnalyses.map((analysis) => (
                      <SidebarMenuItem key={analysis.id} className="sidebar-report-row">
                        <SidebarMenuButton
                          asChild
                          isActive={
                            currentView === "analysis" && selectedAnalysisId === analysis.id
                          }
                          className="h-auto items-start rounded-[6px] px-0 py-0 text-[13px] font-normal data-[active=true]:font-normal data-[active=true]:bg-[var(--accent-red-light)]"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="h-auto min-w-0 flex-col items-stretch justify-start gap-1 rounded-[6px] px-4 py-[7px] text-[13px]"
                            onClick={() => {
                              void onSelectAnalysis(analysis.id);
                            }}
                          >
                            <MarqueeTitle title={analysis.title} />
                            <AnalysisMeta analysis={analysis} />
                          </Button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                  <Expander
                    hiddenCount={hiddenAnalysesCount}
                    expanded={analysesExpanded}
                    onToggle={() => setAnalysesExpanded((prev) => !prev)}
                  />
                </>
              )}
            </section>

            <section className="border-t border-sidebar-border px-1 py-2">
              <SectionBandHeader
                label="Portfolios"
                accentClass="text-[var(--accent-purple)]"
                actions={
                  <IconButton
                    ariaLabel="New portfolio"
                    onClick={() => {
                      void onNewPortfolio();
                    }}
                  >
                    <Plus size={12} weight="bold" />
                  </IconButton>
                }
              />
            </section>

            <section className="px-2 pb-3">
              {portfolios.length === 0 ? (
                <EmptyCta
                  label="New portfolio"
                  onClick={() => {
                    void onNewPortfolio();
                  }}
                  isActive={false}
                />
              ) : (
                <>
                  <SidebarMenu className="mt-0.5 gap-0.5">
                    {visiblePortfolios.map((portfolio) => (
                      <SidebarMenuItem key={portfolio.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={
                            currentView === "portfolio" && selectedPortfolioId === portfolio.id
                          }
                          className="h-auto items-center rounded-[6px] px-0 py-0 text-[13px] font-normal data-[active=true]:bg-[var(--accent-purple-light)]"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="h-auto min-w-0 items-center justify-between gap-2 rounded-[6px] px-4 py-[7px] text-[13px]"
                            onClick={() => {
                              void onSelectPortfolio(portfolio.id);
                            }}
                          >
                            <MarqueeTitle title={portfolio.name} />
                            <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/50">
                              {portfolio.base_currency}
                            </span>
                          </Button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                  <Expander
                    hiddenCount={hiddenPortfoliosCount}
                    expanded={portfoliosExpanded}
                    onToggle={() => setPortfoliosExpanded((prev) => !prev)}
                  />
                </>
              )}
            </section>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 border-t border-sidebar-border px-3 py-3">
        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-9 w-full justify-center gap-2 px-3"
          onClick={() => onViewChange("new-analysis")}
        >
          <Tray size={14} weight="bold" />
          <span>New Analysis</span>
        </Button>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onViewChange("settings")}
            className={cn(
              "text-[12.5px] transition-colors",
              currentView === "settings"
                ? "text-sidebar-foreground"
                : "text-sidebar-foreground/50 hover:text-sidebar-foreground",
            )}
          >
            Settings
          </button>
          {updateAvailable && (
            <button
              type="button"
              onClick={onUpdateClick}
              className="text-[10.5px] uppercase tracking-[0.14em] text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
            >
              Update ↑
            </button>
          )}
        </div>
        {currentVersion && (
          <span className="text-[10.5px] tabular-nums text-sidebar-foreground/35">
            v{currentVersion}
          </span>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function SectionBandHeader({
  label,
  accentClass,
  actions,
}: {
  label: string;
  accentClass: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-[4px] px-3 py-1.5">
      <div className="flex items-center gap-2">
        <span className={cn("text-[15px]", accentClass)}>
          <FolderSimple size={15} weight="fill" />
        </span>
        <Eyebrow className="text-sidebar-foreground">{label}</Eyebrow>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <span className="text-sidebar-foreground/55">
          <CaretDown size={13} weight="bold" />
        </span>
      </div>
    </div>
  );
}

function FilterItem({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mt-1 flex w-full items-center justify-between rounded-[6px] px-4 py-[7px] text-left transition-colors",
        active
          ? "bg-[var(--accent-blue-light)] text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
      )}
    >
      <span className="flex items-center gap-2 text-[13px] font-medium">
        <span className={cn(active ? "text-primary" : "text-sidebar-foreground")}>{icon}</span>
        <span>{label}</span>
      </span>
      <span
        className={cn(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
          active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
        )}
      >
        {Math.min(99, count)}
      </span>
    </button>
  );
}

function IconButton({
  children,
  ariaLabel,
  onClick,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-[4px] text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
    >
      {children}
    </button>
  );
}

function SearchHeader({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };
  return (
    <div className="mb-1 flex h-8 items-center gap-2 rounded-[6px] border border-[var(--search-border)] bg-[var(--search-input-bg)] px-2">
      <MagnifyingGlass size={13} weight="bold" className="text-sidebar-foreground/45" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!value) onClose();
        }}
        placeholder="Search analyses"
        className="flex-1 bg-transparent text-[12.5px] text-sidebar-foreground outline-none placeholder:text-sidebar-foreground/40"
      />
      <IconButton ariaLabel="Close search" onClick={onClose}>
        <X size={12} weight="bold" />
      </IconButton>
    </div>
  );
}

function EmptyCta({
  label,
  onClick,
  isActive,
}: {
  label: string;
  onClick: () => void;
  isActive: boolean;
}) {
  return (
    <SidebarMenu className="mt-1">
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isActive}
          onClick={onClick}
          className="h-8 rounded-[6px] text-[13px] font-normal data-[active=true]:bg-[var(--accent-blue-light)]"
        >
          <span className="flex items-center gap-2">
            <span aria-hidden className="text-muted-foreground">
              +
            </span>
            <span>{label}</span>
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function Expander({
  hiddenCount,
  expanded,
  onToggle,
}: {
  hiddenCount: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (hiddenCount === 0 && !expanded) return null;
  const label = expanded ? "Show less ↑" : `${hiddenCount} more ↓`;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-1 flex h-6 w-full items-center px-2 text-[10.5px] uppercase tracking-[0.14em] text-sidebar-foreground/45 transition-colors hover:text-sidebar-foreground"
    >
      {label}
    </button>
  );
}

function AnalysisMeta({ analysis }: { analysis: AnalysisSummary }) {
  const running =
    analysis.active_run_status === "running" || analysis.active_run_status === "queued";

  return (
    <span className="flex items-center gap-1.5 pl-0 text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/45">
      {running ? (
        <>
          <CircleNotch size={10} className="animate-spin text-primary" />
          <span className="text-primary">Running</span>
        </>
      ) : (
        <>
          <span>{statusLabel(analysis)}</span>
          <span aria-hidden className="text-sidebar-foreground/25">
            ·
          </span>
          <span className="tabular-nums">{String(analysis.block_count).padStart(2, "0")}b</span>
          <span aria-hidden className="text-sidebar-foreground/25">
            ·
          </span>
          <span className="tabular-nums">{String(analysis.source_count).padStart(2, "0")}s</span>
        </>
      )}
    </span>
  );
}

function statusLabel(analysis: AnalysisSummary): string {
  switch (analysis.status) {
    case "completed":
      return "Done";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Stopped";
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    default:
      return analysis.status;
  }
}

function MarqueeTitle({ title }: { title: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [metrics, setMetrics] = useState({ scrollable: false, distance: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const text = textRef.current;
      if (!container || !text) return;

      const measuredDistance = Math.max(0, text.scrollWidth - container.clientWidth);
      const titleDistance = title.length > 24 ? Math.round(title.length * 6.5) : 0;
      const distance = Math.max(measuredDistance, titleDistance);
      setMetrics({ scrollable: distance > 2, distance });
    };

    measure();

    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    if (textRef.current) observer.observe(textRef.current);

    return () => observer.disconnect();
  }, [title]);

  const style = {
    "--marquee-offset": `-${metrics.distance}px`,
    "--marquee-duration": `${Math.min(18, Math.max(8, metrics.distance / 14 + 7))}s`,
  } as CSSProperties;

  return (
    <span
      ref={containerRef}
      className="sidebar-report-title text-sidebar-foreground"
      data-scrollable={metrics.scrollable ? "true" : undefined}
      style={style}
    >
      <span ref={textRef} className="sidebar-report-title-inner">
        {title}
      </span>
    </span>
  );
}
