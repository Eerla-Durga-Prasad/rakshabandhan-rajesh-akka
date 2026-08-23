/**
 * ═══════════════════════════════════════════════════════
 * CINEMATIC-SCROLL.JS — Premium Scroll Experience
 * ═══════════════════════════════════════════════════════
 *
 * Layer stack (bottom to top):
 *   1. Body background (black)
 *   2. Section backgrounds (z-index auto)
 *   3. Cinematic canvases (z-index 10-12)
 *   4. Text content (z-index 20)
 *   5. Noise overlay (z-index 99999, 1.8% opacity)
 *
 * All canvases use pointer-events: none so they never block interaction.
 * Respects prefers-reduced-motion.
 * ═══════════════════════════════════════════════════════
 */

window.RBCinematic = (function () {

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.matchMedia('(hover: none)').matches;
  const isLowEnd = isMobile && (navigator.hardwareConcurrency || 4) <= 4;

  // ── STATE ──
  let gradientCanvas, gradientCtx;
  let particleCanvas, particleCtx;
  let orbitCanvas, orbitCtx;
  let rafId = null;
  let isActive = false;

  let scrollProgress = 0;
  let scrollProgressTarget = 0;
  let rakhiX = 0.78, rakhiY = 0.35;
  let rakhiXTarget = 0.78, rakhiYTarget = 0.35;
  let rakhiScaleFactor = 1;
  let orbitRotation = 0;
  let time = 0;

  let canvasW = 0, canvasH = 0;

  // ── CONFIG ──
  const CFG = {
    particleCount: isLowEnd ? 12 : isMobile ? 18 : 30,
    gradientSpeed: 0.06,
    rakhiLerp: 0.025,
    timeStep: 0.005,
  };

  // ── PARTICLES ──
  let particles = [];

  function createParticles() {
    particles = [];
    const colors = [
      { r: 255, g: 250, b: 240 },  // warm white
      { r: 212, g: 160, b: 23 },   // soft gold
      { r: 232, g: 184, b: 75 },   // warm gold
      { r: 200, g: 120, b: 130 },  // subtle pink
    ];
    for (let i = 0; i < CFG.particleCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.8 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 0.0002,
        vy: -0.0001 - Math.random() * 0.00015,
        alpha: 0,
        alphaTarget: 0.25 + Math.random() * 0.55,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.015,
        color,
        fadeTimer: Math.random() * 800,
      });
    }
  }

  function updateParticles() {
    particleCtx.clearRect(0, 0, canvasW, canvasH);

    const intensity = getGlobalIntensity(scrollProgress);

    particles.forEach(p => {
      p.x += p.vx + Math.sin(time * 0.3 + p.pulse) * 0.00004;
      p.y += p.vy + Math.cos(time * 0.2 + p.pulse) * 0.00003;

      if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
      if (p.x < -0.02) p.x = 1.02;
      if (p.x > 1.02) p.x = -0.02;

      p.pulse += p.pulseSpeed;
      p.fadeTimer += 16;

      const fadeIn = Math.min(1, p.fadeTimer / 600);
      const pulseMod = 0.5 + Math.sin(p.pulse) * 0.5;
      p.alpha += (p.alphaTarget * pulseMod * intensity * fadeIn - p.alpha) * 0.025;

      if (p.alpha < 0.01) return;

      const px = p.x * canvasW;
      const py = p.y * canvasH;
      const pr = p.r * (isMobile ? 0.7 : 1);

      particleCtx.beginPath();
      particleCtx.arc(px, py, pr, 0, Math.PI * 2);
      const { r, g, b } = p.color;
      particleCtx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
      particleCtx.fill();
    });
  }

  // ── GRADIENT ──
  function updateGradient() {
    gradientCtx.clearRect(0, 0, canvasW, canvasH);

    // The lighting follows the Rakhi (synced from the 3D scene when available)
    const sp = scrollProgress;
    const cx = Number.isFinite(rakhiX) ? rakhiX : 0.78;
    const cy = Number.isFinite(rakhiY) ? rakhiY : 0.35;

    const grad = gradientCtx.createRadialGradient(
      cx * canvasW, cy * canvasH, 0,
      cx * canvasW, cy * canvasH, canvasW * 0.65
    );

    const colors = getSectionColors(sp);

    grad.addColorStop(0, colors.center);
    grad.addColorStop(0.5, colors.mid);
    grad.addColorStop(1, 'rgba(8, 5, 7, 0)');

    gradientCtx.fillStyle = grad;
    gradientCtx.fillRect(0, 0, canvasW, canvasH);

    // Secondary glow bottom-right
    const grad2 = gradientCtx.createRadialGradient(
      0.82 * canvasW, 0.82 * canvasH, 0,
      0.82 * canvasW, 0.82 * canvasH, canvasW * 0.45
    );
    grad2.addColorStop(0, colors.secondary);
    grad2.addColorStop(1, 'rgba(8, 5, 7, 0)');
    gradientCtx.fillStyle = grad2;
    gradientCtx.fillRect(0, 0, canvasW, canvasH);
  }

  function getSectionColors(sp) {
    if (sp < 0.15) {
      return {
        center: 'rgba(40, 22, 12, 0.45)',
        mid: 'rgba(20, 12, 8, 0.2)',
        secondary: 'rgba(107, 26, 46, 0.08)',
      };
    } else if (sp < 0.35) {
      return {
        center: 'rgba(45, 14, 22, 0.4)',
        mid: 'rgba(22, 10, 14, 0.18)',
        secondary: 'rgba(212, 160, 23, 0.06)',
      };
    } else if (sp < 0.55) {
      return {
        center: 'rgba(30, 12, 38, 0.38)',
        mid: 'rgba(18, 10, 22, 0.15)',
        secondary: 'rgba(107, 26, 46, 0.06)',
      };
    } else if (sp < 0.7) {
      return {
        center: 'rgba(42, 26, 12, 0.42)',
        mid: 'rgba(22, 14, 8, 0.18)',
        secondary: 'rgba(212, 160, 23, 0.08)',
      };
    } else if (sp < 0.85) {
      return {
        center: 'rgba(20, 12, 24, 0.35)',
        mid: 'rgba(12, 8, 16, 0.12)',
        secondary: 'rgba(74, 15, 31, 0.05)',
      };
    } else {
      return {
        center: 'rgba(48, 24, 14, 0.5)',
        mid: 'rgba(24, 12, 8, 0.22)',
        secondary: 'rgba(155, 32, 64, 0.08)',
      };
    }
  }

  function getGlobalIntensity(sp) {
    if (sp < 0.05) return 0;
    if (sp < 0.15) return (sp - 0.05) / 0.1;
    if (sp > 0.88) return 0.85 + (sp - 0.88) / 0.12 * 0.5;
    return 0.65 + Math.sin(sp * Math.PI) * 0.35;
  }

  // ── ORBIT / GOLDEN THREAD ──
  function updateOrbit() {
    orbitCtx.clearRect(0, 0, canvasW, canvasH);

    const sp = scrollProgress;
    const intensity = getOrbitIntensity(sp);
    if (intensity < 0.05) return;

    rakhiX += (rakhiXTarget - rakhiX) * CFG.rakhiLerp;
    rakhiY += (rakhiYTarget - rakhiY) * CFG.rakhiLerp;

    const cx = rakhiX * canvasW;
    const cy = rakhiY * canvasH;
    const radius = Math.min(canvasW, canvasH) * (isMobile ? 0.07 : 0.1) * (0.85 + 0.3 * rakhiScaleFactor);

    orbitRotation += 0.002 + sp * 0.0015;

    const ringAlpha = intensity * 0.55;
    orbitCtx.save();
    orbitCtx.translate(cx, cy);
    orbitCtx.rotate(orbitRotation);

    // Main orbit ellipse
    orbitCtx.beginPath();
    orbitCtx.ellipse(0, 0, radius, radius * 0.35, 0, 0, Math.PI * 2);
    orbitCtx.strokeStyle = `rgba(212, 160, 23, ${ringAlpha})`;
    orbitCtx.lineWidth = 1.2;
    orbitCtx.stroke();

    // Secondary orbit (tilted)
    orbitCtx.beginPath();
    orbitCtx.ellipse(0, 0, radius * 1.2, radius * 0.28, Math.PI / 6, 0, Math.PI * 2);
    orbitCtx.strokeStyle = `rgba(232, 184, 75, ${ringAlpha * 0.5})`;
    orbitCtx.lineWidth = 0.7;
    orbitCtx.stroke();

    // Orbiting dots
    for (let i = 0; i < 3; i++) {
      const angle = orbitRotation * (1 + i * 0.4) + (i * Math.PI * 2) / 3;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius * 0.35;
      const dotR = 2 + Math.sin(time * 2 + i) * 0.8;

      orbitCtx.beginPath();
      orbitCtx.arc(dx, dy, dotR, 0, Math.PI * 2);
      orbitCtx.fillStyle = `rgba(255, 248, 230, ${ringAlpha * 0.9})`;
      orbitCtx.fill();
    }

    // Soft glow around center
    const glowGrad = orbitCtx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.5);
    glowGrad.addColorStop(0, `rgba(212, 160, 23, ${intensity * 0.18})`);
    glowGrad.addColorStop(1, 'rgba(212, 160, 23, 0)');
    orbitCtx.fillStyle = glowGrad;
    orbitCtx.beginPath();
    orbitCtx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
    orbitCtx.fill();

    orbitCtx.restore();
  }

  function getOrbitIntensity(sp) {
    if (sp < 0.12) return 0;
    if (sp < 0.25) return (sp - 0.12) / 0.13 * 0.7;
    if (sp > 0.72 && sp < 0.82) return 0.7 * (1 - (sp - 0.72) / 0.1);
    if (sp >= 0.82) return 0.35 + (sp - 0.82) / 0.18 * 0.85;
    return 0.55 + Math.sin(sp * Math.PI * 2) * 0.1;
  }

  // ── RAF LOOP ──
  function animate() {
    if (!isActive) return;
    rafId = requestAnimationFrame(animate);

    time += CFG.timeStep;
    scrollProgress += (scrollProgressTarget - scrollProgress) * CFG.gradientSpeed;

    // Sync with the 3D Rakhi scene (smoothed there); fall back to local math otherwise
    const scene3d = window.RBScene3D;
    if (scene3d && typeof scene3d.getScreenPos === 'function') {
      const p = scene3d.getScreenPos();
      rakhiX = p.x;
      rakhiY = p.y;
      rakhiScaleFactor = p.scale || 1;
    } else {
      rakhiX += (rakhiXTarget - rakhiX) * CFG.rakhiLerp;
      rakhiY += (rakhiYTarget - rakhiY) * CFG.rakhiLerp;
      rakhiScaleFactor = 1;
    }

    updateGradient();
    updateOrbit();
    updateParticles();
  }

  // ── RESIZE ──
  function resize() {
    const dpr = Math.min(window.devicePixelRatio, isLowEnd ? 1 : 1.5);
    canvasW = window.innerWidth;
    canvasH = window.innerHeight;

    [gradientCanvas, orbitCanvas, particleCanvas].forEach(c => {
      if (!c) return;
      c.width = canvasW * dpr;
      c.height = canvasH * dpr;
      c.style.width = canvasW + 'px';
      c.style.height = canvasH + 'px';
    });

    if (gradientCtx) gradientCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (orbitCtx) orbitCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (particleCtx) particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── SHARED S-CURVE PATH (right → left → right → centre) ──
  // Prefers the 3D scene's path (always in sync with the Rakhi); falls back
  // to a local copy of the same Catmull-Rom curve if the 3D layer is absent.
  function getPathPoint(sp) {
    if (window.RBScene3D && typeof window.RBScene3D.getPathPoint === 'function') {
      return window.RBScene3D.getPathPoint(sp);
    }
    const vw = window.innerWidth;
    const dev  = vw < 480 ? 0.62 : vw < 1024 ? 0.80 : 0.94;
    const devY = vw < 480 ? 0.66 : vw < 1024 ? 0.82 : 1.00;
    const CX = 0.50, CY = 0.42;
    const SX = [
      { sp: 0.00, d:  0.30 }, { sp: 0.12, d:  0.30 }, { sp: 0.30, d:  0.04 },
      { sp: 0.46, d: -0.31 }, { sp: 0.61, d: -0.12 }, { sp: 0.76, d:  0.30 },
      { sp: 0.90, d:  0.12 }, { sp: 1.00, d:  0.00 }
    ];
    const SY = [
      { sp: 0.00, d:  0.00 }, { sp: 0.12, d:  0.05 }, { sp: 0.30, d:  0.15 },
      { sp: 0.46, d:  0.10 }, { sp: 0.61, d: -0.09 }, { sp: 0.76, d: -0.16 },
      { sp: 0.90, d: -0.05 }, { sp: 1.00, d:  0.00 }
    ];
    const catmull = (P, x) => {
      const n = P.length;
      if (x <= P[0].sp) return P[0].d;
      if (x >= P[n - 1].sp) return P[n - 1].d;
      let i = 0;
      while (i < n - 2 && P[i + 1].sp < x) i++;
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
      const t = (x - p1.sp) / (p2.sp - p1.sp || 1);
      const t2 = t * t, t3 = t2 * t;
      return 0.5 * (2 * p1.d + (-p0.d + p2.d) * t
        + (2 * p0.d - 5 * p1.d + 4 * p2.d - p3.d) * t2
        + (-p0.d + 3 * p1.d - 3 * p2.d + p3.d) * t3);
    };
    const sstep = (a, b, v) => {
      const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    const xFac = dev + (1 - dev) * sstep(0.78, 1, sp);
    const yFac = devY + (1 - devY) * sstep(0.84, 1, sp);
    return { x: CX + catmull(SX, sp) * xFac, y: CY + catmull(SY, sp) * yFac };
  }

  // ── SCROLL HANDLER ──
  function onScroll() {
    const scrollTop = window.scrollY || window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgressTarget = docHeight > 0 ? Math.max(0, Math.min(1, scrollTop / docHeight)) : 0;

    // Follow the same S-curve as the 3D Rakhi
    const p = getPathPoint(scrollProgressTarget);
    rakhiXTarget = p.x;
    rakhiYTarget = p.y;
  }

  // ── CREATE CANVASES ──
  function createCanvases() {
    gradientCanvas = document.createElement('canvas');
    gradientCanvas.id = 'cinematic-gradient';
    gradientCanvas.setAttribute('aria-hidden', 'true');
    gradientCtx = gradientCanvas.getContext('2d');
    document.body.appendChild(gradientCanvas);

    orbitCanvas = document.createElement('canvas');
    orbitCanvas.id = 'cinematic-orbit';
    orbitCanvas.setAttribute('aria-hidden', 'true');
    orbitCtx = orbitCanvas.getContext('2d');
    document.body.appendChild(orbitCanvas);

    particleCanvas = document.createElement('canvas');
    particleCanvas.id = 'cinematic-particles';
    particleCanvas.setAttribute('aria-hidden', 'true');
    particleCtx = particleCanvas.getContext('2d');
    document.body.appendChild(particleCanvas);
  }

  // ── CSS ──
  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'cinematic-scroll-styles';
    style.textContent = `
      /* Cinematic canvas layers: above section bg, below text.
         Layer order: gradient (10) → 3D Rakhi (11, static CSS) → orbit (12) → particles (13) */
      #cinematic-gradient, #cinematic-orbit, #cinematic-particles {
        position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none;
      }
      #cinematic-gradient { z-index: 10; opacity: 0.9; }
      #cinematic-orbit { z-index: 12; opacity: 0.8; }
      #cinematic-particles { z-index: 13; opacity: 0.9; }

      /* High-priority UI */
      #scroll-progress { z-index: 9999; }
      .music-btn { z-index: 1000; }
      #loader, .loader { z-index: 10000; }

      /* Sections: no stacking context, canvases show through their bg */
      .section, .final-section { position: relative; }

      /* Text content above canvases */
      .section__container, .final__content, .hero__content,
      .secret__container {
        position: relative; z-index: 20;
      }

      /* Background accents below canvases */
      .intro__bg-accent, .unsaid__bg, .final__vignette {
        z-index: 0; opacity: 0.4;
      }

      /* Scroll hint above canvas */
      .hero__scroll-hint { position: relative; z-index: 21; }

      /* Interactive elements above canvases */
      .hero__cta, .secret__btn, .mem-card, .memory-item {
        position: relative; z-index: 21;
      }

      /* Mobile: reduce intensity */
      @media (max-width: 768px) {
        #cinematic-gradient { opacity: 0.65; }
        #cinematic-orbit { opacity: 0.5; }
        #cinematic-particles { opacity: 0.55; }
      }
      @media (max-width: 480px) {
        #cinematic-gradient { opacity: 0.5; }
        #cinematic-orbit { opacity: 0.3; }
        #cinematic-particles { opacity: 0.4; }
      }

      /* Reduced motion: hide all */
      @media (prefers-reduced-motion: reduce) {
        #cinematic-gradient, #cinematic-orbit, #cinematic-particles { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── INIT ──
  function init() {
    if (prefersReducedMotion) return;

    injectStyles();
    createCanvases();
    createParticles();
    resize();

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    onScroll();

    isActive = true;
    animate();

    // Debug: verify canvases exist
    if (window.console) {
      console.log('[RBCinematic] Initialized — canvases:',
        'gradient=', !!gradientCanvas,
        'orbit=', !!orbitCanvas,
        'particles=', !!particleCanvas);
    }
  }

  function pause() {
    isActive = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function resume() {
    if (!isActive) { isActive = true; animate(); }
  }

  return { init, pause, resume };

})();
