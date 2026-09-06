/* Runs test/consistency.html in a headless browser and prints its report.
   Usage: node test/run-consistency.js [baseUrl] */
'use strict';
var path = require('path');
var base = process.argv[2] || 'http://127.0.0.1:8777';
var pw;
try { pw = require(path.join(process.env.PW_ROOT || '', 'node_modules', 'playwright')); }
catch (e) { pw = require('playwright'); }

(async function () {
  var browser = await pw.chromium.launch({
    executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });
  var page = await browser.newPage();
  page.on('pageerror', function (e) { console.log('PAGE ERROR', e.message); });
  await page.goto(base + '/test/consistency.html');
  await page.waitForFunction('window.__fails !== undefined', { timeout: 15000 });
  console.log(await page.textContent('#out'));
  var fails = await page.evaluate(function () { return window.__fails; });
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
})();
