# Limitations

## Task 1

- The UI reads the `Summary` sheet contract only; exotic sweep formats with renamed sheets may require alias updates in `columnMap.ts`.
- Cost and pricing are not present in the source `.xlsx`; customer view uses throughput/TTFT as capacity proxies.
- Model-size inference is relative to the uploaded comparison set, not absolute parameter counts.

## Task 2 Part A

- AA-LCR scores come from an LLM judge; variance partly reflects judge noise, not only sample difficulty.
- With only three reference models, ranking stability is strong but not a guarantee for every future model family.
- Pruning quality depends on metadata richness; sparse metadata reduces coverage stratification power.

## Task 2 Part B

- Offline validation uses real images from shipped MMMU reviews plus Pillow perturbations (downscale/blur/jpeg) to estimate encoder stress; live text-only / original / perturbed scoring requires `--mode live` and an API key.
- Full 12K MMMU on HuggingFace (`MMMU/MMMU`) is supported by the same probe code path; this repo validates on the 660 shipped reference rows.
- Probe selection should be recalibrated on the target customer VLM when a production endpoint is available.

## Minimum sample size guidance

- Do not deploy pruned sets below ~5% for customer go/no-go decisions unless revalidated on the target model.
- For AA-LCR, prefer >=10 samples per difficulty stratum because judge noise is non-trivial.
