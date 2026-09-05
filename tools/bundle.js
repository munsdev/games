#!/usr/bin/env node
/* Inline every source file into tools/page.html to produce the single-file
   build in dist/. The multi-file version in src/ is the source of truth;
   this is only the shippable artifact.

   Usage: node tools/bundle.js [outputPath] */
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var ORDER = ['palette', 'pixel', 'font', 'sprites', 'roster', 'audio', 'game', 'render', 'main'];

var code = ORDER.map(function (name) {
  var file = path.join(ROOT, 'src', name + '.js');
  var body = fs.readFileSync(file, 'utf8');
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
  return '/* ==== ' + name + '.js ==== */\n' + body;
}).join('\n');

var shell = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8');
if (shell.indexOf('<!--GAME-->') === -1) throw new Error('page.html is missing the <!--GAME--> marker');

var out = process.argv[2] || path.join(ROOT, 'dist', 'perp-walk.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, shell.replace('<!--GAME-->', code));
console.log('wrote ' + out + ' (' + fs.statSync(out).size + ' bytes)');
