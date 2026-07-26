# Contributing to y-sync

Thanks for contributing.

## Prerequisites

- Node.js LTS
- npm

## Local Setup

```bash
npm install
```

Build all workspaces:

```bash
npm run build
```

Run tests:

```bash
npm -w test run test
```

## Recommended Workflow

1. Create a feature or fix branch from `main`.
2. Make atomic and documented changes.
3. Ensure build and tests are passing.
4. Open a Pull Request with a clear description.

## Best Practices

- Keep ESM/CJS compatibility when applicable.
- Avoid unnecessary style-only changes.
- Add tests for every bug fix or new feature.
- Update documentation and changelog when relevant.

## Expected Quality

- No critical lint warnings in modified areas.
- No visible functional regressions.
- Stable public APIs, or documented migration notes.
