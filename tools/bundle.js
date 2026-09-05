#!/usr/bin/env node
/* Inline <script src="../src/*.js"> tags into a page so it can ship as a
   single self-contained file. The multi-file version in src/ is the source of
   truth; dist/ only holds build output.

   Usage: node tools/bundle.js [input.html] [output.html]
   Defaults to tools/page.html -> dist/perp-walk.html */
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var input = process.argv[2] || path.join(__dirname, 'page.html');
var output = process.argv[3] || path.join(ROOT, 'dist', 'perp-walk.html');

var TAG = /^[ \t]*<script src="\.\.\/src\/([a-z]+)\.js"><\/script>[ \t]*\r?\n/gm;

var html = fs.readFileSync(input, 'utf8');
if (!TAG.test(html)) throw new Error('no ../src script tags found in ' + input);
TAG.lastIndex = 0;

var seen = 0;
var out = html.replace(TAG, function (match, name) {
  var body = fs.readFileSync(path.join(ROOT, 'src', name + '.js'), 'utf8');
  if (name === 'main') {
    // The standalone page honours a reduced-motion preference for the shake.
    body = body
      .replace(
        "  var host = document.getElementById('stage');",
        "  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;\n" +
        "  var host = document.getElementById('stage');")
      .replace('        ui.shake = 4;', '        ui.shake = calm ? 0 : 4;');
    if (body.indexOf('calm ? 0 : 4') === -1) throw new Error('reduced-motion patch did not apply');
  }
  seen += 1;
  return '<script>\n/* ==== ' + name + '.js ==== */\n' + body + '</script>\n';
});

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, out);
console.log('inlined ' + seen + ' file(s) -> ' + output + ' (' + fs.statSync(output).size + ' bytes)');
