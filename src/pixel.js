/* A low-resolution drawing surface that gets blown up to fill its container
   at a whole-number scale, so pixels stay square and crisp. */
(function (PW) {
  'use strict';

  PW.createScreen = function (host, opts) {
    var W = opts.width;
    var H = opts.height;
    var background = opts.background || '#000';

    // Everything is drawn at native resolution here...
    var buffer = document.createElement('canvas');
    buffer.width = W;
    buffer.height = H;
    var bctx = buffer.getContext('2d');
    bctx.imageSmoothingEnabled = false;

    // ...then blitted, scaled, onto the visible canvas.
    var view = document.createElement('canvas');
    var vctx = view.getContext('2d');
    vctx.imageSmoothingEnabled = false;
    host.appendChild(view);

    var scale = 1;
    var offX = 0;
    var offY = 0;

    function resize() {
      var box = host.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var pxW = Math.max(1, Math.floor(box.width * dpr));
      var pxH = Math.max(1, Math.floor(box.height * dpr));

      view.width = pxW;
      view.height = pxH;
      view.style.width = box.width + 'px';
      view.style.height = box.height + 'px';
      vctx.imageSmoothingEnabled = false;

      scale = Math.max(1, Math.floor(Math.min(pxW / W, pxH / H)));
      offX = Math.floor((pxW - W * scale) / 2);
      offY = Math.floor((pxH - H * scale) / 2);
    }

    function present(shakeX, shakeY) {
      vctx.fillStyle = background;
      vctx.fillRect(0, 0, view.width, view.height);
      vctx.drawImage(
        buffer,
        offX + Math.round(shakeX || 0) * scale,
        offY + Math.round(shakeY || 0) * scale,
        W * scale,
        H * scale
      );
    }

    // Screen coordinates -> buffer coordinates, for click-to-steer.
    function toBuffer(clientX, clientY) {
      var box = view.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      return {
        x: ((clientX - box.left) * dpr - offX) / scale,
        y: ((clientY - box.top) * dpr - offY) / scale
      };
    }

    resize();
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(resize).observe(host);
    } else {
      window.addEventListener('resize', resize);
    }

    return { ctx: bctx, width: W, height: H, present: present, toBuffer: toBuffer };
  };

  /* Fixed-timestep-ish loop: update gets real elapsed seconds, capped so a
     backgrounded tab doesn't fast-forward the whole game on return. */
  PW.runLoop = function (update, render) {
    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      render();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
})(window.PW);
