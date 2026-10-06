#!/usr/bin/env python3
"""SEO + performance build for the static site. Edits the HTML files in place.

Run from the repo root after changing any page, partial, CSS or JS:

    python3 scripts/build.py

It is safe to run repeatedly. For every page it:
  - inlines partials/header.html and partials/footer.html (crawlable nav, no
    layout shift, no extra requests), marking the current nav link
  - rewrites internal links to clean URLs (/services/cerec, not .html)
  - sets the <title> and meta description from PAGES below
  - writes a <!-- seo --> block in <head>: canonical, robots, Open Graph,
    Twitter card, icons, preconnects and JSON-LD structured data
  - adds width/height, lazy loading and decoding hints to images
  - adds srcset for images that have an -800.webp variant
  - cache-busts style.css and main.js with a content hash
and then regenerates sitemap.xml and robots.txt.

To move the site to its own domain, change SITE and run it again.
"""
import hashlib
import html
import json
import re
import subprocess
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://underwood-dentist-site.vercel.app"
NAME = "Dentist at Underwood"
BOOKING = ("https://www.centaurportal.com/d4w/org-3276/extended_search?sourceRef=https:%2F%2Fdentistatunderwood.com.au%2F"
           "&location=3783&randomNumber=b7760a406d458e07d9f149ade4722b9e279b8b1411b427fea80455aad720a3fa"
           "&shortVer=false&sourceID=null")

# Clean path -> (title, meta description). Titles stay under ~60 characters and
# descriptions under ~160 so search results show them in full.
PAGES = {
    "/": ("Dentist at Underwood | Family Dentist in Logan, Open 7 Days",
          "Family, cosmetic and emergency dentist in Underwood, Logan. Open 7 days including weekends, with same-day "
          "CEREC crowns, implants and gentle care. Book online."),
    "/about": ("About Our Dentists | Dentist at Underwood, Logan",
               "Meet the dentists at Dentist at Underwood: Dr Raghed Bashour, Dr Raj Kengaiha, Dr Mustafa Al-Arkee, "
               "Dr Ahmed Abdulmunem and Dr Omel Qalandar."),
    "/contact": ("Contact & Book Online | Dentist at Underwood, Logan",
                 "Book online or call (07) 3822 9266. Find us at Unit 1/2960 Logan Road, Underwood QLD 4119. "
                 "Open Mon–Fri 8am–6pm, Sat 9am–4pm and Sun 10am–4pm."),
    "/emergency": ("Emergency Dentist Underwood & Logan | Open Weekends",
                   "Toothache, broken or knocked-out tooth? Same-day emergency dental appointments in Underwood, "
                   "open 7 days including weekends. Call (07) 3822 9266."),
    "/services": ("Dental Services in Underwood, Logan | Dentist at Underwood",
                  "General, cosmetic, orthodontic and implant dentistry in Underwood, Logan: check-ups, fillings, "
                  "CEREC crowns, veneers, whitening, aligners, implants and more."),
    "/blog": ("Dental Health Blog | Dentist at Underwood",
              "Plain-English dental advice from the team at Dentist at Underwood: how often to see a dentist, "
              "kids' first teeth, whitening safety and knocked-out teeth."),
    "/404": ("Page not found | Dentist at Underwood",
             "The page you were looking for doesn't exist. Find our services, book online or call Dentist at "
             "Underwood on (07) 3822 9266."),
    # Category hubs
    "/services/general-dentistry": ("General Dentistry in Underwood, Logan | Dentist at Underwood",
                                    "Check-ups, cleans, fillings, crowns, root canals, extractions, dentures and "
                                    "mouthguards at Dentist at Underwood, Logan. Gentle care, open 7 days."),
    "/services/cosmetic-dentistry": ("Cosmetic Dentist Underwood, Logan | Dentist at Underwood",
                                     "Porcelain and composite veneers, teeth whitening and gum contouring in "
                                     "Underwood, Logan. Natural-looking cosmetic dentistry, planned with you."),
    "/services/orthodontic": ("Orthodontics & Clear Aligners in Underwood, Logan",
                              "Straighten crowded or gapped teeth and correct bite problems with clear aligners at "
                              "Dentist at Underwood, Logan. Book a consultation."),
    "/services/implants": ("Dental Implants in Underwood, Logan | Dentist at Underwood",
                           "Single-tooth and full-arch dental implants in Underwood, Logan, planned digitally. A "
                           "permanent, natural-looking replacement for missing teeth."),
    # Services
    "/services/check-ups-cleaning": ("Check-Ups & Cleaning in Underwood, Logan",
                                     "Dental check-ups and professional cleans in Underwood, Logan. A proper check-up "
                                     "catches small problems while they're still cheap and painless to fix."),
    "/services/dental-fillings": ("Tooth-Coloured Fillings in Underwood, Logan",
                                  "Tooth-coloured fillings in Underwood, Logan that treat decay and chipped teeth and "
                                  "blend in with your natural smile. Gentle, unhurried care."),
    "/services/dental-crowns": ("Dental Crowns in Underwood, Logan | Dentist at Underwood",
                                "Dental crowns in Underwood, Logan to restore cracked, heavily filled or root-treated "
                                "teeth, including same-day CEREC ceramic crowns."),
    "/services/cerec": ("CEREC Same-Day Crowns in Underwood, Logan",
                        "CEREC same-day crowns in Underwood, Logan: a digital scan, in-house milling and fitting in a "
                        "single visit. No messy impressions and no temporary crown."),
    "/services/root-canal-treatment": ("Root Canal Treatment in Underwood, Logan",
                                       "Gentle root canal treatment in Underwood, Logan to save an infected or "
                                       "painful tooth that would otherwise need removing, and stop the pain."),
    "/services/extraction": ("Tooth Extraction in Underwood, Logan | Dentist at Underwood",
                             "Gentle tooth extractions in Underwood, Logan for teeth too damaged or infected to save. "
                             "We'll always look at other options first."),
    "/services/wisdom-teeth-extraction": ("Wisdom Teeth Removal in Underwood, Logan",
                                          "Wisdom teeth assessment and removal in Underwood, Logan, from simple "
                                          "extractions to surgical removal, with sedation available if you prefer."),
    "/services/dentures": ("Full & Partial Dentures in Underwood, Logan",
                           "Full and partial dentures in Underwood, Logan, custom-made and fitted properly so they "
                           "feel comfortable and let you eat and smile with confidence."),
    "/services/mouthguards": ("Custom Sports Mouthguards in Underwood, Logan",
                              "Custom-fitted sports mouthguards in Underwood, Logan. Far better protection for "
                              "contact sport than an off-the-shelf guard."),
    "/services/nightguards": ("Night Guards for Teeth Grinding | Underwood, Logan",
                              "Custom night guards in Underwood, Logan to protect your teeth from grinding and "
                              "clenching while you sleep."),
    "/services/porcelain-veneers": ("Porcelain Veneers in Underwood, Logan",
                                    "Porcelain veneers in Underwood, Logan to fix chipped, stained or uneven teeth. "
                                    "Durable, stain-resistant and very natural-looking."),
    "/services/composite-veneers": ("Composite Veneers in Underwood, Logan",
                                    "Composite veneers in Underwood, Logan: a faster, more affordable way to reshape "
                                    "your front teeth, built up directly on the tooth in one visit."),
    "/services/gingival-esthetics": ("Gum Contouring for a Gummy Smile | Underwood, Logan",
                                     "Gum contouring in Underwood, Logan to balance a gummy smile or uneven gum "
                                     "edges for a more even, confident smile."),
    "/services/teeth-whitening": ("Teeth Whitening in Underwood, Logan | Dentist at Underwood",
                                  "Professional teeth whitening in Underwood, Logan: in-chair Zoom whitening or "
                                  "custom take-home trays, safely controlled by your dentist."),
    "/services/clear-aligners": ("Clear Aligners in Underwood, Logan | Dentist at Underwood",
                                 "Clear aligners in Underwood, Logan: straighten your teeth with removable, "
                                 "hard-to-notice aligners. Book a consultation to see if they suit you."),
    "/services/braces": ("Braces in Underwood, Logan | Dentist at Underwood",
                         "Traditional braces in Underwood, Logan, still the most reliable option for complex "
                         "alignment and bite corrections. Book a consultation."),
    "/services/single-implant": ("Single Tooth Implant in Underwood, Logan",
                                 "Replace one missing tooth with a titanium dental implant and crown in Underwood, "
                                 "Logan, root and all, not just the visible part."),
    "/services/full-arch-implants": ("Full Arch Dental Implants in Underwood, Logan",
                                     "Full-arch dental implants in Underwood, Logan: a fixed, implant-supported "
                                     "replacement for a full arch of missing or failing teeth."),
    "/services/paediatric-dentistry": ("Children's Dentist in Underwood, Logan | CDBS",
                                       "Gentle children's dentistry in Underwood, Logan: check-ups, fillings and "
                                       "fissure sealants. Eligible kids covered under the Child Dental Benefits "
                                       "Schedule."),
    "/services/dental-bridge": ("Dental Bridges in Underwood, Logan | Dentist at Underwood",
                                "Dental bridges in Underwood, Logan: a fixed, non-removable way to replace one or "
                                "more missing teeth."),
    "/services/jaw-pain-relief": ("Jaw Pain & TMJ Treatment in Underwood, Logan",
                                  "Treatment for jaw pain, TMJ dysfunction and jaw tension in Underwood, Logan, "
                                  "including custom night guards and splints for grinding."),
    "/anxiety-solutions/iv-sedation": ("IV Sedation Dentistry in Underwood, Logan",
                                       "IV sedation dentistry in Underwood, Logan for patients whose dental anxiety "
                                       "makes treatment difficult. Stay relaxed and comfortable throughout."),
    "/anxiety-solutions/general-anesthesia": ("Dental Treatment Under General Anaesthesia | Logan",
                                              "Dental treatment under general anaesthesia for complex procedures or "
                                              "severe dental anxiety, arranged by Dentist at Underwood, Logan."),
}

DENTIST_ID = SITE + "/#dentist"
WEBSITE_ID = SITE + "/#website"
FULL_BUSINESS_PAGES = {"/", "/about", "/contact", "/emergency"}
# Hidden pages: still reachable by direct link, but not linked, indexed or in the sitemap.
NOINDEX = {"/404", "/services/braces"}

BUSINESS = {
    "@type": "Dentist",
    "@id": DENTIST_ID,
    "name": NAME,
    "url": SITE + "/",
    "logo": SITE + "/icon-512.png",
    "image": [SITE + "/assets/og/clinic-reception-wide.jpg", SITE + "/assets/og/clinic-shopfront.jpg",
              SITE + "/assets/og/clinic-treatment-room.jpg"],
    "description": "Family, cosmetic, implant and emergency dentist in Underwood, Logan City, open 7 days.",
    "telephone": "+61 7 3822 9266",
    "email": "info@dentistatunderwood.com.au",
    "address": {"@type": "PostalAddress", "streetAddress": "Unit 1/2960 Logan Road", "addressLocality": "Underwood",
                "addressRegion": "QLD", "postalCode": "4119", "addressCountry": "AU"},
    "hasMap": "https://maps.google.com/?q=Unit+1/2960+Logan+Road,+Underwood+QLD+4119",
    "openingHoursSpecification": [
        {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
         "opens": "08:00", "closes": "18:00"},
        {"@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "09:00", "closes": "16:00"},
        {"@type": "OpeningHoursSpecification", "dayOfWeek": "Sunday", "opens": "10:00", "closes": "16:00"},
    ],
    "areaServed": [{"@type": "Place", "name": f"{s}, QLD"} for s in
                   ("Underwood", "Logan City", "Rochedale", "Springwood", "Slacks Creek", "Eight Mile Plains",
                    "Runcorn")],
    "medicalSpecialty": "Dentistry",
    "isAcceptingNewPatients": True,
    "currenciesAccepted": "AUD",
    "priceRange": "$$",
    "sameAs": ["https://www.facebook.com/dentistatunderwood", "https://www.instagram.com/dentistatunderwood/",
               "https://twitter.com/DentatUnderwood"],
    "potentialAction": {"@type": "ReserveAction", "target": BOOKING, "name": "Book an appointment online"},
}

SEO_BLOCK = re.compile(r"\n?<!-- seo -->.*?<!-- /seo -->\n?", re.S)
TODAY = date.today().isoformat()


# ------------------------------------------------------------------ helpers
def clean_path(file):
    rel = "/" + str(file.relative_to(ROOT))
    rel = re.sub(r"/index\.html$", "/", rel)
    return re.sub(r"\.html$", "", rel)


def clean_links(s):
    """/services/cerec.html -> /services/cerec, /index.html -> / (hrefs and data-nav only)."""
    def fix(m):
        attr, url, frag = m.group(1), m.group(2), m.group(3) or ""
        url = re.sub(r"(^|/)index\.html$", r"\1", url)
        url = re.sub(r"\.html$", "", url) or "/"
        return f'{attr}="{url}{frag}"'
    return re.sub(r'(href|data-nav)="(/[^"#?]*?\.html|/)(#[^"]*)?"', fix, s)


def strip_tags(s):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s))).strip()


def file_hash(p):
    return hashlib.sha1(p.read_bytes()).hexdigest()[:10]


_dims = {}


def image_size(src):
    """Intrinsic size of a local image, via macOS sips (cached)."""
    if src not in _dims:
        p = ROOT / src.lstrip("/")
        _dims[src] = None
        if p.exists():
            out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(p)],
                                 capture_output=True, text=True).stdout
            w, h = re.search(r"pixelWidth: (\d+)", out), re.search(r"pixelHeight: (\d+)", out)
            if w and h:
                _dims[src] = (int(w.group(1)), int(h.group(1)))
    return _dims[src]


def set_attr(tag, name, value):
    if re.search(rf'\s{name}="', tag):
        return re.sub(rf'\s{name}="[^"]*"', f' {name}="{value}"', tag)
    return tag[:-1].rstrip("/").rstrip() + f' {name}="{value}">'


def drop_attr(tag, name):
    return re.sub(rf'\s{name}="[^"]*"', "", tag)


# ------------------------------------------------------------------ partials
def header_for(path):
    h = clean_links((ROOT / "partials/header.html").read_text())
    # Mark the current page's nav links (main nav and mobile drawer).
    def mark(m):
        tag = m.group(0)
        if f'data-nav="{path}"' not in tag:
            return tag
        tag = re.sub(r'class="([^"]*)"', lambda c: f'class="{c.group(1)} is-active"', tag) if 'class="' in tag \
            else tag[:-1] + ' class="is-active">'
        return tag[:-1] + ' aria-current="page">'
    return re.sub(r"<a [^>]*data-nav=\"[^\"]*\"[^>]*>", mark, h).strip()


def footer_html():
    return clean_links((ROOT / "partials/footer.html").read_text()).strip()


def inline_partials(s, path):
    header = f"<!-- site-header -->\n{header_for(path)}\n<!-- /site-header -->"
    footer = f"<!-- site-footer -->\n{footer_html()}\n<!-- /site-footer -->"
    s = re.sub(r"<!-- site-header -->.*?<!-- /site-header -->|<div id=\"site-header\"></div>",
               lambda m: header, s, flags=re.S)
    s = re.sub(r"<!-- site-footer -->.*?<!-- /site-footer -->|<div id=\"site-footer\"></div>",
               lambda m: footer, s, flags=re.S)
    return s


# ------------------------------------------------------------------ images
def optimise_images(s):
    main_start = s.find("<main")
    hero = re.search(r'<section class="page-hero[^"]*".*?</section>', s, re.S)
    lcp_pos = lcp_src = None
    if hero:
        first = re.search(r"<img\b[^>]*>", hero.group(0))
        if first:
            lcp_pos = hero.start() + first.start()
            lcp_src = re.search(r'src="([^"]+)"', first.group(0)).group(1)

    def fix(m):
        tag, pos = m.group(0), m.start()
        src = re.search(r'src="([^"]+)"', tag)
        src = src.group(1) if src else ""
        if src.startswith("/") and not re.search(r'\swidth="', tag):
            d = image_size(src)
            if d:
                tag = set_attr(set_attr(tag, "width", d[0]), "height", d[1])
        variant = src[:-5] + "-800.webp" if src.endswith(".webp") else None
        if variant and (ROOT / variant.lstrip("/")).exists() and "srcset=" not in tag:
            w = image_size(src)[0]
            sizes = "(max-width: 900px) 100vw, 480px" if pos == lcp_pos else \
                "(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 600px"
            tag = set_attr(set_attr(tag, "srcset", f"{variant} 800w, {src} {w}w"), "sizes", sizes)
        if not re.search(r"\sdecoding=", tag):
            tag = set_attr(tag, "decoding", "async")
        if pos == lcp_pos:
            tag = set_attr(drop_attr(tag, "loading"), "fetchpriority", "high")
        elif pos > main_start >= 0 and not re.search(r"\sloading=", tag):
            tag = set_attr(tag, "loading", "lazy")
        return tag

    return re.sub(r"<img\b[^>]*>", fix, s), lcp_src


# ------------------------------------------------------------------ structured data
def breadcrumbs(s, url):
    nav = re.search(r'<nav class="breadcrumbs">(.*?)</nav>', s, re.S)
    if not nav:
        return None
    items = []
    for m in re.finditer(r'<a href="([^"]+)">(.*?)</a>|<span class="current">(.*?)</span>', nav.group(1)):
        if m.group(1):
            items.append((strip_tags(m.group(2)), SITE + (m.group(1) if m.group(1) != "/" else "/")))
        else:
            items.append((strip_tags(m.group(3)), url))
    return {"@type": "BreadcrumbList", "@id": url + "#breadcrumb",
            "itemListElement": [{"@type": "ListItem", "position": i, "name": n, "item": u}
                                for i, (n, u) in enumerate(items, 1)]}


def faqs(s):
    qa = re.findall(r'<details class="faq-item">\s*<summary>(.*?)<span class="plus"></span></summary>(.*?)</details>',
                    s, re.S)
    if not qa:
        return None
    return {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": strip_tags(q),
         "acceptedAnswer": {"@type": "Answer", "text": strip_tags(a)}} for q, a in qa]}


def team(s):
    people = []
    for card in s.split('<div class="team-card">')[1:]:
        name = re.search(r"<h3>(.*?)</h3>", card)
        img = re.search(r'<img [^>]*src="([^"]+)"', card)
        role = re.search(r'<span class="role">(.*?)</span>', card)
        if not name:
            continue
        p = {"@type": "Person", "name": strip_tags(name.group(1)), "jobTitle": "Dentist",
             "worksFor": {"@id": DENTIST_ID}}
        if img:
            p["image"] = SITE + img.group(1)
        if role and " · " in strip_tags(role.group(1)):
            p["hasCredential"] = strip_tags(role.group(1)).split(" · ", 1)[1]
        people.append(p)
    return people


def json_ld(s, path, url, title, desc, image):
    graph = []
    if path in FULL_BUSINESS_PAGES:
        biz = dict(BUSINESS)
        if path == "/about":
            biz["employee"] = team(s)
        graph.append(biz)
    if path == "/":
        graph.append({"@type": "WebSite", "@id": WEBSITE_ID, "url": SITE + "/", "name": NAME,
                      "publisher": {"@id": DENTIST_ID}, "inLanguage": "en-AU"})
    page = {"@type": "WebPage", "@id": url + "#webpage", "url": url, "name": title, "description": desc,
            "isPartOf": {"@id": WEBSITE_ID}, "about": {"@id": DENTIST_ID}, "inLanguage": "en-AU",
            "primaryImageOfPage": {"@type": "ImageObject", "url": image}}
    crumbs = breadcrumbs(s, url)
    if crumbs:
        page["breadcrumb"] = {"@id": crumbs["@id"]}
        graph.append(crumbs)
    graph.insert(0, page)
    faq = faqs(s)
    if faq:
        faq["@id"] = url + "#faq"
        graph.append(faq)
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=1)


# ------------------------------------------------------------------ head
def og_image_for(lcp_src):
    if lcp_src:
        stem = Path(lcp_src).stem
        if (ROOT / "assets/og" / f"{stem}.jpg").exists():
            return f"{SITE}/assets/og/{stem}.jpg"
    return f"{SITE}/assets/og/default.jpg"


def head_block(s, path, title, desc, lcp_src):
    url = SITE + (path if path != "/" else "/")
    image = og_image_for(lcp_src)
    e = lambda v: html.escape(v, quote=False).replace('"', "&quot;")
    lines = ["<!-- seo -->"]
    if path in NOINDEX:
        lines.append('<meta name="robots" content="noindex, follow">')
    else:
        lines += [f'<link rel="canonical" href="{url}">',
                  '<meta name="robots" content="index, follow, max-image-preview:large">']
    lines += [
        '<meta name="theme-color" content="#fffdfa">',
        f'<meta property="og:site_name" content="{NAME}">',
        '<meta property="og:locale" content="en_AU">',
        '<meta property="og:type" content="website">',
        f'<meta property="og:title" content="{e(title)}">',
        f'<meta property="og:description" content="{e(desc)}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:image" content="{image}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:site" content="@DentatUnderwood">',
        f'<meta name="twitter:title" content="{e(title)}">',
        f'<meta name="twitter:description" content="{e(desc)}">',
        f'<meta name="twitter:image" content="{image}">',
        '<link rel="icon" href="/favicon.ico" sizes="48x48">',
        '<link rel="icon" href="/favicon-96.png" type="image/png" sizes="96x96">',
        '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
        '<link rel="manifest" href="/site.webmanifest">',
        '<link rel="preload" href="/assets/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>',
        '<link rel="preload" href="/assets/fonts/fraunces.woff2" as="font" type="font/woff2" crossorigin>',
    ]
    if path == "/":
        lines.append('<link rel="preload" as="image" href="/assets/video/hero-bg-poster.jpg" fetchpriority="high">')
    if path not in NOINDEX:
        lines.append('<script type="application/ld+json">\n' + json_ld(s, path, url, title, desc, image) + "\n</script>")
    lines.append("<!-- /seo -->")
    return "\n".join(lines)


def build_page(file):
    path = clean_path(file)
    s = file.read_text()
    title, desc = PAGES[path]

    s = inline_partials(s, path)
    s = clean_links(s)

    # Title + description
    s = re.sub(r"<title>.*?</title>", f"<title>{html.escape(title, quote=False)}</title>", s, count=1, flags=re.S)
    s = re.sub(r'<meta name="description" content="[^"]*">',
               f'<meta name="description" content="{html.escape(desc, quote=False).replace(chr(34), "&quot;")}">', s, count=1)

    # Old head bits that the seo block now owns
    s = SEO_BLOCK.sub("\n", s)
    s = re.sub(r'\n<link rel="icon" href="data:[^"]*">', "", s)
    s = re.sub(r'\n<link rel="preconnect" href="https://fonts\.(googleapis|gstatic)\.com"[^>]*>', "", s)
    s = re.sub(r'\n<meta name="robots" content="[^"]*">', "", s)
    # Fonts are self-hosted (see @font-face in style.css)
    s = re.sub(r'\n<link href="https://fonts\.googleapis\.com/css2[^"]*" rel="stylesheet">', "", s)

    s, lcp_src = optimise_images(s)

    block = head_block(s, path, title, desc, lcp_src)
    s = re.sub(r'(<meta name="description" content="[^"]*">)', lambda m: m.group(1) + "\n" + block, s, count=1)

    # Cache-busted assets; main.js deferred (the header is inline, so nothing waits on it)
    s = re.sub(r'href="/assets/css/style\.css(\?v=\w+)?"',
               f'href="/assets/css/style.css?v={file_hash(ROOT / "assets/css/style.css")}"', s)
    s = re.sub(r'<script src="/assets/js/main\.js(\?v=\w+)?"( defer)?></script>',
               f'<script src="/assets/js/main.js?v={file_hash(ROOT / "assets/js/main.js")}" defer></script>', s)
    s = re.sub(r'\n<script src="/assets/js/include\.js[^"]*"></script>', "", s)

    file.write_text(s)
    return path


def main():
    files = [p for p in sorted(ROOT.rglob("*.html"))
             if not any(x in p.relative_to(ROOT).parts for x in ("legacy", "partials", "node_modules"))]
    missing = [clean_path(f) for f in files if clean_path(f) not in PAGES]
    if missing:
        raise SystemExit(f"Add titles/descriptions to PAGES for: {', '.join(missing)}")

    paths = [build_page(f) for f in files]

    urls = "\n".join(f"  <url><loc>{SITE}{p}</loc><lastmod>{TODAY}</lastmod></url>"
                     for p in sorted(paths, key=lambda p: (p != "/", p.count("/"), p)) if p not in NOINDEX)
    (ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n'
                                      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                      f"{urls}\n</urlset>\n")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
    print(f"built {len(paths)} pages, sitemap has {len(paths) - len(NOINDEX & set(paths))} URLs")


if __name__ == "__main__":
    main()
