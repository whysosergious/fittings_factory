"""Scale every price in pricelist.pdf by 0.037 (ceil to 0.01) -> pricelist_updated.pdf.

v3: char-level (tight glyph box) redactions, no inflation; glued labels
(«ПОЛИМЕР620,91») get only their numeric suffix replaced.
"""
import json
import re
import sys
from collections import Counter
from decimal import Decimal, ROUND_CEILING

import pymupdf

SRC = "public/pricelist.pdf"
DST = "public/pricelist_updated.pdf"
EDITS_JSON = ".tmp/edits.json"
FACTOR = Decimal("0.037")

STRICT = re.compile(r"^(\d{1,4}),(\d{2})$")
SLASH = re.compile(r"^(\d{1,4}),(\d{2})/$")
GLUED = {
    "ПОЛИМЕР620,91": ("ПОЛИМЕР", "620,91"),
    "ПОЛИМЕР621,81": ("ПОЛИМЕР", "621,81"),
}


def scale(price: str) -> str:
    v = (Decimal(price.replace(",", ".")) * FACTOR).quantize(
        Decimal("0.01"), rounding=ROUND_CEILING
    )
    return f"{v:.2f}".replace(".", ",")


def int_to_rgb(c: int):
    return ((c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255)


class FontBank:
    """Span font names -> substitute fonts (Corel embedded blobs are unusable).

    Width fit measured against real price spans:
    Liberation Serif Bold vs TimesNewRomanPS-BoldMT -> 0.998,
    Noto Sans Bold vs TrebuchetMS-Bold -> 1.052 (closest of 7 candidates).
    """

    SUBSTITUTES = {
        "TrebuchetMS-Bold": "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
        "TrebuchetMS": "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        "TimesNewRomanPS-BoldMT": "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
        "TimesNewRomanPSMT": "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
        "Arial-BoldMT": "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "ArialMT": "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    }

    def __init__(self):
        self.cache = {}
        self.misses = []

    def get(self, fname: str, needed: str):
        if fname in self.cache:
            return self.cache[fname]
        result = None
        path = self.SUBSTITUTES.get(fname)
        if path:
            try:
                font = pymupdf.Font(fontfile=path)
                if all(font.has_glyph(ord(ch)) for ch in set(needed)):
                    result = font
            except Exception:
                result = None
        if result is None:
            self.misses.append(fname)
            result = pymupdf.Font("helv")
        self.cache[fname] = result
        return result


def plan_page_chars(page):
    """Return (edit_list, untouched_char_rects) with anti-clip guards applied."""
    spans_info = []  # (chars, lo, hi) per planned edit
    untouched = []
    for block in page.get_text("rawdict")["blocks"]:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            if tuple(round(v, 2) for v in line["dir"]) != (1.0, 0.0):
                continue  # decorative rotated labels («НОВИНКА»)
            for span in line["spans"]:
                chars = span.get("chars", [])
                text = "".join(c["c"] for c in chars)
                t = text.strip()
                m_strict = STRICT.match(t)
                m_slash = SLASH.match(t)
                glued = GLUED.get(t)
                if not (m_strict or m_slash or glued):
                    untouched.extend(c["bbox"] for c in chars)
                    continue

                lead = len(text) - len(text.lstrip())
                if m_strict:
                    new = scale(t)
                    lo, hi = lead, lead + len(t)
                elif m_slash:
                    new = scale(t[:-1]) + "/"
                    lo, hi = lead, lead + len(t)
                else:  # glued: replace only the numeric suffix
                    label, price = glued
                    new = scale(price)
                    lo = text.index(price)
                    hi = lo + len(price)
                    untouched.extend(
                        c["bbox"] for c in chars[:lo] + chars[hi:]
                    )
                spans_info.append((chars[lo:hi], new, span))

    edits = []
    for sub, new, span in spans_info:
        rects = [pymupdf.Rect(c["bbox"]) for c in sub]
        # anti-clip: never let an edit rect intersect a kept glyph's rect
        for r in rects:
            for nb in untouched:
                nr = pymupdf.Rect(nb)
                if not r.intersects(nr):
                    continue
                ix = min(r.x1, nr.x1) - max(r.x0, nr.x0)
                iy = min(r.y1, nr.y1) - max(r.y0, nr.y0)
                if ix <= iy:
                    if nr.x0 < r.x0:
                        r.x0 = nr.x1  # neighbor on the left
                    else:
                        r.x1 = nr.x0
                else:
                    if nr.y0 < r.y0:
                        r.y0 = nr.y1
                    else:
                        r.y1 = nr.y0
        origin = tuple(sub[0]["origin"])
        edits.append(
            {
                "page": page.number,
                "rects": [list(r) for r in rects],
                "origin": origin,
                "size": span["size"],
                "color": int_to_rgb(span["color"]),
                "fname": span["font"],
                "old": "".join(c["c"] for c in sub),
                "new": new,
            }
        )
    return edits


def main():
    doc = pymupdf.open(SRC)
    bank = FontBank()
    edits_by_page = {}
    for page in doc:
        edits_by_page[page.number] = plan_page_chars(page)

    total = 0
    log = []
    for page in doc:
        edits = edits_by_page.get(page.number, [])
        if not edits:
            continue
        for e in edits:
            for r in e["rects"]:
                page.add_redact_annot(r, fill=False)
        page.apply_redactions(
            images=pymupdf.PDF_REDACT_IMAGE_NONE,
            graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
        )
        for e in edits:
            nt = e["new"]
            font = bank.get(e["fname"], nt)
            tw = pymupdf.TextWriter(page.rect)
            tw.append(e["origin"], nt, font=font, fontsize=e["size"])
            tw.write_text(page, color=e["color"])
            total += 1
            log.append(
                {
                    "page": e["page"],
                    "rects": e["rects"],
                    "old": e["old"],
                    "new": nt,
                }
            )
    doc.save(DST, garbage=3, deflate=True)
    with open(EDITS_JSON, "w") as f:
        json.dump(log, f, ensure_ascii=False)
    print(f"replacements: {total}")
    if bank.misses:
        print("WARNING helv fallback:", sorted(set(bank.misses)))
    else:
        print("fonts: substitutes applied, no fallbacks")


if __name__ == "__main__":
    main()
