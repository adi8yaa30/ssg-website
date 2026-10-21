#!/usr/bin/env python3
"""Interim dark-theme product photos (build instructions §12.7): cut the white studio sky
out of each product-on-grass photo so it can sit on --night, and write it next to the
original as photo-dusk.webp. The daytime originals are kept for when the client's dusk
regenerations arrive (TODO.md); the dusk colour grade itself is applied in CSS.

The sky is removed with an edge-connected flood fill: only near-white pixels that are
reachable from the image border (or from large pure-white areas, such as the gap between
a pole and its arm) become transparent, so the silver products and the white concrete
bases survive. Boundary pixels get a soft alpha and are decontaminated from the white.

The technical blueprints (dark lines on white) are re-exported as blueprint-dusk.webp:
warm-white (--text) lines whose alpha is the original line darkness, so they sit on any
dark background without blend modes.

Needs numpy and libwebp's dwebp/cwebp on PATH. Run from the website folder:
    python3 tools/cutout-products.py
"""
import subprocess
import tempfile
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
PHOTOS = sorted((ROOT / "assets/02-products").glob("*/photo*.webp"))
BLUEPRINTS = sorted((ROOT / "assets/02-products").glob("*/blueprint.webp"))
TEXT = (242, 238, 230)                 # --text

WHITE_MIN, WHITE_CHROMA = 236, 14      # flood-fill candidates: bright and almost neutral
PURE_MIN, PURE_CHROMA = 246, 6         # seed areas inside the frame: clean studio white
SEED_ERODE = 6                         # a seed must be at least ~13 px of pure white across
FEATHER = 2                            # px of soft edge around the removed sky


def shift(m, dy, dx):
    out = np.zeros_like(m)
    h, w = m.shape
    out[max(dy, 0):h + min(dy, 0), max(dx, 0):w + min(dx, 0)] = m[max(-dy, 0):h + min(-dy, 0), max(-dx, 0):w + min(-dx, 0)]
    return out


def dilate(m):
    return m | shift(m, 1, 0) | shift(m, -1, 0) | shift(m, 0, 1) | shift(m, 0, -1)


def erode(m):
    return m & shift(m, 1, 0) & shift(m, -1, 0) & shift(m, 0, 1) & shift(m, 0, -1)


def read_pam(path):
    with tempfile.NamedTemporaryFile(suffix=".pam") as tmp:
        subprocess.run(["dwebp", str(path), "-pam", "-o", tmp.name], check=True, capture_output=True)
        data = Path(tmp.name).read_bytes()
    head, _, body = data.partition(b"ENDHDR\n")
    fields = dict(line.split(b" ", 1) for line in head.splitlines()[1:])
    w, h = int(fields[b"WIDTH"]), int(fields[b"HEIGHT"])
    return np.frombuffer(body, np.uint8).reshape(h, w, 4).copy()


def write_webp(rgba, path, alpha_q=90):
    h, w, _ = rgba.shape
    with tempfile.NamedTemporaryFile(suffix=".pam") as tmp:
        Path(tmp.name).write_bytes(
            f"P7\nWIDTH {w}\nHEIGHT {h}\nDEPTH 4\nMAXVAL 255\nTUPLTYPE RGB_ALPHA\nENDHDR\n".encode() + rgba.tobytes())
        subprocess.run(["cwebp", "-quiet", "-q", "84", "-alpha_q", str(alpha_q), "-exact", tmp.name, "-o", str(path)], check=True)


def cut(img):
    rgb = img[..., :3].astype(np.float32)
    mn, mx = rgb.min(-1), rgb.max(-1)
    cand = (mn >= WHITE_MIN) & (mx - mn <= WHITE_CHROMA)

    seeds = (mn >= PURE_MIN) & (mx - mn <= PURE_CHROMA)
    for _ in range(SEED_ERODE):
        seeds = erode(seeds)
    border = np.zeros_like(cand)
    border[0, :] = border[-1, :] = border[:, 0] = border[:, -1] = True
    sky = (seeds | border) & cand
    while True:  # grow through the candidates until nothing changes
        grown = sky
        for _ in range(16):
            grown = dilate(grown) & cand
        if (grown == sky).all():
            break
        sky = grown

    alpha = np.where(sky, 0.0, 1.0).astype(np.float32)
    edge = sky.copy()
    for _ in range(FEATHER):
        edge = dilate(edge)
    edge &= ~sky
    # soft alpha by how white the boundary pixel is, then un-mix the white it was blended with
    a = np.clip((255.0 - mn) / 40.0, 0.0, 1.0)
    alpha = np.where(edge, np.minimum(alpha, a), alpha)
    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.where((edge & (alpha > 0))[..., None], (rgb - 255.0 * (1 - safe)) / safe, rgb)
    out = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).round().astype(np.uint8)
    out[alpha == 0, :3] = 0
    return out, sky.mean()


def lines(img):
    rgb = img[..., :3].astype(np.float32)
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    alpha = np.clip((255.0 - lum) / 255.0 * 1.6, 0.0, 1.0) * (img[..., 3] / 255.0)
    out = np.zeros_like(img)
    out[..., :3] = TEXT
    out[..., 3] = (alpha * 255).round().astype(np.uint8)
    return out


for src in BLUEPRINTS:
    dst = src.with_name("blueprint-dusk.webp")
    write_webp(lines(read_pam(src)), dst, alpha_q=40)  # line art: the alpha is the image
    print(f"{dst.relative_to(ROOT)}  {dst.stat().st_size / 1e3:.0f} kB")

for src in PHOTOS:
    if src.stem.endswith("-dusk"):
        continue
    dst = src.with_name(src.stem + "-dusk.webp")
    out, removed = cut(read_pam(src))
    write_webp(out, dst)
    print(f"{dst.relative_to(ROOT)}  sky removed: {removed:.0%}  {dst.stat().st_size / 1e3:.0f} kB")
