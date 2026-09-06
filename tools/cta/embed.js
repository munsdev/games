/* On the List — Casey The American embed controller.

   The standalone page has src/main.js; this is its counterpart for the CTA
   embed, built against the minigame contract: the canvas is the machine, and
   the title, pause and result screens are DOM overlays inside .gm-root.

   window.OnTheList.init(root, base) — guards on root.dataset.booted, finds
   elements via [data-el], reads its palette from the CSS tokens so a CMS theme
   override reaches the canvas too. */
(function (PW) {
  'use strict';

  var BEST_KEY = 'otl.best';
  var RETRY_DELAY = 0.6;

  window.OnTheList = window.OnTheList || {};

  window.OnTheList.init = function (root, base) {
    if (!root || root.dataset.booted) return;
    root.dataset.booted = '1';

    var CONFIG = {
      /* CMS-bound: Webflow fills the ''; empty falls through to the default. */
      rewardCode: '' /*CMS:reward-code*/ || '',
      rewardLink: '' /*CMS:reward-link*/ || '',
      rewardDesc: '' /*CMS:reward-desc*/ || '',
      copiedMsg:  '' /*CMS:copied-msg*/  || 'Code copied'
    };

    var el = function (name) { return root.querySelector('[data-el="' + name + '"]'); };

    /* The canvas draws in JS, so it reads the same tokens the stylesheet sets.
       A CMS colour override therefore reaches the playfield, not just chrome. */
    var css = getComputedStyle(root);
    function token(name, fallback) {
      var v = css.getPropertyValue(name);
      return (v && v.trim()) || fallback;
    }
    PW.UI.void = token('--ol-void', PW.UI.void);
    PW.UI.frame = token('--ol-frame', PW.UI.frame);
    PW.UI.frameEdge = token('--ol-frame-edge', PW.UI.frameEdge);
    PW.UI.lotA = token('--ol-plaza-a', PW.UI.lotA);
    PW.UI.lotB = token('--ol-plaza-b', PW.UI.lotB);
    PW.UI.grit = [token('--ol-grit-a', PW.UI.grit[0]), token('--ol-grit-b', PW.UI.grit[1])];
    PW.UI.barBg = token('--ol-bar', PW.UI.barBg);
    PW.UI.text = token('--gm-ink', PW.UI.text);
    PW.UI.textDim = token('--gm-dim', PW.UI.textDim);
    PW.UI.accent = token('--gm-primary', PW.UI.accent);
    PW.UI.danger = token('--gm-bad', PW.UI.danger);

    PW.bakeAll();

    /* The RichText embed nests the game several levels deep; each wrapper has
       to become a full-height flex column or the stage collapses to a sliver. */
    (function () {
      var node = root.parentElement;
      for (var i = 0; node && i < 8; i += 1) {
        var tag = (node.tagName || '').toUpperCase();
        if (tag === 'BODY' || tag === 'HTML') break;
        node.style.display = 'flex';
        node.style.flexDirection = 'column';
        node.style.minHeight = '0';
        node.style.height = '100%';
        if (node.classList && node.classList.contains('games-script')) break;
        node = node.parentElement;
      }
    })();

    var stage = el('stage');

    /* The Webflow column has to have a real height of its own — 100% of nothing
       is nothing. Fall back to 80vh rather than collapsing to a sliver. */
    if (stage.getBoundingClientRect().height < 80) root.style.height = '80vh';

    var screen = PW.createScreen(stage, {
      width: PW.VIEW.width,
      height: PW.VIEW.height,
      background: PW.UI.void
    });
    var ctx = screen.ctx;
    var audio = PW.createAudio(null, null);
    var dust = PW.createDust();

    function readBest() {
      try {
        var v = parseInt(window.localStorage.getItem(BEST_KEY), 10);
        return isFinite(v) && v > 0 ? v : 0;
      } catch (e) { return 0; }
    }
    function writeBest(v) {
      try { window.localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* private mode */ }
    }

    var entries = PW.PLAYERS.map(function (d, i) {
      return { name: d.name, art: PW.art.players[i] };
    });

    var ui = {
      screen: 'game',
      chrome: false,        // title, pause and result are DOM overlays here
      entries: entries,
      selectIndex: 0,
      playerArt: entries[0].art,
      best: readBest(),
      clock: 0,
      pop: 0,
      shake: 0,
      fresh: false,
      dust: dust
    };

    var game = PW.newGame();
    var phase = 'title';       // title | playing | paused | over
    var lastPhase = '';

    // ------------------------------------------------------------ officers ---

    var pickWrap = el('officers');
    entries.forEach(function (entry, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ol-officer' + (i === 0 ? ' is-on' : '');
      var cv = document.createElement('canvas');
      cv.width = PW.SPRITE * 2;
      cv.height = PW.SPRITE * 2;
      var c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      c.drawImage(entry.art.front, 0, 0, cv.width, cv.height);
      var name = document.createElement('span');
      name.textContent = entry.name;
      btn.appendChild(cv);
      btn.appendChild(name);
      btn.addEventListener('click', function () {
        ui.selectIndex = i;
        ui.playerArt = entry.art;
        pickWrap.querySelectorAll('.ol-officer').forEach(function (b) { b.classList.remove('is-on'); });
        btn.classList.add('is-on');
        audio.steer();
      });
      pickWrap.appendChild(btn);
    });

    // -------------------------------------------------------------- overlays ---

    function show(name, on) {
      var node = el(name);
      if (node) node.hidden = !on;
    }

    function toTitle() {
      phase = 'title';
      game = PW.newGame();
      dust.clear();
      ui.fresh = false;
      show('ovTitle', true); show('ovPause', false); show('ovEnd', false);
      el('btnPause').hidden = true;
    }

    function startRun() {
      audio.wake();
      phase = 'playing';
      ui.fresh = false;
      ui.playerArt = entries[ui.selectIndex].art;
      game = PW.newGame();
      dust.clear();
      lastPhase = '';
      show('ovTitle', false); show('ovPause', false); show('ovEnd', false);
      el('btnPause').hidden = false;
      audio.start();
    }

    function pause(on) {
      if (phase !== 'playing' && phase !== 'paused') return;
      phase = on ? 'paused' : 'playing';
      show('ovPause', on);
    }

    /* Result screen, per the contract: stamp, truth, plain, receipts, reward,
       replay. Engines fill the words; the shape stays the same everywhere. */
    function finish() {
      phase = 'over';
      el('btnPause').hidden = true;
      var cleared = game.phase === 'docket';
      var n = game.score;
      el('stamp').textContent = cleared ? 'FULL DOCKET' : 'SHIFT OVER';
      el('truth').textContent = cleared
        ? 'Every name on the list is booked.'
        : 'You made ' + n + (n === 1 ? ' arrest.' : ' arrests.');
      el('plain').textContent = cleared
        ? 'There was no one left to find, which is the only way this ends.'
        : 'The column behind you is what stopped you. Every arrest made it longer.';
      var receipts = el('receipts');
      receipts.innerHTML = '';
      function receipt(label, value) {
        var s = document.createElement('span');
        s.innerHTML = label + ' <b>' + value + '</b>';
        receipts.appendChild(s);
      }
      receipt('Arrests', n);
      receipt('Best', ui.best);
      if (ui.fresh) receipt('', 'New best');
      renderReward();
      show('ovEnd', true);
    }

    /* Renders only what the CMS actually filled in; with nothing set, the
       player never learns the slot was there. */
    function renderReward() {
      var box = el('reward');
      box.innerHTML = '';
      if (!CONFIG.rewardCode && !CONFIG.rewardLink) { box.hidden = true; return; }
      box.hidden = false;
      if (CONFIG.rewardDesc) {
        var d = document.createElement('div');
        d.className = 'gm-reward-desc';
        d.textContent = CONFIG.rewardDesc;
        box.appendChild(d);
      }
      if (CONFIG.rewardCode) {
        var wrap = document.createElement('div');
        wrap.className = 'gm-code';
        wrap.appendChild(document.createTextNode(CONFIG.rewardCode));
        var copy = document.createElement('button');
        copy.type = 'button';
        copy.textContent = 'Copy';
        copy.addEventListener('click', function () {
          try { navigator.clipboard.writeText(CONFIG.rewardCode); } catch (e) { /* denied */ }
          toast(CONFIG.copiedMsg);
        });
        wrap.appendChild(copy);
        box.appendChild(wrap);
      }
      if (CONFIG.rewardLink) {
        var a = document.createElement('a');
        a.className = 'gm-btn';
        a.href = CONFIG.rewardLink;
        a.target = '_blank';
        a.rel = 'noopener';
        a.style.textDecoration = 'none';
        a.textContent = CONFIG.rewardCode ? 'Shop with it applied' : 'Shop';
        box.appendChild(a);
      }
    }

    var toastTimer = null;
    function toast(msg) {
      var t = el('toast');
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1400);
    }

    // ----------------------------------------------------------------- input ---

    function steer(dx, dy) {
      if (phase !== 'playing') return;
      audio.wake();
      if (game.phase === 'dead' || game.phase === 'docket') return;
      var wasReady = game.phase === 'ready';
      if (PW.steer(game, dx, dy) && wasReady) audio.start();
    }

    var KEYS = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0]
    };

    /* Only claim the arrow keys while a shift is actually running, so the embed
       never fights the page's own scrolling. */
    document.addEventListener('keydown', function (ev) {
      if (ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
      var key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
      if (phase === 'playing' && KEYS[key]) {
        ev.preventDefault();
        if (!ev.repeat) steer(KEYS[key][0], KEYS[key][1]);
        return;
      }
      if (key === 'Escape' && (phase === 'playing' || phase === 'paused')) pause(phase === 'playing');
    });

    stage.addEventListener('pointerdown', function (ev) {
      if (phase !== 'playing') return;
      ev.preventDefault();
      audio.wake();
      var p = screen.toBuffer(ev.clientX, ev.clientY);
      if (game.phase !== 'playing') { if (PW.begin(game)) audio.start(); return; }
      var head = game.body[0];
      var hx = PW.VIEW.px + head.x * PW.VIEW.cell + PW.VIEW.cell / 2;
      var hy = PW.VIEW.py + head.y * PW.VIEW.cell + PW.VIEW.cell / 2;
      var dx = p.x - hx, dy = p.y - hy;
      if (Math.abs(dx) < PW.VIEW.cell / 2 && Math.abs(dy) < PW.VIEW.cell / 2) return;
      if (Math.abs(dx) > Math.abs(dy)) steer(Math.sign(dx), 0);
      else steer(0, Math.sign(dy));
    });
    stage.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

    el('btnStart').addEventListener('click', startRun);
    el('btnPause').addEventListener('click', function () { pause(phase === 'playing'); });
    el('btnResume').addEventListener('click', function () { pause(false); });
    el('btnQuit').addEventListener('click', toTitle);
    el('btnReplay').addEventListener('click', startRun);
    el('btnChange').addEventListener('click', toTitle);

    root.otlReset = toTitle;
    root.otlPause = function () { pause(phase === 'playing'); };

    // ------------------------------------------------------------------ loop ---

    function consumeEvents() {
      for (var i = 0; i < game.events.length; i += 1) {
        var e = game.events[i];
        if (e.type === 'steer') {
          audio.steer();
        } else if (e.type === 'arrest') {
          audio.arrest();
          ui.pop = 1;
          dust.burst(
            PW.VIEW.px + e.x * PW.VIEW.cell + PW.VIEW.cell / 2,
            PW.VIEW.py + e.y * PW.VIEW.cell + PW.VIEW.cell / 2,
            PW.UI.accent, 1.2
          );
          if (e.score > ui.best) { ui.best = e.score; writeBest(e.score); ui.fresh = true; }
        } else if (e.type === 'stopped') {
          audio.stopped();
          if (!calm) ui.shake = 4;
          dust.burst(
            PW.VIEW.px + Math.max(0, Math.min(PW.COLS - 1, e.x)) * PW.VIEW.cell + PW.VIEW.cell / 2,
            PW.VIEW.py + Math.max(0, Math.min(PW.ROWS - 1, e.y)) * PW.VIEW.cell + PW.VIEW.cell / 2,
            PW.UI.danger, 1.8
          );
        } else if (e.type === 'docket') {
          audio.arrest();
        }
      }
      game.events.length = 0;
    }

    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var last = performance.now();

    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ui.clock += dt;

      if (phase === 'playing') {
        PW.advance(game, dt);
        consumeEvents();
        if (game.phase !== lastPhase) {
          lastPhase = game.phase;
          if (game.phase === 'dead' || game.phase === 'docket') {
            setTimeout(function () { if (phase === 'playing') finish(); }, RETRY_DELAY * 1000);
          }
        }
      }

      dust.update(dt);
      ui.pop = Math.max(0, ui.pop - dt * 3.5);
      ui.shake *= Math.max(0, 1 - 9 * dt);
      if (ui.shake < 0.05) ui.shake = 0;

      PW.draw(ctx, game, ui);
      var sx = ui.shake > 0 ? (Math.random() - 0.5) * 2 * ui.shake : 0;
      var sy = ui.shake > 0 ? (Math.random() - 0.5) * 2 * ui.shake : 0;
      screen.present(sx, sy);
      requestAnimationFrame(frame);
    }

    toTitle();
    requestAnimationFrame(frame);
  };
})(window.PW);
