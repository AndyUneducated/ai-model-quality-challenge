# Verifiable Claims

Each claim below can be checked with a command and an expected artifact.

| Claim | Verify command | Expected evidence |
|---|---|---|
| Task1 parses unknown models (Model L naming) without code changes | `cd task1-ui && npm run test` | `parseSweep.test.ts` passes Model L filename test |
| Task1 pre-loads the 11 shipped models with no upload required | `cd task1-ui && npm run test:e2e` | `upload.spec.ts` "preloads the shipped perf models" passes |
| Task1 lets users add unseen models on top of the preloaded set | `cd task1-ui && npm run test:e2e` | `upload.spec.ts` "add an unseen model (Model L)" passes |
| Task2 prunes to 10% while preserving ranking signal | `./reproduce.sh` | `artifacts/task2/compare_summary.json` with `kendall_tau >= 0.9` |
| Task2 preserves go/no-go decisions on shipped models | `./reproduce.sh` | `decision_agreement == 1.0` in compare summary |
| Task2 beats forbidden random/hardest baselines | `python3 -m evalscope_ext.tools.ablation` | `artifacts/task2/ablation.json` |
| Part B probe uses real image perturbations (offline) + live OpenAI path | `python3 -m evalscope_ext.probe.mmmu_encoder_probe` | `encoder_probe_validation.json` with `mode=offline_image_perturbation`, 660 images |
| Part B live multimodal controls (text-only / original / perturbed) | `pip install -e evalscope_ext/.[probe]` then `--mode live` | Requires `OPENAI_API_KEY`; writes probe JSON |
| One-command reproduction for reviewers | `make verify` | Regenerates tests + `artifacts/scorecard.json` |

## Headline claim

> At 10% sample ratio, pruned benchmarks preserve model ranking and go/no-go decisions with ~90% evaluation cost reduction.

Verification:

```bash
./reproduce.sh
python3 - <<'PY'
import json
s=json.load(open('artifacts/task2/compare_summary.json'))
for k,v in s.items():
    assert v['kendall_tau'] >= 0.9, k
    assert v['decision_agreement'] == 1.0, k
print('PASS')
PY
```
