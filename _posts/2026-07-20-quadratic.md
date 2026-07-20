---
layout: post
title: "Why am I always discussing about quadratic form?"
date: 2026-07-19
categories: general
---

# Compliance Minimization in Topology Optimization

Given the element densities

$begin:math:display$
\\boldsymbol\{\\rho\} \= \(\\rho\_1\,\\ldots\,\\rho\_n\)\^T\,
$end:math:display$

the topology optimization problem is

$begin:math:display$
\\begin\{aligned\}
\\min\_\{\\boldsymbol\{\\rho\}\} \\quad \& C\(\\boldsymbol\{\\rho\}\)
    \= \\mathbf\{f\}\^T\\mathbf\{u\}
    \= \\mathbf\{u\}\^T\\mathbf\{K\}\(\\boldsymbol\{\\rho\}\)\\mathbf\{u\} \\\\
\\text\{s\.t\.\} \\quad
\& \\mathbf\{K\}\(\\boldsymbol\{\\rho\}\)\\mathbf\{u\} \= \\mathbf\{f\}\, \\\\
\& \\sum\_\{e\=1\}\^\{n\} \\rho\_e v\_e \\leq V\^\\star\, \\\\
\& 0 \< \\rho\_\{\\min\} \\leq \\rho\_e \\leq 1\,
\\qquad e\=1\,\\ldots\,n\.
\\end\{aligned\}
$end:math:display$

where

- $begin:math:text$\\mathbf\{K\}\(\\boldsymbol\{\\rho\}\)$end:math:text$ is the global stiffness matrix,
- $begin:math:text$\\mathbf\{u\}$end:math:text$ is the displacement vector,
- $begin:math:text$\\mathbf\{f\}$end:math:text$ is the external load vector,
- $begin:math:text$v\_e$end:math:text$ is the volume of element $begin:math:text$e$end:math:text$,
- $begin:math:text$V\^\\star$end:math:text$ is the prescribed material volume.

---

## Quadratic Form

The compliance is commonly written as

$begin:math:display$
C \= \\mathbf\{u\}\^T\\mathbf\{K\}\\mathbf\{u\}\.
$end:math:display$

### MATLAB

```matlab
C = u' * K * u;
```

or equivalently

```matlab
C = dot(u, K*u);
```

---

### Julia

```julia
C = u' * K * u
```

Since `u' * K * u` returns a `1×1` object for matrices, many users write

```julia
C = dot(u, K*u)
```

which directly returns a scalar and is generally preferred.

---

### Python (NumPy)

```python
C = u.T @ K @ u
```

or

```python
C = np.dot(u, K @ u)
```

Both return the scalar quadratic form when `u` is a one-dimensional NumPy array.

---

## Element-wise Compliance

The objective is often assembled from elemental contributions,

$begin:math:display$
C
\=
\\sum\_\{e\=1\}\^\{n\}
\\mathbf\{u\}\_e\^T
\\mathbf\{K\}\_e
\\mathbf\{u\}\_e\,
$end:math:display$

where

- $begin:math:text$\\mathbf\{u\}\_e$end:math:text$ are the element degrees of freedom,
- $begin:math:text$\\mathbf\{K\}\_e$end:math:text$ is the element stiffness matrix.

With SIMP interpolation,

$begin:math:display$
\\mathbf\{K\}\_e\(\\rho\_e\)
\=
\\rho\_e\^p
\\mathbf\{K\}\_e\^0\,
$end:math:display$

so that

$begin:math:display$
C
\=
\\sum\_\{e\=1\}\^\{n\}
\\rho\_e\^p
\\mathbf\{u\}\_e\^T
\\mathbf\{K\}\_e\^0
\\mathbf\{u\}\_e\.
$end:math:display$
