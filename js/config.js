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
      src:     "images/photo01.png",                          // e.g. "images/sister-01.webp"
      alt:     "Sister memory — a playful moment",
      caption: "The silly moments were always the best.",
      year:    ""
    },
    photo02: {
       src: "images/photo02.png",
       alt: "Sister memory — a simple smile",
       caption: "Some smiles never need a reason.",
       year: ""
    },
    photo03: {
       src: "images/photo03.png",
       alt: "Sister memory — a happy candid moment",
       caption: "The smiles I'll always remember.",
       year: ""
    },
    photo04: {
       src: "images/photo04.png",
       alt: "Sister memory — growing up",
       caption: "Growing into the person you were meant to be.",
       year: ""
    },
    photo05: {
       src: "images/photo05.png",
       alt: "Sister memory — growing up together",
       caption: "Growing up, together.",
       year: ""
    },
photo06: {
       src: "images/photo06.png",
       alt: "Sister memory — together with family",
       caption: "Some memories are better together.",
       year: ""
    },
photo07: {
       src: "images/photo07.png",
       alt: "Sister memory — a family moment",
       caption: "Moments worth keeping forever.",
       year: ""
    },
photo08: {
       src: "images/photo08.jpg",
       alt: "Sister memory — together, always",
       caption: "And somehow, after all these years, it's still us.",
       year: ""
    }
  },

  // ── MUSIC ───────────────────────────────────────────
  // Place your music file in /audio/ and update the path below.
  // Supported: .mp3, .ogg
  music: {
    src:    "",          // e.g. "audio/background.mp3"
    volume: 0.35,        // 0.0 to 1.0
    loop:   true
  },

  // ── SITE CONTENT (optional overrides) ───────────────
  content: {
    sisterName: "Akka",
    heroLine1:  "Hey Akka…",
    heroLine2:  "Ee surprise nee kosam.",
    heroLine3:  "Just for you. ❤️"
  }
};
