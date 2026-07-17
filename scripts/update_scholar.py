"""Refresh data/scholar.js with live metrics from Google Scholar.

Usage:  python scripts/update_scholar.py
Runs daily via .github/workflows/update-scholar.yml once the site is on GitHub.
"""
import datetime
import json
import re
import sys
import urllib.request
from pathlib import Path

SCHOLAR_USER = "vnjqdE4AAAAJ"
URL = f"https://scholar.google.com/citations?user={SCHOLAR_USER}&hl=en"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "scholar.js"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}


def main() -> int:
    req = urllib.request.Request(URL, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read().decode("utf-8", errors="replace")

    # Stats table: citations(all, since), h-index(all, since), i10(all, since)
    stds = re.findall(r'class="gsc_rsb_std">(\d+)</td>', html)
    if len(stds) < 6:
        print("Could not parse Scholar stats table — page layout may have changed "
              "or the request was blocked. Keeping existing data.")
        return 1
    citations, h_index, i10 = int(stds[0]), int(stds[2]), int(stds[4])

    years = [int(y) for y in re.findall(r'class="gsc_g_t"[^>]*>(\d{4})</span>', html)]
    counts = [int(c) for c in re.findall(r'class="gsc_g_al"[^>]*>(\d+)</span>', html)]
    per_year = dict(zip(years, counts)) if years and len(years) == len(counts) else {}

    # preserve the manually-maintained ResearchGate reads count, if present
    rg_reads = None
    if OUT.exists():
        m = re.search(r'"rgReads":\s*(\d+)', OUT.read_text(encoding="utf-8"))
        if m:
            rg_reads = int(m.group(1))

    stats = {
        "updated": datetime.date.today().isoformat(),
        "citations": citations,
        "hIndex": h_index,
        "i10Index": i10,
        "rgReads": rg_reads,
        "perYear": per_year,
    }
    OUT.write_text(
        "// Live scholarly metrics — refreshed automatically by scripts/update_scholar.py\n"
        "// (run daily via GitHub Actions once the site is on GitHub Pages).\n"
        "const SCHOLAR_STATS = " + json.dumps(stats, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"Updated: {citations} citations, h-index {h_index}, i10 {i10}, "
          f"per-year {per_year}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
