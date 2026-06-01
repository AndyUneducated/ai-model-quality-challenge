from __future__ import annotations

import json
from pathlib import Path

import pytest

from evalscope_ext.data_loader import load_benchmark_bundle
from evalscope_ext.pruning.multi_objective import PruneConfig, build_joined_from_records, select_indices
from evalscope_ext.tools.metrics import compare_full_vs_pruned


ROOT = Path(__file__).resolve().parents[2]
EVAL_ROOT = ROOT / "Evals"


@pytest.fixture(scope="module")
def lcb_bundle():
    return load_benchmark_bundle(EVAL_ROOT, "live_code_bench_v5")


def test_lcb_bundle_has_three_models(lcb_bundle):
    assert len(lcb_bundle) == 3


def test_pruning_reproducible(lcb_bundle):
    joined = build_joined_from_records(lcb_bundle)
    records = [r for rs in lcb_bundle.values() for r in rs]
    cfg = PruneConfig(prune_ratio=0.1, seed=42)
    first = select_indices(records, joined, cfg)
    second = select_indices(records, joined, cfg)
    assert first == second


def test_prune_ratio_size(lcb_bundle):
    joined = build_joined_from_records(lcb_bundle)
    records = [r for rs in lcb_bundle.values() for r in rs]
    unique = len({r.index for r in records})
    selected = select_indices(records, joined, PruneConfig(prune_ratio=0.1, seed=42))
    assert len(selected) == pytest.approx(max(1, int(round(unique * 0.1))), abs=2)


def test_compare_meets_thresholds():
    result = compare_full_vs_pruned(EVAL_ROOT, "live_code_bench_v5", PruneConfig(prune_ratio=0.1, seed=42))
    assert result.kendall_tau >= 0.9
    assert result.decision_agreement == 1.0

    aa = compare_full_vs_pruned(EVAL_ROOT, "aa_lcr", PruneConfig(prune_ratio=0.1, seed=42))
    assert aa.kendall_tau >= 0.9
    assert aa.decision_agreement == 1.0


def test_compare_output_serializable():
    result = compare_full_vs_pruned(EVAL_ROOT, "aa_lcr", PruneConfig(prune_ratio=0.1, seed=42))
    payload = json.dumps(
        {
            "kendall_tau": result.kendall_tau,
            "decision_agreement": result.decision_agreement,
        }
    )
    assert "kendall_tau" in payload
