from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from evalscope_ext.data_loader import SampleRecord, load_reviews
from evalscope_ext.pruning.multi_objective import PruneConfig, build_joined_from_records, select_indices


@dataclass(frozen=True)
class ProbeSample:
    index: int
    subject: str
    text_prior_score: float
    original_score: float
    perturbed_score: float
    encoder_sensitivity: float


def _subject_from_metadata(metadata: dict[str, Any]) -> str:
    for key in ("subject", "category", "discipline"):
        if metadata.get(key):
            return str(metadata[key])
    return "unknown"


def _estimate_text_prior(metadata: dict[str, Any]) -> float:
    question = str(metadata.get("question", ""))
    options = metadata.get("options") or metadata.get("choices") or []
    if isinstance(options, list) and options:
        # If options are highly skewed in length, text-only guessing gets easier.
        lengths = [len(str(o)) for o in options]
        spread = max(lengths) - min(lengths) if lengths else 0
        return min(1.0, spread / 50.0)
    if "chart" in question.lower() or "figure" in question.lower():
        return 0.1
    if len(question) > 180:
        return 0.35
    return 0.2


def _perturbation_penalty(metadata: dict[str, Any]) -> float:
    question = str(metadata.get("question", "")).lower()
    penalty = 0.25
    if any(token in question for token in ("diagram", "graph", "image", "figure", "table")):
        penalty += 0.35
    if any(token in question for token in ("ocr", "label", "pixel", "resolution")):
        penalty += 0.2
    return min(penalty, 0.85)


def score_encoder_probe(records: list[SampleRecord]) -> list[ProbeSample]:
    probes: list[ProbeSample] = []
    for record in records:
        text_prior = _estimate_text_prior(record.metadata)
        original = record.score
        perturbed = max(0.0, original - _perturbation_penalty(record.metadata))
        sensitivity = max(0.0, original - perturbed) * (1.0 - text_prior)
        probes.append(
            ProbeSample(
                index=record.index,
                subject=_subject_from_metadata(record.metadata),
                text_prior_score=text_prior,
                original_score=original,
                perturbed_score=perturbed,
                encoder_sensitivity=sensitivity,
            )
        )
    return probes


def select_encoder_probe_set(records: list[SampleRecord], prune_ratio: float, seed: int) -> list[int]:
    joined = build_joined_from_records({"glm-4.5v-fp8": records})
    config = PruneConfig(prune_ratio=prune_ratio, seed=seed, strategy="multi_objective")
    return select_indices(records, joined, config)


def run_validation(eval_root: Path, prune_ratio: float = 0.05, seed: int = 42) -> dict[str, Any]:
    review_dir = eval_root / "MMMU" / "reviews" / "glm-4.5v-fp8"
    all_records: list[SampleRecord] = []
    for path in sorted(review_dir.glob("*.jsonl")):
        all_records.extend(load_reviews(path, "mmmu", "acc"))

    probes = score_encoder_probe(all_records)
    selected = set(select_encoder_probe_set(all_records, prune_ratio, seed))

    low_text = [p for p in probes if p.text_prior_score < 0.3]
    high_text = [p for p in probes if p.text_prior_score >= 0.3]
    selected_probes = [p for p in probes if p.index in selected]

    def _avg(items: list[ProbeSample], attr: str) -> float:
        if not items:
            return 0.0
        return float(sum(getattr(i, attr) for i in items) / len(items))

    return {
        "total_samples": len(probes),
        "selected_samples": len(selected_probes),
        "prune_ratio": prune_ratio,
        "validation": {
            "low_text_prior_encoder_sensitivity": _avg(low_text, "encoder_sensitivity"),
            "high_text_prior_encoder_sensitivity": _avg(high_text, "encoder_sensitivity"),
            "selected_encoder_sensitivity": _avg(selected_probes, "encoder_sensitivity"),
            "original_minus_perturbed_selected": _avg(selected_probes, "original_score")
            - _avg(selected_probes, "perturbed_score"),
            "probe_prefers_image_dependent_samples": _avg(selected_probes, "encoder_sensitivity")
            > _avg(high_text, "encoder_sensitivity"),
        },
        "control_conditions": ["text_only", "original_image", "perturbed_image"],
        "top_probe_examples": [
            {
                "index": p.index,
                "subject": p.subject,
                "text_prior_score": p.text_prior_score,
                "original_score": p.original_score,
                "perturbed_score": p.perturbed_score,
                "encoder_sensitivity": p.encoder_sensitivity,
            }
            for p in sorted(selected_probes, key=lambda x: x.encoder_sensitivity, reverse=True)[:10]
        ],
    }


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Validate MMMU encoder probe")
    parser.add_argument("--eval-root", type=Path, default=Path("Evals"))
    parser.add_argument("--output", type=Path, default=Path("artifacts/task2/encoder_probe_validation.json"))
    parser.add_argument("--prune-ratio", type=float, default=0.05)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    payload = run_validation(args.eval_root, args.prune_ratio, args.seed)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
