---
layout: home
title: Home
---

<section class="hero">
  <div class="hero__text">
    <p class="eyebrow">MID2 research group · ISAE-SUPAERO, Toulouse</p>
    <h1>Design ultra efficient aerospace vehicles / aerostructures that<br>weigh less, last longer<br>and cost the planet less.</h1>
    <p class="hero__lead">
      We develop structural optimization, surrogate modeling and eco-design methods for
      aerospace systems — from topology-optimized parts to full aeroelastic wings.
    </p>
    <p class="hero__cta">
      <a class="btn btn--primary" href="/research.html">Our research</a>
      <a class="btn" href="/team.html">Meet the team</a>
      <a class="btn btn--ghost" href="https://github.com/SMTorg/SMT">SMT toolbox ↗</a>
    </p>
  </div>
  <div class="hero__art">
    <img src="/assets/images/hero-multimaterial.jpg" alt="Eco-efficient multimaterial structure: carbon-fibre PLA and bamboo-fibre PLA composites combined to balance emission and stiffness">
  </div>
</section>

<section class="intro">
  <img class="intro__logo" src="/assets/images/mid2-logo.png" alt="MID2 logo" width="120">
  <div>
    <h2>Joseph F.A. Morlier</h2>
    <p class="muted">Professor in Aerospace Engineering · 📥 joseph.morlier at isae-supaero.fr</p>
    <p>
      I lead <strong>MID2</strong> — <em>Multidisciplinary optimization for aerospace Innovation:
      eco Design and Data</em>. This site collects our research, open-source software,
      interactive books and teaching material.
    </p>
    <p class="muted small">
      Université de Toulouse, ISAE-SUPAERO · Fédération ENAC ISAE-SUPAERO ONERA, Toulouse, France
    </p>
  </div>
</section>

<h2 class="section-title">Research</h2>
<div class="topics">
  <a class="topic" href="/gp-bo/"><img src="/assets/icons/gaussian-process.svg" alt="" width="56" height="56"><span><strong>AI4Physics &amp; Gaussian processes</strong><em>Surrogates, kriging, multifidelity and mixed-variable models.</em></span></a>
  <a class="topic" href="/software.html"><img src="/assets/icons/mdo.svg" alt="" width="56" height="56"><span><strong>Multidisciplinary design optimization</strong><em>Coupled disciplines, aircraft, UAV and launcher design.</em></span></a>
  <a class="topic" href="/research.html"><img src="/assets/icons/aeroelasticity.svg" alt="" width="56" height="56"><span><strong>Aeroelasticity &amp; flexible wings</strong><em>Fluid–structure coupling for highly flexible wing design.</em></span></a>
  <a class="topic" href="/research.html"><img src="/assets/icons/digital-materials.svg" alt="" width="56" height="56"><span><strong>Digital materials &amp; fabrication</strong><em>Voxel-based materials and additive manufacturing.</em></span></a>
  <a class="topic" href="/ashby-maps-renewed/"><img src="/assets/icons/ecodesign-lca.svg" alt="" width="56" height="56"><span><strong>Eco-design &amp; life-cycle assessment</strong><em>Material selection and design under environmental impact.</em></span></a>
  <a class="topic" href="/software.html"><img src="/assets/icons/topology.svg" alt="" width="56" height="56"><span><strong>Topology &amp; shape optimization</strong><em>Optimal layouts of structures, from trusses to 3D parts.</em></span></a>
  <a class="topic" href="/research.html"><img src="/assets/icons/multiscale.svg" alt="" width="56" height="56"><span><strong>Multiscale &amp; geometric projection</strong><em>Architectured materials and projection of primitives.</em></span></a>
  <a class="topic" href="/teaching.html"><img src="/assets/icons/vibration-shm.svg" alt="" width="56" height="56"><span><strong>Vibration &amp; health monitoring</strong><em>Modal identification, signals and damage detection.</em></span></a>
</div>

<h2 class="section-title">Explore</h2>
<div class="tiles">
  <a class="tile" href="/team.html"><span class="tile__icon">👥</span><strong>Team</strong><span>PhD students, visitors, alumni</span></a>
  <a class="tile" href="/software.html"><span class="tile__icon">💻</span><strong>Open-source software</strong><span>SMT, SMT-optim, TOSM, TASOPT…</span></a>
  <a class="tile" href="/books.html"><span class="tile__icon">📘</span><strong>Interactive books</strong><span>Materials &amp; the environment, VFEA</span></a>
  <a class="tile" href="/teaching.html"><span class="tile__icon">🎓</span><strong>Teaching</strong><span>MDO, FEA, AI for structural mechanics</span></a>
  <a class="tile" href="/readings.html"><span class="tile__icon">📖</span><strong>Readings</strong><span>Articles I wish I had written</span></a>
  <a class="tile" href="/LearnwithAI.html"><span class="tile__icon">✨</span><strong>Learn with AI</strong><span>Interactive explorers for mechanics</span></a>
</div>

<h2 class="section-title">Interactive explainers</h2>
<div class="links">
  <a href="/ashby-maps-renewed/">Ashby maps, renewed</a>
  <a href="/ashby-maps/">Ashby maps</a>
  <a href="/surrogate/">Surrogate modeling</a>
  <a href="/gp-bo/">Gaussian processes &amp; Bayesian optimization</a>
  <a href="/gallery.html">Figure gallery</a>
</div>

<h2 class="section-title">Latest posts</h2>
<div class="posts">
  {% for post in site.posts limit:6 %}
  <a class="post" href="{{ post.url | relative_url }}">
    <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%b %-d, %Y" }}</time>
    <h3>{{ post.title }}</h3>
    <p>{{ post.content | strip_html | strip_newlines | truncate: 140 }}</p>
  </a>
  {% endfor %}
</div>
<p class="small muted">Subscribe <a href="{{ '/feed.xml' | relative_url }}">via RSS</a>.</p>

<h2 class="section-title">Publications &amp; links</h2>
<div class="links">
  <a href="https://scholar.google.fr/citations?user=wi1HSroAAAAJ&hl=fr">Google Scholar</a>
  <a href="https://openalex.org/authors/A5005187572">OpenAlex</a>
  <a href="https://www.webofscience.com/wos/author/rid/Y-1209-2019">Web of Science</a>
  <a href="https://orcid.org/0000-0002-1511-2086">ORCID</a>
  <a href="https://github.com/mid2SUPAERO/Outputs">MID2 outputs (GitHub)</a>
  <a href="https://personnel.isae-supaero.fr/joseph-morlier/?lang=fr">ISAE-SUPAERO page</a>
  <a href="https://www.linkedin.com/in/joseph-morlier-890176168/">LinkedIn</a>
</div>
<p class="small muted">
  Vulgarisation:
  <a href="https://www.linkedin.com/pulse/possible-build-aircraft-wing-lego-joseph-morlier/">Can we build an aircraft wing in LEGO®?</a> ·
  <a href="https://www.linkedin.com/pulse/optimization-mdo-connecting-people-joseph-morlier/">MDO: optimization for connecting people?</a><br>
  Networks: AIAA · ISSMO · SIAM · A3F · AFM · GDR MASCOT-NUM · GDR IAMAT
</p>
