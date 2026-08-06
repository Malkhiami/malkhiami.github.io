"""Auto-sync new publications from ORCID into data/publications.json.

Checks the public ORCID record for works not yet on the site (matched by DOI),
pulls full metadata from Crossref, and appends them. Runs nightly via GitHub
Actions alongside the Scholar stats sync; can also be run manually:

    python scripts/sync_publications.py
"""
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ORCID_ID = "0000-0002-4062-1595"
ROOT = Path(__file__).resolve().parent.parent
PUBS_PATH = ROOT / "data" / "publications.json"
JS_PATH = ROOT / "data" / "publications.js"

HEADERS = {"User-Agent": "AlKhiami-academic-site/1.0 (mailto:m.iyadalkh@gmail.com)",
           "Accept": "application/json"}

TYPE_MAP = {
    "journal-article": "journal",
    "proceedings-article": "conference",
    "book-chapter": "chapter",
    "posted-content": "other",
}

TAG_RULES = [
    (r"exoskeleton|exosuit", "Exoskeletons"),
    (r"\bEMG\b|ergonom|musculoskeletal|posture|NIOSH", "Ergonomics"),
    (r"safety|hazard|PPE|WMSD", "Health & Safety"),
    (r"virtual reality|\bVR\b|augmented reality", "Virtual Reality"),
    (r"educat|learning|student|curriculum|teaching", "Education"),
    (r"\bAI\b|machine learning|deep learning|YOLO|LLM|language model|computer vision", "AI & ML"),
    (r"\bBIM\b|information model", "BIM"),
    (r"energy|solar|wind|turbine|cool roof|phase change", "Energy"),
    (r"sustainab", "Sustainability"),
    (r"robot", "Robotics"),
    (r"construction", "Construction"),
]


def get_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def norm_doi(doi):
    return doi.lower().strip().replace("https://doi.org/", "")


def strip_jats(text):
    text = re.sub(r"<jats:title[^>]*>.*?</jats:title>", " ", text, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def orcid_dois():
    data = get_json(f"https://pub.orcid.org/v3.0/{ORCID_ID}/works")
    dois = []
    for group in data.get("group", []):
        for eid in group.get("external-ids", {}).get("external-id", []):
            if eid.get("external-id-type") == "doi":
                dois.append(norm_doi(eid.get("external-id-value", "")))
                break
    return [d for d in dois if d]


def crossref_meta(doi):
    msg = get_json(f"https://api.crossref.org/works/{urllib.request.quote(doi)}")["message"]
    title = (msg.get("title") or [""])[0]
    venue = (msg.get("container-title") or [""])[0]
    year = None
    for k in ("published-print", "published-online", "issued", "created"):
        parts = msg.get(k, {}).get("date-parts", [[None]])
        if parts and parts[0] and parts[0][0]:
            year = parts[0][0]
            break
    authors = []
    for a in msg.get("author", []):
        family = a.get("family", "")
        given = a.get("given", "")
        initials = " ".join(f"{p[0]}." for p in re.split(r"[\s-]+", given) if p)
        authors.append(f"{family}, {initials}".strip().rstrip(","))
    if len(authors) > 1:
        author_str = ", ".join(authors[:-1]) + ", & " + authors[-1]
    else:
        author_str = authors[0] if authors else ""
    ptype = TYPE_MAP.get(msg.get("type", ""), "other")
    abstract = strip_jats(msg.get("abstract", "") or "")
    return title, venue, year, author_str, ptype, abstract


def make_tags(title):
    tags = []
    for pattern, tag in TAG_RULES:
        if re.search(pattern, title, re.I) and tag not in tags:
            tags.append(tag)
    return tags[:4] or ["Construction"]


def make_id(doi, year):
    slug = re.sub(r"[^a-z0-9]", "", doi.split("/")[-1])[-12:]
    return f"auto{year}{slug}"


def main():
    payload = json.loads(PUBS_PATH.read_text(encoding="utf-8"))
    pubs = payload["publications"]
    known = {norm_doi(p["doi"]) for p in pubs if p.get("doi")}
    known_titles = {re.sub(r"[^a-z0-9]", "", p["title"].lower())[:50] for p in pubs}

    try:
        remote = orcid_dois()
    except Exception as exc:  # noqa: BLE001
        print(f"ORCID unreachable ({exc}) — keeping existing list.")
        return 0

    new_count = 0
    for doi in remote:
        if doi in known:
            continue
        try:
            title, venue, year, authors, ptype, abstract = crossref_meta(doi)
        except Exception as exc:  # noqa: BLE001
            print(f"  ! {doi}: Crossref lookup failed ({exc}) — skipped this run.")
            continue
        if not title or not year:
            continue
        if re.sub(r"[^a-z0-9]", "", title.lower())[:50] in known_titles:
            continue  # same work under a second DOI (e.g. preprint) — skip
        pubs.append({
            "id": make_id(doi, year),
            "type": ptype,
            "year": year,
            "title": title,
            "authors": authors,
            "venue": venue,
            "doi": doi,
            "tags": make_tags(title),
            "abstract": abstract,
        })
        known.add(doi)
        print(f"  + added: {title[:70]} ({year}, {venue[:40]})")
        new_count += 1
        time.sleep(0.5)

    if new_count:
        PUBS_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    # always regenerate the JS the site loads
    JS_PATH.write_text(
        "// Generated by scripts — edit data/publications.json instead.\n"
        "const PUBLICATIONS = " + json.dumps(pubs, indent=2, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    print(f"Done. {new_count} new publication(s); {len(pubs)} total.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
