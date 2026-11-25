/* ============================================================
   YUAN® — motion portfolio
   Vanilla JS. No frameworks. Everything on purpose.
   ============================================================ */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const root = document.documentElement;

  let motionOn = !prefersReduced;
  root.classList.toggle('motion-off', !motionOn);

  /* ----------------------------------------------------------
     Clock — Shanghai time
     ---------------------------------------------------------- */
  const clockFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const clockEls = [$('#navClock'), $('#footClock')].filter(Boolean);
  const paintClock = () => {
    const t = 'SH ' + clockFmt.format(new Date());
    clockEls.forEach((el) => { el.textContent = t; });
  };
  paintClock();
  setInterval(paintClock, 1000);

  /* ----------------------------------------------------------
     Loader
     ---------------------------------------------------------- */
  const loader = $('#loader');
  const loadCount = $('#loadCount');
  const loadBar = $('#loadBar');
  const loaderStart = performance.now();
  const loaderDuration = prefersReduced ? 260 : 1700;
  let loaderDone = false;

  document.body.classList.add('is-locked');

  /* ----------------------------------------------------------
     Canvas scenes
     ---------------------------------------------------------- */
  const scenes = [];

  const sceneObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const scene = entry.target.__scene;
      if (!scene) return;
      scene.visible = entry.isIntersecting;
      if (entry.isIntersecting) {
        scene.resize();
        scene.draw(performance.now());
      }
    });
  }, { rootMargin: '15% 0px', threshold: 0 });

  function registerScene(canvas, factory, options = {}) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const maxDpr = options.maxDpr ?? 1.5;
    const api = { canvas, ctx, w: 1, h: 1, dpr: 1, visible: false, draw: null };

    api.resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      if (w === api.w && h === api.h && dpr === api.dpr) return;
      api.w = w; api.h = h; api.dpr = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    api.draw = factory(api);
    api.resize();
    try { api.draw(performance.now()); } catch (err) { console.warn(err); }

    canvas.__scene = api;
    scenes.push(api);
    sceneObserver.observe(canvas);

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => {
        api.resize();
        if (!motionOn || !api.visible) api.draw(performance.now());
      });
      ro.observe(canvas);
    }

    return api;
  }

  /* ---------- scene 01 · chroma ---------- */
  function sceneChroma(api) {
    const { ctx } = api;
    const blobs = [
      { color: '#D7FF3F', ax: .30, ay: .22, sx: .55, sy: .42, ph: 0.0, r: .62 },
      { color: '#FF4A1C', ax: .26, ay: .28, sx: .72, sy: .36, ph: 2.1, r: .56 },
      { color: '#8FE8FF', ax: .32, ay: .20, sx: .46, sy: .60, ph: 4.2, r: .58 },
      { color: '#7C5CFF', ax: .18, ay: .32, sx: .80, sy: .50, ph: 1.2, r: .50 },
    ];
    return (now) => {
      const t = now * 0.001;
      const { w, h } = api;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#0A0908';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'screen';
      blobs.forEach((b, i) => {
        const x = w * (.5 + b.ax * Math.sin(t * b.sx + b.ph));
        const y = h * (.5 + b.ay * Math.cos(t * b.sy + b.ph * 1.4));
        const r = Math.min(w, h) * b.r * (1 + .12 * Math.sin(t * .8 + i * 1.7));
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, b.color + 'cc');
        grad.addColorStop(.55, b.color + '33');
        grad.addColorStop(1, b.color + '00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .25, w / 2, h / 2, Math.max(w, h) * .78);
      vig.addColorStop(0, 'rgba(10,9,8,0)');
      vig.addColorStop(1, 'rgba(10,9,8,.55)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    };
  }

  /* ---------- scene 02 · type tunnel ---------- */
  function sceneTunnel(api) {
    const { ctx } = api;
    const words = ['TYPE', 'MOVES', 'TYPE', 'BREATHES'];
    return (now) => {
      const { w, h } = api;
      const t = now * 0.001;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0A0908';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      const N = 22;
      const phase = (t * 0.085) % 1;
      for (let i = N; i >= 1; i--) {
        const p = ((i / N) + phase) % 1;
        const scale = 0.06 + Math.pow(p, 2.5) * 3.4;
        const alpha = Math.min(1, p * 1.7) * .55;
        ctx.save();
        ctx.rotate(Math.sin(p * 4.0 + t * .35) * .07);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = i % 3 === 0 ? '#D7FF3F' : '#F1ECE3';
        ctx.font = '800 92px "Bricolage Grotesque", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(words[i % words.length], 0, 0);
        ctx.restore();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    };
  }

  /* ---------- scene 03 · moiré ---------- */
  function sceneMoire(api) {
    const { ctx } = api;
    const drawField = (angle, color, count) => {
      const { w, h } = api;
      const span = Math.max(w, h) * 1.5;
      const gap = span / count;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      for (let i = -count / 2; i < count / 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gap, -span);
        ctx.lineTo(i * gap, span);
        ctx.stroke();
      }
      ctx.restore();
    };
    return (now) => {
      const { w, h } = api;
      const t = now * 0.001;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#0A0908';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      drawField(t * .07, 'rgba(241,236,227,0.18)', 46);
      drawField(-t * .052 + .28, 'rgba(215,255,63,0.15)', 46);
      drawField(t * .031 + 1.1, 'rgba(143,232,255,0.10)', 46);
      ctx.globalCompositeOperation = 'source-over';
    };
  }

  /* ---------- scene 04 · orbit / flow ---------- */
  function sceneOrbit(api) {
    const { ctx } = api;
    const palette = ['#D7FF3F', '#8FE8FF', '#FF4A1C', '#F1ECE3'];
    let particles = [];
    let primed = false;
    const seed = () => {
      particles = Array.from({ length: 380 }, () => ({
        x: Math.random(),
        y: Math.random(),
        c: palette[(Math.random() * palette.length) | 0],
      }));
      primed = false;
    };
    seed();
    return (now) => {
      const { w, h } = api;
      const t = now * 0.001;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = primed ? 'rgba(10,9,8,0.20)' : '#0A0908';
      ctx.fillRect(0, 0, w, h);
      primed = true;
      ctx.globalCompositeOperation = 'lighter';
      const cx = w / 2 + Math.cos(t * .3) * w * .13;
      const cy = h / 2 + Math.sin(t * .24) * h * .1;
      particles.forEach((p) => {
        const px = p.x * w;
        const py = p.y * h;
        const ang = Math.atan2(cy - py, cx - px);
        p.x += (Math.cos(ang + t * .4) * .0016 + Math.sin(t * .7 + py * .004) * .0006 + 1) % 1;
        p.y += (Math.sin(ang + t * .4) * .0016 + Math.cos(t * .6 + px * .004) * .0006 + 1) % 1;
        p.x %= 1; p.y %= 1;
        ctx.globalAlpha = .5;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x * w, p.y * h, 1.6, 1.6);
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };
  }

  /* ---------- scene 05 · grid wave ---------- */
  function sceneGrid(api) {
    const { ctx } = api;
    return (now) => {
      const { w, h } = api;
      const t = now * 0.001;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#0A0908';
      ctx.fillRect(0, 0, w, h);
      const gap = Math.max(18, w / 32);
      for (let gy = 0; gy <= h + gap; gy += gap) {
        for (let gx = 0; gx <= w + gap; gx += gap) {
          const nx = gx / w;
          const ny = gy / h;
          const wave = Math.sin(nx * 6.2 + t * .9) * Math.cos(ny * 5.4 - t * .7);
          const r = Math.max(.4, 1.1 + wave * 1.5);
          const a = .2 + .55 * Math.abs(wave);
          ctx.fillStyle = wave > .3
            ? 'rgba(215,255,63,' + a.toFixed(3) + ')'
            : 'rgba(241,236,227,' + (a * .55).toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(gx + wave * 8, gy + wave * 6, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
  }

  const sceneMap = {
    chroma: sceneChroma,
    tunnel: sceneTunnel,
    moire: sceneMoire,
    orbit: sceneOrbit,
    grid: sceneGrid,
  };

  $$('.card__canvas').forEach((canvas) => {
    const factory = sceneMap[canvas.dataset.scene];
    if (factory) registerScene(canvas, factory, { maxDpr: 1.25 });
  });

  /* ----------------------------------------------------------
     WebGL hero — liquid light field
     ---------------------------------------------------------- */
  const heroCanvas = $('#gl');
  let heroGL = null;

  function initHeroGL(canvas) {
    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    if (!gl) return null;

    const vertSrc = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
    const fragSrc = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 R = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = R * p * 2.03 + vec2(7.1, 3.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 res = uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);
  float t = uTime * 0.055;
  vec2 m = uMouse;
  float md = length(p - m);
  float mf = exp(-md * 2.4);

  vec2 warp = vec2(
    fbm(p * 1.9 + vec2(0.0, t * 1.6)),
    fbm(p * 1.9 + vec2(4.7, -t * 1.4))
  );
  float n = fbm(p * 1.6 + warp * 1.7 + mf * 1.2);

  float y = p.y + n * 0.6 + mf * 0.16 * sin(t * 2.0);
  float bands = sin((y * 2.5 + t * 2.1) * 6.28318);
  bands = smoothstep(-0.35, 1.0, bands);
  float filaments = pow(bands, 7.0);

  vec3 col = vec3(0.032, 0.027, 0.024);
  vec3 acid = vec3(0.843, 1.000, 0.247);
  vec3 blaze = vec3(1.000, 0.290, 0.110);
  vec3 ice = vec3(0.560, 0.910, 1.000);

  col += ice * smoothstep(0.35, 0.95, n) * 0.10;
  col += blaze * smoothstep(0.45, 1.0, fbm(p * 2.4 + warp + vec2(8.0, -t * 2.0))) * 0.10;

  vec3 hot = mix(acid, blaze, smoothstep(0.15, 0.85, p.y + 0.6));
  col += hot * filaments * (0.30 + 0.85 * mf);
  col += ice * pow(smoothstep(0.86, 1.0, bands), 10.0) * 0.22;

  float vig = smoothstep(1.5, 0.15, length(p * vec2(0.75, 1.0)));
  col *= 0.42 + 0.58 * vig;

  float g = hash(gl_FragCoord.xy * 0.73 + fract(uTime) * 91.0);
  col += (g - 0.5) * 0.035;

  gl_FragColor = vec4(col, 1.0);
}
`;

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn('Shader error:', gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, vertSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Program link error:', gl.getProgramInfoLog(program));
      return null;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aLoc = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'uRes');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uMouse = gl.getUniformLocation(program, 'uMouse');

    const state = {
      visible: true,
      w: 0, h: 0, dpr: 0,
      mx: 0, my: 0, tx: 0, ty: 0,
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.35);
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      if (w === state.w && h === state.h && dpr === state.dpr) return;
      state.w = w; state.h = h; state.dpr = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    const draw = (now) => {
      resize();
      state.mx += (state.tx - state.mx) * .045;
      state.my += (state.ty - state.my) * .045;
      gl.uniform1f(uTime, now * .001);
      gl.uniform2f(uMouse, state.mx, state.my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    window.addEventListener('pointermove', (e) => {
      const min = Math.min(window.innerWidth, window.innerHeight);
      state.tx = (e.clientX - window.innerWidth / 2) / min;
      state.ty = -(e.clientY - window.innerHeight / 2) / min;
    }, { passive: true });

    resize();
    draw(performance.now());
    window.addEventListener('resize', resize);
    root.classList.add('has-gl');

    return { draw, resize, state, canvas };
  }

  if (heroCanvas) {
    try { heroGL = initHeroGL(heroCanvas); } catch (err) { console.warn(err); }
    if (heroGL) {
      const heroIO = new IntersectionObserver((entries) => {
        heroGL.state.visible = entries[0].isIntersecting;
      }, { threshold: 0 });
      heroIO.observe(heroCanvas);
    }
  }

  /* ----------------------------------------------------------
     Playground — stir the ink
     ---------------------------------------------------------- */
  const playCanvas = $('#playCanvas');

  function initPlayground(canvas) {
    const stage = $('#playStage');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const palette = ['#D7FF3F', '#FF4A1C', '#8FE8FF', '#F1ECE3', '#7C5CFF'];
    const parts = [];
    const MAX = 1600;
    let w = 1, h = 1, dpr = 1;
    let visible = true;
    let live = false;
    const pointer = { x: 0, y: 0, inside: false };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const nextDpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const nw = Math.max(1, rect.width);
      const nh = Math.max(1, rect.height);
      if (nw === w && nh === h && nextDpr === dpr) return;
      w = nw; h = nh; dpr = nextDpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#080706';
      ctx.fillRect(0, 0, w, h);
    };

    const add = (x, y, vx, vy, width) => {
      if (parts.length >= MAX) parts.shift();
      parts.push({
        x, y,
        px: x - vx * .5, py: y - vy * .5,
        vx, vy,
        life: .75 + Math.random() * .5,
        width: width || .7 + Math.random() * 1.3,
        color: palette[(Math.random() * palette.length) | 0],
      });
    };

    const burst = (x, y, amount = 90) => {
      for (let i = 0; i < amount; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * 3.6 + .5;
        add(x, y, Math.cos(a) * s, Math.sin(a) * s, .8 + Math.random() * 1.6);
      }
      if (stage) stage.classList.add('is-live');
      live = true;
    };

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (pointer.inside) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const speed = Math.hypot(dx, dy);
        const n = Math.min(7, 1 + Math.floor(speed / 7));
        for (let i = 0; i < n; i++) {
          add(
            x + (Math.random() - .5) * 10,
            y + (Math.random() - .5) * 10,
            dx * .1 + (Math.random() - .5) * 1.4,
            dy * .1 + (Math.random() - .5) * 1.4
          );
        }
      }
      pointer.x = x; pointer.y = y; pointer.inside = true;
      if (!live) {
        live = true;
        if (stage) stage.classList.add('is-live');
      }
    }, { passive: true });

    canvas.addEventListener('pointerleave', () => { pointer.inside = false; });

    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      burst(e.clientX - rect.left, e.clientY - rect.top);
    });

    const io = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 });
    io.observe(canvas);

    const clearBtn = $('#clearBtn');
    const burstBtn = $('#burstBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        parts.length = 0;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#080706';
        ctx.fillRect(0, 0, w, h);
      });
    }
    if (burstBtn) {
      burstBtn.addEventListener('click', () => burst(w / 2, h / 2, 140));
    }

    resize();

    const ambient = () => {
      if (!motionOn) return;
      if (parts.length > 320) return;
      for (let i = 0; i < 2; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const a = Math.sin(x * .004 + performance.now() * .0004) * 3 + Math.cos(y * .003) * 2;
        add(x, y, Math.cos(a) * .55, Math.sin(a) * .55, .6 + Math.random() * .9);
      }
    };

    const frame = (now) => {
      if (visible) {
        resize();
        ambient();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(8,7,6,0.14)';
        ctx.fillRect(0, 0, w, h);

        if (pointer.inside) {
          const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 90);
          glow.addColorStop(0, 'rgba(215,255,63,0.10)');
          glow.addColorStop(1, 'rgba(215,255,63,0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(pointer.x, pointer.y, 90, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalCompositeOperation = 'lighter';
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.px = p.x; p.py = p.y;
          p.vx *= .974;
          p.vy = p.vy * .974 - .012;
          p.x += p.vx;
          p.y += p.vy;
          p.life -= .006;
          if (p.life <= 0 || p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) {
            parts.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = Math.max(0, p.life) * .72;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.width;
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  if (playCanvas) initPlayground(playCanvas);

  /* ----------------------------------------------------------
     Global render loop
     ---------------------------------------------------------- */
  let cursorTick = null;

  function animate(now) {
    if (motionOn) {
      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i];
        if (s.visible) s.draw(now);
      }
      if (heroGL && heroGL.state.visible) heroGL.draw(now);
    }
    if (cursorTick) cursorTick();
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  /* ----------------------------------------------------------
     Loader run
     ---------------------------------------------------------- */
  function finishLoad() {
    if (loaderDone) return;
    loaderDone = true;
    document.body.classList.remove('is-locked');
    document.body.classList.add('is-loaded');
    if (loader) {
      loader.classList.add('is-done');
      window.setTimeout(() => { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 1500);
    }
    layoutWork();
    updateWork();
    heroParallax();
  }

  function runLoader(now) {
    const p = clamp((now - loaderStart) / loaderDuration, 0, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    if (loadCount) loadCount.textContent = String(Math.round(eased * 100)).padStart(3, '0');
    if (loadBar) loadBar.style.transform = 'scaleX(' + eased + ')';
    if (p < 1) {
      requestAnimationFrame(runLoader);
    } else {
      window.setTimeout(finishLoad, 160);
    }
  }
  requestAnimationFrame(runLoader);

  /* ----------------------------------------------------------
     Text reveals
     ---------------------------------------------------------- */
  $$('.reveal-words').forEach((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    let index = 0;
    textNodes.forEach((node) => {
      const value = node.nodeValue;
      if (!value || !value.trim()) return;
      const frag = document.createDocumentFragment();
      value.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
          return;
        }
        const w = document.createElement('span');
        w.className = 'w';
        const inner = document.createElement('span');
        inner.textContent = part;
        inner.style.transitionDelay = Math.min(index * 24, 760) + 'ms';
        w.appendChild(inner);
        frag.appendChild(w);
        index++;
      });
      if (node.parentNode) node.parentNode.replaceChild(frag, node);
    });
  });

  const revealTargets = $$('.sec-head, .display-title, .play__title, .contact__row, .socials, .manifesto__stats, .work__head, .work__foot, .play__stage, .caps');
  revealTargets.forEach((el) => el.classList.add('reveal'));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });

  $$('.reveal, .reveal-words, .mask-lines').forEach((el) => revealObserver.observe(el));

  /* ----------------------------------------------------------
     Stats count-up
     ---------------------------------------------------------- */
  const statsBlock = $('.manifesto__stats');
  if (statsBlock) {
    const statObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        $$('[data-count]', statsBlock).forEach((el) => {
          const target = parseInt(el.dataset.count, 10) || 0;
          if (!motionOn) { el.textContent = String(target); return; }
          const start = performance.now();
          const dur = 1500;
          const step = (now) => {
            const p = clamp((now - start) / dur, 0, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.round(target * eased));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
        statObserver.disconnect();
      }
    }, { threshold: .35 });
    statObserver.observe(statsBlock);
  }

  /* ----------------------------------------------------------
     Work — pinned horizontal reel
     ---------------------------------------------------------- */
  const workSection = $('#work');
  const workTrack = $('#workTrack');
  const workBar = $('#workBar');
  const workCount = $('#workCount');
  const workCards = workTrack ? $$('.card', workTrack) : [];
  let workMax = 0;
  let workProgress = 0;

  function layoutWork() {
    if (!workSection || !workTrack) return;
    if (window.innerWidth <= 900) {
      workSection.style.height = 'auto';
      workTrack.style.transform = '';
      workMax = 0;
      return;
    }
    workTrack.style.transform = 'translate3d(0,0,0)';
    const extra = Math.max(0, workTrack.scrollWidth - window.innerWidth);
    workMax = extra;
    workSection.style.height = (window.innerHeight + extra) + 'px';
  }

  function updateWork() {
    if (!workSection || !workTrack) return;
    if (window.innerWidth <= 900) {
      if (workCount && workCards.length) {
        const style = window.getComputedStyle(workTrack);
        const gap = parseFloat(style.columnGap || style.gap || 0) || 0;
        const step = workCards[0].getBoundingClientRect().width + gap;
        const idx = clamp(Math.round(workTrack.scrollLeft / step) + 1, 1, workCards.length);
        workCount.textContent = String(idx).padStart(2, '0') + ' / ' + String(workCards.length).padStart(2, '0');
      }
      return;
    }
    const rect = workSection.getBoundingClientRect();
    const total = workSection.offsetHeight - window.innerHeight;
    const p = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
    workProgress = p;
    workTrack.style.transform = 'translate3d(' + (-p * workMax).toFixed(2) + 'px,0,0)';
    if (workBar) workBar.style.transform = 'scaleX(' + p + ')';
    if (workCount && workCards.length) {
      const idx = clamp(Math.floor(p * (workCards.length - 1) + .5) + 1, 1, workCards.length);
      const label = String(idx).padStart(2, '0') + ' / ' + String(workCards.length).padStart(2, '0');
      if (workCount.textContent !== label) workCount.textContent = label;
    }
  }

  if (workTrack) {
    workTrack.addEventListener('scroll', () => {
      if (window.innerWidth <= 900) updateWork();
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     Scroll — hero parallax, nav, progress, work
     ---------------------------------------------------------- */
  const nav = $('#nav');
  const scrollBar = $('#scrollBar');
  const hero = $('#hero');
  const heroInner = $('.hero__inner');

  function heroParallax() {
    if (!hero || !heroInner) return;
    const y = window.scrollY;
    const vh = window.innerHeight;
    if (y > vh * 1.25) return;
    const p = clamp(y / vh, 0, 1);
    heroInner.style.opacity = String(1 - p * .92);
    heroInner.style.transform = 'translate3d(0,' + (p * 70).toFixed(2) + 'px,0)';
  }

  let scrollQueued = false;

  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      const y = window.scrollY;
      if (nav) nav.classList.toggle('is-scrolled', y > 40);
      if (scrollBar) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        scrollBar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
      }
      updateWork();
      heroParallax();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ----------------------------------------------------------
     Custom cursor + magnetics + tilt
     ---------------------------------------------------------- */
  if (finePointer) {
    root.classList.add('has-cursor');
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    const label = document.createElement('span');
    ring.appendChild(label);
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let activeEl = null;

    const moveDot = () => {
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
    };
    moveDot();

    window.addEventListener('pointermove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      moveDot();
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    }, { passive: true });

    root.addEventListener('mouseleave', () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    });
    root.addEventListener('mouseenter', () => {
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    });

    const setHover = (el) => {
      if (el === activeEl) return;
      activeEl = el;
      const text = el && el.dataset ? (el.dataset.cursor || '') : '';
      ring.classList.toggle('is-hover', !!text);
      ring.classList.toggle('is-grow', !!el && !text);
      label.textContent = text;
      dot.style.opacity = text ? '0' : '1';
    };

    document.addEventListener('pointerover', (e) => {
      const el = e.target.closest('[data-cursor], a, button');
      setHover(el);
    });
    document.addEventListener('pointerout', (e) => {
      const el = e.target.closest('[data-cursor], a, button');
      if (el && !el.contains(e.relatedTarget)) setHover(null);
    });

    cursorTick = () => {
      rx += (mx - rx) * .16;
      ry += (my - ry) * .16;
      ring.style.transform = 'translate3d(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0) translate(-50%,-50%)';
    };

    /* magnetic elements */
    $$('[data-magnetic]').forEach((el) => {
      const strength = .28;
      el.addEventListener('pointermove', (e) => {
        if (!motionOn) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * strength;
        const y = (e.clientY - (r.top + r.height / 2)) * strength;
        el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    /* card tilt */
    $$('.card').forEach((card) => {
      const frame = $('.card__frame', card);
      if (!frame) return;
      card.addEventListener('pointermove', (e) => {
        if (!motionOn) return;
        const r = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - .5) * -5;
        const ry = ((e.clientX - r.left) / r.width - .5) * 5;
        frame.style.transform = 'perspective(1200px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      });
      card.addEventListener('pointerleave', () => { frame.style.transform = ''; });
    });
  }

  /* ----------------------------------------------------------
     Motion toggle
     ---------------------------------------------------------- */
  const motionToggle = $('#motionToggle');
  const motionLabel = $('#motionLabel');

  function applyMotionState(on) {
    motionOn = on;
    root.classList.toggle('motion-off', !on);
    if (motionToggle) motionToggle.setAttribute('aria-pressed', String(on));
    if (motionLabel) motionLabel.textContent = on ? 'MOTION ON' : 'MOTION OFF';
    if (on) {
      scenes.forEach((s) => { if (s.visible) s.draw(performance.now()); });
      if (heroGL && heroGL.state.visible) heroGL.draw(performance.now());
    }
  }

  if (motionToggle) {
    motionToggle.addEventListener('click', () => applyMotionState(!motionOn));
  }
  applyMotionState(motionOn);

  /* ----------------------------------------------------------
     Resize / init
     ---------------------------------------------------------- */
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      layoutWork();
      updateWork();
    }, 120);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      layoutWork();
      updateWork();
    });
  }
  window.addEventListener('load', () => {
    layoutWork();
    updateWork();
  });

  layoutWork();
  updateWork();
  heroParallax();
  onScroll();
})();
