---
layout: post
title: "Why am I always discussing about quadratic form?"
date: 2026-07-19
categories: general
---

# Compliance Minimization in Topology Optimization

The design variables are the element densities:

```
ρ = (ρ₁, ρ₂, ..., ρₙ)ᵀ
```

The topology optimization problem is:

```
minimize      C(ρ) = fᵀu = uᵀK(ρ)u

subject to    K(ρ)u = f

              Σₑ ρₑ vₑ ≤ V*

              ρₘᵢₙ ≤ ρₑ ≤ 1
              e = 1,...,n
```

where:

- K(ρ) = global stiffness matrix
- u = displacement vector
- f = external load vector
- ρₑ = density of element e
- vₑ = volume of element e
- V* = prescribed volume constraint

---

# Quadratic Form

The compliance objective is the quadratic form:

```
C = uᵀ K u
```

or equivalently:

```
C = fᵀ u
```

because:

```
K u = f
```

---

# Quadratic Form in Different Languages

## MATLAB

Column vectors:

```matlab
C = u' * K * u;
```

Equivalent scalar product:

```matlab
C = dot(u, K*u);
```

For sparse FEM matrices:

```matlab
C = u' * (K*u);
```

---

## Julia

Using matrix multiplication:

```julia
C = u' * K * u
```

Recommended scalar form:

```julia
C = dot(u, K*u)
```

For sparse FEM:

```julia
C = dot(u, K*u)
```

with

```julia
K = sparse(K)
```

---

## Python (NumPy)

Using matrix multiplication:

```python
C = u.T @ K @ u
```

Equivalent:

```python
C = np.dot(u, K @ u)
```

For sparse FEM matrices:

```python
C = u @ (K @ u)
```

with:

```python
from scipy.sparse import csr_matrix

K = csr_matrix(K)
```

---

# Element-wise Compliance

The global compliance can be decomposed into element contributions:

```
C = Σₑ uₑᵀ Kₑ uₑ
```

where e runs over all elements: e = 1, ..., n

with

```
uₑ = element displacement vector


Kₑ = element stiffness matrix
```

---

# SIMP Material Interpolation

The element stiffness is interpolated as:

```
Kₑ(ρₑ) = ρₑᵖ Kₑ⁰

```

where:

```
p = penalization exponent
Kₑ⁰ = stiffness of solid material
```

Therefore:

```
C = Σₑ ρₑᵖ uₑᵀ Kₑ⁰ uₑ
```

---

# Compliance Sensitivity

The SIMP derivative is:

```
∂C/∂ρₑ = -p ρₑᵖ⁻¹ uₑᵀ Kₑ⁰ uₑ
```

which is the quantity used by OC (Optimality Criteria) and MMA update schemes.

In practice we are using SIMP formulation

# SIMP Material Interpolation

The Solid Isotropic Material with Penalization (SIMP) method introduces a

relationship between the design variable and the Young modulus of each

element.

The interpolation is:

```

Eₑ(xₑ) = Eₘᵢₙ + xₑᵖ (E₀ − Eₘᵢₙ)

```

where:

```

Eₑ(xₑ) = Young modulus of element e

E₀     = Young modulus of solid material

Eₘᵢₙ  = small stiffness assigned to void regions

xₑ     = density variable of element e

p      = penalization exponent (usually p ≈ 3)

```

The purpose of the penalization term:

```

xₑᵖ

```

is to discourage intermediate densities:

```

0 < xₑ < 1

```

and drive the solution toward a black-and-white topology:

```

solid  → xₑ = 1

void   → xₑ ≈ 0

```

---

# Element-wise Compliance with SIMP

The global compliance can be decomposed into element contributions:

```

C(x) = Σₑ Eₑ(xₑ) uₑᵀ k₀ uₑ

```

where:

```

uₑ = displacement vector of element e

k₀ = reference element stiffness matrix

Eₑ(xₑ) = SIMP interpolated Young modulus

```

Using the SIMP interpolation:

```

C(x)

=

Σₑ [Eₘᵢₙ + xₑᵖ(E₀ − Eₘᵢₙ)]

      uₑᵀ k₀ uₑ

```

The sum notation means:

```

Σₑ = sum over all finite elements

e = 1, ..., N

```

---

# Compliance Sensitivity

The derivative used by optimization algorithms

(Optimality Criteria, MMA, etc.) is:

```

∂C/∂xₑ

=

-p xₑᵖ⁻¹ (E₀ − Eₘᵢₙ)

uₑᵀ k₀ uₑ

```

This sensitivity tells how the compliance changes when the material

density of element `e` is modified.
