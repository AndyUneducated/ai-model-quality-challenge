"""Parse MMMU rows from shipped Evals JSONL (reviews + optional predictions)."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator

from evalscope_ext.data_loader import SampleRecord, load_reviews

_OPTION_LINE = re.compile(r"^([A-E])\)\s*(.+)$", re.MULTILINE)
_IMAGE_DATA_URL = re.compile(
    r"!\[image\]\((data:image/[^;]+;base64,[A-Za-z0-9+/=]+)\)",
    re.DOTALL,
)
_SUBJECT_FROM_PATH = re.compile(r"mmmu_([^.]+)\.jsonl$", re.I)


@dataclass(frozen=True)
class MMMUSample:
    index: int
    subject: str
    question: str
    options: list[str]
    answer_letter: str
    image_data_url: str | None
    shipped_score: float
    metadata: dict[str, Any]


def _subject_from_path(path: Path) -> str:
    m = _SUBJECT_FROM_PATH.search(path.name)
    return m.group(1).replace("_", " ") if m else "unknown"


def _parse_input_block(input_text: str) -> tuple[str, list[str], str | None]:
    """Extract question stem, MC options, and first embedded image from evalscope input."""
    image_url: str | None = None
    m_img = _IMAGE_DATA_URL.search(input_text)
    if m_img:
        image_url = m_img.group(1)
        body = input_text[: m_img.start()]
    else:
        body = input_text

    # Strip role prefix if present.
    if "**User**:" in body:
        body = body.split("**User**:", 1)[-1]

    options: list[str] = []
    for m in _OPTION_LINE.finditer(body):
        options.append(m.group(2).strip())

    a_match = re.search(r"^A\)\s", body, re.MULTILINE)
    if a_match:
        question = body[: a_match.start()].strip()
    else:
        question = body.strip()

    # Remove boilerplate instruction lines.
    for prefix in (
        "Answer the following multiple choice question.",
        "Think step by step before answering.",
    ):
        question = question.replace(prefix, "").strip()

    return question, options, image_url


def iter_mmmu_samples(eval_root: Path, model: str = "glm-4.5v-fp8") -> Iterator[MMMUSample]:
    review_dir = eval_root / "MMMU" / "reviews" / model
    for path in sorted(review_dir.glob("mmmu_*.jsonl")):
        subject = _subject_from_path(path)
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                row = json.loads(line)
                idx = int(row["index"])
                target = str(row.get("target", "A")).strip().upper()[:1]
                question, options, image_url = _parse_input_block(str(row.get("input", "")))
                sample_score = row.get("sample_score", {})
                score_block = sample_score.get("score", {}).get("value", {})
                shipped = float(score_block.get("acc", 0.0))
                md = sample_score.get("sample_metadata", {})
                if not isinstance(md, dict):
                    md = {}
                yield MMMUSample(
                    index=idx,
                    subject=subject,
                    question=question,
                    options=options,
                    answer_letter=target,
                    image_data_url=image_url,
                    shipped_score=shipped,
                    metadata={**md, "subject": subject},
                )


def load_mmmu_sample_records(eval_root: Path) -> list[SampleRecord]:
    records: list[SampleRecord] = []
    for sample in iter_mmmu_samples(eval_root):
        records.append(
            SampleRecord(
                index=sample.index,
                model="glm-4.5v-fp8",
                score=sample.shipped_score,
                metadata={
                    **sample.metadata,
                    "question": sample.question,
                    "options": sample.options,
                    "answer_letter": sample.answer_letter,
                    "image_data_url": sample.image_data_url,
                    "subject": sample.subject,
                },
                benchmark="mmmu",
            )
        )
    return records


def to_multimodal_question(sample: MMMUSample):
    from evalscope_ext.probe.vlm_client import MultiModalQuestion

    return MultiModalQuestion(
        index=sample.index,
        question=sample.question,
        options=sample.options,
        answer_letter=sample.answer_letter,
        image_data_url=sample.image_data_url,
        subject=sample.subject,
        metadata=sample.metadata,
    )
