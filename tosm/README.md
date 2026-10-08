# TOSM · Distill

An interactive, Distill-style article built on the
[TOSM](https://github.com/mid2SUPAERO/TOSM) notebooks: **379 SimJEB jet-engine
brackets × 4 aerospace alloys = 1,516 finite-element runs**, each with mass,
peak stress, peak displacement and a production + lifetime footprint
(CO₂, energy, water, cost).

**Live page:** `https://mid2supaero.github.io/<repo-name>/`

## Figures

Every point is a SimJEB design: tooltips show the bracket's rendering, and any
bracket can be opened in a 3-D viewer with its SimJEB displacement rendering,
shape family, designer and GrabCAD link.

| # | Figure | Interaction |
|---|--------|-------------|
| 1 | Design space: footprint vs. peak von Mises stress, with each alloy's yield line | choose x-axis, filter alloys, hover links a bracket across alloys, click opens it in the 3-D inspector |
| 2 | SimJEB design gallery (379 brackets) + 3-D inspector | sort, filter by shape family / admissibility, rotate the mesh, switch to the displacement rendering |
| 3 | Production vs. use-phase CO₂ for the median bracket | slider on the 98.8 t/kg use-phase factor |
| 4 | % change of every output vs. the same bracket in Ti-6Al-4V | median + IQR or mean ± SD |
| 5 | Cumulative distribution of σ/σy per alloy | safety-factor slider |
| 6 | Pareto explorer (exact non-dominated sort, live), front listed with thumbnails | any 2 objectives, SF, constraint mode, alloys, per-alloy fronts, log axes |
| 7 | Saved notebook front vs. exact constrained front | hover |
| 8 | 3-D per-alloy fronts (stress, CO₂, displacement) | rotate, constraint toggle |

## A note on the constraint in `Pareto.ipynb`

pymoo treats `G <= 0` as feasible. The notebook uses
`G = -stress + yield_stress / safety_factor`, which only admits designs with
**stress ≥ σy/SF**. With the sign flipped (`G = stress - yield_stress / safety_factor`)
the stress–CO₂ front at SF = 1.25 moves from 14 over-stressed Al-2024 brackets
to 5 admissible Ti-6Al-4V brackets. `scripts/check_constraint.py` reproduces
both: NSGA-II (pop 100, 500 gen, seed 1) recovers the exact front in each case.

## Layout

```
index.html              the article
assets/style.css        styles (light + dark)
assets/app.js           all figures (D3 7.9.0, Plotly gl3d 2.35.2, three.js 0.147 from jsDelivr)
assets/simjeb/          SimJEB renderings (2 WebP sprites) and decimated meshes (8 .bin bundles)
data/tosm.json          compact dataset loaded by the page
data/simjeb.json        per-design SimJEB metadata, sprite order, mesh index
data/*.xlsx             source data copied from TOSM
scripts/build_data.py   regenerates data/tosm.json from the Excel files
scripts/build_simjeb_assets.py  regenerates assets/simjeb/ + data/simjeb.json from a SimJEB clone
scripts/check_constraint.py   NSGA-II vs. exact fronts, both constraint signs
.github/workflows/pages.yml   deploys to GitHub Pages on push to main
```

## Run locally

The page fetches `data/tosm.json`, so serve the folder over HTTP:

```bash
python -m http.server 8000   # then open http://localhost:8000
```

To rebuild the data after changing the Excel files:

```bash
pip install pandas openpyxl
python scripts/build_data.py
```

## Deploy

1. Create the repository under `mid2SUPAERO` and push this folder to `main`.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. The workflow publishes on every push to `main`.

## Credits

Ricard Maeso Orti and Pablo Ballesteros Martín (ISAE-SUPAERO), supervised by
Joseph Morlier. Data: SimJEB (Whalen, Beyene & Mueller, 2021); bracket
renderings, meshes and metadata from
[simjeb/simjeb.github.io](https://github.com/simjeb/simjeb.github.io)
(MIT licence, © 2021 simjeb), meshes decimated to ~5,000 triangles; material
footprints from Yepes Llorente, Morlier et al. (2024); use-phase CO₂ model from
Duriez et al. (2022).
