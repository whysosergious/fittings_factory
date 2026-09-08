/**
 * @fileoverview Site header web component — light-DOM, SEO-safe.
 * Provides logo, desktop nav, phone/mail actions and a mobile drawer.
 * No Shadow DOM is used so crawlers see all links/text without JS.
 */

/**
 * Navigation link definition
 * @typedef {{ label: string, href: string }} NavLink
 */

/** @type {NavLink[]} */
const NAV_LINKS = [
  { label: "О компании", href: "#about" },
  { label: "Каталог", href: "#catalog" },
  { label: "Документы", href: "public/pricelist.pdf" },
  { label: "Контакты", href: "#contacts" },
];

/**
 * Default contact targets for header action buttons
 */
const PHONE_HREF = "tel:+74951524700";
const PHONE_LABEL = "+7 (495) 152-47-00";
const EMAIL_HREF = "mailto:sales@metallist.org";
const EMAIL_LABEL = "sales@metallist.org";

/**
 * @element site-header
 * @description Light-DOM header. Keeps semantic HTML indexable. JS only adds behaviour.
 * Usage:
 *   <site-header></site-header>  // auto-renders
 *   <site-header><header>...</header></site-header> // enhances existing
 */
export class SiteHeader extends HTMLElement {
  /** @type {HTMLElement | null} */
  drawer = null;
  /** @type {HTMLElement | null} */
  overlay = null;
  /** @type {HTMLButtonElement | null} */
  burgerBtn = null;
  /** @type {HTMLButtonElement | null} */
  closeBtn = null;
  /** @type {boolean} */
  isOpen = false;
  /** @type {(() => void) | null} */
  onKeyDownBound = null;
  /** @type {string | null} */
  previousOverflow = null;

  connectedCallback() {
    if (this.dataset.initialized === "true") return;
    this.dataset.initialized = "true";

    // If author already provided markup (SEO progressive enhancement), just enhance it
    const hasHeader = !!this.querySelector("header.header");
    if (!hasHeader) {
      this.render();
    }
    this.cacheElements();
    this.bindEvents();
  }

  disconnectedCallback() {
    this.unbindEvents();
  }

  /** Render light-DOM template if element was empty */
  render() {
    // Use relative paths that work from both / and /src/pages/
    // We detect depth: if page is under /src/pages, prefix needs ../..
    // Instead use root-relative absolute logic via <base> or just assume / prefix.
    // To keep static file:// compatible, use relative that works from root index and from src/pages via JS adjustment later.
    // Simplest: use relative to site root with leading slash would break file:// but works with http server from root.
    // We provide both: data attributes allow override; fallback to public/ with path correction.
    const logoSrc = this.getAttribute("logo-src") || this.resolvePublicPath("public/fittings_logo.svg");
    const phoneIcon = this.resolvePublicPath("public/icons/phone.svg");
    const mailIcon = this.resolvePublicPath("public/icons/mail.svg");

    const navLinksDesktop = NAV_LINKS.map((l) => `<a href="${l.href}">${l.label}</a>`).join("");
    const navLinksMobile = NAV_LINKS.map(
      (l) =>
        `<a href="${l.href}">${l.label}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></a>`,
    ).join("");

    this.innerHTML = `
      <header class="header">
        <div class="header-inner">
          <a class="logo" href="/" aria-label="Завод Металлист — на главную">
            <img src="${logoSrc}" alt="Завод Металлист" width="40" height="40" />
          </a>

          <nav class="header-nav" aria-label="Основная навигация">
            ${navLinksDesktop}
          </nav>

          <div class="header-actions">
            <a class="header-icon-btn" href="${PHONE_HREF}" aria-label="Позвонить: ${PHONE_LABEL}">
              <img src="${phoneIcon}" alt="" width="22" height="22" style="width:1.45rem;height:1.45rem;filter:brightness(0) invert(1);" />
            </a>
            <a class="header-icon-btn" href="${EMAIL_HREF}" aria-label="Написать: ${EMAIL_LABEL}">
              <img src="${mailIcon}" alt="" width="22" height="22" style="width:1.45rem;height:1.45rem;filter:brightness(0) invert(1);" />
            </a>
            <button class="menu-btn" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="site-header-drawer">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div class="mobile-overlay" data-overlay></div>
      <div class="mobile-drawer" id="site-header-drawer" role="dialog" aria-modal="true" aria-label="Меню" data-drawer>
        <div class="mobile-drawer-header">
          <span class="mobile-drawer-title">Меню</span>
          <button class="drawer-close-btn" type="button" aria-label="Закрыть меню" data-close>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>
        </div>
        <nav class="mobile-nav" aria-label="Мобильная навигация">
          ${navLinksMobile}
        </nav>
        <div class="mobile-drawer-contacts">
          <a class="contact-phone" href="${PHONE_HREF}">${PHONE_LABEL}</a>
          <p>ПН–ПТ с 8:00 до 17:00<br><a href="${EMAIL_HREF}">${EMAIL_LABEL}</a></p>
        </div>
      </div>
    `;
  }

  /**
   * Resolve public asset path relative to current document location so it works
   * both from /index.html and /src/pages/template.html when opened via file:// or http server.
   * @param {string} path
   * @returns {string}
   */
  resolvePublicPath(path) {
    // If document is inside src/pages, we need ../../ prefix
    const pathname = window.location.pathname;
    if (pathname.includes("/src/pages/")) {
      return "../../" + path;
    }
    return path;
  }

  cacheElements() {
    this.drawer = this.querySelector("[data-drawer]");
    this.overlay = this.querySelector("[data-overlay]");
    this.burgerBtn = this.querySelector(".menu-btn");
    this.closeBtn = this.querySelector("[data-close]");
  }

  bindEvents() {
    if (!this.burgerBtn || !this.drawer || !this.overlay || !this.closeBtn) return;

    this.burgerBtn.addEventListener("click", this.open);
    this.closeBtn.addEventListener("click", this.close);
    this.overlay.addEventListener("click", this.close);

    // Close when mobile nav link clicked
    this.drawer.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", this.close);
    });

    this.onKeyDownBound = this.onKeyDown.bind(this);
    document.addEventListener("keydown", this.onKeyDownBound);
  }

  unbindEvents() {
    if (this.onKeyDownBound) document.removeEventListener("keydown", this.onKeyDownBound);
  }

  /** @private */
  open = () => {
    if (this.isOpen) return;
    this.isOpen = true;
    this.drawer?.classList.add("is-open");
    this.overlay?.classList.add("is-open");
    this.burgerBtn?.setAttribute("aria-expanded", "true");
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // focus close button for accessibility
    requestAnimationFrame(() => this.closeBtn?.focus());
  };

  /** @private */
  close = () => {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.drawer?.classList.remove("is-open");
    this.overlay?.classList.remove("is-open");
    this.burgerBtn?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = this.previousOverflow || "";
    this.burgerBtn?.focus();
  };

  /**
   * @param {KeyboardEvent} e
   */
  onKeyDown(e) {
    if (e.key === "Escape" && this.isOpen) {
      this.close();
    }
  }
}

if (!customElements.get("site-header")) {
  customElements.define("site-header", SiteHeader);
}
