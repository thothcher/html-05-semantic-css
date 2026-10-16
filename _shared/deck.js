/* ==========================================================================
   Lecture deck engine
   - 1920x1080 stage scaled to the viewport
   - keyboard / clicker / swipe navigation with step-by-step fragments
   - phase rail, clock, progress, break overlay with internet radio
   - widgets: quiz, order (drag to sort), hotspots, code walk, flip, timer, tabs
   - presenter popup (P), notes drawer (N), overview (O), help (?)
   Classic script (no modules) so it works when opened from file://
   ========================================================================== */
(function () {
  'use strict';

  var W = 1920, H = 1080;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var fmt = function (sec) { sec = Math.max(0, Math.round(sec)); return pad(Math.floor(sec / 60)) + ':' + pad(sec % 60); };
  var clock = function (d) { d = d || new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* ---------- radio stations for the break (verified Oct 2026) ---------- */
  var STATIONS = [
    { id: 'fip-jazz', genre: 'jazz', name: 'FIP Jazz', where: 'Paris', url: 'https://icecast.radiofrance.fr/fipjazz-midfi.mp3' },
    { id: 'swiss-jazz', genre: 'jazz', name: 'Radio Swiss Jazz', where: 'Basel', url: 'https://stream.srg-ssr.ch/m/rsj/mp3_128' },
    { id: 'tsf-jazz', genre: 'jazz', name: 'TSF Jazz', where: 'Paris', url: 'https://tsfjazz.ice.infomaniak.ch/tsfjazz-high.mp3' },
    { id: 'xjazz', genre: 'jazz', name: 'FluxFM XJazz', where: 'Berlin', url: 'https://streams.fluxfm.de/xjazz/mp3-128/audio/' },
    { id: 'deep-house', genre: 'house', name: 'Hirschmilch Deep House', where: 'Germany', url: 'https://hirschmilch.de:7001/deephouse.mp3' },
    { id: 'beat-blender', genre: 'house', name: 'SomaFM Beat Blender', where: 'San Francisco', url: 'https://ice1.somafm.com/beatblender-128-mp3' },
    { id: 'clubsandwich', genre: 'house', name: 'FluxFM Clubsandwich', where: 'Berlin', url: 'https://streams.fluxfm.de/clubsandwich/mp3-128/audio/' },
    { id: 'fip-electro', genre: 'house', name: 'FIP Electro', where: 'Paris', url: 'https://icecast.radiofrance.fr/fipelectro-midfi.mp3' },
    { id: 'fip-groove', genre: 'lounge', name: 'FIP Groove', where: 'Paris', url: 'https://icecast.radiofrance.fr/fipgroove-midfi.mp3' },
    { id: 'groove-salad', genre: 'lounge', name: 'SomaFM Groove Salad', where: 'San Francisco', url: 'https://ice1.somafm.com/groovesalad-128-mp3' },
    { id: 'chillhop', genre: 'lounge', name: 'FluxFM Chillhop', where: 'Berlin', url: 'https://streams.fluxfm.de/Chillhop/mp3-128/audio/' },
    { id: 'secret-agent', genre: 'lounge', name: 'SomaFM Secret Agent', where: 'San Francisco', url: 'https://ice1.somafm.com/secretagent-128-mp3' }
  ];
  var GENRES = [
    { id: 'jazz', label: 'Jazz', img: 'break-jazz.jpg' },
    { id: 'house', label: 'House', img: 'break-house.jpg' },
    { id: 'lounge', label: 'Lounge', img: 'break-lounge.jpg' },
    { id: 'local', label: 'Local files', img: 'break-idle.jpg' }
  ];

  /* ---------- state ---------- */
  var Deck = window.Deck = {
    slides: [], count: 0, index: 0, step: 0, cfg: {},
    init: init, go: go, next: next, prev: prev, on: on, onSlide: onSlide,
    icon: icon, toast: toast, chime: chime, openBreak: function () { Break.open(true); },
    showAll: function (on) { deckEl.classList.toggle('show-all', on !== false); }
  };
  var deckEl, stage, chromeEl, railEl, countEl, progressEl, clockEl, breakBtn, notesEl, overviewEl, helpEl, toastEl;
  var handlers = { slide: [], step: [] };
  var slideHooks = {};
  var presenter = null;
  var startedAt = Date.now();

  function on(evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); }
  function onSlide(id, hooks) {
    slideHooks[id] = hooks;
    // hooks registered after init: run enter for the slide that is already open (cover, or a #n deep link)
    var cur = Deck.slides && Deck.slides[Deck.index];
    if (cur && cur.id === id && hooks.enter) setTimeout(function () { try { hooks.enter(cur); } catch (e) { console.error(e); } }, 0);
  }
  function emit(evt, a, b, c) { (handlers[evt] || []).forEach(function (fn) { try { fn(a, b, c); } catch (e) { console.error(e); } }); }

  /* ---------- icons ---------- */
  function icon(name, cls) {
    var inner = (window.LUCIDE || {})[name];
    if (!inner) return '';
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }
  function hydrateIcons(root) {
    $$('i[data-icon]', root).forEach(function (i) {
      var svg = icon(i.getAttribute('data-icon'), i.className);
      if (svg) i.outerHTML = svg;
    });
  }

  /* ---------- toast ---------- */
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  }

  /* ---------- sound ---------- */
  var actx;
  function chime(soft) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var now = actx.currentTime;
      var notes = soft ? [880, 1174.66] : [659.25, 783.99, 1046.5];
      notes.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        var t = now + i * 0.2;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(soft ? 0.12 : 0.22, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
        o.connect(g); g.connect(actx.destination);
        o.start(t); o.stop(t + 1.9);
      });
    } catch (e) { /* audio not available */ }
  }

  /* ---------- code blocks ---------- */
  function parseRanges(str) {
    var out = [];
    (str || '').split(',').forEach(function (part) {
      part = part.trim(); if (!part) return;
      var m = part.split('-').map(Number);
      if (m.length === 1) out.push(m[0]);
      else for (var i = m[0]; i <= m[1]; i++) out.push(i);
    });
    return out;
  }
  function splitLines(code) {
    var lines = [], stack = [], chain;
    function startLine() {
      var line = document.createElement('span');
      line.className = 'line';
      lines.push(line);
      chain = [line];
      stack.forEach(function (orig) { var c = orig.cloneNode(false); chain[chain.length - 1].appendChild(c); chain.push(c); });
    }
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          child.textContent.split('\n').forEach(function (part, i) {
            if (i > 0) startLine();
            if (part) chain[chain.length - 1].appendChild(document.createTextNode(part));
          });
        } else if (child.nodeType === 1) {
          var c = child.cloneNode(false);
          chain[chain.length - 1].appendChild(c);
          chain.push(c); stack.push(child);
          walk(child);
          stack.pop(); chain.pop();
        }
      });
    }
    startLine();
    walk(code);
    code.textContent = '';
    lines.forEach(function (l) { if (!l.textContent.length) l.appendChild(document.createTextNode('​')); code.appendChild(l); });
    return lines;
  }
  function dedent(raw) {
    var text = raw.replace(/^\s*\n/, '').replace(/\s+$/, '');
    var rows = text.split('\n');
    var indents = rows.filter(function (l) { return l.trim(); }).map(function (l) { return l.match(/^[ \t]*/)[0].length; });
    var min = indents.length ? Math.min.apply(null, indents) : 0;
    return rows.map(function (l) { return l.slice(min); }).join('\n');
  }

  /* AI prompts: raw text in <script type="text/plain" data-prompt="Title">.
     Lines in capitals (CONTEXT, TASK, CONSTRAINTS, OUTPUT) become labels. A copy button is added.
     [[term]] or [[shown text|glossary key]] marks a loaded term: one word that carries a whole concept.
     Its lecture comes from window.DECK_TERMS (_shared/terms.js). Terms from the prompt's own lecture
     (data-lecture, or Deck.cfg.lecture) are "new" and highlighted; older ones are underlined.
     data-blanks hides the new terms behind blanks that open one per step (or on click): the recall
     exercise at the start of the next lecture. The copied text never contains the markers. */
  function copyText(text, btn, msg) {
    function done() {
      btn.classList.add('is-done');
      btn.innerHTML = icon('check') + 'Copied';
      toast(msg || 'Prompt copied. Paste it into your AI tool.');
      setTimeout(function () { btn.classList.remove('is-done'); btn.innerHTML = icon('copy') + 'Copy'; }, 2200);
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { if (document.execCommand('copy')) done(); else toast('Copy failed. Select the prompt and press Ctrl+C.'); }
      catch (e) { toast('Copy failed. Select the prompt and press Ctrl+C.'); }
      ta.remove();
    }
    try {
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }
  var TERM_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
  function termInfo(key) {
    var all = window.DECK_TERMS || {};
    return all[key] || all[key.toLowerCase()] || null;
  }
  function buildPrompt(script) {
    var marked = dedent(script.textContent);
    var raw = marked.replace(TERM_RE, '$1');
    var lecture = Number(script.getAttribute('data-lecture') || Deck.cfg.lecture) || 0;
    var blanks = script.hasAttribute('data-blanks');
    var box = document.createElement('div');
    box.className = ('prompt ' + (script.getAttribute('class') || '')).trim();
    Array.prototype.slice.call(script.attributes).forEach(function (a) {
      if (/^data-/.test(a.name) && a.name !== 'data-prompt' && a.name !== 'data-blanks') box.setAttribute(a.name, a.value);
      if (a.name === 'style' || a.name === 'id') box.setAttribute(a.name, a.value);
    });
    var blankN = 0, newN = 0;
    var body = marked.split('\n').map(function (line) {
      var t = line.trim();
      if (t.length > 2 && /^[A-Z][A-Z /]+$/.test(t)) return '<b>' + esc(t) + '</b>';
      var out = '', last = 0, m;
      TERM_RE.lastIndex = 0;
      while ((m = TERM_RE.exec(line))) {
        out += esc(line.slice(last, m.index));
        var shown = m[1], key = (m[2] || m[1]).trim(), info = termInfo(key);
        var lec = info ? info.lec : 0;
        var isNew = lecture && lec === lecture;
        var cls = 'pterm' + (isNew ? ' is-new' : '');
        var attrs = ' tabindex="0" data-term="' + esc(key) + '"';
        if (isNew) newN++;
        if (blanks && isNew) { cls += ' is-blank'; attrs += ' data-step="' + (++blankN) + '"'; }
        out += '<span class="' + cls + '"' + attrs + '>' + esc(shown) + '</span>';
        last = m.index + m[0].length;
      }
      return out + esc(line.slice(last));
    }).join('\n');
    var title = esc(script.getAttribute('data-prompt') || 'Prompt');
    var tools = (blanks && blankN ? '<button type="button" class="copy-btn is-ghost" data-reveal-all>' + icon('eye') + 'Reveal</button>' : '') +
      '<button type="button" class="copy-btn" data-copy>' + icon('copy') + 'Copy</button>';
    box.innerHTML = '<div class="prompt__bar"><span>' + icon('message-square') + title +
      (newN ? '<em class="prompt__count">' + newN + (blanks ? ' blanks' : ' new terms') + '</em>' : '') + '</span>' +
      '<span class="prompt__tools">' + tools + '</span></div><div class="prompt__text">' + body + '</div>';
    if (blanks) box.classList.add('has-blanks');
    box.querySelector('[data-copy]').addEventListener('click', function (e) { e.stopPropagation(); copyText(raw, this); });
    var all = box.querySelector('[data-reveal-all]');
    if (all) all.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !box.classList.contains('is-revealed');
      box.classList.toggle('is-revealed', open);
      this.innerHTML = icon(open ? 'eye-off' : 'eye') + (open ? 'Hide' : 'Reveal');
    });
    $$('.pterm.is-blank', box).forEach(function (t) {
      t.addEventListener('click', function (e) { e.stopPropagation(); t.classList.toggle('is-open'); Terms.show(t); });
    });
    script.parentNode.replaceChild(box, script);
  }
  Deck.copyText = copyText;

  /* ---------- term tooltips: what one loaded word tells the AI ---------- */
  var Terms = {
    tip: null, cur: null,
    init: function () {
      this.tip = document.createElement('div');
      this.tip.className = 'term-tip';
      this.tip.setAttribute('role', 'tooltip');
      stage.appendChild(this.tip);
      var self = this;
      stage.addEventListener('mouseover', function (e) { var t = e.target.closest && e.target.closest('.pterm'); if (t) self.show(t); });
      stage.addEventListener('mouseout', function (e) { var t = e.target.closest && e.target.closest('.pterm'); if (t && !t.contains(e.relatedTarget)) self.hide(); });
      stage.addEventListener('focusin', function (e) { if (e.target.classList && e.target.classList.contains('pterm')) self.show(e.target); });
      stage.addEventListener('focusout', function (e) { if (e.target.classList && e.target.classList.contains('pterm')) self.hide(); });
      on('slide', function () { self.hide(); });
    },
    show: function (t) {
      if (!this.tip) return;
      var key = t.getAttribute('data-term'), info = termInfo(key) || {};
      var hidden = t.classList.contains('is-blank') && !t.classList.contains('is-shown') && !t.classList.contains('is-open') &&
        !t.closest('.prompt').classList.contains('is-revealed');
      var lec = info.when || (info.lec ? 'Lecture ' + pad(info.lec) : '');
      var tag = t.classList.contains('is-new') ? (hidden ? 'Recall' : 'New') : 'Known';
      this.tip.innerHTML = '<div class="term-tip__top"><b>' + (hidden ? 'Which term?' : esc(t.textContent)) + '</b><span>' + tag + (lec ? ' · ' + lec : '') + '</span></div>' +
        '<p>' + esc(info.d || 'No glossary entry yet.') + '</p>';
      var s = scale(), sr = stage.getBoundingClientRect(), r = t.getBoundingClientRect();
      var x = (r.left - sr.left) / s, y = (r.top - sr.top) / s, h = r.height / s;
      this.tip.classList.add('is-on');
      var tw = this.tip.offsetWidth, th = this.tip.offsetHeight;
      var left = Math.max(24, Math.min(W - tw - 24, x - 12));
      var top = y - th - 12;
      if (top < 24) top = y + h + 12;
      this.tip.style.left = left + 'px';
      this.tip.style.top = top + 'px';
      this.cur = t;
    },
    hide: function () { if (this.tip) this.tip.classList.remove('is-on'); this.cur = null; }
  };

  function buildCode(script) {
    var lang = script.getAttribute('data-lang') || 'tsx';
    var text = dedent(script.textContent);

    var pre = document.createElement('pre');
    pre.className = ('code ' + (script.getAttribute('class') || '')).trim();
    Array.prototype.slice.call(script.attributes).forEach(function (a) {
      if (/^data-/.test(a.name) && a.name !== 'data-lang') pre.setAttribute(a.name, a.value);
      if (a.name === 'style' || a.name === 'id') pre.setAttribute(a.name, a.value);
    });
    pre.setAttribute('data-language', lang);
    if (script.getAttribute('data-file')) {
      var file = document.createElement('div');
      file.className = 'code__file';
      file.innerHTML = icon(lang === 'bash' ? 'terminal' : 'file-code') + '<span>' + esc(script.getAttribute('data-file')) + '</span>';
      pre.appendChild(file);
    }
    var code = document.createElement('code');
    code.className = 'language-' + lang;
    code.textContent = text;
    pre.appendChild(code);
    script.parentNode.replaceChild(pre, script);
    if (window.Prism && Prism.languages[lang]) { try { Prism.highlightElement(code); } catch (e) { /* plain */ } }
    var lines = splitLines(code);
    parseRanges(pre.getAttribute('data-hl')).forEach(function (n) { if (lines[n - 1]) lines[n - 1].classList.add('is-hl', 'is-hl-base'); });
    parseRanges(pre.getAttribute('data-add')).forEach(function (n) { if (lines[n - 1]) lines[n - 1].classList.add('is-add'); });
    parseRanges(pre.getAttribute('data-del')).forEach(function (n) { if (lines[n - 1]) lines[n - 1].classList.add('is-del'); });
    /* data-copy: a Copy button for the lecturer. It copies what is on screen right now,
       so on a growing (data-build) block it copies the code up to the current step. */
    if (pre.hasAttribute('data-copy')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn code__copy';
      btn.innerHTML = icon('copy') + 'Copy';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var shown = lines.filter(function (l) { return !l.classList.contains('is-future') && !l.classList.contains('is-del'); });
        copyText(shown.map(function (l) { return l.textContent.replace(/​/g, ''); }).join('\n'), btn, 'Code copied. Paste it into VS Code.');
      });
      pre.appendChild(btn);
    }
    return pre;
  }
  function applyWalk(slide, step) {
    $$('pre.code[data-walk]', slide).forEach(function (pre) {
      var entries = pre.getAttribute('data-walk').split(';').map(function (p) {
        var bits = p.split(':'); return { step: Number(bits[0]), lines: parseRanges(bits[1]) };
      }).sort(function (a, b) { return a.step - b.step; });
      var active = null;
      entries.forEach(function (e) { if (e.step <= step) active = e; });
      var lines = $$('.line', pre);
      lines.forEach(function (l) { l.classList.remove('is-hl'); if (l.classList.contains('is-hl-base') && !active) l.classList.add('is-hl'); });
      pre.classList.toggle('is-walking', !!active);
      if (active) active.lines.forEach(function (n) { if (lines[n - 1]) lines[n - 1].classList.add('is-hl'); });
    });
  }

  /* data-build="1:1-3;2:4-6" on a code block: the code grows step by step, the way it is typed.
     Lines of later steps are folded away, lines of the current step are marked new.
     Unlisted lines are always visible. Add class "build-ghost" to show later lines faintly instead. */
  function buildMap(pre) {
    var owner = {};
    (pre.getAttribute('data-build') || '').split(';').forEach(function (p) {
      var bits = p.split(':'); if (bits.length < 2) return;
      parseRanges(bits[1]).forEach(function (n) { owner[n] = Number(bits[0]); });
    });
    return owner;
  }
  function applyBuild(slide, step) {
    $$('pre.code[data-build]', slide).forEach(function (pre) {
      var owner = buildMap(pre);
      $$('.line', pre).forEach(function (l, k) {
        var s = owner[k + 1];
        l.classList.toggle('is-future', s !== undefined && s > step);
        l.classList.toggle('is-new', s !== undefined && s === step && step > 0);
      });
    });
  }

  /* data-on="2:is-moved;4-5:is-hot" on any element: classes switched on by step, for moving
     things around (CSS transitions do the motion). "n:cls" holds from step n on, "n-m:cls" only from n to m. */
  function parseOn(str) {
    return (str || '').split(';').map(function (p) {
      var i = p.indexOf(':'); if (i < 0) return null;
      var range = p.slice(0, i).trim().split('-').map(Number);
      return { from: range[0], to: range.length > 1 ? range[1] : Infinity, cls: p.slice(i + 1).trim().split(/\s+/).filter(Boolean) };
    }).filter(Boolean);
  }
  function applyOn(slide, step) {
    $$('[data-on]', slide).forEach(function (el) {
      var all = {}, active = {};
      parseOn(el.getAttribute('data-on')).forEach(function (e) {
        e.cls.forEach(function (c) { all[c] = true; if (step >= e.from && step <= e.to) active[c] = true; });
      });
      Object.keys(all).forEach(function (c) { el.classList.toggle(c, !!active[c]); });
    });
  }

  /* data-sort="3" on a list: from step 3 its children fly into the order given by their data-pos
     (an animated "put the steps in order"). Before that step they keep the order they were written in. */
  function applySort(slide, step) {
    $$('[data-sort]', slide).forEach(function (list) {
      var want = step >= (Number(list.getAttribute('data-sort')) || 1) ? 'sorted' : 'authored';
      if (!list._authored) { list._authored = Array.prototype.slice.call(list.children); list._sortState = 'authored'; }
      if (list._sortState === want) return;
      var kids = Array.prototype.slice.call(list.children);
      var s = scale() || 1;
      var first = kids.map(function (k) { return k.getBoundingClientRect(); });
      var order = want === 'sorted'
        ? kids.slice().sort(function (a, b) { return Number(a.getAttribute('data-pos')) - Number(b.getAttribute('data-pos')); })
        : list._authored.slice();
      order.forEach(function (k) { list.appendChild(k); });
      kids.forEach(function (k, i) {
        var last = k.getBoundingClientRect();
        var dx = (first[i].left - last.left) / s, dy = (first[i].top - last.top) / s;
        if (!dx && !dy) return;
        k.style.transition = 'none';
        k.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        void k.offsetWidth;
        k.style.transition = 'transform .85s cubic-bezier(.2,.7,.2,1) ' + (order.indexOf(k) * 70) + 'ms';
        k.style.transform = '';
      });
      list._sortState = want;
      list.classList.toggle('is-sorted', want === 'sorted');
    });
  }

  /* ---------- steps ---------- */
  function maxStep(slide) {
    var max = 0;
    $$('[data-step]', slide).forEach(function (el) { max = Math.max(max, Number(el.getAttribute('data-step')) || 0); });
    $$('[data-walk]', slide).forEach(function (el) {
      el.getAttribute('data-walk').split(';').forEach(function (p) { max = Math.max(max, Number(p.split(':')[0]) || 0); });
    });
    $$('pre.code[data-build]', slide).forEach(function (pre) {
      var owner = buildMap(pre);
      Object.keys(owner).forEach(function (n) { max = Math.max(max, owner[n]); });
    });
    $$('[data-on]', slide).forEach(function (el) {
      parseOn(el.getAttribute('data-on')).forEach(function (e) { max = Math.max(max, e.from, e.to === Infinity ? 0 : e.to + 1); });
    });
    $$('[data-sort]', slide).forEach(function (el) { max = Math.max(max, Number(el.getAttribute('data-sort')) || 1); });
    return max;
  }
  function applyStep(slide, step) {
    $$('[data-step]', slide).forEach(function (el) { el.classList.toggle('is-shown', Number(el.getAttribute('data-step')) <= step); });
    applyWalk(slide, step);
    applyBuild(slide, step);
    applyOn(slide, step);
    applySort(slide, step);
    slide.setAttribute('data-step-now', step);
  }

  /* ---------- navigation ---------- */
  function go(i, opts) {
    opts = opts || {};
    i = Math.max(0, Math.min(Deck.count - 1, i));
    var prevIndex = Deck.index, prevSlide = Deck.slides[prevIndex];
    var slide = Deck.slides[i];
    var changed = prevIndex !== i || !slide.classList.contains('is-active');
    if (changed) {
      Deck.slides.forEach(function (s, k) {
        s.classList.toggle('is-active', k === i);
        s.classList.toggle('is-before', k < i);
        s.setAttribute('aria-hidden', k === i ? 'false' : 'true');
        if (opts.instant) { s.style.transition = 'none'; void s.offsetWidth; s.style.transition = ''; }
      });
      if (prevSlide && prevSlide !== slide) {
        var ph = slideHooks[prevSlide.id];
        if (ph && ph.leave) { try { ph.leave(prevSlide); } catch (e) { console.error(e); } }
      }
    }
    Deck.index = i;
    var ms = maxStep(slide);
    Deck.step = opts.step === 'max' ? ms : Math.min(ms, Number(opts.step) || 0);
    applyStep(slide, Deck.step);
    if (changed) {
      var h = slideHooks[slide.id];
      if (h && h.enter) { try { h.enter(slide); } catch (e) { console.error(e); } }
      emit('slide', slide, i);
    }
    var hs = slideHooks[slide.id];
    if (hs && hs.step) { try { hs.step(slide, Deck.step); } catch (e) { console.error(e); } }
    emit('step', slide, Deck.step);
    updateChrome();
    try { history.replaceState(null, '', '#' + (i + 1)); } catch (e) { location.hash = String(i + 1); }
    renderNotes();
    renderPresenter();
  }
  function next() {
    var slide = Deck.slides[Deck.index];
    if (Deck.step < maxStep(slide)) { Deck.step++; applyStep(slide, Deck.step); var h = slideHooks[slide.id]; if (h && h.step) h.step(slide, Deck.step); emit('step', slide, Deck.step); renderPresenter(); }
    else if (Deck.index < Deck.count - 1) go(Deck.index + 1);
  }
  function prev() {
    var slide = Deck.slides[Deck.index];
    if (Deck.step > 0) { Deck.step--; applyStep(slide, Deck.step); var h = slideHooks[slide.id]; if (h && h.step) h.step(slide, Deck.step); emit('step', slide, Deck.step); renderPresenter(); }
    else if (Deck.index > 0) go(Deck.index - 1, { step: 'max' });
  }

  /* ---------- chrome ---------- */
  function buildChrome() {
    var cfg = Deck.cfg;
    chromeEl = document.createElement('div');
    chromeEl.className = 'chrome';
    var phases = (cfg.phases || []).map(function (p) { return '<li data-phase="' + p.id + '">' + esc(p.label) + '</li>'; }).join('');
    chromeEl.innerHTML =
      '<div class="chrome__top">' +
        '<div class="chrome__brand"><span class="chrome__code">' + esc(cfg.code || '') + '</span><ol class="rail" aria-label="Lecture structure">' + phases + '</ol></div>' +
        '<div class="chrome__right"><span class="chrome__clock" aria-label="Current time"></span>' +
          '<button class="break-btn" type="button" title="Coffee break (B)">' + icon('coffee') + '<span class="break-btn__label">Break</span></button></div>' +
      '</div>' +
      '<div class="chrome__bottom">' +
        '<div class="chrome__title">' + esc(cfg.footer || cfg.title || '') + '</div>' +
        '<div class="chrome__nav"><button type="button" data-nav="prev" aria-label="Previous">' + icon('chevron-left') + '</button>' +
        '<button type="button" data-nav="next" aria-label="Next">' + icon('chevron-right') + '</button><span class="chrome__count"></span></div>' +
      '</div>' +
      '<div class="progress"><span></span></div>';
    stage.appendChild(chromeEl);
    railEl = $('.rail', chromeEl);
    countEl = $('.chrome__count', chromeEl);
    progressEl = $('.progress span', chromeEl);
    clockEl = $('.chrome__clock', chromeEl);
    breakBtn = $('.break-btn', chromeEl);
    breakBtn.addEventListener('click', function () { Break.toggle(); });
    $('[data-nav="prev"]', chromeEl).addEventListener('click', prev);
    $('[data-nav="next"]', chromeEl).addEventListener('click', next);
    var tick = function () { clockEl.textContent = clock(); };
    tick(); setInterval(tick, 10000);
  }
  function updateChrome() {
    var slide = Deck.slides[Deck.index];
    stage.setAttribute('data-tone', slide.getAttribute('data-tone') || 'light');
    deckEl.classList.toggle('no-chrome', slide.hasAttribute('data-nochrome'));
    countEl.innerHTML = pad(Deck.index + 1) + '<span> / ' + pad(Deck.count) + '</span>';
    progressEl.style.width = ((Deck.index) / Math.max(1, Deck.count - 1) * 100) + '%';
    var phase = slide.getAttribute('data-phase');
    var ids = (Deck.cfg.phases || []).map(function (p) { return p.id; });
    var cur = ids.indexOf(phase), past = cur;
    if (phase === 'outro') {
      /* homework and thanks: everything up to the last phase before this slide is done */
      past = -1;
      for (var k = Deck.index - 1; k >= 0 && past < 0; k--) {
        var pk = ids.indexOf(Deck.slides[k].getAttribute('data-phase'));
        if (pk > -1) past = pk + 1;
      }
    }
    $$('li', railEl).forEach(function (li, k) {
      li.classList.toggle('is-current', k === cur);
      li.classList.toggle('is-past', past > -1 && k < past);
    });
    try { document.body.style.backgroundColor = getComputedStyle(slide).backgroundColor; } catch (e) { /* ignore */ }
  }

  /* ---------- scaling ---------- */
  function scale() { return Math.min(window.innerWidth / W, window.innerHeight / H); }
  function resize() {
    var s = scale();
    stage.style.setProperty('--scale', s);
    var bs = $('.break__stage');
    if (bs) bs.style.setProperty('--scale', s);
  }

  /* ---------- widgets ---------- */
  function initQuiz(q) {
    var opts = $$('.quiz__opt', q);
    opts.forEach(function (o, k) {
      o.type = 'button';
      o.innerHTML = '<span class="quiz__key">' + String.fromCharCode(65 + k) + '</span><span class="quiz__text">' + o.innerHTML + '</span><span class="quiz__mark">' + icon(o.hasAttribute('data-correct') ? 'circle-check' : 'circle-x') + '</span>';
      o.addEventListener('click', function () { answer(q, o); });
    });
    var reset = document.createElement('button');
    reset.type = 'button'; reset.className = 'quiz__reset'; reset.textContent = '[ reset ]';
    reset.addEventListener('click', function () {
      q.classList.remove('is-answered');
      opts.forEach(function (o) { o.classList.remove('is-correct', 'is-wrong', 'is-picked'); });
    });
    q.appendChild(reset);
  }
  function answer(q, o) {
    if (q.classList.contains('is-answered')) return;
    q.classList.add('is-answered');
    o.classList.add('is-picked');
    if (o.hasAttribute('data-correct')) { o.classList.add('is-correct'); chime(true); }
    else {
      o.classList.add('is-wrong');
      setTimeout(function () { $$('.quiz__opt[data-correct]', q).forEach(function (c) { c.classList.add('is-correct'); }); }, 650);
    }
  }

  function initOrder(box) {
    var list = $('.order__list', box);
    var items = $$('li', list);
    items.forEach(function (li) {
      li.className = 'order__item';
      li.tabIndex = 0;
      li.innerHTML = '<span class="order__grip">' + icon('grip-vertical') + '</span><span class="order__n"></span><span class="order__body">' + li.innerHTML + '</span><span class="order__mark">' + icon('circle-check') + '</span>';
      li.addEventListener('pointerdown', function (e) { dragStart(e, li, list, box); });
      li.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault(); e.stopPropagation();
          var sib = e.key === 'ArrowUp' ? li.previousElementSibling : li.nextElementSibling;
          if (sib) { if (e.key === 'ArrowUp') list.insertBefore(li, sib); else list.insertBefore(sib, li); li.focus(); clearMarks(box); }
        }
      });
    });
    numberOrder(list);
    var bar = document.createElement('div');
    bar.className = 'order__bar';
    bar.innerHTML = '<button type="button" class="btn" data-act="check">' + icon('list-checks') + 'Check order</button>' +
      '<button type="button" class="btn is-ghost" data-act="shuffle">' + icon('shuffle') + 'Shuffle</button>' +
      '<button type="button" class="btn is-ghost" data-act="solve">' + icon('eye') + 'Show answer</button>';
    box.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'check') checkOrder(box);
      if (act === 'shuffle') { shuffleOrder(list); clearMarks(box); }
      if (act === 'solve') { solveOrder(list); checkOrder(box); }
    });
  }
  function numberOrder(list) { $$('.order__item', list).forEach(function (li, k) { $('.order__n', li).textContent = pad(k + 1); }); }
  function clearMarks(box) { $$('.order__item', box).forEach(function (li) { li.classList.remove('is-right', 'is-wrongpos'); }); numberOrder($('.order__list', box)); }
  function shuffleOrder(list) {
    var items = $$('.order__item', list);
    for (var i = items.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = items[i]; items[i] = items[j]; items[j] = t; }
    items.forEach(function (li) { list.appendChild(li); });
    numberOrder(list);
  }
  function solveOrder(list) {
    $$('.order__item', list).sort(function (a, b) { return Number(a.getAttribute('data-pos')) - Number(b.getAttribute('data-pos')); })
      .forEach(function (li) { list.appendChild(li); });
    numberOrder(list);
  }
  function checkOrder(box) {
    var items = $$('.order__item', box), ok = true;
    items.forEach(function (li, k) {
      var right = Number(li.getAttribute('data-pos')) === k + 1;
      ok = ok && right;
      li.classList.toggle('is-right', right);
      li.classList.toggle('is-wrongpos', !right);
      $('.order__mark', li).innerHTML = icon(right ? 'circle-check' : 'circle-x');
    });
    numberOrder($('.order__list', box));
    if (ok) {
      chime(true);
      var termSel = box.getAttribute('data-term');
      var term = termSel ? $(termSel) : null;
      if (term) typeTerminal(term, items.map(function (li) {
        return { cmd: li.getAttribute('data-cmd') || $('.order__body', li).textContent.trim(), out: (li.getAttribute('data-out') || '').split('|').filter(Boolean) };
      }));
      box.dispatchEvent(new CustomEvent('order:solved', { bubbles: true }));
    } else toast('Not quite. Red rows are in the wrong place.');
  }
  function dragStart(e, li, list, box) {
    if (e.button !== 0) return;
    e.preventDefault();
    li.focus();
    var s = scale(), startY = e.clientY, moved = false;
    li.setPointerCapture(e.pointerId);
    li.classList.add('is-dragging');
    clearMarks(box);
    function move(ev) {
      moved = true;
      var dy = (ev.clientY - startY) / s;
      li.style.transform = 'translateY(' + dy + 'px)';
      var sib = dy < 0 ? li.previousElementSibling : li.nextElementSibling;
      if (!sib) return;
      var r = sib.getBoundingClientRect(), ri = li.getBoundingClientRect();
      var crossed = dy < 0 ? (ri.top + ri.height / 2) < (r.top + r.height / 2) : (ri.top + ri.height / 2) > (r.top + r.height / 2);
      if (!crossed) return;
      var before = li.offsetTop, sibBefore = sib.offsetTop;
      if (dy < 0) list.insertBefore(li, sib); else list.insertBefore(sib, li);
      var delta = li.offsetTop - before;
      startY += delta * s;
      li.style.transform = 'translateY(' + ((ev.clientY - startY) / s) + 'px)';
      var sd = sibBefore - sib.offsetTop;
      sib.style.transition = 'none';
      sib.style.transform = 'translateY(' + sd + 'px)';
      void sib.offsetWidth;
      sib.style.transition = 'transform .25s cubic-bezier(.2,.7,.2,1)';
      sib.style.transform = '';
      numberOrder(list);
    }
    function up() {
      li.removeEventListener('pointermove', move);
      li.removeEventListener('pointerup', up);
      li.removeEventListener('pointercancel', up);
      li.classList.remove('is-dragging');
      li.style.transition = 'transform .25s cubic-bezier(.2,.7,.2,1)';
      li.style.transform = '';
      setTimeout(function () { li.style.transition = ''; }, 260);
      numberOrder(list);
      if (!moved) return;
    }
    li.addEventListener('pointermove', move);
    li.addEventListener('pointerup', up);
    li.addEventListener('pointercancel', up);
  }
  function typeTerminal(term, rows) {
    var body = $('.term__body', term) || term;
    var prompt = term.getAttribute('data-prompt') || '$';
    body.innerHTML = '';
    var token = {}; term._token = token;
    var r = 0;
    function nextRow() {
      if (term._token !== token) return;
      if (r >= rows.length) { var done = document.createElement('div'); done.className = 'term__line'; done.innerHTML = '<span class="term__prompt">' + esc(prompt) + '</span><span class="term__caret"></span>'; body.appendChild(done); return; }
      var row = rows[r++];
      var line = document.createElement('div');
      line.className = 'term__line';
      line.innerHTML = '<span class="term__prompt">' + esc(prompt) + '</span><span class="term__cmd"></span><span class="term__caret"></span>';
      body.appendChild(line);
      var cmdEl = $('.term__cmd', line), caret = $('.term__caret', line), c = 0;
      (function typeChar() {
        if (term._token !== token) return;
        if (c <= row.cmd.length) { cmdEl.textContent = row.cmd.slice(0, c++); setTimeout(typeChar, 26 + Math.random() * 30); }
        else {
          caret.remove();
          var o = 0;
          (function outLine() {
            if (term._token !== token) return;
            if (o < row.out.length) {
              var ol = document.createElement('div'); ol.className = 'term__line term__out'; ol.textContent = row.out[o++];
              body.appendChild(ol); setTimeout(outLine, 160);
            } else setTimeout(nextRow, 380);
          })();
        }
      })();
    }
    nextRow();
  }
  Deck.typeTerminal = typeTerminal;

  function initHotspots(fig) {
    var size = (fig.getAttribute('data-size') || '1440x900').split('x');
    fig.style.setProperty('--w', size[0]); fig.style.setProperty('--h', size[1]);
    $$('.hs', fig).forEach(function (hs) {
      var b = (hs.getAttribute('data-box') || '0,0,0,0').split(',').map(Number);
      hs.style.setProperty('--x', b[0]); hs.style.setProperty('--y', b[1]);
      hs.style.setProperty('--hw', b[2]); hs.style.setProperty('--hh', b[3]);
      if (hs.tagName === 'BUTTON') hs.type = 'button';
      var name = hs.getAttribute('data-name');
      if (name && !$('.hs__tip', hs)) {
        hs.insertAdjacentHTML('beforeend', '<span class="hs__tip"><b>&lt;' + esc(name) + ' /&gt;</b><span>' + (hs.getAttribute('data-note') || (b[2] + ' × ' + b[3])) + '</span></span>');
      }
      hs.setAttribute('aria-label', name || 'region');
    });
  }

  function initFlip(f) {
    f.tabIndex = 0;
    f.setAttribute('role', 'button');
    var toggle = function () { f.classList.toggle('is-flipped'); };
    f.addEventListener('click', function (e) { if (!e.target.closest('a')) toggle(); });
    f.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); toggle(); } });
  }

  function initTimer(t) {
    var total = Number(t.getAttribute('data-timer')) || 600, left = total, end = 0, id = null;
    t.innerHTML = '<span class="timer__t">' + fmt(total) + '</span><button type="button" data-t="go" aria-label="Start timer">' + icon('play') + '</button><button type="button" class="is-ghost" data-t="reset" aria-label="Reset timer">' + icon('rotate-ccw') + '</button>';
    var out = $('.timer__t', t), goBtn = $('[data-t="go"]', t);
    function render() { out.textContent = fmt(left); }
    function stop() { clearInterval(id); id = null; t.classList.remove('is-running'); goBtn.innerHTML = icon('play'); }
    goBtn.addEventListener('click', function () {
      if (id) { left = Math.max(0, (end - Date.now()) / 1000); stop(); return; }
      if (left <= 0) left = total;
      t.classList.remove('is-done'); t.classList.add('is-running'); goBtn.innerHTML = icon('pause');
      end = Date.now() + left * 1000;
      id = setInterval(function () {
        left = Math.max(0, (end - Date.now()) / 1000); render();
        if (left <= 0) { stop(); t.classList.add('is-done'); chime(); }
      }, 250);
    });
    $('[data-t="reset"]', t).addEventListener('click', function () { stop(); left = total; t.classList.remove('is-done'); render(); });
  }

  function initTabs(tabs) {
    var btns = $$('.tabs__btn', tabs), panels = $$('.tabs__panel', tabs);
    function show(id) {
      btns.forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-tab') === id); });
      panels.forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-panel') === id); });
      tabs.dispatchEvent(new CustomEvent('tabs:change', { detail: id, bubbles: true }));
    }
    btns.forEach(function (b) { b.type = 'button'; b.addEventListener('click', function () { show(b.getAttribute('data-tab')); }); });
    var first = btns.filter(function (b) { return b.classList.contains('is-on'); })[0] || btns[0];
    if (first) show(first.getAttribute('data-tab'));
  }

  function initReveal(box) {
    var cover = $('.reveal-box__cover', box);
    if (!cover) return;
    cover.type = 'button';
    cover.addEventListener('click', function () { box.classList.add('is-open'); });
  }

  /* data-peek: blurred until clicked (unveil on click). A second click hides it again. */
  function initPeek(el) {
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.getAttribute('data-peek') || 'Click to reveal');
    var toggle = function () { el.classList.toggle('is-peeked'); };
    el.addEventListener('click', function (e) { if (!e.target.closest('a, .copy-btn')) toggle(); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); toggle(); } });
  }

  /* ---------- break overlay ---------- */
  var Break = {
    el: null, audio: null, end: 0, left: 0, total: 0, running: false, over: false, timer: null,
    genre: store.get('deck.genre', 'jazz'), station: store.get('deck.station', 'fip-jazz'),
    volume: store.get('deck.volume', 0.6), playing: false, localIndex: 0,

    build: function () {
      var cfg = Deck.cfg, shared = cfg.shared || '../_shared/';
      var local = (window.DECK_LOCAL_TRACKS || []).map(function (t, k) { return { id: 'local-' + k, genre: 'local', name: t.title || t.file, where: 'Local file', url: shared + 'music/' + t.file }; });
      this.stations = STATIONS.concat(local);
      this.genres = GENRES.filter(function (g) { return g.id !== 'local' || local.length; });
      var el = this.el = document.createElement('div');
      el.className = 'overlay break';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Coffee break');
      var imgs = this.genres.map(function (g) { return '<img alt="" data-genre="' + g.id + '" src="' + shared + 'img/' + g.img + '">'; }).join('');
      el.innerHTML =
        '<div class="break__bg">' + imgs + '</div><div class="break__shade"></div><div class="grain" style="position:absolute;inset:0;overflow:hidden"></div>' +
        '<div class="break__stage">' +
          '<div class="break__top"><span class="break__label">' + icon('coffee') + '<span>' + esc(cfg.code || '') + ' / Coffee break</span></span>' +
            '<span class="row" style="--gap:10px"><button class="break__close" data-b="hide" type="button">' + icon('minimize') + 'Hide</button>' +
            '<button class="break__close" data-b="end" type="button">' + icon('x') + 'End break</button></span></div>' +
          '<div class="break__main">' +
            '<div class="break__countdown stack" style="--gap:18px">' +
              '<p class="break__kicker">' + esc(cfg.breakLine || 'Stretch, refill, look away from the screen. Back in') + '</p>' +
              '<p class="break__time">10:00</p>' +
              '<div class="break__meta"><span>Back at <b class="break__back">--:--</b></span><span class="break__adj"><button type="button" data-b="minus">-1 min</button><button type="button" data-b="plus">+1 min</button></span></div>' +
            '</div>' +
            '<div class="break__welcome"><p class="break__kicker">Break is over</p><h2>Welcome back.</h2><button class="btn" data-b="resume" type="button">' + icon('arrow-right') + 'Back to the lecture</button></div>' +
          '</div>' +
          '<div class="break__player">' +
            '<button class="break__play" data-b="play" type="button" aria-label="Play or pause music">' + icon('play') + '</button>' +
            '<div class="break__now">' +
              '<div class="row" style="--gap:18px;justify-content:space-between"><div class="break__genres"></div><div class="break__status"><span class="live"></span><span class="break__status-text">Radio off</span><span class="break__eq"><i></i><i></i><i></i></span></div></div>' +
              '<div class="break__stations"></div>' +
            '</div>' +
            '<div class="break__vol">' + icon('volume-2') + '<input type="range" min="0" max="1" step="0.01" aria-label="Volume" id="break-volume"></div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(el);
      var self = this;
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-b]'); if (!b) return;
        var act = b.getAttribute('data-b');
        if (act === 'hide') self.hide();
        if (act === 'end') self.stop(true);
        if (act === 'resume') self.stop(false);
        if (act === 'minus') self.adjust(-60);
        if (act === 'plus') self.adjust(60);
        if (act === 'play') self.togglePlay();
        if (act === 'genre') self.setGenre(b.getAttribute('data-id'), true);
        if (act === 'station') self.play(b.getAttribute('data-id'));
      });
      var vol = $('#break-volume', el);
      vol.value = this.volume;
      vol.addEventListener('input', function () { self.setVolume(Number(vol.value)); });
      this.audio = new Audio();
      this.audio.preload = 'none';
      this.audio.volume = this.volume;
      this.audio.addEventListener('playing', function () { self.playing = true; self.status('Live: ' + self.current().name); self.render(); });
      this.audio.addEventListener('waiting', function () { self.status('Buffering ' + self.current().name + '...'); });
      this.audio.addEventListener('pause', function () { self.playing = false; self.render(); });
      this.audio.addEventListener('error', function () { if (!self.audio.getAttribute('src')) return; self.playing = false; self.status(self.current().name + ' is unavailable. Pick another station.'); self.render(); });
      this.audio.addEventListener('ended', function () {
        var cur = self.current();
        if (cur.genre === 'local') { var locals = self.stations.filter(function (s) { return s.genre === 'local'; }); var k = locals.indexOf(cur); self.play(locals[(k + 1) % locals.length].id); }
      });
      if (!this.stations.some(function (s) { return s.id === self.station; })) this.station = 'fip-jazz';
      if (!this.genres.some(function (g) { return g.id === self.genre; })) this.genre = 'jazz';
      this.setGenre(this.genre, false);
    },
    current: function () { var self = this; return this.stations.filter(function (s) { return s.id === self.station; })[0] || this.stations[0]; },
    status: function (t) { $('.break__status-text', this.el).textContent = t; },
    render: function () {
      var self = this;
      this.el.classList.toggle('is-playing', this.playing);
      $('.break__play', this.el).innerHTML = icon(this.playing ? 'pause' : 'play');
      $('.break__genres', this.el).innerHTML = this.genres.map(function (g) {
        return '<button type="button" data-b="genre" data-id="' + g.id + '" class="' + (g.id === self.genre ? 'is-on' : '') + '">' + esc(g.label) + '</button>';
      }).join('');
      $('.break__stations', this.el).innerHTML = this.stations.filter(function (s) { return s.genre === self.genre; }).map(function (s) {
        return '<button type="button" data-b="station" data-id="' + s.id + '" class="' + (s.id === self.station ? 'is-on' : '') + '">' + esc(s.name) + '<small>' + esc(s.where) + '</small></button>';
      }).join('');
      $$('.break__bg img', this.el).forEach(function (img) { img.classList.toggle('is-on', img.getAttribute('data-genre') === self.genre); });
      if (!this.playing && !this.audio.getAttribute('src')) this.status('Radio off. Pick a station.');
    },
    setGenre: function (g, user) {
      this.genre = g; store.set('deck.genre', g);
      this.render();
      if (user && this.playing) {
        var first = this.stations.filter(function (s) { return s.genre === g; })[0];
        if (first) this.play(first.id);
      }
    },
    play: function (id) {
      var self = this;
      this.station = id || this.station; store.set('deck.station', this.station);
      var st = this.current();
      if (st.genre !== this.genre) { this.genre = st.genre; store.set('deck.genre', st.genre); }
      this.audio.src = st.url;
      this.audio.volume = 0;
      this.status('Connecting to ' + st.name + '...');
      this.render();
      var p = this.audio.play();
      if (p && p.catch) p.catch(function () { self.playing = false; self.status('Press play to start ' + st.name + '.'); self.render(); });
      this.fade(this.volume, 1800);
    },
    togglePlay: function () {
      if (this.playing) { this.userPaused = true; this.fade(0, 600, true); }
      else { this.userPaused = false; this.play(this.station); }
    },
    fade: function (to, ms, pauseAfter) {
      var a = this.audio, from = a.volume, t0 = performance.now(), self = this;
      cancelAnimationFrame(this._fade);
      (function stepFade(now) {
        var k = Math.min(1, (now - t0) / ms);
        a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
        if (k < 1) self._fade = requestAnimationFrame(stepFade);
        else if (pauseAfter) { a.pause(); a.removeAttribute('src'); a.load(); self.playing = false; self.render(); self.status('Radio off. Pick a station.'); }
      })(t0);
    },
    setVolume: function (v) { this.volume = v; store.set('deck.volume', v); cancelAnimationFrame(this._fade); this.audio.volume = v; },
    open: function (startIfIdle) {
      if (!this.el) this.build();
      this.el.classList.add('is-open');
      resize();
      if (!this.running && !this.over && startIfIdle !== false) { this.userPaused = false; this.start((Deck.cfg.breakMinutes || 10) * 60); }
      if (!this.playing && !this.userPaused && startIfIdle !== false && !this.over) this.play(this.station);
      this.render();
    },
    hide: function () { if (this.el) this.el.classList.remove('is-open'); },
    isOpen: function () { return this.el && this.el.classList.contains('is-open'); },
    toggle: function () { if (this.isOpen()) this.hide(); else this.open(true); },
    start: function (sec) {
      var self = this;
      this.total = sec; this.left = sec; this.end = Date.now() + sec * 1000; this.running = true; this.over = false;
      this.el.classList.remove('is-over', 'is-last-minute');
      clearInterval(this.timer);
      this.timer = setInterval(function () { self.tick(); }, 250);
      this.tick();
    },
    adjust: function (d) {
      if (!this.running) return;
      this.end = Math.max(Date.now() + 5000, this.end + d * 1000);
      this.tick();
    },
    tick: function () {
      this.left = Math.max(0, (this.end - Date.now()) / 1000);
      $('.break__time', this.el).textContent = fmt(this.left);
      $('.break__back', this.el).textContent = clock(new Date(this.end));
      this.el.classList.toggle('is-last-minute', this.left <= 60);
      breakBtn.classList.add('is-running');
      $('.break-btn__label', breakBtn).innerHTML = '<span class="break-btn__time">' + fmt(this.left) + '</span>';
      renderPresenter();
      if (this.left <= 0) this.finish();
    },
    finish: function () {
      clearInterval(this.timer); this.running = false; this.over = true;
      this.el.classList.add('is-over');
      this.open(false);
      chime();
      if (this.playing) this.fade(0, 6000, true);
      breakBtn.classList.remove('is-running');
      $('.break-btn__label', breakBtn).textContent = 'Break';
    },
    stop: function (fadeMusic) {
      clearInterval(this.timer); this.running = false; this.over = false;
      if (this.playing) this.fade(0, fadeMusic ? 1500 : 800, true);
      this.el.classList.remove('is-over', 'is-last-minute');
      this.hide();
      breakBtn.classList.remove('is-running');
      $('.break-btn__label', breakBtn).textContent = 'Break';
      renderPresenter();
    }
  };
  Deck.break = Break;

  /* ---------- overview / help / notes ---------- */
  function buildOverlays() {
    overviewEl = document.createElement('div');
    overviewEl.className = 'overlay overview';
    document.body.appendChild(overviewEl);
    overviewEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-go]');
      if (b) { go(Number(b.getAttribute('data-go'))); toggleOverview(false); }
      else if (e.target === overviewEl) toggleOverview(false);
    });

    helpEl = document.createElement('div');
    helpEl.className = 'overlay help';
    var rows = [['Next / previous', '&rarr; &larr; Space PgDn PgUp'], ['First / last slide', 'Home End'], ['Coffee break overlay', 'B'], ['Slide overview', 'O'],
      ['Speaker notes on screen', 'N'], ['Presenter window', 'P'], ['Fullscreen', 'F'], ['Hide the chrome', 'C'], ['Quiz answer A&ndash;D', '1 2 3 4'], ['Close any overlay', 'Esc']];
    helpEl.innerHTML = '<div class="help__box"><h2>Keyboard</h2>' + rows.map(function (r) { return '<div class="help__row"><span>' + r[0] + '</span><span class="kbd">' + r[1] + '</span></div>'; }).join('') + '</div>';
    document.body.appendChild(helpEl);
    helpEl.addEventListener('click', function () { helpEl.classList.remove('is-open'); });

    notesEl = document.createElement('div');
    notesEl.className = 'notes-drawer';
    stage.appendChild(notesEl);

    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    document.body.appendChild(toastEl);
  }
  function toggleOverview(force) {
    var open = force === undefined ? !overviewEl.classList.contains('is-open') : force;
    if (open) {
      var phases = {};
      (Deck.cfg.phases || []).forEach(function (p) { phases[p.id] = p.label; });
      overviewEl.innerHTML = '<div class="overview__head"><span>' + esc(Deck.cfg.title || '') + ' / ' + Deck.count + ' slides</span><span>Esc to close</span></div><div class="overview__grid">' +
        Deck.slides.map(function (s, k) {
          return '<button type="button" class="overview__item' + (k === Deck.index ? ' is-current' : '') + '" data-go="' + k + '"><small>' + pad(k + 1) + ' / ' + esc(phases[s.getAttribute('data-phase')] || s.getAttribute('data-phase') || '') + '</small><span>' + esc(titleOf(s)) + '</span></button>';
        }).join('') + '</div>';
    }
    overviewEl.classList.toggle('is-open', open);
  }
  function titleOf(s) {
    if (!s) return '';
    return s.getAttribute('data-title') || ((s.querySelector('h1, h2, h3, .display, .h1, .h2, .h3') || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }
  function renderNotes() {
    if (!notesEl) return;
    var n = $('.notes', Deck.slides[Deck.index]);
    notesEl.innerHTML = '<h2>Notes / ' + pad(Deck.index + 1) + ' ' + esc(titleOf(Deck.slides[Deck.index])) + '</h2>' + (n ? n.innerHTML : '<p>No notes for this slide.</p>');
  }

  /* ---------- presenter window ---------- */
  function openPresenter() {
    try {
      presenter = window.open('', 'deck-presenter', 'width=1000,height=680');
      if (!presenter) { toast('The popup was blocked. Allow popups for this file to use presenter view.'); return; }
      var d = presenter.document;
      d.open();
      d.write('<!doctype html><html><head><meta charset="utf-8"><title>Presenter / ' + esc(Deck.cfg.title || '') + '</title><style>' +
        'body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#111316;color:#e9ebee;display:grid;grid-template-rows:auto 1fr auto;height:100vh}' +
        'header{display:flex;justify-content:space-between;align-items:center;padding:16px 22px;background:#1a1d22;font:600 13px/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#9aa3ad}' +
        'header b{color:#fff;font-size:22px;letter-spacing:.04em}main{display:grid;grid-template-columns:2fr 1fr;gap:0;min-height:0}' +
        '.notes{padding:22px 26px;overflow:auto;font-size:19px}.notes p,.notes li{margin:0 0 12px}.notes b{color:#7ee2b8}.notes code{font:15px ui-monospace,monospace;background:#232830;padding:1px 6px;border-radius:5px}.notes h1{font-size:26px;margin:0 0 6px;color:#fff}.notes .ph{font:600 12px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#7ee2b8;margin-bottom:16px}' +
        'aside{background:#16191d;padding:22px 24px;display:flex;flex-direction:column;gap:18px}aside small{display:block;font:600 11px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#7c858f;margin-bottom:6px}' +
        'aside .v{font-size:20px;color:#fff}aside .big{font:600 44px/1 ui-monospace,monospace;color:#fff}footer{display:flex;gap:8px;padding:12px 22px;background:#1a1d22}' +
        'button{font:600 13px/1 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;border:0;border-radius:10px;padding:12px 16px;background:#2a2f36;color:#fff;cursor:pointer}button:hover{background:#3a414a}' +
        '</style></head><body><header><span>Presenter view</span><b data-p="count"></b><span data-p="clock"></span></header><main><div class="notes"><div class="ph" data-p="phase"></div><h1 data-p="title"></h1><div data-p="notes"></div></div>' +
        '<aside><div><small>Next slide</small><div class="v" data-p="next"></div></div><div><small>Lecture time</small><div class="big" data-p="elapsed"></div></div><div><small>Step</small><div class="v" data-p="step"></div></div><div><small>Break</small><div class="v" data-p="break"></div></div></aside></main>' +
        '<footer><button data-a="prev">Prev</button><button data-a="next">Next</button><button data-a="break">Break</button><button data-a="reset">Reset lecture timer</button></footer></body></html>');
      d.close();
      d.addEventListener('keydown', onKey);
      d.addEventListener('click', function (e) {
        var b = e.target.closest('[data-a]'); if (!b) return;
        var a = b.getAttribute('data-a');
        if (a === 'prev') prev(); if (a === 'next') next(); if (a === 'break') Break.toggle(); if (a === 'reset') { startedAt = Date.now(); renderPresenter(); }
      });
      renderPresenter();
    } catch (e) { toast('Presenter view is not available here. Use N for notes.'); }
  }
  function renderPresenter() {
    if (!presenter || presenter.closed) return;
    try {
      var d = presenter.document, s = Deck.slides[Deck.index], nx = Deck.slides[Deck.index + 1];
      var set = function (k, v, html) { var el = d.querySelector('[data-p="' + k + '"]'); if (el) { if (html) el.innerHTML = v; else el.textContent = v; } };
      var phases = {}; (Deck.cfg.phases || []).forEach(function (p) { phases[p.id] = p.label; });
      set('count', pad(Deck.index + 1) + ' / ' + pad(Deck.count));
      set('clock', clock());
      set('phase', phases[s.getAttribute('data-phase')] || s.getAttribute('data-phase') || '');
      set('title', titleOf(s));
      var n = $('.notes', s); set('notes', n ? n.innerHTML : '<p style="color:#7c858f">No notes for this slide.</p>', true);
      set('next', nx ? pad(Deck.index + 2) + ' ' + titleOf(nx) : 'End of deck');
      set('elapsed', fmt((Date.now() - startedAt) / 1000));
      set('step', Deck.step + ' / ' + maxStep(s));
      set('break', Break.running ? fmt(Break.left) + ' left' : 'Not running');
    } catch (e) { presenter = null; }
  }

  /* ---------- input ---------- */
  function isTyping(e) {
    var t = e.target;
    if (!t || !t.closest) return false;
    return !!t.closest('input, textarea, select, [contenteditable="true"], [data-keys-local]');
  }
  function onKey(e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (Break.isOpen()) {
      if (k === 'Escape' || k === 'b' || k === 'B') { e.preventDefault(); Break.hide(); }
      else if (k === ' ' && !isTyping(e)) { e.preventDefault(); if (!Break.over) Break.togglePlay(); }
      else if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); var v = Math.max(0, Math.min(1, Break.volume + (k === 'ArrowUp' ? .05 : -.05))); Break.setVolume(v); $('#break-volume').value = v; }
      else if (k === '+' || k === '=') Break.adjust(60);
      else if (k === '-') Break.adjust(-60);
      else if (k === 'e' || k === 'E') Break.stop(true);
      return;
    }
    if (isTyping(e)) { if (k === 'Escape') e.target.blur(); return; }
    if (overviewEl.classList.contains('is-open')) { if (k === 'Escape' || k === 'o' || k === 'O') toggleOverview(false); return; }
    if (helpEl.classList.contains('is-open')) { helpEl.classList.remove('is-open'); return; }
    switch (k) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': e.preventDefault(); prev(); break;
      case 'Home': e.preventDefault(); go(0); break;
      case 'End': e.preventDefault(); go(Deck.count - 1); break;
      case 'f': case 'F': toggleFullscreen(); break;
      case 'o': case 'O': toggleOverview(); break;
      case 'b': case 'B': Break.open(true); break;
      case 'n': case 'N': notesEl.classList.toggle('is-open'); break;
      case 'p': case 'P': openPresenter(); break;
      case 'c': case 'C': deckEl.classList.toggle('no-chrome'); break;
      case '?': case 'h': case 'H': helpEl.classList.add('is-open'); break;
      case 'Escape': notesEl.classList.remove('is-open'); break;
      case '1': case '2': case '3': case '4':
        var q = $$('.quiz:not(.is-answered)', Deck.slides[Deck.index])[0];
        if (q) { var o = $$('.quiz__opt', q)[Number(k) - 1]; if (o) answer(q, o); }
        break;
    }
  }
  function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () { toast('Fullscreen was refused by the browser.'); });
      else document.exitFullscreen();
    } catch (e) { toast('Fullscreen is not available here.'); }
  }
  function bindInput() {
    document.addEventListener('keydown', onKey);
    var sx = 0, sy = 0, st = 0, blocked = false;
    stage.addEventListener('touchstart', function (e) {
      var t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now();
      blocked = !!e.target.closest('.order, input, textarea, .no-swipe, [data-keys-local]');
    }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (blocked) return;
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Date.now() - st < 600 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) next(); else prev(); }
    }, { passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('hashchange', function () {
      var n = parseInt(location.hash.slice(1), 10);
      if (n && n - 1 !== Deck.index) go(n - 1);
    });
    setInterval(renderPresenter, 1000);
  }

  /* ---------- init ---------- */
  function init(cfg) {
    Deck.cfg = cfg || {};
    deckEl = $('.deck');
    stage = $('.stage', deckEl);
    hydrateIcons(document);
    $$('script[type="text/plain"][data-lang]').forEach(buildCode);
    $$('script[type="text/plain"][data-prompt]').forEach(buildPrompt);
    Deck.slides = $$('.slide', stage);
    Deck.count = Deck.slides.length;
    Deck.slides.forEach(function (s, k) {
      if (!s.id) s.id = 's' + (k + 1);
      var credit = s.getAttribute('data-credit');
      if (credit) s.insertAdjacentHTML('beforeend', '<div class="credit">' + esc(credit) + '</div>');
    });
    $$('[data-quiz]').forEach(initQuiz);
    $$('[data-order]').forEach(initOrder);
    $$('[data-hotspots]').forEach(initHotspots);
    $$('[data-flip]').forEach(initFlip);
    $$('[data-timer]').forEach(initTimer);
    $$('[data-tabs]').forEach(initTabs);
    $$('[data-reveal]').forEach(initReveal);
    $$('[data-peek]').forEach(initPeek);
    buildChrome();
    buildOverlays();
    Terms.init();
    bindInput();
    resize();
    var n = parseInt(location.hash.slice(1), 10);
    go(n ? n - 1 : 0, { instant: true });
    document.documentElement.classList.add('deck-ready');
  }
})();
