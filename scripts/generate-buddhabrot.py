#!/usr/bin/env python3
"""Generate the static, transparent Buddhabrot density texture."""

from pathlib import Path

import numpy as np
from PIL import Image


WIDTH = 1024
HEIGHT = 1024
SAMPLES = 1_200_000
MAX_ITERATIONS = 320
BATCH = 30_000
X_MIN, X_MAX = -2.2, 1.2
Y_MIN, Y_MAX = -1.5, 1.5
SEED = 0xBADDAB07


def accumulate_orbits(density: np.ndarray, cr: np.ndarray, ci: np.ndarray, escaped_at: np.ndarray) -> None:
    keep = escaped_at >= 5
    cr = cr[keep]
    ci = ci[keep]
    escaped_at = escaped_at[keep]
    if not len(cr):
        return

    zr = np.zeros_like(cr)
    zi = np.zeros_like(ci)
    for step in range(1, int(escaped_at.max()) + 1):
        alive = step <= escaped_at
        previous_r = zr[alive]
        previous_i = zi[alive]
        zr[alive] = previous_r * previous_r - previous_i * previous_i + cr[alive]
        zi[alive] = 2.0 * previous_r * previous_i + ci[alive]
        visible = alive & (zr >= X_MIN) & (zr < X_MAX) & (zi >= Y_MIN) & (zi < Y_MAX)
        if not np.any(visible):
            continue
        px = ((zr[visible] - X_MIN) / (X_MAX - X_MIN) * WIDTH).astype(np.int32)
        py = ((Y_MAX - zi[visible]) / (Y_MAX - Y_MIN) * HEIGHT).astype(np.int32)
        flat = py * WIDTH + px
        density += np.bincount(flat, minlength=WIDTH * HEIGHT).reshape(HEIGHT, WIDTH).astype(np.uint32)


def main() -> None:
    rng = np.random.default_rng(SEED)
    density = np.zeros((HEIGHT, WIDTH), dtype=np.uint32)

    for start in range(0, SAMPLES, BATCH):
        size = min(BATCH, SAMPLES - start)
        cr = rng.uniform(X_MIN, X_MAX, size).astype(np.float64)
        ci = rng.uniform(Y_MIN, Y_MAX, size).astype(np.float64)
        zr = np.zeros(size, dtype=np.float64)
        zi = np.zeros(size, dtype=np.float64)
        escaped_at = np.zeros(size, dtype=np.uint16)
        active = np.ones(size, dtype=bool)

        for step in range(1, MAX_ITERATIONS + 1):
            previous_r = zr[active]
            previous_i = zi[active]
            zr[active] = previous_r * previous_r - previous_i * previous_i + cr[active]
            zi[active] = 2.0 * previous_r * previous_i + ci[active]
            escaped = active & (zr * zr + zi * zi > 4.0)
            escaped_at[escaped] = step
            active[escaped] = False
            if not np.any(active):
                break

        accumulate_orbits(density, cr, ci, escaped_at)

    light = np.log1p(density.astype(np.float64))
    occupied = light[light > 0]
    low = np.percentile(occupied, 54)
    high = np.percentile(occupied, 99.92)
    normalized = np.clip((light - low) / max(high - low, 1e-9), 0, 1)
    # Keep raw histogram pixels. A steeper gamma suppresses empty haze and makes
    # genuine high-density orbit paths pop without manufacturing contour bands.
    contrast = normalized ** 1.68
    alpha = np.clip((contrast - 0.018) * 1.55, 0, 1)
    alpha[contrast < 0.055] = 0

    rgba = np.zeros((HEIGHT, WIDTH, 4), dtype=np.uint8)
    rgba[..., 0] = np.clip(8 + contrast * 235, 0, 255).astype(np.uint8)
    rgba[..., 1] = np.clip(72 + contrast * 183, 0, 255).astype(np.uint8)
    rgba[..., 2] = np.clip(92 + contrast * 143, 0, 255).astype(np.uint8)
    rgba[..., 3] = (alpha * 255).astype(np.uint8)

    output = Path(__file__).resolve().parents[1] / "public" / "buddhabrot-density.png"
    output.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba).save(output, optimize=True)
    print(output)


if __name__ == "__main__":
    main()
