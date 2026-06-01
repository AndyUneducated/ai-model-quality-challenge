# evalscope_ext

Benchmark pruning extension developed against evalscope commit:

`e9d42d8b6a8dcb937e042ba905e36eb05171ae0d`

## Install

```bash
pip install -e ./evalscope_ext
# optional live evalscope integration
pip install evalscope
```

## Offline validation (shipped Evals data)

```bash
python3 -m evalscope_ext.tools.generate_artifacts
python3 -m evalscope_ext.tools.compare_runs --benchmark live_code_bench_v5
python3 -m evalscope_ext.tools.ablation
python3 -m evalscope_ext.probe.mmmu_encoder_probe
pytest evalscope_ext/tests/
```

## Registered pruned datasets

- `live_code_bench_pruned`
- `aa_lcr_pruned`
- `mmmu_encoder_probe_pruned`

Dataset args:

```json
{"pruning_strategy": "multi_objective", "prune_ratio": 0.1, "seed": 42}
```
