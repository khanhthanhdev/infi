# Architecture

Infi follows a strict layered architecture. Domain types are leaf nodes with no I/O dependencies. Infrastructure handles persistence, agent orchestration, and external APIs. Commands bridge the frontend to backend via Tauri IPC. The frontend communicates exclusively through `invoke` calls and never imports Rust code directly.

## Layer map

| Layer | Path | Responsibility | Dependencies |
|---|---|---|---|
| **Domain** | `src/domain/` | Pure types: analyses, runs, entities, sources, metrics, blocks, stances, projections, portfolios. No I/O. | `serde`, `chrono` |
| **Infrastructure** | `src/infra/` | SQLite persistence, ACP agent lifecycle, data-source providers, OS keychain, app configuration, price history, CSV parsing, shell utilities. | `rusqlite`, `pmcp`, `agent-client-protocol`, `reqwest`, `keyring`, `tokio` |
| **Commands** | `src/commands/` | Tauri `#[tauri::command]` handlers bridging frontend IPC to domain + infra. Contains the `generate_analysis` orchestration, export/publish, and source management. | `domain`, `infra`, `tauri` |
| **Prompts** | `src/prompts.rs` | Handlebars templates and prompt-building logic for the main analysis pass and explanation pass. | `domain`, `infra/db`, `handlebars` |
| **State** | `src/state.rs` | `AppState` holding the `Database` handle and a map of `CancellationToken`s for active runs. Managed by Tauri as shared state. | `infra/db`, `tokio-util` |
| **Frontend** | `frontend/src/` | React SPA: research composer, live agent progress, report viewer, portfolio management, settings. | `@tauri-apps/api`, `@tanstack/react-query`, custom store, `react`, Tailwind |

## High-level architecture

```mermaid
graph TD
    subgraph Frontend["Tauri Window (Vite + React)"]
        RP[Research Page]
        AP[Analysis Page]
        PP[Portfolio Page]
        SP[Settings Page]
    end

    subgraph Commands["Tauri Commands (src/commands)"]
        CA[create_analysis]
        GA[generate_analysis]
        GR[get_report]
    end

    subgraph Domain["Domain (src/domain)"]
        AN[Analysis, Block, Stance]
        PR[Projection, Portfolio, Metrics]
    end

    subgraph Infra["Infrastructure (src/infra)"]
        DB[(SQLite Database)]
        ACP[ACP Agent Lifecycle]
        SRC[Data Sources - 12 providers]
        KS[OS Keychain]
        CFG[App Config]
    end

    subgraph External["External"]
        AGENT[ACP Agent - Codex, Claude, etc.]
        MCP[MCP Server - infi-analysis stdio]
        API[Data Provider APIs]
    end

    RP -->|invoke| CA
    AP -->|invoke| GA
    AP -->|invoke| GR
    PP -->|invoke| CA

    CA --> Domain
    GA --> ACP
    GR --> DB

    ACP --> AGENT
    AGENT --> MCP
    MCP --> SRC
    SRC --> API
    ACP --> DB
```

## Dependency rule

Domain types are leaf nodes — nothing in `domain` imports from `infra`, `commands`, or the frontend. Infrastructure depends on domain. Commands depend on both. This constraint keeps the domain model testable and framework-agnostic.

```mermaid
graph TD
    FE["Frontend<br/>(React + Vite)"] -->|"Tauri invoke()"| CMD["Commands Layer<br/>#[tauri::command]"]
    CMD --> DOM["Domain<br/>(pure types, no I/O)"]
    CMD --> INFRA["Infrastructure<br/>(DB, ACP, Sources, Keychain)"]
    INFRA --> DOM
    DOM -.->|"no imports"| INFRA
    DOM -.->|"no imports"| CMD
    DOM -.->|"no imports"| FE

    style DOM fill:#16a34a,color:#fff
    style INFRA fill:#2563eb,color:#fff
    style CMD fill:#8b5cf6,color:#fff
    style FE fill:#f59e0b,color:#000
```

## Tauri IPC and Channel streaming

The frontend communicates with the Rust backend exclusively through Tauri's `invoke()` mechanism. For long-running operations like `generate_analysis`, a `Channel<ProgressEventPayload>` is used to stream real-time events from the Rust backend to the frontend.

```mermaid
sequenceDiagram
    participant FE as Frontend (React)
    participant IPC as Tauri IPC Bridge
    participant CMD as generate_analysis()
    participant STATE as AppState
    participant WORKER as ACP Worker Thread
    participant AGENT as Agent Process

    FE->>IPC: invoke("generate_analysis", {<br/>  analysis_id, agent_id, model_id,<br/>  enabled_sources, on_progress: Channel<br/>})
    IPC->>CMD: Deserialize args + Channel handle
    CMD->>STATE: Read enabled sources, resolve keys
    CMD->>STATE: Store CancellationToken in active_runs
    CMD->>WORKER: thread::spawn(generate_with_acp)

    loop While agent is running
        WORKER-->>CMD: ProgressEvent via mpsc::UnboundedSender
        CMD-->>IPC: on_progress.send(event)
        IPC-->>FE: Channel callback fires
        FE->>FE: handleProgressEvent() → update store
    end

    WORKER-->>CMD: GenerateAnalysisResult
    CMD-->>IPC: Return result
    IPC-->>FE: invoke() resolves

    Note over FE,AGENT: User clicks "Stop"
    FE->>IPC: invoke("stop_analysis", {run_id})
    IPC->>STATE: Look up CancellationToken
    STATE->>WORKER: token.cancel()
    WORKER->>AGENT: start_kill() + kill_process_group()
    WORKER-->>CMD: AcpCancelled error
```

### AppState and run cancellation

```mermaid
graph TD
    subgraph "AppState (managed by Tauri)"
        DB["Database handle<br/>(Clone, internal Mutex)"]
        RUNS["active_runs:<br/>Arc&lt;Mutex&lt;HashMap&lt;String, CancellationToken&gt;&gt;&gt;"]
    end

    subgraph "generate_analysis flow"
        CREATE["Create CancellationToken"]
        STORE["Insert into active_runs[run_id]"]
        SPAWN["thread::spawn(worker)"]
        WORKER["Worker uses token in<br/>tokio::select!"]
    end

    subgraph "stop_analysis flow"
        STOP["Lookup active_runs[run_id]"]
        CANCEL["token.cancel()"]
        REMOVE["Remove from active_runs"]
    end

    CREATE --> STORE --> SPAWN --> WORKER
    STOP --> CANCEL --> REMOVE

    style RUNS fill:#ef4444,color:#fff
    style CANCEL fill:#ef4444,color:#fff
    style DB fill:#2563eb,color:#fff
```

## Run lifecycle

1. The user composes a research query on the **Research Page** and picks an ACP agent.
2. `create_analysis` writes an `Analysis` row (status: `queued`) and a `Run` row to SQLite.
3. `generate_analysis` resolves the agent binary via `agent_discovery`, spawns it as a child process, and connects over ACP stdio.
4. The agent calls MCP tools exposed by `analysis_mcp_server` to submit plan entries, fetch data from providers, write structured blocks (metrics, stances, projections), and finally submit a `FinalStance`.
5. Progress events stream to the frontend via a Tauri `Channel`.
6. When the agent finishes, the run status updates to `completed` or `failed`, and the report becomes available in the report viewer.

## Data flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant CMD as Commands
    participant ACP as ACP Client
    participant AG as Agent
    participant MCP as MCP Server
    participant DB as SQLite

    U->>FE: Enter research query
    FE->>CMD: create_analysis(query)
    CMD->>DB: Insert analysis + run
    CMD-->>FE: analysis_id, run_id
    FE->>CMD: generate_analysis(analysis_id)
    CMD->>ACP: spawn agent process
    ACP->>AG: launch with MCP server
    loop Agent execution
        AG->>MCP: fetch_data(provider, ticker)
        MCP-->>AG: structured data
        AG->>MCP: submit_metric(...)
        AG->>MCP: submit_stance(...)
        AG->>MCP: submit_projection(...)
        MCP->>DB: persist blocks
        MCP-->>ACP: progress event
        ACP-->>FE: Channel(progress)
    end
    AG->>MCP: submit_final_stance(...)
    MCP->>DB: update run status
    FE->>CMD: get_analysis_report(id)
    CMD->>DB: load report
    DB-->>FE: structured report
```

## Entry point

The application starts in `src/main.rs`. It initializes the logger, fixes PATH on Unix, captures the shell PATH, then either runs as an MCP server (if `--analysis-mcp-server` is passed), prints environment info (if `--printenv` is passed), or launches the Tauri window with all commands registered.

## Key source files

| File | Purpose |
|---|---|
| `src/main.rs` | Application entry point, Tauri builder, command registration |
| `src/lib.rs` | Module re-exports |
| `src/state.rs` | `AppState` with database handle and active run cancellations |
| `src/commands/mod.rs` | All Tauri IPC command handlers (1942 lines) |
| `src/domain/analysis.rs` | Core analysis types: `Analysis`, `AnalysisReport`, `AnalysisBlock`, `FinalStance` |
| `src/domain/portfolio.rs` | Portfolio types: `Portfolio`, `PortfolioHolding`, `PortfolioTransaction` |
| `src/infra/db/mod.rs` | SQLite schema, migrations, and all persistence operations (5268 lines) |
| `src/infra/acp/analysis_generator/client.rs` | ACP client that spawns and communicates with agents |
| `src/infra/acp/analysis_mcp_server/tool.rs` | MCP tool definitions the agent calls to submit data |
| `src/prompts.rs` | Handlebars prompt templates for analysis and explanation passes |
