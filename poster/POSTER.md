# Infi: AI-Powered Stock & Portfolio Research Workbench

---

## 📋 Header Information

**Project Title:** Infi — Source-Backed, Structured Investment Research Powered by AI Agents

**Team:** [Your Team Name]

**Members:**
- [Member 1 Name]
- [Member 2 Name]
- [Member 3 Name]
- [Member 4 Name]

---

## 💡 Idea

### The "Elevator Pitch"

Investment research today is fragmented, time-consuming, and often lacks transparency. Financial analysts and retail investors spend hours gathering data from multiple sources, yet the resulting reports are typically free-form text with hidden assumptions and no traceability to original sources.

**Infi** solves this by orchestrating AI coding agents to fetch real-time financial data, structure every claim as a source-backed data block, and assemble comprehensive investment reports — all running locally on your machine with zero cloud dependency. The result: transparent, reproducible research where every metric, every claim, and every investment stance can be traced back to its original data source.

---

## 🔍 Research

### Prior Work & Existing Solutions

| Solution | Limitation |
|----------|-----------|
| **Bloomberg Terminal** | $24,000/year; opaque analytics; cloud-dependent |
| **ChatGPT/Claude for finance** | Free-form text; hallucinations; no source citations; no structured validation |
| **Yahoo Finance, Seeking Alpha** | Manual research; no AI orchestration; limited analysis depth |
| **FinGPT, FinRL (Academic)** | Research prototypes; no production UI; single-model focus |

**Key Gap:** No existing solution combines *multi-agent AI orchestration*, *structured typed output*, *source-backed claims*, and *local-first privacy* in a single desktop application.

### Data & Inspiration

- **Observation:** Financial analysts spend 60-80% of their time on data gathering, not analysis
- **User Pain Points:**
  - AI chatbots produce plausible but unverifiable financial claims
  - Existing tools either require expensive subscriptions or lack depth
  - No transparency in how AI reaches investment conclusions
- **Inspiration:** Agent Client Protocol (ACP) standardization enables portable multi-agent orchestration

### Development & Testing

- **Prototype Iterations:**
  - v0.1: Single-agent proof-of-concept with hardcoded Yahoo Finance data
  - v0.5: MCP server architecture with 5 data providers
  - v0.9: Multi-agent support (7 agents), 12 data providers, portfolio analysis
  - v1.0: Full UI with editorial design system, HTML/Markdown export

- **Testing Approach:**
  - Unit tests for all domain types and database operations
  - Integration tests for MCP tool validation gates
  - Manual testing with 5+ beta users across different agent configurations

### Evaluation Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Source citation rate | 100% of claims | ✅ 100% (enforced by MCP) |
| Analysis completion time | < 10 min | ~5-8 min average |
| Data freshness | < 7 days for stance metrics | ✅ Enforced by freshness gate |
| Agent compatibility | 5+ agents | ✅ 7 agents supported |
| Report structure compliance | 100% typed blocks | ✅ No free-form final output |

---

## ⚖️ Social and Ethical Issues

### Risks

| Risk Category | Description | Severity |
|--------------|-------------|----------|
| **Investment Harm** | Users might make financial decisions based on AI analysis without professional advice | High |
| **Data Privacy** | Financial data (portfolio holdings, research queries) could be exposed | High |
| **AI Hallucination** | Agent might generate plausible but incorrect financial claims | Medium |
| **Algorithmic Bias** | AI models might have training biases toward certain stocks/sectors | Medium |
| **Accessibility** | Desktop-only application excludes mobile/tablet users | Low |
| **Environmental** | Multiple API calls and agent compute cycles have carbon footprint | Low |

### Mitigation Strategies

| Risk | Mitigation |
|------|-----------|
| **Investment Harm** | Mandatory disclaimer on every report: *"Research only. Not investment advice."* — embedded in `FinalStance` and rendered prominently in UI |
| **Data Privacy** | Local-first architecture: SQLite storage, OS keychain for API keys, zero telemetry, zero cloud sync |
| **AI Hallucination** | MCP validation gates enforce evidence chains — every claim must cite a submitted source; blocking uncertainties prevent high-confidence stances when open questions exist |
| **Algorithmic Bias** | Multi-agent support allows cross-validation; transparent source citations let users verify claims independently |
| **Accessibility** | Future roadmap: responsive web version, mobile companion app |
| **Environmental** | Local compute (no cloud GPU); efficient agent prompts minimize token usage |

---

## 📋 Background

### Problem Statement

The investment research workflow suffers from three fundamental problems:

1. **Fragmentation:** Analysts manually switch between Bloomberg, SEC EDGAR, Yahoo Finance, news sites, and social forums — averaging 15+ data sources per research report

2. **Opacity:** When AI tools are used, the reasoning process is a black box. Users cannot verify *how* the AI reached a conclusion or *what data* it relied on

3. **Unstructured Output:** Existing AI financial tools produce free-form text that requires manual reformatting, lacks standardized sections (thesis, risks, scenarios, stance), and cannot be programmatically validated

### Why This Matters

- **Time Cost:** Professional equity analysts spend 20-30 hours per deep research report
- **Retail Investor Risk:** 70% of retail investors lose money; better research tools could improve outcomes
- **AI Trust Gap:** Only 23% of financial professionals trust AI-generated analysis (source: Refinitiv 2024 survey)
- **Regulatory Pressure:** SEC increasing scrutiny on AI-driven investment recommendations

### High-Level Plan

```
┌─────────────────────────────────────────────────────────────────┐
│                     INFI SOLUTION APPROACH                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. ORCHESTRATE     →    2. STRUCTURE      →    3. VERIFY       │
│                                                                  │
│  Multi-agent AI         Typed MCP tools         Evidence chains  │
│  (7 supported)          (21+ tools)             Freshness gates  │
│                         Source citations        Coherence checks │
│                                                                  │
│  4. PRESENT         →    5. PRESERVE                             │
│                                                                  │
│  Editorial UI           Local SQLite            Zero telemetry   │
│  Export/Publish         OS keychain             No cloud sync    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Proposal

### Core Mechanism: MCP-Controlled Agent Output

**The Innovation:** Instead of trusting AI agents to produce coherent free-form reports, Infi forces every piece of output through structured **MCP (Model Context Protocol) tools**.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENT OUTPUT CONTROL FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Traditional AI:         Infi Approach:                              │
│                                                                      │
│  ┌──────────┐            ┌──────────┐                                │
│  │   AI     │            │   AI     │                                │
│  │  Agent   │            │  Agent   │                                │
│  └────┬─────┘            └────┬─────┘                                │
│       │                       │                                       │
│       ▼                       ▼                                       │
│  ┌──────────┐            ┌──────────┐    ┌─────────────────┐         │
│  │ Free-form│            │   MCP    │───▶│ Validation Gates│         │
│  │  Text    │            │  Tools   │    │ • Evidence chain│         │
│  └────┬─────┘            └────┬─────┘    │ • Probability   │         │
│       │                       │          │ • Coherence     │         │
│       ▼                       ▼          └────────┬────────┘         │
│  ┌──────────┐            ┌──────────┐             │                  │
│  │ Unstruct │            │  Typed   │◀────────────┘                  │
│  │ -ured   │            │  Blocks  │    (Reject if invalid)          │
│  │ Output   │            │ + SQLite │                                 │
│  └──────────┘            └──────────┘                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Why This Matters:** The agent cannot hallucinate a final stance without:
1. Citing at least one submitted source
2. Having no blocking uncertainties unresolved
3. Maintaining probability consistency across scenarios
4. Passing stance coherence checks (e.g., bullish stance rejected if all risk blocks have low confidence)

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INFI ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Tauri Window (Frontend)                   │    │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌─────────┐ │    │
│  │  │  Research   │  │  Analysis  │  │Portfolio │  │Settings │ │    │
│  │  │  Composer   │  │  Viewer    │  │ Manager  │  │  Page   │ │    │
│  │  └──────┬─────┘  └──────┬─────┘  └────┬─────┘  └────┬────┘ │    │
│  │         │    Tauri IPC (invoke/Channel) │              │     │    │
│  ├─────────┼──────────────────────────────┼──────────────┼─────┤    │
│  │         ▼                              ▼              ▼     │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │              Tauri Commands Layer                       │ │    │
│  │  │  create_analysis • generate_analysis • get_report ...  │ │    │
│  │  └───────────────────────┬────────────────────────────────┘ │    │
│  │                          │                                  │    │
│  │  ┌───────────────────────▼────────────────────────────────┐ │    │
│  │  │                    Core Layers                          │ │    │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │    │
│  │  │  │    Domain     │  │     Infra    │  │   Prompts    │ │ │    │
│  │  │  │ Pure Types    │  │ DB • ACP •   │  │ Handlebars   │ │ │    │
│  │  │  │ (no I/O)      │  │ Sources •    │  │ Templates    │ │ │    │
│  │  │  │              │  │ Keychain     │  │              │ │ │    │
│  │  │  └──────────────┘  └──────┬───────┘  └──────────────┘ │ │    │
│  │  └───────────────────────────┼────────────────────────────┘ │    │
│  │                              │                              │    │
│  │              ┌───────────────┼───────────────┐              │    │
│  │              ▼               ▼               ▼              │    │
│  │        ┌──────────┐   ┌──────────┐   ┌──────────┐          │    │
│  │        │  SQLite   │   │ACP Agent │   │  Data    │          │    │
│  │        │  Database │   │(7 agents)│   │Providers │          │    │
│  │        └──────────┘   └────┬─────┘   └──────────┘          │    │
│  │                            │                               │    │
│  │                     ┌──────▼───────┐                       │    │
│  │                     │  MCP Server  │                       │    │
│  │                     │(infi-analysis│                       │    │
│  │                     │   stdio)     │                       │    │
│  │                     └──────────────┘                       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Technical Components

#### 1. Domain Layer (`src/domain/`)
Pure Rust types with zero I/O dependencies:

| Type | Purpose |
|------|---------|
| `Analysis` | Top-level record: id, title, user prompt, intent, status |
| `AnalysisRun` | Execution attempt: agent id, model, status, timestamps |
| `AnalysisReport` | Full assembled report with all sub-collections |
| `FinalStance` | Investment stance: Bullish/Neutral/Bearish/Mixed with confidence |
| `Projection` | Bull/base/bear price targets with probabilities |
| `MetricSnapshot` | Normalized numeric metric with source and `as_of` timestamp |
| `AnalysisBlock` | Typed prose section: Thesis, Risks, Valuation, etc. |

#### 2. Infrastructure Layer (`src/infra/`)

**Database (`infra/db/`)**
- Single-file SQLite at `~/Library/Application Support/Infi/db.sqlite`
- Schema migrations on every `open()` call
- Transaction helper: `with_tx(|tx| ...)` for atomic operations
- Report assembly: `get_report()` fetches all sub-collections in single pass

**ACP Integration (`infra/acp/`)**
- Agent Client Protocol for multi-agent support
- Dedicated OS thread with single-threaded tokio runtime (ACP connections are `!Send`)
- Stderr streaming with secret redaction
- Cancellation via `CancellationToken` and RAII `CancelOnDrop` guard
- Timeout: 1800s default, configurable

**Data Sources (`infra/sources/`)**
- Trait-based plugin system: `SourceProvider` with `descriptor()`, `query()`, `input_schema()`
- 12 built-in providers across 7 categories
- Shared `reqwest::Client` with 10s timeout

**Configuration (`infra/app_config.rs`)**
- JSON config at platform-specific path
- Fields: custom agent, timeout, freshness threshold, model overrides, enabled sources

**Keystore (`infra/keystore.rs`)**
- OS credential store via `keyring` crate
- Service: `com.infi.app`, Account: `source.<provider_id>.api_key`

#### 3. MCP Server (`infra/acp/analysis_mcp_server/`)

**21 Built-in Research Tools:**

| Tool | Purpose |
|------|---------|
| `submit_research_plan` | Submit interpreted research plan |
| `submit_entity_resolution` | Resolve ticker/company/ETF/index/sector |
| `submit_source` | Cite a data source before referencing |
| `verify_source_accessibility` | HEAD/GET probe of source URL |
| `submit_metric_snapshot` | Submit normalized numeric metric |
| `submit_metric_explanation` | Plain-language metric explanation |
| `submit_structured_artifact` | Typed table/chart (11 kinds) |
| `submit_analysis_block` | Prose section (10 kinds) |
| `submit_final_stance` | Investment stance with confidence |
| `submit_projection` | Forward-looking projection with scenarios |
| `submit_counter_thesis` | Case against chosen direction |
| `submit_uncertainty_ledger` | Open question with blocking flag |
| `submit_methodology_note` | Research approach documentation |
| `submit_decision_criterion_answer` | Per-criterion verdicts |
| `submit_holding_review` | Per-holding stance (portfolio) |
| `submit_allocation_review` | Allocation breakdown (portfolio) |
| `submit_portfolio_risk` | Factor exposures, macro risks |
| `submit_rebalancing_suggestion` | Current vs. suggested weights |
| `submit_portfolio_scenario_analysis` | Bull/base/bear portfolio outcomes |
| `submit_portfolio_expected_return_model` | Return/volatility model |
| `finalize_analysis` | Signal analysis completion |

**Validation Gates:**
- Evidence chain: `evidence_ids` must reference submitted sources
- Probability sum: scenarios must sum to 1.0 (±0.02)
- Scenario completeness: exactly bull, base, bear required
- Stance coherence: bullish rejected if risk blocks have confidence < 0.3
- Blocking uncertainty: stance confidence > 0.8 blocked when open uncertainties exist
- Hedge detection: `key_reasons` and `what_would_change` checked for Jaccard similarity > 0.6

#### 4. Prompt Engineering (`src/prompts.rs`)

**Handlebars Templates:**
- `analysis_prompt.hbs` — Main analysis system prompt
- `explanation_prompt.hbs` — Metric/term explanation pass
- `portfolio_analysis_prompt.hbs` — Portfolio-specific analysis

**Prompt Enrichment:**
- User's prompt
- Portfolio holdings context (if applicable)
- VN30 stock list (Vietnamese market awareness)
- Enabled source list with API key availability
- Context metadata (analysis id, run id)

**Explanation Pass:**
- Scans completed report for metrics and finance terms
- Spawns second ACP run with explanation prompt
- Retry logic: up to 3 attempts, only retrying missing targets
- Uses preferred model (`gpt-5.4-mini` if available)

#### 5. Frontend (`frontend/src/`)

**Tech Stack:**
- Vite + React + TypeScript
- Tauri IPC for backend communication
- React Query for server state
- `useSyncExternalStore` for global state (no external library)
- Tailwind CSS with editorial design system

**Feature Modules:**

| Module | Path | Purpose |
|--------|------|---------|
| `run-analysis` | `features/run-analysis/` | Research composer, live progress timeline |
| `analysis` | `features/analysis/` | Analysis page with report/agent sub-tabs |
| `report-viewer` | `features/report-viewer/` | Report hero, block cards, metric list, projections |
| `portfolio` | `features/portfolio/` | Portfolio management, CSV import |
| `settings` | `features/settings/` | Agent selection, API key management |
| `updates` | `features/updates/` | Self-update dialog |

**UI Design System (Editorial):**
- Primitives: `Eyebrow`, `SectionHeader`, `HairlineDivider`, `MetaRow`, `Dot`
- Hairlines, not shadows; zero radius (`--radius: 0px`)
- Numbers: `tabular-nums`, indices zero-padded in `font-mono`
- Typography: Display headlines 34-84px, body 14-15.5px
- Color restraint: one stance-derived accent per report page

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE DATA FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Prompt                                                     │
│      │                                                           │
│      ▼                                                           │
│  ┌──────────────┐                                                │
│  │create_analysis│──── SQLite: analyses + analysis_runs          │
│  └──────┬───────┘                                                │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────┐                                                │
│  │generate_     │                                                │
│  │analysis      │                                                │
│  └──────┬───────┘                                                │
│         │                                                         │
│         ├─▶ resolve agent & model                                │
│         │                                                         │
│         ├─▶ build prompt (Handlebars + context)                  │
│         │                                                         │
│         └─▶ generate_with_acp                                    │
│               │                                                   │
│               ├─▶ spawn agent child process                      │
│               │                                                   │
│               ├─▶ ACP: initialize → new_session (mount MCP)      │
│               │                         → prompt                 │
│               │                                                   │
│               │   ┌─────────────────────────────────────────┐    │
│               │   │         AGENT RESEARCH LOOP             │    │
│               │   │                                         │    │
│               │   │  <id>_query ──▶ HTTP to providers ──▶   │    │
│               │   │                 JSON response           │    │
│               │   │                                         │    │
│               │   │  submit_source ──▶ SQLite: sources      │    │
│               │   │  submit_metric ──▶ SQLite: metrics      │    │
│               │   │  submit_block  ──▶ SQLite: blocks       │    │
│               │   │  submit_stance ──▶ SQLite: stances      │    │
│               │   │                                         │    │
│               │   │  finalize_analysis ──▶ sets flag        │    │
│               │   │                         worker exits    │    │
│               │   └─────────────────────────────────────────┘    │
│               │                                                   │
│               └─▶ kill agent process                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  [Optional] Explanation Pass                              │    │
│  │  ─▶ Second ACP run with explanation targets               │    │
│  │  ─▶ submit_metric_explanation for each target             │    │
│  │  ─▶ Retry up to 3x for missing targets                   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  update run status ──▶ Completed                                │
│  emit Completed ──▶ Frontend                                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Frontend: get_analysis_report ──▶ render ReportViewer    │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### MCP Server Tool Surface

When Infi binary runs with `--analysis-mcp-server`, it exposes:

**Research Structure Tools (15):**
1. `submit_research_plan` — Plan submission
2. `submit_entity_resolution` — Entity resolution
3. `submit_source` — Source citation
4. `verify_source_accessibility` — URL probe
5. `submit_metric_snapshot` — Metric submission
6. `submit_metric_explanation` — Term explanation
7. `submit_structured_artifact` — Table/chart (11 kinds)
8. `submit_analysis_block` — Prose section (10 kinds)
9. `submit_final_stance` — Investment stance
10. `submit_projection` — Price projections
11. `submit_counter_thesis` — Counter-arguments
12. `submit_uncertainty_ledger` — Open questions
13. `submit_methodology_note` — Research approach
14. `submit_decision_criterion_answer` — Criterion verdicts
15. `finalize_analysis` — Completion signal

**Portfolio Tools (6):**
1. `submit_holding_review` — Per-holding stance
2. `submit_allocation_review` — Allocation breakdown
3. `submit_portfolio_risk` — Risk assessment
4. `submit_rebalancing_suggestion` — Rebalancing recs
5. `submit_portfolio_scenario_analysis` — Scenario outcomes
6. `submit_portfolio_expected_return_model` — Return model

**Data Provider Tools (Dynamic):**
- For each enabled source with valid API key: `<id>_query` tool
- Examples: `tavily_query`, `brave_search_query`, `alpha_vantage_query`

### Agent Discovery & Launch

**Supported Agents:**

| Agent ID | Binary | Package/Command | Model Override |
|----------|--------|-----------------|----------------|
| `codex` | `npx` | `@zed-industries/codex-acp@latest` | `-c model=<id>` |
| `claude` | `npx` | `@zed-industries/claude-code-acp` | `--model <id>` |
| `gemini` | `gemini` | native binary | `--model <id>` |
| `qwen` | `qwen` | native binary | `--model <id>` |
| `kimi` | `kimi` | native binary | `--model <id>` |
| `mistral` | `vibe-acp` | native binary | not supported |
| `opencode` | `opencode` | native binary | `--model <id>` |
| `custom` | user-configured | user-configured | not supported |

**Launch Resolution:**
1. Look up agent by id
2. Fall back to first available agent if not found
3. Validate model selection against agent's model list
4. Build final command, args, and env vars
5. Spawn with `kill_on_drop(true)` and own process group (Unix)

### Data Sources

| Provider | Category | Requires Key |
|----------|----------|--------------|
| Tavily | WebSearch | Yes |
| Brave Search | WebSearch | Yes |
| SEC EDGAR | Filings | No |
| Alpha Vantage | Fundamentals | Yes |
| Financial Modeling Prep | Fundamentals | Yes |
| Finnhub | MarketData | Yes |
| Polygon | MarketData | Yes |
| NewsAPI | News | Yes |
| Finviz | Screener | No |
| StockTwits | Forums | No |
| Hacker News | News | No |
| Yahoo Finance | MarketData | No |

---

## 📚 References

### Academic Papers

1. **Agent Client Protocol (ACP) Specification** — Zed Industries, 2024. [Link](https://zed.dev/blog/agent-client-protocol)
2. **Model Context Protocol (MCP)** — Anthropic, 2024. [Link](https://modelcontextprotocol.io/)
3. **FinGPT: Open-Source Financial Large Language Models** — Yang et al., 2023. arXiv:2306.06031
4. **Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks** — Lewis et al., 2020. NeurIPS 2020
5. **Chain-of-Thought Prompting Elicits Reasoning in Large Language Models** — Wei et al., 2022. NeurIPS 2022

### Technical Documentation

6. **Tauri 2 Documentation** — [https://v2.tauri.app/](https://v2.tauri.app/)
7. **Rust Programming Language** — [https://doc.rust-lang.org/book/](https://doc.rust-lang.org/book/)
8. **React Documentation** — [https://react.dev/](https://react.dev/)
9. **SQLite Documentation** — [https://www.sqlite.org/docs.html](https://www.sqlite.org/docs.html)
10. **PMCP Crate Documentation** — [https://docs.rs/pmcp/](https://docs.rs/pmcp/)

### Financial Data Sources

11. **SEC EDGAR API** — [https://www.sec.gov/edgar/sec-api-documentation](https://www.sec.gov/edgar/sec-api-documentation)
12. **Alpha Vantage API** — [https://www.alphavantage.co/documentation/](https://www.alphavantage.co/documentation/)
13. **Yahoo Finance API** — Unofficial, accessed via `yahoo-finance` crate
14. **Financial Modeling Prep API** — [https://financialmodelingprep.com/developer/docs/](https://financialmodelingprep.com/developer/docs/)

### Design & UX

15. **Editorial Design Systems** — Inspired by Bloomberg Terminal, Financial Times, The Economist
16. **Atomic Design Methodology** — Brad Frost, 2016. [https://atomicdesign.bradfrost.com/](https://atomicdesign.bradfrost.com/)

---

## 🛠️ Next Steps

### Immediate (v1.1)
- [ ] Add streaming token display for agent messages
- [ ] Implement comparison analysis (side-by-side reports)
- [ ] Add more Vietnamese stock data sources (SSI, TCBS)
- [ ] Mobile companion app (React Native)

### Medium-term (v1.5)
- [ ] Collaborative analysis (share reports with team)
- [ ] Historical analysis tracking (stance changes over time)
- [ ] Custom agent marketplace
- [ ] Plugin system for custom data providers

### Long-term (v2.0)
- [ ] Real-time portfolio monitoring with alerts
- [ ] Integration with brokerage APIs (read-only)
- [ ] Multi-language support (Vietnamese, Chinese, Japanese)
- [ ] Web-based version for broader accessibility

---

## 📊 Poster Design Notes

### Visual Assets Needed

1. **System Architecture Diagram** — High-level component overview
2. **Data Flow Diagram** — User prompt → Agent → MCP → Report
3. **MCP Tool Validation Flowchart** — How validation gates work
4. **UI Screenshots** — Research composer, report viewer, portfolio page
5. **Comparison Table** — Infi vs. existing solutions

### Typography Recommendations

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Title | Inter or SF Pro | 72pt | Bold |
| Section Headers | Inter or SF Pro | 36pt | Semibold |
| Body Text | Inter or SF Pro | 24pt | Regular |
| Code/Data | JetBrains Mono | 20pt | Regular |
| Captions | Inter or SF Pro | 18pt | Light |

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#1a1a2e` | Headers, emphasis |
| Secondary | `#16213e` | Subheadings |
| Accent | `#0f3460` | Links, buttons |
| Success | `#00b894` | Bullish indicators |
| Warning | `#fdcb6e` | Neutral indicators |
| Danger | `#e17055` | Bearish indicators |
| Background | `#f8f9fa` | Poster background |
| Text | `#2d3436` | Body text |

---

*Document prepared for academic poster presentation. All technical details verified against Infi v0.1.6 codebase.*

*Last updated: May 2026*
