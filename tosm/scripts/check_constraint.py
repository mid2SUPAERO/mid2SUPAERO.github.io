"""Reproduce Figure 6: the notebook's NSGA-II front vs. the exact constrained front.

pymoo treats G <= 0 as feasible. Pareto.ipynb uses G = -stress + yield/SF, which
admits only designs with stress >= yield/SF. This script shows both fronts.

    pip install pymoo pandas openpyxl
    python scripts/check_constraint.py
"""
from pathlib import Path

import numpy as np
import pandas as pd
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.core.problem import Problem
from pymoo.operators.crossover.sbx import SBX
from pymoo.operators.mutation.pm import PM
from pymoo.operators.sampling.rnd import FloatRandomSampling
from pymoo.optimize import minimize

DATA = Path(__file__).resolve().parents[1] / "data"
SF = 1.25

d = pd.read_excel(DATA / "FinalResults.xlsx", sheet_name="FR")
m = pd.read_excel(DATA / "Materials.xlsx")
ys = d["Material"].map(dict(zip(m["Material"], m["Yield_Str [MPa]"]))).to_numpy()
S = d["Max VM [MPa]"].to_numpy(float)
F = np.c_[S, d["CO2 [t]"].to_numpy()]


def exact_front(mask):
    idx = np.where(mask)[0]
    keep = [i for i in idx if not np.any(np.all(F[idx] <= F[i], 1) & np.any(F[idx] < F[i], 1))]
    return d.iloc[keep].drop_duplicates(["Max VM [MPa]", "CO2 [t]"]).sort_values("Max VM [MPa]")


class StressCO2(Problem):
    def __init__(self, sign):
        super().__init__(n_var=1, n_obj=2, n_ieq_constr=1, xl=0, xu=len(d) - 1)
        self.sign = sign

    def _evaluate(self, X, out, *args, **kwargs):
        i = X[:, 0].astype(int)
        out["F"] = F[i]
        out["G"] = (self.sign * (S[i] - ys[i] / SF)).reshape(-1, 1)


def nsga(sign):
    alg = NSGA2(pop_size=100, n_offsprings=200, sampling=FloatRandomSampling(),
                crossover=SBX(prob=0.9, eta=15), mutation=PM(eta=20), eliminate_duplicates=True)
    res = minimize(StressCO2(sign), alg, ("n_gen", 500), seed=1)
    return sorted({tuple(float(x) for x in r) for r in np.round(res.F, 3)}) if res.F is not None else []


cols = ["Name", "Material", "Max VM [MPa]", "CO2 [t]"]
print("Exact front, stress <= yield/SF (intended):")
print(exact_front(S <= ys / SF)[cols].to_string(index=False))
print("\nExact front, stress >= yield/SF (as coded in Pareto.ipynb):")
print(exact_front(S >= ys / SF)[cols].to_string(index=False))
print("\nNSGA-II with the notebook's sign (G = -stress + yield/SF):", nsga(-1))
print("NSGA-II with the corrected sign (G = stress - yield/SF):", nsga(+1))
