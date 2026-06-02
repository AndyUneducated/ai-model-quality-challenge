from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from evalscope_ext.data_loader import SampleRecord
from evalscope_ext.pruning.multi_objective import PruneConfig, build_joined_from_records, select_indices
from evalscope_ext.probe.image_perturbations import (
    EncoderStressBattery,
    image_to_data_url,
    load_image_from_bytes,
    pil_available,
)
from evalscope_ext.probe.mmmu_samples import iter_mmmu_samples, load_mmmu_sample_records, to_multimodal_question


@dataclass(frozen=True)
class ProbeSample:
    index: int
    subject: str
    text_prior_score: float
    original_score: float
    perturbed_score: float
    encoder_sensitivity: float
    has_image: bool
    visual_degradation: float


def _text_prior_from_question(question: str, options: list[str]) -> float:
    q = question.lower()
    image_refs = len(re.findall(r"<image\s*\d+>|!\[image\]|figure|diagram|chart|graph|table", q))
    if image_refs >= 2:
        return 0.05
    if image_refs == 1:
        return 0.12
    if options:
        lengths = [len(o) for o in options]
        spread = (max(lengths) - min(lengths)) if lengths else 0
        return min(0.45, 0.15 + spread / 80.0)
    return 0.25


def _visual_degradation_from_image(image_data_url: str, battery: EncoderStressBattery) -> float:
    """How much visual information is destroyed by encoder-stress perturbations (0–1)."""
    if not pil_available():
        return 0.0
    import base64

    header, b64 = image_data_url.split(",", 1)
    raw = base64.b64decode(b64)
    image = load_image_from_bytes(raw)
    gray = np.array(image.convert("L"), dtype=np.float64)
    base_energy = float(np.var(gray) + 1e-6)
    max_drop = 0.0
    for name in battery.names:
        perturbed = battery.apply(image, name)
        pgray = np.array(perturbed.convert("L"), dtype=np.float64)
        drop = 1.0 - float(np.var(pgray) / base_energy)
        max_drop = max(max_drop, drop)
    return float(min(1.0, max(0.0, max_drop)))


def score_encoder_probe(records: list[SampleRecord]) -> list[ProbeSample]:
    battery = EncoderStressBattery()
    probes: list[ProbeSample] = []
    for record in records:
        md = record.metadata
        question = str(md.get("question", ""))
        options = md.get("options") or []
        if not isinstance(options, list):
            options = []
        image_url = md.get("image_data_url")
        text_prior = _text_prior_from_question(question, [str(o) for o in options])
        original = record.score
        visual_deg = 0.0
        if isinstance(image_url, str) and image_url.startswith("data:image"):
            visual_deg = _visual_degradation_from_image(image_url, battery)
        # Expected accuracy drop scales with measured visual destruction and image dependence.
        expected_drop = visual_deg * (1.0 - text_prior)
        perturbed = max(0.0, original - expected_drop)
        sensitivity = max(0.0, original - perturbed) * (1.0 - text_prior)
        if visual_deg > 0 and sensitivity == 0:
            sensitivity = visual_deg * (1.0 - text_prior)
        probes.append(
            ProbeSample(
                index=record.index,
                subject=str(md.get("subject", "unknown")),
                text_prior_score=text_prior,
                original_score=original,
                perturbed_score=perturbed,
                encoder_sensitivity=sensitivity,
                has_image=bool(image_url),
                visual_degradation=visual_deg,
            )
        )
    return probes


def select_encoder_probe_set(records: list[SampleRecord], prune_ratio: float, seed: int) -> list[int]:
    joined = build_joined_from_records({"glm-4.5v-fp8": records})
    config = PruneConfig(prune_ratio=prune_ratio, seed=seed, strategy="multi_objective")
    return select_indices(records, joined, config)


def run_validation(eval_root: Path, prune_ratio: float = 0.05, seed: int = 42) -> dict[str, Any]:
    all_records = load_mmmu_sample_records(eval_root)
    probes = score_encoder_probe(all_records)
    selected = set(select_encoder_probe_set(all_records, prune_ratio, seed))

    low_text = [p for p in probes if p.text_prior_score < 0.3]
    high_text = [p for p in probes if p.text_prior_score >= 0.3]
    with_image = [p for p in probes if p.has_image]
    selected_probes = [p for p in probes if p.index in selected]

    def _avg(items: list[ProbeSample], attr: str) -> float:
        if not items:
            return 0.0
        return float(sum(getattr(i, attr) for i in items) / len(items))

    return {
        "mode": "offline_image_perturbation",
        "pil_available": pil_available(),
        "total_samples": len(probes),
        "samples_with_images": len(with_image),
        "selected_samples": len(selected_probes),
        "prune_ratio": prune_ratio,
        "validation": {
            "low_text_prior_encoder_sensitivity": _avg(low_text, "encoder_sensitivity"),
            "high_text_prior_encoder_sensitivity": _avg(high_text, "encoder_sensitivity"),
            "selected_encoder_sensitivity": _avg(selected_probes, "encoder_sensitivity"),
            "selected_visual_degradation": _avg(selected_probes, "visual_degradation"),
            "original_minus_perturbed_selected": _avg(selected_probes, "original_score")
            - _avg(selected_probes, "perturbed_score"),
            "probe_prefers_image_dependent_samples": _avg(selected_probes, "encoder_sensitivity")
            > _avg(high_text, "encoder_sensitivity"),
        },
        "control_conditions": ["text_only", "original_image", "perturbed_image"],
        "live_probe_command": (
            "python3 -m evalscope_ext.probe.mmmu_encoder_probe --mode live "
            "--model <vlm> --max-samples 30"
        ),
        "top_probe_examples": [
            {
                "index": p.index,
                "subject": p.subject,
                "text_prior_score": p.text_prior_score,
                "visual_degradation": p.visual_degradation,
                "original_score": p.original_score,
                "perturbed_score": p.perturbed_score,
                "encoder_sensitivity": p.encoder_sensitivity,
            }
            for p in sorted(selected_probes, key=lambda x: x.encoder_sensitivity, reverse=True)[:10]
        ],
    }


def run_live_probe(
    eval_root: Path,
    model: str,
    max_samples: int = 30,
    seed: int = 42,
    base_url: str | None = None,
    perturbation: str = "blur",
) -> dict[str, Any]:
    """Call a VLM through the OpenAI-compatible API with text-only / original / perturbed controls."""
    from evalscope_ext.probe.vlm_client import VLMClient, VLMConfig, available

    if not available():
        raise RuntimeError("Install probe extras: pip install -e '.[probe]'")
    if not pil_available():
        raise RuntimeError("Install probe extras (Pillow): pip install -e '.[probe]'")

    import random

    rng = random.Random(seed)
    samples = list(iter_mmmu_samples(eval_root))
    samples = [s for s in samples if s.image_data_url and s.options]
    rng.shuffle(samples)
    samples = samples[:max_samples]

    client = VLMClient(VLMConfig(model=model, base_url=base_url))
    battery = EncoderStressBattery(names=(perturbation,))
    results: list[dict[str, Any]] = []

    for sample in samples:
        q = to_multimodal_question(sample)
        text_only = client.score(q, client.answer(q, include_image=False))
        original = client.score(q, client.answer(q, include_image=True))

        import base64

        _, b64 = sample.image_data_url.split(",", 1)  # type: ignore[union-attr]
        image = load_image_from_bytes(base64.b64decode(b64))
        perturbed_url = image_to_data_url(battery.apply(image, perturbation))
        q_perturbed = type(q)(
            index=q.index,
            question=q.question,
            options=q.options,
            answer_letter=q.answer_letter,
            image_data_url=perturbed_url,
            subject=q.subject,
            metadata=q.metadata,
        )
        perturbed = client.score(q_perturbed, client.answer(q_perturbed, include_image=True))
        sensitivity = max(0.0, original - perturbed) * (1.0 - _text_prior_from_question(q.question, q.options))
        results.append(
            {
                "index": sample.index,
                "subject": sample.subject,
                "text_only_acc": text_only,
                "original_image_acc": original,
                "perturbed_image_acc": perturbed,
                "encoder_sensitivity": sensitivity,
                "perturbation": perturbation,
            }
        )

    def _mean(key: str) -> float:
        return float(np.mean([r[key] for r in results])) if results else 0.0

    return {
        "mode": "live_openai_compatible",
        "model": model,
        "max_samples": len(results),
        "perturbation": perturbation,
        "summary": {
            "mean_text_only_acc": _mean("text_only_acc"),
            "mean_original_image_acc": _mean("original_image_acc"),
            "mean_perturbed_image_acc": _mean("perturbed_image_acc"),
            "mean_encoder_sensitivity": _mean("encoder_sensitivity"),
        },
        "samples": results,
    }


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="MMMU encoder probe (offline + live)")
    parser.add_argument("--eval-root", type=Path, default=Path("Evals"))
    parser.add_argument("--output", type=Path, default=Path("artifacts/task2/encoder_probe_validation.json"))
    parser.add_argument("--mode", choices=("offline", "live"), default="offline")
    parser.add_argument("--prune-ratio", type=float, default=0.05)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--model", type=str, default="gpt-4o-mini")
    parser.add_argument("--base-url", type=str, default=None)
    parser.add_argument("--max-samples", type=int, default=30)
    parser.add_argument("--perturbation", type=str, default="blur", choices=("downscale", "blur", "jpeg", "grayscale"))
    args = parser.parse_args()

    if args.mode == "live":
        payload = run_live_probe(
            args.eval_root,
            model=args.model,
            max_samples=args.max_samples,
            seed=args.seed,
            base_url=args.base_url,
            perturbation=args.perturbation,
        )
    else:
        payload = run_validation(args.eval_root, args.prune_ratio, args.seed)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
