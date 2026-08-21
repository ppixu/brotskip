#!/usr/bin/env python3
"""Generate the static, transparent Mandelbrot set texture."""

import numpy as np
from PIL import Image
from pathlib import Path

WIDTH = 1024
HEIGHT = 1024
MAX_ITERATIONS = 400
X_MIN, X_MAX = -2.65, 1.15
Y_MIN, Y_MAX = -1.7, 1.7


def main() -> None:
    px = np.linspace(X_MIN, X_MAX, WIDTH)
    py = np.linspace(Y_MAX, Y_MIN, HEIGHT)
    cr, ci = np.meshgrid(px, py)
    zr, zi = np.zeros_like(cr), np.zeros_like(ci)
    escaped_at = np.zeros((HEIGHT, WIDTH), dtype=np.uint32)
    active = np.ones((HEIGHT, WIDTH), dtype=bool)

    for step in range(1, MAX_ITERATIONS + 1):
        previous_r = zr[active]
        previous_i = zi[active]
        zr[active] = previous_r * previous_r - previous_i * previous_i + cr[active]
        zi[active] = 2.0 * previous_r * previous_i + ci[active]
        stuck = (zr ** 2 + zi ** 2) > 16
        newly_escaped = active & stuck
        escaped_at[newly_escaped] = step
        active &= ~stuck
        if not active.any():
            break

    boundary = np.zeros((HEIGHT, WIDTH, 4), dtype=np.uint8)
    mag = np.log1p(escaped_at.astype(np.float64)) / np.log1p(MAX_ITERATIONS)
    mag[escaped_at == 0] = 1.0
    boundary[..., 0] = (90 + 120 * mag).astype(np.uint8)
    boundary[..., 1] = (150 + 100 * mag).astype(np.uint8)
    boundary[..., 2] = (200 + 55 * mag).astype(np.uint8)
    boundary[..., 3] = np.where(escaped_at > 0, np.clip(30 + 175 * mag, 0, 255).astype(np.uint8), 0)

    output = Path(__file__).resolve().parents[1] / "public" / "mandelbrot-density.png"
    Image.fromarray(boundary, "RGBA").save(output)
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()
