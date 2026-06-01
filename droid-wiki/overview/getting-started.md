# Getting started

## Prerequisites

- **Rust** — edition 2024, stable toolchain (see `rust-toolchain.toml`). Minimum version 1.85.
- **Bun** — used for frontend package management and scripts. Install from [bun.sh](https://bun.sh).
- **Node.js** — required by Tauri's build system (v18+).
- **System dependencies** — Tauri requires platform-specific libraries. See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

## Install

```bash
# Clone the repository
git clone https://github.com/khanhthanhdev/infi.git
cd infi

# Install frontend dependencies
cd frontend && bun install && cd ..
```

## Build and run

### Development mode

```bash
# Run the Tauri desktop app (builds frontend + Rust backend)
cargo run
```

This launches the Vite dev server and Tauri window together. Frontend hot-reloads on changes.

### Frontend only

```bash
cd frontend && bun run dev
```

### Production build

```bash
cd frontend && bun run build
cargo build --release
```

The frontend build also produces a standalone viewer (`dist-viewer/viewer.html`) embedded into the Rust binary at compile time via `include_str!`.

## Validation commands

Run these before committing. All must pass with zero warnings.

**Frontend:**
```bash
cd frontend && bun run check:ci   # Biome lint + format
cd frontend && bun run build      # TypeScript type-check + build
```

**Rust:**
```bash
cargo fmt --check                                    # Formatting
cargo clippy --all-targets --all-features -- -D warnings  # Lint (warnings = errors)
cargo test                                           # All tests pass
```

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `INFI_DB_PATH` | Override SQLite database location | Platform app-data dir |
| `INFI_CONFIG_PATH` | Override config file location | Platform app-data dir |
| `CODEX_ACP_BIN` | Override path to the Codex agent binary | System PATH lookup |
| `INFI_CUSTOM_AGENT` | Register a custom agent command | None |
| `INFI_SRC_KEY_<PROVIDER>` | API key for a data source provider (e.g., `INFI_SRC_KEY_FINNHUB`) | None |

## ACP agents

Infi orchestrates external coding agents via the Agent Client Protocol. Out of the box it supports:

- **Codex** — OpenAI's coding agent
- **Claude Code** — Anthropic's coding agent
- **Custom agents** — any ACP-compatible agent configured via `INFI_CUSTOM_AGENT` or the Settings page

The agent binary must be installed separately. Infi discovers agents on the system PATH and lets the user pick one from the Settings page.

## First analysis

1. Launch the app with `cargo run`.
2. On the Research Page, enter a stock ticker (e.g., `AAPL`) and a research question.
3. Select an ACP agent from the dropdown.
4. Click "Run analysis". The agent will fetch data, reason over it, and produce a structured report.
5. Browse the report in the Analysis Page when the run completes.
