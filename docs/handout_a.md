# Handout A — Why This Works (Technical)

## Problem

A production prospect needs a fast, reliable signal for coding (LiveCodeBench v5) and long-context reasoning (AA-LCR). Full eval cost is too high for iterative model selection.

## Approach (Part A)

We prune with a **multi-objective selector** that optimizes:

- **Coverage** across metadata strata
- **Disagreement** where models diverge (ranking-sensitive)
- **Difficulty** away from trivial samples

This is intentionally different from random or hardest-only sampling (forbidden baselines). We validate with Kendall/Spearman rank correlation, go/no-go agreement, leave-one-model-out checks, and bootstrap confidence intervals.

## How much we prune

Default compression:

- LiveCodeBench: `prune_ratio=0.1` (~90% savings)
- AA-LCR: `prune_ratio=0.2` (~80% savings; smaller N + judge noise)

On shipped models, this preserves ranking and tiered go/no-go/review decisions. See `artifacts/task2/compare_summary.json`.

## Part B (MMMU encoder probe)

We select probes that are sensitive to image perturbations but not explainable by text priors alone. Control design:

- text-only difficulty estimate
- original-image score
- perturbed-image score proxy

Good probes: low text-only success, high original success, large drop under perturbation.

## Assumptions

- Shipped review JSONL reflects stable grading for LCB; AA-LCR includes judge noise.
- Metadata fields carry enough signal for coverage stratification.
- A 4th unseen model will behave similarly if capability gaps are smooth, not discontinuous.

## If we had more time/data

- Live endpoint runs for Part B text-only/original/perturbed controls
- More models for pruning calibration
- Active learning loop to adapt prune sets per customer SLA thresholds
