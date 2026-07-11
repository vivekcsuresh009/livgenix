/**
 * Lightweight, self-contained testimonials slider.
 * Uses native CSS scroll-snap for motion; JS only drives the prev/next
 * buttons, pagination dots and optional autoplay. No external libraries.
 */
class TestimonialsSlider extends HTMLElement {
  /** @type {HTMLElement | null} */
  viewport = null;

  /** @type {HTMLElement[]} */
  slides = [];

  /** @type {HTMLButtonElement[]} */
  dots = [];

  /** @type {HTMLButtonElement | null} */
  prevButton = null;

  /** @type {HTMLButtonElement | null} */
  nextButton = null;

  /** @type {HTMLElement | null} */
  dotsContainer = null;

  /** @type {boolean} */
  reducedMotion = false;

  /** @type {number} */
  autoplaySpeed = 6000;

  /** @type {number} */
  activeIndex = 0;

  /** @type {number | null} */
  autoplayTimer = null;

  /** @type {number | null} */
  scrollRaf = null;

  /** @type {IntersectionObserver | null} */
  intersectionObserver = null;

  #controller = new AbortController();

  connectedCallback() {
    const viewport = this.querySelector('.testimonials__viewport');
    if (!(viewport instanceof HTMLElement)) return;

    this.viewport = viewport;
    this.slides = Array.from(this.querySelectorAll('[data-testimonials-slide]')).filter(
      (slide) => slide instanceof HTMLElement
    );

    if (this.slides.length === 0) return;

    const prevButton = this.querySelector('[data-testimonials-prev]');
    const nextButton = this.querySelector('[data-testimonials-next]');
    this.prevButton = prevButton instanceof HTMLButtonElement ? prevButton : null;
    this.nextButton = nextButton instanceof HTMLButtonElement ? nextButton : null;

    const dotsContainer = this.querySelector('[data-testimonials-dots]');
    this.dotsContainer = dotsContainer instanceof HTMLElement ? dotsContainer : null;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.buildDots();
    this.bindNav();
    this.bindObserver();
    this.bindAutoplay();
  }

  disconnectedCallback() {
    this.stopAutoplay();
    this.intersectionObserver?.disconnect();
    this.#controller.abort();
  }

  buildDots() {
    if (!this.dotsContainer) return;
    const dotsContainer = this.dotsContainer;

    this.dots = this.slides.map((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'testimonials__dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to testimonial ${index + 1}`);
      dot.setAttribute('aria-current', index === 0 ? 'true' : 'false');
      dot.addEventListener('click', () => this.goTo(index), { signal: this.#controller.signal });
      dotsContainer.appendChild(dot);
      return dot;
    });
  }

  bindNav() {
    const { signal } = this.#controller;
    this.prevButton?.addEventListener('click', () => this.goTo(this.activeIndex - 1), { signal });
    this.nextButton?.addEventListener('click', () => this.goTo(this.activeIndex + 1), { signal });
    this.viewport?.addEventListener('scroll', () => this.handleScroll(), { passive: true, signal });
    this.updateArrowState();
  }

  bindObserver() {
    if (!this.viewport) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (!visible) return;
        const index = this.slides.indexOf(/** @type {HTMLElement} */ (visible.target));
        if (index !== -1) this.setActive(index);
      },
      { root: this.viewport, threshold: 0.6 }
    );

    this.slides.forEach((slide) => this.intersectionObserver?.observe(slide));
  }

  bindAutoplay() {
    const shouldAutoplay = this.dataset.autoplay === 'true';
    if (!shouldAutoplay || this.reducedMotion || this.slides.length <= 1) return;

    this.autoplaySpeed = Number(this.dataset.speed) || 6000;

    const { signal } = this.#controller;
    this.addEventListener('mouseenter', () => this.stopAutoplay(), { signal });
    this.addEventListener('mouseleave', () => this.startAutoplay(), { signal });
    this.addEventListener('focusin', () => this.stopAutoplay(), { signal });
    this.addEventListener('focusout', () => this.startAutoplay(), { signal });
    this.addEventListener('touchstart', () => this.stopAutoplay(), { passive: true, signal });

    this.startAutoplay();
  }

  startAutoplay() {
    this.stopAutoplay();
    this.autoplayTimer = window.setInterval(() => {
      const nextIndex = (this.activeIndex + 1) % this.slides.length;
      this.goTo(nextIndex);
    }, this.autoplaySpeed || 6000);
  }

  stopAutoplay() {
    if (this.autoplayTimer !== null) {
      window.clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  handleScroll() {
    if (this.scrollRaf !== null) return;
    this.scrollRaf = window.requestAnimationFrame(() => {
      this.scrollRaf = null;
      this.updateArrowState();
    });
  }

  /** @param {number} index */
  goTo(index) {
    const clamped = Math.max(0, Math.min(index, this.slides.length - 1));
    const target = this.slides[clamped];
    if (!target) return;

    target.scrollIntoView({
      behavior: this.reducedMotion ? 'auto' : 'smooth',
      inline: 'start',
      block: 'nearest',
    });

    this.setActive(clamped);
  }

  /** @param {number} index */
  setActive(index) {
    this.activeIndex = index;
    this.dots.forEach((dot, dotIndex) => {
      dot.setAttribute('aria-current', dotIndex === index ? 'true' : 'false');
    });
    this.updateArrowState();
  }

  updateArrowState() {
    if (this.prevButton) this.prevButton.disabled = this.activeIndex === 0;
    if (this.nextButton) this.nextButton.disabled = this.activeIndex === this.slides.length - 1;
  }
}

if (!customElements.get('testimonials-slider')) {
  customElements.define('testimonials-slider', TestimonialsSlider);
}
