---
layout: page
title: Blog
permalink: /blog.html
---

# Blog Feed & Reading List

Welcome to the blog section. Below is a curated list of articles, tutorials, and deep-dives on the things I would have been very happy to write. A must read !!!

---

### [A Visual Exploration of Gaussian Processes](https://distill.pub/2019/visual-exploration-gaussian-processes/)
* **Authors:** Jochen Görtler, Rebecca Kehlbeck, Oliver Deussen
* **Published:** April 2019
* **Link:** [Read Article](https://distill.pub/2019/visual-exploration-gaussian-processes/)

**Summary:** One of the best interactive introductions to Gaussian Processes ever written. Through rich visualizations and intuitive explanations, the authors demystify Gaussian Process regression by showing how prior beliefs, covariance kernels, observations, and uncertainty combine to produce predictive models. Whether you are new to surrogate modeling or need a deeper intuition for kernels and confidence intervals, this article is an outstanding starting point.  [Launch demo](https://distill.pub/2019/visual-exploration-gaussian-processes/?utm_source=chatgpt.com)

---

### [A Practical Guide to Gaussian Processes](https://infallible-thompson-49de36.netlify.app/)
* **Authors:** Marc Peter Deisenroth, Yicheng Luo, Mark van der Wilk
* **Published:** One of the first distill
* **Link:** [Launch Demo](https://infallible-thompson-49de36.netlify.app/)

**Summary:** A lightweight interactive playground for experimenting with Gaussian Process regression. By manipulating training points and observing the posterior prediction update in real time, the demo provides an intuitive understanding of interpolation, uncertainty quantification, and the influence of kernel hyperparameters. It is an excellent companion to the Distill article for building hands-on intuition before implementing Gaussian Processes in practice.

---

### [Exploring Bayesian Optimization](https://distill.pub/2020/bayesian-optimization/)
* **Authors:** Apoorv Agnihotri, Nipun Batra
* **Published:** May 5, 2020
* **Link:** [Launch demo](https://distill.pub/2020/bayesian-optimization/)

**Summary:** A beautifully illustrated introduction to Bayesian Optimization, the sequential optimization framework that leverages Gaussian Process surrogate models to efficiently optimize expensive black-box functions. The article explains the exploration–exploitation trade-off, acquisition functions such as Expected Improvement and Upper Confidence Bound, and demonstrates why Bayesian Optimization has become a standard tool for hyperparameter tuning, engineering design, and simulation-based optimization. Like the earlier Distill article, it combines rigorous mathematics with exceptional interactive visualizations, making a challenging topic remarkably accessible.  

---
---

### [The Economics of AI Surrogates](https://jajimer.github.io/2026/06/12/economics-of-ai-surrogates/)
* **Author:** J. Ajimer  
* **Published:** June 12, 2026  
* **Link:** [Read Article](https://jajimer.github.io/2026/06/12/economics-of-ai-surrogates/)

**Summary:** An exploration into the financial, computational, and strategic trade-offs of deploying Artificial Intelligence surrogates in industry. This piece discusses the cost-benefit analysis of training computationally heavy machine learning models to replace traditional high-fidelity simulations, outlining when the upfront resource investment yields a net positive return on operational efficiency.

---

### [Surrogate-Based Optimization (SBO)](https://mdobook.github.io/html/sbo/)
* **Source:** Engineering Design Optimization (MDO Book)  
* **Link:** [Read Chapter](https://mdobook.github.io/html/sbo/)

**Summary:** A comprehensive structural overview of Surrogate-Based Optimization (SBO) frameworks. This reference details how response surface models or metamodels act as data-driven "curve fits" to approximate complex functional outputs. It explains the mechanics of using fast-to-compute surrogates to guide optimizers to true mathematical optimums without constantly querying expensive high-fidelity underlying functions.

---

### [A Topology Optimization Tutorial](https://greydanus.github.io/2022/05/08/structural-optimization/)
* **Author:** Sam Greydanus  
* **Published:** May 8, 2022  
* **Link:** [Read Tutorial](https://greydanus.github.io/2022/05/08/structural-optimization/)

**Summary:** A hands-on, deeply technical tutorial on topology and structural optimization. The post breaks down the mathematics behind minimizing elastic potential energy (compliance) across a 2D grid of springs. It covers crucial implementation steps, including computing sensitivities, solving large-scale sparse matrices using SciPy's SuperLU, and defining custom Autograd gradients to bridge physics simulations with automatic differentiation.

---
### [A Structural Optimization Tutorial](https://meyer-nils.github.io/structural_optimization/)
* **Author:** Niels Meyer
* **Published:** April 2026 
* **Link:** [Read Tutorial](https://meyer-nils.github.io/structural_optimization/fem_optimization.html)

**Summary:** 
This is accompanying code for Niels Meyer's Structural Optimization lecture MRM-0156. A must read !

---


### [PLAID — Physics Learning AI Data Model](https://plaid-lib.github.io)
* **Author:** Fabien Cazenave 
* **Published:** August 5, 2025 
* **Link:** [Read Benchmark](https://plaid-lib.github.io/benchmarks/#interactive-benchmark-applications)

**Summary:** The missing data layer between physics simulations and scientific ML.
PLAID is an open framework for representing, sharing, and learning from datasets of complex physics simulations. It defines a common standard for simulation data and ships a Python library to create, explore, store, and stream them. Why another data model?
Mainstream ML stacks (Hugging Face, PyTorch, TensorFlow) assume data is regular, homogeneous, and columnar. Real simulation data is not: it is hierarchical and multi-zone, with heterogeneous fields, shapes, and metadata, often governed by implicit, solver-specific conventions. Flattening or padding it into tabular form is error-prone, memory-hungry, and erases the physical structure the model should learn from.

---
