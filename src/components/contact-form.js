/**
 * @fileoverview Contact form web component — light-DOM, SEO-safe, progressively enhanced.
 */

/**
 * @typedef {Object} FormDataPayload
 * @property {string} name
 * @property {string} email
 * @property {string} comment
 * @property {boolean} consent
 */

const RESEND_API_URL = "https://resend-api-plum.vercel.app/api/send";
const RESEND_API_KEY = "f0a48f472737317bf367fe0cf1a704c3fe06e219ce4d08b24a651af74456a5cb";
const RESEND_TO_EMAIL = "zergski@gmail.com";

/**
 * @element contact-form
 * @description Accessible contact form. Keeps native <form> markup indexable.
 * Emits `contact-submit` custom event with FormDataPayload detail.
 * Provides inline validation and status region for a11y.
 * On submit, posts to Resend Vercel API (see curl example in task).
 */
export class ContactForm extends HTMLElement {
  /** @type {HTMLFormElement | null} */
  form = null;
  /** @type {HTMLElement | null} */
  statusEl = null;

  connectedCallback() {
    if (this.dataset.initialized === "true") return;
    this.dataset.initialized = "true";

    if (this.querySelector("form")) {
      this.enhanceExisting();
    } else {
      this.render();
    }
    this.cacheElements();
    this.bindEvents();
  }

  /** Enhance server-rendered form: add novalidate + status region if missing */
  enhanceExisting() {
    const form = this.querySelector("form");
    if (form && !form.hasAttribute("novalidate")) form.setAttribute("novalidate", "");
    if (!this.querySelector("[data-status]")) {
      const region = document.createElement("p");
      region.setAttribute("data-status", "");
      region.setAttribute("role", "status");
      region.setAttribute("aria-live", "polite");
      region.style.cssText = "font-size:0.875rem;margin-top:0.75rem;min-height:1.25rem;color:var(--brand-red);";
      form?.after(region);
    }
    // Fix legacy privacy links with href="#"
    const privacyHref = this.resolvePrivacyPath();
    this.querySelectorAll('a[href="#"]').forEach((/** @type {HTMLAnchorElement} */ a) => {
      const t = a.textContent || "";
      if (t.includes("Политик") || t.includes("Пользовательского")) a.href = privacyHref;
    });
  }

  render() {
    const privacyHref = this.resolvePrivacyPath();
    this.innerHTML = `
      <section class="contact-section" id="contact-form">
        <div class="contact-inner">
          <h2 class="section-title">Остались вопросы? Напишите нам!</h2>
          <form novalidate>
          <div class="form-group">
            <label class="visually-hidden" for="cf-name">Имя</label>
            <input class="form-input" id="cf-name" name="name" placeholder="Имя*" required type="text" autocomplete="name" />
            <span class="form-error" data-error="name" aria-live="polite"></span>
          </div>
          <div class="form-group">
            <label class="visually-hidden" for="cf-email">E-mail</label>
            <input class="form-input" id="cf-email" name="email" placeholder="E-mail*" required type="email" autocomplete="email" />
            <span class="form-error" data-error="email" aria-live="polite"></span>
          </div>
          <div class="form-group">
            <label class="visually-hidden" for="cf-comment">Комментарий</label>
            <textarea class="form-input" id="cf-comment" name="comment" placeholder="Ваш комментарий*" required rows="4"></textarea>
            <span class="form-error" data-error="comment" aria-live="polite"></span>
          </div>
          <div class="form-checkbox-group">
            <div class="checkbox-container">
              <input class="form-checkbox" id="terms" name="consent" required type="checkbox" />
            </div>
            <label class="form-checkbox-label" for="terms">
              Отправляя запрос, я принимаю условия
              <a href="${privacyHref}">Пользовательского соглашения</a> и подтверждаю
              обязательное согласие с
              <a href="${privacyHref}">Политикой конфиденциальности</a>.
            </label>
          </div>
          <span class="form-error" data-error="consent" aria-live="polite" style="display:block;margin-bottom:0.75rem;font-size:0.75rem;color:var(--brand-red);"></span>
          <button class="btn-primary" type="submit">Отправить</button>
          <p data-status role="status" aria-live="polite" style="font-size:0.875rem;margin-top:0.75rem;min-height:1.25rem;"></p>
          </form>
        </div>
      </section>
    `;
  }

  /**
   * @returns {string}
   */
  resolvePrivacyPath() {
    return window.location.pathname.includes("/src/pages/") ? "privacy.html" : "src/pages/privacy.html";
  }

  cacheElements() {
    this.form = this.querySelector("form");
    this.statusEl = this.querySelector("[data-status]");
  }

  bindEvents() {
    this.form?.addEventListener("submit", this.onSubmit);
    // live clear errors on input
    this.form?.querySelectorAll("input, textarea").forEach((el) => {
      el.addEventListener("input", () => this.clearError(/** @type {HTMLInputElement} */ (el).name || el.id));
    });
  }

  /**
   * @param {SubmitEvent} e
   */
  onSubmit = async (e) => {
    e.preventDefault();
    if (!this.form) return;

    const data = new FormData(this.form);
    /** @type {FormDataPayload} */
    const payload = {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      comment: String(data.get("comment") || "").trim(),
      consent: !!data.get("consent") || /** @type {HTMLInputElement} */ (this.form.querySelector('[name="consent"]'))?.checked,
    };

    const valid = this.validate(payload);
    if (!valid) return;

    // Emit event for backwards-compat / external listeners
    this.dispatchEvent(
      new CustomEvent("contact-submit", {
        detail: payload,
        bubbles: true,
        composed: true,
      }),
    );

    const submitBtn = /** @type {HTMLButtonElement | null} */ (this.form.querySelector('button[type="submit"]'));
    const originalBtnText = submitBtn ? submitBtn.textContent : null;

    if (this.statusEl) {
      this.statusEl.textContent = "Отправка...";
      this.statusEl.style.color = "var(--gray-600)";
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Отправка...";
      submitBtn.setAttribute("aria-busy", "true");
    }

    try {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          name: payload.name,
          to_email: RESEND_TO_EMAIL,
          email: payload.email,
          message: payload.comment,
          from: `Фурнитура контакт ${payload.name}`,
          subject: `Фурнитура - сообщение от ${payload.name}`,
        }),
      });

      let body = null;
      try {
        body = await res.json();
      } catch (_) {
        body = null;
      }

      if (!res.ok) {
        const msg = (body && (body.error || body.message)) || `Ошибка ${res.status}`;
        throw new Error(String(msg));
      }

      if (this.statusEl) {
        this.statusEl.textContent = "Спасибо! Ваше сообщение отправлено. Мы свяжемся с вами в ближайшее время.";
        this.statusEl.style.color = "var(--gray-600)";
      }
      this.form.reset();
    } catch (err) {
      // @ts-ignore
      const message = err && err.message ? err.message : String(err);
      console.error("[contact-form] send failed:", message, err);
      if (this.statusEl) {
        this.statusEl.textContent =
          "Не удалось отправить сообщение. Попробуйте позже или напишите на skarankevich@yandex.by";
        this.statusEl.style.color = "var(--brand-red)";
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (originalBtnText !== null) submitBtn.textContent = originalBtnText;
        submitBtn.removeAttribute("aria-busy");
      }
    }
  };

  /**
   * @param {FormDataPayload} p
   * @returns {boolean}
   */
  validate(p) {
    let ok = true;
    this.clearAllErrors();

    if (!p.name || p.name.length < 2) {
      this.setError("name", "Введите имя (минимум 2 символа).");
      ok = false;
    }
    if (!p.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
      this.setError("email", "Введите корректный e-mail.");
      ok = false;
    }
    if (!p.comment || p.comment.length < 5) {
      this.setError("comment", "Напишите комментарий (минимум 5 символов).");
      ok = false;
    }
    if (!p.consent) {
      this.setError("consent", "Необходимо согласие с условиями.");
      ok = false;
    }

    if (!ok && this.statusEl) {
      this.statusEl.textContent = "Проверьте правильность заполнения полей.";
      this.statusEl.style.color = "var(--brand-red)";
    }

    return ok;
  }

  /**
   * @param {string} field
   * @param {string} msg
   */
  setError(field, msg) {
    const el = this.querySelector(`[data-error="${field}"]`);
    if (el) {
      el.textContent = msg;
      el.style.color = "var(--brand-red)";
      el.style.fontSize = "0.75rem";
      el.style.display = "block";
      el.style.marginTop = "0.25rem";
    }
    // also mark input
    const input = this.form?.querySelector(`[name="${field}"]`);
    if (input) {
      /** @type {HTMLElement} */ (input).style.borderColor = "var(--brand-red)";
    }
  }

  /**
   * @param {string} field
   */
  clearError(field) {
    const map = { "cf-name": "name", "cf-email": "email", "cf-comment": "comment" };
    const key = map[field] || field;
    const el = this.querySelector(`[data-error="${key}"]`);
    if (el) el.textContent = "";
    const input = this.form?.querySelector(`[name="${key}"]`);
    if (input) /** @type {HTMLElement} */ (input).style.borderColor = "";
  }

  clearAllErrors() {
    this.querySelectorAll("[data-error]").forEach((el) => (el.textContent = ""));
    this.form?.querySelectorAll(".form-input").forEach((el) => (/** @type {HTMLElement} */ (el).style.borderColor = ""));
    if (this.statusEl) this.statusEl.textContent = "";
  }
}

if (!customElements.get("contact-form")) {
  customElements.define("contact-form", ContactForm);
}
