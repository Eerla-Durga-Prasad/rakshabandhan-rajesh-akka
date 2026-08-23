/**
 * ═══════════════════════════════════════════════════════
 * ANIMATIONS.JS — GSAP Scroll-Driven Cinematic Animations
 * ═══════════════════════════════════════════════════════
 *
 * Uses GSAP + ScrollTrigger for:
 * - Section entrance animations
 * - Line-by-line text reveals
 * - Parallax effects
 * - Photo frame reveals
 * - Timeline item animations
 * - Final scene entrance
 *
 * Respects prefers-reduced-motion.
 * ═══════════════════════════════════════════════════════
 */

window.RBAnimations = (function () {

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('[RBAnimations] GSAP not loaded — skipping animations');
      showAllImmediately();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Default ease for all cinematic animations
    gsap.defaults({ ease: 'power3.out' });

    if (prefersReducedMotion) {
      showAllImmediately();
      return;
    }

    setupHeroAnimations();
    setupIntroAnimations();
    setupMemoryAnimations();
    setupCardsAnimations();
    setupTimelineAnimations();
    setupUnsaidAnimations();
    setupSecretAnimations();
    setupFinalAnimations();
    setupScrollProgress();
  }

  // ── HERO ANIMATIONS ──────────────────────────────────
  function setupHeroAnimations() {
    const tl = gsap.timeline({ delay: 0.3 });

    tl.to('.hero__line--1', {
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: 'power4.out'
    })
    .to('.hero__line--2', {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out'
    }, '-=0.6')
    .to('.hero__line--3', {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out'
    }, '-=0.5')
    .to('.hero__cta', {
      opacity: 1,
      duration: 0.8,
      ease: 'power2.out'
    }, '-=0.3')
    .to('.hero__scroll-hint', {
      opacity: 1,
      duration: 0.6
    }, '-=0.1');
  }

  // ── INTRO — Line by line reveal ─────────────────────
  function setupIntroAnimations() {
    // Heading
    gsap.to('.intro__heading', {
      scrollTrigger: {
        trigger: '.intro',
        start: 'top 70%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: 'power4.out'
    });

    // Each intro line
    gsap.utils.toArray('.intro__line').forEach((line, i) => {
      gsap.to(line, {
        scrollTrigger: {
          trigger: line,
          start: 'top 82%',
          toggleActions: 'play none none none'
        },
        opacity: 1,
        x: 0,
        duration: 0.9,
        delay: i * 0.08,
        ease: 'power3.out'
      });
    });
  }

  // ── MEMORY GALLERY ──────────────────────────────────
  function setupMemoryAnimations() {
    // Header
    ScrollTrigger.batch(['.memories .section__label', '.memories__heading', '.memories__subtitle'], {
      start: 'top 80%',
      onEnter: batch => {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.15,
          ease: 'power3.out'
        });
      }
    });

    // Each memory item
    gsap.utils.toArray('.memory-item').forEach((item, i) => {
      const fromX = i % 2 === 0 ? -40 : 40;

      gsap.fromTo(item,
        { opacity: 0, y: 60, x: fromX },
        {
          scrollTrigger: {
            trigger: item,
            start: 'top 85%',
            toggleActions: 'play none none none'
          },
          opacity: 1,
          y: 0,
          x: 0,
          duration: 1.1,
          ease: 'power3.out'
        }
      );
    });
  }

  // ── MEMORY CARDS ────────────────────────────────────
  function setupCardsAnimations() {
    gsap.to('.memory-cards-section .section__label', {
      scrollTrigger: {
        trigger: '.memory-cards-section',
        start: 'top 75%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      duration: 0.7
    });

    gsap.to('.memory-cards-section .section__heading', {
      scrollTrigger: {
        trigger: '.memory-cards-section',
        start: 'top 75%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      y: 0,
      duration: 1,
      delay: 0.1,
      ease: 'power3.out'
    });

    gsap.utils.toArray('.mem-card').forEach((card, i) => {
      gsap.to(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          toggleActions: 'play none none none'
        },
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.9,
        delay: i * 0.12,
        ease: 'power3.out'
      });
    });
  }

  // ── TIMELINE ─────────────────────────────────────────
  function setupTimelineAnimations() {
    // Section headings
    gsap.to('.timeline-section .section__label', {
      scrollTrigger: { trigger: '.timeline-section', start: 'top 75%', toggleActions: 'play none none none' },
      opacity: 1, duration: 0.7
    });

    gsap.to('.timeline-section .section__heading', {
      scrollTrigger: { trigger: '.timeline-section', start: 'top 75%', toggleActions: 'play none none none' },
      opacity: 1, y: 0, duration: 1, delay: 0.1, ease: 'power3.out'
    });

    gsap.utils.toArray('.timeline__item').forEach((item, i) => {
      gsap.to(item, {
        scrollTrigger: {
          trigger: item,
          start: 'top 80%',
          toggleActions: 'play none none none',
          onEnter: () => item.classList.add('is-visible')
        },
        opacity: 1,
        duration: 0.8,
        delay: i * 0.08,
        ease: 'power2.out'
      });
    });
  }

  // ── UNSAID MESSAGES ──────────────────────────────────
  function setupUnsaidAnimations() {
    gsap.to('.unsaid__heading', {
      scrollTrigger: { trigger: '.unsaid-section', start: 'top 70%', toggleActions: 'play none none none' },
      opacity: 1, y: 0, duration: 1.2, ease: 'power4.out'
    });

    gsap.to('.unsaid-section .section__label', {
      scrollTrigger: { trigger: '.unsaid-section', start: 'top 70%', toggleActions: 'play none none none' },
      opacity: 1, duration: 0.7
    });

    gsap.utils.toArray('.unsaid__msg').forEach((msg, i) => {
      gsap.to(msg, {
        scrollTrigger: {
          trigger: msg,
          start: 'top 82%',
          toggleActions: 'play none none none',
          onEnter: () => msg.classList.add('is-visible')
        },
        opacity: 1,
        x: 0,
        duration: 0.9,
        delay: i * 0.1,
        ease: 'power3.out'
      });
    });
  }

  // ── SECRET SECTION ───────────────────────────────────
  function setupSecretAnimations() {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.secret-section',
        start: 'top 70%',
        toggleActions: 'play none none none'
      }
    });

    tl.to('.secret__heading', { opacity: 1, y: 0, duration: 1, ease: 'power3.out' })
      .to('.secret__sub',     { opacity: 1, duration: 0.7 }, '-=0.5')
      .to('.secret__btn',     { opacity: 1, duration: 0.7 }, '-=0.3');
  }

  // ── FINAL SCENE ──────────────────────────────────────
  function setupFinalAnimations() {
    const section = document.getElementById('final');
    if (!section) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          playFinalSequence();
          observer.disconnect();
        }
      });
    }, { threshold: 0.3 });

    observer.observe(section);
  }

  function playFinalSequence() {
    const tl = gsap.timeline();

    tl.to('.final__heading',   { opacity: 1, y: 0, duration: 1.4, ease: 'power4.out' })
      .to('.final__line',      { opacity: 1, y: 0, duration: 0.8, stagger: 0.25, ease: 'power3.out' }, '-=0.4')
      .to('.final__closing',   { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' }, '-=0.2')
      .to('.final__signature', { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.3');
  }

  // ── SCROLL PROGRESS BAR ──────────────────────────────
  function setupScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;

    ScrollTrigger.create({
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const pct = Math.round(self.progress * 100);
        bar.style.width = pct + '%';
        bar.setAttribute('aria-valuenow', pct);
      }
    });
  }

  // ── FALLBACK: show everything without animation ──────
  function showAllImmediately() {
    const elements = document.querySelectorAll(
      '.hero__line, .hero__cta, .hero__scroll-hint, .section__label, .section__heading, ' +
      '.intro__heading, .intro__line, .memories__heading, .memories__subtitle, ' +
      '.memory-item, .mem-card, .timeline__item, .unsaid__heading, .unsaid__msg, ' +
      '.secret__heading, .secret__sub, .secret__btn, ' +
      '.final__heading, .final__line, .final__closing, .final__signature'
    );
    elements.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });

    // Timeline markers
    document.querySelectorAll('.timeline__item').forEach(item => {
      item.classList.add('is-visible');
    });
  }

  // ── REVEAL SECRET ────────────────────────────────────
  function revealSecret() {
    const reveal = document.getElementById('secret-reveal');
    if (!reveal) return;

    reveal.setAttribute('aria-hidden', 'false');
    reveal.classList.add('is-open');

    if (prefersReducedMotion) {
      reveal.querySelectorAll('.secret__reveal-line').forEach(line => {
        line.style.opacity = '1';
        line.style.transform = 'none';
      });
      return;
    }

    const lines = reveal.querySelectorAll('.secret__reveal-line');
    gsap.to(lines, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.5,
      ease: 'power3.out',
      delay: 0.2
    });
  }

  return { init, revealSecret, playFinalSequence };

})();
