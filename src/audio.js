/* Four short blips and a mute toggle. Nothing is created until the first
   input, so the browser's autoplay policy stays happy. */
(function (PW) {
  'use strict';

  PW.createAudio = function (button, label) {
    var ctx = null;
    var on = true;

    function ensure() {
      if (!on) return null;
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function tone(freq, endFreq, dur, type, gain) {
      var ac = ensure();
      if (!ac) return;
      var osc = ac.createOscillator();
      var amp = ac.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, ac.currentTime + dur);
      amp.gain.setValueAtTime(gain, ac.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      osc.connect(amp).connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + dur + 0.02);
    }

    function paint() {
      if (!button) return;
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (label) label.textContent = on ? 'Sound on' : 'Sound off';
    }

    var api = {
      turn: function () { tone(620, null, 0.03, 'square', 0.012); },
      collar: function () {
        tone(760, null, 0.06, 'triangle', 0.05);
        setTimeout(function () { tone(1140, null, 0.09, 'triangle', 0.04); }, 55);
      },
      bust: function () { tone(320, 80, 0.35, 'sawtooth', 0.06); },
      start: function () {
        tone(520, null, 0.07, 'square', 0.035);
        setTimeout(function () { tone(800, null, 0.1, 'square', 0.03); }, 70);
      },
      toggle: function () { on = !on; paint(); if (on) api.start(); },
      wake: function () { ensure(); }
    };

    if (button) button.addEventListener('click', function () { api.toggle(); });
    paint();
    return api;
  };
})(window.PW);
