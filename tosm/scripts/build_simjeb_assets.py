"""Build the SimJEB design assets used by the gallery, tooltips and 3-D viewer.

Needs a clone of the SimJEB website repository (MIT licence, ~2 GB):

    git clone --depth 1 https://github.com/simjeb/simjeb.github.io /tmp/simjeb
    pip install pandas openpyxl pillow numpy trimesh fast-simplification
    python scripts/build_simjeb_assets.py /tmp/simjeb

Writes
  assets/simjeb/iso.webp               20-column sprite of SimJEB's iso renderings (150 px cells)
  assets/simjeb/iso_ver_magdisp.webp   same, displacement renderings, vertical load case (300 px cells)
  assets/simjeb/meshes_<k>.bin         decimated meshes (~5,000 triangles), uint16-quantised, 8 bundles
  data/simjeb.json                     per-design metadata, sprite order and mesh index
"""
import json
import sys
from pathlib import Path

import fast_simplification
import numpy as np
import pandas as pd
import trimesh
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SJ = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/simjeb") / "data"
OUT = ROOT / "assets" / "simjeb"
OUT.mkdir(parents=True, exist_ok=True)
COLS, TARGET_FACES, NBUNDLES = 20, 5000, 8

ids = sorted(int(i) for i in pd.read_excel(ROOT / "data" / "FinalResults.xlsx", sheet_name="FR")["Name"].unique())


def render_path(kind, i):
    return SJ / "renderings" / kind / (f"{i}_ver_magdisp.png" if kind == "iso_ver_magdisp" else f"{i}.png")


def sprite(kind, cell, quality):
    # one square crop shared by every image keeps all brackets at the same scale
    bb = [10**9, 10**9, 0, 0]
    for i in ids:
        ys, xs = np.where(np.asarray(Image.open(render_path(kind, i)))[:, :, 3] > 8)
        bb = [min(bb[0], xs.min()), min(bb[1], ys.min()), max(bb[2], xs.max()), max(bb[3], ys.max())]
    s = max(bb[2] - bb[0], bb[3] - bb[1]) + 1
    cx, cy = (bb[0] + bb[2]) // 2, (bb[1] + bb[3]) // 2
    box = (cx - s // 2, cy - s // 2, cx - s // 2 + s, cy - s // 2 + s)
    rows = -(-len(ids) // COLS)
    sheet = Image.new("RGBA", (COLS * cell, rows * cell), (0, 0, 0, 0))
    for k, i in enumerate(ids):
        im = Image.open(render_path(kind, i)).convert("RGBA").crop(box).resize((cell, cell), Image.LANCZOS)
        sheet.paste(im, ((k % COLS) * cell, (k // COLS) * cell))
    sheet.save(OUT / f"{kind}.webp", "WEBP", quality=quality, method=4)


def meshes():
    geo, lo, hi = {}, np.full(3, np.inf), np.full(3, -np.inf)
    for i in ids:
        m = trimesh.load(SJ / "meshes" / f"{i}.obj", process=False)
        v, f = np.asarray(m.vertices, np.float32), np.asarray(m.faces, np.int32)
        if len(f) > TARGET_FACES:
            v, f = fast_simplification.simplify(v, f, target_reduction=1 - TARGET_FACES / len(f))
        geo[i] = (v.astype(np.float32), f.astype(np.uint32))
        lo, hi = np.minimum(lo, v.min(0)), np.maximum(hi, v.max(0))
    scale = (hi - lo) / 65535.0
    bufs, index = [bytearray() for _ in range(NBUNDLES)], {}

    def pad(b):
        b += b"\0" * (-len(b) % 4)

    for k, i in enumerate(ids):
        v, f = geo[i]
        b = bufs[k % NBUNDLES]
        off = len(b); b += np.round((v - lo) / scale).astype(np.uint16).tobytes(); pad(b)
        idx = f.astype(np.uint16 if len(v) < 65536 else np.uint32)
        foff = len(b); b += idx.tobytes(); pad(b)
        index[i] = [k % NBUNDLES, off, len(v), foff, len(f), idx.itemsize]
    for k, b in enumerate(bufs):
        (OUT / f"meshes_{k}.bin").write_bytes(b)
    return {"min": lo.tolist(), "scale": scale.tolist(), "index": index}


def designs():
    s = pd.read_csv(SJ / "all_bracket_metadata.csv").set_index("id")
    cols = ["max_ver_stress", "max_hor_stress", "max_dia_stress", "max_tor_stress"]
    return {i: [s.at[i, "category"], str(s.at[i, "author"]), str(s.at[i, "link_name"]),
                round(float(s.loc[i, cols].max()), 1), None if pd.isna(s.at[i, "genus"]) else int(s.at[i, "genus"])]
            for i in ids}


if __name__ == "__main__":
    sprite("iso", 150, 78)
    sprite("iso_ver_magdisp", 300, 80)
    out = {"designs": designs(), "sprite": {"ids": ids, "cols": COLS}, "mesh": meshes()}
    (ROOT / "data" / "simjeb.json").write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False))
    print(f"wrote assets/simjeb and data/simjeb.json for {len(ids)} brackets")
