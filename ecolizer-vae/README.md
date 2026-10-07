# Mapping the Ecolizer

A Distill-style article and a Jupyter notebook for the ecodesign course (ISAE-SUPAERO). A small variational autoencoder (VAE) is trained on the
eco-indicators of the **OVAM Ecolizer 2.0** (193 materials, 294 processing indicators, 61 energy and transport entries) and the results are explored with six interactive figures.

```
index.html                  the article (Distill template, loaded from distill.pub)
assets/js/widgets.js        the six interactive figures (D3; the VAE decoders run in the browser)
assets/js/data.js           data + trained decoder weights (generated, see below)
assets/js/d3.min.js         D3 v7 (vendored so the figures work offline)
assets/css/widgets.css
data/ecolizer_materials.csv       curated materials table (mPt/kg)
data/ecolizer_processes.csv       processing indicators
data/ecolizer_energy_transport.csv
data/vae_data.json, explorer_data.json   exported by the notebook
notebook/ecolizer_vae.ipynb       analysis + VAE (executed, with outputs)
scripts/                    PDF parsing and table building
```

## Publish

Copy the folder next to the other two articles so that the cross-links work:

```
ashby-maps/   ashby-maps-renewed/   ecolizer-vae/
```

and serve it with GitHub Pages (`.nojekyll` is included). `index.html` also works from a local web server (`python3 -m http.server`); the Distill template itself needs internet access.

## Reproduce

```bash
pip install numpy pandas matplotlib scikit-learn torch jupyter
cd notebook && jupyter lab ecolizer_vae.ipynb          # run all cells (about a minute on a CPU)
python ../scripts/make_web_data.py                      # wraps the exported JSON into assets/js/data.js
```

To rebuild the tables from the PDF (not redistributed here; get it from OVAM):

```bash
pip install pdfplumber
cd scripts && python parse_ecolizer.py /path/to/Ecolizer-2.0-LCA-tables.pdf
python build_dataset.py && python build_processes.py && python build_energy.py
```

## Data provenance and caveats

* Production, recycling, waste-treatment, processing, energy and transport indicators come from the Ecolizer PDF. The steel sheet (booklet p. 22) is a raster image and was typed in by hand.
  Wood panels and concrete are given per m³ in the PDF and were converted to mPt/kg with an assumed density (column `unit_conversion`).
* **Density ρ and Young's modulus E are not in the Ecolizer.** They are rounded typical handbook values (column `props_approx = 1`) added for the eco-Ashby indices and the VAE.
* Checks against the booklet's own worked examples pass (coffee machine electricity 375 kWh × 31 mPt/kWh = 11 625 mPt; chair seating 2 kg × 276 mPt/kg = 552 mPt).
* The booklet states that its numbers carry a relatively high uncertainty and that it is meant for internal ecodesign use, not for environmental marketing or for comparison with other data sets. The same applies here.
* The VAE is a visualisation and interpolation device. In the notebook it is shown **not** to recover density and modulus reliably from the eco-profile alone (section 4).

The Ecolizer 2.0 is © OVAM (Openbare Vlaamse Afvalstoffenmaatschappij).
