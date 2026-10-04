# Underwood Dentist — Site Rebuild

A clean, hand-built static site for "Dentist at Underwood," rebuilt from
scratch from a browser-saved snapshot of `dentistatunderwood.com.au`. No
framework, no build step, no WordPress/Elementor — just semantic HTML, one
CSS file, and one JS file.

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

Nothing in `legacy/` is loaded by `index.html` — it's there in case you want
to compare against the original or recover a specific bit of copy. Safe to
delete if you don't need it.

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
auto-scrolling logo marquee — all common "obviously AI-generated" landing
page tells. Buttons are flat, cards use hairline borders instead of drop
shadows, section labels are a plain underlined caption instead of a
bullet+eyebrow, and services are a numbered list rather than a grid of
identical icon cards.

Fonts load from Google Fonts via CDN with a system-font fallback stack, so
the page still reads fine offline — it just won't have the exact webfonts.

### Sections (in order)

Header (sticky, dropdown nav + mobile drawer) → Hero → Pull-quote intro →
2 alternating feature rows (how we treat people / kids) → About (with a
payment-plans callout folded in, instead of its own repeated section) →
Services (12-item numbered list, two columns) → **Inside the Clinic** — a
real photo gallery using the actual clinic photos (`assets/images/home-*`,
plus the sterilisation and curing-light shots), laid out as an asymmetric
grid with a couple of captioned tiles, not a 4-up card grid → Smile
transformation case carousel → Health-fund logos (static row, no marquee) →
Appointment/contact (info + form) → Footer (links, hours, map, social).

### The "Inside the Clinic" gallery

This is the real, non-generic part — it uses every actual clinic/team photo
that came with the original site (no stock photography swapped in). If you
have more real photos of the space, team, or equipment, drop them into
`assets/images/` and add a `<figure>` to `.clinic-gallery` in `index.html`;
the grid uses CSS `grid-auto-flow: dense` so odd-sized additions just slot
in. Use the `g-wide` / `g-tall` / `g-big` classes on a `<figure>` to make a
particular photo span more than one cell.

### The appointment form

`#appointment-form` has no backend. On submit, `assets/js/main.js` builds a
`mailto:` link from the filled-in fields and opens the visitor's email
client with the message pre-filled. For production, wire the `<form>` up to
a real service instead (e.g. [Formspree](https://formspree.io),
[Netlify Forms](https://docs.netlify.com/forms/setup/)) and remove the JS
`preventDefault()`/mailto logic.

### Map

The footer map is a no-API-key Google Maps embed
(`https://www.google.com/maps?q=...&output=embed`) — the standard "legacy"
embed format, needs no setup. If Google ever deprecates it, swap in a proper
[Maps Embed API](https://developers.google.com/maps/documentation/embed/get-started)
iframe with an API key.

## Known gaps / things to add

- **Service detail pages** — nav links and the services list currently point
  at `#services` on the same page. Build real sub-pages if you want them
  (e.g. `/services/veneers.html`) and update those `href`s.
- **Real case-gallery captions** — the carousel reuses generic alt text
  ("Dental treatment case N"); add real before/after descriptions if you
  have them.
- **Blog / FAQ / Smile Gallery** — present as nav items on the original
  site but not rebuilt here.
- A few health-fund logos (notably ClearCorrect, which is white-on-transparent)
  are faint against the light logo-row background — swap in a dark/colour
  variant if you have one.
