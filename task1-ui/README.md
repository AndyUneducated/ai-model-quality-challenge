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

## Deploy (Vercel)

1. Import this repo in Vercel.
2. Set root directory to `task1-ui`.
3. Build command: `npm run build`
4. Output directory: `dist`

After deployment, paste the live URL into the root README and submission form.

## Architecture

- Client-side `.xlsx` parsing (`xlsx` + zod validation)
- Dual audience views: Customer/PM and Internal engineer
- Comparison-first layout for multi-model uploads
- No hard-coded model list (supports unseen models like Model L)
