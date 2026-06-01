# How to Contribute

Infi is currently a solo-contributor project, but the codebase is structured to accept contributions. This guide covers the intended workflow for anyone looking to help.

## Work Pickup

1. **Browse open issues** on the [GitHub repository](https://github.com/khanhthanhdev/infi). Issues labeled `good first issue` are scoped for newcomers.
2. **Claim the issue** by leaving a comment. This avoids duplicate effort.
3. **Fork the repository** and create a feature branch from `main`.

If there is no issue for the work you want to do, open one first. Describe the problem or feature, and wait for acknowledgment before starting.

## PR Process

1. Fork and branch from `main`.
2. Write code following the [patterns and conventions](patterns-and-conventions.md).
3. Run all validation commands before pushing (see [Development Workflow](development-workflow.md)).
4. Open a pull request against `main` with:
   - A description of the user-visible change
   - The validation commands you ran and their results
   - Screenshots or recordings for UI changes
   - A link to any related issue
5. A maintainer will review the PR. Address feedback promptly.

## Definition of Done

A change is ready to merge when **all** of these pass with zero warnings:

**Frontend:**
```bash
cd frontend && bun run check:ci   # Biome lint + format
cd frontend && bun run build      # TypeScript type-check
```

**Rust:**
```bash
cargo fmt --check                                    # Formatting
cargo clippy --all-targets --all-features -- -D warnings  # Lint
cargo test                                           # All tests pass
```

Do not push code that produces warnings. Fix all clippy lints, Biome issues, and type errors before requesting review.

## Related Pages

- [Patterns and Conventions](patterns-and-conventions.md) — coding style, naming, and architectural rules
- [Testing](testing.md) — how to run and write tests
- [Tooling](tooling.md) — build system, linters, formatters, and CI
- [Development Workflow](development-workflow.md) — branch strategy and validation cycle
