/**
 * ═══════════════════════════════════════════════════════
 * MAIN.JS — Application Entry Point & Loader Orchestration
 * ═══════════════════════════════════════════════════════
 *
 * Coordinates:
 * 1. Cinematic loader (2.5s minimum display)
 * 2. 3D scene initialization
 * 3. Animation system setup
 * 4. Interaction system setup
 * 5. Music system setup
 * 6. IntersectionObserver for 3D pause/resume
 * ═══════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const START_TIME = performance.now();
  const MIN_LOADER_MS = 2500; // Minimum time to show loader

  // ── UTILITY ──────────────────────────────────────────
  function qs(selector) {
    return document.querySelector(selector);
  }

  // ── LOADER DISMISSAL ─────────────────────────────────
  function dismissLoader() {
    const loader  = qs('#loader');
    const main    = qs('#main-content');
    const final   = qs('#final');

    if (!loader) return;

    loader.classList.add('is-exiting');

    // After exit animation completes
    setTimeout(() => {
      loader.style.display = 'none';
      loader.setAttribute('aria-hidden', 'true');

      // Show main content
      if (main) {
        main.classList.add('is-visible');
      }
      if (final) {
        final.style.opacity = '1';
      }

      // Initialize animations now that content is visible
      if (window.RBAnimations) {
        window.RBAnimations.init();
      }

    }, 900); // Matches loader exit animation duration
  }

  // ── 3D VISIBILITY MANAGEMENT ─────────────────────────
  // The 3D canvas is now a fixed full-page cinematic layer —
  // it stays active for the whole scroll journey and is only
  // paused when the tab is hidden (see visibilitychange below).

  // ── FONT LOAD DETECTION ───────────────────────────────
  async function waitForFonts() {
    if ('fonts' in document) {
      try {
        await document.fonts.ready;
      } catch (e) {
        // Fonts.ready not critical — continue
      }
    }
  }

  // ── MAIN BOOT SEQUENCE ────────────────────────────────
  async function boot() {
    // 1. Start font loading in parallel
    const fontPromise = waitForFonts();

    // 2. Init interaction systems immediately
    //    (cursor, particles, buttons — don't need to wait)
    if (window.RBInteractions) {
      try { window.RBInteractions.init(); } catch (e) { console.warn('[RB] Interactions init error', e); }
    }

    // 3. Init music system
    if (window.RBMusic) {
      try { window.RBMusic.init(); } catch (e) { console.warn('[RB] Music init error', e); }
    }

    // 4. Init 3D scene (heavy — needs to start ASAP)
    //    Wrapped in try-catch so animation failure never blocks page load
    if (window.RBScene3D) {
      try { window.RBScene3D.init(); } catch (e) { console.warn('[RB] Scene3D init error', e); }
    }

    // 5. Init cinematic scroll (gradient, orbit, particles, section transitions)
    //    Wrapped in try-catch so animation failure never blocks page load
    if (window.RBCinematic) {
      try { window.RBCinematic.init(); } catch (e) { console.warn('[RB] Cinematic init error', e); }
    }

    // 6. Wait for fonts + minimum loader time
    const elapsed = performance.now() - START_TIME;
    const remaining = Math.max(0, MIN_LOADER_MS - elapsed);

    await fontPromise;
    await new Promise(resolve => setTimeout(resolve, remaining));

    // 7. Dismiss loader — MUST always run, even if init threw above
    dismissLoader();
  }

  // ── START ─────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // ── GLOBAL ERROR HANDLER ─────────────────────────────
  window.addEventListener('error', (e) => {
    // Non-critical: log but don't break experience
    if (e.filename && e.filename.includes('three')) {
      console.warn('[RB] Three.js error — falling back to CSS');
      if (window.RBScene3D) {
        // Scene3D handles its own fallback internally
      }
    }
  });

  // ── PAGE VISIBILITY ───────────────────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Tab hidden — pause heavy animations
      if (window.RBScene3D) window.RBScene3D.pause();
      if (window.RBCinematic) window.RBCinematic.pause();
    } else {
      // Tab visible — resume the cinematic layers
      if (window.RBScene3D) window.RBScene3D.resume();
      if (window.RBCinematic) window.RBCinematic.resume();
    }
  });

})();
