/* Headless checks for the rules layer. Run with: node test/logic.test.js */
'use strict';
var fs = require('fs');
var vm = require('vm');
var path = require('path');

var sandbox = { window: {}, console: console, Math: Math, parseInt: parseInt, isFinite: isFinite };
vm.createContext(sandbox);
['src/palette.js', 'src/game.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sandbox, { filename: f });
});
var PW = sandbox.window.PW;

// Ten stand-ins so the bag has something to deal.
PW.EXECS = [];
for (var i = 0; i < 10; i += 1) PW.EXECS.push({ id: 'e' + i });

var failures = 0;
function check(name, cond, extra) {
  if (cond) { console.log('  ok   ' + name); return; }
  failures += 1;
  console.log('  FAIL ' + name + (extra === undefined ? '' : '  -> ' + JSON.stringify(extra)));
}

// Run one whole step regardless of the current speed.
function step(g) { PW.advance(g, PW.stepDuration(g.score) + 1e-6); }

console.log('\nstart state');
var g = PW.newGame();
check('starts ready', g.phase === 'ready');
check('column is just the officer', g.body.length === 1 && g.execs.length === 0);
check('a target exists', !!g.target);
check('target is not under the officer',
  !(g.target.x === g.body[0].x && g.target.y === g.body[0].y));

console.log('\nsteering');
check('cannot reverse into itself', PW.steer(g, -1, 0) === false);
check('an arrow key starts the run', PW.steer(g, 0, 1) === true && g.phase === 'playing');
PW.steer(g, 1, 0); PW.steer(g, 0, -1);
check('turn queue caps at two', PW.steer(g, -1, 0) === false && g.queue.length === 2);

console.log('\npickups grow the line');
g = PW.newGame();
PW.begin(g);
// Park a target directly ahead and walk onto it, five times over.
for (var n = 1; n <= 5; n += 1) {
  g.target = { x: g.body[0].x + 1, y: g.body[0].y, exec: (n - 1) % 10 };
  g.dir = { x: 1, y: 0 };
  g.queue.length = 0;
  step(g);
  if (g.score !== n) break;
}
check('score counts five arrests', g.score === 5, g.score);
check('column grew to match', g.body.length === 6 && g.execs.length === 5,
  { body: g.body.length, execs: g.execs.length });
check('newest arrest rides just behind the officer', g.execs[0] === 4, g.execs[0]);

console.log('\nsegments occupy distinct cells');
var seen = {}, overlap = false;
g.body.forEach(function (s) {
  var k = s.x + ',' + s.y;
  if (seen[k]) overlap = true;
  seen[k] = true;
});
check('no two segments share a cell', !overlap);

console.log('\nbag randomisation');
g = PW.newGame();
var counts = {}, draws = 0;
for (var r = 0; r < 40; r += 1) {
  g.bag = g.bag.length ? g.bag : null;
  if (!g.bag) g.bag = [];
  // Drive the bag directly through spawnTarget by clearing and respawning.
  g.body = [{ x: 0, y: 0, px: 0, py: 0 }];
  g.target = null;
  PW.advance(g, 0);
  g.phase = 'playing';
  g.target = null;
  // spawnTarget is internal; exercise it through a scripted pickup instead.
  g.target = { x: 1, y: 0, exec: -1 };
  g.dir = { x: 1, y: 0 };
  g.queue.length = 0;
  step(g);
  if (g.target) { counts[g.target.exec] = (counts[g.target.exec] || 0) + 1; draws += 1; }
}
check('drew targets repeatedly', draws >= 30, draws);
check('every executive appeared at least once', Object.keys(counts).length === 10,
  Object.keys(counts).length);

console.log('\nwalls are fatal');
g = PW.newGame();
PW.begin(g);
g.dir = { x: 0, y: -1 };
for (var w = 0; w < 40 && g.phase === 'playing'; w += 1) { g.queue.length = 0; g.dir = { x: 0, y: -1 }; step(g); }
check('running off the top ends the run', g.phase === 'dead', g.phase);
check('cause recorded as wall',
  g.events.some(function (e) { return e.type === 'stopped' && e.cause === 'fence'; }));

console.log('\ncrossing your own line is fatal');
g = PW.newGame();
PW.begin(g);
// Grow to five, then turn a tight square back into the body.
for (var m = 0; m < 5; m += 1) {
  g.target = { x: g.body[0].x + 1, y: g.body[0].y, exec: 0 };
  g.dir = { x: 1, y: 0 }; g.queue.length = 0; step(g);
}
g.dir = { x: 0, y: 1 }; g.queue.length = 0; step(g);
g.dir = { x: -1, y: 0 }; g.queue.length = 0; step(g);
g.dir = { x: 0, y: -1 }; g.queue.length = 0; step(g);
check('turning back into the column ends the run', g.phase === 'dead', g.phase);
check('cause recorded as line',
  g.events.some(function (e) { return e.type === 'stopped' && e.cause === 'column'; }));

console.log('\nfollowing your own tail is allowed');
g = PW.newGame();
PW.begin(g);
g.body = [
  { x: 5, y: 5, px: 4, py: 5 },
  { x: 4, y: 5, px: 4, py: 6 },
  { x: 4, y: 6, px: 5, py: 6 },
  { x: 5, y: 6, px: 5, py: 5 }
];
g.execs = [0, 1, 2];
g.target = { x: 15, y: 15, exec: 3 };
g.dir = { x: 0, y: 1 }; g.queue.length = 0;
step(g);
check('stepping into the vacating tail cell survives', g.phase === 'playing', g.phase);

console.log('\nspeed ramp');
check('slowest at zero', Math.abs(PW.stepDuration(0) - 0.30) < 1e-9, PW.stepDuration(0));
check('fastest by thirty', Math.abs(PW.stepDuration(30) - 0.11) < 1e-9, PW.stepDuration(30));
check('does not keep accelerating past the ramp',
  PW.stepDuration(500) === PW.stepDuration(30));

console.log(failures === 0 ? '\nall checks passed\n' : '\n' + failures + ' FAILED\n');
process.exit(failures === 0 ? 0 : 1);
