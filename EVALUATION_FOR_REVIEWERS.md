# Evaluation Guide for Reviewers

Use this page as a fast navigation map (human or AI reviewers).

## 3-minute smoke test (Task 1)

1. Open the live URL in the root README.
2. Upload 2+ `.xlsx` sweeps (or use local `perf_data.zip` extracts).
3. Confirm comparison table/chart renders immediately.
4. Switch Customer vs Internal tabs.

Local fallback:

```bash
cd task1-ui && npm ci && npm run dev
```

## 5-minute smoke test (Task 2)

```bash
./reproduce.sh
cat artifacts/scorecard.json
cat artifacts/task2/compare_summary.json
```

## Design decisions

- Framework and algorithm trade-offs: `docs/decision_log.md`
- Requirement mapping: `docs/requirement_traceability.md`
- Technical methodology: `docs/task2_methodology.md`

## What to inspect for scoring

- **Not a static table dump**: dual audience + go/no-go logic in Task1.
- **Not forbidden baselines**: ablation in `artifacts/task2/ablation.json`.
- **Not hard-coded models**: dynamic filename parsing tests for Model L.
- **Not hand-wavy Part B**: encoder control validation JSON + probe code.

## evalscope integration

- Base SHA: `evalscope_ext/EVALSCOPE_BASE_SHA`
- Pruned benchmark registry: `evalscope_ext/evalscope_ext/benchmarks/pruned_registry.py`
- Compare tool: `python3 -m evalscope_ext.tools.compare_runs`
