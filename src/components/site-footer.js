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
    this.innerHTML = `
      <footer class="footer">
        <div class="container footer-main">
          <div>
            <h4 class="footer-title">Компания</h4>
            <ul class="footer-nav">
              <li><a href="#about">О компании</a></li>
              <li><a href="#catalog">Каталог</a></li>
              <li><a href="public/pricelist.pdf">Документы</a></li>
              <li><a href="#contacts">Контакты</a></li>
            </ul>
          </div>
          <div>
            <h4 class="footer-title">Помощь</h4>
            <ul class="footer-links">
              <li><a href="#">Доставка и оплата</a></li>
              <li><a href="#">Возврат</a></li>
              <li><a href="#contacts">Контакты</a></li>
              <li><a href="${privacyHref}">Политика конфиденциальности</a></li>
            </ul>
          </div>
          <div class="footer-contacts" id="contacts">
            <h4 class="footer-title">Контакты</h4>
            <a class="contact-phone" href="tel:+70000000000">+7 (000) 000-00-00</a>
            <ul class="contact-list">
              <li class="contact-list-item">
                <svg class="contact-icon contact-icon-mt" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                </svg>
                <span>[[address]]</span>
              </li>
              <li class="contact-list-item">
                <svg class="contact-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                </svg>
                <a href="mailto:smeta@metallist.ru">[[email@email.em]]</a>
              </li>
              <li class="contact-list-item">
                <svg class="contact-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                </svg>
                <span>ПН. — ПТ. с 8:00 до 17:00</span>
              </li>
            </ul>
          </div>
          <div class="footer-copyright">
            <p>© ${year} Завод «Металлист». Все права защищены.</p>
            <p>© WSS «Fittings Factory»</p>
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
