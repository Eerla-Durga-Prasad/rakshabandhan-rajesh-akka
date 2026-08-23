/**
 * ═══════════════════════════════════════════════════════
 * SCENE3D.JS — Premium Cinematic 3D Rakhi Background
 * ═══════════════════════════════════════════════════════
 *
 * A fixed, full-page Three.js experience rendered behind the
 * site content (replaces the old hero-only canvas):
 *
 *  - Procedural premium Rakhi: braided gold rings, burgundy
 *    fabric band, ruby medallion, petals and ornaments
 *  - Left + right silk threads (burgundy fabric + fine gold
 *    strand) that undulate gently and follow the Rakhi
 *  - Scroll-driven slow rotation, tilt and X/Y/Z drift
 *  - Section choreography (hero → final) controlling position,
 *    scale, glow and warmth so text stays readable
 *  - Two depth layers of drifting particles (background / foreground)
 *  - Performance tiers (phone / tablet / desktop) with DPR caps
 *  - prefers-reduced-motion: static, minimal render
 *  - Automatic CSS fallback when WebGL is unavailable
 *
 * The scene exposes getScreenPos() so the 2D cinematic layer
 * (orbit + lighting gradient) stays perfectly synced with the
 * 3D Rakhi.
 * ═══════════════════════════════════════════════════════
 */

window.RBScene3D = (function () {

  'use strict';

  // ── PERFORMANCE TIER ────────────────────────────────
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const viewW = window.innerWidth;
  const QUALITY = viewW < 480 ? 'low' : viewW < 1024 ? 'medium' : 'high';
  const isPhone  = QUALITY === 'low';
  const isTablet = QUALITY === 'medium';

  const DPR             = Math.min(window.devicePixelRatio || 1, isPhone ? 1 : isTablet ? 1.25 : 1.75);
  const PARTICLE_COUNT  = QUALITY === 'high' ? 48 : QUALITY === 'medium' ? 32 : 18;
  const USE_ENV_MAP     = QUALITY === 'high';
  const USE_GOLD_THREAD = QUALITY !== 'low';
  const THREAD_SEGMENTS = QUALITY === 'high' ? 56 : isTablet ? 40 : 24;
  const THREAD_RADIAL   = QUALITY === 'high' ? 10 : isTablet ? 7 : 6;
  const WAVE_SCALE      = isPhone ? 0.55 : 1;
  const ROT_SCALE       = isPhone ? 0.55 : 1;
  const SIZE_SCALE      = isPhone ? 0.82 : isTablet ? 0.9 : 1;

  // S-curve journey amplitude per device — larger, clearly visible S on all screens
  // Keep the wide desktop journey safely inside the viewport.  The path is
  // scaled toward centre on smaller displays rather than amplified past edges.
  const PATH_DEV    = isPhone ? 0.62 : isTablet ? 0.80 : 0.94;
  const PATH_DEV_Y  = isPhone ? 0.66 : isTablet ? 0.82 : 1.00;
  // Rebuild thread tube geometry at most every N frames on weaker devices
  const THREAD_STEP = isPhone ? 4 : isTablet ? 2 : 1;
  // Thread visual enhancement
  const THREAD_WAVE_BOOST = isPhone ? 1.2 : isTablet ? 1.4 : 1.6;

  // ── STATE ──
  let scene, camera, renderer, clock;
  let rakhiGroup = null;
  let glowSprite = null, warmSprite = null, rakhiLight = null, fillLight = null;
  let farPoints = null, nearPoints = null;
  let farBase = [], nearBase = [];
  let threadMeshL = [], threadMeshR = [];
  let goldThreadMeshL = [], goldThreadMeshR = [];
  let animFrameId = null;
  let isActive = false;
  let initialized = false;

  const state = {
    sp: 0, spT: 0,          // scroll progress 0..1
    x: 0.50 + 0.30 * PATH_DEV, y: 0.42, // exact safe starting point on the S-curve
    z: 0,                   // smoothed depth
    s: 1,                   // smoothed scale factor
    glow: 1,                // smoothed glow intensity
    warm: 0.45,             // smoothed warmth (gold vs burgundy)
    rotY: 0, rotX: 0, rotZ: 0,
    time: 0
  };
  const mouse = { x: 0, y: 0 };

  // Thread dynamics — motion-coupled lag, follow-through whip and living sway
  const thread = { drag: 0, prevDrag: 0, whip: 0, swayP: 0, swayAmp: 0.05, lastAmp: -1, lastDrag: 99, stretch: 0, wavePhase: 0 };
  let frame = 0;

  // Camera / frustum
  const CAM_Z = 5.6;
  const FOV = 55;
  let hh = Math.tan((FOV * Math.PI) / 360) * CAM_Z;
  let hw = hh * (window.innerWidth / window.innerHeight);

  let sectionProgress = [];
  let lastThreadSp = -1;

  const SECTION_IDS = ['hero', 'intro', 'memories', 'memory-cards', 'timeline', 'unsaid', 'secret', 'final'];

  // Section choreography — position, scale, glow, warmth per section.
  // x/y are normalized viewport coordinates (0..1, y from top).
  const KEYFRAMES = [
    { x: 0.76, y: 0.40, s: 1.00, glow: 1.00, warm: 0.45 }, // hero
    { x: 0.73, y: 0.40, s: 0.92, glow: 0.90, warm: 0.45 }, // intro
    { x: 0.70, y: 0.36, s: 0.86, glow: 0.82, warm: 0.42 }, // memories
    { x: 0.74, y: 0.34, s: 0.82, glow: 0.78, warm: 0.50 }, // memory-cards
    { x: 0.78, y: 0.40, s: 0.84, glow: 0.82, warm: 0.55 }, // timeline
    { x: 0.73, y: 0.36, s: 0.74, glow: 0.62, warm: 0.48 }, // unsaid
    { x: 0.70, y: 0.30, s: 0.66, glow: 0.45, warm: 0.60 }, // secret (anticipation)
    { x: 0.50, y: 0.22, s: 1.18, glow: 1.25, warm: 0.80 }  // final (climax)
  ];

  // ── WEBGL CHECK ─────────────────────────────────────
  function checkWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl'))
      );
    } catch (e) { return false; }
  }

  // ── CHOREOGRAPHY ────────────────────────────────────
  function computeSectionCenters() {
    const docH = document.documentElement.scrollHeight - window.innerHeight || 1;
    const scrollY = window.scrollY || 0;
    sectionProgress = SECTION_IDS.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const absTop = rect.top + scrollY;
      return Math.max(0, Math.min(1, (absTop + rect.height / 2) / docH));
    });
  }

  // ── S-CURVE JOURNEY (right → left → right → center) ──
  // Deviations around a centre point, interpolated with Catmull-Rom so the
  // whole scroll forms one continuous curved S instead of straight segments.
  // Larger amplitude for clearly visible cinematic S-curve.
  const S_CENTER_X = 0.50, S_CENTER_Y = 0.42;
  const S_PATH_X = [
    { sp: 0.00, d:  0.30 },  // START RIGHT — safe margin
    { sp: 0.12, d:  0.30 },  // deliberately hold right
    { sp: 0.30, d:  0.04 },  // first sweeping curve begins
    { sp: 0.46, d: -0.31 },  // FIRST TURN — far left
    { sp: 0.61, d: -0.12 },  // arc back through the middle
    { sp: 0.76, d:  0.30 },  // SECOND TURN — far right
    { sp: 0.90, d:  0.12 },  // final approach
    { sp: 1.00, d:  0.00 }   // FINAL — exact viewport centre
  ];
  const S_PATH_Y = [
    { sp: 0.00, d:  0.00 },  // stable opening composition
    { sp: 0.12, d:  0.05 },  // then descend into the first curve
    { sp: 0.30, d:  0.15 },
    { sp: 0.46, d:  0.10 },
    { sp: 0.61, d: -0.09 },  // rise through the return stroke
    { sp: 0.76, d: -0.16 },
    { sp: 0.90, d: -0.05 },
    { sp: 1.00, d:  0.00 }   // stable centre finish
  ];

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function catmullValue(points, sp) {
    const n = points.length;
    if (sp <= points[0].sp) return points[0].d;
    if (sp >= points[n - 1].sp) return points[n - 1].d;
    let i = 0;
    while (i < n - 2 && points[i + 1].sp < sp) i++;
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(n - 1, i + 2)];
    const t = (sp - p1.sp) / (p2.sp - p1.sp || 1);
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * (
      (2 * p1.d) +
      (-p0.d + p2.d) * t +
      (2 * p0.d - 5 * p1.d + 4 * p2.d - p3.d) * t2 +
      (-p0.d + 3 * p1.d - 3 * p2.d + p3.d) * t3
    );
  }

  function smoothstep(a, b, v) {
    const t = clamp01((v - a) / (b - a));
    return t * t * (3 - 2 * t);
  }

  // Device-scaled amplitude that still lands exactly on the final centre.
  function sampleSPath(sp) {
    const xFac = PATH_DEV + (1 - PATH_DEV) * smoothstep(0.78, 1, sp);
    const yFac = PATH_DEV_Y + (1 - PATH_DEV_Y) * smoothstep(0.84, 1, sp);
    return {
      x: S_CENTER_X + catmullValue(S_PATH_X, sp) * xFac,
      y: S_CENTER_Y + catmullValue(S_PATH_Y, sp) * yFac,
      z: Math.sin(sp * Math.PI) * 0.45 + Math.sin(sp * Math.PI * 2) * 0.12 + Math.sin(sp * Math.PI * 3) * 0.04
    };
  }

  function sampleSPathDeriv(sp) {
    const e = 0.008;
    const lo = Math.max(0, sp - e), hi = Math.min(1, sp + e);
    const a = sampleSPath(lo);
    const b = sampleSPath(hi);
    return {
      vx: (b.x - a.x) / ((hi - lo) || 1),
      vy: (b.y - a.y) / ((hi - lo) || 1),
      vz: (b.z - a.z) / ((hi - lo) || 1)
    };
  }

  function sampleKeyframes(sp) {
    let i = 0;
    for (let k = 0; k < sectionProgress.length; k++) {
      if (sectionProgress[k] !== null && sp >= sectionProgress[k]) i = k;
    }
    let j = Math.min(i + 1, KEYFRAMES.length - 1);
    let t = 0;
    const pi = sectionProgress[i];
    const pj = sectionProgress[j];
    if (pi !== null && pj !== null && pj > pi) t = (sp - pi) / (pj - pi);
    t = Math.max(0, Math.min(1, t));
    const e = t * t * (3 - 2 * t); // smoothstep
    const a = KEYFRAMES[i], b = KEYFRAMES[j];
    return {
      x:    a.x    + (b.x - a.x)    * e,
      y:    a.y    + (b.y - a.y)    * e,
      s:    a.s    + (b.s - a.s)    * e,
      glow: a.glow + (b.glow - a.glow) * e,
      warm: a.warm + (b.warm - a.warm) * e
    };
  }

  // ── TEXTURE HELPERS ─────────────────────────────────
  function makeGlowTexture(colorHex) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const color = '#' + (colorHex & 0xffffff).toString(16).padStart(6, '0');
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.25, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  function makeEnvTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#060308';
    ctx.fillRect(0, 0, 512, 256);
    const blob = (x, y, r, color) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 256);
    };
    blob(256, 55, 110,  'rgba(255,235,200,0.85)');
    blob(120, 95, 120,  'rgba(212,160,23,0.65)');
    blob(400, 105, 110, 'rgba(230,180,60,0.55)');
    blob(256, 215, 140, 'rgba(122,26,46,0.5)');
    blob(90, 205, 90,   'rgba(200,120,130,0.3)');
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }

  // ── THREADS ─────────────────────────────────────────
  // flex = per-side motion bend (the thread lags behind the Rakhi, bows,
  // then catches up). zFlex gives the same bend a touch of depth.
  function makeThreadCurve(side, length, amp, phase, gold, flex, zFlex, strand = 0) {
    const pts = [];
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const env = Math.pow(Math.sin(t * Math.PI), 0.55);
      const mid = Math.sin(t * Math.PI);
      const spread = strand * 0.048;
      const wave1 = Math.sin(t * Math.PI * 4.5 + phase * 0.6 + strand) * 0.025 * env;
      const wave2 = Math.sin(t * Math.PI * 7 + phase * 1.1 + strand * 1.7) * 0.012 * env * Math.pow(t, 1.5);
      const x = side * (1.56 + t * length + wave1 + wave2);
      const y = env * (-Math.sin(t * 2.8 + phase * 1.0) * amp * 1.5)
              - 0.045 * Math.pow(Math.sin(t * Math.PI), 1.8)
              + mid * flex + spread * (0.35 + env);
      const z = gold
        ? Math.sin(t * Math.PI * 6) * 0.038 * (1 - t * 0.35) + mid * zFlex
        : Math.sin(t * 3.8 + phase * 0.5) * amp * 0.65 * env + mid * zFlex;
      pts.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  }

  function replaceTube(mesh, curve) {
    if (!mesh) return;
    const oldGeo = mesh.geometry;
    mesh.geometry = new THREE.TubeGeometry(curve, THREAD_SEGMENTS, mesh.userData.radius, THREAD_RADIAL, false);
    if (oldGeo) oldGeo.dispose();
  }

  function replaceThreadSet(meshes, side, length, amp, phase, gold, flex, zFlex) {
    meshes.forEach((mesh, index) => {
      const strand = index - (meshes.length - 1) * 0.5;
      replaceTube(mesh, makeThreadCurve(side, length, amp * (1 + index * 0.09), phase + index * 0.28,
        gold, flex + strand * 0.025, zFlex + strand * 0.035, strand));
    });
  }

  function buildThreads(force) {
    if (!rakhiGroup) return;

    // Rebuild only when something moved enough (scroll or thread dynamics);
    // the per-frame step gate lowers rebuild frequency on weaker devices.
    const swayDel = Math.abs(thread.swayAmp - thread.lastAmp);
    const dragDel = Math.abs(thread.drag - thread.lastDrag);
    const stretchDel = Math.abs(thread.stretch - (thread.lastStretch || 0));
    const spMoved = Math.abs(state.sp - lastThreadSp) >= 0.001;
    if (!force && !spMoved && swayDel < 0.005 && dragDel < 0.015 && stretchDel < 0.01) return;
    if (!force && frame % THREAD_STEP !== 0) return;
    lastThreadSp = state.sp;
    thread.lastAmp = thread.swayAmp;
    thread.lastDrag = thread.drag;
    thread.lastStretch = thread.stretch;

    // Threads must always span the visible edges even as the Rakhi drifts
    const worldX = (state.x - 0.5) * 2 * hw;
    const lenL = Math.max(hw * 0.28, (hw + worldX) * 1.35 - 1.56);
    const lenR = Math.max(hw * 0.28, (hw - worldX) * 1.35 - 1.56);

    // Enhanced baseline wave with more visible amplitude
    const baseWave = 0.09 + 0.18 * Math.abs(Math.sin(state.sp * Math.PI));
    const amp = (baseWave + thread.swayAmp) * WAVE_SCALE * THREAD_WAVE_BOOST;
    const phase = state.sp * Math.PI * 3.5 + thread.wavePhase;

    // Motion-coupled follow-through with enhanced physics
    const d = thread.drag;
    const w = thread.whip * 0.6;
    const stretch = thread.stretch;

    // Tautness: thread behind stretches, thread ahead compresses
    const tautL = Math.max(0.35, 1 - Math.max(0, d) * 0.6 - stretch * 0.3);
    const tautR = Math.max(0.35, 1 - Math.max(0, -d) * 0.6 - stretch * 0.3);

    // Flex: lag behind movement direction with follow-through
    const flexL = -(d > 0 ? d * 0.42 : 0) + w * 0.45 - stretch * 0.15;
    const flexR =  (d < 0 ? -d * 0.42 : 0) + w * 0.45 - stretch * 0.15;

    // Z-flex for 3D depth movement
    const zFlexL = flexL * 0.4;
    const zFlexR = flexR * 0.4;

    replaceThreadSet(threadMeshL, -1, lenL, amp * tautL, phase, false, flexL, zFlexL);
    replaceThreadSet(threadMeshR,  1, lenR, amp * tautR, phase, false, flexR, zFlexR);
    if (USE_GOLD_THREAD) {
      replaceThreadSet(goldThreadMeshL, -1, lenL, amp * tautL, phase, true, flexL, zFlexL);
      replaceThreadSet(goldThreadMeshR,  1, lenR, amp * tautR, phase, true, flexR, zFlexR);
    }
  }

  // ── RAKHI COMPOSITION ───────────────────────────────
  function buildRakhi() {
    rakhiGroup = new THREE.Group();
    scene.add(rakhiGroup);

    // Premium realistic gold and gemstone materials (Reference matched)
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xe6b422, metalness: 0.92, roughness: 0.16,
      envMapIntensity: 1.25, emissive: 0x3d2500, emissiveIntensity: 0.35
    });
    const goldBrightMat = new THREE.MeshStandardMaterial({
      color: 0xffd700, metalness: 0.95, roughness: 0.12,
      envMapIntensity: 1.35, emissive: 0x4a3000, emissiveIntensity: 0.45
    });
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0xbc0e2e, metalness: 0.25, roughness: 0.04,
      envMapIntensity: 1.6, emissive: 0x5a0512, emissiveIntensity: 0.55
    });
    const petalGemMat = new THREE.MeshStandardMaterial({
      color: 0xaa0c24, metalness: 0.20, roughness: 0.06,
      envMapIntensity: 1.5, emissive: 0x44040d, emissiveIntensity: 0.45
    });
    const whiteGlintMat = new THREE.MeshBasicMaterial({ color: 0xfff7e0 });

    if (!USE_ENV_MAP) {
      goldMat.metalness = 0.65; goldMat.roughness = 0.25;
      goldBrightMat.metalness = 0.72; goldBrightMat.roughness = 0.20;
      gemMat.roughness = 0.08;
      petalGemMat.roughness = 0.10;
    }

    const add = (geo, mat, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      rakhiGroup.add(m);
      return m;
    };

    // 0. Base gold support plate (gives solid 3D depth and backing)
    const basePlate = add(new THREE.CylinderGeometry(0.72, 0.76, 0.06, 48), goldMat, 0, 0, -0.06);
    basePlate.rotation.x = Math.PI / 2;

    // 1. 8-Petal Gold Floral Structure with Deep Red Teardrop Gemstones inside
    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.quadraticCurveTo(0.18, 0.24, 0.16, 0.52);
    petalShape.quadraticCurveTo(0, 0.72, -0.16, 0.52);
    petalShape.quadraticCurveTo(-0.18, 0.24, 0, 0);

    const petalGeo = new THREE.ExtrudeGeometry(petalShape, {
      depth: 0.08, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.025, bevelThickness: 0.025, curveSegments: 16
    });
    petalGeo.center();

    const innerPetalGeo = new THREE.ExtrudeGeometry(petalShape, {
      depth: 0.06, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.02, bevelThickness: 0.02, curveSegments: 16
    });
    innerPetalGeo.center();

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);

      // Gold petal
      const petal = add(petalGeo, goldBrightMat, cosA * 0.54, sinA * 0.54, 0.01);
      petal.rotation.z = a - Math.PI / 2;
      petal.rotation.x = -sinA * 0.08;
      petal.rotation.y = cosA * 0.08;

      // Deep-red teardrop gemstone inset inside each petal
      const gemInset = add(innerPetalGeo, petalGemMat, cosA * 0.57, sinA * 0.57, 0.065);
      gemInset.scale.set(0.52, 0.54, 1);
      gemInset.rotation.z = a - Math.PI / 2;
      gemInset.rotation.x = -sinA * 0.08;
      gemInset.rotation.y = cosA * 0.08;

      // Gold rim accent around teardrop gem
      const gemRim = add(new THREE.TorusGeometry(0.11, 0.014, 10, 24), goldBrightMat, cosA * 0.57, sinA * 0.57, 0.08);
      gemRim.scale.set(0.70, 1.25, 0.70);
      gemRim.rotation.z = a - Math.PI / 2;
    }

    // 2. Gold Filigree Ornamental Loops between Petals
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) / 8) * Math.PI * 2;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);

      // Curved gold loop between petals
      const filigree = add(new THREE.TorusGeometry(0.16, 0.018, 10, 28), goldMat, cosA * 0.78, sinA * 0.78, 0.00);
      filigree.scale.set(0.68, 1.30, 0.75);
      filigree.rotation.z = a;

      // Ornamental gold bead at filigree tip
      add(new THREE.SphereGeometry(0.048, 14, 10), goldBrightMat, cosA * 0.94, sinA * 0.94, 0.02);
    }

    // 3. Central Gemstone & Bezel Assembly (Raised deep-red ruby + gold bezel)
    add(new THREE.TorusGeometry(0.46, 0.042, 14, 64), goldBrightMat, 0, 0, 0.03);
    add(new THREE.TorusGeometry(0.40, 0.038, 14, 56), goldMat, 0, 0, 0.075);

    const bezelWall = add(new THREE.CylinderGeometry(0.33, 0.38, 0.14, 48), goldBrightMat, 0, 0, 0.08);
    bezelWall.rotation.x = Math.PI / 2;

    add(new THREE.TorusGeometry(0.30, 0.028, 14, 48), goldMat, 0, 0, 0.155);

    // Faceted deep-red round central ruby gemstone
    const rubyGeo = new THREE.IcosahedronGeometry(0.26, 2);
    const ruby = add(rubyGeo, gemMat, 0, 0, 0.19);
    ruby.scale.set(1.05, 1.05, 0.58);

    // Specular highlight glint
    add(new THREE.SphereGeometry(0.055, 12, 8), whiteGlintMat, 0.09, 0.10, 0.32);

    // 4. Symmetrical Left & Right Side Beads (Gold - Red - Gold - Connector)
    [-1, 1].forEach(side => {
      // 1. Small gold bead
      add(new THREE.SphereGeometry(0.105, 16, 12), goldBrightMat, side * 0.96, 0, 0.02);

      // 2. Larger red/gold bead (Ruby bead with gold ring & end caps)
      const redBead = add(new THREE.SphereGeometry(0.165, 20, 16), gemMat, side * 1.20, 0, 0.02);
      redBead.scale.set(1.1, 0.92, 0.82);
      add(new THREE.TorusGeometry(0.155, 0.022, 10, 24), goldBrightMat, side * 1.20, 0, 0.02).rotation.y = Math.PI / 2;
      add(new THREE.TorusGeometry(0.10, 0.016, 8, 20), goldMat, side * 1.05, 0, 0.02).rotation.y = Math.PI / 2;
      add(new THREE.TorusGeometry(0.10, 0.016, 8, 20), goldMat, side * 1.35, 0, 0.02).rotation.y = Math.PI / 2;

      // 3. Small gold bead
      add(new THREE.SphereGeometry(0.095, 16, 12), goldBrightMat, side * 1.45, 0, 0.02);

      // 4. Gold connector cap for thread attachment
      const cap = add(new THREE.CylinderGeometry(0.065, 0.085, 0.12, 16), goldMat, side * 1.56, 0, 0.02);
      cap.rotation.z = side * Math.PI / 2;
    });

    // Soft emissive glow (gold) behind the rakhi
    glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(0xffd98a), color: 0xffd98a, transparent: true, opacity: 0.3,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    glowSprite.position.z = -0.15;
    glowSprite.scale.setScalar(4.6);
    rakhiGroup.add(glowSprite);

    // Warm burgundy aura
    warmSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(0x8a2740), color: 0x8a2740, transparent: true, opacity: 0.14,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    warmSprite.position.z = -0.1;
    warmSprite.scale.setScalar(3.4);
    rakhiGroup.add(warmSprite);

    // Inner warm light that follows the rakhi
    rakhiLight = new THREE.PointLight(0xffb347, 1.6, 0, 2);
    rakhiLight.position.set(0, 0, 1.8);
    rakhiGroup.add(rakhiLight);

    // 5. Multiple Thin Deep-Red Thread Bundle
    const fabricThreadMat = new THREE.MeshStandardMaterial({
      color: 0x900c1e, metalness: 0.10, roughness: 0.35,
      envMapIntensity: 0.5, emissive: 0x220308, emissiveIntensity: 0.35
    });
    const goldThreadMat = new THREE.MeshStandardMaterial({
      color: 0xd4a017, metalness: 0.9, roughness: 0.2,
      envMapIntensity: 1.0, emissive: 0x1f1300, emissiveIntensity: 0.4
    });
    const makeThreadMesh = (radius, mat) => {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), mat);
      m.userData.radius = radius;
      rakhiGroup.add(m);
      return m;
    };
    threadMeshL = [
      makeThreadMesh(0.017, fabricThreadMat),
      makeThreadMesh(0.014, fabricThreadMat),
      makeThreadMesh(0.011, fabricThreadMat),
      makeThreadMesh(0.009, fabricThreadMat),
      makeThreadMesh(0.007, fabricThreadMat)
    ];
    threadMeshR = [
      makeThreadMesh(0.017, fabricThreadMat),
      makeThreadMesh(0.014, fabricThreadMat),
      makeThreadMesh(0.011, fabricThreadMat),
      makeThreadMesh(0.009, fabricThreadMat),
      makeThreadMesh(0.007, fabricThreadMat)
    ];
    if (USE_GOLD_THREAD) {
      goldThreadMeshL = [makeThreadMesh(0.006, goldThreadMat)];
      goldThreadMeshR = [makeThreadMesh(0.006, goldThreadMat)];
    }
  }

  // ── PARTICLES ───────────────────────────────────────
  function makeParticles(count, minR, maxR, zMin, zMax, size, opacity) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const base = [];
    const palette = [0xfff3d6, 0xe8c96a, 0xd9b54a, 0xcf8a94, 0xffffff];
    for (let i = 0; i < count; i++) {
      const r = minR + Math.random() * (maxR - minR);
      const theta = Math.random() * Math.PI * 2;
      const z = zMin + Math.random() * (zMax - zMin);
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r * 0.8;
      positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
      const c = new THREE.Color(palette[(Math.random() * palette.length) | 0]);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      base.push({ x, y, s: 0.3 + Math.random() * 0.9, p: Math.random() * Math.PI * 2 });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size, sizeAttenuation: true, vertexColors: true,
      transparent: true, opacity, depthWrite: false
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    return { points, base };
  }

  function updatePointCloud(points, base, speedMul, t) {
    const pos = points.geometry.attributes.position;
    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      pos.array[i * 3]     = b.x + Math.sin(t * b.s * speedMul + b.p) * 0.045;
      pos.array[i * 3 + 1] = b.y + Math.cos(t * b.s * speedMul * 0.8 + b.p * 1.3) * 0.05;
    }
    pos.needsUpdate = true;
  }

  function updateParticles(t) {
    if (!farPoints || !nearPoints) return;
    updatePointCloud(farPoints, farBase, 0.55, t);
    updatePointCloud(nearPoints, nearBase, 1.0, t);
    farPoints.rotation.y = t * 0.02;
    farPoints.position.y = -state.sp * 0.25;
    nearPoints.rotation.z = t * 0.01;
    nearPoints.position.y = -state.sp * 0.55;
  }

  // ── SCENE STATE APPLICATION ─────────────────────────
  function applySceneState() {
    const breathe = 1 + Math.sin(state.time * 0.6) * 0.012;
    // Subtle scale change based on Z depth for cinematic depth perception
    const depthScale = 1 + state.z * 0.18;
    const scale = state.s * SIZE_SCALE * breathe * depthScale;
    rakhiGroup.position.set(
      (state.x - 0.5) * 2 * hw,
      (0.5 - state.y) * 2 * hh,
      state.z
    );
    rakhiGroup.rotation.y = state.rotY * ROT_SCALE;
    rakhiGroup.rotation.x = state.rotX * ROT_SCALE;
    rakhiGroup.rotation.z = state.rotZ * ROT_SCALE;
    rakhiGroup.scale.setScalar(scale);
    if (glowSprite) glowSprite.material.opacity = 0.30 * state.glow;
    if (warmSprite) warmSprite.material.opacity = 0.14 * state.glow;
    if (rakhiLight) rakhiLight.intensity = 1.6 * state.glow;
    if (fillLight)  fillLight.intensity = 5.5 + state.warm * 4;
  }

  // ── ANIMATION LOOP ──────────────────────────────────
  function animate() {
    animFrameId = requestAnimationFrame(animate);
    let dt = clock ? clock.getDelta() : 0.016;
    if (!dt || dt <= 0.0001 || isNaN(dt)) dt = 0.016;
    dt = Math.min(dt, 0.05);
    state.time += dt;
    frame++;

    // Speed-adaptive smoothing: slow scroll = slow drift, fast scroll = quick
    // catch-up, so the Rakhi follows the user instead of fighting the scroll.
    const speed = Math.min(Math.abs(state.spT - state.sp) / dt, 9);
    const k = 1 - Math.exp(-dt * (5.5 + speed * 2.2));
    const rotK = 1 - Math.exp(-dt * 4);

    state.sp += (state.spT - state.sp) * k;

    // Continuous S-curve position (right → left → right → centre)
    const pth = sampleSPath(state.sp);
    state.x += (pth.x - state.x) * k;
    state.y += (pth.y - state.y) * k;
    state.z += (pth.z - state.z) * k;

    // Section choreography for scale / glow / warmth stays untouched
    const kf = sampleKeyframes(state.sp);
    state.s += (kf.s - state.s) * k;
    state.glow += (kf.glow - state.glow) * k;
    state.warm += (kf.warm - state.warm) * k;

    // Orientation follows the travel direction — cinematic banking with visible roll
    const dir = sampleSPathDeriv(state.sp);
    // Y rotation: turns toward movement direction + subtle idle rotation
    const rotTarget = state.sp * 0.6 + mouse.x * 0.12
                    + Math.sin(state.time * 0.4) * 0.03
                    + dir.vx * 0.35;
    state.rotY += (rotTarget - state.rotY) * rotK;
    // X rotation: tilts with vertical path movement
    const rotXTarget = Math.sin(state.sp * Math.PI * 2.5) * 0.12
                     + mouse.y * 0.08
                     - dir.vy * 0.45 * PATH_DEV
                     + dir.vz * 0.15;
    state.rotX += (rotXTarget - state.rotX) * rotK;
    // Z rotation: banking/roll — the key cinematic rotation
    // Rolls into turns like an aircraft, follows the curve direction
    const bankAmount = (-dir.vx * 0.28 + dir.vy * 0.22) * PATH_DEV;
    const rotZTarget = bankAmount + Math.sin(state.time * 0.25) * 0.015;
    state.rotZ += (rotZTarget - state.rotZ) * rotK;

    updateThreads(dt, speed, dir);

    applySceneState();
    buildThreads(false);
    updateParticles(state.time);

    camera.position.x = mouse.x * -0.18;
    camera.position.y = mouse.y * -0.14;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  // ── THREAD DYNAMICS ────────────────────────────────
  // Physics-inspired: threads lag behind the Rakhi, bend naturally, stretch,
  // catch up with a soft whip; a living sway remains once the Rakhi settles.
  function updateThreads(dt, speed, dir) {
    // Drag: lateral lag based on horizontal velocity
    const dragT = Math.max(-1, Math.min(1, dir.vx * (0.45 + 0.85 * Math.min(1, speed * 0.35))));
    const dk = 1 - Math.exp(-dt * 2.8);
    thread.drag += (dragT - thread.drag) * dk;

    // Stretch: longitudinal tension based on speed changes
    const stretchT = Math.max(0, Math.min(0.6, speed * 0.15 + Math.abs(dir.vx) * 0.25));
    const stretchK = 1 - Math.exp(-dt * 1.8);
    thread.stretch += (stretchT - thread.stretch) * stretchK;

    // Sway amplitude: calm at start/end, lively in middle, responds to speed
    const calm = 0.4 + 0.6 * Math.cos(state.sp * Math.PI);
    const swayT = 0.055 + 0.11 * calm + speed * 0.035;
    thread.swayAmp += (swayT - thread.swayAmp) * dk;

    // Wave phase advances with subtle variation
    thread.wavePhase += dt * (1.1 + Math.min(1.2, speed * 0.9) * 1.6);
    thread.swayP += dt * (0.95 + Math.min(1, speed * 0.85) * 1.5);

    // Whip: snap-back from acceleration changes (follow-through)
    const accel = (thread.drag - thread.prevDrag) / Math.max(dt, 1e-4);
    const whipT = Math.max(-1, Math.min(1, accel * 0.28));
    thread.whip += (whipT - thread.whip) * (1 - Math.exp(-dt * 6));
    thread.prevDrag = thread.drag;
  }

  function renderStatic() {
    if (!renderer || !rakhiGroup) return;
    state.sp = state.spT;
    const pth = sampleSPath(state.sp);
    state.x = pth.x; state.y = pth.y; state.z = pth.z;
    const kf = sampleKeyframes(state.sp);
    state.s = kf.s; state.glow = kf.glow; state.warm = kf.warm;
    const dir = sampleSPathDeriv(state.sp);
    state.rotY = state.sp * 0.6 + dir.vx * 0.35;
    state.rotX = Math.sin(state.sp * Math.PI * 2.5) * 0.12 - dir.vy * 0.45 * PATH_DEV + dir.vz * 0.15;
    state.rotZ = (-dir.vx * 0.28 + dir.vy * 0.22) * PATH_DEV;
    applySceneState();
    if (farPoints)  { farPoints.position.y = -state.sp * 0.25;  nearPoints.position.y = -state.sp * 0.55; }
    buildThreads(true);
    renderer.render(scene, camera);
  }

  // ── EVENTS ──────────────────────────────────────────
  function onScroll() {
    const scrollTop = window.scrollY || window.pageYOffset;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    state.spT = docH > 0 ? Math.max(0, Math.min(1, scrollTop / docH)) : 0;
    if (prefersReducedMotion) renderStatic();
  }

  function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * -2;
  }

  function onTouchMove(e) {
    if (!e.touches.length) return;
    const t = e.touches[0];
    mouse.x = (t.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (t.clientY / window.innerHeight - 0.5) * -2;
  }

  let resizeTimer = null;
  function scheduleSectionRecompute() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { computeSectionCenters(); }, 200);
  }

  function onResize() {
    if (!renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    hh = Math.tan((FOV * Math.PI) / 360) * CAM_Z;
    hw = hh * (w / h);
    buildThreads(true);
    scheduleSectionRecompute();
  }

  function onContextLost(e) {
    e.preventDefault();
    pause();
  }

  function onContextRestored() {
    if (prefersReducedMotion) {
      renderStatic();
    } else {
      resume();
    }
  }

  // ── INIT ────────────────────────────────────────────
  function init() {
    if (initialized) return;
    initialized = true;

    if (typeof THREE === 'undefined' || !checkWebGL()) {
      showFallback();
      return;
    }

    const canvas = document.getElementById('rakhi-canvas');
    if (!canvas) { showFallback(); return; }

    try {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0, CAM_Z);

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isPhone,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(DPR);
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;

      // Lights
      scene.add(new THREE.AmbientLight(0xffeedd, 0.55));
      const key = new THREE.PointLight(0xf5c842, 30, 0, 2);
      key.position.set(2.4, 2.6, 3.4);
      scene.add(key);
      fillLight = new THREE.PointLight(0x7d2333, 7, 0, 2);
      fillLight.position.set(-2.6, -1.8, 2.6);
      scene.add(fillLight);
      const rim = new THREE.DirectionalLight(0xffe8d0, 1.15);
      rim.position.set(0, 3.4, -2.6);
      scene.add(rim);

      // Procedural environment map for believable metal reflections
      if (USE_ENV_MAP) {
        try {
          const envTex = makeEnvTexture();
          const pmrem = new THREE.PMREMGenerator(renderer);
          scene.environment = pmrem.fromEquirectangular(envTex).texture;
          pmrem.dispose();
          envTex.dispose();
        } catch (e) {
          console.warn('[RBScene3D] Env map failed — continuing without it', e);
        }
      }

      buildRakhi();

      // Particle depth layers
      const farCount = Math.ceil(PARTICLE_COUNT * 0.45);
      const far = makeParticles(farCount, 2.6, 5.0, -2.4, 0.3, 0.030, 0.40);
      farPoints = far.points; farBase = far.base;
      const near = makeParticles(PARTICLE_COUNT - farCount, 2.1, 3.8, 0.3, 1.6, 0.05, 0.5);
      nearPoints = near.points; nearBase = near.base;

      computeSectionCenters();

      clock = new THREE.Clock();
      isActive = true;

      window.addEventListener('resize', onResize, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      canvas.addEventListener('webglcontextlost', onContextLost, false);
      canvas.addEventListener('webglcontextrestored', onContextRestored, false);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(computeSectionCenters).catch(() => {});
      }
      window.addEventListener('load', () => {
        setTimeout(computeSectionCenters, 100);
      });

      onResize();

      if (prefersReducedMotion) {
        renderStatic();
      } else {
        animate();
      }
    } catch (e) {
      console.warn('[RBScene3D] Init error — showing fallback', e);
      showFallback();
    }
  }

  // ── CONTROL ─────────────────────────────────────────
  function pause() {
    isActive = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  function resume() {
    if (isActive || !renderer) return;
    isActive = true;
    if (prefersReducedMotion) { renderStatic(); return; }
    clock.getDelta();
    animate();
  }

  function destroy() {
    pause();
    if (renderer) { renderer.dispose(); renderer = null; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onScroll);
  }

  // ── FALLBACK (WebGL unavailable) ────────────────────
  function showFallback() {
    const canvas   = document.getElementById('rakhi-canvas');
    const fallback = document.getElementById('rakhi-fallback');
    if (canvas)   canvas.style.display   = 'none';
    if (!fallback) return;
    fallback.classList.add('is-active');
    const updateFallback = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const sp = docH > 0 ? clamp01((window.scrollY || 0) / docH) : 0;
      const p = sampleSPath(sp);
      const d = sampleSPathDeriv(sp);
      fallback.style.setProperty('--rakhi-x', (p.x * 100).toFixed(3) + '%');
      fallback.style.setProperty('--rakhi-y', (p.y * 100).toFixed(3) + '%');
      fallback.style.setProperty('--rakhi-roll', (d.vx * -8 + d.vy * 5).toFixed(2) + 'deg');
    };
    updateFallback();
    window.addEventListener('scroll', updateFallback, { passive: true });
    window.addEventListener('resize', updateFallback, { passive: true });
  }

  // ── PUBLIC API ──────────────────────────────────────
  const api = { init, pause, resume, destroy };

  // Pure path math — always available so the 2D cinematic layer mirrors the
  // same S-curve, even when WebGL is unavailable.
  api.getPathPoint = function (sp) {
    return sampleSPath(Math.max(0, Math.min(1, sp || 0)));
  };

  // Only expose scene state sync when a live 3D scene is possible;
  // otherwise the 2D cinematic layer keeps its own choreography.
  if (typeof THREE !== 'undefined' && checkWebGL() && document.getElementById('rakhi-canvas')) {
    api.getScreenPos = function () {
      return { x: state.x, y: state.y, scale: state.s, glow: state.glow };
    };
  }

  return api;

})();
