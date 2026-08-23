/**
 * ═══════════════════════════════════════════════════════
 * MUSIC.JS — Optional Background Music System
 * ═══════════════════════════════════════════════════════
 *
 * HOW TO ADD MUSIC:
 * 1. Place your music file (MP3 or OGG) in the /audio/ folder.
 * 2. Update the `src` in js/config.js:
 *    music: { src: "audio/background.mp3", volume: 0.35, loop: true }
 *
 * Features:
 * - No forced autoplay (respects browser policies)
 * - User-initiated play on first interaction
 * - Elegant toggle button (fixed position)
 * - Volume fade in/out
 * ═══════════════════════════════════════════════════════
 */

window.RBMusic = (function () {

  let audio = null;
  let isPlaying = false;
  let initialized = false;
  let btn = null;

  function init() {
    btn = document.getElementById('music-toggle');
    if (!btn) return;

    const config = window.RBConfig?.music;

    // If no music source configured — hide the button gracefully
    if (!config || !config.src) {
      btn.style.display = 'none';
      return;
    }

    // Create audio element
    audio = new Audio();
    audio.src     = config.src;
    audio.volume  = 0;
    audio.loop    = config.loop !== false;
    audio.preload = 'none'; // Don't preload until user clicks

    // Audio event handlers
    audio.addEventListener('error', () => {
      console.warn('[RBMusic] Audio failed to load:', config.src);
      btn.style.display = 'none';
    });

    // Toggle on button click
    btn.addEventListener('click', toggle);

    initialized = true;
  }

  function toggle() {
    if (!audio || !initialized) return;

    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function play() {
    if (!audio) return;

    const config = window.RBConfig?.music;
    const targetVol = config?.volume ?? 0.35;

    audio.play().then(() => {
      isPlaying = true;
      updateUI(true);
      fadeTo(targetVol, 1200);
    }).catch(err => {
      console.warn('[RBMusic] Play failed:', err.message);
    });
  }

  function pause() {
    if (!audio || !isPlaying) return;

    fadeTo(0, 600, () => {
      audio.pause();
      isPlaying = false;
      updateUI(false);
    });
  }

  function fadeTo(targetVol, duration, onComplete) {
    if (!audio) return;

    const startVol = audio.volume;
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2; // ease-in-out

      audio.volume = startVol + (targetVol - startVol) * eased;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        audio.volume = targetVol;
        if (typeof onComplete === 'function') onComplete();
      }
    }

    requestAnimationFrame(step);
  }

  function updateUI(playing) {
    if (!btn) return;

    const label = btn.querySelector('.music-label');
    if (playing) {
      btn.classList.add('is-playing');
      btn.setAttribute('aria-label', 'Pause background music');
      btn.title = 'Pause music';
      if (label) label.textContent = 'Pause';
    } else {
      btn.classList.remove('is-playing');
      btn.setAttribute('aria-label', 'Play background music');
      btn.title = 'Play music';
      if (label) label.textContent = 'Music';
    }
  }

  return { init, play, pause, toggle };

})();
