---
layout: home
title: Home
---

<style>
  /* Self-contained styles for this page (works even without assets/css/style.scss) */
  .page-content > .wrapper { max-width: 1120px; }
  .home { --navy:#0d2b3e; --navy2:#14405a; --amber:#f2a33a; --ink:#17222b; --muted:#5b6b77; --line:#dde4e8; --paper:#f5f7f8; color: var(--ink); }
  .home a { text-decoration: none; }
  .home h1, .home h2, .home h3 { font-family: "Space Grotesk", "Inter", system-ui, sans-serif; letter-spacing: -0.015em; }

  /* Hero */
  .home .hero { display: grid; grid-template-columns: 1.1fr 1fr; gap: 2rem; align-items: center; background: radial-gradient(circle at 80% 30%, var(--navy2), var(--navy) 60%); color: #fff; padding: 3rem 2.5rem; border-radius: 18px; margin: 1.5rem 0 2.5rem; }
  .home .hero h1 { color: #fff; font-size: clamp(1.6rem, 3.2vw, 2.5rem); line-height: 1.12; margin: .4rem 0 1rem; }
  .home .eyebrow { color: var(--amber); font-size: .82rem; text-transform: uppercase; letter-spacing: .12em; font-weight: 600; margin: 0; }
  .home .hero p.lead { color: #c7d6e0; font-size: 1.05rem; max-width: 34em; }
  .home .hero img { width: 100%; height: auto; display: block; background: #fff; border-radius: 12px; padding: .5rem; box-shadow: 0 12px 32px rgba(0,0,0,.28); }
  .home .btns { display: flex; flex-wrap: wrap; gap: .7rem; margin-top: 1.4rem; }
  .home .btn { display: inline-block; padding: .6rem 1.1rem; border-radius: 6px; font-weight: 600; border: 2px solid #fff; color: #fff; }
  .home .btn:hover { background: #fff; color: var(--navy); }
  .home .btn.primary { background: var(--amber); border-color: var(--amber); color: var(--navy); }
  @media (max-width: 800px) { .home .hero { grid-template-columns: 1fr; padding: 2rem 1.4rem; } }

  .home .section { font-size: 1.4rem; margin: 2.6rem 0 1rem; padding-left: .8rem; border-left: 5px solid var(--amber); border-bottom: 0; }
  .home .muted { color: var(--muted); }

  /* Research topics: logo on the left, text aligned beside it */
  .home .topics { display: grid; grid-template-columns: repeat(4, 1fr); gap: .9rem; }
  .home .topic { display: grid; grid-template-columns: 56px 1fr; column-gap: .8rem; align-items: center; padding: .75rem; border: 1px solid var(--line); border-radius: 12px; color: var(--ink); background: #fff; }
  .home .topic:hover { box-shadow: 0 8px 20px rgba(13,43,62,.13); }
  .home .topic img { width: 56px; height: 56px; display: block; }
  .home .topic strong { display: block; font-family: "Space Grotesk", sans-serif; color: var(--navy); font-size: .95rem; line-height: 1.2; }
  .home .topic em { display: block; font-style: normal; color: var(--muted); font-size: .8rem; line-height: 1.3; margin-top: .2rem; }
  @media (max-width: 960px) { .home .topics { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 560px) { .home .topics { grid-template-columns: 1fr; } }

  /* Big boxes */
  .home .bigboxes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.2rem; margin-top: 2.6rem; }
  .home .bigbox { display: flex; flex-direction: column; justify-content: space-between; min-height: 190px; padding: 1.6rem 1.8rem; border: 1px solid var(--line); border-left: 6px solid var(--amber); border-radius: 14px; background: var(--paper); color: var(--ink); transition: box-shadow .15s, transform .15s; }
  .home .bigbox:hover { box-shadow: 0 12px 28px rgba(13,43,62,.15); transform: translateY(-3px); background: #fff; }
  .home .bigbox .kicker { font-size: .78rem; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); font-weight: 600; }
  .home .bigbox h3 { margin: .35rem 0 .5rem; font-size: 1.45rem; line-height: 1.2; color: var(--navy); }
  .home .bigbox p { margin: 0; color: var(--muted); font-size: .98rem; }
  .home .bigbox .go { margin-top: 1rem; font-weight: 600; color: var(--navy2); }
  @media (max-width: 700px) { .home .bigboxes { grid-template-columns: 1fr; } }
  @media (prefers-reduced-motion: reduce) { .home .bigbox { transition: none; } }

  /* Posts and links */
  .home .posts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .home .post { border-top: 4px solid var(--amber); background: var(--paper); border-radius: 0 0 10px 10px; padding: .9rem 1.1rem; color: var(--ink); }
  .home .post:hover { background: #eaf0f3; }
  .home .post time { font-size: .78rem; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
  .home .post h3 { margin: .3rem 0 0; font-size: 1rem; color: var(--navy); }
  @media (max-width: 900px) { .home .posts { grid-template-columns: 1fr; } }
  .home .chips { display: flex; flex-wrap: wrap; gap: .6rem; }
  .home .chips a { border: 1px solid var(--line); border-radius: 999px; padding: .4rem .95rem; font-size: .92rem; font-weight: 500; background: #fff; }
  .home .chips a:hover { background: var(--paper); }
</style>

<div class="home">

<section class="hero">
  <div>
    <p class="eyebrow">MID2 research group · ISAE-SUPAERO, Toulouse</p>
    <h1>Design ultra efficient aerospace vehicles / aerostructures that<br>weigh less, last longer<br>and cost the planet less.</h1>
    <p class="lead">Structural optimization, surrogate modeling and eco-design for aerospace systems — from topology-optimized parts to full aeroelastic wings.</p>
    <p class="btns">
      <a class="btn primary" href="/research.html">Our research</a>
      <a class="btn" href="/team.html">Meet the team</a>
      <a class="btn" href="https://github.com/SMTorg/SMT">SMT toolbox ↗</a>
    </p>
  </div>
  <div>
    <img src="/assets/images/hero-multimaterial.jpg" alt="Eco-efficient multimaterial structure: carbon-fibre PLA and bamboo-fibre PLA composites combined to balance emission and stiffness">
  </div>
</section>

<p><strong>Joseph F.A. Morlier</strong> — Professor in Aerospace Engineering, ISAE-SUPAERO · 📥 joseph.morlier at isae-supaero.fr<br>
<span class="muted">I lead <strong>MID2</strong> (Multidisciplinary optimization for aerospace Innovation: eco Design and Data), Université de Toulouse.</span></p>

<h2 class="section">Research</h2>
<div class="topics">
  <a class="topic" href="/gp-bo/"><img src="/assets/icons/gaussian-process.svg" alt=""><span><strong>AI4Physics &amp; Gaussian processes</strong><em>Surrogates, kriging, multifidelity and mixed-variable models.</em></span></a>
  <a class="topic" href="/software.html"><img src="/assets/icons/mdo.svg" alt=""><span><strong>Multidisciplinary design optimization</strong><em>Coupled disciplines, aircraft, UAV and launcher design.</em></span></a>
  <a class="topic" href="/research.html"><img src="/assets/icons/aeroelasticity.svg" alt=""><span><strong>Aeroelasticity &amp; flexible wings</strong><em>Fluid–structure coupling for highly flexible wing design.</em></span></a>
  <a class="topic" href="/ashby-maps-renewed/"><img src="/assets/icons/ecodesign-lca.svg" alt=""><span><strong>Eco-design &amp; life-cycle assessment</strong><em>Material selection and design under environmental impact.</em></span></a>
  <a class="topic" href="/research.html"><img src="/assets/icons/digital-materials.svg" alt=""><span><strong>Digital materials &amp; fabrication</strong><em>Voxel-based materials and additive manufacturing.</em></span></a>
  <a class="topic" href="/software.html"><img src="/assets/icons/topology.svg" alt=""><span><strong>Topology &amp; shape optimization</strong><em>Optimal layouts of structures, from trusses to 3D parts.</em></span></a>
  <a class="topic" href="/research.html"><img src="/assets/icons/multiscale.svg" alt=""><span><strong>Multiscale &amp; geometric projection</strong><em>Architectured materials and projection of primitives.</em></span></a>
  <a class="topic" href="/teaching.html"><img src="/assets/icons/vibration-shm.svg" alt=""><span><strong>Vibration &amp; health monitoring</strong><em>Modal identification, signals and damage detection.</em></span></a>
</div>

<div class="bigboxes">
  <a class="bigbox" href="/ashby-maps-renewed/"><div><div class="kicker">Interactive explainer</div><h3>Ashby maps, renewed</h3><p>Material selection charts revisited with latent spaces.</p></div><div class="go">Open →</div></a>
  <a class="bigbox" href="/surrogate/"><div><div class="kicker">Interactive explainer</div><h3>Surrogate modeling</h3><p>From design of experiments to POD, ensembles and conformal prediction.</p></div><div class="go">Open →</div></a>
  <a class="bigbox" href="/gp-bo/"><div><div class="kicker">Interactive explainer</div><h3>Gaussian processes &amp; Bayesian optimization</h3><p>Kernels, posteriors and acquisition, step by step.</p></div><div class="go">Open →</div></a>
  <a class="bigbox" href="https://materialsandtheenvironment.github.io"><div><div class="kicker">Interactive book</div><h3>Materials &amp; the environment</h3><p>Open science for sustainable structural design.</p></div><div class="go">Open →</div></a>
  <a class="bigbox" href="https://jomorlier.github.io/VFEA/"><div><div class="kicker">Interactive book</div><h3>Vibration &amp; finite element analysis</h3><p>VFEA part 1: vibration.</p></div><div class="go">Open →</div></a>
  <a class="bigbox" href="/LearnwithAI.html"><div><div class="kicker">Learn with AI</div><h3>Interactive explorers for mechanics</h3><p>Deformation gradient, Cauchy stress, elasticity tensor and more.</p></div><div class="go">Open →</div></a>
  <a class="bigbox" href="/software.html"><div><div class="kicker">Open-source software</div><h3>SMT, SMT-optim, TOSM, TASOPT…</h3><p>Surrogate modeling, Bayesian optimization, topology and aerostructural tools.</p></div><div class="go">Open →</div></a>
  <a class="bigbox" href="/teaching.html"><div><div class="kicker">Teaching</div><h3>MDO, FEA, AI for structural mechanics</h3><p>Course material and GitHub repositories from ISAE-SUPAERO.</p></div><div class="go">Open →</div></a>
  <a class="bigbox" href="/readings.html"><div><div class="kicker">Readings</div><h3>Articles I wish I had written</h3><p>Tutorials, perspectives and notes worth reading.</p></div><div class="go">Open →</div></a>
  <a class="bigbox" href="/team.html"><div><div class="kicker">Team</div><h3>PhD students, visitors, alumni</h3><p>Who is working on what in the MID2 group.</p></div><div class="go">Open →</div></a>
</div>

<h2 class="section">Latest posts</h2>
<div class="posts">
  {% for post in site.posts limit:3 %}
  <a class="post" href="{{ post.url | relative_url }}">
    <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%b %-d, %Y" }}</time>
    <h3>{{ post.title }}</h3>
  </a>
  {% endfor %}
</div>
<p class="muted"><small>All posts via <a href="{{ '/feed.xml' | relative_url }}">RSS</a>.</small></p>

<h2 class="section">Publications &amp; links</h2>
<div class="chips">
  <a href="https://scholar.google.fr/citations?user=wi1HSroAAAAJ&hl=fr">Google Scholar</a>
  <a href="https://openalex.org/authors/A5005187572">OpenAlex</a>
  <a href="https://www.webofscience.com/wos/author/rid/Y-1209-2019">Web of Science</a>
  <a href="https://orcid.org/0000-0002-1511-2086">ORCID</a>
  <a href="https://github.com/mid2SUPAERO/Outputs">MID2 outputs</a>
  <a href="https://personnel.isae-supaero.fr/joseph-morlier/?lang=fr">ISAE-SUPAERO page</a>
  <a href="https://www.linkedin.com/in/joseph-morlier-890176168/">LinkedIn</a>
</div>

</div>
