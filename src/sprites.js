/* Parametric character art.

   Rather than hand-authoring ~50 pixel sprites, a character is described as a
   small object (skin, build, hair, clothes, prop) and drawn from shared parts.
   Every sprite is rendered once at boot into its own 24x24 canvas and cached.

   Shapes are collected before they are painted: body parts get stroked with a
   dark outline (drawn inflated by 1px underneath the fill), details are laid
   flat on top. That gives clean edges without drawing them by hand. */
(function (PW) {
  'use strict';

  var S = 24;
  PW.SPRITE = S;

  // Vertical layout, shared by every facing.
  var HEAD_Y = 3, HEAD_H = 8;
  var NECK_Y = 11;
  var TORSO_Y = 12, TORSO_H = 6;
  var HIP_Y = 18, HIP_H = 2;
  var LEG_Y = 20, LEG_H = 3;
  var SHOE_Y = 23, SHOE_H = 1;

  // Horizontal proportions per build.
  var BUILDS = {
    normal: { torsoX: 6, torsoW: 12, armL: 4, armR: 18, hipX: 7, hipW: 10, legLX: 7, legRX: 13, legW: 4 },
    heavy:  { torsoX: 5, torsoW: 14, armL: 3, armR: 19, hipX: 6, hipW: 12, legLX: 6, legRX: 13, legW: 5 },
    lean:   { torsoX: 7, torsoW: 10, armL: 5, armR: 17, hipX: 8, hipW: 8,  legLX: 8, legRX: 13, legW: 3 }
  };

  function Shapes() {
    this.body = [];
    this.flat = [];
  }
  Shapes.prototype.add = function (x, y, w, h, c) {
    if (w > 0 && h > 0 && c) this.body.push([x, y, w, h, c]);
  };
  Shapes.prototype.det = function (x, y, w, h, c) {
    if (w > 0 && h > 0 && c) this.flat.push([x, y, w, h, c]);
  };
  Shapes.prototype.paint = function (ctx) {
    var i, s;
    ctx.fillStyle = PW.INK;
    for (i = 0; i < this.body.length; i += 1) {
      s = this.body[i];
      ctx.fillRect(s[0] - 1, s[1] - 1, s[2] + 2, s[3] + 2);
    }
    for (i = 0; i < this.body.length; i += 1) {
      s = this.body[i];
      ctx.fillStyle = s[4];
      ctx.fillRect(s[0], s[1], s[2], s[3]);
    }
    for (i = 0; i < this.flat.length; i += 1) {
      s = this.flat[i];
      ctx.fillStyle = s[4];
      ctx.fillRect(s[0], s[1], s[2], s[3]);
    }
  };

  // ---------------------------------------------------------------- hair ---

  function hairFront(s, o, hc, style) {
    if (!hc || style === 'bald') return;
    if (style === 'swoop') {
      // Fringe sweeping across the forehead, thick on the left.
      s.add(o + 7, 1, 10, 3, hc);
      s.add(o + 7, 4, 3, 2, hc);
      s.add(o + 10, 4, 5, 1, hc);
      s.add(o + 16, 3, 1, 3, hc);
    } else if (style === 'pomp') {
      s.add(o + 8, 0, 8, 2, hc);
      s.add(o + 7, 2, 10, 2, hc);
      s.add(o + 7, 4, 1, 2, hc);
      s.add(o + 16, 4, 1, 2, hc);
    } else if (style === 'afro') {
      // Drawn as a ring around the face, so the mass reads round rather than
      // as a crown with blocks stuck to the sides.
      s.add(o + 7, 0, 10, 1, hc);
      s.add(o + 6, 1, 12, 1, hc);
      s.add(o + 5, 2, 14, 1, hc);
      s.add(o + 5, 3, 3, 3, hc);
      s.add(o + 16, 3, 3, 3, hc);
      s.add(o + 6, 6, 2, 2, hc);
      s.add(o + 16, 6, 2, 2, hc);
    } else if (style === 'curls') {
      s.add(o + 7, 1, 10, 3, hc);
      s.add(o + 6, 3, 1, 3, hc);
      s.add(o + 17, 3, 1, 3, hc);
      s.det(o + 7, 0, 2, 1, hc);
      s.det(o + 11, 0, 2, 1, hc);
      s.det(o + 15, 0, 2, 1, hc);
    } else if (style === 'bun') {
      s.add(o + 10, 0, 4, 2, hc);
      s.add(o + 8, 2, 8, 2, hc);
      s.add(o + 7, 3, 1, 3, hc);
      s.add(o + 16, 3, 1, 3, hc);
    } else if (style === 'rough') {
      s.add(o + 7, 1, 10, 3, hc);
      s.add(o + 6, 3, 1, 4, hc);
      s.add(o + 17, 3, 1, 4, hc);
      s.det(o + 8, 0, 2, 1, hc);
      s.det(o + 12, 0, 2, 1, hc);
      s.det(o + 15, 0, 1, 1, hc);
    } else if (style === 'long') {
      s.add(o + 7, 2, 10, 3, hc);
      s.add(o + 6, 4, 2, 7, hc);
      s.add(o + 16, 4, 2, 7, hc);
    } else if (style === 'slick') {
      s.add(o + 8, 2, 8, 2, hc);
      s.add(o + 7, 3, 1, 3, hc);
      s.add(o + 16, 3, 1, 3, hc);
      s.det(o + 9, 3, 5, 1, PW.UI.frame);
    } else { // buzz / crop
      s.add(o + 8, 2, 8, 2, hc);
      s.add(o + 7, 3, 1, 3, hc);
      s.add(o + 16, 3, 1, 3, hc);
    }
  }

  function hairSide(s, o, hc, style) {
    if (!hc || style === 'bald') return;
    if (style === 'swoop') {
      // The fringe sweeps forward past the face rather than stopping flat.
      s.add(o + 9, 2, 7, 2, hc);
      s.add(o + 8, 3, 2, 4, hc);
      s.add(o + 12, 4, 5, 1, hc);
      s.add(o + 16, 3, 2, 2, hc);
    } else if (style === 'pomp') {
      s.add(o + 10, 0, 6, 2, hc);
      s.add(o + 9, 2, 7, 2, hc);
      s.add(o + 8, 3, 1, 4, hc);
      s.add(o + 15, 0, 3, 3, hc);
      s.add(o + 17, 2, 1, 2, hc);
    } else if (style === 'afro') {
      s.add(o + 8, 0, 9, 1, hc);
      s.add(o + 7, 1, 11, 1, hc);
      s.add(o + 6, 2, 12, 1, hc);
      s.add(o + 6, 3, 4, 5, hc);
      s.add(o + 16, 3, 2, 3, hc);
    } else if (style === 'curls') {
      s.add(o + 9, 1, 7, 3, hc);
      s.add(o + 8, 3, 1, 4, hc);
      s.det(o + 9, 0, 2, 1, hc);
      s.det(o + 13, 0, 2, 1, hc);
    } else if (style === 'bun') {
      s.add(o + 7, 3, 3, 3, hc);
      s.add(o + 9, 2, 7, 2, hc);
    } else if (style === 'rough') {
      s.add(o + 8, 1, 8, 3, hc);
      s.add(o + 8, 3, 2, 5, hc);
      s.det(o + 9, 0, 2, 1, hc);
      s.det(o + 13, 0, 2, 1, hc);
    } else if (style === 'long') {
      s.add(o + 8, 2, 8, 3, hc);
      s.add(o + 8, 4, 3, 7, hc);
    } else {
      s.add(o + 9, 2, 7, 2, hc);
      s.add(o + 8, 3, 1, 4, hc);
    }
  }

  function hairBack(s, o, hc, style) {
    if (!hc || style === 'bald') return;
    if (style === 'long') s.add(o + 7, 2, 10, 8, hc);
    else if (style === 'rough' || style === 'curls') s.add(o + 7, 1, 10, 7, hc);
    else if (style === 'afro') {
      s.add(o + 7, 0, 10, 1, hc); s.add(o + 6, 1, 12, 1, hc);
      s.add(o + 5, 2, 14, 6, hc); s.add(o + 6, 8, 12, 1, hc);
    }
    else if (style === 'bun') { s.add(o + 8, 2, 8, 6, hc); s.add(o + 10, 0, 4, 2, hc); }
    else if (style === 'pomp') s.add(o + 8, 1, 8, 7, hc);
    else if (style === 'swoop') s.add(o + 7, 2, 10, 6, hc);
    else s.add(o + 8, 2, 8, 6, hc);
  }


  /* Head silhouettes, one [x, width] pair per row from HEAD_Y down. Feature
     positions stay fixed, so a shape change never shifts the eyes. */
  var FACES = {
    square:  [[8, 8], [8, 8], [8, 8], [8, 8], [8, 8], [8, 8], [8, 8], [8, 8]],
    round:   [[9, 6], [8, 8], [8, 8], [8, 8], [8, 8], [8, 8], [8, 8], [9, 6]],
    tapered: [[8, 8], [8, 8], [8, 8], [8, 8], [8, 8], [8, 8], [9, 6], [9, 6]],
    slim:    [[9, 6], [9, 6], [9, 6], [9, 6], [9, 6], [9, 6], [9, 6], [9, 6]],
    broad:   [[8, 8], [8, 8], [8, 8], [8, 8], [8, 8], [7, 10], [7, 10], [7, 10]]
  };

  function head(s, o, def, sk) {
    var rows = FACES[def.face] || FACES.square;
    for (var i = 0; i < rows.length; i += 1) {
      s.add(o + rows[i][0], HEAD_Y + i, rows[i][1], 1, sk);
    }
  }

  function brows(s, o, def, hc, skin) {
    var kind = def.brows;
    if (!kind || kind === 'none') return;
    var c = def.browColor || hc || skin.shade;
    if (kind === 'thin') {
      s.det(o + 8, 4, 3, 1, c); s.det(o + 13, 4, 3, 1, c);
    } else if (kind === 'thick') {
      s.det(o + 8, 4, 3, 1, c); s.det(o + 13, 4, 3, 1, c);
      s.det(o + 8, 3, 2, 1, c); s.det(o + 14, 3, 2, 1, c);
    } else if (kind === 'arched') {
      s.det(o + 8, 4, 1, 1, c); s.det(o + 9, 3, 2, 1, c);
      s.det(o + 13, 3, 2, 1, c); s.det(o + 15, 4, 1, 1, c);
    } else if (kind === 'angled') {
      // Inner ends dropped toward the nose.
      s.det(o + 8, 3, 2, 1, c); s.det(o + 10, 4, 1, 1, c);
      s.det(o + 13, 4, 1, 1, c); s.det(o + 14, 3, 2, 1, c);
    }
  }

  /* The eyes and the lenses share one geometry: each eye sits at the centre of
     a 3x4 cell, so a makeup ring and a spectacle frame occupy the same box. */
  var EYE_L = 9, EYE_R = 14, EYE_Y = 6;

  var LEGACY_MAKEUP = { shadow: ['top'], liner: ['bottom', 'outer'], full: ['top', 'bottom', 'outer'] };

  function makeupParts(def) {
    var m = def.makeup;
    if (!m || m === 'none') return null;
    if (typeof m === 'string') m = LEGACY_MAKEUP[m] || null;
    return m && m.length ? m : null;
  }

  /* Each edge of the ring toggles on its own; switch them all on and the eye
     is fully enclosed, which is what reads as tired or bruised. */
  function makeup(s, o, def) {
    var parts = makeupParts(def);
    if (!parts) return;
    var top = def.makeupColor || '#8a4a7a';
    var bottom = def.makeupColor2 || top;
    var has = function (k) { return parts.indexOf(k) !== -1; };
    [[EYE_L, -1, 1], [EYE_R, 1, -1]].forEach(function (eye) {
      var ex = eye[0], outer = eye[1], inner = eye[2];
      if (has('top')) s.det(o + ex - 1, EYE_Y - 1, 3, 1, top);
      if (has('bottom')) s.det(o + ex - 1, EYE_Y + 2, 3, 1, bottom);
      if (has('outer')) s.det(o + ex + outer, EYE_Y, 1, 2, top);
      if (has('inner')) s.det(o + ex + inner, EYE_Y, 1, 2, top);
    });
  }

  function makeupSide(s, o, def) {
    var parts = makeupParts(def);
    if (!parts) return;
    var top = def.makeupColor || '#8a4a7a';
    var bottom = def.makeupColor2 || top;
    var has = function (k) { return parts.indexOf(k) !== -1; };
    if (has('top')) s.det(o + EYE_R - 1, EYE_Y - 1, 3, 1, top);
    if (has('bottom')) s.det(o + EYE_R - 1, EYE_Y + 2, 3, 1, bottom);
    if (has('outer')) s.det(o + EYE_R + 1, EYE_Y, 1, 2, top);
    if (has('inner')) s.det(o + EYE_R - 1, EYE_Y, 1, 2, top);
  }

  // Older characters put eyewear in `eyes`; honour that.
  function specsOf(def) {
    if (def.glasses) return def.glasses === 'none' ? null : def.glasses;
    if (def.eyes === 'round') return 'round';
    if (def.eyes === 'shades') return 'shades';
    return null;
  }

  function tinted(kind) {
    return kind === 'shades' || kind === 'roundShades' || kind === 'aviator';
  }

  /* Front lenses are the 3x3 box around each eye, bridged across the nose. */
  function glasses(s, o, kind, frameColor, lensColor) {
    if (!kind) return;
    var fr = frameColor || '#2b3140';
    var tint = lensColor || '#181c24';
    var L = EYE_L - 1, R = EYE_R - 1, Y = EYE_Y - 1;

    if (kind === 'round') {
      // Compass points only: a full ring is indistinguishable from a square
      // one at this size.
      [EYE_L, EYE_R].forEach(function (ex) {
        s.det(o + ex, Y, 1, 1, fr); s.det(o + ex, Y + 2, 1, 1, fr);
        s.det(o + ex - 1, EYE_Y, 1, 1, fr); s.det(o + ex + 1, EYE_Y, 1, 1, fr);
      });
      s.det(o + 11, EYE_Y, 2, 1, fr);
    } else if (kind === 'square') {
      [L, R].forEach(function (x) {
        s.det(o + x, Y, 3, 1, fr); s.det(o + x, Y + 2, 3, 1, fr);
        s.det(o + x, EYE_Y, 1, 1, fr); s.det(o + x + 2, EYE_Y, 1, 1, fr);
      });
      s.det(o + 11, EYE_Y, 2, 1, fr);
    } else if (kind === 'halfRim') {
      // Brow bar only, with the bridge dropped a row so it stays two lenses.
      s.det(o + L, Y, 3, 1, fr); s.det(o + R, Y, 3, 1, fr);
      s.det(o + 11, EYE_Y, 2, 1, fr);
      s.det(o + L, EYE_Y, 1, 1, fr); s.det(o + R + 2, EYE_Y, 1, 1, fr);
    } else if (kind === 'shades') {
      s.det(o + L, Y, 8, 3, tint);
      s.det(o + L, Y - 1, 8, 1, fr);
      s.det(o + L + 1, EYE_Y, 1, 1, '#5a6478');
    } else if (kind === 'roundShades') {
      [EYE_L, EYE_R].forEach(function (ex) {
        s.det(o + ex - 1, EYE_Y, 3, 1, tint);
        s.det(o + ex, Y, 1, 1, tint); s.det(o + ex, Y + 2, 1, 1, tint);
      });
      s.det(o + 11, EYE_Y, 2, 1, fr);
    } else if (kind === 'aviator') {
      [L, R].forEach(function (x) {
        s.det(o + x, Y, 3, 2, tint);
        s.det(o + x + 1, Y + 2, 1, 1, tint);
      });
      s.det(o + L, Y - 1, 8, 1, fr);
      s.det(o + 11, Y, 2, 1, fr);
    }
  }

  /* In profile only the near lens shows, and it needs a temple arm running
     back to the ear or it reads as loose pixels on the cheek. */
  function glassesSide(s, o, kind, frameColor, lensColor) {
    if (!kind) return;
    var fr = frameColor || '#2b3140';
    var tint = lensColor || '#181c24';
    var x = EYE_R - 1, Y = EYE_Y - 1;

    if (kind === 'round') {
      s.det(o + EYE_R, Y, 1, 1, fr); s.det(o + EYE_R, Y + 2, 1, 1, fr);
      s.det(o + x, EYE_Y, 1, 1, fr); s.det(o + x + 2, EYE_Y, 1, 1, fr);
      s.det(o + 11, EYE_Y, 2, 1, fr);
    } else if (kind === 'square') {
      s.det(o + x, Y, 3, 1, fr); s.det(o + x, Y + 2, 3, 1, fr);
      s.det(o + x, EYE_Y, 1, 1, fr); s.det(o + x + 2, EYE_Y, 1, 1, fr);
      s.det(o + 11, EYE_Y, 2, 1, fr);
    } else if (kind === 'halfRim') {
      s.det(o + x, Y, 3, 1, fr);
      s.det(o + x + 2, EYE_Y, 1, 1, fr);
      s.det(o + 11, Y, 3, 1, fr);
    } else if (kind === 'shades') {
      s.det(o + x, Y, 3, 3, tint);
      s.det(o + x, Y - 1, 3, 1, fr);
      s.det(o + 11, Y, 3, 1, fr);
    } else if (kind === 'roundShades') {
      s.det(o + x, EYE_Y, 3, 1, tint);
      s.det(o + EYE_R, Y, 1, 1, tint); s.det(o + EYE_R, Y + 2, 1, 1, tint);
      s.det(o + 11, EYE_Y, 2, 1, fr);
    } else if (kind === 'aviator') {
      s.det(o + x, Y, 3, 2, tint);
      s.det(o + EYE_R, Y + 2, 1, 1, tint);
      s.det(o + x, Y - 1, 3, 1, fr);
      s.det(o + 11, Y, 3, 1, fr);
    }
  }

  /* Chest graphics: 6 wide, 5 tall, centred on the torso like a printed tee. */
  var GRAPHICS = {
    smiley:   ['......', '.#..#.', '......', '#....#', '.####.'],
    thumbsup: ['..#...', '.##...', '#####.', '#####.', '.####.'],
    heart:    ['.#..#.', '######', '######', '.####.', '..##..'],
    star:     ['..##..', '######', '.####.', '..##..', '.#..#.'],
    flower:   ['.#..#.', '..##..', '.####.', '..##..', '.#..#.'],
    snake:    ['.####.', '#.....', '.###..', '....#.', '.####.'],
    spider:   ['#....#', '.#..#.', '#.##.#', '.#..#.', '#....#'],
    skull:    ['.####.', '######', '#.##.#', '.####.', '.#.#..'],
    bolt:     ['...##.', '..##..', '.####.', '..##..', '.##...']
  };

  function graphic(s, x, y, kind, color) {
    var g = GRAPHICS[kind];
    if (!g || !color) return;
    for (var r = 0; r < g.length; r += 1) {
      for (var c = 0; c < g[r].length; c += 1) {
        if (g[r][c] === '#') s.det(x + c, y + r, 1, 1, color);
      }
    }
  }

  // ---------------------------------------------------------------- hats ---

  function hat(s, o, kind, c, facing) {
    if (!kind) return;
    var accent = PW.UI.accent;
    if (kind === 'cowboy') {
      s.add(o + 4, 3, 16, 1, c);
      s.add(o + 9, 0, 6, 3, c);
    } else if (kind === 'beanie') {
      s.add(o + 7, 1, 10, 4, c);
      s.det(o + 7, 4, 10, 1, '#ffffff22');
    } else if (kind === 'cap') {
      s.add(o + 8, 1, 8, 3, c);
      if (facing !== 'back') s.add(o + 16, 3, 4, 1, c);
      else s.add(o + 4, 3, 4, 1, c);
    } else if (kind === 'police') {
      s.add(o + 7, 1, 10, 3, c);          // crown
      s.add(o + 6, 4, 12, 1, '#12151d');  // brim
      if (facing !== 'back') {
        s.det(o + 11, 1, 2, 2, accent);   // shield
        s.det(o + 11, 3, 2, 1, '#c9a24e');
      }
    }
  }

  // ---------------------------------------------------------------- props ---

  function prop(s, o, b, kind, skin) {
    if (!kind) return;
    var hx = o + b.armR;             // just outside the right hand
    if (kind === 'briefcase') {
      s.add(hx, 17, 5, 5, '#5c3d21');
      s.det(hx + 1, 19, 3, 1, '#c9a24e');
      s.det(hx + 1, 16, 3, 1, '#3b2714');
    } else if (kind === 'laptop') {
      s.add(hx - 1, 16, 6, 4, '#8d99ad');
      s.det(hx, 17, 4, 2, '#39435a');
    } else if (kind === 'cup') {
      s.add(hx + 1, 16, 3, 4, '#e8edf5');
      s.det(hx + 1, 17, 3, 3, '#6fae4b');
      s.det(hx + 2, 14, 1, 2, '#e8edf5');
    } else if (kind === 'phone') {
      s.add(hx + 1, 16, 2, 4, '#22262f');
      s.det(hx + 1, 17, 2, 2, '#7fd4ff');
    } else if (kind === 'pills') {
      s.add(hx + 1, 17, 3, 4, '#e8edf5');
      s.det(hx + 1, 17, 3, 1, '#d9534f');
    } else if (kind === 'keyring') {
      s.det(hx + 1, 17, 3, 1, '#c9a24e');
      s.det(hx + 1, 18, 1, 2, '#c9a24e');
      s.det(hx + 3, 18, 1, 2, '#9aa0a8');
    } else if (kind === 'cigar') {
      s.det(o + 16, 9, 4, 1, '#6b4a2a');
      s.det(o + 20, 9, 1, 1, '#f0803a');
    } else if (kind === 'derrick') {
      s.add(hx, 14, 1, 8, '#4a5262');
      s.add(hx + 3, 14, 1, 8, '#4a5262');
      s.det(hx, 17, 4, 1, '#4a5262');
      s.det(hx, 13, 4, 1, '#4a5262');
    }
  }


  /* Shirt patterns are laid flat over the torso, so they follow the garment
     colour without disturbing its outline. */
  function shirtPattern(s, x, y, w, h, kind, color) {
    if (!kind || kind === 'none' || !color) return;
    var i, j;
    if (kind === 'stripes') {
      for (i = x + 1; i < x + w - 1; i += 3) s.det(i, y, 1, h, color);
    } else if (kind === 'bands') {
      for (j = y; j < y + h; j += 2) s.det(x, j, w, 1, color);
    } else if (kind === 'check') {
      for (j = 0; j < h; j += 1) {
        for (i = 0; i < w; i += 1) {
          if ((Math.floor(i / 2) + Math.floor(j / 2)) % 2 === 0) s.det(x + i, y + j, 1, 1, color);
        }
      }
    } else if (kind === 'dots') {
      for (j = 1; j < h; j += 2) {
        for (i = 1; i < w - 1; i += 3) {
          s.det(x + i + (j % 4 === 1 ? 0 : 1), y + j, 1, 1, color);
        }
      }
    }
  }

  function patternOf(def) {
    return def.pattern || (def.pinstripe ? 'stripes' : null);
  }

  function patternColorOf(def) {
    return def.patternColor || def.pinstripe || null;
  }

  // ------------------------------------------------------------- torso art --

  function torsoDetail(s, o, b, def, facing) {
    var cx = o + b.torsoX + Math.floor(b.torsoW / 2);
    // Seam between sleeve and body, so a matching-colour arm still reads.
    s.det(o + b.torsoX, TORSO_Y, 1, TORSO_H, PW.shade(def.shirt, 0.72));
    s.det(o + b.torsoX + b.torsoW - 1, TORSO_Y, 1, TORSO_H, PW.shade(def.shirt, 0.72));
    shirtPattern(s, o + b.torsoX, TORSO_Y, b.torsoW, TORSO_H, patternOf(def), patternColorOf(def));
    if (facing === 'back') {
      if (def.backText) {
        s.det(o + b.torsoX + 2, TORSO_Y + 2, b.torsoW - 4, 1, def.backText);
        s.det(o + b.torsoX + 3, TORSO_Y + 4, b.torsoW - 6, 1, def.backText);
      }
      return;
    }
    if (def.tie) {
      s.det(cx - 1, TORSO_Y, 2, 1, '#ffffff');
      s.det(cx - 1, TORSO_Y + 1, 2, 4, def.tie);
    }
    if (def.lapels) {
      s.det(o + b.torsoX + 1, TORSO_Y, 2, 4, def.lapels);
      s.det(o + b.torsoX + b.torsoW - 3, TORSO_Y, 2, 4, def.lapels);
    }
    if (def.chain) s.det(cx - 2, TORSO_Y + 1, 4, 1, '#e4c06a');
    if (def.badge) s.det(o + b.torsoX + b.torsoW - 3, TORSO_Y + 1, 2, 2, PW.UI.accent);
  }


  function belt(s, o, b, def) {
    if (!def.belt) return;
    s.det(o + b.hipX, HIP_Y, b.hipW, 1, def.belt);
    s.det(o + b.hipX + Math.floor(b.hipW / 2) - 1, HIP_Y, 2, 1, '#e4c06a');
  }

  // ------------------------------------------------------------- assembly --

  function drawFront(s, def, cuffed) {
    var o = def.offsetX || 0;
    var b = BUILDS[def.build || 'normal'];
    var skin = PW.SKIN[def.skin] || PW.SKIN.tan;
    var sk = skin.base;
    var sleeve = def.sleeves === 'short' ? sk : def.shirt;
    var hc = def.hair && PW.HAIR[def.hair];

    s.add(o + b.hipX, HIP_Y, b.hipW, HIP_H, def.pants);
    s.add(o + b.legLX, LEG_Y, b.legW, LEG_H, def.pants);
    s.add(o + b.legRX, LEG_Y, b.legW, LEG_H, def.pants);
    s.add(o + b.legLX, SHOE_Y, b.legW, SHOE_H, def.shoes);
    s.add(o + b.legRX, SHOE_Y, b.legW, SHOE_H, def.shoes);
    belt(s, o, b, def);

    s.add(o + b.torsoX, TORSO_Y, b.torsoW, TORSO_H, def.shirt);
    torsoDetail(s, o, b, def, 'front');
    if (def.graphic && def.graphic !== 'none') {
      graphic(s, o + b.torsoX + Math.floor(b.torsoW / 2) - 3, TORSO_Y + 1,
        def.graphic, def.graphicColor || '#f2f4f8');
    }

    if (cuffed) {
      // Upper arms hang, forearms fold in, wrists meet at the belt line.
      var cx = o + b.torsoX + Math.floor(b.torsoW / 2);
      s.add(o + b.armL, TORSO_Y, 2, 4, sleeve);
      s.add(o + b.armR, TORSO_Y, 2, 4, sleeve);
      s.add(o + b.armL + 2, TORSO_Y + 3, 3, 2, sleeve);
      s.add(o + b.armR - 3, TORSO_Y + 3, 3, 2, sleeve);
      s.add(cx - 2, TORSO_Y + 4, 4, 3, sk);
      s.det(cx - 2, TORSO_Y + 4, 4, 1, PW.UI.cuff);
      s.det(cx - 1, TORSO_Y + 5, 2, 1, PW.UI.cuffShade);
    } else {
      s.add(o + b.armL, TORSO_Y, 2, 5, sleeve);
      s.add(o + b.armR, TORSO_Y, 2, 5, sleeve);
      s.add(o + b.armL, TORSO_Y + 5, 2, 2, sk);
      s.add(o + b.armR, TORSO_Y + 5, 2, 2, sk);
      prop(s, o, b, def.prop, sk);
    }

    s.add(o + 11, NECK_Y, 2, 1, sk);
    head(s, o, def, sk);

    if (def.beard) {
      var bc = PW.HAIR[def.beard.color] || PW.HAIR.brown;
      if (def.beard.style === 'full') {
        s.add(o + 8, 7, 8, 4, bc);
        s.add(o + 7, 6, 1, 4, bc);
        s.add(o + 16, 6, 1, 4, bc);
        s.det(o + 10, 8, 4, 1, skin.shade);
      } else if (def.beard.style === 'goatee') {
        s.det(o + 10, 8, 4, 3, bc);
      } else {
        s.det(o + 9, 8, 6, 2, bc + '');
      }
    } else {
      s.det(o + 11, 9, 2, 1, skin.shade);
    }

    var specs = specsOf(def);
    if (!tinted(specs)) {
      makeup(s, o, def);
      var iris = def.eyeColor || '#1f2430';
      s.det(o + EYE_L, EYE_Y, 1, 2, iris);
      s.det(o + EYE_R, EYE_Y, 1, 2, iris);
    }
    glasses(s, o, specs, def.glassesColor, def.lensColor);
    brows(s, o, def, hc, skin);

    hairFront(s, o, hc, def.hairStyle);
    hat(s, o, def.hat, def.hatColor, 'front');
  }

  function drawSide(s, def, cuffed) {
    var o = def.offsetX || 0;
    var b = BUILDS[def.build || 'normal'];
    var skin = PW.SKIN[def.skin] || PW.SKIN.tan;
    var sk = skin.base;
    var sleeve = def.sleeves === 'short' ? sk : def.shirt;
    var hc = def.hair && PW.HAIR[def.hair];
    var narrow = Math.max(6, b.torsoW - 4);
    var tx = o + 12 - Math.floor(narrow / 2);

    s.add(tx, HIP_Y, narrow, HIP_H, def.pants);
    s.add(tx + 1, LEG_Y, narrow - 2, LEG_H, def.pants);
    s.add(tx, SHOE_Y, narrow + 1, SHOE_H, def.shoes);
    if (def.belt) s.det(tx, HIP_Y, narrow, 1, def.belt);

    s.add(tx, TORSO_Y, narrow, TORSO_H, def.shirt);
    shirtPattern(s, tx, TORSO_Y, narrow, TORSO_H, patternOf(def), patternColorOf(def));

    if (cuffed) {
      // Arms out in front, wrists banded.
      s.add(tx + narrow - 2, TORSO_Y + 1, 4, 2, sleeve);
      s.add(tx + narrow + 2, TORSO_Y + 1, 3, 3, sk);
      s.det(tx + narrow + 2, TORSO_Y + 1, 3, 1, PW.UI.cuff);
    } else {
      s.add(tx + 2, TORSO_Y, 3, 5, sleeve);
      s.add(tx + 2, TORSO_Y + 5, 3, 2, sk);
      prop(s, o, b, def.prop, sk);
    }

    s.add(o + 11, NECK_Y, 3, 1, sk);
    var slim = def.face === 'slim';
    s.add(o + (slim ? 10 : 9), HEAD_Y, slim ? 6 : 7, HEAD_H, sk);
    if (def.face === 'broad') s.add(o + 9, 8, 8, 3, sk);
    s.add(o + 16, 6, 1, 2, sk);          // nose

    if (def.beard) {
      var bc = PW.HAIR[def.beard.color] || PW.HAIR.brown;
      s.add(o + 13, 7, 4, 4, bc);
      s.add(o + 9, 6, 1, 4, bc);
    }

    var sspecs = specsOf(def);
    if (!tinted(sspecs)) {
      makeupSide(s, o, def);
      s.det(o + EYE_R, EYE_Y, 1, 2, def.eyeColor || '#1f2430');
    }
    glassesSide(s, o, sspecs, def.glassesColor, def.lensColor);
    if (def.brows && def.brows !== 'none') {
      s.det(o + EYE_R - 1, 4, 3, 1, def.browColor || hc || skin.shade);
    }

    hairSide(s, o, hc, def.hairStyle);
    hat(s, o, def.hat, def.hatColor, 'side');
  }

  function drawBack(s, def, cuffed) {
    var o = def.offsetX || 0;
    var b = BUILDS[def.build || 'normal'];
    var skin = PW.SKIN[def.skin] || PW.SKIN.tan;
    var sk = skin.base;
    var sleeve = def.sleeves === 'short' ? sk : def.shirt;
    var hc = def.hair && PW.HAIR[def.hair];

    s.add(o + b.hipX, HIP_Y, b.hipW, HIP_H, def.pants);
    s.add(o + b.legLX, LEG_Y, b.legW, LEG_H, def.pants);
    s.add(o + b.legRX, LEG_Y, b.legW, LEG_H, def.pants);
    s.add(o + b.legLX, SHOE_Y, b.legW, SHOE_H, def.shoes);
    s.add(o + b.legRX, SHOE_Y, b.legW, SHOE_H, def.shoes);
    belt(s, o, b, def);

    s.add(o + b.torsoX, TORSO_Y, b.torsoW, TORSO_H, def.shirt);
    torsoDetail(s, o, b, def, 'back');

    if (cuffed) {
      // Hands are hidden from behind, so the read is hunched shoulders plus a
      // glint of steel at each wrist.
      s.add(o + b.armL, TORSO_Y - 1, 2, 6, sleeve);
      s.add(o + b.armR, TORSO_Y - 1, 2, 6, sleeve);
      s.det(o + b.armL, TORSO_Y + 5, 2, 1, PW.UI.cuff);
      s.det(o + b.armR, TORSO_Y + 5, 2, 1, PW.UI.cuff);
    } else {
      s.add(o + b.armL, TORSO_Y, 2, 5, sleeve);
      s.add(o + b.armR, TORSO_Y, 2, 5, sleeve);
      s.add(o + b.armL, TORSO_Y + 5, 2, 2, sk);
      s.add(o + b.armR, TORSO_Y + 5, 2, 2, sk);
      prop(s, o, b, def.prop, sk);
    }

    s.add(o + 11, NECK_Y, 2, 1, sk);
    head(s, o, def, sk);
    hairBack(s, o, hc, def.hairStyle);
    hat(s, o, def.hat, def.hatColor, 'back');
  }

  function render(def, facing, cuffed) {
    var cv = document.createElement('canvas');
    cv.width = S;
    cv.height = S;
    var ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    var s = new Shapes();
    if (facing === 'side') drawSide(s, def, cuffed);
    else if (facing === 'back') drawBack(s, def, cuffed);
    else drawFront(s, def, cuffed);
    s.paint(ctx);
    return cv;
  }

  /* Bake every sprite a character needs. Players are never cuffed; executives
     only ever appear loose (holding their prop) or cuffed. */
  PW.bake = function (def, opts) {
    var cuffed = !!(opts && opts.cuffed);
    return {
      front: render(def, 'front', cuffed),
      side: render(def, 'side', cuffed),
      back: render(def, 'back', cuffed),
      loose: render(def, 'front', false)
    };
  };

  PW.blit = function (ctx, img, x, y, flip) {
    if (!flip) { ctx.drawImage(img, x, y); return; }
    ctx.save();
    ctx.translate(x + S, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  };
})(window.PW);
