# Deploy Task 1 UI

## Option A — Vercel (recommended for private repo submission)

1. Push this repository to GitHub.
2. Open [https://vercel.com/new](https://vercel.com/new) and import the repo.
3. Set **Root Directory** to `task1-ui`.
4. Keep defaults:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Deploy, then copy the production URL into the root `README.md` and the submission form.

CLI alternative (after `npx vercel login`):

```bash
cd task1-ui
npx vercel --prod
```

## Option B — GitHub Pages (public repo only)

1. In GitHub repo **Settings → Pages**, set source to **GitHub Actions**.
2. Push to `main`. Workflow `.github/workflows/deploy-task1.yml` builds and deploys.
3. Live URL format: `https://<username>.github.io/<repo-name>/`
4. For project pages, set repo variable or edit workflow env `VITE_BASE_PATH=/<repo-name>/`.

## Verify after deploy

- Upload 2+ `.xlsx` files from `perf_data.zip`
- Confirm comparison chart/table renders
- Switch Customer / Internal tabs
