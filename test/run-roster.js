/* Drives tools/cta/roster-test.html and checks every roster operation landed.
   Usage: node test/run-roster.js [baseUrl] */
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
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (ok ? '' : '  got ' + JSON.stringify(got) + ' want ' + JSON.stringify(want)));
}

(async function () {
  var browser = await pw.chromium.launch({
    executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });
  var page = await browser.newPage();
  var warns = [];
  page.on('console', function (m) { if (m.type() === 'warning') warns.push(m.text()); });
  page.on('pageerror', function (e) { console.log('PAGE ERROR', e.message); fails++; });
  await page.goto(base + '/tools/cta/roster-test.html');
  await page.waitForFunction('window.PW && window.PW.EXECS', { timeout: 15000 });

  var r = await page.evaluate(function () {
    return {
      execs: PW.EXECS.map(function (d) { return d.id + ':' + d.name; }),
      officers: PW.PLAYERS.map(function (d) { return d.id + ':' + d.name; }),
      lead: PW.OFFICER.id,
      baked: PW.art.execs.length === PW.EXECS.length &&
        PW.art.players.length === PW.PLAYERS.length &&
        PW.art.execs.every(function (a) { return !!(a.loose && a.cuffed.front); }),
      source: typeof OnTheList.roster()
    };
  });

  check('execs replaced, added, edited and removed', r.execs,
    ['a:ALPHA PRIME', 'c:GAMMA', 'delta-man:Delta Man']);
  check('officer added, edited and removed', r.officers,
    ['officer:SARGE', 'marshal:MARSHAL', 'agent:AGENT', 'ranger:RANGER']);
  check('lead officer follows the list', r.lead, 'officer');
  check('every character baked', r.baked, true);
  check('roster() returns source text', r.source, 'string');

  ['skipping addOfficers', 'id "nope"', 'id "ghost"'].forEach(function (frag) {
    check('warned about ' + frag, warns.some(function (w) { return w.indexOf(frag) !== -1; }), true);
  });

  /* A cast that would be emptied keeps what it had. */
  var page2 = await browser.newPage();
  await page2.addInitScript(function () {
    window.OTL_ROSTER = { execs: [ { id: 'a', name: 'X', shirt: 'navy' } ], removeExecs: ['a'] };
  });
  await page2.goto(base + '/tools/cta/roster-test.html');
  await page2.waitForFunction('window.PW && window.PW.EXECS', { timeout: 15000 });
  check('emptying a cast is refused', await page2.evaluate('PW.EXECS.length'), 1);

  await browser.close();
  console.log(fails ? fails + ' failed' : 'all roster checks passed');
  process.exit(fails ? 1 : 0);
})();
