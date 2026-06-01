# Dependencies

## Rust dependencies

Key crates from `Cargo.toml`:

| Crate | Version | Purpose |
|---|---|---|
| `tauri` | 2.9.5 | Desktop application framework |
| `agent-client-protocol` | 0.10 | ACP stdio protocol for agent communication |
| `pmcp` | 1.8.6 | MCP (Model Context Protocol) server implementation |
| `rusqlite` | 0.32 | SQLite database (bundled) |
| `reqwest` | 0.12 | HTTP client for data provider APIs (rustls-tls) |
| `tokio` | 1 | Async runtime (multi-thread, process, signal, sync, time) |
| `serde` / `serde_json` | 1.0 | Serialization |
| `handlebars` | 6.3 | Prompt template rendering |
| `keyring` | 3 | OS keychain access for API key storage |
| `chrono` | 0.4 | Date/time handling |
| `scraper` | 0.20 | HTML parsing for web scraping providers |
| `anyhow` | 1.0 | Error handling |
| `thiserror` | 2 | Derive macro for error types |
| `clap` | 4.4 | CLI argument parsing |
| `uuid` | 1 | UUID generation for entity IDs |
| `tokio-util` | 0.7 | CancellationToken and compat utilities |
| `unicode-normalization` | 0.1 | Text normalization |
| `dirs` | 5 | Platform-specific directory paths |
| `tempfile` | 3 | Temporary files for testing |

Tauri plugins: `tauri-plugin-clipboard-manager`, `tauri-plugin-dialog`.

## Frontend dependencies

Key packages from `frontend/package.json`:

| Package | Purpose |
|---|---|
| `react` / `react-dom` (19.x) | UI framework |
| `@tauri-apps/api` | Tauri IPC bridge |
| `@tanstack/react-query` | Server state management and caching |
| `tailwindcss` (4.x) | Utility-first CSS |
| `radix-ui` | Accessible UI primitives |
| `framer-motion` | Animations |
| `react-markdown` + `remark-gfm` | Markdown rendering |
| `highlight.js` | Code syntax highlighting |
| `dompurify` | HTML sanitization |
| `lucide-react` / `@phosphor-icons/react` | Icon libraries |
| `class-variance-authority` + `clsx` + `tailwind-merge` | Tailwind class utilities |
| `sonner` | Toast notifications |

Dev dependencies: `vite` (8.x), `typescript`, `biome` (linting/formatting), `vitest` (testing), `happy-dom`, `@testing-library/react`.

## Build tools

| Tool | Purpose |
|---|---|
| `cargo` | Rust build, test, lint |
| `bun` | Frontend package manager and script runner |
| `vite` | Frontend bundler (main app + standalone viewer) |
| `biome` | Frontend linting and formatting |
| `clippy` | Rust linting |
| `rustfmt` | Rust formatting |
