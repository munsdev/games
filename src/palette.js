/* Shared colour tables. Everything the game draws pulls from here so the
   whole thing reads as one palette. */
window.PW = window.PW || {};

(function (PW) {
  'use strict';

  PW.INK = '#0b0e14';

  // Board / chrome.
  PW.UI = {
    void: '#0a0d13',
    frame: '#161c26',
    frameEdge: '#0b0e14',
    lotA: '#232b36',
    lotB: '#1e2530',
    grit: ['#28313d', '#1b222c'],
    barBg: '#141a23',
    text: '#e6ebf3',
    textDim: '#7d8798',
    accent: '#f5b942',
    danger: '#d9534f',
    cuff: '#c9ced8',
    cuffShade: '#8f97a5'
  };

  // Six skin tones, each with a shading tone for jaw/mouth lines.
  PW.SKIN = {
    pale:  { base: '#f0d0b4', shade: '#d3ab8c' },
    peach: { base: '#e2b189', shade: '#c08e69' },
    olive: { base: '#c99a63', shade: '#a67a47' },
    tan:   { base: '#b07a45', shade: '#8d5c30' },
    brown: { base: '#7e4a26', shade: '#5f3419' },
    deep:  { base: '#523020', shade: '#3a2015' }
  };

  // Multiply a hex colour toward black, for seams and shading.
  PW.shade = function (hex, k) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.round(((n >> 16) & 255) * k);
    var g = Math.round(((n >> 8) & 255) * k);
    var b = Math.round((n & 255) * k);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  };

  PW.HAIR = {
    black:  '#1d1b1a',
    dark:   '#2f2622',
    brown:  '#4a3524',
    ginger: '#b5541c',
    blonde: '#c9a34e',
    grey:   '#9aa0a8',
    white:  '#dfe3ea'
  };
})(window.PW);
