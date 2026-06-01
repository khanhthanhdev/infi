# Glossary

Project-specific terms and abbreviations used throughout the Infi codebase.

| Term | Definition |
|---|---|
| **ACP** | Agent Client Protocol — a stdio-based protocol for communicating with coding agents. Infi uses it to spawn and orchestrate external agents like Codex or Claude Code. |
| **Analysis** | A single research session. Contains a user query, an intent classification, one or more runs, and a structured report. Persisted in SQLite. |
| **Analysis Block** | A typed piece of an analysis report — can be a metric, stance, projection, methodology note, counter-thesis, or other structured artifact. |
| **Artifact Kind** | The type discriminator for structured artifacts: `metric_snapshot`, `stance`, `projection`, `counter_thesis`, `methodology_note`, `decision_criterion`, `uncertainty`, `source`, `metric_explanation`. |
| **Final Stance** | The agent's concluding position on the research question. Submitted via the `submit_final_stance` MCP tool. Always includes the research disclaimer. |
| **Freshness** | A system that tracks how old each metric in a stance is. Metrics older than `source_freshness_days` (default 7) are flagged as stale. |
| **MCP Server** | The `infi-analysis` server that runs as a child process of the ACP agent. It exposes tools like `fetch_data`, `submit_metric`, `submit_stance`, and `submit_projection` that the agent calls to interact with Infi. |
| **Portfolio** | A collection of holdings or transactions imported from CSV. Can be analyzed to produce allocation review, risk assessment, and expected return models. |
| **Provider** | A data source adapter (e.g., Finnhub, Yahoo Finance, Polygon). Each provider implements the `SourceProvider` trait and may require an API key stored in the OS keychain. |
| **Projection** | A forward-looking scenario analysis with bull/base/bear cases, each containing price targets, time horizons, and probability weights. |
| **Research Plan** | A structured plan the agent submits at the start of a run, listing the steps it will take to answer the research question. |
| **Run** | A single execution attempt of an analysis. An analysis can have multiple runs (re-runs). Each run has its own status, progress events, and report snapshot. |
| **RunContext** | Runtime context for a single analysis run, carrying the analysis ID, run ID, enabled sources, and cancellation token. |
| **Stance** | The agent's position on a specific aspect of the research. Can be `bullish`, `bearish`, or `neutral`, with supporting evidence. |
| **Structured Artifact** | A generic typed block in the report that doesn't fit the specific metric/stance/projection categories. Has a `kind`, `title`, `content`, and optional columns/rows. |
| **Tauri Channel** | A streaming IPC mechanism used to push progress events from the Rust backend to the frontend in real time during a run. |
| **Verification Status** | The freshness status of a stance metric: `fresh`, `stale`, or `unverifiable`. Computed by comparing the metric's timestamp against the configured freshness window. |
