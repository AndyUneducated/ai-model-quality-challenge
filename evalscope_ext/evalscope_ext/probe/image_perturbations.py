"""Image perturbations that specifically stress a vision encoder.

Each perturbation degrades the *visual* signal while leaving the question text
untouched, so a drop in accuracy isolates encoder quality rather than the model's
text reasoning or world knowledge. We pick perturbations that map to concrete
encoder failure modes:

- ``downscale``    -> spatial-resolution / small-object handling (re-tokenization of patches)
- ``blur``         -> loss of high-frequency detail (edges, thin lines, small text)
- ``jpeg``         -> compression artifacts the encoder must be robust to
- ``grayscale``    -> color-dependent reasoning (charts, wiring diagrams, biology stains)

These require Pillow. They are intentionally small, deterministic functions so a
reviewer can reproduce a perturbed image byte-for-byte.
"""
from __future__ import annotations

import base64
import io
from dataclasses import dataclass
from typing import Callable

try:  # Pillow is an optional dependency (install with the `probe` extra).
    from PIL import Image, ImageFilter

    _PIL_AVAILABLE = True
except Exception:  # pragma: no cover - exercised only when Pillow is missing
    _PIL_AVAILABLE = False


def pil_available() -> bool:
    return _PIL_AVAILABLE


def _require_pil() -> None:
    if not _PIL_AVAILABLE:
        raise RuntimeError(
            "Pillow is required for image perturbations. Install with: pip install '.[probe]'"
        )


def downscale(image: "Image.Image", factor: float = 0.25) -> "Image.Image":
    """Downscale then upscale back, destroying fine spatial detail."""
    _require_pil()
    w, h = image.size
    small = image.resize((max(1, int(w * factor)), max(1, int(h * factor))), Image.BILINEAR)
    return small.resize((w, h), Image.BILINEAR)


def blur(image: "Image.Image", radius: float = 3.0) -> "Image.Image":
    _require_pil()
    return image.filter(ImageFilter.GaussianBlur(radius=radius))


def jpeg_compress(image: "Image.Image", quality: int = 8) -> "Image.Image":
    _require_pil()
    buf = io.BytesIO()
    image.convert("RGB").save(buf, format="JPEG", quality=quality)
    buf.seek(0)
    return Image.open(buf).convert(image.mode if image.mode in ("RGB", "L") else "RGB")


def grayscale(image: "Image.Image") -> "Image.Image":
    _require_pil()
    return image.convert("L").convert("RGB")


PERTURBATIONS: dict[str, Callable[["Image.Image"], "Image.Image"]] = {
    "downscale": downscale,
    "blur": blur,
    "jpeg": jpeg_compress,
    "grayscale": grayscale,
}


@dataclass(frozen=True)
class EncoderStressBattery:
    """The set of perturbations applied to every probe candidate."""

    names: tuple[str, ...] = ("downscale", "blur", "jpeg")

    def apply(self, image: "Image.Image", name: str) -> "Image.Image":
        return PERTURBATIONS[name](image)


def image_to_data_url(image: "Image.Image", fmt: str = "PNG") -> str:
    """Encode a PIL image as an OpenAI-compatible ``data:`` URL."""
    _require_pil()
    buf = io.BytesIO()
    image.convert("RGB").save(buf, format=fmt)
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    mime = "image/png" if fmt.upper() == "PNG" else f"image/{fmt.lower()}"
    return f"data:{mime};base64,{encoded}"


def load_image_from_bytes(data: bytes) -> "Image.Image":
    _require_pil()
    return Image.open(io.BytesIO(data)).convert("RGB")
