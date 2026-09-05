/* Wiring: bake the art, own the screen state, route input, run the loop.

   The chosen officer persists between visits, as does a character the player
   built themselves — both in localStorage, so a shift picks up where the last
   one left off. */
(function (PW) {
  'use strict';

  var KEY_BEST = 'onthelist.best';
  var KEY_PICK = 'onthelist.pick';
  var KEY_CUSTOM = 'onthelist.custom';
  var KEY_BEST_OLD = 'perpwalk.best';   // carried over from the earlier name
  var RETRY_DELAY = 0.6;

  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var host = document.getElementById('stage');
  var live = document.getElementById('live');
  var soundBtn = document.getElementById('sound');
  var soundText = document.getElementById('soundText');

  PW.bakeAll();

  var screen = PW.createScreen(host, {
    width: PW.VIEW.width,
    height: PW.VIEW.height,
    background: PW.UI.void
  });
  var ctx = screen.ctx;
  var audio = PW.createAudio(soundBtn, soundText);
  var dust = PW.createDust();

  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }
  function drop(key) {
    try { window.localStorage.removeItem(key); } catch (e) { /* private mode */ }
  }

  function readBest() {
    var v = parseInt(read(KEY_BEST), 10);
    if (isFinite(v) && v > 0) return v;
    var old = parseInt(read(KEY_BEST_OLD), 10);
    return isFinite(old) && old > 0 ? old : 0;
  }

  function readCustom() {
    var raw = read(KEY_CUSTOM);
    if (!raw) return null;
    try {
      var d = JSON.parse(raw);
      return d && typeof d === 'object' && d.shirt ? d : null;
    } catch (e) { return null; }
  }

  var custom = readCustom();

  /* The pickable line-up: the presets, plus whatever the player built. */
  function buildEntries() {
    var list = PW.PLAYERS.map(function (d, i) {
      return { name: d.name, art: PW.art.players[i] };
    });
    if (custom) list.push({ name: custom.name || 'MINE', art: PW.bake(custom, { cuffed: false }) });
    return list;
  }

  var ui = {
    screen: 'select',
    entries: buildEntries(),
    selectIndex: 0,
    playerArt: null,
    best: readBest(),
    clock: 0,
    pop: 0,
    shake: 0,
    fresh: false,
    dust: dust
  };

  var savedPick = parseInt(read(KEY_PICK), 10);
  if (isFinite(savedPick) && savedPick >= 0 && savedPick < ui.entries.length) ui.selectIndex = savedPick;

  var game = PW.newGame();
  var lastPhase = '';
  var lastScore = -1;

  function say(msg) { if (live) live.textContent = msg; }

  // ------------------------------------------------------------ commands ---

  function startRun() {
    ui.screen = 'game';
    ui.fresh = false;
    ui.playerArt = ui.entries[ui.selectIndex].art;
    write(KEY_PICK, String(ui.selectIndex));
    game = PW.newGame();
    dust.clear();
    lastPhase = '';
    lastScore = -1;
    audio.start();
    say(ui.entries[ui.selectIndex].name + ' on duty. Steer to begin.');
  }

  function backToSelect() {
    ui.screen = 'select';
    dust.clear();
    lastPhase = '';
    say('Choose who is serving the warrant.');
  }

  function confirmOrRetry() {
    audio.wake();
    if (ui.screen === 'select') { startRun(); return; }
    if (game.phase === 'dead' || game.phase === 'docket') {
      if (game.t >= RETRY_DELAY) startRun();
      return;
    }
    if (PW.begin(game)) audio.start();
  }

  function steer(dx, dy) {
    audio.wake();
    if (ui.screen === 'select') {
      if (dx !== 0) {
        ui.selectIndex = (ui.selectIndex + dx + ui.entries.length) % ui.entries.length;
        audio.steer();
        say(ui.entries[ui.selectIndex].name);
      }
      return;
    }
    if (game.phase === 'dead' || game.phase === 'docket') {
      if (game.t >= RETRY_DELAY) startRun();
      return;
    }
    var wasReady = game.phase === 'ready';
    if (PW.steer(game, dx, dy) && wasReady) audio.start();
  }

  // --------------------------------------------------------------- input ---

  var KEYS = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0]
  };

  document.addEventListener('keydown', function (ev) {
    if (ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    var key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;

    if (key === 'm') { audio.toggle(); return; }
    if (key === 'r') {
      if (ui.screen === 'game') { ev.preventDefault(); startRun(); }
      return;
    }
    if (key === 'c') {
      if (ui.screen === 'game') { ev.preventDefault(); backToSelect(); }
      return;
    }

    var dir = KEYS[key];
    if (dir) {
      ev.preventDefault();
      if (ev.repeat) return;
      steer(dir[0], dir[1]);
      return;
    }

    if (key === ' ' || key === 'Enter') {
      ev.preventDefault();
      if (ev.repeat) return;
      confirmOrRetry();
    }
  });

  host.addEventListener('pointerdown', function (ev) {
    ev.preventDefault();
    audio.wake();
    var p = screen.toBuffer(ev.clientX, ev.clientY);

    if (ui.screen === 'select') {
      var slot = (PW.VIEW.width - PW.VIEW.px * 2) / ui.entries.length;
      var idx = Math.floor((p.x - PW.VIEW.px) / slot);
      if (idx >= 0 && idx < ui.entries.length) ui.selectIndex = idx;
      startRun();
      return;
    }

    if (game.phase !== 'playing') { confirmOrRetry(); return; }

    var head = game.body[0];
    var hx = PW.VIEW.px + head.x * PW.VIEW.cell + PW.VIEW.cell / 2;
    var hy = PW.VIEW.py + head.y * PW.VIEW.cell + PW.VIEW.cell / 2;
    var dx = p.x - hx;
    var dy = p.y - hy;
    if (Math.abs(dx) < PW.VIEW.cell / 2 && Math.abs(dy) < PW.VIEW.cell / 2) return;
    if (Math.abs(dx) > Math.abs(dy)) steer(Math.sign(dx), 0);
    else steer(0, Math.sign(dy));
  });

  host.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

  // ------------------------------------------------- the player's own one ---

  /* The "make your own" panel on the page calls these. Saving swaps the
     line-up in place and jumps the selection to the new character. */
  PW.player = {
    get: function () { return custom; },
    save: function (def) {
      custom = def;
      write(KEY_CUSTOM, JSON.stringify(def));
      ui.entries = buildEntries();
      ui.selectIndex = ui.entries.length - 1;
      write(KEY_PICK, String(ui.selectIndex));
      if (ui.screen === 'game') ui.playerArt = ui.entries[ui.selectIndex].art;
      backToSelect();
      return custom;
    },
    clear: function () {
      custom = null;
      drop(KEY_CUSTOM);
      ui.entries = buildEntries();
      if (ui.selectIndex >= ui.entries.length) ui.selectIndex = 0;
      write(KEY_PICK, String(ui.selectIndex));
      backToSelect();
    }
  };

  // ---------------------------------------------------------------- loop ---

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
        if (e.score > ui.best) { ui.best = e.score; write(KEY_BEST, String(e.score)); ui.fresh = true; }
      } else if (e.type === 'stopped') {
        audio.stopped();
        ui.shake = calm ? 0 : 4;
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

  function announce() {
    if (game.phase !== lastPhase) {
      lastPhase = game.phase;
      if (game.phase === 'playing') say('On patrol.');
      if (game.phase === 'docket') say('Full docket. All ' + game.score + ' booked.');
      if (game.phase === 'dead') {
        say(game.score + ' arrests' + (ui.best > 0 ? ', best ' + ui.best : '') + '. Press space for another shift.');
      }
      return;
    }
    if (game.phase === 'playing' && game.score !== lastScore) {
      lastScore = game.score;
      if (game.score > 0) say(String(game.score));
    }
  }

  function update(dt) {
    ui.clock += dt;
    if (ui.screen === 'game') {
      PW.advance(game, dt);
      consumeEvents();
      announce();
    }
    dust.update(dt);
    ui.pop = Math.max(0, ui.pop - dt * 3.5);
    ui.shake *= Math.max(0, 1 - 9 * dt);
    if (ui.shake < 0.05) ui.shake = 0;
  }

  function render() {
    PW.draw(ctx, game, ui);
    var sx = ui.shake > 0 ? (Math.random() - 0.5) * 2 * ui.shake : 0;
    var sy = ui.shake > 0 ? (Math.random() - 0.5) * 2 * ui.shake : 0;
    screen.present(sx, sy);
  }

  say('Choose who is serving the warrant.');
  PW.runLoop(update, render);
})(window.PW);
