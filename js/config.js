 /**
 * ═══════════════════════════════════════════════════════
 * CONFIG.JS — Centralized Content & Photo Configuration
 * ═══════════════════════════════════════════════════════
 *
 * HOW TO ADD YOUR SISTER'S PHOTOS:
 * ─────────────────────────────────
 * 1. Place your image files in the /images/ folder.
 * 2. Update the `src` field for each photo below.
 * 3. Add a meaningful `caption` and `year` (optional).
 * 4. Supported formats: .webp (preferred), .jpg, .png, .avif
 *
 * EXAMPLE:
 *   src: "images/sister-birthday-2018.webp",
 *   caption: "Her birthday cake obsession phase.",
 *   year: "2018"
 *
 * DO NOT change the `key` values — they link to the HTML.
 * ═══════════════════════════════════════════════════════
 */

window.RBConfig = {

  // ── PHOTOS ──────────────────────────────────────────
  // Add your real photo paths here. Leave src empty ("") to show placeholder.
  photos: {
    photo01: {
      src:     "images/photo.1.jpeg",
      alt:     "Childhood memory — together from the very beginning",
      caption: "Where it all began. The very first chapter.",
      year:    ""
    },
    photo02: {
       src: "images/photo2.jpeg",
       alt: "Akka in purple dress at home",
       caption: "Even at home, she makes every moment beautiful.",
       year: ""
    },
    photo03: {
       src: "images/photo3.jpeg",
       alt: "Akka radiant in pink saree",
       caption: "The way she lights up every room she walks into.",
       year: ""
    },
    photo04: {
       src: "images/photo4.jpeg",
       alt: "Akka portrait in pink saree",
       caption: "Grace. Warmth. That smile that says everything.",
       year: ""
    },
    photo05: {
       src: "images/photo5.jpeg",
       alt: "Akka in pink saree at temple",
       caption: "Devotion, tradition, and her. Always together.",
       year: ""
    },
    photo06: {
       src: "images/photo6.jpeg",
       alt: "Akka at home in pink saree",
       caption: "Home feels like home because of people like her.",
       year: ""
    },
    photo07: {
       src: "images/photo7.jpeg",
       alt: "Brother and Akka — always together",
       caption: "Us. No explanation needed.",
       year: ""
    }
  },

  // ── MUSIC ───────────────────────────────────────────
  // Place your music file in /audio/ and update the path below.
  // Supported: .mp3, .ogg
  music: {
    src:    "audio/kaalamaagi-choosina.mp3",          // e.g. "audio/background.mp3"
    volume: 0.35,        // 0.0 to 1.0
    loop:   true
  },

  // ── SITE CONTENT (optional overrides) ───────────────
  content: {
    sisterName: "Akka",
    heroLine1:  "My Dearest Akka ❤️",
    heroLine2:  "This surprise is just for you.",
    heroLine3:  "With all my love. 🌸"
  }
};
