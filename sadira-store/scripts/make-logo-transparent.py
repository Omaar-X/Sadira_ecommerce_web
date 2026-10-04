"""
Builds public/brand/logo-transparent.png from the original public/brand/logo.png
(which stays unchanged): the dark background becomes transparent, the cream
lettering becomes charcoal (#171717) and the pink heart keeps its colour.
Anti-aliased edges keep their partial transparency. Run: python scripts/make-logo-transparent.py
"""
from PIL import Image

SRC = "public/brand/logo.png"
OUT = "public/brand/logo-transparent.png"
INK = (23, 23, 23)  # --sadira-ink

src = Image.open(SRC).convert("RGB")
w, h = src.size
px = src.load()
bg = px[5, 5]
cream = (237, 224, 209)
# The heart's pink, sampled from its most saturated pixel.
pink = max((px[x, y] for y in range(700, 830) for x in range(1040, 1150)), key=lambda c: c[0] - c[1])


def fit(p, target):
    """How far p lies along bg→target (0..1), and how far off that line it is."""
    d = [target[i] - bg[i] for i in range(3)]
    v = [p[i] - bg[i] for i in range(3)]
    t = max(0.0, min(1.0, sum(v[i] * d[i] for i in range(3)) / sum(x * x for x in d)))
    return t, sum((v[i] - t * d[i]) ** 2 for i in range(3))


out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
op = out.load()
for y in range(h):
    for x in range(w):
        p = px[x, y]
        tc, rc = fit(p, cream)
        tp, rp = fit(p, pink)
        if rp < rc and tp > 0.02:
            op[x, y] = pink + (round(tp * 255),)
        elif tc > 0.02:
            op[x, y] = INK + (round(tc * 255),)

out = out.crop(out.getbbox())  # trim the empty margin around the artwork
out.save(OUT, optimize=True)
print("bg", bg, "pink", pink, "->", OUT, out.size)
