# Data setup (Evals + perf)

## Evals (Task 2)

`Evals/Part 1/` (LiveCodeBench + AA-LCR) is stored **directly in Git** — a normal clone is enough for Part A.

`Evals/MMMU/` remains on **Git LFS** (`git lfs pull` after clone). If LFS fails, download from the Google Drive link in the challenge email and place files under `Evals/`:

If `git lfs pull` fails with an LFS budget error, download the full `Evals/` tree from the Google Drive link in the challenge email and place it at the repository root:

```
ai-model-quality-challenge/
  Evals/
    Part 1/
    MMMU/
```

Verify:

```bash
head -c 80 "Evals/Part 1/predictions/aa_lcr__gpt-oss-120b.jsonl"
# Should show JSON starting with {"index": ...}, NOT "version https://git-lfs..."
```

## perf_data (Task 1)

Use the updated `perf_data/` directory or `perf_data.zip` from the challenge repo root, then refresh the UI bundle:

```bash
cd task1-ui
npm run build:default-perf
# or: node scripts/build_default_perf.mjs ../perf_data
```

This copies 77 sweeps (models A–K × 7 profiles) into `task1-ui/public/perf_data/` for pre-loading.
