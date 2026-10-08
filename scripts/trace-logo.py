#!/usr/bin/env python3
"""
Genera i tracciati vettoriali del marchio Pall1 dal riferimento.

Il marchio è il numero 1 costruito come un campo da calcio. La forma "vera" è
quella disegnata in `docs/logo/riferimento.jpg`: invece di ridisegnarla a mano,
la si traccia (potrace) e si tengono i tracciati come dati, così il logo resta
identico al riferimento e nitido a ogni dimensione.

Cosa produce, tutto da un'unica esecuzione:

  src/components/brand/logo-paths.json   i tracciati `d`, in viewBox 512x512
  public/logo.svg                        marchio completo, `currentColor`

I tracciati sono due:

  hull      sagoma piena (marcature del campo comprese). La tacca della
            bandierina resta un **vuoto vero**: la punta è un pezzo staccato,
            quindi su qualunque fondo si vede il fondo, non un cerchio colorato.
  markings  pallone e marcature del campo (crema): dipinti sopra la sagoma.

I buchi "semantici" (tacca e fessure della base) non vanno riempiti: si
riempiono solo le marcature del campo, che sono dentro lo stelo, e i pentagoni
del pallone.

Gli altri file del marchio (favicon, icone app, immagine di condivisione) non
sono scritti qui: si generano da questi tracciati con `npm run build:brand`, così
usano per forza la stessa geometria e gli stessi colori dell'app.

Requisiti (non sono dipendenze del progetto, servono solo a rigenerare):

    python -m pip install numpy opencv-python pillow potracer

Uso:

    python scripts/trace-logo.py
    npm run build:icons     # rigenera i PNG in public/icons/
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
import potrace
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs" / "logo" / "riferimento.jpg"
PATHS_JSON = ROOT / "src" / "components" / "brand" / "logo-paths.json"

VIEWBOX = 512
BG = np.array([244, 254, 243], dtype=np.int16)  # carta del riferimento
INK_THRESHOLD = 290  # metà della distanza fra verde e carta: bordo antialias neutro

# Zone ricavate misurando il riferimento (pixel dell'immagine 2048x2048).
STEM_X = (853, 1266)  # lo stelo: dentro questa fascia ci sono solo marcature
BASE_Y = 1493  # sotto questa quota comincia la base a tre pezzi

CREAM = "#f5fcf6"


def ink_mask(img: np.ndarray) -> np.ndarray:
    """Verde = marchio. Soglia a metà strada fra carta e inchiostro."""
    return (np.abs(img.astype(np.int16) - BG).sum(2) > INK_THRESHOLD).astype(np.uint8)


def fill_enclosed_holes(mask: np.ndarray) -> np.ndarray:
    """Riempie i buchi chiusi (i pentagoni del pallone)."""
    inv = (1 - mask).astype(np.uint8)
    n, labels = cv2.connectedComponents(inv, 4)
    border = set(labels[0, :]) | set(labels[-1, :]) | set(labels[:, 0]) | set(labels[:, -1])
    holes = np.isin(labels, [i for i in range(1, n) if i not in border])
    return (mask | holes.astype(np.uint8)).astype(np.uint8)


def build_masks() -> tuple[np.ndarray, np.ndarray]:
    img = np.array(Image.open(SOURCE).convert("RGB"))
    if img.shape[:2] != (2048, 2048):
        raise SystemExit(f"il riferimento deve essere 2048x2048, è {img.shape[:2]}")

    ink = ink_mask(img)

    # marcature: i pentagoni (buchi chiusi) + tutto il vuoto dello stelo sotto il
    # pallone. La fascia parte sotto il pallone: lunga fino a metà stelo si
    # mangerebbe la calotta alta del cerchio di centrocampo, che resterebbe un
    # buco (e quindi nera su fondo scuro).
    pentagons = (fill_enclosed_holes(ink) & (1 - ink)).astype(np.uint8)
    ys, _ = np.nonzero(pentagons)
    ball_bottom = int(ys.max())
    stem_band = np.zeros_like(ink)
    stem_band[ball_bottom + 5 : BASE_Y, STEM_X[0] : STEM_X[1] + 1] = 1
    markings = ((pentagons | ((1 - ink) & stem_band)) > 0).astype(np.uint8)

    hull = ((ink | markings) > 0).astype(np.uint8)

    for name, mask in (("hull", hull), ("markings", markings)):
        if mask.sum() == 0:
            raise SystemExit(f"maschera {name} vuota: il riferimento è cambiato?")
    return hull, markings


def trace(mask: np.ndarray, transform) -> str:
    """Traccia una maschera in un path SVG. `transform` porta da pixel a viewBox."""
    # potracer chiama "bianco" il True: la maschera va passata invertita
    path = potrace.Bitmap(np.logical_not(mask.astype(bool))).trace()
    out: list[str] = []

    def emit(curve) -> None:
        x, y = transform(curve.start_point.x, curve.start_point.y)
        parts = [f"M{x:.1f} {y:.1f}"]
        for seg in curve.segments:
            if hasattr(seg, "c1"):  # BezierSegment
                c1x, c1y = transform(seg.c1.x, seg.c1.y)
                c2x, c2y = transform(seg.c2.x, seg.c2.y)
                ex, ey = transform(seg.end_point.x, seg.end_point.y)
                parts.append(f"C{c1x:.1f} {c1y:.1f} {c2x:.1f} {c2y:.1f} {ex:.1f} {ey:.1f}")
            else:  # CornerSegment
                ex, ey = transform(seg.c.x, seg.c.y)
                parts.append(f"L{ex:.1f} {ey:.1f}")
        parts.append("Z")
        out.append("".join(parts))
        for child in curve.children or []:
            emit(child)

    for curve in path.curves:
        emit(curve)
    return "".join(out)


def fitter(mask: np.ndarray, margin_ratio: float):
    """Trasformazione che centra il disegno in 512x512 con un margine."""
    ys, xs = np.nonzero(mask)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    avail = VIEWBOX * (1 - 2 * margin_ratio)
    scale = min(avail / (x1 - x0 + 1), avail / (y1 - y0 + 1))
    ox = (VIEWBOX - (x1 - x0 + 1) * scale) / 2
    oy = (VIEWBOX - (y1 - y0 + 1) * scale) / 2
    return lambda x, y: ((x - x0) * scale + ox, (y - y0) * scale + oy)


def svg(body: str) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" '
        'role="img" aria-label="Pall1">\n' + body + "</svg>\n"
    )


def main() -> None:
    hull, markings = build_masks()

    # Il marchio conserva il margine verticale del riferimento (16,6%).
    d_hull = trace(hull, fitter(hull, 0.166))
    d_markings = trace(markings, fitter(hull, 0.166))

    PATHS_JSON.write_text(
        json.dumps({"hull": d_hull, "markings": d_markings}, indent=2) + "\n"
    )

    (ROOT / "public" / "logo.svg").write_text(
        svg(
            "  <title>Pall1</title>\n"
            f'  <path fill="currentColor" d="{d_hull}"/>\n'
            f'  <path fill="{CREAM}" d="{d_markings}"/>\n',
        )
    )

    for name, d in (("hull", d_hull), ("markings", d_markings)):
        print(f"{name}: {len(d)} caratteri")
    print(f"scritti {PATHS_JSON.relative_to(ROOT)} e public/logo.svg")


if __name__ == "__main__":
    main()
