"""Thin wrapper around the standard OpenAI chat-completions interface for VLMs.

The challenge constraint is that we can only talk to the model through the standard
OpenAI interface, so the probe sends multiple-choice MMMU questions as multimodal
chat messages and parses the selected option letter back out. This works against any
OpenAI-compatible endpoint (OpenAI, Cerebras, vLLM, OpenRouter, ...).
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import Optional, Sequence

try:  # openai is an optional dependency (install with the `probe` extra).
    from openai import OpenAI

    _OPENAI_AVAILABLE = True
except Exception:  # pragma: no cover
    _OPENAI_AVAILABLE = False


LETTERS = "ABCDEFGHIJ"


@dataclass
class VLMConfig:
    model: str
    base_url: Optional[str] = None
    api_key_env: str = "OPENAI_API_KEY"
    max_tokens: int = 16
    temperature: float = 0.0


@dataclass
class MultiModalQuestion:
    index: int
    question: str
    options: list[str]
    answer_letter: str
    image_data_url: Optional[str] = None
    subject: str = "unknown"
    metadata: dict = field(default_factory=dict)


def build_prompt(q: MultiModalQuestion) -> str:
    lines = [q.question.strip(), ""]
    for i, opt in enumerate(q.options):
        lines.append(f"{LETTERS[i]}. {opt}")
    lines.append("")
    lines.append("Answer with only the letter of the correct option.")
    return "\n".join(lines)


def parse_answer_letter(text: str, n_options: int) -> Optional[str]:
    if not text:
        return None
    valid = LETTERS[:n_options]
    m = re.search(rf"\b([{valid}])\b", text.strip().upper())
    if m:
        return m.group(1)
    m = re.match(rf"\s*([{valid}])", text.strip().upper())
    return m.group(1) if m else None


class VLMClient:
    """OpenAI-compatible client. Set ``include_image=False`` for the text-only control."""

    def __init__(self, config: VLMConfig):
        if not _OPENAI_AVAILABLE:
            raise RuntimeError(
                "The 'openai' package is required for live probing. Install with: pip install '.[probe]'"
            )
        api_key = os.environ.get(config.api_key_env)
        if not api_key:
            raise RuntimeError(
                f"No API key found in env var {config.api_key_env}. Export it before running a live probe."
            )
        self.config = config
        self._client = OpenAI(api_key=api_key, base_url=config.base_url)

    def answer(self, q: MultiModalQuestion, include_image: bool = True) -> Optional[str]:
        content: list[dict] = [{"type": "text", "text": build_prompt(q)}]
        if include_image and q.image_data_url:
            content.append({"type": "image_url", "image_url": {"url": q.image_data_url}})
        resp = self._client.chat.completions.create(
            model=self.config.model,
            messages=[{"role": "user", "content": content}],
            max_tokens=self.config.max_tokens,
            temperature=self.config.temperature,
        )
        text = resp.choices[0].message.content or ""
        return parse_answer_letter(text, len(q.options))

    def score(self, q: MultiModalQuestion, predicted: Optional[str]) -> float:
        return 1.0 if predicted == q.answer_letter else 0.0


def available() -> bool:
    return _OPENAI_AVAILABLE
