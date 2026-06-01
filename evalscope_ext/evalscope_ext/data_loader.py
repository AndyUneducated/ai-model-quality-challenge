from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


@dataclass(frozen=True)
class SampleRecord:
    index: int
    model: str
    score: float
    metadata: dict[str, Any]
    benchmark: str


def _score_from_review(row: dict[str, Any], metric: str) -> float:
    sample_score = row.get("sample_score", {})
    score = sample_score.get("score", {})
    value = score.get("value", {})
    if metric in value:
        raw = value[metric]
        if isinstance(raw, dict):
            return float(raw.get(metric, raw.get("pass", raw.get("acc", 0.0))))
        return float(raw)
    if metric == "pass" and "acc" in value:
        return float(value["acc"])
    return 0.0


def load_reviews(path: Path, benchmark: str, metric: str) -> list[SampleRecord]:
    records: list[SampleRecord] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            sample_score = row.get("sample_score", {})
            metadata = sample_score.get("sample_metadata", {})
            model = row.get("model")
            if not model:
                model = path.stem.split("__")[-1]
            records.append(
                SampleRecord(
                    index=int(row["index"]),
                    model=str(model),
                    score=_score_from_review(row, metric),
                    metadata=metadata if isinstance(metadata, dict) else {},
                    benchmark=benchmark,
                )
            )
    return records


def load_benchmark_bundle(eval_root: Path, benchmark: str) -> dict[str, list[SampleRecord]]:
    metric_map = {
        "live_code_bench_v5": "pass",
        "aa_lcr": "acc",
        "mmmu": "acc",
    }
    metric = metric_map[benchmark]
    predictions_dir = eval_root / "Part 1" / "predictions"
    reviews_dir = eval_root / "Part 1" / "reviews"
    if benchmark == "mmmu":
        predictions_dir = eval_root / "MMMU" / "predictions" / "glm-4.5v-fp8"
        reviews_dir = eval_root / "MMMU" / "reviews" / "glm-4.5v-fp8"

    model_files: dict[str, Path] = {}
    for review_path in sorted(reviews_dir.glob("*.jsonl")):
        if benchmark == "live_code_bench_v5" and not review_path.name.startswith("live_code_bench_v5"):
            continue
        if benchmark == "aa_lcr" and not review_path.name.startswith("aa_lcr"):
            continue
        model = review_path.stem.split("__", 1)[-1]
        model_files[model] = review_path

    bundle: dict[str, list[SampleRecord]] = {}
    for model, review_path in model_files.items():
        bundle[model] = load_reviews(review_path, benchmark, metric)
    return bundle


def aggregate_model_scores(records_by_model: dict[str, list[SampleRecord]]) -> dict[str, float]:
    return {
        model: float(sum(r.score for r in records) / max(len(records), 1))
        for model, records in records_by_model.items()
    }


def join_by_index(records_by_model: dict[str, list[SampleRecord]]) -> dict[int, dict[str, float]]:
    joined: dict[int, dict[str, float]] = {}
    for model, records in records_by_model.items():
        for record in records:
            joined.setdefault(record.index, {})[model] = record.score
    return joined
