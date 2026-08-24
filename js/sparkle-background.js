/**
 * ═══════════════════════════════════════════════════════
 * SPARKLE-BACKGROUND.JS — Premium Ambient Particle Atmosphere
 * ═══════════════════════════════════════════════════════
 *
 * A lightweight, full-viewport canvas of tiny glowing particles
 * that drift gently from deeper areas toward the center/upper area,
 * creating a premium cinematic Raksha Bandhan atmosphere.
 *
 * Design goals:
 * - Tiny glowing dust particles
 * - Slow, smooth movement
 * - Golden/white subtle tones
 * - Different sizes and opacity levels
 * - Occasional twinkling
 * - Never overpower content
 * - Lightweight: 50-80 desktop, 20-40 mobile
 * - Respects prefers-reduced-motion
 *
 * Layer: z-index 2 (above background, below everything else)
 * ═══════════════════════════════════════════════════════
 */

window.RBSparkle = (function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.matchMedia('(hover: none)').matches;
  const isLowEnd = isMobile && (navigator.hardwareConcurrency || 4) <= 2;

  const PARTICLE_COUNT = isLowEnd ? 15 : isMobile ? 28 : 55;

  let canvas, ctx;
  let width = 0, height = 0;
  let particles = [];
  let rafId = null;
  let isActive = false;
  let dpr = 1;
  let glowCanvas = null;
  let glowCtx = null;

  // ── GLOW TEXTURE ──────────────────────────────────────
  function createGlowTexture() {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    glowCtx = c.getContext('2d');
    
    const gradient = glowCtx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.15, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.15)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    glowCtx.fillStyle = gradient;
    glowCtx.fillRect(0, 0, size, size);
    glowCanvas = c;
  }

  // ── PARTICLE CLASS ────────────────────────────────────
  function createParticle(randomY) {
    const colors = [
      { r: 255, g: 248, b: 230 },  // warm white
      { r: 245, g: 200, b: 66 },   // gold light
      { r: 212, g: 160, b: 23 },   // soft gold
      { r: 232, g: 184, b: 75 },   // warm gold
      { r: 255, g: 240, b: 220 },  // cream
    ];

    // Origin from deeper areas (mostly bottom/sides), drift toward center/upper
    const edge = Math.random();
    let startX, startY;

    if (edge < 0.35) {
      // Bottom area — drift upward
      startX = Math.random();
      startY = 0.6 + Math.random() * 0.4;
    } else if (edge < 0.55) {
      // Left side — drift right/up
      startX = Math.random() * 0.2;
      startY = Math.random();
    } else if (edge < 0.75) {
      // Right side — drift left/up
      startX = 0.8 + Math.random() * 0.2;
      startY = Math.random();
    } else {
      // Random deep area
      startX = Math.random();
      startY = 0.5 + Math.random() * 0.5;
    }

    const color = colors[Math.floor(Math.random() * colors.length)];
    const baseSize = 0.6 + Math.random() * 2.0;

    return {
      x: startX,
      y: randomY ? Math.random() : startY,
      baseSize: baseSize,
      size: baseSize,
      vx: (Math.random() - 0.5) * 0.00015 + (startX < 0.3 ? 0.0001 : startX > 0.7 ? -0.0001 : 0),
      vy: -0.00008 - Math.random() * 0.00012,
      alpha: 0,
      maxAlpha: 0.12 + Math.random() * 0.35,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.008 + Math.random() * 0.018,
      pulseAmp: 0.3 + Math.random() * 0.7,
      color: color,
      life: 0,
      maxLife: 400 + Math.random() * 1200,
      fadeIn: 200 + Math.random() * 400,
    };
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = createParticle(true);
      p.life = Math.random() * p.maxLife; // stagger initial life
      p.alpha = p.maxAlpha * 0.5; // start partially visible
      particles.push(p);
    }
  }

  // ── UPDATE ────────────────────────────────────────────
  function update() {
    ctx.clearRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.35;

    particles.forEach((p, i) => {
      p.life += 16;

      // Fade in phase
      if (p.life < p.fadeIn) {
        p.alpha = (p.life / p.fadeIn) * p.maxAlpha;
      } else if (p.life > p.maxLife - 300) {
        // Fade out
        p.alpha = ((p.maxLife - p.life) / 300) * p.maxAlpha;
      } else {
        // Twinkle
        p.pulse += p.pulseSpeed;
        const twinkle = 0.5 + Math.sin(p.pulse) * p.pulseAmp;
        p.alpha = p.maxAlpha * twinkle;
      }

      p.alpha = Math.max(0, Math.min(1, p.alpha));

      if (p.alpha < 0.015) {
        // Respawn when too faint
        const newP = createParticle(false);
        particles[i] = newP;
        return;
      }

      // Movement
      p.x += p.vx;
      p.y += p.vy;

      // Subtle random drift
      p.x += Math.sin(p.pulse * 0.7) * 0.00003;
      p.y += Math.cos(p.pulse * 0.5) * 0.00002;

      // Gentle attraction toward center-upper area
      const dx = cx / width - p.x;
      const dy = cy / height - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      p.x += (dx / dist) * 0.00004;
      p.y += (dy / dist) * 0.00004;

      // Wrap around
      if (p.y < -0.03) { p.y = 1.03; p.x = Math.random(); p.life = 0; }
      if (p.x < -0.03) p.x = 1.03;
      if (p.x > 1.03) p.x = -0.03;

      // Size pulse
      p.size = p.baseSize * (0.85 + Math.sin(p.pulse * 1.3) * 0.15);

      const px = p.x * width;
      const py = p.y * height;
      const drawSize = Math.max(2, p.size * 6 * (isMobile ? 0.8 : 1));

      // Draw glow using pre-rendered texture
      ctx.globalAlpha = p.alpha * 0.7;
      const { r, g, b } = p.color;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(px, py, drawSize * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(px, py, drawSize * 0.2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
  }

  // ── ANIMATION LOOP ────────────────────────────────────
  function animate() {
    if (!isActive) return;
    rafId = requestAnimationFrame(animate);
    update();
  }

  // ── RESIZE ────────────────────────────────────────────
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, isLowEnd ? 1 : isMobile ? 1.25 : 1.5);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── CSS INJECTION ─────────────────────────────────────
  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'sparkle-background-styles';
    style.textContent = `
      #sparkle-canvas {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2;
        opacity: 0.9;
      }

      @media (max-width: 768px) {
        #sparkle-canvas { opacity: 0.7; }
      }

      @media (max-width: 480px) {
        #sparkle-canvas { opacity: 0.55; }
      }

      @media (prefers-reduced-motion: reduce) {
        #sparkle-canvas {
          opacity: 0.3 !important;
          animation: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ── INIT ──────────────────────────────────────────────
  function init() {
    if (prefersReducedMotion && !isMobile) {
      // Still show a static subtle canvas on desktop reduced motion
      createCanvas();
      resize();
      createGlowTexture();
      initParticles();
      update();
      return;
    }
    if (prefersReducedMotion) return;

    createCanvas();
    injectStyles();
    resize();
    createGlowTexture();
    initParticles();

    window.addEventListener('resize', () => {
      resize();
      initParticles();
    }, { passive: true });

    isActive = true;
    animate();
  }

  function createCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 'sparkle-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('role', 'presentation');
    ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);
  }

  function pause() {
    isActive = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function resume() {
    if (!isActive && canvas) {
      isActive = true;
      animate();
    }
  }

  // ── PUBLIC API ────────────────────────────────────────
  return { init, pause, resume };

})();
