#!/usr/bin/env python3
"""Make the traced scanline SVGs lighter to download, parse and repaint.

The CTA skyline and footer landscape are traced polygons (M/L/Z only) with a
vertex on every pixel column. This removes vertices that sit within TOL units
of the straight line between their neighbours (Ramer-Douglas-Peucker per
closed ring), rounds to 2 decimals and writes compact path syntax. The shapes
are unchanged to well under a device pixel at any screen size.

It also recolours the exports for the dark "Golden Dusk" theme (build instructions
§12.6): the blue / white artwork becomes slate lines with a gold horizon. Colours are
written as literal hex (the files must also work as plain <img> fallbacks).

Rebuilt from the original exports in ../assets, so it is safe to re-run:
    cd website && python3 tools/optimize-svg.py && python3 tools/embed-local-assets.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# §12.2 tokens
NIGHT, DUSK, HAZE, GOLD, SUN = "#12171E", "#2E3742", "#4E4A45", "#E9A94A", "#FFE2A0"

# Thin gold line that fades out at both ends (the §12.4 wave-line look)
def gold_fade(gid):
    return (f'<linearGradient id="{gid}" x1="0" y1="0" x2="1" y2="0">'
            f'<stop offset="0" stop-color="{GOLD}" stop-opacity="0"/><stop offset=".2" stop-color="{GOLD}"/>'
            f'<stop offset=".5" stop-color="{SUN}"/><stop offset=".8" stop-color="{GOLD}"/>'
            f'<stop offset="1" stop-color="{GOLD}" stop-opacity="0"/></linearGradient>')

# CTA skyline: slate lines rising to the warm haze at the tops (lamp glows are added in scanlines.js)
CTA_COLOURS = [
    ('<g id="blue-scanlines" fill="#2744DF"', '<g id="blue-scanlines" fill="url(#cta-dusk)"'),
    ("</desc>", "</desc>\n<defs><linearGradient id=\"cta-dusk\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"941\" x2=\"0\" y2=\"200\">"
                f'<stop offset="0" stop-color="{DUSK}"/><stop offset=".55" stop-color="{DUSK}"/><stop offset="1" stop-color="{HAZE}"/>'
                "</linearGradient></defs>"),
]
# Footer landscape: the solid land/cloud bodies match the night sky, the scanlines are slate,
# and a gold horizon glows in the valley between the hills
FOOTER_COLOURS = [
    ('<g id="blue-artwork" fill="#2744DF"', f'<g id="blue-artwork" fill="{NIGHT}"'),
    ('<g id="white-scanlines" fill="#FFFFFF"', f'<g id="white-scanlines" fill="{DUSK}"'),
    ("</desc>", f"</desc>\n<defs>{gold_fade('footer-horizon')}</defs>\n"
                '<path id="footer-horizon-line" d="M380 493C760 489 1160 487 1720 491" fill="none" '
                'stroke="url(#footer-horizon)" stroke-width="2" stroke-linecap="round"/>'),
]

JOBS = [
    # (source export, web copy, tolerance in SVG units, colour rewrites)
    (ROOT.parent / "assets/8. CTA-Section/CTA.svg", ROOT / "assets/08-cta/cta-skyline.svg", 0.12, CTA_COLOURS),
    # pixel-traced on integer coordinates: only drop points that are exactly collinear
    (ROOT.parent / "assets/9. Footer-Section/footer.svg", ROOT / "assets/09-footer/footer-landscape.svg", 0.0, FOOTER_COLOURS),
]

NUM = re.compile(r"-?\d*\.?\d+(?:e-?\d+)?")


def dist(p, a, b):
    """Distance from p to the segment a-b."""
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    L = dx * dx + dy * dy
    if L == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L))
    return ((px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2) ** 0.5


def rdp(pts, tol):
    """Ramer-Douglas-Peucker on an open chain (keeps both ends), iterative."""
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        best, k = -1.0, -1
        for m in range(i + 1, j):
            d = dist(pts[m], pts[i], pts[j])
            if d > best:
                best, k = d, m
        if k != -1 and best > tol + 1e-9:
            keep[k] = True
            stack += [(i, k), (k, j)]
    return [p for p, f in zip(pts, keep) if f]


def simplify_ring(ring, tol):
    if len(ring) > 1 and ring[0] == ring[-1]:
        ring = ring[:-1]
    if len(ring) < 4:
        return ring
    # split the closed ring at the point farthest from the first one
    far = max(range(len(ring)), key=lambda m: (ring[m][0] - ring[0][0]) ** 2 + (ring[m][1] - ring[0][1]) ** 2)
    a = rdp(ring[: far + 1], tol)
    b = rdp(ring[far:] + [ring[0]], tol)
    out = a + b[1:-1]
    return out if len(out) >= 3 else ring


def fmt(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def optimize_d(d, tol):
    rings, cur = [], None
    for cmd, args in re.findall(r"([MLZmlz])([^MLZmlz]*)", d):
        nums = [float(n) for n in NUM.findall(args)]
        if cmd == "M":
            cur = [(nums[0], nums[1])]
            rings.append(cur)
            nums = nums[2:]  # implicit lineto pairs
        if cmd in "ML":
            cur += list(zip(nums[0::2], nums[1::2]))
        elif cmd not in "Zz":
            raise ValueError(f"unsupported path command {cmd}")
    out = []
    for ring in rings:
        pts = simplify_ring(ring, tol)
        out.append("M" + "L".join(f"{fmt(x)} {fmt(y)}" for x, y in pts) + "Z")
    return "".join(out), sum(len(r) for r in rings), sum(len(o.split("L")) for o in out)


def run(src, dst, tol, colours):
    text = src.read_text(encoding="utf-8")
    before = after = 0

    def repl(m):
        nonlocal before, after
        d, b, a = optimize_d(m.group(1), tol)
        before += b
        after += a
        return f'd="{d}"'

    text = re.sub(r'(?<=\s)d="([^"]*)"', repl, text)
    text = re.sub(r'<path id="scanline-\d+" ', "<path ", text)  # ids are never referenced
    for old, new in colours:
        if text.count(old) != 1:
            raise ValueError(f"{src.name}: expected one {old!r}")
        text = text.replace(old, new)
    dst.write_text(text, encoding="utf-8")
    print(f"{dst.relative_to(ROOT)}: {src.stat().st_size / 1e3:.0f} kB -> {dst.stat().st_size / 1e3:.0f} kB, "
          f"vertices {before} -> {after}")


for src, dst, tol, colours in JOBS:
    run(src, dst, tol, colours)
