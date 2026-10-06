(() => {
  "use strict";

  function initSite() {
    const header = document.querySelector(".site-header");

    /* ---------- Mark active nav link ---------- */
    const clean = (p) => p.replace(/\/index(\.html)?$/, "/").replace(/\.html$/, "") || "/";
    const path = clean(window.location.pathname);
    document.querySelectorAll("[data-nav]").forEach((a) => {
      if (clean(a.getAttribute("data-nav")) === path) a.classList.add("is-active");
    });

    /* ---------- Sticky header shadow + back-to-top visibility ---------- */
    const toTopBtn = document.querySelector(".to-top");
    const onScroll = () => {
      if (header) header.classList.toggle("scrolled", window.scrollY > 8);
      if (toTopBtn) toTopBtn.classList.toggle("show", window.scrollY > 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    toTopBtn?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    /* ---------- Mobile nav drawer ---------- */
    const mobileNav = document.querySelector(".mobile-nav");
    const burger = document.querySelector(".nav-burger");
    const closeBtn = document.querySelector(".mobile-nav__close");
    const backdrop = document.querySelector(".mobile-nav__backdrop");

    const openMobileNav = () => {
      mobileNav?.classList.add("open");
      document.body.style.overflow = "hidden";
    };
    const closeMobileNav = () => {
      mobileNav?.classList.remove("open");
      document.body.style.overflow = "";
    };
    burger?.addEventListener("click", openMobileNav);
    closeBtn?.addEventListener("click", closeMobileNav);
    backdrop?.addEventListener("click", closeMobileNav);

    document.querySelectorAll(".mobile-nav__group-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.closest(".mobile-nav__group")?.classList.toggle("open");
      });
    });
    document.querySelectorAll(".mobile-nav a").forEach((a) => {
      a.addEventListener("click", closeMobileNav);
    });

    /* ---------- Desktop dropdown / mega-menu via click (keyboard/touch friendly) ---------- */
    document.querySelectorAll(".main-nav .nav-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const li = btn.closest("li");
        document.querySelectorAll(".main-nav > li.open").forEach((other) => {
          if (other !== li) other.classList.remove("open");
        });
        li?.classList.toggle("open");
      });
    });
    document.querySelectorAll(".main-nav > li.mega-parent > a").forEach((link) => {
      link.addEventListener("click", (e) => {
        if (window.innerWidth < 1080) return; // let it navigate on mobile
        const li = link.closest("li");
        if (!li.classList.contains("open")) {
          e.preventDefault();
          document.querySelectorAll(".main-nav > li.open").forEach((other) => other.classList.remove("open"));
          li.classList.add("open");
        }
      });
    });
    document.addEventListener("click", () => {
      document.querySelectorAll(".main-nav > li.open").forEach((li) => li.classList.remove("open"));
    });

    /* ---------- Smooth-scroll for in-page anchors ---------- */
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (!id || id === "#") return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const headerH = header?.offsetHeight ?? 0;
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.scrollY - headerH - 16,
          behavior: "smooth",
        });
      });
    });

    /* ---------- Scroll reveal ---------- */
    const revealEls = document.querySelectorAll("[data-reveal]");
    if ("IntersectionObserver" in window && revealEls.length) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0, rootMargin: "0px 0px -40px 0px" }
      );
      revealEls.forEach((el, i) => {
        el.style.transitionDelay = `${Math.min(i % 4, 3) * 80}ms`;
        io.observe(el);
      });
    } else {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    }

    /* ---------- Gallery carousel (home page case gallery) ---------- */
    const track = document.querySelector(".gallery-track");
    const prevBtn = document.querySelector(".gallery-btn.prev");
    const nextBtn = document.querySelector(".gallery-btn.next");
    const scrollByCard = (dir) => {
      if (!track) return;
      const card = track.querySelector(".slide");
      const amount = (card?.getBoundingClientRect().width ?? 300) + 16;
      track.scrollBy({ left: dir * amount, behavior: "smooth" });
    };
    prevBtn?.addEventListener("click", () => scrollByCard(-1));
    nextBtn?.addEventListener("click", () => scrollByCard(1));

  }

  /* ---------- Google reviews (homepage) ---------- */
  const STAR = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z"/></svg>';
  const stars = (n) => {
    const full = Math.round(n);
    return `<span class="stars" role="img" aria-label="${n} out of 5 stars">${STAR.repeat(full)}${STAR.replace("<svg", '<svg class="off"').repeat(5 - full)}</span>`;
  };
  const esc = (str) => String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  async function loadReviews() {
    const section = document.getElementById("google-reviews");
    if (!section) return;
    try {
      const res = await fetch("/api/reviews");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.reviews || !data.reviews.length) return;

      section.querySelector("[data-reviews-rating]").textContent = Number(data.rating).toFixed(1);
      section.querySelector("[data-reviews-stars]").outerHTML = stars(data.rating);
      section.querySelector("[data-reviews-total]").textContent = data.total;
      section.querySelector("[data-reviews-link]").href = data.url;
      section.querySelector("[data-reviews-list]").innerHTML = data.reviews.map((r) => `
        <article class="review-card">
          ${stars(r.rating)}
          <p class="review-text">${esc(r.text)}</p>
          <button type="button" class="review-more" hidden>Read more</button>
          <a class="review-author" href="${esc(r.authorUrl)}" target="_blank" rel="noopener">
            ${r.authorPhoto ? `<img src="${esc(r.authorPhoto)}" alt="" width="40" height="40" loading="lazy" referrerpolicy="no-referrer">` : ""}
            <span><strong>${esc(r.author)}</strong><small>${esc(r.time)}</small></span>
          </a>
        </article>`).join("");
      section.hidden = false;

      // "Read more" only on reviews that are actually cut off
      section.querySelectorAll(".review-card").forEach((card) => {
        const text = card.querySelector(".review-text");
        const more = card.querySelector(".review-more");
        if (text.scrollHeight > text.clientHeight + 2) {
          more.hidden = false;
          more.addEventListener("click", () => {
            const open = card.classList.toggle("expanded");
            more.textContent = open ? "Show less" : "Read more";
          });
        }
      });
      section.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
    } catch (err) {
      // Leave the section hidden; reviews are a nice-to-have
    }
  }

  window.initSite = initSite;

  // The header and footer are part of each page's HTML (inlined by
  // scripts/build.py), so the site can start as soon as this deferred script runs.
  initSite();
  loadReviews();
})();
