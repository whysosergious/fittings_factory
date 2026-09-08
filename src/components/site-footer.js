/**
 * @fileoverview Site footer web component — light-DOM, SEO-safe.
 */

/**
 * @element site-footer
 * @description Footer with company/help + contacts on a single row (desktop/tablet), stacked on mobile.
 * Renders light-DOM so all links are indexed without JS.
 */
export class SiteFooter extends HTMLElement {
  connectedCallback() {
    if (this.dataset.initialized === "true") return;
    this.dataset.initialized = "true";

    if (this.querySelector("footer.footer")) return;

    this.render();
  }

  render() {
    const year = new Date().getFullYear();
    const privacyHref = this.resolvePrivacyPath();
    const documentsHref = this.resolveDocumentsPath();
    const deliveryHref = this.resolveDeliveryPath();
    const aboutHref = this.resolveAboutHref();
    const catalogHref = this.resolveAnchorHref("#catalog");
    const contactsHref = this.resolveAnchorHref("#contacts");
    this.innerHTML = `
      <footer class="footer">
        <div class="container footer-main">
          <div>
            <h4 class="footer-title">Компания</h4>
            <ul class="footer-nav">
              <li><a href="${aboutHref}">О компании</a></li>
              <li><a href="${catalogHref}">Каталог</a></li>
              <li><a href="${documentsHref}">Документы</a></li>
            </ul>
          </div>
          <div>
            <h4 class="footer-title">Помощь</h4>
            <ul class="footer-links">
              <li><a href="${deliveryHref}">Доставка и оплата</a></li>
              <li><a href="${privacyHref}">Политика конфиденциальности</a></li>
            </ul>
          </div>
                    <div class="footer-contacts" id="contacts">
            <h4 class="footer-title">Контакты</h4>
            <a class="contact-phone" href="tel:+375296129636">+375 (29) 612-96-36</a>
            <ul class="contact-list">
              <li class="contact-list-item">
                <svg class="contact-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                </svg>
                <a href="mailto:skarankevich@yandex.by">skarankevich@yandex.by</a>
              </li>
              <li class="contact-list-item">
                <svg class="contact-icon contact-icon-mt" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                </svg>
                <span>Шинная 13А, Бобруйск, Беларусь</span>
              </li>
            </ul>
          </div>
          <div class="footer-copyright"><p>© WSS «Fittings Factory»</p>
          </div>
        </div>
      </footer>
    `;
    // Fix relative paths when rendered from /src/pages/
    this.fixPaths();
  }

  /**
   * @returns {string}
   */
  resolveAboutHref() {
    return window.location.pathname.includes("/src/pages/") ? "about.html" : "src/pages/about.html";
  }

  resolveDeliveryPath() {
    return window.location.pathname.includes("/src/pages/") ? "delivery.html" : "src/pages/delivery.html";
  }

  resolveDocumentsPath() {
    return window.location.pathname.includes("/src/pages/") ? "documents.html" : "src/pages/documents.html";
  }

  resolveAnchorHref(hash) {
    return window.location.pathname.includes("/src/pages/") ? "../../index.html" + hash : hash;
  }

  resolvePrivacyPath() {
    return window.location.pathname.includes("/src/pages/") ? "privacy.html" : "src/pages/privacy.html";
  }

  fixPaths() {
    if (!window.location.pathname.includes("/src/pages/")) return;
    this.querySelectorAll('a[href^="public/"]').forEach((/** @type {HTMLAnchorElement} */ a) => {
      a.href = "../../" + a.getAttribute("href");
    });
  }
}

if (!customElements.get("site-footer")) {
  customElements.define("site-footer", SiteFooter);
}
