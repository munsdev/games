/* Drives the hidden roster panel in tools/cta/local-test.html: nine taps, the
   password gate, an edit, an add, a remove, the paste block, and persistence
   across a reload.  Usage: node test/run-admin.js [baseUrl] */
'use strict';
var path = require('path');
var base = process.argv[2] || 'http://127.0.0.1:8777';
var pw;
try { pw = require(path.join(process.env.PW_ROOT || '', 'node_modules', 'playwright')); }
catch (e) { pw = require('playwright'); }

var fails = 0;
function check(label, got, want) {
  var ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (ok ? '' : '  got ' + JSON.stringify(got) + '  want ' + JSON.stringify(want)));
}

/* fresh:true waits out the tap window first, so a leftover count from an
   earlier check cannot open the gate part-way through this one. */
async function tap(p, n, fresh) {
  if (fresh) await p.waitForTimeout(2700);
  for (var i = 0; i < n; i += 1) await p.click('[data-el="eyebrow"]');
}
function vis(p, el) { return p.isVisible('[data-el="' + el + '"]'); }

(async function () {
  var browser = await pw.chromium.launch({
    executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });
  var ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  var p = await ctx.newPage();
  p.on('pageerror', function (e) { console.log('PAGE ERROR', e.message); fails++; });
  await p.goto(base + '/tools/cta/local-test.html');
  await p.waitForFunction('window.PW && window.PW.EXECS', { timeout: 15000 });

  /* The door stays shut for a player who taps a few times. */
  await tap(p, 8);
  check('eight taps do nothing', await vis(p, 'ovGate'), false);
  await tap(p, 1);
  check('the ninth opens the gate', await vis(p, 'ovGate'), true);

  /* A pause between taps resets the count, so idle tapping never opens it. */
  await p.click('[data-el="btnGateBack"]');
  await tap(p, 5);
  await p.waitForTimeout(2700);
  await tap(p, 5);
  check('a pause resets the count', await vis(p, 'ovGate'), false);

  await tap(p, 9, true);
  await p.fill('[data-el="gateInput"]', 'wrong');
  await p.click('[data-el="btnGateGo"]');
  check('a wrong password is refused', await vis(p, 'ovAdmin'), false);
  check('and says so', await p.textContent('[data-el="gateNote"]'), 'Not on the roster.');

  await p.fill('[data-el="gateInput"]', 'listed4now');
  await p.click('[data-el="btnGateGo"]');
  check('the right password opens the panel', await vis(p, 'ovAdmin'), true);

  var before = await p.evaluate('PW.PLAYERS[0].name');

  /* Rename the first officer. */
  await p.fill('.ol-admin-edit input[type="text"]', 'CAPTAIN');
  await p.dispatchEvent('.ol-admin-edit input[type="text"]', 'input');
  await p.click('[data-el="btnAdminApply"]');
  check('the edit reached the live cast', await p.evaluate('PW.PLAYERS[0].name'), 'CAPTAIN');
  check('and it was a change', before !== 'CAPTAIN', true);
  check('the picker shows the new name',
    await p.textContent('[data-el="officers"] .ol-officer span'), 'CAPTAIN');

  /* Add, then remove. */
  var n = await p.evaluate('PW.PLAYERS.length');
  await p.click('[data-el="btnAdminNew"]');
  check('add appends an officer', await p.evaluate('PW.PLAYERS.length'), n + 1);
  await p.click('[data-el="btnAdminApply"]');
  await p.click('[data-el="btnAdminDrop"]');
  check('remove drops them again', await p.evaluate('PW.PLAYERS.length'), n);

  /* The other cast. */
  await p.click('[data-el="tabExecs"]');
  var execs = await p.evaluate('PW.EXECS.length');
  check('the exec tab lists the executives',
    await p.evaluate('document.querySelectorAll(".ol-admin-cast .ol-cast-row").length'), execs);
  await p.click('[data-el="btnAdminDrop"]');
  check('an executive can be removed', await p.evaluate('PW.EXECS.length'), execs - 1);

  /* The paste block. */
  await p.click('[data-el="btnAdminCopy"]');
  var clip = await p.evaluate('navigator.clipboard.readText()');
  check('the block is pasteable', /^<script>\s*window\.OTL_ROSTER = \{/.test(clip), true);
  check('it carries the edit', clip.indexOf("name: 'CAPTAIN'") !== -1, true);
  check('and both casts', clip.indexOf('officers: [') !== -1 && clip.indexOf('execs: [') !== -1, true);

  /* The block is not just text: paste it into a page and it rebuilds the cast
     the panel was showing.  That round trip is the whole publish path. */
  var pasted = await ctx.newPage();
  await pasted.addInitScript('(0,eval)(' + JSON.stringify(
    clip.replace(/^<script>/, '').replace(/<\/script>$/, '')) + ')');
  await pasted.goto(base + '/tools/cta/local-test.html');
  await pasted.waitForFunction('window.PW && window.PW.EXECS', { timeout: 15000 });
  check('the pasted block rebuilds the officers',
    await pasted.evaluate('PW.PLAYERS.map(function (d) { return d.name; }).join()'),
    await p.evaluate('PW.PLAYERS.map(function (d) { return d.name; }).join()'));
  check('and the executives',
    await pasted.evaluate('PW.EXECS.map(function (d) { return d.name; }).join()'),
    await p.evaluate('PW.EXECS.map(function (d) { return d.name; }).join()'));
  await pasted.close();

  /* Everything survives a reload, and the gate stays open for the session. */
  await p.reload();
  await p.waitForFunction('window.PW && window.PW.EXECS', { timeout: 15000 });
  check('the cast persisted', await p.evaluate('PW.PLAYERS[0].name'), 'CAPTAIN');
  check('so did the removal', await p.evaluate('PW.EXECS.length'), execs - 1);
  await tap(p, 9, true);
  check('the session stays signed in', await vis(p, 'ovAdmin'), true);

  /* Reset drops the override; a new browser never had it. */
  await p.click('[data-el="btnAdminReset"]');
  await p.reload();
  await p.waitForFunction('window.PW && window.PW.EXECS', { timeout: 15000 });
  check('reset restores the published cast', await p.evaluate('PW.PLAYERS[0].name'), before);
  check('and the full list', await p.evaluate('PW.EXECS.length'), execs);

  var fresh = await (await browser.newContext()).newPage();
  await fresh.goto(base + '/tools/cta/local-test.html');
  await fresh.waitForFunction('window.PW && window.PW.EXECS', { timeout: 15000 });
  check('another visitor is unaffected', await fresh.evaluate('PW.PLAYERS[0].name'), before);
  await tap(fresh, 9, true);
  check('and meets the gate, not the panel', await vis(fresh, 'ovAdmin'), false);

  await browser.close();
  console.log(fails ? fails + ' failed' : 'all admin checks passed');
  process.exit(fails ? 1 : 0);
})();
