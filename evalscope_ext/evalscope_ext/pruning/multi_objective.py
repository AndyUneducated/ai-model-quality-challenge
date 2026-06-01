from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass
from typing import Any, Callable, Iterable, Sequence

import numpy as np

from evalscope_ext.data_loader import SampleRecord, join_by_index


@dataclass(frozen=True)
class PruneConfig:
    prune_ratio: float = 0.1
    seed: int = 42
    strategy: str = "multi_objective"
    min_per_stratum: int = 1


FORBIDDEN_STRATEGIES = {"random", "top_k_hardest", "top_k_easiest", "hand_picked"}


def _metadata_bucket(metadata: dict[str, Any]) -> str:
    for key in ("category", "subject", "difficulty", "language", "topic", "input_tokens"):
        if key in metadata and metadata[key] is not None:
            return f"{key}:{metadata[key]}"
    question = metadata.get("question")
    if isinstance(question, str) and question:
        return f"q:{hash(question) % 997}"
    return "default"


def _model_means(joined: dict[int, dict[str, float]], indices: list[int]) -> dict[str, float]:
    models = sorted({m for idx in indices for m in joined.get(idx, {})})
    means: dict[str, float] = {}
    for model in models:
        scores = [joined[idx][model] for idx in indices if model in joined.get(idx, {})]
        means[model] = float(np.mean(scores)) if scores else 0.0
    return means


def _ranking_penalty(full_means: dict[str, float], trial_means: dict[str, float]) -> float:
    models = sorted(full_means)
    full_order = sorted(models, key=lambda m: full_means[m], reverse=True)
    trial_order = sorted(models, key=lambda m: trial_means.get(m, 0.0), reverse=True)
    full_rank = {m: i for i, m in enumerate(full_order)}
    trial_rank = {m: i for i, m in enumerate(trial_order)}
    return float(sum(abs(full_rank[m] - trial_rank[m]) for m in models))


def _aggregate_preserving_greedy(
    indices: list[int],
    joined: dict[int, dict[str, float]],
    unique_by_index: dict[int, SampleRecord],
    budget: int,
    rng: np.random.Generator,
) -> list[int]:
    if budget >= len(indices):
        return indices

    full_means = _model_means(joined, indices)
    feature_rows = {
        idx: _sample_features(idx, joined.get(idx, {}), unique_by_index[idx].metadata)
        for idx in indices
    }

    # Seed with high-disagreement samples across metadata buckets.
    strata: dict[str, list[int]] = {}
    for idx in indices:
        strata.setdefault(_metadata_bucket(unique_by_index[idx].metadata), []).append(idx)

    selected: list[int] = []
    for bucket_indices in strata.values():
        best = max(
            bucket_indices,
            key=lambda idx: float(np.var(list(joined.get(idx, {}).values())) if joined.get(idx) else 0.0),
        )
        if best not in selected:
            selected.append(best)
    selected = selected[:budget]

    remaining = [idx for idx in indices if idx not in selected]
    rng.shuffle(remaining)

    while len(selected) < budget and remaining:
        best_idx = None
        best_score = float("-inf")
        for idx in remaining:
            trial = selected + [idx]
            trial_means = _model_means(joined, trial)
            mean_err = sum((trial_means[m] - full_means[m]) ** 2 for m in full_means)
            rank_pen = _ranking_penalty(full_means, trial_means)
            if selected:
                coverage = min(
                    float(np.linalg.norm(feature_rows[idx] - feature_rows[s])) for s in selected
                )
            else:
                coverage = 0.0
            score = -mean_err - 0.75 * rank_pen + 0.15 * coverage
            if score > best_score:
                best_score = score
                best_idx = idx
        if best_idx is None:
            break
        selected.append(best_idx)
        remaining.remove(best_idx)

    return selected[:budget]


def _sample_features(
    index: int,
    model_scores: dict[str, float],
    metadata: dict[str, Any],
) -> np.ndarray:
    scores = np.array(list(model_scores.values()), dtype=float)
    mean_score = float(scores.mean()) if len(scores) else 0.0
    variance = float(scores.var()) if len(scores) else 0.0
    pass_rate = mean_score
    disagreement = variance
    difficulty = 1.0 - pass_rate
    bucket_hash = int(hashlib.md5(_metadata_bucket(metadata).encode()).hexdigest(), 16) % 1000 / 1000.0
    return np.array([difficulty, disagreement, bucket_hash, pass_rate], dtype=float)


def _facility_location_greedy(
    feature_matrix: np.ndarray,
    budget: int,
    rng: np.random.Generator,
) -> list[int]:
    n = feature_matrix.shape[0]
    if budget >= n:
        return list(range(n))

    selected: list[int] = []
    remaining = set(range(n))
    first = int(rng.choice(list(remaining)))
    selected.append(first)
    remaining.remove(first)

    while len(selected) < budget and remaining:
        best_idx = None
        best_gain = -1.0
        for candidate in remaining:
            dists = [
                np.linalg.norm(feature_matrix[candidate] - feature_matrix[s])
                for s in selected
            ]
            min_dist = min(dists) if dists else 0.0
            if min_dist > best_gain:
                best_gain = min_dist
                best_idx = candidate
        if best_idx is None:
            break
        selected.append(best_idx)
        remaining.remove(best_idx)
    return selected


def _random_indices(n: int, budget: int, seed: int) -> list[int]:
    rng = np.random.default_rng(seed)
    return sorted(rng.choice(n, size=budget, replace=False).tolist())


def _top_k_by_difficulty(
    records: Sequence[SampleRecord],
    joined: dict[int, dict[str, float]],
    budget: int,
    hardest: bool,
) -> list[int]:
    scored: list[tuple[int, float]] = []
    for record in records:
        model_scores = joined.get(record.index, {record.model: record.score})
        mean_score = float(np.mean(list(model_scores.values()))) if model_scores else record.score
        difficulty = 1.0 - mean_score
        scored.append((record.index, difficulty))
    scored.sort(key=lambda x: x[1], reverse=hardest)
    return [idx for idx, _ in scored[:budget]]


def select_indices(
    records: Sequence[SampleRecord],
    joined: dict[int, dict[str, float]],
    config: PruneConfig,
) -> list[int]:
    unique_by_index: dict[int, SampleRecord] = {r.index: r for r in records}
    indices = sorted(unique_by_index)
    n = len(indices)
    budget = max(1, int(math.ceil(n * config.prune_ratio)))

    if config.strategy in FORBIDDEN_STRATEGIES:
        raise ValueError(f"Strategy '{config.strategy}' is forbidden by rubric.")

    if config.strategy == "random_baseline":
        chosen = _random_indices(n, budget, config.seed)
        return [indices[i] for i in chosen]

    if config.strategy == "top_k_hardest_baseline":
        return _top_k_by_difficulty(list(unique_by_index.values()), joined, budget, hardest=True)

    rng = np.random.default_rng(config.seed)
    feature_rows: list[np.ndarray] = []
    for idx in indices:
        record = unique_by_index[idx]
        model_scores = joined.get(idx, {record.model: record.score})
        feature_rows.append(_sample_features(idx, model_scores, record.metadata))
    feature_matrix = np.vstack(feature_rows)

    # Phase 1: stratified facility-location for coverage/disagreement/difficulty.
    strata: dict[str, list[int]] = {}
    for pos, idx in enumerate(indices):
        bucket = _metadata_bucket(unique_by_index[idx].metadata)
        strata.setdefault(bucket, []).append(pos)

    selected_positions: list[int] = []
    for bucket, positions in strata.items():
        local_budget = max(config.min_per_stratum, int(round(budget * len(positions) / n)))
        local_budget = min(local_budget, len(positions))
        local_features = feature_matrix[positions]
        local_selected = _facility_location_greedy(local_features, local_budget, rng)
        selected_positions.extend(positions[i] for i in local_selected)

    if len(selected_positions) > budget:
        selected_positions = selected_positions[:budget]
    elif len(selected_positions) < budget:
        remaining = [p for p in range(n) if p not in selected_positions]
        extra = _facility_location_greedy(feature_matrix[remaining], budget - len(selected_positions), rng)
        selected_positions.extend(remaining[i] for i in extra)

    return [indices[p] for p in sorted(set(selected_positions))]


def build_joined_from_records(records_by_model: dict[str, list[SampleRecord]]) -> dict[int, dict[str, float]]:
    return join_by_index(records_by_model)
