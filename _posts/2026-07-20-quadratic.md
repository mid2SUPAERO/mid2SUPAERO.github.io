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

              Σₑ₌₁ⁿ ρₑ vₑ ≤ V*

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
C = Σₑ₌₁ⁿ uₑᵀ Kₑ uₑ
```

where:

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
C = Σₑ₌₁ⁿ ρₑᵖ uₑᵀ Kₑ⁰ uₑ
```

---

# Compliance Sensitivity

The SIMP derivative is:

```
∂C/∂ρₑ = -p ρₑᵖ⁻¹ uₑᵀ Kₑ⁰ uₑ
```

which is the quantity used by OC (Optimality Criteria) and MMA update schemes.
