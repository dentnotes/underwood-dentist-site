# Underwood Dentist — Site Rebuild

A clean, modern, hand-built static site for "Dentist at Underwood," rebuilt
from scratch from a browser-saved snapshot of `dentistatunderwood.com.au`.
No framework, no build step, no WordPress/Elementor — just semantic HTML,
one CSS file, and one JS file.

## Structure

```
index.html            the whole page
assets/
  css/style.css        design system + all styles (custom properties, components)
  js/main.js            nav, mobile drawer, scroll-reveal, carousel, contact form
  images/               all photos, case gallery, and health-fund logos
legacy/                 the original Elementor-era files, kept for reference
  index-original.html
  css/, js/             the ~50 original stylesheets / ~40 scripts (unused now)
  maps.html
```

Nothing in `legacy/` is loaded by `index.html` — it's just there in case you
want to compare against the original or recover a specific bit of copy/markup.
Safe to delete if you don't need it.

## Editing locally

No build step. Open `index.html` directly, or serve it (recommended, so the
Google Maps iframe and relative paths behave exactly like production):

```bash
cd underwood-dentist-site
python3 -m http.server 8080
# open http://localhost:8080
```

### Design system

Everything visual is driven by CSS custom properties at the top of
`assets/css/style.css` — change these and the whole site updates:

```css
--color-brand: #ff6600;      /* primary accent */
--color-ink:   #16181d;      /* body text */
--font-heading: "Poppins";   /* headings */
--font-body:    "Inter";     /* body copy */
--radius-md:   14px;         /* card corner radius */
```

Fonts load from Google Fonts via CDN (`<link>` in `<head>`) with a system-font
fallback stack, so the page still reads fine with no internet connection —
it just won't have the exact webfonts.

### Sections (in order)

Header (sticky, with dropdown + mobile drawer) → Hero → Trust intro →
3 alternating feature rows (care philosophy / family-friendly / payment
plans) → About → Services grid (12 cards, hand-drawn inline SVG icons, no
icon-font dependency) → "Why Choose Us" (4 photo cards) → Smile-transformation
case gallery (scroll-snap carousel) → Health-fund affiliations (auto-scrolling
logo marquee) → Appointment/contact section (info + form) → Footer (links,
hours, map, social).

### The appointment form

`#appointment-form` has no backend. On submit, `assets/js/main.js` builds a
`mailto:` link from the filled-in fields and opens the visitor's email
client with the message pre-filled — a reasonable "it actually does
something" behaviour for a static site. For production, wire the `<form>`
up to a real service instead (e.g. [Formspree](https://formspree.io),
[Netlify Forms](https://docs.netlify.com/forms/setup/), or your own API) and
remove the JS `preventDefault()`/mailto logic.

### Map

The footer map is a no-API-key Google Maps embed
(`https://www.google.com/maps?q=...&output=embed`). It's the standard
"legacy" embed format and needs no setup, but if Google ever deprecates it,
swap in a proper [Maps Embed API](https://developers.google.com/maps/documentation/embed/get-started)
iframe with an API key.

## Known gaps / things to add

- **Service detail pages** — nav links and service cards currently point at
  `#services` on the same page. If you want real sub-pages (e.g.
  `/services/veneers.html`), build them and update those `href`s.
- **Real case-gallery captions** — the carousel currently reuses generic alt
  text ("Dental treatment case N"); add real before/after descriptions if
  you have them.
- **Blog / FAQ / Smile Gallery** — present as nav items in the original site
  but not rebuilt here; add pages and link them from the header if needed.
- Affiliation logos are a mix of PNG/WebP at inconsistent native sizes —
  they're normalized visually via `height: 34px` + `object-fit: contain` in
  CSS, but a few (e.g. the ClearCorrect logo, which is white-on-transparent)
  will look faint on the light marquee background. Swap in a colour/dark
  variant of that logo if you have one.
