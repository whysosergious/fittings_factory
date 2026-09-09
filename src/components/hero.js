/**
 * @fileoverview Hero slideshow — vanilla JS, no Shadow DOM, SEO-safe.
 * One panel (title+desc+pagination+button) is overlaid on image on desktop,
 * stacked below on mobile. Button stays fixed; slides rotate.
 * - Keeps CTA + next section header visible by fitting to viewport height.
 * - Swipeable via Pointer/Touch events.
 */

/**
 * @typedef {{ title: string, desc: string }} SlideData
 */

/** @type {SlideData[]} */
const SLIDES = [
  {
    title: "Крючки-вешалки",
    desc: "В нашем интернет-магазине представлен широкий<br />ассортимент крючков разных цветов и размеров.<br />Качество гарантировано производителем!",
  },
  {
    title: "Фурнитура для военных ящиков",
    desc: '<span style="color:var(--brand-red)">Самые низкие цены в БЕЛАРУСИ.</span><br />Всегда в наличии на складе.<br /><span style="color:var(--brand-red);font-weight:700">Отгрузка 1 день!</span>',
  },
  {
    title: "Комплектующие для пластиковых окон",
    desc: "Надежная фурнитура для окон от производителя. Цените качество — обращайтесь к профессионалам!",
  },
  {
    title: "Мебельная фурнитура",
    desc: "Широкий ассортимент мебельной фурнитуры от производителя. Гарантированное качество обеспечит долгую функциональность Вашей мебели.",
  },
  {
    title: "Скобяные изделия",
    desc: "Качественные скобяные изделия от производителя — залог жизни в комфортных и безопасных условиях!",
  },
  {
    title: "Механизмы трансформации",
    desc: "Надежные механизмы для регулировки спинок, подлокотников, подголовников в мебели!",
  },
];

export class HeroSlideshow {
  /** @type {HTMLElement | null} */
  root = null;
  /** @type {NodeListOf<HTMLElement> | null} */
  slides = null;
  /** @type {NodeListOf<HTMLButtonElement> | null} */
  dots = null;
  /** @type {HTMLElement | null} */
  titleEl = null;
  /** @type {HTMLElement | null} */
  descEl = null;
  /** @type {HTMLElement | null} */
  viewportEl = null;
  /** @type {HTMLElement | null} */
  panelEl = null;
  /** @type {number} */
  current = 0;
  /** @type {number | null} */
  timer = null;
  /** @type {number} */
  interval = 5000;
  /** @type {number | null} */
  _resizeTimer = null;
  /** @type {boolean} */
  _isDragging = false;

  /**
   * @param {string} selector
   */
  constructor(selector = "#hero") {
    this.root = document.querySelector(selector);
    if (!this.root) return;
    this.slides = this.root.querySelectorAll(".hero-slide");
    this.dots = this.root.querySelectorAll(".hero-pagination .dot");
    this.titleEl = this.root.querySelector("#hero-title");
    this.descEl = this.root.querySelector("#hero-desc");
    this.viewportEl = this.root.querySelector(".hero-viewport");
    this.panelEl = this.root.querySelector(".hero-panel");
    this.bind();
    this.goTo(0, false);
    this.start();
    this.initSwipe();
    this.initViewportFit();
    // Initial fit after images/layout settled
    requestAnimationFrame(() => this.fitToViewport());
    // Re-fit after full load (images decoded) and fonts ready
    window.addEventListener("load", () => this.fitToViewport(), { once: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => this.fitToViewport());
    }
  }

  bind() {
    if (!this.root || !this.dots) return;
    this.dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const idx = Number(dot.dataset.index || 0);
        this.goTo(idx, true);
        this.restart();
      });
      dot.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          this.next();
          this.restart();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          this.prev();
          this.restart();
        }
      });
    });

    // Pause on hover/focus
    this.root.addEventListener("mouseenter", () => this.stop());
    this.root.addEventListener("mouseleave", () => this.start());
    this.root.addEventListener("focusin", () => this.stop());
    this.root.addEventListener("focusout", () => this.start());

    // Keyboard on root
    this.root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        this.next();
        this.restart();
      } else if (e.key === "ArrowLeft") {
        this.prev();
        this.restart();
      }
    });
  }

  /**
   * Viewport-fit: ensure CTA button visible and about header peeks.
   * Uses viewport height minus header minus panel (mobile) minus peek.
   */
  initViewportFit() {
    const onResize = () => {
      if (this._resizeTimer) clearTimeout(this._resizeTimer);
      // @ts-ignore
      this._resizeTimer = setTimeout(() => this.fitToViewport(), 120);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onResize);
    }
  }

  getViewportHeight() {
    // Use visualViewport for mobile browsers with dynamic toolbars
    if (window.visualViewport && typeof window.visualViewport.height === "number") {
      return window.visualViewport.height;
    }
    return window.innerHeight;
  }

  fitToViewport() {
    if (!this.root || !this.panelEl || !this.slides) return;

    const header = document.querySelector(".header");
    const about = document.querySelector("#about");
    const vh = this.getViewportHeight();
    const headerH = header ? header.getBoundingClientRect().height : 64;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;

    // Amount of next section to peek — title + breathing room
    let peek = 40;
    if (about) {
      const title = about.querySelector(".section-title");
      const titleH = title ? title.getBoundingClientRect().height : 28;
      // padding top of about-section (2.5rem = 40) + title
      peek = Math.max(32, Math.min(72, titleH + 24));
    }

    const available = vh - headerH;
    // Guard: if viewport is extremely small, don't collapse to 0
    if (available <= 160) return;

    let targetImgH;

    if (isDesktop) {
      // Desktop: panel is absolute overlay, hero height == image height
      // Ensure image leaves peek visible
      targetImgH = available - peek;
      // Clamp to sensible bounds: 320 - 680 (matches CSS)
      targetImgH = Math.max(320, Math.min(680, targetImgH));
      // Also respect original max calc(100vh -72px) intent
      const maxAllowed = vh - headerH - 2;
      targetImgH = Math.min(targetImgH, maxAllowed);
    } else {
      // Mobile/tablet: image + panel stacked
      // Panel height includes CTA; measure accurately (might have wrapping)
      const panelH = this.panelEl.getBoundingClientRect().height;
      // If panel not yet laid out (0), fallback estimate 220
      const effectivePanelH = panelH > 40 ? panelH : 220;
      targetImgH = available - effectivePanelH - peek;
      // Clamp: allow 180 - 520 (original mobile 520)
      targetImgH = Math.max(180, Math.min(520, targetImgH));

      // On very short viewports with tall panel, ensure at least image visible
      // and CTA still requires scroll minimally — but we prioritize CTA visibility
      // by using clamp above; if still overflow, reduce peek slightly
      const total = targetImgH + effectivePanelH;
      if (total > available - 8) {
        const overflow = total - (available - 8);
        targetImgH = Math.max(160, targetImgH - overflow);
      }
    }

    // Apply to all slides (so next slide also fits) and to hero for consistency
    this.slides.forEach((slide) => {
      const img = slide.querySelector(".hero-img");
      if (img instanceof HTMLElement) {
        img.style.height = targetImgH + "px";
        img.style.minHeight = targetImgH + "px";
        img.style.maxHeight = targetImgH + "px";
      }
    });

    // Also set CSS variable for any CSS that wants to reference
    this.root.style.setProperty("--hero-img-h", targetImgH + "px");
  }

  initSwipe() {
    const vp = this.viewportEl || this.root;
    if (!vp) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isPointerDown = false;
    const SWIPE_THRESHOLD = 40; // px
    const RESTRAINT = 90; // max vertical drift to still count as swipe
    const ALLOWED_TIME = 700; // ms

    const onStart = (x, y) => {
      startX = x;
      startY = y;
      startTime = Date.now();
      isPointerDown = true;
      this._isDragging = false;
      // Pause autoplay during interaction
      this.stop();
    };

    const onMove = (x, y) => {
      if (!isPointerDown) return;
      const dx = x - startX;
      const dy = y - startY;
      // Consider dragging if horizontal movement dominates and exceeds 10px
      if (!this._isDragging && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        this._isDragging = true;
        vp.classList.add("is-dragging");
      }
    };

    const onEnd = (x, y) => {
      if (!isPointerDown) return;
      isPointerDown = false;
      const wasDragging = this._isDragging;
      this._isDragging = false;
      vp.classList.remove("is-dragging");

      const dx = x - startX;
      const dy = y - startY;
      const elapsed = Date.now() - startTime;

      // Only trigger swipe if horizontal swipe with enough distance and limited vertical
      if (elapsed <= ALLOWED_TIME && Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dy) <= RESTRAINT) {
        if (dx < 0) this.next();
        else this.prev();
      } else if (wasDragging) {
        // Dragged but not enough for swipe — still consumes, no change
      }
      this.restart();
    };

    // Prevent image dragging
    this.root.querySelectorAll(".hero-img").forEach((img) => {
      img.addEventListener("dragstart", (e) => e.preventDefault());
    });

    if (window.PointerEvent) {
      vp.addEventListener(
        "pointerdown",
        (e) => {
          // Only left button / touch / pen
          if (e.pointerType === "mouse" && e.button !== 0) return;
          // Capture pointer for consistent up/move
          try {
            vp.setPointerCapture(e.pointerId);
          } catch {}
          onStart(e.clientX, e.clientY);
        },
        { passive: true }
      );
      vp.addEventListener(
        "pointermove",
        (e) => {
          if (!isPointerDown) return;
          onMove(e.clientX, e.clientY);
          // Prevent scrolling when actively dragging horizontally
          if (this._isDragging) {
            e.preventDefault();
          }
        },
        { passive: false }
      );
      const endHandler = (e) => onEnd(e.clientX, e.clientY);
      vp.addEventListener("pointerup", endHandler, { passive: true });
      vp.addEventListener("pointercancel", endHandler, { passive: true });
      // pointerleave shouldn't trigger swipe, but reset
      vp.addEventListener("pointerleave", () => {
        if (isPointerDown && !this._isDragging) {
          // keep waiting for up, but if mouse left viewport, cancel dragging state
        }
      });
    } else {
      // Fallback touch events
      vp.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches.length !== 1) return;
          const t = e.touches[0];
          onStart(t.clientX, t.clientY);
        },
        { passive: true }
      );
      vp.addEventListener(
        "touchmove",
        (e) => {
          if (!isPointerDown || e.touches.length !== 1) return;
          const t = e.touches[0];
          onMove(t.clientX, t.clientY);
          if (this._isDragging) e.preventDefault();
        },
        { passive: false }
      );
      vp.addEventListener(
        "touchend",
        (e) => {
          const t = e.changedTouches[0];
          onEnd(t.clientX, t.clientY);
        },
        { passive: true }
      );
      vp.addEventListener(
        "touchcancel",
        (e) => {
          const t = e.changedTouches[0];
          if (t) onEnd(t.clientX, t.clientY);
        },
        { passive: true }
      );
    }
  }

  /**
   * @param {number} idx
   * @param {boolean} focus
   */
  goTo(idx, focus) {
    if (!this.slides || !this.dots || !this.titleEl || !this.descEl) return;
    const n = this.slides.length;
    this.current = ((idx % n) + n) % n;
    this.slides.forEach((s, i) => {
      s.classList.toggle("is-active", i === this.current);
      s.setAttribute("aria-hidden", i === this.current ? "false" : "true");
    });
    this.dots.forEach((d, i) => {
      const active = i === this.current;
      d.classList.toggle("is-active", active);
      d.setAttribute("aria-selected", String(active));
      d.tabIndex = active ? 0 : -1;
    });
    const data = SLIDES[this.current];
    if (data) {
      this.titleEl.innerHTML = data.title;
      this.descEl.innerHTML = data.desc;
    }
    if (focus) this.dots[this.current]?.focus();
    // Re-fit after content change (desc height may differ)
    requestAnimationFrame(() => this.fitToViewport());
  }

  next() {
    this.goTo(this.current + 1, false);
  }

  prev() {
    this.goTo(this.current - 1, false);
  }

  start() {
    if (this.timer) return;
    // @ts-ignore
    this.timer = window.setInterval(() => this.next(), this.interval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  restart() {
    this.stop();
    this.start();
  }
}

// Auto-init
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector("#hero")) new HeroSlideshow("#hero");
  });
}
