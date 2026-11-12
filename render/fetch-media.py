#!/usr/bin/env python3
"""Fetch background imagery. Public-domain / CC0 only — no attribution, no share-alike.

ponytail: Wikimedia needs no API key, so this works today. Pexels gives far better
cinematic footage; set PEXELS_KEY and it is used first. Nothing else changes.
"""
import json, os, sys, time, urllib.request, urllib.parse, pathlib

OK = ("public domain", "cc0", "pd-", "no restrictions")
UA = {"User-Agent": "kb-render/1.0 (knowledge-base pipeline)"}

def get(url, headers=UA, tries=4):
    # Commons rate-limits bursts. Back off rather than dropping the asset.
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30)
        except urllib.error.HTTPError as e:
            if e.code != 429 or i == tries - 1:
                raise
            time.sleep(2 * (i + 1))

def wikimedia(term, want=1):
    q = urllib.parse.urlencode({
        "action": "query", "generator": "search", "gsrsearch": term,
        "gsrnamespace": "6", "gsrlimit": "25", "prop": "imageinfo",
        "iiprop": "url|extmetadata", "iiurlwidth": "1400", "format": "json"})
    pages = json.load(get(f"https://commons.wikimedia.org/w/api.php?{q}")).get("query", {}).get("pages", {})
    out = []
    for p in pages.values():
        ii = p["imageinfo"][0]
        lic = (ii.get("extmetadata", {}).get("LicenseShortName", {}).get("value") or "").lower()
        if not any(k in lic for k in OK):
            continue
        # thumburl carries UTM query params, so test the path, not the whole URL.
        path = urllib.parse.urlparse(ii.get("thumburl", "")).path.lower()
        if not path.endswith((".jpg", ".jpeg", ".png")):
            continue
        out.append((ii["thumburl"], lic))
        if len(out) >= want:
            break
    return out

def pexels(term, want=1):
    key = os.environ.get("PEXELS_KEY")
    if not key:
        return []
    q = urllib.parse.urlencode({"query": term, "per_page": want, "orientation": "portrait"})
    r = json.load(get(f"https://api.pexels.com/v1/search?{q}", {**UA, "Authorization": key}))
    return [(p["src"]["large2x"], "pexels license") for p in r.get("photos", [])]

def main():
    root = pathlib.Path(__file__).parent
    terms = json.loads((root / "data" / f"{sys.argv[1]}.media.json").read_text())
    out = root / "public" / "media"
    out.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for slug, term in terms.items():
        hits = pexels(term) or wikimedia(term)
        if not hits:
            print(f"  MISS {slug} ({term})")
            continue
        url, lic = hits[0]
        dest = out / f"{slug}.jpg"
        dest.write_bytes(get(url).read())
        time.sleep(1.2)
        manifest[slug] = {"file": f"media/{slug}.jpg", "license": lic, "term": term}
        print(f"  ok   {slug:14} {lic}")
    (root / "data" / f"{sys.argv[1]}.media.lock.json").write_text(json.dumps(manifest, indent=2))

if __name__ == "__main__":
    main()
