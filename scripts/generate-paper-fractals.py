#!/usr/bin/env python3
"""Generate the CC0 paper figures: sharp upright Buddhabrot + Mandelbrot set."""

from pathlib import Path

import numpy as np
from PIL import Image

PUBLIC = Path(__file__).resolve().parents[1] / "public"

# --- Buddhabrot: square field, upright (head/tip up), no blur ---------------
BB_W = BB_H = 880
BB_SAMPLES = 8_000_000
BB_BATCH = 250_000
BB_MAX_ITER = 150
SX_MIN, SX_MAX = -1.42, 1.42   # screen x follows z.imag
SY_MIN, SY_MAX = -1.42, 1.42   # screen y follows -(z.real + 0.5), crown up
C_REAL_MIN, C_REAL_MAX = -2.12, 0.72
C_IMAG_MIN, C_IMAG_MAX = -1.42, 1.42


def generate_buddhabrot() -> None:
    rng = np.random.default_rng(0xBADDAB07)
    density = np.zeros((BB_H, BB_W), dtype=np.int64)
    done = 0
    while done < BB_SAMPLES:
        size = min(BB_BATCH, BB_SAMPLES - done)
        done += size
        cr = rng.uniform(C_REAL_MIN, C_REAL_MAX, size)
        ci = rng.uniform(C_IMAG_MIN, C_IMAG_MAX, size)
        zr = np.zeros(size)
        zi = np.zeros(size)
        alive = np.ones(size, dtype=bool)
        escaped_at = np.zeros(size, dtype=np.uint16)
        for step in range(1, BB_MAX_ITER + 1):
            previous_r = zr[alive]
            previous_i = zi[alive]
            zr[alive] = previous_r * previous_r - previous_i * previous_i + cr[alive]
            zi[alive] = 2.0 * previous_r * previous_i + ci[alive]
            newly = alive & (zr * zr + zi * zi > 16)
            escaped_at[newly] = step
            alive &= ~newly
            if not alive.any():
                break
        esc = escaped_at > 0
        if not esc.any():
            continue
        cr, ci, escaped_at = cr[esc], ci[esc], escaped_at[esc]
        zr = np.zeros_like(cr)
        zi = np.zeros_like(ci)
        for step in range(1, int(escaped_at.max()) + 1):
            alive = step <= escaped_at
            previous_r = zr[alive]
            previous_i = zi[alive]
            zr[alive] = previous_r * previous_r - previous_i * previous_i + cr[alive]
            zi[alive] = 2.0 * previous_r * previous_i + ci[alive]
            if step <= 2:
                continue
            visible = alive & (zi >= SX_MIN) & (zi < SX_MAX) & (-(zr + 0.5) >= SY_MIN) & (-(zr + 0.5) < SY_MAX)
            if not visible.any():
                continue
            px = ((zi[visible] - SX_MIN) / (SX_MAX - SX_MIN) * BB_W).astype(np.int32)
            py = ((SY_MAX - (-(zr[visible] + 0.5))) / (SY_MAX - SY_MIN) * BB_H).astype(np.int32)
            flat = py * BB_W + px
            density += np.bincount(flat, minlength=BB_W * BB_H).reshape(BB_H, BB_W)

    value = np.log1p(density.astype(np.float64))
    value /= value.max() + 1e-9
    value = value ** 0.82
    tinted = np.zeros((BB_H, BB_W, 4), dtype=np.uint8)
    tinted[..., 0] = (value * 168).astype(np.uint8)
    tinted[..., 1] = (value * 205).astype(np.uint8)
    tinted[..., 2] = (np.clip(value * 1.18, 0, 1) * 255).astype(np.uint8)
    alpha = (np.clip(value * 1.55, 0, 1) ** 0.9 * 255).astype(np.uint8)
    tinted[..., 3] = alpha
    Image.fromarray(tinted, "RGBA").save(PUBLIC / "buddhabrot-paper.png")
    print("buddhabrot-paper.png written")


# --- Mandelbrot: square, spike/tip pointing up ------------------------------
MB_SIZE = 720
MB_ITER = 400
RX_MIN, RX_MAX = -2.15, 0.75
IY_MIN, IY_MAX = -1.45, 1.45


def generate_mandelbrot() -> None:
    px = np.linspace(RX_MIN, RX_MAX, MB_SIZE)
    py = np.linspace(IY_MAX, IY_MIN, MB_SIZE)
    cr, ci = np.meshgrid(px, py)
    zr = np.zeros_like(cr)
    zi = np.zeros_like(ci)
    nu = np.zeros((MB_SIZE, MB_SIZE), dtype=np.float64)
    active = np.ones((MB_SIZE, MB_SIZE), dtype=bool)
    for step in range(1, MB_ITER + 1):
        pr = zr[active]
        pi_ = zi[active]
        zr[active] = pr * pr - pi_ * pi_ + cr[active]
        zi[active] = 2.0 * pr * pi_ + ci[active]
        mag = zr * zr + zi * zi
        newly = active & (mag > 256)
        nu[newly] = step + 1 - np.log2(np.log(np.sqrt(mag[newly])) + 1e-12)
        active &= ~newly
        if not active.any():
            break
    band = (nu / MB_ITER) ** 0.42
    rgba = np.zeros((MB_SIZE, MB_SIZE, 4), dtype=np.uint8)
    rgba[..., 0] = np.clip(30 + 300 * band ** 2.6, 0, 255).astype(np.uint8)
    rgba[..., 1] = np.clip(80 + 240 * band ** 1.6, 0, 255).astype(np.uint8)
    rgba[..., 2] = np.clip(150 + 130 * band ** 1.05, 0, 255).astype(np.uint8)
    rgba[..., 3] = np.where(nu > 0, np.clip(60 + 195 * band ** 0.55, 0, 255), 30).astype(np.uint8)
    # rotate 90 degrees clockwise so the -2 antenna tip points upward
    rgba = np.rot90(rgba, k=-1)
    Image.fromarray(rgba, "RGBA").save(PUBLIC / "mandelbrot-paper.png")
    print("mandelbrot-paper.png written")


if __name__ == "__main__":
    generate_buddhabrot()
    generate_mandelbrot()
