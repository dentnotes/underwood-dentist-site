# Underwood Dentist — Site Rebuild

A clean, hand-built **multi-page** static site for "Dentist at Underwood,"
mirroring the page depth and service catalogue of brisbanedental.com.au. No
framework, no build step, no WordPress/Elementor — semantic HTML, one CSS
file, and a small set of JS files.

## Structure

```
index.html                  homepage
about.html                  real team bios (sourced from dentistatunderwood.com.au/about-us/)
contact.html                booking form + map
emergency.html               emergency triage content + FAQs
services.html                full service directory (all categories)
blog.html                    4 articles (inline expand, no separate post files)

services/
  general-dentistry.html     category hub -> 10 leaf pages
  cosmetic-dentistry.html    category hub -> 4 leaf pages
  orthodontic.html            category hub -> 2 leaf pages
  implants.html                category hub -> 2 leaf pages
  <service>.html              22 individual leaf pages (one per treatment)

anxiety-solutions/
  iv-sedation.html
  general-anesthesia.html

partials/
  header.html                 site header + desktop mega-menu + mobile drawer
  footer.html                 footer, map embed, social links

assets/
  css/style.css                design system + every component style
  js/main.js                    nav, mobile drawer, mega-menu, scroll-reveal,
                                 carousel, contact form — exposes window.initSite()
  js/include.js                  fetches partials/header.html + footer.html into
                                  #site-header / #site-footer, then calls initSite()
  images/                        all real clinic/team photos, no stock photography

legacy/                         original Elementor-era files, kept for reference only
```

## Editing locally — **must be served over HTTP**

Every page is root-relative (`/assets/...`, `/services/...`) and the header/
footer are injected at runtime via `fetch()`. That means `file://` will NOT
work — `fetch()` can't load the partials without a server. Always run:

```bash
cd underwood-dentist-site
python3 -m http.server 8080
# open http://localhost:8080
```

### Why partials instead of copy-pasting the header into 35 files

The nav has ~30 items (full services mega-menu + anxiety-solutions dropdown).
`partials/header.html` and `partials/footer.html` are the single source of
truth; `assets/js/include.js` fetches them into `#site-header` /
`#site-footer` placeholders on every page, then calls `window.initSite()`
(defined in `main.js`) once they're in the DOM — which is why `main.js` is
loaded *before* `include.js` in every page's `<script>` tags, but its nav/
dropdown logic only actually runs after injection completes.

**To change the nav, header, or footer: edit the two files in `partials/`
once.** Don't touch the markup in individual pages.

### Design system

Everything visual is driven by CSS custom properties at the top of
`assets/css/style.css`:

```css
--color-brand: #ff6600;         /* accent — used sparingly, not everywhere */
--color-ink:   #1c1a17;         /* body text / primary buttons */
--font-display: "Fraunces";     /* headings — a characterful serif, not Poppins */
--font-body:    "Inter";        /* body copy */
--radius-sm:   4px;             /* tight, not rounded-everything */
```

Deliberately avoided: pill-shaped glowing buttons, a repeated icon-in-circle
pattern, a gradient blob behind the hero, floating badge cards, and an
auto-scrolling logo marquee. Buttons are flat, cards use hairline borders
instead of drop shadows.

Component classes added for the multi-page rebuild: `.mega` (desktop
mega-menu), `.breadcrumbs`, `.page-hero` / `.page-hero-grid`, `.prose`
(article typography), `.content-layout` (main + sticky sidebar),
`.side-card`, `.faq-list` / `.faq-item` (native `<details>` accordion),
`.hub-grid` / `.hub-card`, `.category-block`, `.team-grid` / `.team-card`,
`.blog-grid` / `.blog-card`, `.emergency-banner`, `.info-grid`.

### Page template for leaf service pages

Every individual treatment page (e.g. `services/dental-fillings.html`,
`anxiety-solutions/iv-sedation.html`) follows the same shape — copy an
existing one as a starting point for a new service:

1. Breadcrumbs (`Home / Category / Page`)
2. `.page-hero-grid` — heading, lead, booking CTA, real clinic photo
3. `.content-layout` — two columns:
   - `.prose` article: what it is, what's involved, a `.faq-list` accordion
   - `.side-card`: quick facts, booking CTA, related-service links
4. `.emergency-banner` closing CTA

### Team photos

`about.html` and the homepage team preview use `.avatar` initials
placeholders (gradient background + initials) for the 4 dentists, because no
real headshots were available at build time. Bios, credentials and quotes
are real, sourced from the live about-us page. **Swap in real headshots
when available** — replace the `.avatar` div's initials markup with an
`<img>` in each `.team-card`.

### The appointment form

`#appointment-form` (used on `contact.html` and the homepage) has no
backend. On submit, `assets/js/main.js` builds a `mailto:` link from the
filled-in fields and opens the visitor's email client with the message
pre-filled. For production, wire the `<form>` up to a real service instead
(e.g. [Formspree](https://formspree.io),
[Netlify Forms](https://docs.netlify.com/forms/setup/)) and remove the JS
`preventDefault()`/mailto logic.

### Map

The footer map and the full-width map on `contact.html` are both no-API-key
Google Maps embeds (`https://www.google.com/maps?q=...&output=embed`). If
Google ever deprecates it, swap in a proper
[Maps Embed API](https://developers.google.com/maps/documentation/embed/get-started)
iframe with an API key.

## Known gaps / things to add

- **Real team headshots** — see "Team photos" above.
- **Real case-gallery captions** — the homepage carousel reuses generic alt
  text ("Dental treatment case N"); add real before/after descriptions if
  you have them.
- **Blog posts as real content** — `blog.html` uses inline `<details>`
  expansion for all 4 articles rather than separate post pages; split them
  out if the blog grows.
- A few health-fund logos (notably ClearCorrect, which is white-on-transparent)
  are faint against the light logo-row background — swap in a dark/colour
  variant if you have one.
