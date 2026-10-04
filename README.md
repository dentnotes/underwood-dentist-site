# Underwood Dentist — Site Clone

A static snapshot of `dentistatunderwood.com.au`, reorganized for local editing.

## Structure

```
index.html          the page
assets/
  css/               all stylesheets (including Google Fonts @font-face files)
  js/                all scripts (including analytics/GTM bootstrap files)
  images/            all images (png, jpg, webp, svg)
  maps.html          the embedded Google Maps iframe target
```

This was originally a browser "Save As → Webpage, Complete" capture, which
dumps everything flat into one `..._files/` folder with mangled filenames
(`css(1)`, `js`, `destination`, `f.txt`, etc). This project sorts those into
`assets/css` / `assets/js` / `assets/images` and renames the ambiguous ones:

| Original name | Renamed to | What it is |
|---|---|---|
| `css` | `fonts-alata.css` | Google Fonts `@font-face` for Alata |
| `css(1)` | `fonts-poppins.css` | Google Fonts `@font-face` for Poppins |
| `css(2)` | `fonts-roboto.css` | Google Fonts `@font-face` for Roboto |
| `js` | `gtm-bootstrap-1.js` | Google Tag Manager container snippet |
| `js(1)` | `gtm-bootstrap-2.js` | Google Tag Manager container snippet |
| `destination` | `gtm-bootstrap-3.js` | Google Tag Manager container snippet |
| `f.txt` | `analytics.js` | Google tag / analytics loader |

Every `href`/`src` in `index.html` was rewritten to point at the new paths.

## Editing locally

No build step — open `index.html` directly, or serve it so relative paths
and the `maps.html` iframe behave like a real site:

```bash
cd underwood-dentist-site
python3 -m http.server 8080
# then open http://localhost:8080
```

The page is built with [Elementor](https://elementor.com) markup (lots of
`data-settings` JSON blobs and per-widget generated CSS in `<style>` blocks
inside `<head>`). Editing is just editing HTML/CSS/JS by hand — there's no
WordPress/Elementor backend here, so widget settings panels won't work; you
edit the rendered markup and CSS directly.

## Known gaps (things that won't work offline)

This is a frontend-only snapshot of a WordPress + Elementor site, so anything
that depended on the live server or third-party services is inert:

- **Google Tag Manager / analytics** (`assets/js/gtm-bootstrap-*.js`,
  `assets/js/analytics.js`) — loads but has nothing to report to.
- **Call tracking script** (`assets/js/call-tracking_9.js`) — same, dead weight.
- **HealthEngine "Book Now" widget** — the buttons wire up to
  `#he-webplugin-anchor-95121`, which calls out to healthengine.com.au; it
  will open the real booking page if you're online, otherwise it's a dead link.
- **WordPress AJAX endpoints** (`admin-ajax.php` URLs baked into some
  `data-settings` JSON, e.g. carousel/equal-height widgets) — these only
  mattered at build time on the live server; the page doesn't call them at
  runtime, so nothing is broken by their absence.
- **Google Maps embed** (`assets/maps.html`) — was saved as an empty
  `about:blank` placeholder by the browser (the real map is a cross-origin
  iframe the save process couldn't capture). Replace it with a real
  [Google Maps embed](https://www.google.com/maps) `<iframe src="...">` if
  you want a working map.
- **Icon-font glyphs for carousel arrows** — `solid.css` / `brands.css`
  (Font Awesome) reference `../webfonts/fa-*.woff` files that were never
  downloaded by the browser (most of the site's icons are inline SVG and
  don't need them, but the testimonial-carousel prev/next arrows do use
  `<i class="fas fa-angle-left">`). Fix by adding the Font Awesome CDN to
  `index.html`:
  ```html
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
  ```
- **Some section background images** (the 5-column service tiles — Family
  Dentistry, Root Canal, Teeth Whitening, etc.) are set via
  `background-image: url(https://dentistatunderwood.com.au/...)` inside
  `assets/css/post-3381.css` and were never downloaded locally — they'll
  only render while you're online. Download them into `assets/images/` and
  update those `url(...)` references if you need a fully offline copy.
- Several `<img>` `srcset` attributes still point at the live site's CDN
  (`dentistatunderwood.com.au/wp-content/uploads/...`) for responsive
  variants — only the base image each `<img>` uses was downloaded locally.
