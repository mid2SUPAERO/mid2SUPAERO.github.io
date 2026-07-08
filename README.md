# Joseph Morlier — personal / MID2 research page

A minimal Jekyll academic site, in the spirit of
[kerfriden.github.io](https://kerfriden.github.io), refactored from
[mid2supaero.github.io](https://mid2supaero.github.io) and populated with
content from the
[ISAE-SUPAERO pro page](https://pagespro.isae-supaero.fr/joseph-morlier/).

## Structure

```
_config.yml        site settings, nav, social links
Gemfile             GitHub-Pages-compatible gem set
index.md            homepage (welcome, topics, publications, links, latest posts)
about.md            bio / affiliation
research.md          research topics + vulgarisation links
team.md              PhD students, postdocs, visiting researchers, alumni link
teaching.md          courses / teaching material
publications.md      publication links (wire up jekyll-scholar for a real list)
contact.md           address / contact details
blog.md              full post listing
_posts/               blog posts (one .md file per post)
assets/css/style.scss theme override (built on the built-in "minima" theme)
```

## Run locally

```bash
gem install bundler
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000.

## Deploy on GitHub Pages

1. Create a repo named `<your-username>.github.io` (or any name + enable Pages
   in Settings → Pages → "Deploy from a branch").
2. Push these files to the `main` branch.
3. GitHub Pages will build automatically with Jekyll — no extra config needed
   since `Gemfile` uses the `github-pages` gem, matching GitHub's build
   environment exactly.
4. Update `_config.yml` → `url:` to your actual `https://<username>.github.io`
   address, and swap in your real email/logo/social links.

## Things to personalize before publishing

- [ ] Confirm the contact email in `_config.yml`, `index.md`, and `contact.md`
      (a placeholder `joseph.morlier@isae-supaero.fr` pattern was used —
      please verify the real address).
- [ ] Add a logo/photo under `assets/images/` and reference it from `index.md`
      if desired (kerfriden's site uses one at the top of the homepage).
- [ ] Replace the `publications.md` placeholder list with a real list, or wire
      up [jekyll-scholar](https://github.com/inukshuk/jekyll-scholar) to
      render a `.bib` file automatically.
- [ ] Add real course pages under `teaching.md`.
- [ ] Write your first real blog post in `_posts/` (the sample one can be
      deleted once you have real content).
