# Infi

Infi is a Tauri 2 desktop application for AI-powered stock and portfolio research. It pairs a Rust backend with a Vite + React frontend to orchestrate external ACP (Agent Client Protocol) coding agents that fetch, structure, and reason over financial data. The final output is a structured analysis report assembled from typed blocks — the agent never emits free-form prose as the final product.

The application is a research workbench, not an investment advisor. Every analysis includes a `"Research only. Not investment advice."` disclaimer forced via the `submit_final_stance` MCP tool.

## What it does

- **Single-equity research** — enter a stock ticker and a research question; an ACP agent fetches data from multiple providers and produces a structured report with metrics, stances, projections, and sources.
- **Portfolio analysis** — import a CSV of holdings or transactions, then generate portfolio-level insights including allocation review, risk assessment, expected return models, and rebalancing suggestions.
- **Report viewer** — browse completed analyses in an editorial-style report viewer with expandable sections, metric explanations, source lists, and projection charts.
- **Data source management** — configure API keys for 12+ financial data providers (Alpha Vantage, Finnhub, Finviz, FMP, Polygon, Yahoo Finance, SEC Edgar, and more) through the OS keychain.
- **Export and publish** — export reports as standalone HTML files or markdown, and publish to a shareable URL.

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 |
| Backend | Rust (edition 2024), rusqlite, tokio, reqwest |
| Frontend | React 19, Vite 8, Tailwind CSS 4, TypeScript |
| State management | Custom `useSyncExternalStore` store, TanStack Query |
| Agent protocol | ACP (Agent Client Protocol) via `agent-client-protocol` and `pmcp` crates |
| Database | SQLite (bundled via rusqlite) |
| Templates | Handlebars (analysis prompts) |

## Quick links

- [Architecture](architecture.md) — system layers, data flows, and component relationships
- [Getting started](getting-started.md) — prerequisites, build, and run instructions
- [Glossary](glossary.md) — project-specific terms and abbreviations
- [Backend systems](../systems/index.md) — Rust infrastructure deep-dive
- [Frontend](../features/frontend-architecture.md) — React application structure
- [Data sources](../systems/data-sources.md) — financial provider integrations
