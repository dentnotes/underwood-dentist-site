(() => {
  "use strict";

  function initSite() {
    const header = document.querySelector(".site-header");

    /* ---------- Mark active nav link ---------- */
    const path = window.location.pathname.replace(/\/index\.html$/, "/") || "/";
    document.querySelectorAll("[data-nav]").forEach((a) => {
      if (a.getAttribute("data-nav") === path) a.classList.add("is-active");
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
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
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

    /* ---------- Appointment / contact form (static demo: opens mail client) ---------- */
    const form = document.querySelector("#appointment-form");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get("name") || "").toString().trim();
      const phone = (data.get("phone") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const date = (data.get("date") || "").toString().trim();
      const message = (data.get("message") || "").toString().trim();

      const subject = `Appointment request from ${name || "website visitor"}`;
      const bodyLines = [
        `Name: ${name}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
        date ? `Preferred date: ${date}` : null,
        "",
        message || "(no additional message)",
      ].filter(Boolean);

      const mailto = `mailto:info@dentistatunderwood.com.au?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

      const successEl = document.querySelector(".form-success");
      successEl?.classList.add("show");
      window.location.href = mailto;
      form.reset();
    });
  }

  window.initSite = initSite;
})();
