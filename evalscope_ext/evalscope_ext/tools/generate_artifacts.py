"""Generate reproducible Task2 evidence artifacts."""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt

from evalscope_ext.pruning.multi_objective import PruneConfig
from evalscope_ext.tools.metrics import compare_full_vs_pruned, compare_result_to_dict
from evalscope_ext.tools.ablation import run_ablation
from evalscope_ext.probe.mmmu_encoder_probe import run_validation


def _plot_compare(payload: dict, output: Path) -> None:
    full = payload["full_scores"]
    pruned = payload["pruned_scores"]
    models = sorted(full)
    x = range(len(models))
    width = 0.35
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.bar([i - width / 2 for i in x], [full[m] for m in models], width, label="full")
    ax.bar([i + width / 2 for i in x], [pruned[m] for m in models], width, label="pruned")
    ax.set_xticks(list(x))
    ax.set_xticklabels(models, rotation=20)
    ax.set_title(f"{payload['benchmark']} full vs pruned")
    ax.legend()
    fig.tight_layout()
    fig.savefig(output, dpi=150)
    plt.close(fig)


def main() -> None:
    root = Path(__file__).resolve().parents[3]
    eval_root = root / "Evals"
    out_dir = root / "artifacts" / "task2"
    out_dir.mkdir(parents=True, exist_ok=True)

    summaries = {}
    for benchmark in ("live_code_bench_v5", "aa_lcr"):
        result = compare_full_vs_pruned(
            eval_root,
            benchmark,
            PruneConfig(prune_ratio=0.1, seed=42, strategy="multi_objective"),
        )
        payload = compare_result_to_dict(result)
        summaries[benchmark] = payload
        _plot_compare(payload, out_dir / f"{benchmark}_full_vs_pruned.png")

    compare_path = out_dir / "compare_summary.json"
    compare_path.write_text(json.dumps(summaries, indent=2), encoding="utf-8")

    ablation = {
        "live_code_bench_v5": run_ablation(eval_root, "live_code_bench_v5", 0.1, 42),
        "aa_lcr": run_ablation(eval_root, "aa_lcr", 0.1, 42),
    }
    (out_dir / "ablation.json").write_text(json.dumps(ablation, indent=2), encoding="utf-8")

    probe = run_validation(eval_root, prune_ratio=0.05, seed=42)
    (out_dir / "encoder_probe_validation.json").write_text(json.dumps(probe, indent=2), encoding="utf-8")

    scorecard = {
        "task2_headline": {
            "claim": "10% samples preserve ranking and go/no-go decisions with ~90% cost reduction",
            "live_code_bench_v5": summaries["live_code_bench_v5"],
            "aa_lcr": summaries["aa_lcr"],
        },
        "thresholds_pass": all(v["pass_thresholds"] for v in summaries.values()),
    }
    (root / "artifacts" / "scorecard.json").write_text(json.dumps(scorecard, indent=2), encoding="utf-8")
    print(f"Wrote artifacts to {out_dir}")


if __name__ == "__main__":
    main()
