/* =========================================================
   Animation layer — split-text hero, 3D card tilt, cursor
   spotlight, magnetic buttons, staggered reveals.
   Fully additive: delete this file + its CSS to remove.
   ========================================================= */

"use strict";

(function initEffects() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return; // static site for motion-sensitive visitors

  /* ---------- 1 · Hero name: letter-by-letter reveal ---------- */
  const h1 = document.querySelector(".hero h1");
  if (h1) {
    let charIndex = 0;
    const splitNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const ch of node.textContent) {
          if (ch === " ") {
            frag.appendChild(document.createTextNode(" "));
            continue;
          }
          const s = document.createElement("span");
          s.className = "char";
          s.style.setProperty("--i", charIndex++);
          s.textContent = ch;
          frag.appendChild(s);
        }
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== "BR") {
        [...node.childNodes].forEach(splitNode);
      }
    };
    [...h1.childNodes].forEach(splitNode);
    h1.classList.add("split-ready");
  }

  /* ---------- 2 · Staggered grid reveals ---------- */
  document
    .querySelectorAll(".card-grid, .proj-grid, .edu-grid, .featured-grid, .sdg-grid, .work-with, .gallery-grid")
    .forEach((grid) => {
      [...grid.children].forEach((child, i) => {
        child.style.transitionDelay = `${Math.min(i * 70, 560)}ms`;
      });
    });

  /* ---------- 3 · 3D tilt on showcase cards ---------- */
  const TILT_SEL = ".feat-card, .tool-hero, .r-card, .proj-card, .edu-card";
  const MAXDEG = 7;
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest && e.target.closest(TILT_SEL);
    if (!el) return;
    el.classList.add("tilt-card"); // only after first hover, so reveals stay intact
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${(px * MAXDEG).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-py * MAXDEG).toFixed(2)}deg`);
  });
  document.addEventListener(
    "pointerout",
    (e) => {
      const el = e.target.closest && e.target.closest(TILT_SEL);
      if (!el || el.contains(e.relatedTarget)) return;
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--rx", "0deg");
    },
    true
  );

  /* ---------- 4 · Cursor spotlight on content cards ---------- */
  const SPOT_SEL = ".pub-item, .grant-card, .org-card, .impact-card, .quote-card, .feat-card, .r-card, .proj-card, .edu-card";
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest && e.target.closest(SPOT_SEL);
    if (!el) return;
    el.classList.add("spot");
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  });

  /* ---------- 5 · Magnetic buttons ---------- */
  const MAG_SEL = ".btn, .filter-btn, .social-link";
  const MAG_PULL = 0.22;
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest && e.target.closest(MAG_SEL);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.setProperty("--magx", `${(dx * MAG_PULL).toFixed(1)}px`);
    el.style.setProperty("--magy", `${(dy * MAG_PULL).toFixed(1)}px`);
  });
  document.addEventListener(
    "pointerout",
    (e) => {
      const el = e.target.closest && e.target.closest(MAG_SEL);
      if (!el || el.contains(e.relatedTarget)) return;
      el.style.setProperty("--magx", "0px");
      el.style.setProperty("--magy", "0px");
    },
    true
  );
})();
