/* Injects the shared header/footer partials, then boots main.js's initSite(). */
(() => {
  "use strict";

  async function include(selector, url) {
    const el = document.querySelector(selector);
    if (!el) return;
    try {
      const res = await fetch(url);
      el.innerHTML = await res.text();
    } catch (err) {
      console.error(`Failed to load ${url}`, err);
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await Promise.all([
      include("#site-header", "/partials/header.html"),
      include("#site-footer", "/partials/footer.html"),
    ]);
    if (typeof window.initSite === "function") window.initSite();
  });
})();
