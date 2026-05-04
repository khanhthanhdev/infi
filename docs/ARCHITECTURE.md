# Architecture

Infi is a Tauri 2 desktop application for AI-powered stock and portfolio research. It pairs a Rust backend with a Vite + React frontend. The backend persists structured analysis reports in SQLite and orchestrates external ACP (Agent Client Protocol) coding agents. The agent never emits free-form prose as the final output — it must submit every claim, metric, and stance through Infi-controlled MCP tools so the report is assembled from typed blocks, not parsed from markdown.

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Layer Map](#layer-map)
3. [Domain Layer (`src/domain`)](#domain-layer)
4. [Infrastructure Layer (`src/infra`)](#infrastructure-layer)
   - [Database (`infra/db`)](#database)
   - [ACP Integration (`infra/acp`)](#acp-integration)
   - [Data Sources (`infra/sources`)](#data-sources)
   - [Configuration (`infra/app_config`)](#configuration)
   - [Keystore (`infra/keystore`)](#keystore)
   - [Progress Events (`infra/progress`)](#progress-events)
   - [Other Infra Modules](#other-infra-modules)
5. [Commands Layer (`src/commands`)](#commands-layer)
6. [Prompt Engineering (`src/prompts`)](#prompt-engineering)
7. [Frontend (`frontend/src`)](#frontend)
   - [Application Shell](#application-shell)
   - [State Management](#state-management)
   - [API Layer](#api-layer)
   - [Feature Modules](#feature-modules)
   - [UI Design System](#ui-design-system)
8. [Run Lifecycle](#run-lifecycle)
9. [Data Flow](#data-flow)
10. [Agent Discovery & Launch](#agent-discovery--launch)
11. [MCP Server Tool Surface](#mcp-server-tool-surface)
12. [Explanation Pass](#explanation-pass)
13. [Portfolio Analysis](#portfolio-analysis)
14. [Report Export & Publishing](#report-export--publishing)
15. [Data Freshness & Verification](#data-freshness--verification)
16. [Safety Defaults](#safety-defaults)
17. [Environment Variables](#environment-variables)
18. [Build & CI](#build--ci)
19. [Directory Structure](#directory-structure)

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Tauri Window (Vite + React)                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Research  │  │ Analysis │  │Portfolio │  │  Settings  │  │
│  │  Page     │  │  Page    │  │  Page    │  │   Page     │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │  Tauri IPC (invoke / Channel)              │         │
├───────┼────────────────────────────────────────────┼─────────┤
│       ▼                                            ▼         │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Tauri Commands (src/commands)                       │    │
│  │  create_analysis, generate_analysis, get_report, ... │    │
│  └──────────┬──────────────────────────┬────────────────┘    │
│             │                          │                     │
│  ┌──────────▼──────────┐  ┌───────────▼─────────────────┐   │
│  │  Domain (src/domain) │  │  Infra (src/infra)          │   │
│  │  Analysis, Block,    │  │  db: SQLite persistence     │   │
│  │  Stance, Projection, │  │  acp: agent lifecycle       │   │
│  │  Portfolio, Metrics  │  │  sources: 12 providers      │   │
│  │  (pure types, no I/O)│  │  keystore: OS keychain      │   │
│  └─────────────────────┘  │  app_config: JSON config     │   │
│                           └──────────┬──────────────────┘   │
│                                      │                       │
│                    ┌─────────────────┼──────────────┐        │
│                    ▼                 ▼              ▼        │
│              ┌──────────┐  ┌──────────────┐  ┌──────────┐   │
│              │  SQLite   │  │ ACP Agent    │  │ Data     │   │
│              │  Database │  │ (Codex,      │  │ Provider │   │
│              │          │  │  Claude, ...) │  │ APIs     │   │
│              └──────────┘  └──────┬───────┘  └──────────┘   │
│                                   │                          │
│                            ┌──────▼───────┐                  │
│                            │  MCP Server   │                  │
│                            │  (infi-analysis│                 │
│                            │   stdio)      │                  │
│                            └──────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

Infi never makes investment decisions for the user. Every analysis is accompanied by a `"Research only. Not investment advice."` disclaimer that the agent is forced to include via the `submit_final_stance` tool. The application is designed as a research workbench — the agent does the legwork of fetching, structuring, and reasoning over financial data, but the final judgment always belongs to the human.

---

## Layer Map

| Layer | Path | Responsibility | Dependencies |
|---|---|---|---|
| **Domain** | `src/domain/` | Pure types: analyses, runs, entities, sources, metrics, blocks, stances, projections, portfolios. No I/O, no framework imports. | `serde`, `chrono` |
| **Infrastructure** | `src/infra/` | SQLite persistence, ACP agent lifecycle, data-source providers, OS keychain, app configuration, price history, CSV parsing, shell utilities. | `rusqlite`, `pmcp`, `agent-client-protocol`, `reqwest`, `keyring`, `tokio` |
| **Commands** | `src/commands/` | Tauri `#[tauri::command]` handlers bridging the frontend IPC to domain + infra. Also contains the `generate_analysis` orchestration, export/publish, and source management commands. | `domain`, `infra`, `tauri` |
| **Prompts** | `src/prompts.rs` | Handlebars templates and prompt-building logic for the main analysis pass and the explanation pass. Extracts explanation targets from a completed report. | `domain`, `infra/db`, `handlebars` |
| **State** | `src/state.rs` | `AppState` struct holding the `Database` handle and a map of `CancellationToken`s for active runs. Managed by Tauri as shared state. | `infra/db`, `tokio-util` |
| **Frontend** | `frontend/src/` | React SPA: research composer, live agent progress, report viewer, portfolio management, settings. | `@tauri-apps/api`, `@tanstack/react-query`, `zustand`-like store, `react`, Tailwind |

### Dependency Rule

Domain types are **leaf nodes** — nothing in `domain` imports from `infra`, `commands`, or the frontend. Infrastructure depends on domain. Commands depend on both. The frontend communicates exclusively through Tauri IPC (`invoke`) and never imports Rust code directly.

---

## Domain Layer

**Path:** `src/domain/`

The domain layer defines the data model for every artifact an analysis run can produce. All types implement `Serialize` and `Deserialize` for the database and IPC boundaries but contain no persistence or network logic.

### Core Types (`domain/analysis.rs`)

| Type | Purpose |
|---|---|
| `Analysis` | Top-level record: id, title, user prompt, intent, status, active run reference, portfolio link. |
| `AnalysisRun` | A single execution attempt: agent id, model id, prompt text, status, timestamps, error message. |
| `AnalysisSummary` | Lightweight projection for the sidebar list: includes block/source counts. |
| `AnalysisReport` | The full assembled report returned to the frontend — contains every sub-collection (entities, sources, metrics, artifacts, blocks, stance, projections, counter-theses, uncertainty entries, methodology note, criterion answers, explanations, holding reviews, allocation reviews, portfolio risks, rebalancing suggestions, scenario analyses, expected-return models). |
| `AnalysisIntent` | Enum: `SingleEquity`, `CompareEquities`, `SectorAnalysis`, `MacroTheme`, `Watchlist`, `Portfolio`, `GeneralResearch`. |
| `AnalysisStatus` | Enum: `Queued`, `Running`, `Completed`, `Failed`, `Cancelled`. |

### Research Artifacts

| Type | Purpose |
|---|---|
| `ResearchPlan` | Agent's interpreted plan: intent, summary, decision criteria, planned checks. |
| `Entity` | Resolved ticker/company/ETF/index/sector with confidence and metadata. |
| `Source` | Cited data source: title, URL, publisher, type, reliability tier, retrieval timestamp, verification status. |
| `MetricSnapshot` | Normalized numeric metric with entity, unit, period, `as_of`, source link, prior value, and change percent. |
| `StructuredArtifact` | Typed table/chart: `kind` enum (MetricTable, BarChart, KpiGrid, FinancialStatement, etc.), columns, rows, series, evidence ids. |
| `AnalysisBlock` | Readable prose section: `kind` enum (Thesis, BusinessQuality, Financials, Valuation, PeerComparison, Catalysts, Risks, etc.), body text, evidence ids, confidence, importance. |
| `FinalStance` | The agent's investment stance: Bullish/Neutral/Bearish/Mixed/InsufficientData, horizon, confidence, key reasons, what would change, disclaimer. |
| `Projection` | Forward-looking price/value projection with bull/base/bear scenarios, probabilities, methodology, assumptions. |
| `CounterThesis` | Good-faith case against the chosen stance with residual probability. |
| `UncertaintyEntry` | Open question the analysis couldn't resolve, with blocking flag. |
| `MethodologyNote` | Research approach, frameworks used, data windows, known limitations. |
| `DecisionCriterionAnswer` | Per-criterion verdict (Confirmed/Refuted/PartiallyConfirmed/Unresolved) with supporting evidence. |
| `MetricExplanation` | Plain-language explanation of a metric or finance term: definition, meaning, value interpretation, good threshold, current assessment. |

### Portfolio Types (`domain/portfolio.rs`)

| Type | Purpose |
|---|---|
| `Portfolio` | Top-level portfolio: name, base currency. |
| `PortfolioAccount` | Brokerage account within a portfolio. |
| `PortfolioPosition` | Current holding snapshot: symbol, market, quantity, price, market value, cost basis. |
| `PortfolioTransaction` | Individual trade/dividend/fee record from CSV import. |
| `PortfolioHolding` | Aggregated view of a symbol across accounts with allocation percent. |
| `PortfolioSummary` | Lightweight sidebar projection: account count, holding count, total market value. |
| `PortfolioDetail` | Full assembled portfolio: accounts, holdings, positions, transactions, import batches, totals. |
| `HoldingReview` | Per-holding stance (Keep/Trim/Add/Watch/Exit/Mixed) with rationale and risks. |
| `AllocationReview` | Multi-dimensional allocation breakdown (asset class, sector, geography, currency) with concentration flags. |
| `PortfolioRisk` | Factor exposures, macro sensitivities, single-name risks, tail risks. |
| `RebalancingSuggestion` | Current vs. suggested weights with delta, scenarios, caveats. |
| `PortfolioScenarioAnalysis` | Bull/base/bear portfolio-level outcome scenarios with stress cases. |
| `PortfolioExpectedReturnModel` | Expected return and volatility model with input weights and assumptions. |

### Freshness (`domain/freshness.rs`)

Provides data-age analysis for stance-cited metrics:

- `FreshnessBucket`: `Fresh` (≤7d), `Aging` (8–30d), `Stale` (31–180d), `VeryStale` (>180d).
- `VerificationStatus`: `Ok`, `Redirect`, `Dead`, `Timeout`, `Forbidden`.
- `stale_stance_metrics()`: walks the evidence graph from the final stance → blocks → source ids → metrics, then flags any metric whose `as_of` exceeds `STANCE_MAX_METRIC_AGE_DAYS` (default 365, overridable via `INFI_MAX_METRIC_AGE_DAYS`).
- Used by both the finalize gate (rejects the run) and the report viewer (shows a banner).

### Run Context (`domain/run.rs`)

`RunContext` is a plain-data struct serialized to JSON and carried across the Tauri host → MCP child process boundary. It contains: analysis id, run id, agent id, user prompt, created timestamp, enabled sources list, and an `is_explanation_pass` flag. It intentionally references no infrastructure types.

---

## Infrastructure Layer

**Path:** `src/infra/`

### Database

**Path:** `src/infra/db/mod.rs`

`Database` wraps a `rusqlite::Connection` behind `Arc<Mutex<Connection>>`. The `Clone` implementation shares the same connection, allowing concurrent Tauri commands to serialize through the mutex.

**Key characteristics:**
- **Single-file SQLite** stored at `~/Library/Application Support/Infi/db.sqlite` (macOS), `%APPDATA%/Infi/db.sqlite` (Windows), or `~/.local/share/infi/db.sqlite` (Linux). Overridable via `INFI_DB_PATH`.
- **Schema migrations** run on every `open()` call via `init()`.
- **Transaction helper**: `with_tx(|tx| ...)` runs a closure inside a single SQLite transaction.
- **Report assembly**: `get_report()` fetches all sub-collections in a single pass and builds an `AnalysisReport`.
- **Progress persistence**: `append_progress_event()` stores `ProgressEventPayload` entries against a run id so they survive page reloads.
- **Metric explanations**: `get_metric_explanations()` returns explanations for a run, used by the explanation-pass retry logic.

The database layer is the only persistence mechanism — there are no external services, no cloud sync, no telemetry.

### ACP Integration

**Path:** `src/infra/acp/`

ACP (Agent Client Protocol) is the standardized protocol for communicating with coding agents. Infi spawns an external agent binary (Codex, Claude, Gemini, Qwen, Kimi, OpenCode, or a custom binary) as a child process, connects over stdio using ACP, mounts an MCP server, and instructs the agent to research and submit output through Infi tools.

#### Agent Discovery (`acp/agent_discovery.rs`)

Defines `AgentCandidate` (id, label, command, args, availability, models, model override support) and `AgentLaunch` (resolved command, args, env vars).

**Built-in agents:**
| Agent ID | Binary | Package/Command | Model Override |
|---|---|---|---|
| `codex` | `npx` | `@zed-industries/codex-acp@latest` | `-c model=<id>` |
| `claude` | `npx` | `@zed-industries/claude-code-acp` | `--model <id>` |
| `gemini` | `gemini` | native binary | `--model <id>` |
| `qwen` | `qwen` | native binary | `--model <id>` |
| `kimi` | `kimi` | native binary | `--model <id>` |
| `mistral` | `vibe-acp` | native binary | not supported |
| `opencode` | `opencode` | native binary | `--model <id>` (before subcommand) |
| `custom` | user-configured | user-configured | not supported |

Each agent can be overridden via environment variables (e.g., `CODEX_ACP_BIN`, `CLAUDE_ACP_BIN`). The `INFI_CUSTOM_AGENT` / `INFI_CUSTOM_AGENT_ARGS` variables add a custom agent entry.

`resolve_agent_launch()` looks up the requested agent by id, validates the model selection, and returns the launch configuration. If the requested agent isn't found, it falls back to the first available agent.

#### Analysis Generator (`acp/analysis_generator/`)

`generate_with_acp()` in `worker.rs` is the core orchestration function:

1. **Spawns a dedicated OS thread** with a single-threaded tokio runtime (ACP connections are `!Send`).
2. **Starts the agent child process** with stdin/stdout/stderr piped.
3. **Establishes ACP connection**: `initialize()` → `new_session()` (mounting the MCP server) → `prompt()`.
4. **Streams stderr** to the progress channel with secret redaction.
5. **Polls for completion**: waits for either the child to exit or the `finalize_analysis` MCP tool to be called (signaled via `finalization_received`).
6. **Cancellation**: a `CancellationToken` and `CancelOnDrop` RAII guard ensure the child process and its process group are killed when the parent future is dropped.
7. **Timeout**: `AcpTimeout` sentinel error if the agent exceeds `timeout_secs` (default 1800s).

The MCP server is mounted as a stdio server named `infi-analysis`, pointing at the same Infi binary with `--analysis-mcp-server`. Source API keys are injected as `INFI_SRC_KEY_<PROVIDER>` environment variables.

`InfiClient` (in `client.rs`) implements the ACP client side, forwarding `MessageDelta`, `ThoughtDelta`, `ToolCallStarted`, `ToolCallComplete` events to the progress channel and tracking whether `finalize_analysis` was called.

### Analysis MCP Server (`acp/analysis_mcp_server/`)

When the Infi binary is launched with `--analysis-mcp-server`, it runs as a stdio MCP server that the agent connects to. This is the mechanism that gives Infi control over the report structure.

**Configuration** (`config.rs`): parses `--analysis-context` (path to a JSON file containing the `RunContext`), `--db-path`, and `INFI_SRC_KEY_*` environment variables.

**Server setup** (`mod.rs`): builds a `pmcp::Server` with:
- **21 built-in tools** (see [MCP Server Tool Surface](#mcp-server-tool-surface) below).
- **Per-provider query tools**: for each enabled source with a valid API key, a `<id>_query` tool is registered dynamically.

**Tool implementations** (`tool.rs`): each tool handler deserializes its JSON arguments, validates required fields and cross-field constraints (e.g., evidence ids must reference previously submitted sources, probabilities must sum to 1.0, stance confidence > 0.8 is blocked when blocking uncertainties exist), persists the artifact to SQLite, and returns a success JSON response.

### Data Sources

**Path:** `src/infra/sources/`

A trait-based plugin system for financial data providers.

#### Source Provider Trait (`sources/provider.rs`)

```rust
#[async_trait]
pub trait SourceProvider: Send + Sync {
    fn descriptor(&self) -> ProviderDescriptor;
    fn tool_name(&self) -> String;          // defaults to "<id>_query"
    fn tool_description(&self) -> String;
    fn input_schema(&self) -> Value;        // JSON Schema for the MCP tool
    async fn query(&self, ctx: ProviderCallContext<'_>, args: Value) -> Result<Value, SourceError>;
}
```

`ProviderDescriptor` contains: id, display name, category (`WebSearch`, `Filings`, `Fundamentals`, `MarketData`, `News`, `Forums`, `Screener`), requires_key flag, default_enabled flag, docs URL, key acquisition URL, rate limit hint, description.

#### Registry (`sources/registry.rs`)

`all()` returns the ordered list of 12 built-in providers:

| Provider | Category | Requires Key |
|---|---|---|
| Tavily | WebSearch | Yes |
| Brave Search | WebSearch | Yes |
| SEC EDGAR | Filings | No |
| Alpha Vantage | Fundamentals | Yes |
| Financial Modeling Prep (FMP) | Fundamentals | Yes |
| Finnhub | MarketData | Yes |
| Polygon | MarketData | Yes |
| NewsAPI | News | Yes |
| Finviz | Screener | No |
| StockTwits | Forums | No |
| Hacker News | News | No |
| Yahoo Finance | MarketData | No |

A shared `reqwest::Client` (10s timeout, Infi user-agent) is built once and reused by all providers.

#### Provider Implementations (`sources/providers/`)

Each provider is a unit struct implementing `SourceProvider`. They handle:
- Building the HTTP request (URL, query params, headers including API key).
- Parsing the provider-specific JSON response into a normalized `serde_json::Value`.
- Error classification (rate limits, auth failures, upstream errors).

### Configuration

**Path:** `src/infra/app_config.rs`

`AppConfig` is a JSON file stored at `~/Library/Application Support/Infi/config.json` (macOS) or platform equivalent. Overridable via `INFI_CONFIG_PATH`.

Fields:
- `custom_agent_command` / `custom_agent_args`: custom ACP agent binary.
- `timeout_secs`: agent timeout (default 1800s).
- `source_freshness_days`: UI freshness chip threshold (default 7d).
- `disclaimer`: research disclaimer text.
- `model_by_agent`: per-agent model override map.
- `enabled_sources`: globally enabled data-source provider ids.
- `sources_with_keys`: cached set of provider ids with stored keys.

### Keystore

**Path:** `src/infra/keystore.rs`

Thin wrapper around the OS credential store (`keyring` crate). Service name: `com.infi.app`. Account format: `source.<provider_id>.api_key`.

Operations: `get_key`, `set_key`, `delete_key`, `has_key`. On platforms without a keychain backend (headless Linux), `KeystoreError::Unavailable` is returned and the Data Sources settings section renders read-only.

### Progress Events

**Path:** `src/infra/progress.rs`

`ProgressEventPayload` is a tagged enum (`event` + `data`) serialized over the Tauri `Channel` to the frontend:

| Event | Data | Purpose |
|---|---|---|
| `Log` | `String` | Agent stderr, spawn messages, status lines. |
| `MessageDelta` | `{ id, delta }` | Streaming agent message text. |
| `ThoughtDelta` | `{ id, delta }` | Streaming agent reasoning. |
| `ToolCallStarted` | `{ tool_call_id, title, kind }` | Agent invoked an MCP tool. |
| `ToolCallComplete` | `{ tool_call_id, status, title, raw_input, raw_output }` | Tool call finished. |
| `Plan` | `{ entries: FrontendPlanEntry[] }` | Research plan display. |
| `PlanSubmitted` | — | Plan persisted to DB. |
| `SourceSubmitted` | — | Source persisted. |
| `MetricSubmitted` | — | Metric persisted. |
| `ArtifactSubmitted` | — | Structured artifact persisted. |
| `BlockSubmitted` | — | Analysis block persisted. |
| `StanceSubmitted` | — | Final stance persisted. |
| `ProjectionSubmitted` | — | Projection persisted. |
| `Completed` | — | Run finished successfully. |
| `Error` | `{ message }` | Run failed. |

These events are also persisted to the `run_progress` table so they survive page reloads.

### Other Infra Modules

| Module | Purpose |
|---|---|
| `infra/shell.rs` | PATH resolution, `find_bin()`, `find_agent_bin()`, `init_process_path()`, Windows console suppression. |
| `infra/csv_parser.rs` | Portfolio CSV parsing (positions and transactions). |
| `infra/price_history.rs` | Yahoo Finance price history fetch for portfolio sparklines. |
| `infra/acp/analysis_generator/client.rs` | `InfiClient` implementing the ACP client protocol, forwarding events to the progress channel. |

---

## Commands Layer

**Path:** `src/commands/`

Tauri `#[tauri::command]` handlers that bridge the frontend IPC to the domain and infrastructure layers. All commands that touch SQLite or the keychain use `spawn_blocking()` to run on tokio's blocking thread pool, keeping the Tauri async executor free.

### Key Commands

| Command | Purpose |
|---|---|
| `create_analysis` | Creates `Analysis` + `AnalysisRun` rows. Derives title from prompt. For portfolio analyses, uses the portfolio's default prompt. |
| `generate_analysis` | The main orchestration command. Resolves the agent, creates the run, spawns the ACP worker, streams progress events through a `Channel`, handles explanation pass, updates run status on completion/error. |
| `stop_analysis` | Cancels the run's `CancellationToken`. |
| `get_analysis_report` | Assembles the full `AnalysisReport` from SQLite. |
| `get_all_analyses` | Returns `AnalysisSummary` list for the sidebar. |
| `get_stance_stale_metrics` | Returns names of metrics older than the freshness cap. |
| `export_analysis_html` / `export_analysis_markdown` | Renders the report as standalone HTML or Markdown. |
| `publish_analysis_html` | Uploads the standalone HTML to PageDrop.io. |
| `create_portfolio` / `get_portfolios` / `get_portfolio_detail` / `import_portfolio_csv` / `delete_portfolio` / `rename_portfolio` | Portfolio CRUD and CSV import. |
| `list_sources` / `refresh_source_key_status` / `set_source_key` / `clear_source_key` / `test_source_key` / `set_enabled_sources` | Data source management. |
| `get_agents` | Returns available ACP agent candidates. |
| `get_settings` / `update_settings` | App configuration. |
| `get_price_history` | Yahoo Finance sparkline data. |

### Error Handling (`commands/error.rs`)

`CommandError` wraps error messages with a `CommandErrorKind` discriminator (`Validation`, `Cancelled`, `Timeout`, `Internal`). The frontend uses the kind to decide whether to show a toast, a retry button, or a silent log.

### Update Commands (`commands/update.rs`)

`get_app_version` and `run_self-update` handle the self-update flow via Tauri's updater plugin.

---

## Prompt Engineering

**Path:** `src/prompts.rs`

Handlebars templates drive the system prompts sent to the agent.

### Main Analysis Prompt (`analysis_prompt.hbs`)

Instructs the agent to:
1. Call `submit_research_plan` first.
2. Resolve entities with `submit_entity_resolution`.
3. Fetch data using available `<id>_query` tools.
4. Cite every data point with `submit_source`.
5. Submit structured metrics with `submit_metric_snapshot`.
6. Submit analysis blocks with `submit_analysis_block`.
7. Submit counter-theses, uncertainty entries, and methodology notes.
8. Submit projections with bull/base/bear scenarios.
9. Submit the final stance with `submit_final_stance`.
10. Call `finalize_analysis` to complete the run.

The template is enriched with:
- The user's prompt.
- Portfolio holdings context (if portfolio-linked).
- VN30 stock list (for Vietnamese market awareness).
- Enabled source list.
- Context metadata (analysis id, run id).

### Explanation Prompt (`explanation_prompt.hbs`)

A separate prompt for the explanation pass that provides a list of metric/term targets and instructs the agent to call `submit_metric_explanation` for each.

### Portfolio Analysis Prompt (`portfolio_analysis_prompt.hbs`)

Specialized prompt for portfolio reviews that includes the full holdings snapshot and instructs the agent to produce allocation reviews, risk assessments, rebalancing suggestions, scenario analyses, and expected-return models.

### Prompt Building (`prompts.rs`)

`build_prompt_for()` selects the appropriate template based on analysis intent (portfolio vs. general research) and renders it with the full context.

`explanation_targets_from_report()` extracts metrics and finance terms from a completed report by:
1. Collecting all metric names from `MetricSnapshot` entries.
2. Scanning block bodies and stance summaries for known finance terms (P/E, CASA, EPS, ROE, EBITDA, NIM, etc.) using a static lookup table.
3. Deduplicating and returning `ExplanationTarget` structs.

---

## Frontend

**Path:** `frontend/src/`

A Vite + React + TypeScript SPA served inside the Tauri webview.

### Application Shell

**`app/App.tsx`**: Root component. Manages:
- View routing (Research, Analysis, Portfolio, Settings) via a simple state machine (`AppView`).
- Sidebar with analysis list, portfolio list, and navigation.
- Data fetching via React Query hooks (`useAgents`, `useAnalyses`, `usePortfolios`, `useSettings`).
- Keyboard shortcuts: `⌘⇧A` for new analysis, `⌘⇧P` for new portfolio.
- Update dialog and toast notifications.

**`app/AppSidebar.tsx`**: Sidebar navigation with grouped analysis/portfolio lists, version display, and update badge.

**`app/navigation.ts`**: Defines `AppView` type: `"new-analysis" | "analysis" | "portfolio" | "settings"`.

### State Management

**`store/index.ts`**: A lightweight `useSyncExternalStore`-based global store (no external library). Holds:
- Current view, selected analysis/portfolio ids and reports.
- Agent selection and model-by-agent map.
- Active runs with progress items and plan entries.

Key actions: `setState`, `addRun`, `updateRunStatus`, `addRunProgress`, `appendRunProgress`, `setRunPlan`, `setSelectedReport`, `clearRuns`.

`stableMerge()` prevents unnecessary re-renders by structurally comparing prev/next report objects.

### API Layer

**`shared/api/commands.ts`**: Thin wrappers around `invoke()` for every Tauri command. Each function maps directly to a `#[tauri::command]` in the Rust backend.

**`shared/api/queries.ts`**: React Query hooks (`useAgents`, `useAnalyses`, `useAnalysisReport`, `usePortfolios`, `usePortfolioDetail`, `useSettings`, `useSources`, `usePriceHistory`) and mutation hooks (`useDeleteAnalysis`, `useCreatePortfolio`, `useImportPortfolioCsv`, `useUpdateSettings`, `useSetSourceKey`, etc.).

**`shared/api/query-client.ts`**: Configures the React Query client.

### Hooks

| Hook | Purpose |
|---|---|
| `useBackendEvent` | Subscribes to Tauri `listen()` events with stable callback refs. |
| `useQueryInvalidation` | Listens for `analysis-data-changed` events from the backend and invalidates relevant React Query caches. |
| `useUpdateCheck` | Periodically checks for app updates. |
| `useCopyToClipboard` | Clipboard copy with timeout. |
| `useDebouncedCallback` | Debounced callback utility. |
| `useExpandableOverflow` | Detects overflow for expandable content areas. |
| `use-mobile` | Responsive breakpoint detection. |

### Feature Modules

| Feature | Path | Purpose |
|---|---|---|
| **run-analysis** | `features/run-analysis/` | Research composer, live progress timeline, error handling, example prompts, stock ticker chips, source popover. `useRunAnalysis` hook orchestrates the full create → generate → stream → complete cycle. |
| **analysis** | `features/analysis/` | Analysis page with report/agent sub-tabs. |
| **report-viewer** | `features/report-viewer/` | Report hero, content sections, block cards, argument spine, metric list/delta, projection view, source list, structured artifact view, context tray, badge styles, markdown components, selection utilities. |
| **portfolio** | `features/portfolio/` | Portfolio page with CSV import, holdings table, portfolio analysis trigger. |
| **settings** | `features/settings/` | Settings page, agent status list, data sources section (key management, enable/disable). |
| **updates** | `features/updates/` | Update dialog with version comparison and install action. |

### UI Design System

The frontend uses an **editorial design language** with these primitives (from `components/ui/editorial.tsx`):
- `Eyebrow`: uppercase, 10.5px, `tracking-[0.14em]` to `tracking-[0.18em]`, muted foreground.
- `SectionHeader`: numbered sections with mono digits and eyebrow labels.
- `HairlineDivider`: `border-t border-border` for section breaks.
- `MetaRow`: metadata rows with labels and values.
- `Dot`: status dot indicator.

**Design rules:**
- Hairlines, not shadows. Zero radius (`--radius: 0px`).
- Numbers in `tabular-nums`, indices zero-padded in `font-mono`.
- One stance-derived accent per report page (see `getStanceAccent` in `badge-styles.tsx`).
- `text-primary` reserved for actively running states.
- Primary action: solid foreground with hover inversion. Secondary/tertiary: text-style with hairline separator.

**Exception surfaces:** `ProgressTimeline`, `AgentTimeline`, `ToolCallCard`, and `MarkdownMessage` use a monospace, chat-style identity and are deliberately not in the editorial grammar.

---

## Run Lifecycle

1. **User submits a request** from the Research Page (`ResearchPage` → `useRunAnalysis`).
2. **`create_analysis`** command creates `Analysis` and initial `AnalysisRun` rows in SQLite. Returns the analysis id.
3. **`generate_analysis`** command:
   - Resolves the selected ACP agent and model.
   - Creates the run row with enabled sources.
   - Spawns a `CancellationToken` and registers it in `active_runs`.
   - Emits `analysis-data-changed` event.
   - Builds the system prompt via `prompts::build_prompt_for()`.
   - Calls `generate_with_acp()` to start the ACP worker.
4. **ACP Worker** (on a dedicated OS thread):
   - Spawns the agent child process.
   - Establishes ACP connection over stdio.
   - Mounts the `infi-analysis` MCP server (the same Infi binary with `--analysis-mcp-server`).
   - Sends the prompt.
   - The agent researches using `<id>_query` tools (data providers) and submits structured output via `submit_*` tools.
   - Every tool call persists to SQLite and emits a progress event.
   - The agent calls `finalize_analysis` when done.
5. **Completion**:
   - The worker detects `finalize_analysis` was called and kills the agent process.
   - The run status is updated to `Completed` in SQLite.
   - `analysis-status` is recomputed.
   - If explanation pass is enabled, a second ACP run generates metric/term explanations (see below).
   - `ProgressEventPayload::Completed` is sent to the frontend.
6. **Frontend** receives `Completed`, switches to the report sub-tab, fetches the assembled `AnalysisReport` via `get_analysis_report`, and renders it.

---

## Data Flow

```
User Prompt
    │
    ▼
create_analysis (SQLite: analyses + analysis_runs)
    │
    ▼
generate_analysis
    ├── resolve agent & model
    ├── build prompt (Handlebars template + context)
    ├── generate_with_acp
    │     ├── spawn agent child process
    │     ├── ACP: initialize → new_session (mount MCP) → prompt
    │     │
    │     │   Agent Loop:
    │     │     ├── <id>_query tools → HTTP to data providers → JSON
    │     │     ├── submit_source → SQLite: sources
    │     │     ├── submit_metric_snapshot → SQLite: metrics
    │     │     ├── submit_analysis_block → SQLite: blocks
    │     │     ├── submit_projection → SQLite: projections
    │     │     ├── submit_final_stance → SQLite: final_stances
    │     │     └── finalize_analysis → sets flag, worker exits loop
    │     │
    │     └── kill agent process
    │
    ├── [optional] run_explanation_pass (second ACP run)
    │     └── submit_metric_explanation → SQLite: metric_explanations
    │
    ├── update run status → Completed
    └── emit Completed to frontend
         │
         ▼
    Frontend: get_analysis_report → render ReportViewer
```

---

## Agent Discovery & Launch

The frontend calls `get_agents()` which returns the list of `AgentCandidate` objects. Each candidate has:
- `id` / `label`: identifier and display name.
- `command` / `args`: the resolved binary path and arguments.
- `available`: whether the binary was found on the system.
- `models`: list of selectable models.
- `supports_model_override`: whether the agent accepts a model flag.

When the user starts an analysis, the frontend passes the selected `agent_id` and optional `model_id` to `generate_analysis`. The backend calls `resolve_agent_launch()` which:
1. Looks up the agent by id.
2. Falls back to the first available agent if not found.
3. Validates the model selection against the agent's model list.
4. Builds the final command, args, and env vars.

The agent binary is spawned with `kill_on_drop(true)` and placed in its own process group (Unix) for clean teardown.

---

## MCP Server Tool Surface

When the Infi binary runs with `--analysis-mcp-server`, it exposes these tools to the agent:

### Research Structure Tools

| Tool | Purpose |
|---|---|
| `submit_research_plan` | Submit the interpreted research plan (intent, summary, decision criteria, planned checks). |
| `submit_entity_resolution` | Resolve a ticker/company/ETF/index/sector entity. |
| `submit_source` | Cite a data source before referencing it. |
| `verify_source_accessibility` | HEAD/GET probe of a source URL, persists verification status. |
| `submit_metric_snapshot` | Submit a normalized numeric metric with source and as_of metadata. |
| `submit_metric_explanation` | Submit a plain-language explanation of a metric or finance term. |
| `submit_structured_artifact` | Submit a typed table/chart (metric_table, comparison_matrix, kpi_grid, financial_statement, bar_chart, line_chart, area_chart, grouped_bar_chart, ratio_snapshot, factor_list, scenario_matrix). |
| `submit_analysis_block` | Submit a readable prose section (thesis, business_quality, financials, valuation, peer_comparison, sector_context, catalysts, risks, technical_context, open_questions). |
| `submit_final_stance` | Submit the investment stance with confidence, key reasons, and what would change. |
| `submit_projection` | Submit a forward-looking projection with bull/base/bear scenarios. |
| `submit_counter_thesis` | Submit the strongest case against the chosen direction. |
| `submit_uncertainty_ledger` | Record an open question with blocking flag. |
| `submit_methodology_note` | Document the research approach, frameworks, data windows, limitations. |
| `submit_decision_criterion_answer` | Submit per-criterion verdicts with supporting evidence. |
| `finalize_analysis` | Signal that the analysis is complete. Triggers worker termination. |

### Portfolio Tools

| Tool | Purpose |
|---|---|
| `submit_holding_review` | Per-holding stance (Keep/Trim/Add/Watch/Exit) with rationale. |
| `submit_allocation_review` | Multi-dimensional allocation breakdown with concentration flags. |
| `submit_portfolio_risk` | Factor exposures, macro sensitivities, single-name and tail risks. |
| `submit_rebalancing_suggestion` | Current vs. suggested weights with scenarios and caveats. |
| `submit_portfolio_scenario_analysis` | Bull/base/bear portfolio-level outcomes with stress cases. |
| `submit_portfolio_expected_return_model` | Expected return/volatility model with weighted inputs. |

### Data Provider Tools

For each enabled source with a valid API key, a `<id>_query` tool is dynamically registered. The tool's JSON schema comes from the provider's `input_schema()` implementation.

### Validation & Coherence Gates

The MCP tools enforce several cross-field validation rules:
- **Evidence chain**: `evidence_ids` in blocks, metrics, projections, etc. must reference previously submitted sources.
- **Probability sum**: projection scenario probabilities and scenario matrix probabilities must sum to 1.0 (±0.02).
- **Scenario completeness**: projections must have exactly bull, base, and bear scenarios.
- **Stance coherence**: bullish stances are rejected if all risk blocks have confidence < 0.3.
- **Blocking uncertainty**: stance confidence > 0.8 is blocked when any blocking uncertainty entry is open.
- **Hedge detection**: `key_reasons` and `what_would_change` are checked for excessive Jaccard similarity (>0.6).

---

## Explanation Pass

After the main analysis completes, an optional **explanation pass** can run to generate plain-language explanations of metrics and finance terms found in the report.

**Flow:**
1. `explanation_targets_from_report()` scans the completed report for:
   - All metric names from `MetricSnapshot` entries.
   - Known finance terms (P/E, CASA, EPS, ROE, EBITDA, NIM, etc.) found in block bodies and stance summaries.
2. A second ACP run is spawned with the explanation prompt template.
3. The agent calls `submit_metric_explanation` for each target.
4. **Retry logic**: up to 3 attempts. After each attempt, `missing_explanation_targets()` checks which targets weren't explained and retries only those.
5. Explanation events are persisted against the main run id and appear in `get_run_progress`.
6. The explanation pass uses a preferred model (`gpt-5.4-mini` if available, otherwise the main agent's model).

---

## Portfolio Analysis

Portfolio analyses are triggered when a user selects a portfolio and starts an analysis. The flow differs from general research:

1. `create_analysis` is called with a `portfolio_id`, which sets `intent = Portfolio`.
2. If the user didn't type a prompt, `portfolio_default_prompt()` generates a standard review prompt.
3. The portfolio's current holdings snapshot is injected into the system prompt.
4. The agent is instructed to produce portfolio-specific artifacts: allocation reviews, risk assessments, rebalancing suggestions, scenario analyses, and expected-return models.
5. The report viewer renders these in a dedicated portfolio section.

**CSV Import:** `parse_portfolio_csv()` parses uploaded CSV files (positions or transactions), and `import_portfolio_csv()` persists them. The parser supports multiple column name conventions and auto-resolves symbol names via Yahoo Finance if missing.

---

## Report Export & Publishing

### HTML Export

`export_analysis_html` builds a standalone HTML file by:
1. Embedding the `AnalysisReport` JSON into a pre-built viewer template (`frontend/dist-viewer/viewer.html`, compiled at build time via `bun run build:viewer`).
2. Escaping `</` and `<!--` sequences to prevent script injection.
3. Presenting a native save dialog.

### Markdown Export

`export_analysis_markdown` renders the report as structured Markdown with:
- Title and disclaimer.
- Final stance section.
- Portfolio outcomes (if applicable).
- Analysis blocks grouped by kind.
- Projections with scenario tables.
- Sources list.
- Decision criterion answers.

### Publishing

`publish_analysis_html` uploads the standalone HTML to [PageDrop.io](https://pagedrop.dev) and returns a shareable URL with a delete token.

---

## Data Freshness & Verification

### Metric Freshness

The `domain::freshness` module walks the evidence graph from the final stance to identify metrics whose `as_of` timestamp exceeds the freshness cap (default 365 days, overridable via `INFI_MAX_METRIC_AGE_DAYS`). This is used:
- **At finalization**: the run is rejected if stale metrics are cited by a bullish/bearish/mixed stance.
- **In the report viewer**: a banner flags stale metrics for the user.

### Source Verification

The `verify_source_accessibility` MCP tool performs a HEAD (falling back to a 1-KB GET) against a source URL and records the outcome (`Ok`, `Redirect`, `Dead`, `Timeout`, `Forbidden`) on the source row. This happens on the user's machine — there is no Infi-hosted proxy.

---

## Safety Defaults

- **Research-only product posture.** No portfolio personalization or trade execution.
- **Disclaimer on every report.** `"Research only. Not investment advice."` is embedded in the `FinalStance` and rendered prominently.
- **Source and metric metadata are first-class data.** Every claim must cite a source.
- **Evidence chain enforcement.** Blocks, metrics, projections, and stances must reference submitted sources.
- **Cross-field coherence gates.** The MCP server rejects internally contradictory stances.
- **Finalization is blocked if required evidence is missing.** The agent cannot end a run without calling `finalize_analysis`.
- **Secrets never leave the host.** API keys are injected as env vars into the MCP child process and redacted from logs.
- **No telemetry.** All data stays local.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `INFI_DB_PATH` | Override SQLite database path. |
| `INFI_CONFIG_PATH` | Override app config JSON path. |
| `INFI_MAX_METRIC_AGE_DAYS` | Override stance freshness cap (default 365). |
| `INFI_CUSTOM_AGENT` | Custom ACP agent binary path. |
| `INFI_CUSTOM_AGENT_ARGS` | Arguments for the custom agent (space-separated). |
| `INFI_PUBLISH_URL` | Override the HTML publish endpoint. |
| `INFI_SRC_KEY_<PROVIDER>` | Data source API key (read by MCP child process). |
| `INFI_ANALYSIS_CONTEXT` | Path to the RunContext JSON file (used by MCP server). |
| `CODEX_ACP_BIN` / `CODEX_ACP_PACKAGE` | Override Codex agent binary/package. |
| `CLAUDE_ACP_BIN` | Override Claude agent binary. |
| `GEMINI_ACP_BIN` | Override Gemini agent binary. |
| `QWEN_ACP_BIN` | Override Qwen agent binary. |
| `KIMI_ACP_BIN` | Override Kimi agent binary. |
| `MISTRAL_ACP_BIN` | Override Mistral agent binary. |
| `OPENCODE_ACP_BIN` | Override OpenCode agent binary. |

---

## Build & CI

### Frontend

```bash
cd frontend && bun install          # install dependencies
cd frontend && bun run dev          # Vite dev server (port 5173)
cd frontend && bun run build        # type-check + production build
cd frontend && bun run build:viewer # standalone viewer build (for HTML export)
cd frontend && bun run check:ci     # Biome lint + format (zero warnings)
```

### Rust

```bash
cargo run                           # run the Tauri app
cargo check                         # validate compilation
cargo test                          # run all tests
cargo fmt                           # format code
cargo clippy --all-targets --all-features -- -D warnings  # lint (warnings = errors)
```

### CI Requirements (Zero Tolerance)

Before committing, all checks must pass with **zero warnings**:
1. `cd frontend && bun run check:ci` — Biome lint + format.
2. `cd frontend && bun run build` — TypeScript type-check.
3. `cargo fmt --check` — Rust formatting.
4. `cargo clippy --all-targets --all-features -- -D warnings` — Rust lint.
5. `cargo test` — All tests pass.

---

## Directory Structure

```
infi/
├── src/
│   ├── main.rs                         # Tauri app entry point
│   ├── lib.rs                          # Re-exports: commands, domain, infra, prompts, state
│   ├── state.rs                        # AppState (Database + active_runs map)
│   ├── prompts.rs                      # Handlebars templates + prompt building
│   ├── analysis_prompt.hbs             # Main analysis system prompt
│   ├── explanation_prompt.hbs          # Explanation pass prompt
│   ├── portfolio_analysis_prompt.hbs   # Portfolio analysis prompt
│   ├── domain/
│   │   ├── mod.rs                      # Re-exports
│   │   ├── analysis.rs                 # Core analysis types (40+ structs/enums)
│   │   ├── run.rs                      # RunContext
│   │   ├── portfolio.rs                # Portfolio types + CSV import types
│   │   └── freshness.rs               # Data age analysis + verification status
│   ├── infra/
│   │   ├── mod.rs                      # Re-exports
│   │   ├── db/mod.rs                   # SQLite Database (~5000 lines)
│   │   ├── acp/
│   │   │   ├── mod.rs                  # Re-exports
│   │   │   ├── agent_discovery.rs      # Agent definitions + launch resolution
│   │   │   ├── analysis_generator/
│   │   │   │   ├── mod.rs              # Re-exports
│   │   │   │   ├── worker.rs           # ACP worker: spawn, connect, orchestrate
│   │   │   │   └── client.rs           # InfiClient: ACP client implementation
│   │   │   └── analysis_mcp_server/
│   │   │       ├── mod.rs              # MCP server setup + tool registration
│   │   │       ├── config.rs           # CLI args + env var parsing
│   │   │       └── tool.rs             # 21+ tool implementations (~3000 lines)
│   │   ├── sources/
│   │   │   ├── mod.rs                  # Re-exports + key_account/key_env_var helpers
│   │   │   ├── provider.rs             # SourceProvider trait + ProviderDescriptor
│   │   │   ├── registry.rs             # Provider list + shared HTTP client
│   │   │   └── providers/              # 12 provider implementations
│   │   │       ├── tavily.rs
│   │   │       ├── brave_search.rs
│   │   │       ├── sec_edgar.rs
│   │   │       ├── alpha_vantage.rs
│   │   │       ├── fmp.rs
│   │   │       ├── finnhub.rs
│   │   │       ├── polygon.rs
│   │   │       ├── newsapi.rs
│   │   │       ├── finviz.rs
│   │   │       ├── stocktwits.rs
│   │   │       ├── hacker_news.rs
│   │   │       └── yahoo_finance.rs
│   │   ├── app_config.rs              # JSON config load/save
│   │   ├── keystore.rs                # OS keychain wrapper
│   │   ├── csv_parser.rs             # Portfolio CSV parsing
│   │   ├── price_history.rs          # Yahoo Finance price fetch
│   │   ├── progress.rs               # ProgressEventPayload types
│   │   └── shell.rs                  # PATH resolution, binary lookup
│   └── commands/
│       ├── mod.rs                     # Tauri command handlers (~1900 lines)
│       ├── error.rs                   # CommandError + CommandErrorKind
│       └── update.rs                  # Self-update commands
├── frontend/
│   ├── src/
│   │   ├── main.tsx                   # React entry point
│   │   ├── App.tsx                    # Re-export
│   │   ├── app/
│   │   │   ├── App.tsx               # Root component + routing
│   │   │   ├── AppSidebar.tsx        # Sidebar navigation
│   │   │   └── navigation.ts         # AppView type
│   │   ├── store/index.ts            # Global state (useSyncExternalStore)
│   │   ├── types/index.ts            # TypeScript types (~500 lines)
│   │   ├── shared/
│   │   │   ├── api/
│   │   │   │   ├── commands.ts       # Tauri invoke wrappers
│   │   │   │   ├── queries.ts        # React Query hooks
│   │   │   │   ├── query-client.ts   # Query client config
│   │   │   │   └── index.ts          # Re-exports
│   │   │   ├── lib/version.ts        # Version utilities
│   │   │   └── vn30.ts              # VN30 stock list
│   │   ├── hooks/
│   │   │   ├── useBackendEvent.ts    # Tauri event listener
│   │   │   ├── useQueryInvalidation.ts # Cache invalidation on data changes
│   │   │   ├── useUpdateCheck.ts     # Update polling
│   │   │   └── ...
│   │   ├── features/
│   │   │   ├── run-analysis/         # Research composer + live progress
│   │   │   ├── analysis/             # Analysis page
│   │   │   ├── report-viewer/        # Report rendering
│   │   │   ├── portfolio/            # Portfolio management
│   │   │   ├── settings/             # Settings page
│   │   │   └── updates/              # Update dialog
│   │   ├── components/
│   │   │   ├── ui/                   # Shared UI primitives (editorial, button, card, etc.)
│   │   │   └── Agent/               # Agent-specific components (MarkdownMessage, ToolCallCard, etc.)
│   │   ├── lib/                      # Utility functions
│   │   └── viewer/                   # Standalone viewer entry point (for HTML export)
│   └── dist-viewer/                  # Built standalone viewer
├── assets/                           # Screenshots, agent logos
├── capabilities/                     # Tauri capability configs
├── gen/schemas/                      # Generated JSON schemas
├── icons/                            # App icons
├── landing/                          # Landing page
├── scripts/                          # Build/dev scripts
├── tests/                            # Integration tests
├── docs/
│   ├── ARCHITECTURE.md               # This document
│   └── README.md
├── Cargo.toml                        # Rust dependencies
├── tauri.conf.json                   # Tauri configuration
├── rust-toolchain.toml               # Rust toolchain pinning
├── build.rs                          # Tauri build script
├── deny.toml                         # cargo-deny config
├── AGENTS.md                         # Repository guidelines
├── README.md                         # Project overview
├── LICENSE-MIT
└── LICENSE-APACHE
```
