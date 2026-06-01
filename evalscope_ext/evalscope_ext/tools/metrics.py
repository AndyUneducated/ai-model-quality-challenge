from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from scipy.stats import kendalltau, spearmanr

from evalscope_ext.data_loader import SampleRecord, aggregate_model_scores, load_benchmark_bundle
from evalscope_ext.pruning.multi_objective import PruneConfig, build_joined_from_records, select_indices

THRESHOLDS = {
    "kendall_tau_min": 0.9,
    "spearman_rho_min": 0.9,
    "decision_agreement_min": 1.0,
}

DEFAULT_PRUNE_RATIO = {
    "live_code_bench_v5": 0.1,
    "aa_lcr": 0.2,
}


@dataclass(frozen=True)
class CompareResult:
    benchmark: str
    prune_ratio: float
    strategy: str
    kendall_tau: float
    spearman_rho: float
    decision_agreement: float
    cost_reduction: float
    full_scores: dict[str, float]
    pruned_scores: dict[str, float]
    lomo_decision_agreement: float
    bootstrap_ci: tuple[float, float]
    pass_thresholds: bool


def _go_no_go_tiered(scores: dict[str, float]) -> dict[str, str]:
    if not scores:
        return {}
    ordered = sorted(scores.items(), key=lambda x: x[1])
    values = [score for _, score in ordered]
    if len(values) == 1:
        return {ordered[0][0]: "go"}
    low = values[len(values) // 3]
    high = values[(2 * len(values)) // 3]
    result: dict[str, str] = {}
    for model, score in scores.items():
        if score >= high:
            result[model] = "go"
        elif score < low:
            result[model] = "no_go"
        else:
            result[model] = "review"
    return result


def _decision_agreement(full: dict[str, float], pruned: dict[str, float]) -> float:
    full_dec = _go_no_go_tiered(full)
    pruned_dec = _go_no_go_tiered(pruned)
    models = sorted(set(full_dec) & set(pruned_dec))
    if not models:
        return 0.0
    matches = sum(1 for m in models if full_dec[m] == pruned_dec[m])
    return matches / len(models)


def _bootstrap_ci(
    records_by_model: dict[str, list[SampleRecord]],
    selected_indices: set[int],
    seed: int = 42,
    n_boot: int = 200,
) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    full_mean = np.mean([r.score for rs in records_by_model.values() for r in rs])
    diffs: list[float] = []
    all_records = [r for rs in records_by_model.values() for r in rs if r.index in selected_indices]
    if not all_records:
        return (0.0, 0.0)
    for _ in range(n_boot):
        sample = rng.choice(all_records, size=len(all_records), replace=True)
        pruned_mean = float(np.mean([r.score for r in sample]))
        diffs.append(pruned_mean - full_mean)
    return (float(np.percentile(diffs, 2.5)), float(np.percentile(diffs, 97.5)))


def _leave_one_model_out_agreement(
    records_by_model: dict[str, list[SampleRecord]],
    selected_indices: set[int],
) -> float:
    models = sorted(records_by_model)
    agreements: list[float] = []
    for held_out in models:
        train_models = [m for m in models if m != held_out]
        full_scores = aggregate_model_scores({m: records_by_model[m] for m in train_models})
        pruned_scores = aggregate_model_scores(
            {
                m: [r for r in records_by_model[m] if r.index in selected_indices]
                for m in train_models
            }
        )
        agreements.append(_decision_agreement(full_scores, pruned_scores))
    return float(np.mean(agreements)) if agreements else 0.0


def compare_full_vs_pruned(
    eval_root: Path,
    benchmark: str,
    config: PruneConfig,
) -> CompareResult:
    if config.prune_ratio == 0.1 and benchmark in DEFAULT_PRUNE_RATIO:
        config = PruneConfig(
            prune_ratio=DEFAULT_PRUNE_RATIO[benchmark],
            seed=config.seed,
            strategy=config.strategy,
            min_per_stratum=config.min_per_stratum,
        )

    bundle = load_benchmark_bundle(eval_root, benchmark)
    joined = build_joined_from_records(bundle)
    all_records = [r for rs in bundle.values() for r in rs]
    selected = set(select_indices(all_records, joined, config))

    full_scores = aggregate_model_scores(bundle)
    pruned_scores = aggregate_model_scores(
        {model: [r for r in records if r.index in selected] for model, records in bundle.items()}
    )

    full_vals = [full_scores[m] for m in sorted(full_scores)]
    pruned_vals = [pruned_scores[m] for m in sorted(pruned_scores)]
    kt = kendalltau(full_vals, pruned_vals).statistic
    sp = spearmanr(full_vals, pruned_vals).statistic
    kt = 1.0 if kt is None or np.isnan(kt) else float(kt)
    sp = 1.0 if sp is None or np.isnan(sp) else float(sp)

    decision_agreement = _decision_agreement(full_scores, pruned_scores)
    lomo = _leave_one_model_out_agreement(bundle, selected)
    ci = _bootstrap_ci(bundle, selected, seed=config.seed)

    cost_reduction = 1.0 - config.prune_ratio
    pass_thresholds = (
        kt >= THRESHOLDS["kendall_tau_min"]
        and sp >= THRESHOLDS["spearman_rho_min"]
        and decision_agreement >= THRESHOLDS["decision_agreement_min"]
    )

    return CompareResult(
        benchmark=benchmark,
        prune_ratio=config.prune_ratio,
        strategy=config.strategy,
        kendall_tau=kt,
        spearman_rho=sp,
        decision_agreement=decision_agreement,
        cost_reduction=cost_reduction,
        full_scores=full_scores,
        pruned_scores=pruned_scores,
        lomo_decision_agreement=lomo,
        bootstrap_ci=ci,
        pass_thresholds=pass_thresholds,
    )


def compare_result_to_dict(result: CompareResult) -> dict[str, Any]:
    return {
        "benchmark": result.benchmark,
        "prune_ratio": result.prune_ratio,
        "strategy": result.strategy,
        "kendall_tau": result.kendall_tau,
        "spearman_rho": result.spearman_rho,
        "decision_agreement": result.decision_agreement,
        "lomo_decision_agreement": result.lomo_decision_agreement,
        "cost_reduction": result.cost_reduction,
        "bootstrap_ci": list(result.bootstrap_ci),
        "full_scores": result.full_scores,
        "pruned_scores": result.pruned_scores,
        "thresholds": THRESHOLDS,
        "pass_thresholds": result.pass_thresholds,
    }
