/* =========================================================
   Mohamad Iyad Al-Khiami — site behaviour
   ========================================================= */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Theme toggle ---------- */
(function initTheme() {
  const stored = localStorage.getItem("theme");
  if (stored) document.documentElement.dataset.theme = stored;
  const btn = document.getElementById("theme-toggle");
  const SUN = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const setIcon = () => {
    btn.innerHTML = document.documentElement.dataset.theme === "light" ? MOON : SUN;
  };
  setIcon();
  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    setIcon();
    drawCitationsChart(true);
  });
})();

/* ---------- Mobile nav ---------- */
(function initNav() {
  const burger = document.getElementById("nav-burger");
  const links = document.getElementById("nav-links");
  burger.addEventListener("click", () => links.classList.toggle("open"));
  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => links.classList.remove("open"))
  );
})();

/* ---------- Particle network (hero) ---------- */
(function initParticles() {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas || prefersReducedMotion) return;
  const ctx = canvas.getContext("2d");
  let w, h, particles;
  const DENSITY = 1 / 16000;

  function accent() {
    const light = document.documentElement.dataset.theme === "light";
    return {
      node: light ? "rgba(14,127,168," : "rgba(76,201,240,",
      link: light ? "rgba(27,42,72," : "rgba(148,163,196,",
    };
  }

  function resize() {
    w = canvas.width = canvas.offsetWidth * devicePixelRatio;
    h = canvas.height = canvas.offsetHeight * devicePixelRatio;
    const count = Math.min(110, Math.floor((w * h * DENSITY) / devicePixelRatio ** 2));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35 * devicePixelRatio,
      vy: (Math.random() - 0.5) * 0.35 * devicePixelRatio,
      r: (Math.random() * 1.6 + 0.8) * devicePixelRatio,
    }));
  }

  function step() {
    ctx.clearRect(0, 0, w, h);
    const col = accent();
    const linkDist = 130 * devicePixelRatio;
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < linkDist) {
          ctx.strokeStyle = col.link + (0.14 * (1 - d / linkDist)).toFixed(3) + ")";
          ctx.lineWidth = devicePixelRatio * 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    for (const p of particles) {
      ctx.fillStyle = col.node + "0.65)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(step);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(step);
})();

/* ---------- Scroll reveal ---------- */
(function initReveal() {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
    { threshold: 0, rootMargin: "0px 0px -60px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();

/* ---------- Live scholar stats + counters ---------- */
(function initStats() {
  const s = typeof SCHOLAR_STATS !== "undefined" ? SCHOLAR_STATS : null;
  const pubCount = typeof PUBLICATIONS !== "undefined" ? PUBLICATIONS.length : 0;
  const values = {
    "stat-citations": s ? s.citations : 0,
    "stat-hindex": s ? s.hIndex : 0,
    "stat-i10": s ? s.i10Index : 0,
    "stat-pubs": pubCount,
  };
  document.querySelectorAll("[data-stat]").forEach((el) => {
    const key = el.dataset.stat;
    if (key in values) el.dataset.count = values[key];
  });
  const updated = document.querySelectorAll(".js-updated");
  if (s) updated.forEach((el) => (el.textContent = s.updated));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      io.unobserve(el);
      const target = parseInt(el.dataset.count, 10) || 0;
      if (prefersReducedMotion) { el.firstChild.textContent = target; return; }
      const dur = 1400, t0 = performance.now();
      (function tick(t) {
        const p = Math.min(1, (t - t0) / dur);
        el.firstChild.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll("[data-count]").forEach((el) => io.observe(el));
})();

/* ---------- Citations-per-year chart ---------- */
function drawCitationsChart(instant) {
  const canvas = document.getElementById("citations-chart");
  if (!canvas || typeof SCHOLAR_STATS === "undefined") return;
  const ctx = canvas.getContext("2d");
  const dpr = devicePixelRatio;
  const W = (canvas.width = canvas.offsetWidth * dpr);
  const H = (canvas.height = canvas.offsetHeight * dpr);
  const style = getComputedStyle(document.documentElement);
  const accent = style.getPropertyValue("--accent").trim();
  const muted = style.getPropertyValue("--muted").trim();
  const line = style.getPropertyValue("--line").trim();

  const entries = Object.entries(SCHOLAR_STATS.perYear).sort((a, b) => a[0] - b[0]);
  const max = Math.max(...entries.map(([, v]) => v)) * 1.15;
  const padL = 34 * dpr, padB = 30 * dpr, padT = 12 * dpr, padR = 8 * dpr;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const bw = Math.min(56 * dpr, (plotW / entries.length) * 0.55);

  let start = null;
  const dur = instant || prefersReducedMotion ? 0 : 900;

  function frame(t) {
    if (start === null) start = t;
    const p = dur === 0 ? 1 : Math.min(1, (t - start) / dur);
    const ease = 1 - Math.pow(1 - p, 3);
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = line;
    ctx.lineWidth = dpr;
    for (let g = 0; g <= 4; g++) {
      const y = padT + (plotH * g) / 4;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillStyle = muted;
      ctx.font = `${10 * dpr}px Inter, sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText(Math.round(max * (1 - g / 4)), padL - 6 * dpr, y + 3 * dpr);
    }

    entries.forEach(([year, val], i) => {
      const x = padL + (plotW * (i + 0.5)) / entries.length - bw / 2;
      const bh = (val / max) * plotH * ease;
      const grad = ctx.createLinearGradient(0, H - padB - bh, 0, H - padB);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, accent + "55");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, H - padB - bh, bw, bh, [6 * dpr, 6 * dpr, 0, 0]);
      ctx.fill();
      ctx.fillStyle = muted;
      ctx.textAlign = "center";
      ctx.font = `${11 * dpr}px Inter, sans-serif`;
      ctx.fillText(year, x + bw / 2, H - padB + 18 * dpr);
      if (p === 1) {
        ctx.fillStyle = accent;
        ctx.font = `bold ${11 * dpr}px Inter, sans-serif`;
        ctx.fillText(val, x + bw / 2, H - padB - bh - 6 * dpr);
      }
    });
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

(function initChart() {
  const canvas = document.getElementById("citations-chart");
  if (!canvas) return;
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      drawCitationsChart(false);
      io.disconnect();
    }
  }, { threshold: 0.3 });
  io.observe(canvas);
  window.addEventListener("resize", () => drawCitationsChart(true));
})();

/* ---------- Publications ---------- */
(function initPublications() {
  if (typeof PUBLICATIONS === "undefined") return;
  const listEl = document.getElementById("pub-list");
  const countEl = document.getElementById("pub-count");
  const searchEl = document.getElementById("pub-search");
  const filterBtns = document.querySelectorAll(".filter-btn");
  let activeType = "all";

  const typeLabel = { journal: "Journal", conference: "Conference", chapter: "Chapter", other: "Other" };

  function bibtex(pub) {
    const first = pub.authors.split(",")[0].trim().replace(/[^A-Za-z-]/g, "");
    const key = `${first}${pub.year}`;
    const entryType = { journal: "article", conference: "inproceedings", chapter: "incollection" }[pub.type] || "misc";
    const venueField = pub.type === "journal" ? "journal" : "booktitle";
    const lines = [
      `@${entryType}{${key},`,
      `  author = {${pub.authors.replace(/&/g, "and")}},`,
      `  title  = {${pub.title}},`,
      `  ${venueField} = {${pub.venue}},`,
      `  year   = {${pub.year}}${pub.doi ? "," : ""}`,
    ];
    if (pub.doi) lines.push(`  doi    = {${pub.doi}}`);
    lines.push("}");
    return lines.join("\n");
  }

  function render() {
    const q = (searchEl.value || "").toLowerCase();
    const shown = PUBLICATIONS.filter((p) => {
      const matchesType = activeType === "all" || p.type === activeType;
      const hay = `${p.title} ${p.authors} ${p.venue} ${(p.tags || []).join(" ")} ${p.year}`.toLowerCase();
      return matchesType && hay.includes(q);
    }).sort((a, b) => b.year - a.year);

    countEl.textContent = `${shown.length} / ${PUBLICATIONS.length} publications`;
    listEl.innerHTML = "";

    for (const pub of shown) {
      const item = document.createElement("article");
      item.className = "pub-item";
      const link = pub.doi ? `https://doi.org/${pub.doi}` : pub.url || "";
      item.innerHTML = `
        <div class="pub-top">
          <div class="pub-year">${pub.year}</div>
          <div class="pub-body">
            <div class="pub-title">${pub.title}</div>
            <div class="pub-authors">${pub.authors}</div>
            <div class="pub-venue">${pub.venue}</div>
            <div class="pub-actions"></div>
            <div class="pub-abstract"></div>
            <div class="pub-photos"></div>
          </div>
          <span class="pub-type-badge pt-${pub.type}">${typeLabel[pub.type] || pub.type}</span>
        </div>`;

      const actions = item.querySelector(".pub-actions");
      const abstractEl = item.querySelector(".pub-abstract");

      if (pub.abstract) {
        const btn = document.createElement("button");
        btn.className = "pub-action";
        btn.textContent = "Abstract";
        abstractEl.textContent = pub.abstract;
        btn.addEventListener("click", () => {
          abstractEl.classList.toggle("open");
          btn.textContent = abstractEl.classList.contains("open") ? "Hide abstract" : "Abstract";
        });
        actions.appendChild(btn);
      }
      if (link) {
        const a = document.createElement("a");
        a.className = "pub-action";
        a.href = link;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = pub.doi ? "DOI ↗" : "Link ↗";
        actions.appendChild(a);
      }
      if (pub.photos && pub.photos.length) {
        const photosEl = item.querySelector(".pub-photos");
        const pBtn = document.createElement("button");
        pBtn.className = "pub-action";
        pBtn.textContent = `Behind this research (${pub.photos.length})`;
        pBtn.addEventListener("click", () => {
          photosEl.classList.toggle("open");
          pBtn.textContent = photosEl.classList.contains("open")
            ? "Hide photos"
            : `Behind this research (${pub.photos.length})`;
        });
        pub.photos.forEach((ph) => {
          const fig = document.createElement("figure");
          fig.className = "pub-photo" + (ph.video ? " pub-photo-video" : "");
          const img = document.createElement("img");
          img.src = ph.video ? ph.poster : ph.src;
          img.alt = ph.caption;
          img.loading = "lazy";
          img.addEventListener("error", () => {
            fig.remove();
            if (!photosEl.children.length) pBtn.remove(); // no photos on disk yet
          });
          img.addEventListener("click", () => {
            if (!window.openGalleryLightbox) return;
            if (ph.video) window.openGalleryLightbox({ src: ph.video, type: "video", poster: ph.poster, caption: ph.caption });
            else window.openGalleryLightbox(ph);
          });
          const cap = document.createElement("figcaption");
          cap.textContent = ph.caption;
          fig.append(img, cap);
          photosEl.appendChild(fig);
        });
        actions.appendChild(pBtn);
      }
      listEl.appendChild(item);
    }
  }

  filterBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeType = btn.dataset.type;
      render();
    })
  );
  searchEl.addEventListener("input", render);
  render();
})();

/* ---------- Gallery ---------- */
(function initGallery() {
  if (typeof GALLERY === "undefined") return;
  const grid = document.getElementById("gallery-grid");
  const controls = document.getElementById("gallery-controls");
  if (!grid) return;
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = lightbox.querySelector("img");
  const lightboxVideo = lightbox.querySelector("video");
  const lightboxCaption = lightbox.querySelector(".lightbox-caption");
  let activeCat = "All";

  const categories = ["All", ...new Set(GALLERY.map((g) => g.category))];
  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (cat === "All" ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      controls.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeCat = cat;
      render();
    });
    controls.appendChild(btn);
  });

  window.openGalleryLightbox = openLightbox; // used by publication photo strips
  function openLightbox(item) {
    const isVideo = item.type === "video";
    lightboxImg.style.display = isVideo ? "none" : "";
    lightboxVideo.style.display = isVideo ? "" : "none";
    if (isVideo) {
      lightboxVideo.src = item.src;
      lightboxVideo.play().catch(() => {});
    } else {
      lightboxImg.src = item.src;
    }
    lightboxCaption.textContent = item.caption;
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    lightbox.classList.remove("open");
    lightboxVideo.pause();
    lightboxVideo.removeAttribute("src");
    lightboxVideo.load();
    document.body.style.overflow = "";
  }
  // Let the user click the video controls without closing the lightbox
  lightboxVideo.addEventListener("click", (e) => e.stopPropagation());
  lightbox.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeLightbox());

  function render() {
    grid.innerHTML = "";
    GALLERY.filter((g) => activeCat === "All" || g.category === activeCat).forEach((item) => {
      const cell = document.createElement("figure");
      cell.className = "g-item";
      if (item.type === "video") {
        const vid = document.createElement("video");
        vid.src = item.src;
        vid.muted = true;
        vid.preload = "none";
        vid.playsInline = true;
        if (item.poster) vid.poster = item.poster;
        const cap = document.createElement("figcaption");
        cap.className = "g-caption";
        cap.textContent = item.caption;
        const play = document.createElement("div");
        play.className = "g-play";
        play.textContent = "▶";
        cell.append(vid, play, cap);
        cell.onclick = () => openLightbox(item);
        grid.appendChild(cell);
        return;
      }
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.caption;
      img.loading = "lazy";
      img.addEventListener("error", () => {
        // Photo not added yet — show a labelled placeholder instead
        cell.innerHTML = `
          <div class="g-placeholder">
            <div class="ph-icon"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
            <div class="ph-caption">${item.caption}</div>
            <div class="ph-file">add: ${item.src.split("/").pop()}</div>
          </div>`;
        cell.style.cursor = "default";
        cell.onclick = null;
      });
      const cap = document.createElement("figcaption");
      cap.className = "g-caption";
      cap.textContent = item.caption;
      cell.append(img, cap);
      cell.onclick = () => img.naturalWidth > 0 && openLightbox(item);
      grid.appendChild(cell);
    });
  }
  render();
})();

/* ---------- Project card photo thumbnails ---------- */
(function initProjThumbs() {
  document.querySelectorAll(".proj-thumb").forEach((t) => {
    t.addEventListener("click", () => {
      if (!window.openGalleryLightbox) return;
      if (t.dataset.video) {
        window.openGalleryLightbox({ src: t.dataset.video, type: "video", poster: t.dataset.poster, caption: t.dataset.caption });
      } else {
        window.openGalleryLightbox({ src: t.getAttribute("src"), caption: t.dataset.caption });
      }
    });
  });
})();

/* ---------- Portrait fallback ---------- */
(function initPortrait() {
  const img = document.getElementById("portrait-img");
  if (!img) return;
  img.addEventListener("error", () => {
    const fb = document.createElement("div");
    fb.className = "portrait-fallback";
    fb.textContent = "MIA";
    img.replaceWith(fb);
  });
})();

/* ---------- Collaboration world map ---------- */
(function initCollabMap() {
  const wrap = document.getElementById("collab-map");
  if (!wrap || typeof MAP_DOTS_PATH === "undefined") return;

  const W = 1000, H = 500;
  const proj = (lat, lon) => [
    +((lon + 180) / 360 * W).toFixed(1),
    +((90 - lat) / 180 * H).toFixed(1),
  ];

  const HOME = { name: "Kuwait", lat: 29.37, lon: 47.98, tip: "Kuwait — home base: Australian University · Kuwait University · KFAS" };
  const PARTNERS = [
    { name: "Denmark", lat: 57.05, lon: 9.92, dy: -8, tip: "Denmark — Aalborg University: PhD research & external lecturing" },
    { name: "Germany", lat: 51.0, lon: 10.3, dy: 12, tip: "Germany — SCAFFOLD comparative pilots in construction-management education" },
    { name: "USA", lat: 40.43, lon: -86.91, dy: 14, tip: "USA — Purdue University: SCAFFOLD, AI literacy in engineering education" },
    { name: "Canada", lat: 43.65, lon: -79.38, dy: -6, tip: "Canada — research collaboration" },
    { name: "Australia", lat: -33.87, lon: 151.21, tip: "Australia — Engineers Australia: chartered engineer & accreditation" },
    { name: "UAE", lat: 25.2, lon: 55.27, dy: -8, tip: "UAE — conferences & regional collaboration" },
  ];

  const [hx, hy] = proj(HOME.lat, HOME.lon);
  let arcs = "", movers = "", nodes = "";

  PARTNERS.forEach((p, i) => {
    const [x, y] = proj(p.lat, p.lon);
    const mx = (hx + x) / 2;
    const my = (hy + y) / 2 - (Math.hypot(x - hx, y - hy) * 0.22 + 18);
    const id = `arc-${i}`;
    arcs += `<path id="${id}" class="map-arc" d="M${hx} ${hy} Q${mx} ${my} ${x} ${y}" pathLength="1" style="animation-delay:${0.35 * i}s"/>`;
    movers += `<circle class="map-mover" r="2.6"><animateMotion dur="${3.2 + i * 0.45}s" begin="${0.5 * i}s" repeatCount="indefinite"><mpath href="#${id}"/></animateMotion></circle>`;
    const anchor = x > hx ? "start" : "end";
    const dx = x > hx ? 9 : -9;
    const dy = (p.dy || 0) + 4;
    nodes += `
      <g class="map-node"><title>${p.tip}</title>
        <circle class="node-ring" cx="${x}" cy="${y}" r="4.5">
          <animate attributeName="r" values="4.5;11;4.5" dur="2.8s" begin="${i * 0.4}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.55;0;0.55" dur="2.8s" begin="${i * 0.4}s" repeatCount="indefinite"/>
        </circle>
        <circle class="node-dot" cx="${x}" cy="${y}" r="4"/>
        <text class="node-label" x="${x + dx}" y="${y + dy}" text-anchor="${anchor}">${p.name.toUpperCase()}</text>
      </g>`;
  });

  wrap.innerHTML = `
    <svg viewBox="0 52 1000 330" role="img" aria-label="World map showing research collaborations across Kuwait, Denmark, USA, Canada, Australia and the UAE" xmlns="http://www.w3.org/2000/svg">
      <path class="map-dots" d="${MAP_DOTS_PATH}"/>
      ${arcs}${movers}
      <g class="map-node"><title>${HOME.tip}</title>
        <circle class="node-ring home-ring" cx="${hx}" cy="${hy}" r="6">
          <animate attributeName="r" values="6;15;6" dur="2.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2.8s" repeatCount="indefinite"/>
        </circle>
        <circle class="node-dot home-dot" cx="${hx}" cy="${hy}" r="5.5"/>
        <text class="node-label home-label" x="${hx}" y="${hy + 22}" text-anchor="middle">KUWAIT — HOME</text>
      </g>
      ${nodes}
    </svg>`;
})();

/* ---------- Active nav highlighting ---------- */
(function initActiveNav() {
  const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const sections = links
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  function update() {
    const probe = window.scrollY + window.innerHeight * 0.38;
    let current = null;
    for (const s of sections) {
      if (s.offsetTop <= probe) current = s.id;
    }
    links.forEach((a) =>
      a.classList.toggle("active", a.getAttribute("href") === "#" + current)
    );
  }
  window.addEventListener("scroll", update, { passive: true });
  update();
})();

/* ---------- Scroll progress bar ---------- */
(function initProgress() {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;
  function update() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", update, { passive: true });
  update();
})();

/* ---------- Hero rotating keywords ---------- */
(function initRotator() {
  const el = document.getElementById("hero-rotator");
  if (!el || prefersReducedMotion) return;
  const words = [
    "industrial exoskeletons",
    "construction robotics",
    "virtual reality",
    "applied AI",
    "worker safety",
    "building informatics",
  ];
  let i = 0;
  setInterval(() => {
    el.classList.add("fade-out");
    setTimeout(() => {
      i = (i + 1) % words.length;
      el.textContent = words[i];
      el.classList.remove("fade-out");
    }, 380);
  }, 3000);
})();

/* ---------- Back to top ---------- */
(function initBackTop() {
  const btn = document.getElementById("back-top");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.classList.toggle("show", window.scrollY > 700);
  }, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
})();

/* ---------- Footer year ---------- */
document.getElementById("footer-year").textContent = new Date().getFullYear();

/* ---------- Site visits (GoatCounter) ---------- */
(async function initVisits() {
  // Needs "allow adding visitor counts" enabled in GoatCounter settings.
  try {
    const resp = await fetch("https://miyadalkh.goatcounter.com/counter/TOTAL.json");
    if (!resp.ok) return;
    const data = await resp.json();
    if (data.count) {
      document.getElementById("visit-count").textContent =
        `${String(data.count).trim()} site visits`;
    }
  } catch {
    // stay silent — the footer simply shows no counter
  }
})();
