"""Build data/tosm.json (the compact dataset the page loads) from the TOSM Excel files.

    python scripts/build_data.py
"""
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
ORDER = ["Ti-6Al-4V", "Al-2024", "AISI 304", "BeCu C17000"]  # fixes material index + colour slot


def num(v, nd):
    return None if pd.isna(v) else round(float(v), nd)


def main():
    res = pd.read_excel(DATA / "FinalResults.xlsx", sheet_name="FR")
    mat = pd.read_excel(DATA / "Materials.xlsx")
    idx = {name: i for i, name in enumerate(ORDER)}

    rows = [
        [int(r["Name"]), idx[r["Material"].strip()], num(r["Mass [kg]"], 5), int(r["Max VM [MPa]"]),
         num(r["Max Disp [mm]"], 3), num(r["CO2 [t]"], 3), num(r["Energy [MJ]"], 3),
         num(r["Water [L]"], 3), num(r["Cost [$]"], 4)]
        for _, r in res.iterrows()
    ]
    mats = []
    for name in ORDER:
        m = mat[mat["Material"] == name].iloc[0]
        mats.append(dict(
            name=name, cls=m["Class"], E=int(m["E [MPa]"]), ys=float(m["Yield_Str [MPa]"]),
            rho=round(float(m["Density [t/mm^3]"]) * 1e12, 3), nu=float(m["Poisson [-]"]),
            cost=float(m["Cost [$/kg]"]), co2=float(m["CO2 [kg/kg]"]),
            energy=float(m["Energy [J/kg]"]) / 1e6, water=float(m["Water [L/kg]"]),
        ))
    out = dict(cols=["id", "m", "mass", "vm", "disp", "co2", "energy", "water", "cost"], rows=rows, mats=mats)
    (DATA / "tosm.json").write_text(json.dumps(out, separators=(",", ":")))
    print(f"wrote data/tosm.json: {len(rows)} runs, {len(mats)} materials")


if __name__ == "__main__":
    main()
