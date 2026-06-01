# Configuration

Infi uses a JSON config file and environment variables for runtime configuration.

## Config file

The config file is `config.json` in the platform-specific app data directory:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/Infi/config.json` |
| Windows | `%APPDATA%/Infi/config.json` |
| Linux | `$XDG_CONFIG_HOME/infi/config.json` or `~/.config/infi/config.json` |

Override with the `INFI_CONFIG_PATH` environment variable.

### Schema

```json
{
  "custom_agent_command": null,
  "custom_agent_args": [],
  "timeout_secs": 1800,
  "source_freshness_days": 7,
  "disclaimer": "Research only. Not investment advice.",
  "model_by_agent": {},
  "enabled_sources": [],
  "sources_with_keys": []
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `custom_agent_command` | `string?` | `null` | Path to a custom ACP agent binary |
| `custom_agent_args` | `string[]` | `[]` | Arguments passed to the custom agent |
| `timeout_secs` | `u64` | `1800` | Maximum agent execution time (30 minutes) |
| `source_freshness_days` | `u32` | `7` | Days before a metric is considered stale |
| `disclaimer` | `string` | `"Research only..."` | Disclaimer text forced into every final stance |
| `model_by_agent` | `map` | `{}` | Model override per agent ID (e.g., `{"codex": "gpt-5-codex"}`) |
| `enabled_sources` | `string[]` | `[]` | Globally enabled data source provider IDs |
| `sources_with_keys` | `string[]` | `[]` | Cached list of providers with API keys in keychain |

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `INFI_DB_PATH` | Override SQLite database location | Platform app-data dir (`db.sqlite`) |
| `INFI_CONFIG_PATH` | Override config file location | Platform app-data dir (`config.json`) |
| `CODEX_ACP_BIN` | Override path to the Codex agent binary | System PATH lookup |
| `INFI_CUSTOM_AGENT` | Register a custom agent command | None |
| `INFI_SRC_KEY_<PROVIDER>` | API key for a data source provider | None |
| `RUST_LOG` | Log level for `env_logger` | `warn` |

## Database location

The SQLite database follows the same platform-specific pattern as the config file:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/Infi/db.sqlite` |
| Windows | `%APPDATA%/Infi/db.sqlite` |
| Linux | `$XDG_DATA_HOME/infi/db.sqlite` or `~/.local/share/infi/db.sqlite` |

Override with `INFI_DB_PATH`.

## Key source files

| File | Purpose |
|---|---|
| `src/infra/app_config.rs` | `AppConfig` struct, `load_config()`, `save_config()`, platform path resolution |
| `src/infra/db/mod.rs` | `Database::default_path()` with platform-specific logic |
| `src/infra/keystore.rs` | OS keychain integration for API key storage |
