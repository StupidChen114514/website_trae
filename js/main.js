/* ==========================================================================
   主交互：光标 / 滚动叙事 / 入场 / 手风琴 / 全屏菜单 / 时钟
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var qs = function (sel, ctx) {
    return (ctx || doc).querySelector(sel);
  };
  var qsa = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel));
  };
  var clamp = function (v, min, max) {
    return Math.min(max, Math.max(min, v));
  };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var head = qs('.head');
  var menu = qs('#menu');
  var burger = qs('.burger');
  var menuClose = qs('.menu__close');
  var menuOpen = false;

  /* ---------------- 自定义光标 ---------------- */
  var cursor = qs('.cursor');

  if (cursor && fine && !reduce) {
    var dot = qs('.cursor__dot', cursor);
    var ring = qs('.cursor__ring', cursor);
    var label = qs('.cursor__label', cursor);
    var mx = window.innerWidth / 2;
    var my = window.innerHeight / 2;
    var rx = mx;
    var ry = my;
    var moved = false;

    doc.addEventListener(
      'pointermove',
      function (e) {
        mx = e.clientX;
        my = e.clientY;
        if (!moved) {
          moved = true;
          rx = mx;
          ry = my;
          cursor.classList.add('is-active');
        }
      },
      { passive: true }
    );

    (function cursorLoop() {
      requestAnimationFrame(cursorLoop);
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;

      if (dot) {
        dot.style.transform =
          'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
      }
      if (ring) {
        ring.style.transform =
          'translate3d(' + rx + 'px,' + ry + 'px,0) translate(-50%,-50%)';
      }
    })();

    qsa('[data-cursor]').forEach(function (el) {
      el.addEventListener('pointerenter', function () {
        if (label) label.textContent = el.getAttribute('data-cursor') || '';
        cursor.classList.add('is-hover');
      });
      el.addEventListener('pointerleave', function () {
        cursor.classList.remove('is-hover');
      });
    });

    qsa('a, button').forEach(function (el) {
      if (el.hasAttribute('data-cursor')) return;
      el.addEventListener('pointerenter', function () {
        cursor.classList.add('is-link');
      });
      el.addEventListener('pointerleave', function () {
        cursor.classList.remove('is-link');
      });
    });

    /* 进入浅色区块时光标转黑 */
    var contactSection = qs('.contact');
    if (contactSection && 'IntersectionObserver' in window) {
      new IntersectionObserver(
        function (entries) {
          cursor.classList.toggle('cursor--ink', entries[0].isIntersecting);
        },
        { rootMargin: '-48% 0px -48% 0px' }
      ).observe(contactSection);
    }
  }

  /* ---------------- 入场观察 ---------------- */
  var revealEls = qsa('[data-reveal]');

  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) {
      el.classList.add('is-in');
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* 联系区大标题的遮罩推入 */
  var contactTitle = qs('.contact__title');
  if (contactTitle) {
    if (reduce || !('IntersectionObserver' in window)) {
      contactTitle.classList.add('is-in');
    } else {
      var titleObserver = new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) {
            contactTitle.classList.add('is-in');
            titleObserver.unobserve(contactTitle);
          }
        },
        { threshold: 0.2 }
      );
      titleObserver.observe(contactTitle);
    }
  }

  /* ---------------- 段落逐词点亮 ---------------- */
  var lede = qs('[data-words]');
  var words = [];
  var ledeLastP = -1;

  if (lede) {
    var raw = (lede.textContent || '').replace(/\s+/g, ' ').trim();
    var parts = raw.split(' ');
    var frag = doc.createDocumentFragment();

    parts.forEach(function (word, i) {
      var span = doc.createElement('span');
      span.className = 'w';
      span.textContent = word;
      frag.appendChild(span);
      if (i < parts.length - 1) frag.appendChild(doc.createTextNode(' '));
    });

    lede.textContent = '';
    lede.appendChild(frag);
    words = qsa('.w', lede);

    if (reduce) {
      words.forEach(function (w) {
        w.style.opacity = '1';
      });
    }
  }

  function updateLede() {
    if (!lede || !words.length || reduce) return;

    var rect = lede.getBoundingClientRect();
    var vh = window.innerHeight;
    if (rect.top > vh || rect.bottom < 0) return;

    var p = clamp((vh * 0.86 - rect.top) / (vh * 0.62), 0, 1);
    if (Math.abs(p - ledeLastP) < 0.002) return;
    ledeLastP = p;

    var n = words.length;
    for (var i = 0; i < n; i++) {
      var v = clamp((p * (n + 5) - i) / 3.2, 0, 1);
      words[i].style.opacity = (0.14 + 0.86 * v).toFixed(3);
    }
  }

  /* ---------------- 滚动：进度条 + 页头 ---------------- */
  var bar = qs('.progress__bar');
  var prevY = window.scrollY || 0;

  function scrollLoop() {
    requestAnimationFrame(scrollLoop);
    if (doc.hidden) return;

    var y = window.scrollY || window.pageYOffset || 0;
    var vh = window.innerHeight;
    var max = doc.documentElement.scrollHeight - vh;

    if (bar) {
      var prog = max > 0 ? clamp(y / max, 0, 1) : 0;
      bar.style.transform = 'scaleX(' + prog.toFixed(4) + ')';
    }

    if (head) {
      head.classList.toggle('is-stuck', y > 24);

      if (!menuOpen) {
        var delta = y - prevY;
        if (delta > 1 && y > 280) {
          head.classList.add('is-hidden');
        } else if (delta < -1) {
          head.classList.remove('is-hidden');
        }
      }
    }

    updateLede();
    prevY = y;
  }

  requestAnimationFrame(scrollLoop);

  /* ---------------- 能力手风琴 ---------------- */
  var craftRows = qsa('[data-craft]');

  craftRows.forEach(function (row) {
    var btn = qs('.craft__btn', row);
    if (!btn) return;

    function setOpen(open) {
      row.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    btn.addEventListener('click', function () {
      var willOpen = !row.classList.contains('is-open');
      craftRows.forEach(function (other) {
        var otherBtn = qs('.craft__btn', other);
        other.classList.remove('is-open');
        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
      });
      if (willOpen) setOpen(true);
    });

    if (fine) {
      row.addEventListener('pointerenter', function () {
        setOpen(true);
      });
      row.addEventListener('pointerleave', function () {
        setOpen(false);
      });
    }
  });

  /* ---------------- 全屏菜单 ---------------- */
  function lockScroll(on) {
    if (on) {
      var sw = window.innerWidth - doc.documentElement.clientWidth;
      if (sw > 0) doc.body.style.paddingRight = sw + 'px';
      doc.body.classList.add('is-locked');
    } else {
      doc.body.classList.remove('is-locked');
      doc.body.style.paddingRight = '';
    }
  }

  function openMenu() {
    if (!menu) return;
    menuOpen = true;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    doc.body.classList.add('menu-open');
    lockScroll(true);
    if (head) head.classList.remove('is-hidden');
    if (burger) {
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Close menu');
    }
    if (menuClose) menuClose.focus();
  }

  function closeMenu(returnFocus) {
    if (!menu || !menuOpen) return;
    menuOpen = false;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    doc.body.classList.remove('menu-open');
    lockScroll(false);
    if (burger) {
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Open menu');
      if (returnFocus !== false) burger.focus();
    }
  }

  if (burger) {
    burger.addEventListener('click', function () {
      if (menuOpen) closeMenu();
      else openMenu();
    });
  }

  if (menuClose) {
    menuClose.addEventListener('click', function () {
      closeMenu();
    });
  }

  doc.addEventListener('click', function (e) {
    if (!menuOpen) return;
    var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (link) closeMenu(false);
  });

  doc.addEventListener('keydown', function (e) {
    if (!menuOpen) return;

    if (e.key === 'Escape') {
      closeMenu();
      return;
    }

    if (e.key === 'Tab' && menu) {
      var focusables = qsa('a[href], button', menu).filter(function (el) {
        return el.offsetParent !== null;
      });
      if (!focusables.length) return;

      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (e.shiftKey && doc.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && doc.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  /* ---------------- 卡片光晕跟随 ---------------- */
  qsa('[data-card]').forEach(function (card) {
    var media = qs('.card__media', card);
    if (!media) return;

    card.addEventListener(
      'pointermove',
      function (e) {
        var r = media.getBoundingClientRect();
        if (!r.width || !r.height) return;
        media.style.setProperty(
          '--mx',
          (((e.clientX - r.left) / r.width) * 100).toFixed(2) + '%'
        );
        media.style.setProperty(
          '--my',
          (((e.clientY - r.top) / r.height) * 100).toFixed(2) + '%'
        );
      },
      { passive: true }
    );
  });

  /* ---------------- 磁性按钮 ---------------- */
  if (fine && !reduce) {
    qsa('[data-magnetic]').forEach(function (el) {
      var pull = el.classList.contains('seal') ? 0.1 : 0.2;

      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform =
          'translate3d(' +
          (dx * pull).toFixed(1) +
          'px,' +
          (dy * pull).toFixed(1) +
          'px,0)';
      });

      el.addEventListener('pointerleave', function () {
        el.style.transform = '';
      });
    });
  }

  /* ---------------- 上海时间 ---------------- */
  var clocks = qsa('[data-clock]');

  function updateClock() {
    var now = new Date();
    var text;

    try {
      text = now.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Shanghai',
        hour12: false
      });
    } catch (err) {
      text = now.toLocaleTimeString();
    }

    clocks.forEach(function (el) {
      el.textContent = text;
    });
  }

  if (clocks.length) {
    updateClock();
    setInterval(updateClock, 1000);
  }
})();
