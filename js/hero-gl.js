/* ==========================================================================
   Hero — 实时 GLSL 流体色场
   全屏三角 + 域扭曲 fBm，鼠标作为光源，滚动时逐渐沉入背景
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('heroGl');
  if (!canvas) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var gl = null;
  try {
    gl =
      canvas.getContext('webgl', {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance'
      }) ||
      canvas.getContext('experimental-webgl') ||
      null;
  } catch (err) {
    gl = null;
  }

  /* WebGL 不可用：交由 CSS 渐变兜底 */
  if (!gl) {
    document.documentElement.classList.add('no-gl');
    return;
  }

  var VERT = [
    'attribute vec2 aPos;',
    'void main() {',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    '',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform vec2 uMouse;',
    'uniform float uScroll;',
    '',
    'float hash21(vec2 p) {',
    '  p = fract(p * vec2(233.34, 851.73));',
    '  p += dot(p, p + 23.45);',
    '  return fract(p.x * p.y);',
    '}',
    '',
    'float vnoise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float a = hash21(i);',
    '  float b = hash21(i + vec2(1.0, 0.0));',
    '  float c = hash21(i + vec2(0.0, 1.0));',
    '  float d = hash21(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',
    '',
    'float fbm(vec2 p) {',
    '  float s = 0.0;',
    '  float a = 0.5;',
    '  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);',
    '  for (int i = 0; i < 5; i++) {',
    '    s += a * vnoise(p);',
    '    p = rot * p * 2.03 + 11.7;',
    '    a *= 0.5;',
    '  }',
    '  return s;',
    '}',
    '',
    'void main() {',
    '  vec2 res = uRes;',
    '  float mn = min(res.x, res.y);',
    '  vec2 p = (gl_FragCoord.xy - 0.5 * res) / mn;',
    '  vec2 mp = (uMouse * res - 0.5 * res) / mn;',
    '',
    '  float t = uTime * 0.052;',
    '',
    '  vec2 q = vec2(',
    '    fbm(p * 1.45 + vec2(0.0, t * 1.35)),',
    '    fbm(p * 1.45 + vec2(5.2, -t * 0.92))',
    '  );',
    '',
    '  vec2 r = vec2(',
    '    fbm(p * 1.9 + q * 2.4 + vec2(1.7, 9.2) + t * 0.75),',
    '    fbm(p * 1.9 + q * 2.4 + vec2(8.3, 2.8) - t * 0.55)',
    '  );',
    '',
    '  float f = fbm(p * 1.15 + r * 3.1 + vec2(0.0, uScroll * 0.55));',
    '',
    '  vec3 ink    = vec3(0.031, 0.031, 0.039);',
    '  vec3 cobalt = vec3(0.106, 0.137, 0.850);',
    '  vec3 verm   = vec3(1.000, 0.294, 0.169);',
    '  vec3 lime   = vec3(0.847, 1.000, 0.243);',
    '  vec3 bone   = vec3(0.937, 0.918, 0.878);',
    '',
    '  vec3 pal = mix(cobalt, verm, smoothstep(0.12, 0.82, q.x));',
    '  pal = mix(pal, lime, smoothstep(0.42, 0.96, r.y) * 0.85);',
    '',
    '  float k = smoothstep(0.12, 0.78, f);',
    '  k *= 0.35 + 1.08 * smoothstep(0.08, 0.9, q.y);',
    '  vec3 col = ink + pal * k * 0.95;',
    '',
    '  float ridge = 1.0 - abs(f * 2.0 - 1.0);',
    '  ridge = pow(clamp(ridge, 0.0, 1.0), 7.0);',
    '  col += bone * ridge * 0.52;',
    '  col += verm * pow(clamp(1.0 - abs(r.x * 2.0 - 1.0), 0.0, 1.0), 9.0) * 0.28;',
    '',
    '  float d = length(p - mp);',
    '  float glow = exp(-d * d * 3.1);',
    '  col += (cobalt * 0.45 + lime * 0.24) * glow * 0.62;',
    '',
    '  float vig = 1.0 - smoothstep(0.28, 1.2, length(p * vec2(0.82, 1.0)));',
    '  col *= mix(0.42, 1.0, vig);',
    '',
    '  col *= mix(1.0, 0.5, clamp(uScroll, 0.0, 1.0));',
    '',
    '  float g = hash21(gl_FragCoord.xy + fract(uTime) * 57.0);',
    '  col += (g - 0.5) * 0.028;',
    '',
    '  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);',
    '}'
  ].join('\n');

  function compile(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);

  if (!vs || !fs) {
    document.documentElement.classList.add('no-gl');
    return;
  }

  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    document.documentElement.classList.add('no-gl');
    return;
  }

  gl.useProgram(program);

  /* 全屏三角 */
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );

  var aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(program, 'uRes');
  var uTime = gl.getUniformLocation(program, 'uTime');
  var uMouse = gl.getUniformLocation(program, 'uMouse');
  var uScroll = gl.getUniformLocation(program, 'uScroll');

  var dpr = 1;
  var cssW = 1;
  var cssH = 1;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.65);

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);

    if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);

    if (reduceMotion) draw(7.2);
  }

  var mouse = { x: 0.68, y: 0.46 };
  var target = { x: 0.68, y: 0.46 };
  var scrollFade = 0;
  var visible = true;
  var startTime = performance.now();

  function draw(elapsed) {
    gl.uniform1f(uTime, elapsed);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uScroll, scrollFade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  window.addEventListener(
    'pointermove',
    function (e) {
      target.x = e.clientX / Math.max(1, window.innerWidth);
      target.y = 1 - e.clientY / Math.max(1, window.innerHeight);
    },
    { passive: true }
  );

  window.addEventListener(
    'scroll',
    function () {
      var vh = Math.max(1, window.innerHeight);
      scrollFade = Math.min(1, Math.max(0, (window.scrollY || 0) / vh));
    },
    { passive: true }
  );

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      function (entries) {
        visible = entries[0].isIntersecting;
      },
      { threshold: 0 }
    ).observe(canvas);
  }

  window.addEventListener('resize', resize);

  resize();

  if (reduceMotion) return;

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || !visible) return;

    mouse.x += (target.x - mouse.x) * 0.045;
    mouse.y += (target.y - mouse.y) * 0.045;

    draw((now - startTime) / 1000);
  }

  requestAnimationFrame(frame);
})();
