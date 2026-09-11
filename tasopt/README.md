# Weight, Drag, Thrust, Range — a TASOPT walkthrough

A pedagogical, distill-style explainer of Mark Drela's **TASOPT** aircraft-sizing
methodology (*TASOPT 2.00: Transport Aircraft System OPTimization, Technical
Description*, MIT, 2010) — the physics behind the open-source Julia code
[MIT-LAE/TASOPT.jl](https://github.com/MIT-LAE/TASOPT.jl) — plus a runnable
Python notebook that reimplements the sizing loop from scratch and checks it
against a real Boeing 737-800.

## What's here

| Path | What it is |
|---|---|
| [`index.html`](index.html) | The article itself. Structures, aerodynamics, propulsion, and mission analysis, in the order Drela's technical description builds them, with four interactive calculators (fuselage sizing, aspect-ratio trade-off, engine station explorer, Breguet range). Real math via [KaTeX](https://katex.org), no build step — open it directly or serve it with GitHub Pages. |
| [`notebook/tasopt_lite.ipynb`](notebook/tasopt_lite.ipynb) | A ~250-line, from-scratch Python port of the sizing loop. Pre-executed: every cell's output, including a matplotlib comparison chart against real 737-800 specs, is already saved in the notebook, so it's readable without rerunning anything. |
| `notebook/tasopt_lite.py` | The same model as one plain script, for anyone without Jupyter. |

## Viewing the article

**GitHub Pages** (recommended): Settings → Pages → Deploy from a branch → pick
`main` and `/ (root)`. The page will be live at
`https://<your-username>.github.io/<your-repo>/`.

**Locally**: just open `index.html` in a browser. It has no build step and no
local dependencies — the only network calls are to Google Fonts and the
[KaTeX](https://katex.org) CDN (cdnjs) for math typesetting, both loaded over
HTTPS.

## Running the notebook

```bash
pip install numpy matplotlib jupyter
jupyter notebook notebook/tasopt_lite.ipynb
```

Every cell already has its output saved, so you can also just read it
top to bottom on GitHub without running anything — GitHub renders `.ipynb`
files natively.

## What this is (and isn't)

This is a **reduced-order teaching model**, not a reimplementation of
TASOPT.jl. Section 9 of the article and the notebook's closing cells spell
out exactly what was simplified — constant-`cp` gas thermodynamics instead of
`cp(T)`, a single design-point Brayton cycle instead of off-design compressor
maps, flat-plate skin friction instead of a transonic-airfoil CFD database,
and so on. The point isn't to match TASOPT's fidelity; it's to keep the same
*loop* — stress-driven structural weights, a real thermodynamic cycle, and a
physically derived range equation, iterated to a fixed point — and see how
close that gets on its own. (Answer: within about 8% on MTOW and wingspan,
worse on individual components like OEW and engine thrust — which is itself
a useful lesson in how a fixed-point loop can mask compounding sub-model
error. See notebook Section 10.)

## Before you publish

- Update the "Cite this page as" box near the bottom of `index.html` with
  your actual GitHub URL — it currently has a `<your-username>/<your-repo>`
  placeholder.
- This repo doesn't include a license. If you want to make reuse terms
  explicit, add a `LICENSE` file (GitHub's repo-creation flow can generate
  one for you — MIT and CC-BY-4.0 are both common choices for
  code-plus-writing repos like this one).

## Attribution

Primary source: M. Drela, *TASOPT 2.00 Technical Description*, MIT, 2010.
Article prose, figures, interactive calculators, and the companion notebook
were drafted with assistance from [Claude](https://claude.com). Full
references are listed at the bottom of the article.
