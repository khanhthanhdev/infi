# Development Workflow

## Branch Strategy

- **`main`** is the default and release branch. All PRs target `main`.
- Feature branches follow the pattern `<type>/<short-description>`, e.g. `feat/portfolio-import`, `fix/windows-shell`.
- Keep branches short-lived. Merge or close within a few days.

## Code → Test → PR → Merge Cycle

1. **Branch** from `main`.
2. **Write code** following [patterns and conventions](patterns-and-conventions.md).
3. **Validate locally** (see below).
4. **Push** and open a PR against `main`.
5. **CI runs** automatically — the Rust CI workflow checks formatting, lint, tests, and build across Linux, macOS, and Windows.
6. **Review** by a maintainer.
7. **Merge** once all checks pass and feedback is addressed.

## Validation Commands

Run these before every commit. All must pass with **zero warnings**.

### Frontend

```bash
cd frontend && bun run check:ci   # Biome lint + format check
cd frontend && bun run build      # TypeScript type-check + production build
```

### Rust

```bash
cargo fmt --check                                    # Formatting (no diffs)
cargo clippy --all-targets --all-features -- -D warnings  # Lint (warnings = errors)
cargo test                                           # All tests pass
```

### Full Validation (One-liner)

```bash
cd frontend && bun run check:ci && bun run build && cd .. && cargo fmt --check && cargo clippy --all-targets --all-features -- -D warnings && cargo test
```

## CI Pipelines

The GitHub Actions workflow at `.github/workflows/rust-ci.yml` runs on every push and PR to `main` that touches source files. It executes three jobs across Linux, macOS, and Windows:

1. **Check & Lint** — `cargo fmt --check` and `cargo clippy --all-targets --all-features -- -D warnings`
2. **Tests** — `cargo test --verbose`
3. **Build Check** — installs frontend deps with Bun, builds the frontend, then runs `cargo build --release`

The release workflow at `.github/workflows/release.yml` triggers on version tags (`v*`) and produces platform installers for macOS (Apple Silicon + Intel), Linux (AppImage), and Windows (NSIS).

See [Tooling](tooling.md) for details on the build system and CI configuration.

## Related Pages

- [How to Contribute](index.md) — overview and definition of done
- [Testing](testing.md) — running and writing tests
- [Tooling](tooling.md) — build system, linters, and CI
- [Patterns and Conventions](patterns-and-conventions.md) — coding style
