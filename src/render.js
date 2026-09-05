/* Everything that puts pixels on the buffer: the plaza, the column, the HUD
   and the full-screen states (who's serving, shift start, shift over). */
(function (PW) {
  'use strict';

  var CELL = 24;
  var BORDER = 5;
  var HUD_H = 26;
  var FOOT_H = 6;

  var PLAY_W = PW.COLS * CELL;
  var PLAY_H = PW.ROWS * CELL;

  PW.VIEW = {
    cell: CELL,
    width: PLAY_W + BORDER * 2,
    height: HUD_H + PLAY_H + BORDER * 2 + FOOT_H,
    px: BORDER,
    py: HUD_H + BORDER
  };

  var V = PW.VIEW;
  var lotTile = null;

  // ------------------------------------------------------------- the lot ---

  function buildLot() {
    var cv = document.createElement('canvas');
    cv.width = PLAY_W + BORDER * 2;
    cv.height = PLAY_H + BORDER * 2;
    var c = cv.getContext('2d');

    c.fillStyle = PW.UI.frame;
    c.fillRect(0, 0, cv.width, cv.height);
    c.fillStyle = PW.UI.frameEdge;
    c.fillRect(0, 0, cv.width, 1);
    c.fillRect(0, cv.height - 1, cv.width, 1);
    c.fillRect(0, 0, 1, cv.height);
    c.fillRect(cv.width - 1, 0, 1, cv.height);

    for (var y = 0; y < PW.ROWS; y += 1) {
      for (var x = 0; x < PW.COLS; x += 1) {
        c.fillStyle = (x + y) % 2 === 0 ? PW.UI.lotA : PW.UI.lotB;
        c.fillRect(BORDER + x * CELL, BORDER + y * CELL, CELL, CELL);
      }
    }

    // A light scatter of grit so the asphalt isn't a flat checkerboard.
    for (var i = 0; i < PLAY_W * PLAY_H * 0.04; i += 1) {
      var gx = BORDER + Math.floor(Math.random() * PLAY_W);
      var gy = BORDER + Math.floor(Math.random() * PLAY_H);
      c.fillStyle = PW.UI.grit[Math.random() < 0.5 ? 0 : 1];
      c.fillRect(gx, gy, 1, 1);
    }

    c.fillStyle = PW.UI.frameEdge;
    c.fillRect(BORDER - 1, BORDER - 1, PLAY_W + 2, 1);
    c.fillRect(BORDER - 1, BORDER + PLAY_H, PLAY_W + 2, 1);
    c.fillRect(BORDER - 1, BORDER - 1, 1, PLAY_H + 2);
    c.fillRect(BORDER + PLAY_W, BORDER - 1, 1, PLAY_H + 2);

    return cv;
  }

  // ----------------------------------------------------------- particles ---

  PW.createDust = function () {
    var bits = [];
    return {
      burst: function (x, y, color, power) {
        var n = Math.round(8 * (power || 1));
        for (var i = 0; i < n; i += 1) {
          var a = Math.random() * Math.PI * 2;
          var sp = (20 + Math.random() * 60) * (power || 1);
          bits.push({
            x: x, y: y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - 20,
            life: 0.3 + Math.random() * 0.4,
            age: 0,
            color: color
          });
        }
      },
      update: function (dt) {
        for (var i = bits.length - 1; i >= 0; i -= 1) {
          var b = bits[i];
          b.age += dt;
          if (b.age >= b.life) { bits.splice(i, 1); continue; }
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.vy += 140 * dt;
        }
      },
      clear: function () { bits.length = 0; },
      draw: function (ctx) {
        for (var i = 0; i < bits.length; i += 1) {
          var b = bits[i];
          ctx.fillStyle = b.color;
          ctx.fillRect(Math.round(b.x), Math.round(b.y), 2, 2);
        }
      }
    };
  };

  // ------------------------------------------------------------ helpers ---

  function cellX(x) { return V.px + x * CELL; }
  function cellY(y) { return V.py + y * CELL; }

  function facingFor(seg, fallbackDir) {
    var dx = seg.x - seg.px;
    var dy = seg.y - seg.py;
    if (dx === 0 && dy === 0) { dx = fallbackDir.x; dy = fallbackDir.y; }
    if (dx !== 0) return { key: 'side', flip: dx < 0 };
    if (dy < 0) return { key: 'back', flip: false };
    return { key: 'front', flip: false };
  }

  function panel(ctx, y, h) {
    ctx.fillStyle = 'rgba(8, 11, 17, 0.86)';
    ctx.fillRect(V.px, y, PLAY_W, h);
    ctx.fillStyle = PW.UI.frameEdge;
    ctx.fillRect(V.px, y, PLAY_W, 1);
    ctx.fillRect(V.px, y + h - 1, PLAY_W, 1);
  }

  // -------------------------------------------------------------- pieces ---

  function drawTarget(ctx, g, clock) {
    if (!g.target) return;
    var art = PW.art.execs[g.target.exec];
    var x = cellX(g.target.x);
    var y = cellY(g.target.y);
    var bob = Math.round(Math.sin(clock * 5) * 1.4);
    var alpha = 0.42 + Math.sin(clock * 6) * 0.26;

    // Corner brackets, so the next pickup is easy to spot mid-run.
    ctx.fillStyle = 'rgba(245, 185, 66, ' + alpha.toFixed(2) + ')';
    var L = 5, e = CELL;
    var marks = [
      [-1, -1, L, 1], [-1, -1, 1, L],
      [e + 1 - L, -1, L, 1], [e, -1, 1, L],
      [-1, e, L, 1], [-1, e + 1 - L, 1, L],
      [e + 1 - L, e, L, 1], [e, e + 1 - L, 1, L]
    ];
    for (var i = 0; i < marks.length; i += 1) {
      ctx.fillRect(x + marks[i][0], y + marks[i][1], marks[i][2], marks[i][3]);
    }
    PW.blit(ctx, art.loose, x, y + bob, false);
  }

  function drawLine(ctx, g, officer) {
    var t = PW.stepProgress(g);
    // Back to front, so each figure overlaps the one behind it.
    for (var i = g.body.length - 1; i >= 0; i -= 1) {
      var seg = g.body[i];
      var x = V.px + (seg.px + (seg.x - seg.px) * t) * CELL;
      var y = V.py + (seg.py + (seg.y - seg.py) * t) * CELL;
      var f = facingFor(seg, g.dir);
      var art = i === 0 ? officer : PW.art.execs[g.execs[i - 1]].cuffed;
      PW.blit(ctx, art[f.key], Math.round(x), Math.round(y), f.flip);
    }
  }

  function drawHud(ctx, g, best, pop) {
    ctx.fillStyle = PW.UI.barBg;
    ctx.fillRect(0, 0, V.width, HUD_H);
    ctx.fillStyle = PW.UI.frameEdge;
    ctx.fillRect(0, HUD_H - 1, V.width, 1);

    PW.text(ctx, 'ARRESTS', 8, 12, PW.UI.textDim, 1);
    var lift = Math.round(pop * 2);
    PW.text(ctx, String(g.score), 8 + PW.textWidth('ARRESTS', 1) + 6, 8 - lift, PW.UI.text, 2);

    if (best > 0) {
      var label = 'BEST ' + best;
      PW.text(ctx, label, V.width - 8 - PW.textWidth(label, 1), 12, PW.UI.accent, 1);
    }
  }

  // ------------------------------------------------------------- screens ---

  function drawSelect(ctx, entries, index, clock, best) {
    ctx.fillStyle = 'rgba(8, 11, 17, 0.92)';
    ctx.fillRect(V.px, V.py, PLAY_W, PLAY_H);

    var cx = V.px + PLAY_W / 2;
    PW.textCentered(ctx, 'ON THE LIST', cx, V.py + 44, PW.UI.text, 3);
    PW.textCentered(ctx, 'WHO IS SERVING THE WARRANT', cx, V.py + 84, PW.UI.textDim, 1);

    var slot = PLAY_W / entries.length;
    var rowY = V.py + 142;

    for (var i = 0; i < entries.length; i += 1) {
      var mid = V.px + slot * i + slot / 2;
      var sx = Math.round(mid - PW.SPRITE);
      var chosen = i === index;

      if (chosen) {
        var pulse = 0.5 + Math.sin(clock * 6) * 0.25;
        ctx.fillStyle = 'rgba(245, 185, 66, ' + pulse.toFixed(2) + ')';
        ctx.fillRect(sx - 6, rowY - 6, PW.SPRITE * 2 + 12, 1);
        ctx.fillRect(sx - 6, rowY + PW.SPRITE * 2 + 5, PW.SPRITE * 2 + 12, 1);
        ctx.fillRect(sx - 6, rowY - 6, 1, PW.SPRITE * 2 + 12);
        ctx.fillRect(sx + PW.SPRITE * 2 + 5, rowY - 6, 1, PW.SPRITE * 2 + 12);
      }

      ctx.save();
      if (!chosen) ctx.globalAlpha = 0.62;
      ctx.drawImage(entries[i].art.front, sx, rowY, PW.SPRITE * 2, PW.SPRITE * 2);
      ctx.restore();

      PW.textCentered(ctx, entries[i].name, mid, rowY + PW.SPRITE * 2 + 16,
        chosen ? PW.UI.accent : PW.UI.textDim, 1);
    }

    PW.textCentered(ctx, 'LEFT / RIGHT TO CHOOSE', cx, V.py + PLAY_H - 84, PW.UI.textDim, 1);
    PW.textCentered(ctx, 'PRESS ENTER TO BEGIN', cx, V.py + PLAY_H - 64, PW.UI.text, 1);
  }

  function drawReady(ctx) {
    // Sits high on the board so it never covers the officer's start cell.
    var cx = V.px + PLAY_W / 2;
    var top = V.py + 46;
    panel(ctx, top, 88);
    PW.textCentered(ctx, 'SHIFT START', cx, top + 12, PW.UI.text, 2);
    PW.textCentered(ctx, 'EVERY NAME ON THE LIST IS OUT HERE', cx, top + 38, PW.UI.textDim, 1);
    PW.textCentered(ctx, 'THE COLUMN BEHIND YOU BLOCKS THE WAY', cx, top + 52, PW.UI.textDim, 1);
    PW.textCentered(ctx, 'STEER TO BEGIN', cx, top + 72, PW.UI.accent, 1);
  }

  function drawOver(ctx, g, best, fresh) {
    var cx = V.px + PLAY_W / 2;
    panel(ctx, V.py + PLAY_H / 2 - 34, 68);
    PW.textCentered(ctx, g.score + ' ARRESTS', cx, V.py + PLAY_H / 2 - 24, PW.UI.text, 2);
    PW.textCentered(
      ctx,
      fresh ? 'NEW BEST' : 'BEST ' + best,
      cx, V.py + PLAY_H / 2 + 2,
      fresh ? PW.UI.accent : PW.UI.textDim, 1
    );
    PW.textCentered(ctx, 'SPACE FOR ANOTHER SHIFT', cx, V.py + PLAY_H / 2 + 18, PW.UI.textDim, 1);
  }

  function drawCleared(ctx, g) {
    var cx = V.px + PLAY_W / 2;
    panel(ctx, V.py + PLAY_H / 2 - 26, 52);
    PW.textCentered(ctx, 'FULL DOCKET', cx, V.py + PLAY_H / 2 - 16, PW.UI.accent, 2);
    PW.textCentered(ctx, 'ALL ' + g.score + ' BOOKED', cx, V.py + PLAY_H / 2 + 8, PW.UI.text, 1);
  }

  // --------------------------------------------------------------- entry ---

  PW.draw = function (ctx, g, ui) {
    if (!lotTile) lotTile = buildLot();

    ctx.fillStyle = PW.UI.void;
    ctx.fillRect(0, 0, V.width, V.height);
    ctx.drawImage(lotTile, 0, HUD_H);

    if (ui.screen === 'select') {
      drawSelect(ctx, ui.entries, ui.selectIndex, ui.clock, ui.best);
      ctx.fillStyle = PW.UI.barBg;
      ctx.fillRect(0, 0, V.width, HUD_H);
      ctx.fillStyle = PW.UI.frameEdge;
      ctx.fillRect(0, HUD_H - 1, V.width, 1);
      PW.text(ctx, 'ON THE LIST', 8, 10, PW.UI.textDim, 1);
      if (ui.best > 0) {
        var lbl = 'BEST ' + ui.best;
        PW.text(ctx, lbl, V.width - 8 - PW.textWidth(lbl, 1), 10, PW.UI.accent, 1);
      }
      return;
    }

    drawTarget(ctx, g, ui.clock);
    drawLine(ctx, g, ui.playerArt);
    ui.dust.draw(ctx);
    drawHud(ctx, g, ui.best, ui.pop);

    if (g.phase === 'ready') drawReady(ctx);
    else if (g.phase === 'dead') drawOver(ctx, g, ui.best, ui.fresh);
    else if (g.phase === 'docket') drawCleared(ctx, g);
  };
})(window.PW);
