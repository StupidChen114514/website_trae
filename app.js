/* ============================================================
   FLUX® — motion engine
   Vanilla. No dependencies. One ticker, many little worlds.
   ============================================================ */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOUCH = window.matchMedia('(pointer: coarse)').matches;

  /* ------------------------------------------------------------
     global ticker
  ------------------------------------------------------------ */
  const tasks = new Set();
  let last = performance.now();
  function addTask(fn) { tasks.add(fn); }
  function loop(now) {
    const dt = Math.min(64, now - last);
    last = now;
    const t = now / 1000;
    tasks.forEach(fn => fn(t, dt));
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ------------------------------------------------------------
     clock — Shanghai
  ------------------------------------------------------------ */
  const clockFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai', hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const clockEls = [$('#clock'), $('#clock2')].filter(Boolean);
  function tickClock() {
    const s = clockFmt.format(new Date());
    clockEls.forEach(el => { el.textContent = s; });
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ------------------------------------------------------------
     loader
  ------------------------------------------------------------ */
  const loader = $('#loader');
  const loadNum = $('#loadNum');
  const loadBar = $('#loadBar');
  const loadWord = $('#loadWord');
  const words = ['CALIBRATING MOTION', 'TUNING CURVES', 'WARMING FRAMES', 'COMPOSING'];
  let loadStarted = false;

  function startLoad() {
    if (loadStarted) return;
    loadStarted = true;
    const t0 = performance.now();
    const dur = RM ? 300 : 1750;
    function step(now) {
      const p = clamp((now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      loadNum.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      loadBar.style.transform = `scaleX(${eased})`;
      loadWord.textContent = words[Math.min(words.length - 1, Math.floor(eased * words.length))];
      if (p < 1) requestAnimationFrame(step);
      else finishLoad();
    }
    requestAnimationFrame(step);
  }

  function finishLoad() {
    loadNum.textContent = '100';
    loadBar.style.transform = 'scaleX(1)';
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    loader.classList.add('is-done');
    setTimeout(() => { loader.style.display = 'none'; }, 1100);
    // layout depends on webfonts
    measureWork();
    measureLab();
    updateScrollBar();
  }

  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]).then(startLoad);
  } else {
    setTimeout(startLoad, 300);
  }
  setTimeout(startLoad, 2600); // hard fallback

  /* ------------------------------------------------------------
     menu
  ------------------------------------------------------------ */
  const menu = $('#menu');
  const menuBtn = $('#menuBtn');
  const menuLabel = menuBtn.querySelector('.menu-btn__label');
  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    menuLabel.textContent = open ? 'CLOSE' : 'MENU';
  }
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  $$('.menu-nav a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      setMenu(false);
      if (target) setTimeout(() => target.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }), 380);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
  });

  /* ------------------------------------------------------------
     custom cursor
  ------------------------------------------------------------ */
  if (!TOUCH) {
    document.documentElement.classList.add('has-cursor');
    const dot = $('#cursorDot');
    const ring = $('#cursorRing');
    const ringLabel = $('#cursorLabel');
    let mx = innerWidth / 2, my = innerHeight / 2;
    let dx = mx, dy = my, rx = mx, ry = my;
    let visible = false;
    let mode = '';

    window.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (!visible) {
        visible = true;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
        dx = rx = mx; dy = ry = my;
      }
      const hit = e.target.closest('a, button, [data-cursor], .lab-stage');
      const label = hit ? (hit.getAttribute('data-cursor') || '') : '';
      if (label !== mode) {
        mode = label;
        if (label) {
          ringLabel.textContent = label;
          ring.classList.add('is-label');
        } else {
          ring.classList.remove('is-label');
        }
      }
    }, { passive: true });

    window.addEventListener('pointerdown', () => ring.classList.add('is-down'));
    window.addEventListener('pointerup', () => ring.classList.remove('is-down'));
    document.addEventListener('pointerleave', () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
      visible = false;
    });

    addTask(() => {
      dx = lerp(dx, mx, 0.42);
      dy = lerp(dy, my, 0.42);
      rx = lerp(rx, mx, 0.16);
      ry = lerp(ry, my, 0.16);
      dot.style.transform = `translate3d(${dx}px,${dy}px,0) translate(-50%,-50%)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
    });
  }

  /* ------------------------------------------------------------
     hero — WebGL ink
  ------------------------------------------------------------ */
  function initHeroGL() {
    const canvas = $('#heroCanvas');
    const hero = $('.hero');
    if (!canvas || !hero) return;
    let gl = null;
    try {
      gl = canvas.getContext('webgl', {
        alpha: false, antialias: false, depth: false, stencil: false,
        powerPreference: 'high-performance'
      }) || canvas.getContext('experimental-webgl');
    } catch (e) { /* noop */ }
    if (!gl) { document.body.classList.add('no-webgl'); return; }

    const vsSrc = 'attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}';
    const fsSrc = `
      precision highp float;
      uniform vec2 uRes;
      uniform float uTime;
      uniform vec2 uMouse;
      varying vec2 vUv;

      vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
      float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      float fbm(vec2 p){
        float v = 0.0;
        float a = 0.5;
        for(int i = 0; i < 4; i++){
          v += a * snoise(p);
          p = p * 2.03 + vec2(17.0, 9.0);
          a *= 0.5;
        }
        return v;
      }

      void main(){
        vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
        float t = uTime * 0.05;

        vec2 p = uv * 1.55;

        // pointer vortex
        vec2 dm = uv - uMouse;
        float dist = length(dm);
        float sw = exp(-dist * 2.3) * 1.35;
        float ang = atan(dm.y, dm.x);
        p += vec2(cos(ang + sw), sin(ang + sw)) * sw * 0.6;

        // domain warping
        vec2 q = vec2(
          fbm(p + vec2(0.0, t * 1.2)),
          fbm(p + vec2(5.2, 1.3) - t * 0.85)
        );
        vec2 r = vec2(
          fbm(p + 1.7 * q + vec2(1.7, 9.2) + t * 1.4),
          fbm(p + 1.7 * q + vec2(8.3, 2.8) - t)
        );
        float v = fbm(p + 2.1 * r + vec2(0.0, t * 0.6));
        v = 0.5 + 0.6 * v;

        vec3 ink   = vec3(0.021, 0.020, 0.022);
        vec3 blue  = vec3(0.085, 0.075, 0.92);
        vec3 flare = vec3(1.0, 0.235, 0.035);
        vec3 lime  = vec3(0.80, 1.0, 0.20);
        vec3 lilac = vec3(0.67, 0.57, 1.0);

        vec3 col = ink;
        col += blue  * smoothstep(0.38, 0.80, v) * 0.95;
        col += flare * smoothstep(0.50, 0.88, v) * 0.78;
        col += lime  * smoothstep(0.68, 0.97, v) * 0.82;
        col += lilac * smoothstep(0.80, 1.0, v) * 0.5;

        // silky marbling
        float marb = fbm(p * 4.2 + r * 2.6 + vec2(t * 2.0, -t * 1.5));
        col *= 0.78 + 0.34 * marb;

        // depth
        col *= 1.0 - 0.42 * smoothstep(0.15, 1.05, length(uv * vec2(0.82, 1.0)));

        // pointer light
        col += vec3(0.9, 0.88, 0.78) * exp(-dist * 6.5) * 0.10;

        // tone map
        col = 1.0 - exp(-col * 1.6);
        col = pow(col, vec3(1.25));

        // grain
        float g = fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 63.0, vec2(12.9898, 78.233))) * 43758.5453);
        col += (g - 0.5) * 0.055;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function compile(type, src) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }

    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) { document.body.classList.add('no-webgl'); return; }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      document.body.classList.add('no-webgl');
      return;
    }
    gl.useProgram(prog);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uMouse = gl.getUniformLocation(prog, 'uMouse');

    let W = 1, H = 1, aspect = 1;
    function resize() {
      const r = canvas.getBoundingClientRect();
      const scale = window.innerWidth < 700 ? 0.8 : 0.62;
      W = Math.max(2, Math.round(r.width * scale));
      H = Math.max(2, Math.round(r.height * scale));
      canvas.width = W;
      canvas.height = H;
      gl.viewport(0, 0, W, H);
      gl.uniform2f(uRes, W, H);
      aspect = W / H;
    }
    new ResizeObserver(resize).observe(canvas);
    resize();

    const mouse = { x: 0.1, y: -0.05 };
    const target = { x: 0.1, y: -0.05 };
    let lastMove = performance.now() - 10000;
    let visible = true;

    window.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) return;
      target.x = ((e.clientX - r.left) / r.width - 0.5) * aspect;
      target.y = 0.5 - (e.clientY - r.top) / r.height;
      lastMove = performance.now();
    }, { passive: true });

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(hero);

    const t0 = performance.now();
    function frame(now, dt) {
      if (!visible) return;
      const time = (now - t0) / 1000;
      if (now - lastMove > 3200 && !RM) {
        target.x = Math.sin(time * 0.19) * 0.62 * (aspect / 2);
        target.y = Math.cos(time * 0.16) * 0.26;
      }
      const k = 1 - Math.pow(0.001, dt / 1000); // frame independent smoothing
      mouse.x = lerp(mouse.x, target.x, Math.min(1, k * 1.3));
      mouse.y = lerp(mouse.y, target.y, Math.min(1, k * 1.3));
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    if (RM) {
      gl.uniform1f(uTime, 12);
      gl.uniform2f(uMouse, 0.1, -0.05);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      addTask(frame);
    }
  }
  initHeroGL();

  /* ------------------------------------------------------------
     hero copy parallax
  ------------------------------------------------------------ */
  const heroInner = $('.hero-inner');
  if (heroInner && !RM) {
    addTask(() => {
      const y = window.scrollY;
      if (y > innerHeight * 1.1) return;
      heroInner.style.transform = `translate3d(0,${y * 0.16}px,0)`;
      heroInner.style.opacity = String(clamp(1 - y / (innerHeight * 0.78), 0, 1));
    });
  }

  /* ------------------------------------------------------------
     scroll progress + scroll-driven reveals
  ------------------------------------------------------------ */
  const scrollBar = $('#scrollBar');
  function updateScrollBar() {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollBar.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max) : 0})`;
  }
  window.addEventListener('scroll', updateScrollBar, { passive: true });
  window.addEventListener('resize', updateScrollBar);

  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        revealIO.unobserve(en.target);
      }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach(el => revealIO.observe(el));

  /* split + illuminate */
  const illumes = $$('[data-illuminate]').map(el => {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    const chars = el.dataset.split === 'chars';
    el.textContent = '';
    const parts = chars ? Array.from(text) : text.split(' ');
    parts.forEach((part, i) => {
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = part;
      el.appendChild(span);
      if (!chars && i < parts.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return { el, spans: $$('.w', el), last: -1 };
  });

  function updateIllumes() {
    const vh = innerHeight;
    illumes.forEach(o => {
      const r = o.el.getBoundingClientRect();
      if (r.top > vh * 1.05 || r.bottom < -vh * 0.05) return;
      const startY = vh * 0.88;
      const endY = vh * 0.34 - r.height * 0.2;
      const p = clamp((startY - r.top) / Math.max(1, startY - endY));
      const count = Math.round(p * o.spans.length);
      if (count !== o.last) {
        o.last = count;
        o.spans.forEach((s, i) => s.classList.toggle('on', i < count));
      }
    });
  }
  if (!RM) addTask(updateIllumes);

  /* ------------------------------------------------------------
     work — horizontal pin
  ------------------------------------------------------------ */
  const workSection = $('#work');
  const workTrack = $('#workTrack');
  const workProgress = $('#workProgress');
  const workCount = $('#workCount');
  let workMax = 0;
  let workMobile = window.matchMedia('(max-width: 900px)').matches;

  function measureWork() {
    workMobile = window.matchMedia('(max-width: 900px)').matches;
    if (workMobile) {
      workSection.style.height = '';
      workTrack.style.transform = '';
      return;
    }
    workMax = Math.max(0, workTrack.scrollWidth - document.documentElement.clientWidth);
    workSection.style.height = `${innerHeight + workMax}px`;
  }

  addTask(() => {
    if (workMobile || !workMax) return;
    const r = workSection.getBoundingClientRect();
    if (r.bottom < -80 || r.top > innerHeight + 80) return;
    const total = workSection.offsetHeight - innerHeight;
    if (total <= 0) return;
    const p = clamp(-r.top / total);
    workTrack.style.transform = `translate3d(${-p * workMax}px,0,0)`;
    workProgress.style.transform = `scaleX(${p})`;
    const idx = Math.min(4, Math.max(1, Math.round(p * 3) + 1));
    workCount.textContent = `${String(idx).padStart(2, '0')} / 04`;
  });

  workTrack.addEventListener('scroll', () => {
    if (!workMobile) return;
    const max = workTrack.scrollWidth - workTrack.clientWidth;
    const p = max > 0 ? clamp(workTrack.scrollLeft / max) : 0;
    workProgress.style.transform = `scaleX(${p})`;
    const card = workTrack.children[0];
    if (!card) return;
    const stepW = card.getBoundingClientRect().width + 14;
    const idx = Math.min(4, Math.max(1, Math.round(workTrack.scrollLeft / stepW) + 1));
    workCount.textContent = `${String(idx).padStart(2, '0')} / 04`;
  }, { passive: true });

  /* ------------------------------------------------------------
     generative studies
  ------------------------------------------------------------ */
  function drawWave(ctx, w, h, t) {
    ctx.fillStyle = '#141412';
    ctx.fillRect(0, 0, w, h);
    const cols = Math.max(20, Math.round(w / 26));
    const rows = Math.max(11, Math.round(h / 26));
    const padX = w * 0.07, padY = h * 0.13;
    const gw = w - padX * 2, gh = h - padY * 2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const nx = x / (cols - 1), ny = y / (rows - 1);
        const v = Math.sin(nx * 9 + t * 1.3) * Math.cos(ny * 6 - t * 0.9)
          + Math.sin((nx + ny) * 7 - t * 1.1) * 0.62;
        const a = clamp((v + 1.6) / 3.2);
        const px = padX + nx * gw;
        const py = padY + ny * gh + v * 7;
        const r = 0.6 + a * 2.7;
        if (a > 0.82) ctx.fillStyle = `rgba(255,74,23,${0.3 + a * 0.55})`;
        else ctx.fillStyle = `rgba(216,255,62,${0.1 + a * 0.8})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, 6.2832);
        ctx.fill();
      }
    }
    const sy = padY + ((t * 0.08) % 1) * gh;
    const grad = ctx.createLinearGradient(0, sy - 34, 0, sy + 34);
    grad.addColorStop(0, 'rgba(216,255,62,0)');
    grad.addColorStop(0.5, 'rgba(216,255,62,0.10)');
    grad.addColorStop(1, 'rgba(216,255,62,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, sy - 34, w, 68);
  }

  function drawMoire(ctx, w, h, t) {
    ctx.fillStyle = '#C9B9FF';
    ctx.fillRect(0, 0, w, h);
    const d = Math.min(w, h);
    const sets = [
      { x: w * (0.5 + 0.13 * Math.sin(t * 0.35)), y: h * (0.5 + 0.1 * Math.cos(t * 0.28)), c: 'rgba(12,12,11,0.5)' },
      { x: w * (0.5 + 0.11 * Math.cos(t * 0.22 + 1)), y: h * (0.5 + 0.13 * Math.sin(t * 0.31 + 2)), c: 'rgba(12,12,11,0.38)' },
      { x: w * (0.5 + 0.16 * Math.sin(t * 0.17 + 3)), y: h * (0.5 + 0.07 * Math.sin(t * 0.4 + 1)), c: 'rgba(255,74,23,0.42)' }
    ];
    sets.forEach(s => {
      ctx.strokeStyle = s.c;
      ctx.lineWidth = 1;
      for (let r = 4; r < d * 0.78; r += 6) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, 6.2832);
        ctx.stroke();
      }
    });
    ctx.fillStyle = '#0C0C0B';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, 4.5, 0, 6.2832);
    ctx.fill();
  }

  function drawSolaris(ctx, w, h, t) {
    ctx.fillStyle = '#FF4A17';
    ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5;
    const cy = h * 0.44 + Math.sin(t * 0.5) * h * 0.012;
    const r = Math.min(w, h) * 0.29;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.1);
    ctx.strokeStyle = 'rgba(12,12,11,0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.5, 0, 6.2832);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#0C0C0B';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 6.2832);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 6.2832);
    ctx.clip();
    ctx.fillStyle = '#D8FF3E';
    ctx.fillRect(cx - r, cy + r * 0.7 + Math.sin(t * 0.4) * 6, r * 2, r * 0.4);
    ctx.restore();

    const hy = h * 0.8;
    ctx.fillStyle = '#EFEAE0';
    ctx.fillRect(0, hy, w, h - hy);

    const size = Math.max(30, w * 0.145);
    ctx.fillStyle = '#0C0C0B';
    ctx.font = `800 ${size}px Syne, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${size * 0.02}px`;
    ctx.fillText('SOLARIS', cx, hy + (h - hy) * 0.54);

    ctx.fillStyle = 'rgba(12,12,11,0.6)';
    ctx.font = '9px "JetBrains Mono", monospace';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('A SUN THAT SETS IN TYPE', w * 0.055, h * 0.075);
    ctx.textAlign = 'right';
    ctx.fillText('TITLE SEQUENCE / 2024', w * 0.945, h * 0.075);
  }

  const flowPalettes = [
    'rgba(12,12,11,0.55)',
    'rgba(12,12,11,0.42)',
    'rgba(37,37,232,0.5)',
    'rgba(12,12,11,0.6)',
    'rgba(255,74,23,0.42)',
    'rgba(216,255,62,0.85)'
  ];

  function makeParticle(w, h, fresh) {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      px: Math.random() * w,
      py: Math.random() * h,
      life: fresh ? Math.floor(rand(0, 500)) : 0,
      max: Math.floor(rand(260, 760)),
      c: Math.random() < 0.08 ? flowPalettes[5] : flowPalettes[Math.floor(Math.random() * 5)]
    };
  }

  function drawFlow(ctx, w, h, t, dt, study) {
    if (!study.flow || study.flow.w !== w || study.flow.h !== h) {
      study.flow = { w, h, ps: [] };
      ctx.fillStyle = '#EFEAE0';
      ctx.fillRect(0, 0, w, h);
      const count = Math.min(1000, Math.round((w * h) / 750));
      for (let i = 0; i < count; i++) study.flow.ps.push(makeParticle(w, h, true));
    }
    const st = study.flow;
    ctx.fillStyle = 'rgba(239,234,224,0.06)';
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    for (let i = 0; i < st.ps.length; i++) {
      const p = st.ps[i];
      const ang = Math.sin(p.x * 0.0065 + t * 0.45) * Math.cos(p.y * 0.0085 - t * 0.32) * 2.3
        + Math.sin((p.x + p.y) * 0.0035 + t * 0.7) * 1.1;
      const sp = 1.5 + Math.sin(p.x * 0.002 + p.y * 0.003 + t) * 0.6;
      p.px = p.x; p.py = p.y;
      p.x += Math.cos(ang) * sp;
      p.y += Math.sin(ang) * sp;
      p.life++;
      if (p.life > p.max || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
        const np = makeParticle(w, h, false);
        st.ps[i] = np;
        continue;
      }
      ctx.strokeStyle = p.c;
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }

  const painters = { wave: drawWave, moire: drawMoire, solaris: drawSolaris, flow: drawFlow };

  class Study {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.painter = painters[canvas.dataset.study];
      this.t = 0;
      this.visible = false;
      this.w = 0;
      this.h = 0;
      if (!this.painter) return;
      new ResizeObserver(() => this.resize()).observe(canvas);
      this.resize();
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }, { threshold: 0.02 }).observe(canvas);
      addTask((t, dt) => this.tick(dt));
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = r.width;
      this.h = r.height;
      this.canvas.width = Math.round(r.width * dpr);
      this.canvas.height = Math.round(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.clearRect(0, 0, this.w, this.h);
      this.t = 0;
      this.painter(this.ctx, this.w, this.h, 0, 0, this);
    }
    tick(dt) {
      if (!this.visible || RM) return;
      this.t += dt / 1000;
      this.painter(this.ctx, this.w, this.h, this.t, dt / 1000, this);
    }
  }
  $$('canvas[data-study]').forEach(c => new Study(c));

  /* ------------------------------------------------------------
     lab — letter physics
  ------------------------------------------------------------ */
  const labStage = $('#labStage');
  const labWord = $('#labWord');
  const labField = $('#labField');
  const letters = $$('.lab-letter, .lab-dot', labWord);
  const fpsEl = $('#fps');
  let labVisible = false;
  let labRadius = 220;
  const pointer = { x: -99999, y: -99999, active: false };
  let frames = 0;
  let fpsLast = performance.now();

  function measureLab() {
    if (!labStage || !labWord) return;
    letters.forEach(el => {
      el._x = 0; el._y = 0; el._vx = 0; el._vy = 0;
      el.style.transform = 'none';
    });
    // force synchronous measurement once
    void labWord.offsetWidth;
    const sx = window.scrollX, sy = window.scrollY;
    letters.forEach(el => {
      const r = el.getBoundingClientRect();
      el._bx = r.left + sx + r.width / 2;
      el._by = r.top + sy + r.height / 2;
    });
    labRadius = clamp(innerWidth * 0.17, 100, 250);
  }

  if (labStage) {
    new IntersectionObserver(([e]) => { labVisible = e.isIntersecting; }, { threshold: 0.1 }).observe(labStage);

    labStage.addEventListener('pointermove', (e) => {
      const r = labStage.getBoundingClientRect();
      pointer.x = e.clientX + window.scrollX;
      pointer.y = e.clientY + window.scrollY;
      pointer.active = true;
      labStage.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      labStage.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    }, { passive: true });
    labStage.addEventListener('pointerleave', () => { pointer.active = false; });

    function scatter(ox, oy) {
      letters.forEach(el => {
        let ang;
        if (ox != null) ang = Math.atan2(el._by - oy, el._bx - ox);
        else ang = rand(0, Math.PI * 2);
        const power = rand(16, 40);
        el._vx = (el._vx || 0) + Math.cos(ang) * power;
        el._vy = (el._vy || 0) + Math.sin(ang) * power - 5;
      });
    }

    $('#scatterBtn').addEventListener('click', () => scatter());
    labStage.addEventListener('click', (e) => {
      scatter(e.clientX + window.scrollX, e.clientY + window.scrollY);
    });

    addTask((t, dt) => {
      if (!labVisible || RM) return;
      const k = Math.min(2.4, dt / 16.667);
      const px = pointer.active ? pointer.x : -99999;
      const py = pointer.active ? pointer.y : -99999;
      for (let i = 0; i < letters.length; i++) {
        const el = letters[i];
        let x = el._x || 0, y = el._y || 0, vx = el._vx || 0, vy = el._vy || 0;
        const bx = el._bx || 0, by = el._by || 0;
        const cx = bx + x, cy = by + y;
        const dx = cx - px, dy = cy - py;
        const dist = Math.hypot(dx, dy) || 1;
        let hot = false;
        if (dist < labRadius) {
          const f = 1 - dist / labRadius;
          const force = f * f * 38;
          vx += (dx / dist) * force * k;
          vy += (dy / dist) * force * k;
          hot = f > 0.34;
        }
        const idle = Math.sin(t * 1.3 + i * 0.8) * 2.5;
        vx += (0 - x) * 0.075 * k;
        vy += (idle - y) * 0.075 * k;
        vx *= Math.pow(0.865, k);
        vy *= Math.pow(0.865, k);
        x += vx * k;
        y += vy * k;
        el._x = x; el._y = y; el._vx = vx; el._vy = vy;
        const rot = clamp(x * 0.05 + vx * 0.45, -26, 26);
        const sc = 1 + Math.min(Math.abs(y) * 0.0013, 0.09);
        el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        if (hot !== el._hot) { el.classList.toggle('is-hot', hot); el._hot = hot; }
      }
      frames++;
      const now = performance.now();
      if (now - fpsLast > 600) {
        fpsEl.textContent = String(Math.round(frames / ((now - fpsLast) / 1000)));
        frames = 0;
        fpsLast = now;
      }
    });
  }

  /* ------------------------------------------------------------
     services preview disc
  ------------------------------------------------------------ */
  const serviceList = $('#serviceList');
  const preview = $('#servicePreview');
  const previewDisc = $('#previewDisc');
  const previewLabel = $('#previewLabel');

  if (serviceList && preview && !TOUCH) {
    let px = innerWidth / 2, py = innerHeight / 2, tx = px, ty = py;
    $$('.service', serviceList).forEach(row => {
      row.addEventListener('mouseenter', () => {
        const c = row.style.getPropertyValue('--c') || '#D8FF3E';
        previewDisc.style.setProperty('--c', c);
        previewLabel.textContent = row.dataset.label || '';
        preview.classList.add('is-on');
      });
      row.addEventListener('mouseleave', () => preview.classList.remove('is-on'));
    });
    window.addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
    }, { passive: true });
    addTask(() => {
      px = lerp(px, tx, 0.16);
      py = lerp(py, ty, 0.16);
      preview.style.transform = `translate3d(${px}px,${py}px,0)`;
    });
  }

  /* ------------------------------------------------------------
     stats counters
  ------------------------------------------------------------ */
  const counters = $$('[data-count]');
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      countIO.unobserve(en.target);
      animateCount(en.target);
    });
  }, { threshold: 0.6 });
  counters.forEach(el => countIO.observe(el));

  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10);
    const pad = parseInt(el.dataset.pad || '0', 10);
    const t0 = performance.now();
    const dur = RM ? 1 : 1500;
    function step(now) {
      const p = clamp((now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      const v = Math.round(target * eased);
      el.textContent = pad ? String(v).padStart(pad, '0') : String(v);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------
     misc
  ------------------------------------------------------------ */
  const copyBtn = $('#copyMail');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const mail = 'hello@flux.studio';
      try {
        await navigator.clipboard.writeText(mail);
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = mail;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (err) { /* noop */ }
        ta.remove();
      }
      copyBtn.textContent = 'COPIED ✓';
      copyBtn.classList.add('is-copied');
      setTimeout(() => {
        copyBtn.textContent = 'COPY EMAIL';
        copyBtn.classList.remove('is-copied');
      }, 1800);
    });
  }

  const toTop = $('#toTop');
  if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }));

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      measureWork();
      measureLab();
      updateScrollBar();
    }, 150);
  });
  window.addEventListener('load', () => {
    measureWork();
    measureLab();
    updateScrollBar();
  });

  console.log('%c FLUX® ', 'background:#D8FF3E;color:#0C0C0B;font-weight:bold;padding:4px 8px;', 'Motion, with a pulse. — hello@flux.studio');
})();
