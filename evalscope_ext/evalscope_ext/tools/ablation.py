from __future__ import annotations

import argparse
import json
from pathlib import Path

from evalscope_ext.pruning.multi_objective import PruneConfig
from evalscope_ext.tools.metrics import compare_full_vs_pruned, compare_result_to_dict


def run_ablation(eval_root: Path, benchmark: str, prune_ratio: float, seed: int) -> dict:
    strategies = [
        ("multi_objective", "multi_objective"),
        ("random_baseline", "random_baseline"),
        ("top_k_hardest_baseline", "top_k_hardest_baseline"),
    ]
    rows = []
    for label, strategy in strategies:
        result = compare_full_vs_pruned(
            eval_root,
            benchmark,
            PruneConfig(prune_ratio=prune_ratio, seed=seed, strategy=strategy),
        )
        row = compare_result_to_dict(result)
        row["label"] = label
        rows.append(row)
    return {"benchmark": benchmark, "prune_ratio": prune_ratio, "rows": rows}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run pruning ablation study")
    parser.add_argument("--eval-root", type=Path, default=Path("Evals"))
    parser.add_argument("--output", type=Path, default=Path("artifacts/task2/ablation.json"))
    parser.add_argument("--prune-ratio", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    payload = {
        "live_code_bench_v5": run_ablation(args.eval_root, "live_code_bench_v5", args.prune_ratio, args.seed),
        "aa_lcr": run_ablation(args.eval_root, "aa_lcr", args.prune_ratio, args.seed),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
