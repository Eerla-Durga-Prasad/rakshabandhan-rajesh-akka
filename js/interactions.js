/**
 * ═══════════════════════════════════════════════════════
 * INTERACTIONS.JS — Mouse Parallax, Cursor, Touch, Particles
 * ═══════════════════════════════════════════════════════
 */

window.RBInteractions = (function () {

  const isMobile = /Mobi|Android/i.test(navigator.userAgent) ||
                   window.matchMedia('(hover: none)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── CUSTOM CURSOR ─────────────────────────────────────
  function initCursor() {
    if (isMobile || prefersReducedMotion) return;

    const cursor    = document.getElementById('cursor');
    const cursorDot = document.getElementById('cursor-dot');
    if (!cursor || !cursorDot) return;

    let cursorX = -100, cursorY = -100;
    let dotX = -100, dotY = -100;
    let isVisible = false;

    document.addEventListener('mousemove', (e) => {
      cursorX = e.clientX;
      cursorY = e.clientY;

      if (!isVisible) {
        document.body.classList.add('cursor-visible');
        isVisible = true;
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      document.body.classList.remove('cursor-visible');
      isVisible = false;
    });

    // Hover detection for interactive elements
    const hoverTargets = document.querySelectorAll(
      'button, a, .mem-card, .memory-item__frame'
    );
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    // Smooth cursor animation
    let raf;
    function animateCursor() {
      dotX += (cursorX - dotX) * 0.15;
      dotY += (cursorY - dotY) * 0.15;

      cursor.style.left    = cursorX + 'px';
      cursor.style.top     = cursorY + 'px';
      cursorDot.style.left = dotX + 'px';
      cursorDot.style.top  = dotY + 'px';

      raf = requestAnimationFrame(animateCursor);
    }
    animateCursor();
  }

  // ── LOADER PARTICLES ──────────────────────────────────
  function initLoaderParticles() {
    const container = document.getElementById('loader-particles');
    if (!container || prefersReducedMotion) return;

    const count = isMobile ? 20 : 40;
    const particles = [];

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'hero-particle';
      const size = Math.random() * 3 + 1;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const dur = 4 + Math.random() * 6;
      const delay = Math.random() * 4;

      p.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${x}%;
        top: ${y}%;
        opacity: ${0.15 + Math.random() * 0.4};
        animation: particleDrift ${dur}s ease-in-out ${delay}s infinite alternate;
      `;
      container.appendChild(p);
      particles.push(p);
    }

    // Inject keyframes once
    if (!document.getElementById('particle-keyframes')) {
      const style = document.createElement('style');
      style.id = 'particle-keyframes';
      style.textContent = `
        @keyframes particleDrift {
          from { transform: translateY(0px) translateX(0px) scale(1); opacity: 0.2; }
          to   { transform: translateY(-30px) translateX(10px) scale(1.3); opacity: 0.6; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // ── FINAL SECTION PARTICLES (canvas 2D) ──────────────
  function initFinalParticles() {
    const canvas = document.getElementById('final-particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w, h, particles = [], animId;
    const count = isMobile ? 40 : 80;

    function resize() {
      w = canvas.width  = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    }

    function createParticles() {
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x:     Math.random() * w,
          y:     Math.random() * h,
          r:     Math.random() * 2 + 0.5,
          vx:    (Math.random() - 0.5) * 0.2,
          vy:    -(Math.random() * 0.4 + 0.1),
          alpha: Math.random() * 0.5 + 0.1,
          pulse: Math.random() * Math.PI * 2
        });
      }
    }

    function draw(time) {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.x  += p.vx;
        p.y  += p.vy;
        p.pulse += 0.02;

        if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
        if (p.x < 0 || p.x > w) p.vx *= -1;

        const alphaMod = p.alpha * (0.6 + Math.sin(p.pulse) * 0.4);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 160, 23, ${alphaMod})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          resize();
          createParticles();
          draw(0);
        } else {
          if (animId) cancelAnimationFrame(animId);
        }
      });
    }, { threshold: 0.1 });

    observer.observe(canvas.closest('section'));
    window.addEventListener('resize', () => {
      resize();
      createParticles();
    }, { passive: true });
  }

  // ── HERO CTA — RIPPLE EFFECT ──────────────────────────
  function initCTARipple() {
    const btn = document.getElementById('open-surprise-btn');
    if (!btn) return;

    btn.addEventListener('click', function (e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.cssText = `
        left: ${x}px;
        top: ${y}px;
        width: ${Math.max(rect.width, rect.height)}px;
        height: ${Math.max(rect.width, rect.height)}px;
        margin-left: -${Math.max(rect.width, rect.height)/2}px;
        margin-top: -${Math.max(rect.width, rect.height)/2}px;
      `;
      this.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);

      // Scroll to intro section
      const intro = document.getElementById('intro');
      if (intro) {
        intro.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // ── SECRET BUTTON ─────────────────────────────────────
  function initSecretButton() {
    const btn = document.getElementById('secret-btn');
    if (!btn) return;

    let opened = false;

    btn.addEventListener('click', function () {
      if (opened) return;
      opened = true;

      this.setAttribute('aria-expanded', 'true');
      this.style.opacity = '0.4';
      this.style.pointerEvents = 'none';

      if (window.RBAnimations && typeof window.RBAnimations.revealSecret === 'function') {
        window.RBAnimations.revealSecret();
      }
    });
  }

  // ── PHOTO LOADING ─────────────────────────────────────
  function initPhotos() {
    const config = window.RBConfig;
    if (!config || !config.photos) return;

    // First: remove any empty src attrs to avoid browser 404 errors
    document.querySelectorAll('.memory-item__img').forEach(img => {
      img.removeAttribute('src');
    });

    document.querySelectorAll('.memory-item__img').forEach(img => {
      const key = img.getAttribute('data-photo-key');
      if (!key || !config.photos[key]) return;

      const data = config.photos[key];
      if (!data.src) return; // No src configured — keep placeholder visible

      img.alt = data.alt || '';
      img.removeAttribute('loading');

      const placeholder = img.parentElement ? img.parentElement.querySelector('.memory-item__placeholder') : null;

      const handleLoad = function () {
        img.classList.add('is-loaded');
        if (placeholder) {
          placeholder.style.display = 'none';
        }
      };

      img.addEventListener('load', handleLoad);

      img.addEventListener('error', function () {
        // Image failed to load — placeholder remains visible
        this.removeAttribute('src');
        img.classList.remove('is-loaded');
        if (placeholder && placeholder.classList.contains('memory-item__placeholder')) {
          placeholder.style.display = '';
        }
        console.warn('[RBPhotos] Failed to load:', data.src);
      });

      handleLoad();
      img.src = data.src;

      // srcset for responsive loading
      img.setAttribute('sizes', '(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 800px');
    });

    // Update captions
    document.querySelectorAll('[data-photo-caption]').forEach(caption => {
      const key = caption.getAttribute('data-photo-caption');
      if (!key || !config.photos[key]) return;

      const data = config.photos[key];

      const yearEl    = caption.querySelector('.caption__year');
      const textEl    = caption.querySelector('.caption__text');

      if (yearEl && data.year)    yearEl.textContent = data.year;
      if (textEl && data.caption) textEl.textContent = data.caption;
    });
  }

  // ── KEYBOARD NAVIGATION ───────────────────────────────
  function initKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target;
        if (target.classList.contains('mem-card')) {
          target.querySelector('.mem-card__inner')?.dispatchEvent(new MouseEvent('click'));
        }
      }
    });
  }

  // ── INIT ──────────────────────────────────────────────
  function init() {
    initCursor();
    initLoaderParticles();
    initFinalParticles();
    initCTARipple();
    initSecretButton();
    initPhotos();
    initKeyboardNav();
  }

  return { init };

})();
