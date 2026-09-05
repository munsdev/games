/* Wiring: bake the art, own the screen state, route input, run the loop. */
(function (PW) {
  'use strict';

  var BEST_KEY = 'perpwalk.best';
  var RETRY_DELAY = 0.6;   // seconds of dead time before SPACE retries

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

  var ui = {
    screen: 'select',
    selectIndex: 0,
    best: readBest(),
    clock: 0,
    pop: 0,
    shake: 0,
    fresh: false,
    dust: dust
  };

  var game = PW.newGame(0);
  var lastPhase = '';
  var lastScore = -1;

  function readBest() {
    try {
      var v = parseInt(window.localStorage.getItem(BEST_KEY), 10);
      return isFinite(v) && v > 0 ? v : 0;
    } catch (e) { return 0; }
  }

  function writeBest(v) {
    try { window.localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* private mode */ }
  }

  function say(msg) { if (live) live.textContent = msg; }

  // ------------------------------------------------------------ commands ---

  function startRun(index) {
    ui.screen = 'game';
    ui.fresh = false;
    game = PW.newGame(index);
    dust.clear();
    lastPhase = '';
    lastScore = -1;
    audio.start();
    say(PW.PLAYERS[index].name + ' selected. Press an arrow key to set off.');
  }

  function backToSelect() {
    ui.screen = 'select';
    dust.clear();
    lastPhase = '';
    say('Choose your officer.');
  }

  function retry() {
    startRun(game.player);
  }

  function confirmOrRetry() {
    audio.wake();
    if (ui.screen === 'select') { startRun(ui.selectIndex); return; }
    if (game.phase === 'dead' || game.phase === 'cleared') {
      if (game.t >= RETRY_DELAY) retry();
      return;
    }
    if (PW.begin(game)) audio.start();
  }

  function steer(dx, dy) {
    audio.wake();
    if (ui.screen === 'select') {
      if (dx !== 0) {
        ui.selectIndex = (ui.selectIndex + dx + PW.PLAYERS.length) % PW.PLAYERS.length;
        audio.turn();
        say(PW.PLAYERS[ui.selectIndex].name);
      }
      return;
    }
    if (game.phase === 'dead' || game.phase === 'cleared') {
      if (game.t >= RETRY_DELAY) retry();
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
    var key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;

    if (key === 'm') { audio.toggle(); return; }
    if (key === 'r') {
      if (ui.screen === 'game') { ev.preventDefault(); retry(); }
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
      // Clicking a portrait picks that officer and starts immediately.
      var slot = (PW.VIEW.width - PW.VIEW.px * 2) / PW.PLAYERS.length;
      var idx = Math.floor((p.x - PW.VIEW.px) / slot);
      if (idx >= 0 && idx < PW.PLAYERS.length) {
        ui.selectIndex = idx;
        startRun(idx);
      } else {
        startRun(ui.selectIndex);
      }
      return;
    }

    if (game.phase !== 'playing') { confirmOrRetry(); return; }

    // Steer toward wherever was tapped, relative to the head.
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

  // ---------------------------------------------------------------- loop ---

  function consumeEvents() {
    for (var i = 0; i < game.events.length; i += 1) {
      var e = game.events[i];
      if (e.type === 'turn') {
        audio.turn();
      } else if (e.type === 'collar') {
        audio.collar();
        ui.pop = 1;
        dust.burst(
          PW.VIEW.px + e.x * PW.VIEW.cell + PW.VIEW.cell / 2,
          PW.VIEW.py + e.y * PW.VIEW.cell + PW.VIEW.cell / 2,
          PW.UI.accent, 1.2
        );
        if (e.score > ui.best) { ui.best = e.score; writeBest(e.score); ui.fresh = true; }
      } else if (e.type === 'bust') {
        audio.bust();
        ui.shake = 4;
        dust.burst(
          PW.VIEW.px + Math.max(0, Math.min(PW.COLS - 1, e.x)) * PW.VIEW.cell + PW.VIEW.cell / 2,
          PW.VIEW.py + Math.max(0, Math.min(PW.ROWS - 1, e.y)) * PW.VIEW.cell + PW.VIEW.cell / 2,
          PW.UI.danger, 1.8
        );
      } else if (e.type === 'cleared') {
        audio.collar();
      }
    }
    game.events.length = 0;
  }

  function announce() {
    if (game.phase !== lastPhase) {
      lastPhase = game.phase;
      if (game.phase === 'playing') say('Walking.');
      if (game.phase === 'cleared') say('Lot cleared. All ' + game.score + ' in the line.');
      if (game.phase === 'dead') {
        say(game.score + ' busted' + (ui.best > 0 ? ', best ' + ui.best : '') + '. Press space to go again.');
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

  say('Choose your officer.');
  PW.runLoop(update, render);
})(window.PW);
