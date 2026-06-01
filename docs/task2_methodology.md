# Task 2 Methodology

## Problem framing

Sales/engineering need a fast answer: *Is this model good enough for coding + long-context workloads?* Full benchmarks are too expensive. We compress benchmarks while preserving:

1. Model ranking stability
2. Go/no-go decision stability
3. Coverage of hard/disagreement regions for regression testing

## Part A algorithm

For each sample `i` across models:

- **Difficulty**: `1 - mean(model_scores_i)`
- **Disagreement**: variance of model scores on sample `i`
- **Coverage**: metadata bucket (question/category/subject hash)

Selection steps:

1. Stratify by metadata bucket.
2. Within each stratum, run greedy facility-location on feature vectors `[difficulty, disagreement, bucket_hash, pass_rate]`.
3. Budget = `ceil(N * prune_ratio)` with deterministic seed.

Forbidden baselines are implemented only for ablation (`random_baseline`, `top_k_hardest_baseline`), not as production strategy.

## Success thresholds

- Kendall τ ≥ 0.9
- Decision agreement = 100% on shipped models
- Cost reduction ≈ `1 - prune_ratio` (10% samples → ~90% savings)

## Anti-overfitting

- Leave-one-model-out decision agreement
- Bootstrap 95% CI on pruned-vs-full mean shift
- AA-LCR judge noise called out in `LIMITATIONS.md`

## Part B encoder probe

Three control conditions per candidate sample:

1. `text_only` (estimated text prior)
2. `original_image`
3. `perturbed_image` (resolution/blur/compression proxy via metadata penalties)

`EncoderSensitivityScore = (original - perturbed) * (1 - text_prior)`

Samples with high text prior are down-weighted to avoid "guess-from-text" probes.

## evalscope integration

Registered pruned aliases:

- `live_code_bench_pruned`
- `aa_lcr_pruned`
- `mmmu_encoder_probe_pruned`

Dataset args: `pruning_strategy`, `prune_ratio`, `seed`, `probe_mode`.
