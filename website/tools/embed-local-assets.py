#!/usr/bin/env python3
"""Regenerate the <asset>.js companion files used when index.html is opened
straight from disk (file://), where browsers block fetch() of local files.

Run from the website folder after changing any of these assets:
    python3 tools/embed-local-assets.py
"""
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEXT = ["assets/08-cta/cta-skyline.svg", "assets/09-footer/footer-landscape.svg",
        *(f"assets/07-process/{n}.svg" for n in ("site-survey", "configuration", "quality-check", "installation"))]
BINARY = ["assets/01-hero/model/ssg-streetlight.web.glb", "assets/04-flag/national-flag.webp"]

def write(path, value):
    out = ROOT / f"{path}.js"
    out.write_text(
        "(window.__SSG_FILES = window.__SSG_FILES || {})"
        f"[{json.dumps(path)}] = {json.dumps(value)};\n",
        encoding="utf-8",
    )
    print(f"{out.relative_to(ROOT)}  {out.stat().st_size / 1e6:.2f} MB")

for p in TEXT:
    write(p, (ROOT / p).read_text(encoding="utf-8"))
for p in BINARY:
    write(p, base64.b64encode((ROOT / p).read_bytes()).decode("ascii"))
