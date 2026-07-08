---
layout: home
title: Home
---

## [Joseph Morlier](https://josephmorlier.github.io/)

Enseignant-chercheur in Structural Optimization, Multidisciplinary Design Optimization,
Ecodesign & AI for Engineers — ISAE-SUPAERO, DMSM Department
📥 joseph.morlier at isae-supaero.fr

[📄 About](/about.html) [📄 Research](/research.html) [📄 Team](/team.html) [📄 Teaching](/teaching.html) [📄 Publications](/publications.html) [📄 Contact](/contact.html) [📄 Blog](/blog.html)

## 🏠 Welcome!

I lead the **MID2** research group ("Multidisciplinary optimization for aerospace Innovation:
eco Design and Data") at ISAE-SUPAERO. On this site you'll find posts about my group's
research and scientific activities, along with links to research and teaching material.

## 🔬 Research Topics

| Structural Optimization | Ecodesign | AI for Engineers | Multidisciplinary Design Optimization | Structural Health Monitoring |
|---|---|---|---|---|
| *Topology & shape optimization, multiscale, geometric projection, architectured materials* | *Digital materials, LCA, eco-informed material selection* | *Surrogate modeling, Gaussian processes, multifidelity approaches, mixed variables* | *Computational aeroelasticity, accelerated design of aircraft, UAV and launchers* | *Modal identification, signal processing, neural networks* |

**Vulgarisation:**
[Is it possible to build an aircraft wing in LEGO®?](https://www.linkedin.com/pulse/possible-build-aircraft-wing-lego-joseph-morlier/) (topology optimization) ·
[MDO: optimization for connecting people?](https://www.linkedin.com/pulse/optimization-mdo-connecting-people-joseph-morlier/)

## 📚 Scientific Publications

- [Publication list](/publications.html)
- [Google Scholar Profile](https://scholar.google.fr/citations?user=wi1HSroAAAAJ&hl=fr)
- [Publons](https://publons.com/researcher/3109719/joseph-morlier/)
- [ORCID](https://orcid.org/0000-0002-1511-2086)

## 🤝 Networks & Societies

AIAA · ISSMO · SIAM · A3F · AFM · GDR MASCOT-NUM · GDR IAMAT

## 🔗 Other links

- [MID2 group outputs & latest presentations (GitHub)](https://github.com/mid2SUPAERO/Outputs)
- [ISAE-SUPAERO profile page](https://personnel.isae-supaero.fr/joseph-morlier/?lang=fr)
- [LinkedIn](https://www.linkedin.com/in/joseph-morlier-890176168/)
- [Team & alumni](/team.html)

## 📰 Latest posts

<ul>
  {% for post in site.posts limit:5 %}
    <li>
      <a href="{{ post.url | relative_url }}">{{ post.title }}</a> - {{ post.date | date: "%Y-%m-%d" }}
    </li>
  {% endfor %}
</ul>
