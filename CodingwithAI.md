---
layout: page
title: Vibe coding
permalink: /CodingwithAI.html
---


💻 “Vibe Coding”
As AI assistants are transforming the way we write software, I want to explore a simple question:
Can we faithfully recreate scientific software directly from published papers?

In this series, I’ll rebuild open-source implementations of classical and modern scientific methods—from optimization and surrogate modeling to computational mechanics and machine learning—using AI-assisted development. The goal isn’t merely to generate code, but to understand the underlying algorithms, assess reproducibility, and make research software more accessible to students and researchers.

# My Starting Point (polished with ChatGPT)

Back in high school in France, a small group of us—the geeks, perhaps—owned an HP 48G calculator. Looking back, that little machine probably changed the course of my career.

It introduced me to **Reverse Polish Notation (RPN)**, then to the **RPL programming language**, and eventually to something even more fascinating: **assembly language**. It was the first time I experienced what programming really meant—understanding how a machine thinks.

- [More on the HP 48](https://en.wikipedia.org/wiki/HP_48_series)
- [More on Assembly language](https://en.wikipedia.org/wiki/Assembly_language)

University was my next turning point. During my final research project at **ENSEIRB (University of Bordeaux)**, I started programming in **C**, learning from Dennis Ritchie's legendary book while implementing algorithms such as **2D FFTs** and the **Hough Transform**.

Around the same period, during my MSc in Mechatronics, I remember implementing the **Simplex algorithm** directly on my HP 48G. Yes, on a calculator. I also built some of my first **multilayer perceptrons (MLPs)** in MATLAB as part of an *Artificial Neural Networks* course.

Looking back, I realize that machine learning had already entered the story—long before it became fashionable.

- [More on Dennis Ritchie](https://en.wikipedia.org/wiki/Dennis_Ritchie)
- [More on the Simplex algorithm](https://en.wikipedia.org/wiki/Simplex_algorithm)

Then came my PhD.

MATLAB became my everyday scientific companion for **wavelet analysis**, **modal analysis**, and **vibration processing**. After years of wrestling with multidimensional arrays in C, MATLAB felt almost magical: concise, expressive, and designed for scientific computing.

Cleve Moler's books were constant companions. Years later, I had the pleasure of meeting **Cleve Moler**, one of MATLAB's founders—a memorable moment for someone who had learned so much from his work.

At the same time, Stéphane Mallat's *Wavelet Tour* rarely left my desk, while Pete Avitabile's *Modal Space* papers became an invaluable source of practical engineering insight.

My PhD also marked my first real experience with machine learning applied to engineering. I built databases, developed MATLAB implementations of MLPs for pattern recognition, and learned from Gérard Dreyfus and colleagues' excellent book *Apprentissage statistique : réseaux de neurones, cartes topologiques, machines à vecteurs supports* (Eyrolles, 2008).

- [More on Cleve Moler](https://en.wikipedia.org/wiki/Cleve_Moler)
- [More on Stéphane Mallat](https://www.college-de-france.fr/en/person/stephane-mallat)
- [More on Pete Avitabile](https://www.uml.edu/research/sdasl/education/modal-space.aspx)
- [More on Manuel Samuelides](https://www.researchgate.net/profile/Manuel-Samuelides/4)

Then, in 2006, another unexpected chapter began.

I became **Manuel Samuelides' colleague**, and a few years later we started collaborating on structural optimization. It's funny how books that shape your education sometimes lead you to work alongside their authors.

## Why I Still Teach with MATLAB

People often ask me why I still teach with MATLAB, even though I also use and teach **Python** and **Julia**.

The answer has very little to do with syntax.

One of MATLAB's greatest strengths, in my opinion, is the quality of its documentation. Every important numerical function is carefully documented, and the implementation is almost always linked to the original scientific literature.

Take `fft`, for example. Its documentation doesn't just explain how to call the function—it points you directly to the algorithms behind it:

1. FFTW — https://www.fftw.org
2. Frigo, M., & Johnson, S. G. *FFTW: An Adaptive Software Architecture for the FFT*. *Proceedings of the International Conference on Acoustics, Speech, and Signal Processing (ICASSP)*, 1998.

For students, this changes everything.

Software stops being a black box and becomes a gateway to the scientific literature. A single function call can lead to the original paper, then to the underlying mathematics, and eventually to a deeper understanding of the field.

I feel the same way about beautifully crafted scientific figures. A good figure can explain an idea faster than pages of equations. The [MIT LAE Seminar](https://github.com/SichengHe/MIT_LAE_seminar) is a wonderful example of this philosophy.

## And Then...

Then came **Python 2.4**, during the final year of my PhD.

Then **GitHub** changed how we collaborate.

Then **Google Colab** made reproducible computing accessible to everyone.

Then **ChatGPT**, **Claude**, **Gemini**, **AntiGravity**, and the entire new generation of AI assistants fundamentally changed how we write code, explore ideas, and learn.

And the story is still being written.

---

I think the common thread isn't MATLAB, C, Python, or AI.

It's curiosity.

From an HP 48G calculator to today's AI copilots, every new tool has been another opportunity to learn, understand a little more deeply, and pass that knowledge on to the next generation.

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

### [ClarkeLib](https://github.com/nomad-vagabond/ClarkeLib/tree/master)
* **Author:** Vadym Pasko.
* **Published:** Mai, 2026  
* **Link:** [Read Article](https://www.researchgate.net/publication/324589938_Open_library_for_space_elevator_design_and_engineering_Analyses_of_tether_tapering_functions)

**Summary:** Tapering of a space elevator’s tether from the planet surface to the altitude of the synchronous orbit
and further to the counterweight altitude can reduce the mass of the whole system, as well as provide more
or less even distribution of stress along the tether rather than in the case of using uniform tether. This
document presents the analyses of some tether tapering functions and shows that exponentially tapered
tether is not an optimal solution for the space elevator with climbers or other point loads like transitional
stations. To handle these analyses ClarkeLib – an open library for calculation of basic space elevator
parameters and loads has been developed. Estimation of Earth Elevator and Mars Elevator parameters has
been made using this library, and results are represented in this paper.

* **Link:** [Play with the vibecode, it works on colab](https://github.com/mid2SUPAERO/mid2SUPAERO.github.io/blob/main/_notebooks/REMAL_CasADi.ipynb)


---

---

### Recreation with my friend NotebookLM (Google)
* **Authors:** J.Morlier and students

Soon available

---
---

### Do you want to do the same ? follow HelloProf on patreon or buy me a coffee
* **Author:** J.Morlier 
 

---




