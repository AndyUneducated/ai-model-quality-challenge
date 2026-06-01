# Task 1 UI — Performance Projection Explorer

## Quick start

```bash
cd task1-ui
npm ci
npm run dev
```

Open http://localhost:5173 and upload one or more `.xlsx` perf sweeps.

## Production build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm run test
npm run test:e2e
```

## Deploy (GitHub Pages)

Automated from the repo root via GitHub Actions. Live URL:

`https://andyuneducated.github.io/ai-model-quality-challenge/`

See [docs/DEPLOY_TASK1.md](../docs/DEPLOY_TASK1.md).

## Architecture

- Client-side `.xlsx` parsing (`xlsx` + zod validation)
- Dual audience views: Customer/PM and Internal engineer
- Comparison-first layout for multi-model uploads
- No hard-coded model list (supports unseen models like Model L)
