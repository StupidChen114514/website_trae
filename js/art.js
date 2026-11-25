/* ==========================================================================
   作品缩略图 — 全部为实时生成艺术（无任何外部图片）
   chroma   流体光场
   velocity 动态排版
   machine  机械星轨
   orbital  数据粒子场
   ========================================================================== */
(function () {
  'use strict';

  var nodes = Array.prototype.slice.call(
    document.querySelectorAll('canvas[data-art]')
  );
  if (!nodes.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var arts = [];

  function createArt(el) {
    var ctx = el.getContext('2d');
    if (!ctx) return null;

    var art = {
      el: el,
      ctx: ctx,
      type: el.getAttribute('data-art'),
      w: 1,
      h: 1,
      dpr: 1,
      t: Math.random() * 20,
      hover: 0,
      hoverTarget: 0,
      visible: true,
      last: 0
    };

    el.__art = art;
    return art;
  }

  function resize(art) {
    var rect = art.el.getBoundingClientRect();
    art.dpr = Math.min(window.devicePixelRatio || 1, 2);
    art.w = Math.max(1, Math.round(rect.width));
    art.h = Math.max(1, Math.round(rect.height));
    art.el.width = Math.round(art.w * art.dpr);
    art.el.height = Math.round(art.h * art.dpr);
    art.ctx.setTransform(art.dpr, 0, 0, art.dpr, 0, 0);
  }

  /* ---------------- 01 流体光场 ---------------- */
  function drawChroma(a) {
    var ctx = a.ctx;
    var w = a.w;
    var h = a.h;
    var t = a.t;
    var boost = a.hover;

    ctx.setTransform(a.dpr, 0, 0, a.dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#08080a';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    var min = Math.min(w, h);
    var blobs = [
      { c: '27,35,255', r: 0.62, x: 0.3, y: 0.46, ax: 0.16, ay: 0.13, sx: 0.55, sy: 0.8, p: 0.4 },
      { c: '255,75,43', r: 0.44, x: 0.72, y: 0.38, ax: 0.14, ay: 0.16, sx: 0.72, sy: 0.5, p: 2.1 },
      { c: '216,255,62', r: 0.28, x: 0.56, y: 0.72, ax: 0.18, ay: 0.12, sx: 0.48, sy: 0.9, p: 3.4 },
      { c: '110,70,255', r: 0.5, x: 0.22, y: 0.78, ax: 0.12, ay: 0.15, sx: 0.63, sy: 0.7, p: 5.0 }
    ];

    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      var x = (b.x + Math.sin(t * b.sx + b.p) * b.ax) * w;
      var y = (b.y + Math.cos(t * b.sy + b.p * 1.3) * b.ay) * h;
      var r =
        b.r *
        min *
        (1 + Math.sin(t * 0.7 + i * 1.4) * 0.1) *
        (1 + boost * 0.14);

      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(' + b.c + ',0.92)');
      g.addColorStop(0.42, 'rgba(' + b.c + ',0.34)');
      g.addColorStop(1, 'rgba(' + b.c + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------------- 02 动态排版 ---------------- */
  function drawVelocity(a) {
    var ctx = a.ctx;
    var w = a.w;
    var h = a.h;
    var t = a.t;
    var boost = a.hover;

    ctx.setTransform(a.dpr, 0, 0, a.dpr, 0, 0);
    ctx.fillStyle = '#08080a';
    ctx.fillRect(0, 0, w, h);

    var size = h * 0.235;
    ctx.font =
      '600 ' + size + 'px "Space Grotesk", Helvetica, Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    var word = 'VELOCITY ';
    var tw = Math.max(1, ctx.measureText(word).width);
    var speeds = [26, -17, 33];
    var modes = ['dim', 'solid', 'outline'];

    for (var i = 0; i < 3; i++) {
      var cy = h * (0.27 + i * 0.232);
      var off = (((t * speeds[i] * (1 + boost * 2.1)) % tw) + tw) % tw;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, cy - size * 0.6, w, size * 1.2);
      ctx.clip();

      for (var x = -tw; x < w + tw; x += tw) {
        var px = x + off;
        if (modes[i] === 'solid') {
          ctx.fillStyle = 'rgba(216,255,62,0.96)';
          ctx.fillText(word, px, cy);
        } else if (modes[i] === 'outline') {
          ctx.strokeStyle = 'rgba(239,234,224,0.42)';
          ctx.lineWidth = 1.3;
          ctx.strokeText(word, px, cy);
        } else {
          ctx.fillStyle = 'rgba(239,234,224,0.12)';
          ctx.fillText(word, px, cy);
        }
      }

      ctx.restore();
    }

    /* 排版校样网格 */
    ctx.strokeStyle = 'rgba(239,234,224,0.07)';
    ctx.lineWidth = 1;
    for (var c = 1; c < 4; c++) {
      var gx = (w / 4) * c;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }

    /* 底部时间刻度 */
    var barY = h * 0.9;
    var barW = w * (0.16 + 0.46 * (0.5 + 0.5 * Math.sin(t * 0.9)));
    ctx.fillStyle = 'rgba(216,255,62,0.92)';
    ctx.fillRect(w * 0.06, barY, barW, 2);
    ctx.fillStyle = 'rgba(239,234,224,0.3)';
    ctx.fillRect(w * 0.06 + barW + 7, barY, 5, 2);
  }

  /* ---------------- 03 机械星轨 ---------------- */
  function drawMachine(a) {
    var ctx = a.ctx;
    var w = a.w;
    var h = a.h;
    var t = a.t;
    var boost = a.hover;

    ctx.setTransform(a.dpr, 0, 0, a.dpr, 0, 0);
    ctx.fillStyle = '#0b0a0d';
    ctx.fillRect(0, 0, w, h);

    var cx = w * 0.5;
    var cy = h * 0.5;
    var R = Math.min(w, h);

    var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.62);
    glow.addColorStop(0, 'rgba(255,75,43,0.24)');
    glow.addColorStop(0.45, 'rgba(255,75,43,0.07)');
    glow.addColorStop(1, 'rgba(255,75,43,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    var rings = [
      { r: 0.2, flat: 0.42, sp: 0.5, col: 'rgba(239,234,224,0.6)', lw: 1.1 },
      { r: 0.3, flat: 0.34, sp: -0.34, col: 'rgba(255,75,43,0.85)', lw: 1.5 },
      { r: 0.4, flat: 0.28, sp: 0.23, col: 'rgba(239,234,224,0.24)', lw: 1 },
      { r: 0.48, flat: 0.22, sp: -0.15, col: 'rgba(216,255,62,0.65)', lw: 1.1 }
    ];

    for (var i = 0; i < rings.length; i++) {
      var ring = rings[i];
      var rx = ring.r * R * 1.52;
      var ry = rx * ring.flat * 1.5;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * ring.sp * (1 + boost * 1.6) + i * 0.72);
      ctx.strokeStyle = ring.col;
      ctx.lineWidth = ring.lw;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0.14, Math.PI * 1.95);
      ctx.stroke();

      ctx.fillStyle = ring.col;
      ctx.beginPath();
      ctx.arc(Math.cos(0.14) * rx, Math.sin(0.14) * ry, 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* 中心核 */
    ctx.fillStyle = 'rgba(216,255,62,0.95)';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(216,255,62,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 9 + Math.sin(t * 1.6) * 2.4, 0, Math.PI * 2);
    ctx.stroke();

    /* 底部仪表刻度 */
    var baseY = h * 0.86;
    ctx.strokeStyle = 'rgba(239,234,224,0.22)';
    ctx.beginPath();
    ctx.moveTo(w * 0.1, baseY);
    ctx.lineTo(w * 0.9, baseY);
    ctx.stroke();

    for (var k = 0; k < 25; k++) {
      var x = w * 0.1 + (w * 0.8 * k) / 24;
      var tall = k % 6 === 0;
      ctx.strokeStyle = tall
        ? 'rgba(216,255,62,0.65)'
        : 'rgba(239,234,224,0.24)';
      ctx.beginPath();
      ctx.moveTo(x, baseY - (tall ? 6 : 3));
      ctx.lineTo(x, baseY);
      ctx.stroke();
    }
  }

  /* ---------------- 04 数据粒子场 ---------------- */
  function drawOrbital(a) {
    var ctx = a.ctx;
    var w = a.w;
    var h = a.h;
    var t = a.t;
    var boost = a.hover;

    ctx.setTransform(a.dpr, 0, 0, a.dpr, 0, 0);
    ctx.fillStyle = '#08080b';
    ctx.fillRect(0, 0, w, h);

    var cols = Math.max(14, Math.min(38, Math.round(w / 20)));
    var rows = Math.max(10, Math.min(28, Math.round(h / 20)));
    var stepX = w / cols;
    var stepY = h / rows;
    var pal = [
      'rgba(239,234,224,0.16)',
      'rgba(239,234,224,0.42)',
      'rgba(124,92,255,0.72)',
      'rgba(216,255,62,0.92)'
    ];
    var speed = 1 + boost * 1.7;

    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var nx = (i + 0.5) / cols - 0.5;
        var ny = (j + 0.5) / rows - 0.5;
        var d = Math.sqrt(nx * nx + ny * ny);
        var wave = Math.sin(d * 11 - t * 1.7 * speed + nx * 3.2 + ny * 2.1);
        var v = wave * 0.5 + 0.5;
        var idx = v > 0.84 ? 3 : v > 0.62 ? 2 : v > 0.34 ? 1 : 0;
        var size = 1.4 + Math.pow(v, 3) * 5.4;
        var px = (i + 0.5) * stepX + Math.cos(t * 0.7 + j * 0.34) * stepX * 0.16;
        var py = (j + 0.5) * stepY + Math.sin(t * 0.6 + i * 0.27) * stepY * 0.16;
        var half = size * 0.5;

        ctx.fillStyle = pal[idx];
        ctx.fillRect(px - half, py - half, size, size);
      }
    }

    /* 扫描线 */
    var scanY = h * (0.5 + 0.42 * Math.sin(t * 0.55));
    ctx.fillStyle = 'rgba(216,255,62,0.32)';
    ctx.fillRect(0, scanY, w, 1);
  }

  var painters = {
    chroma: drawChroma,
    velocity: drawVelocity,
    machine: drawMachine,
    orbital: drawOrbital
  };

  for (var i = 0; i < nodes.length; i++) {
    var art = createArt(nodes[i]);
    if (!art) continue;
    arts.push(art);

    /* 悬停加速 */
    var card = art.el.closest('[data-card]');
    if (card) {
      (function (a, c) {
        c.addEventListener('pointerenter', function () {
          a.hoverTarget = 1;
        });
        c.addEventListener('pointerleave', function () {
          a.hoverTarget = 0;
        });
      })(art, card);
    }

    resize(art);
  }

  if (!arts.length) return;

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.target.__art) {
            entry.target.__art.visible = entry.isIntersecting;
          }
        });
      },
      { rootMargin: '160px 0px' }
    );
    arts.forEach(function (a) {
      io.observe(a.el);
    });
  }

  /* 静态模式：只绘制一帧 */
  if (reduceMotion) {
    arts.forEach(function (a) {
      a.t = 8;
      painters[a.type](a);
    });

    window.addEventListener('resize', function () {
      arts.forEach(function (a) {
        resize(a);
        painters[a.type](a);
      });
    });
    return;
  }

  var last = 0;

  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) return;

    for (var k = 0; k < arts.length; k++) {
      var a = arts[k];
      if (!a.visible) continue;

      a.hover += (a.hoverTarget - a.hover) * 0.06;

      if (!a.last) a.last = now;
      if (now - a.last < 33) continue;

      var dt = Math.min(0.05, (now - a.last) / 1000);
      a.last = now;
      a.t += dt;

      painters[a.type](a);
    }
  }

  requestAnimationFrame(loop);

  /* 尺寸变化：仅在静止后重算，避免抖动 */
  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      arts.forEach(resize);
    }, 160);
  });
})();
