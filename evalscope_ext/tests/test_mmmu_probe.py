from __future__ import annotations

from pathlib import Path

import pytest

from evalscope_ext.probe.image_perturbations import pil_available
from evalscope_ext.probe.mmmu_encoder_probe import run_validation, score_encoder_probe
from evalscope_ext.probe.mmmu_samples import iter_mmmu_samples, load_mmmu_sample_records

ROOT = Path(__file__).resolve().parents[2]
EVAL_ROOT = ROOT / "Evals"


@pytest.fixture(scope="module")
def first_mmmu_sample():
    return next(iter_mmmu_samples(EVAL_ROOT))


def test_mmmu_sample_has_image_and_options(first_mmmu_sample):
    assert first_mmmu_sample.options
    assert first_mmmu_sample.image_data_url is not None
    assert first_mmmu_sample.image_data_url.startswith("data:image")


def test_mmmu_records_load():
    records = load_mmmu_sample_records(EVAL_ROOT)
    assert len(records) >= 600
    assert records[0].metadata.get("question")


@pytest.mark.skipif(not pil_available(), reason="Pillow required")
def test_offline_encoder_probe_prefers_image_dependent():
    records = load_mmmu_sample_records(EVAL_ROOT)
    probes = score_encoder_probe(records)
    with_image = [p for p in probes if p.has_image and p.visual_degradation > 0]
    assert len(with_image) > 100
    payload = run_validation(EVAL_ROOT, prune_ratio=0.05, seed=42)
    assert payload["samples_with_images"] > 0
    assert payload["validation"]["probe_prefers_image_dependent_samples"]
