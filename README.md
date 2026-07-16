# Mohamad Iyad Al-Khiami — Academic Website

A single-page academic portfolio: publications with abstracts & BibTeX, live Google
Scholar metrics, teaching, supervised projects, SDG contributions, and collaboration info.

## Structure

| Path | What it is |
|---|---|
| `index.html` | The whole site — all section text lives here |
| `css/style.css` | Design (colors, fonts, layout, dark/light themes) |
| `js/main.js` | Animations, publications engine, chart, theme toggle |
| `data/publications.json` | **Edit publications here** (the master list) |
| `data/publications.js` | Generated from the JSON — don't edit by hand |
| `data/scholar.js` | Live Scholar metrics — refreshed by script |
| `assets/images/profile.jpg` | Your photo (add it — square crop works best) |
| `assets/docs/Al-Khiami_CV.pdf` | The downloadable CV |

## Common tasks

**Add/edit a publication** — edit `data/publications.json`, then run:

```
python scripts/fetch_abstracts.py
```

This fetches any missing abstracts from Crossref (by DOI) and regenerates
`data/publications.js`. You can also paste an abstract directly into the JSON —
manual text is never overwritten.

**Add gallery photos** — drop image files into `assets/images/gallery/` and list
them in `data/gallery.js` (path + caption + category). Placeholder tiles on the
site show the expected filenames until the photos exist. Categories become
filter tabs automatically.

**Refresh Scholar stats manually:**

```
python scripts/update_scholar.py
```

**Preview locally:**

```
python -m http.server 8123
```

then open http://localhost:8123

## Going live (GitHub Pages — free)

1. Create a repository on GitHub (e.g. `alkhiami.github.io` for a root URL).
2. Push this folder's contents to it.
3. In the repo: Settings → Pages → deploy from the `main` branch.
4. The included workflow (`.github/workflows/update-scholar.yml`) then refreshes
   your citation counts and h-index **automatically every day**. If Google ever
   blocks a run, the workflow keeps the last good numbers.

## Visitor analytics

Create a free account at [goatcounter.com](https://www.goatcounter.com), then in
`index.html` uncomment the GoatCounter `<script>` line near the bottom and replace
`YOURCODE` with your site code. Privacy-friendly, no cookie banner needed.
