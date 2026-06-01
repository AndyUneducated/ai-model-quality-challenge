# Requirement Traceability Matrix

This document maps official hard requirements and forbidden baselines to implementation, tests, and evidence artifacts.

## Task 1 — Performance UI

| ID | Requirement | Implementation | Test / Evidence |
|---|---|---|---|
| T1-H1 | Documented launch from clean clone | Root `README.md`, `task1-ui/README.md` | `cd task1-ui && npm ci && npm run dev` |
| T1-H2 | Public live deployed URL | Vercel deployment (URL in root README) | Live URL + screenshot in `artifacts/task1/` |
| T1-H3 | Upload one or many `.xlsx` sweeps without rebuild | `task1-ui/src/lib/parseSweep.ts`, `UploadPanel.tsx` | Vitest + Playwright e2e |
| T1-H4 | Side-by-side comparison across uploaded models | `ComparisonView.tsx`, default compare mode | E2E multi-upload test |
| T1-H5 | Works for unseen `Model L` with zero code edits | Dynamic filename + column mapping in `parseSweep.ts` | Unit test `parseSweep.test.ts` |
| T1-F1 | No static HTML dump / single table only | Dual-audience views + decision layer | UI screenshots |
| T1-F2 | No hard-coded model list A–K | Regex-based model/profile extraction | Unit tests with `Model L` |
| T1-F3 | No fake upload via rebuild/config bake | Client-side parsing only | Architecture in `docs/decision_log.md` |

## Task 2 — Benchmark Compression

| ID | Requirement | Implementation | Test / Evidence |
|---|---|---|---|
| T2-H1 | Pruner lives inside evalscope extension | `evalscope_ext/benchmarks/*`, `setup.py` entry points | Integration test + README SHA |
| T2-H2 | CLI run contract compatible | `evalscope_ext/tools/compare_runs.py`, benchmark adapters | `reproduce.sh` |
| T2-H3 | Pin evalscope commit SHA | Root README + `evalscope_ext/EVALSCOPE_BASE_SHA` | File in repo |
| T2-H4 | Part A: LCB + AA-LCR compression | `evalscope_ext/pruning/multi_objective.py` | `artifacts/task2/compare_summary.json` |
| T2-H5 | Part B: MMMU encoder probe design + code | `evalscope_ext/probe/mmmu_encoder_probe.py` | `artifacts/task2/encoder_probe_validation.json` |
| T2-F1 | No uniform random sampling as final strategy | Ablation table vs random baseline | `artifacts/task2/ablation.json` |
| T2-F2 | No top-k easiest/hardest only | Multi-objective selector | Methodology doc + ablation |
| T2-F3 | No hand-picked samples | Deterministic algorithm from features | Seed reproducibility tests |
| T2-F4 | No overfit to 3 shipped models only | Leave-one-model-out validation | `compare_summary.json` LOMO section |

## Submission Artifacts

| ID | Requirement | Location |
|---|---|---|
| S1 | Private repo runnable | Root README |
| S2 | Live Task 1 URL | Root README header |
| S3 | Handout A (technical) | `docs/handout_a.md` |
| S4 | Handout B (mixed audience) | `docs/handout_b.md` |
| S5 | Video scripts | `docs/video_script_task1.md`, `docs/video_script_task2.md` |
| S6 | Verifiable claims | `CLAIMS.md`, `artifacts/scorecard.json` |
