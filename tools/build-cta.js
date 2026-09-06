#!/usr/bin/env node
/* Build the three files the Casey The American embed needs, from src/.

   engine.js is the shared modules plus tools/cta/embed.js — the standalone
   page's src/main.js is deliberately excluded; the embed has its own
   controller. loader.js and styles.css are copied as-is.

   Usage: node tools/build-cta.js [outputDir]
   Default: dist/cta/on-the-list */
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var MODULES = ['palette', 'pixel', 'font', 'sprites', 'roster', 'audio', 'game', 'render'];

var out = process.argv[2] || path.join(ROOT, 'dist', 'cta', 'on-the-list');
fs.mkdirSync(out, { recursive: true });

var engine = MODULES.map(function (name) {
  return '/* ==== ' + name + '.js ==== */\n' +
    fs.readFileSync(path.join(ROOT, 'src', name + '.js'), 'utf8');
});
engine.push('/* ==== embed.js ==== */\n' +
  fs.readFileSync(path.join(__dirname, 'cta', 'embed.js'), 'utf8'));

var header = '/* On the List — built from munsdev/games src/. Do not edit here;\n' +
  '   edit src/ and run tools/build-cta.js. */\n';

fs.writeFileSync(path.join(out, 'engine.js'), header + engine.join('\n'));
['loader.js', 'styles.css'].forEach(function (f) {
  fs.copyFileSync(path.join(__dirname, 'cta', f), path.join(out, f));
});

['engine.js', 'loader.js', 'styles.css'].forEach(function (f) {
  console.log('  ' + f + '  ' + fs.statSync(path.join(out, f)).size + ' bytes');
});
console.log('-> ' + out);
