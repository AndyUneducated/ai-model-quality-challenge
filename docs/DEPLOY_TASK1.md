# Deploy Task 1 UI — GitHub Pages

Task 1 is deployed automatically via [`.github/workflows/deploy-task1.yml`](../.github/workflows/deploy-task1.yml).

## One-time setup

1. Make the repository **public** (or keep private if you have GitHub Pro — Pages works on private repos with Pro).
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or run **Actions → Deploy Task1 UI → Run workflow**).

## Live URL

```
https://andyuneducated.github.io/ai-model-quality-challenge/
```

Update the root `README.md` and submission form if the URL differs.

## How it works

- Workflow builds `task1-ui` with `VITE_BASE_PATH=/<repo-name>/` so assets resolve under the project path.
- Artifact uploads to GitHub Pages via `actions/deploy-pages`.

## Verify after deploy

- Open the live URL and upload 2+ `.xlsx` files from `perf_data.zip`
- Confirm comparison chart/table renders
- Switch Customer / Internal tabs

## Local preview (same base path as Pages)

```bash
cd task1-ui
VITE_BASE_PATH=/ai-model-quality-challenge/ npm run build
npm run preview
```
