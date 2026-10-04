(() => {
  "use strict";

  /* ---------- Sticky header shadow ---------- */
  const header = document.querySelector(".site-header");
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 8);
    toTopBtn && toTopBtn.classList.toggle("show", window.scrollY > 500);
  };

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

  // Close mobile nav + collapse desktop dropdowns when a real link is tapped
  document.querySelectorAll(".mobile-nav a").forEach((a) => {
    a.addEventListener("click", closeMobileNav);
  });

  /* ---------- Desktop dropdown via click-away (keyboard/touch friendly) ---------- */
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

  /* ---------- Gallery carousel ---------- */
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

  /* ---------- Back to top ---------- */
  const toTopBtn = document.querySelector(".to-top");
  toTopBtn?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Appointment form (static demo: opens mail client) ---------- */
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
})();
