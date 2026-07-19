---
layout: page
title: Vibe coding
permalink: /CodingwithAI.html
---


# My Starting point

In high school in france we were few students (geek ?) with a HP 48G calculator. I discovered the Reverse Polish Notation (RPN) and the RPL programming language and more important the assembly language. 

[More on HP48](https://en.wikipedia.org/wiki/HP_48_series)

[More on Assembly language](https://en.wikipedia.org/wiki/Assembly_language)

I've started coding in C during my final research project at University. Au menu: FFT2D, Hough Transform with Dennis Ritchie's book. I also remember during my MsC that I coded the Simplex algorithm on my HP48G and some basic MLP using Matlab in a course called Artificial Neural Networks (the story is not ended).
[More on Dennis](https://en.wikipedia.org/wiki/Dennis_Ritchie)
[More on Simplex](https://en.wikipedia.org/wiki/Simplex_algorithm)

Then ... I used Matlab as a numerical framework for wavelets analysis and vibration processing (modal analysis) during my PhD. I remember the transition from "matrix" movie nightmare in C to a very flexible and easy to run Matlab's framework. I was using Cleve Moler's book Finally, several years later I met Cleve Moler one of the founder of Matlab. It was really fun. At this time Stephane Mallat's book on wavelets was my bedside book as well as a Pete Avitabile Modal space short (educational) papers. Oh BTW, it is important for my story to say that I also create a database and coded a MLP in matlab for some pattern recognition purposes using this book: Apprentissage statistique : réseaux de neurones, cartes topologiques, machines à vecteurs supports, Eyrolles, 2008. from Gérard Dreyfus, Jean-Marc Martinez, Manuel Samuelides, Mirta Gordon, Fouad Badran et Sylvie Thiria.

[More on Cleve](https://en.wikipedia.org/wiki/Cleve_Moler)
[More on Stephane](https://www.college-de-france.fr/en/person/stephane-mallat)
[More on Pete](https://www.uml.edu/research/sdasl/education/modal-space.aspx)
[More on Manuel](https://www.researchgate.net/profile/Manuel-Samuelides/4)


And then in 2006, I become Manuel's colleague and started to work with him on structural optimization few years later.

And do you know why I'm still teaching with Matlab ? (but I also add Python/Julia Scripts)

Mainly for the fact that each function as a full documentation citing the reference paper for the implementation.

Example for fft function in matlab:

[1] FFTW (https://www.fftw.org)

[2] Frigo, M., and S. G. Johnson. “FFTW: An Adaptive Software Architecture for the FFT.” Proceedings of the International Conference on Acoustics, Speech, and Signal Processing. Vol. 3, 1998, pp. 1381-1384.


And that changes everything for me.

Then came stable Python 2.4 (last year of my PhD), and then Github... then Colab... then ChatGPT/Claude/Gemini ...AntiGravity etc.

# Definition of Vibe Coding

Vibe coding is a software development approach where you build applications entirely by conversing with an AI in natural language. Instead of writing code line-by-line, you describe your vision or "vibe," and AI models handle the generation, testing, and deployment, allowing you to focus purely on the creative outcome. 

[Vibe coding](https://en.wikipedia.org/wiki/Vibe_coding)


# Recreation with my friend Claude (Anthropic)

---

### [REMAL](https://arxiv.org/html/2606.13245v1)
* **Authors:** Kail Yuan, Ashwin Renganathan 
* **Published:** June 11, 2026  
* **Link:** [Read Article](https://arxiv.org/abs/2606.13245)

**Summary:** Multidisciplinary design analysis of coupled engineering systems requires the computation of equilibrium states in which all disciplinary coupling variables are mutually consistent. Conventional fixed-point iteration resolves this consistency problem separately at each design point, which can become expensive when disciplinary evaluations are costly and many analyses are required in outer-loop tasks such as multidisciplinary design optimization, uncertainty quantification, or digital twin updating. This paper introduces REMAL, a residual manifold surrogate modeling framework for coupled systems. Instead of approximating each discipline independently or directly learning converged coupling variables, the proposed method learns a surrogate model of the joint residual manifold via multitask Gaussian process models. An entropy-based active learning strategy selects additional residual evaluations near uncertain zero-contour regions, and equilibrium states for new design inputs are recovered by solving a nonlinear least squares optimization problem using only the trained surrogate. The method is evaluated on four engineering coupled system benchmarks: a satellite model, an aerostructural model, a finite-element gas-turbine heat-transfer and economics model, and a modified turbine model with added feedback coupling. Across these cases, REMAL consistently demonstrates the cost effectiveness when repeated evaluations of the fixed point across the design space are necessary. Theoretically, we show that, under mild assumptions, REMAL's predictive fixed point error is bounded.

* **Link:** [Play with the vibecode, it works on colab](https://github.com/mid2SUPAERO/mid2SUPAERO.github.io/blob/main/_notebooks/REMAL_CasADi.ipynb)


---

---

### Do you want to do the same ? follow HelloProf on patreon or buy me a coffee
* **Author:** J.Morlier 
 

---




