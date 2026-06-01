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

- Full 12K MMMU probing in this repo uses shipped reference behavior plus encoder-sensitivity heuristics; live OpenAI multimodal calls were not executed in offline mode.
- Text-only control scores are estimated from question/options structure when explicit text-only runs are unavailable.
- Probe selection should be recalibrated when a live VLM endpoint is available.

## Minimum sample size guidance

- Do not deploy pruned sets below ~5% for customer go/no-go decisions unless revalidated on the target model.
- For AA-LCR, prefer >=10 samples per difficulty stratum because judge noise is non-trivial.
