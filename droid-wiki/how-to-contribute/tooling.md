# Tooling

## Build System

### Rust — Cargo

- **Toolchain**: stable, edition 2024 (see `rust-toolchain.toml`)
- **Build**: `cargo build` (debug) or `cargo build --release`
- **Run**: `cargo run` (launches the Tauri desktop app)
- **Check**: `cargo check` (fast compilation validation without producing binaries)
- **Key dependencies**: `tauri` 2.9.5, `rusqlite` (bundled SQLite), `tokio`, `reqwest`, `agent-client-protocol`, `pmcp`

### Frontend — Vite + Bun

- **Package manager**: Bun
- **Dev server**: `cd frontend && bun run dev`
- **Build**: `cd frontend && bun run build` (runs `tsc && vite build && bun run build:viewer`)
- **Viewer build**: a separate Vite config (`vite.viewer.config.ts`) produces a standalone report viewer HTML
- **Key dependencies**: React 19, TanStack Query, Radix UI, Tailwind CSS 4, Framer Motion, `@tauri-apps/api`

## Linting

### Rust — Clippy

```bash
cargo clippy --all-targets --all-features -- -D warnings
```

Clippy is configured at **pedantic** level in `Cargo.toml` with pragmatic allow-list entries for lints that are too noisy for application code (e.g., `module_name_repetitions`, `too_many_lines`, `doc_markdown`). Warnings are treated as errors in CI.

### Frontend — Biome

```bash
cd frontend && bun run check:ci
```

Biome handles both linting and format checking in a single pass. The `check:ci` script runs `biome ci ./src`, which fails on any lint violation or format drift.

## Formatting

### Rust — rustfmt

```bash
cargo fmt          # Format in place
cargo fmt --check  # Check only (CI mode)
```

### Frontend — Biome

```bash
cd frontend && bun run format    # Format in place
cd frontend && bun run check:ci  # Check only (CI mode)
```

## CI — GitHub Actions

| Workflow | File | Trigger | What it does |
|---|---|---|---|
| **Rust CI** | `.github/workflows/rust-ci.yml` | Push/PR to `main` touching source files | `cargo fmt --check`, `cargo clippy`, `cargo test`, full release build — across Linux, macOS, Windows |
| **Release** | `.github/workflows/release.yml` | Tag push (`v*`) | Builds platform installers (macOS ARM/Intel, Linux AppImage, Windows NSIS), creates GitHub Release, optionally submits to winget |
| **Landing CI** | `.github/workflows/landing-ci.yml` | Changes to landing page | Validates the landing page build |
| **Security** | `.github/workflows/security.yml` | Scheduled / push | Security scanning |

### Release Artifacts

The release workflow produces:
- macOS `.dmg` (Apple Silicon + Intel) — unsigned, requires right-click → Open on first launch
- Linux `.AppImage`
- Windows `.exe` installer (NSIS)
- Optional winget submission (gated behind `WINGET_PUBLISH=true` repo variable)

## Code Generation — Handlebars

Analysis prompts are generated from Handlebars templates:

- `src/analysis_prompt.hbs` — main analysis prompt
- `src/explanation_prompt.hbs` — metric explanation prompt
- `src/portfolio_analysis_prompt.hbs` — portfolio analysis prompt

The Rust code in `src/prompts.rs` renders these templates with domain data before passing them to the ACP agent. The templates instruct the agent to use MCP tools to submit structured data rather than producing free-form text.

## Related Pages

- [How to Contribute](index.md) — overview and definition of done
- [Development Workflow](development-workflow.md) — branch strategy and validation cycle
- [Testing](testing.md) — running and writing tests
- [Patterns and Conventions](patterns-and-conventions.md) — coding style
