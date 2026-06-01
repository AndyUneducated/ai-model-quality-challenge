from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from evalscope_ext.pruning.multi_objective import PruneConfig
from evalscope_ext.tools.metrics import compare_full_vs_pruned, compare_result_to_dict


def _load_result_dir(path: Path) -> dict[str, Any]:
    summary = path / "summary.json"
    if summary.exists():
        return json.loads(summary.read_text(encoding="utf-8"))
    raise FileNotFoundError(f"Missing summary.json in {path}")


def _write_summary(path: Path, payload: dict[str, Any]) -> None:
    path.mkdir(parents=True, exist_ok=True)
    (path / "summary.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare full vs pruned evalscope runs")
    parser.add_argument("--full", type=Path, help="Full benchmark result directory")
    parser.add_argument("--pruned", type=Path, help="Pruned benchmark result directory")
    parser.add_argument("--eval-root", type=Path, default=Path("Evals"))
    parser.add_argument("--benchmark", choices=["live_code_bench_v5", "aa_lcr"], default="live_code_bench_v5")
    parser.add_argument("--prune-ratio", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--strategy", default="multi_objective")
    parser.add_argument("--output", type=Path, default=Path("artifacts/task2/compare_summary.json"))
    args = parser.parse_args()

    config = PruneConfig(prune_ratio=args.prune_ratio, seed=args.seed, strategy=args.strategy)
    result = compare_full_vs_pruned(args.eval_root, args.benchmark, config)
    payload = compare_result_to_dict(result)

    if args.full and args.full.exists() and args.pruned and args.pruned.exists():
        payload["provided_runs"] = {
            "full": _load_result_dir(args.full),
            "pruned": _load_result_dir(args.pruned),
        }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))
    if not result.pass_thresholds:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
