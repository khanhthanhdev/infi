# Testing

## Rust Tests

The Rust codebase contains **147 test functions** spread across 17 source files. The heaviest concentration is in `src/infra/db/mod.rs` (39 tests), covering database roundtrips, analysis lifecycle, progress events, and freshness computation.

### Test Distribution

| File | Tests |
|---|---|
| `src/infra/db/mod.rs` | 39 |
| `src/commands/mod.rs` | 16 |
| `src/infra/acp/analysis_mcp_server/tool.rs` | 15 |
| `src/prompts.rs` | 11 |
| `src/infra/csv_parser.rs` | 11 |
| `src/infra/acp/agent_discovery.rs` | 9 |
| `src/domain/analysis.rs` | 9 |
| `src/infra/sources/providers/finviz.rs` | 8 |
| `src/domain/freshness.rs` | 7 |
| Other files (8 files) | 22 |

### Running Rust Tests

```bash
cargo test
```

### Test Patterns

- Tests live in `#[cfg(test)] mod tests` blocks near the code they test.
- Database tests use temporary directories via `tempfile` or `open_at` with in-memory paths — they never touch the user's app data directory.
- Tests are deterministic and do not depend on external network services.

## Frontend Tests

The frontend uses **Vitest** with the `happy-dom` environment for unit testing.

### Test Files

- `frontend/src/features/report-viewer/projection-format.test.ts` — projection formatting logic
- `frontend/src/hooks/useQueryInvalidation.test.ts` — TanStack Query invalidation hooks
- `frontend/src/lib/markdown-highlights.test.tsx` — markdown number highlighting

### Running Frontend Tests

```bash
cd frontend && bun run test
```

This runs `vitest run` (single pass, no watch mode).

### Writing Frontend Tests

- Place test files adjacent to the code they test with a `.test.ts` or `.test.tsx` suffix.
- Use `@testing-library/react` for component tests and `@testing-library/jest-dom` for DOM assertions.
- The happy-dom environment is configured in `frontend/vitest.config.ts`.

## What's Missing

- **No E2E test runner** is configured yet. UI changes should be validated with `cd frontend && bun run build` (type-check) and a manual `cargo run` smoke test.
- **No frontend test coverage** reporting is set up.
- **No integration tests** for the Tauri IPC layer.

## Related Pages

- [How to Contribute](index.md) — definition of done
- [Development Workflow](development-workflow.md) — validation commands
- [Tooling](tooling.md) — build system and CI
- [Patterns and Conventions](patterns-and-conventions.md) — coding style
