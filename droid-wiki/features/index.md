# Features

Infi's user-facing capabilities are organized as feature modules in `frontend/src/features/`. Each feature maps to a distinct page or workflow in the application.

| Feature | Path | Description |
|---|---|---|
| [Frontend architecture](frontend-architecture.md) | `frontend/src/app/`, `frontend/src/store/` | App shell, navigation, state management, and design system |
| [Run analysis](run-analysis.md) | `frontend/src/features/run-analysis/` | Research composition, agent selection, and live progress tracking |
| [Report viewer](report-viewer.md) | `frontend/src/features/report-viewer/` | Structured report display with metrics, stances, projections, and sources |
| [Portfolio](portfolio.md) | `frontend/src/features/portfolio/` | Portfolio import, management, and portfolio-level analysis |
| [Settings](settings.md) | `frontend/src/features/settings/` | Agent configuration, data source management, and API key setup |

## Navigation model

The app has four top-level views defined in `frontend/src/app/navigation.ts`:

- **new-analysis** — the Research Page where users compose queries and start analyses
- **analysis** — the Analysis Page showing a selected report with agent timeline
- **portfolio** — the Portfolio Page for managing holdings and running portfolio analysis
- **settings** — the Settings Page for configuring agents and data sources

The `AppSidebar` component (`frontend/src/app/AppSidebar.tsx`) renders the navigation and lists recent analyses and portfolios.

## API layer

The frontend communicates with the Rust backend through Tauri IPC commands defined in `frontend/src/shared/api/commands.ts`. Each command wraps a `@tauri-apps/api` `invoke` call. TanStack Query hooks in `frontend/src/shared/api/queries.ts` provide caching and automatic invalidation.
