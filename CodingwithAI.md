---
layout: page
title: Vibe coding
permalink: /CodingwithAI.html
---

Vibe coding is a software development approach where you build applications entirely by conversing with an AI in natural language. Instead of writing code line-by-line, you describe your vision or "vibe," and AI models handle the generation, testing, and deployment, allowing you to focus purely on the creative outcome. 

https://en.wikipedia.org/wiki/Vibe_coding


# Old project recreated with my friend Claude (Anthropic)

# Start your research example with HelloProf on patreon or buy me a coffee

My first example: 

REMAL: Residual Equilibrium Manifold Active Learning for Surrogate-Based Multidisciplinary Design Analysis
by Kail Yuan, Ashwin Renganathan

Abstract 
Multidisciplinary design analysis of coupled engineering systems requires the computation of equilibrium states in which all disciplinary coupling variables are mutually consistent. Conventional fixed-point iteration resolves this consistency problem separately at each design point, which can become expensive when disciplinary evaluations are costly and many analyses are required in outer-loop tasks such as multidisciplinary design optimization, uncertainty quantification, or digital twin updating. This paper introduces REMAL, a residual manifold surrogate modeling framework for coupled systems. Instead of approximating each discipline independently or directly learning converged coupling variables, the proposed method learns a surrogate model of the joint residual manifold via multitask Gaussian process models. An entropy-based active learning strategy selects additional residual evaluations near uncertain zero-contour regions, and equilibrium states for new design inputs are recovered by solving a nonlinear least squares optimization problem using only the trained surrogate. The method is evaluated on four engineering coupled system benchmarks: a satellite model, an aerostructural model, a finite-element gas-turbine heat-transfer and economics model, and a modified turbine model with added feedback coupling. Across these cases, REMAL consistently demonstrates the cost effectiveness when repeated evaluations of the fixed point across the design space are necessary. Theoretically, we show that, under mild assumptions, REMAL's predictive fixed point error is bounded.
Paper: https://arxiv.org/abs/2606.13245

code: 
