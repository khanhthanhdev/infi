# Patterns and conventions

## Rust conventions

- **Edition 2024** with stable toolchain (see `rust-toolchain.toml`).
- **Module structure**: small modules aligned with the layered architecture. Domain logic never depends on Tauri, SQLite, or ACP details.
- **Naming**: `snake_case` for modules, functions, fields. `PascalCase` for types.
- **Error handling**: `anyhow::Result` for application code, `thiserror` for domain error enums. Commands wrap errors in `CommandError` with a kind discriminator for the frontend.
- **Clippy**: pedantic level enabled. Several lints explicitly allowed for pragmatic reasons (see `Cargo.toml` `[lints.clippy]` section).
- **Blocking in async**: use `spawn_blocking` for rusqlite and keyring calls to avoid blocking the Tauri async IPC executor.
- **Cancellation**: active analysis runs are tracked with `CancellationToken` in `AppState.active_runs`. Dropping the token cancels the ACP agent process.

## Frontend conventions

- **ES modules** with functional React components.
- **Single quotes**, two-space indentation in JSX/TSX.
- **State management**: custom `useSyncExternalStore` store (`frontend/src/store/index.ts`) for app-level state. TanStack Query for server state (analyses, portfolios, settings).
- **Styling**: Tailwind CSS 4 with an editorial design system. Zero radius (`--radius: 0px`), hairlines instead of shadows, numbered sections with `SectionHeader`.
- **UI primitives**: import `Eyebrow`, `SectionHeader`, `HairlineDivider`, `MetaRow`, `Dot` from `@/components/ui/editorial`. Do not redefine locally.
- **Typography**: display headlines 34-84px, body prose 14-15.5px, hero paragraphs 20-22px. Numbers always `tabular-nums` in mono at 10.5-11.5px.
- **Color restraint**: one stance-derived accent per report page. `text-primary` reserved for actively running states.
- **Exception surfaces**: `ProgressTimeline`, `AgentTimeline`, `ToolCallCard`, and `MarkdownMessage` are log/terminal surfaces with their own monospace identity — not in the editorial grammar.

## Prompt engineering

Analysis prompts live in Handlebars templates (`src/analysis_prompt.hbs`, `src/explanation_prompt.hbs`, `src/portfolio_analysis_prompt.hbs`). The main prompt instructs the agent to use MCP tools to submit structured data rather than producing free-form text. `src/prompts.rs` contains the Rust logic that renders these templates with domain data.

## Database patterns

- Schema and migrations live in `src/infra/db/mod.rs` (the `init()` method).
- All queries use `rusqlite` with parameterized statements.
- `Database` wraps `Connection` in `Arc<Mutex<Connection>>` and is `Clone`-safe.
- Tests use temporary directories or `open_at` with in-memory paths.

## Testing

- **Rust**: unit tests under `#[cfg(test)] mod tests` near the code they test. 11 tests covering database roundtrips, analysis lifecycle, progress events, and freshness computation.
- **Frontend**: Vitest with happy-dom for unit tests. Biome for linting. No E2E test runner configured yet.
- Validate UI changes with `cd frontend && bun run build` and manual `cargo run` smoke test.

## Commit style

One-line subjects: `action(scope): outcome`. Examples:
- `refactor(frontend): split app into feature modules`
- `fix(acp): clean up stopped runs`
- `feat(portfolio): add CSV import`
