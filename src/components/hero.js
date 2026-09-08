/**
 * @fileoverview Hero slideshow — vanilla JS, no Shadow DOM, SEO-safe.
 * One panel (title+desc+pagination+button) is overlaid on image on desktop,
 * stacked below on mobile. Button stays fixed; slides rotate.
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
  /** @type {number} */
  current = 0;
  /** @type {number | null} */
  timer = null;
  /** @type {number} */
  interval = 5000;

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
    this.bind();
    this.goTo(0, false);
    this.start();
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

    // CTA is now a download link (Скачать каталог) — no scroll handling needed
    // kept for backwards compat if CTA is a button without download attribute
    const cta = this.root.querySelector(".hero-cta");
    if (cta && !cta.hasAttribute("download") && cta.tagName.toLowerCase() === "button") {
      cta.addEventListener("click", (e) => {
        const catalog = document.querySelector("#catalog");
        if (!catalog) return;
        e.preventDefault();
        const header = document.querySelector(".header");
        const h = header ? header.getBoundingClientRect().height : 0;
        const top = catalog.getBoundingClientRect().top + window.scrollY - h - 12;
        window.scrollTo({ top, behavior: "smooth" });
      });
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
      // Use h1 for first slide, h2 style for others but keep semantics? Keep as is.
      this.titleEl.innerHTML = data.title;
      this.descEl.innerHTML = data.desc;
    }
    if (focus) this.dots[this.current]?.focus();
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
    // Only init if hero exists
    if (document.querySelector("#hero")) new HeroSlideshow("#hero");
  });
}
