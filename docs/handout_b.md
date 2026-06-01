# Handout B — Why This Matters and How to Use It

## What changes for the customer conversation

Instead of waiting for full benchmark runs, sales and deployment teams can get a **good-enough signal in ~10% of the time/cost** while still preserving model ranking and go/no-go decisions.

## How to run it tomorrow

```bash
evalscope eval --model <model> --datasets live_code_bench --output ./results_full/
evalscope eval --model <model> --datasets live_code_bench_pruned \
  --dataset-args '{"pruning_strategy": "multi_objective", "prune_ratio": 0.1}' \
  --output ./results_pruned/
python3 -m evalscope_ext.tools.compare_runs --full ./results_full/ --pruned ./results_pruned/
```

If `./results_*` directories are unavailable offline, run:

```bash
./reproduce.sh
```

## Why multimodal probe beats random sampling

Random multimodal samples often measure generic QA ability. Our probe prioritizes samples where performance depends on image encoding quality (large drop under visual perturbation, low text-only solvability).

## Why PMs should care

- Faster pre-sales cycles (days → hours for first capability read)
- Fewer false positives from "easy subset luck"
- Clearer escalation path: if pruned probe fails, defer to full benchmark before customer commitment
