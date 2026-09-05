/* Pure game state. Knows nothing about canvases or sprites — it holds cells,
   a direction, and a list of who is in the line, and it emits events that the
   presentation layer reacts to. */
(function (PW) {
  'use strict';

  var COLS = 16;
  var ROWS = 16;
  var TICK_SLOW = 0.30;   // seconds per step at score 0
  var TICK_FAST = 0.11;   // ...and once the ramp tops out
  var RAMP = 30;          // score at which we hit TICK_FAST
  var QUEUE_MAX = 2;      // buffered turns, so fast double-taps register

  PW.COLS = COLS;
  PW.ROWS = ROWS;

  var DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  PW.DIRS = DIRS;

  function shuffled(n) {
    var a = [], i, j, t;
    for (i = 0; i < n; i += 1) a.push(i);
    for (i = a.length - 1; i > 0; i -= 1) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  PW.stepDuration = function (score) {
    var t = Math.min(1, score / RAMP);
    return TICK_SLOW + (TICK_FAST - TICK_SLOW) * t;
  };

  // 0..1 through the current step, for smooth movement between cells.
  PW.stepProgress = function (g) {
    if (g.phase !== 'playing') return 1;
    return Math.min(1, g.acc / PW.stepDuration(g.score));
  };

  function occupied(g, x, y) {
    for (var i = 0; i < g.body.length; i += 1) {
      if (g.body[i].x === x && g.body[i].y === y) return true;
    }
    return false;
  }

  /* Bag randomisation: deal the whole roster out in a random order, then
     reshuffle and deal again. Guarantees variety without runs of repeats. */
  function drawFromBag(g) {
    if (g.bag.length === 0) g.bag = shuffled(PW.EXECS.length);
    return g.bag.pop();
  }

  function spawnTarget(g) {
    var free = [];
    for (var y = 0; y < ROWS; y += 1) {
      for (var x = 0; x < COLS; x += 1) {
        if (!occupied(g, x, y)) free.push({ x: x, y: y });
      }
    }
    if (free.length === 0) {
      g.target = null;
      g.phase = 'docket';
      g.t = 0;
      g.events.push({ type: 'docket', score: g.score });
      return;
    }
    var cell = free[Math.floor(Math.random() * free.length)];
    g.target = { x: cell.x, y: cell.y, exec: drawFromBag(g) };
  }

  PW.newGame = function () {
    var g = {
      phase: 'ready',
      body: [],
      execs: [],
      dir: { x: DIRS.right.x, y: DIRS.right.y },
      queue: [],
      bag: [],
      target: null,
      score: 0,
      acc: 0,
      t: 0,
      elapsed: 0,
      events: []
    };
    var sx = Math.floor(COLS / 3);
    var sy = Math.floor(ROWS / 2);
    g.body.push({ x: sx, y: sy, px: sx, py: sy });
    spawnTarget(g);
    return g;
  };

  PW.begin = function (g) {
    if (g.phase !== 'ready') return false;
    g.phase = 'playing';
    g.t = 0;
    g.acc = 0;
    return true;
  };

  /* Returns true if the input did something, so the caller knows to click. */
  PW.steer = function (g, dx, dy) {
    if (g.phase === 'dead' || g.phase === 'docket') return false;
    var last = g.queue.length > 0 ? g.queue[g.queue.length - 1] : g.dir;
    if (dx === -last.x && dy === -last.y) return false;   // no instant reversal
    if (g.phase === 'ready') {
      g.dir = { x: dx, y: dy };
      return PW.begin(g);
    }
    if (dx === last.x && dy === last.y) return false;     // already going that way
    if (g.queue.length >= QUEUE_MAX) return false;
    g.queue.push({ x: dx, y: dy });
    g.events.push({ type: 'steer' });
    return true;
  };

  function stop(g, cause, x, y) {
    g.phase = 'dead';
    g.t = 0;
    g.acc = 0;
    g.events.push({ type: 'stopped', cause: cause, x: x, y: y, score: g.score });
  }

  function step(g) {
    if (g.queue.length > 0) g.dir = g.queue.shift();

    var head = g.body[0];
    var nx = head.x + g.dir.x;
    var ny = head.y + g.dir.y;

    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
      stop(g, 'fence', nx, ny);
      return;
    }

    var grows = !!(g.target && nx === g.target.x && ny === g.target.y);
    // The last cell empties this step unless we're growing into it.
    var limit = grows ? g.body.length : g.body.length - 1;
    for (var i = 0; i < limit; i += 1) {
      if (g.body[i].x === nx && g.body[i].y === ny) {
        stop(g, 'column', nx, ny);
        return;
      }
    }

    var vacated = g.body[g.body.length - 1];
    var vx = vacated.x, vy = vacated.y;
    var captured = grows ? g.target.exec : -1;

    g.body.unshift({ x: nx, y: ny, px: head.x, py: head.y });
    if (grows) {
      g.execs.unshift(captured);
      g.score += 1;
    } else {
      g.body.pop();
    }

    // Each segment came from wherever the segment behind it now sits.
    for (var k = 0; k < g.body.length - 1; k += 1) {
      g.body[k].px = g.body[k + 1].x;
      g.body[k].py = g.body[k + 1].y;
    }
    var tail = g.body[g.body.length - 1];
    if (grows) { tail.px = tail.x; tail.py = tail.y; }
    else { tail.px = vx; tail.py = vy; }

    if (grows) {
      g.events.push({ type: 'arrest', x: nx, y: ny, exec: captured, score: g.score });
      spawnTarget(g);
    }
  }

  PW.advance = function (g, dt) {
    g.t += dt;
    if (g.phase !== 'playing') return;
    g.elapsed += dt;
    g.acc += dt;
    var span = PW.stepDuration(g.score);
    while (g.phase === 'playing' && g.acc >= span) {
      g.acc -= span;
      step(g);
      span = PW.stepDuration(g.score);
    }
  };
})(window.PW);
