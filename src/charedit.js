/* The character editor, as a drop-in panel.

   Both the standalone forge and the game's own "make your own" panel mount this,
   so the field list, the state shape and the emitted source all live in one
   place. Styles are injected once under prefixed class names, so a host page
   only has to provide a container. */
(function (PW) {
  'use strict';

  var C = {};
  PW.CHAR = C;

  C.SKINS = ['porcelain', 'pale', 'rose', 'peach', 'amber', 'olive',
             'tan', 'brown', 'umber', 'deep', 'ebony'];
  C.HAIRS = ['black', 'dark', 'brown', 'ginger', 'blonde', 'grey', 'white'];
  C.HAIR_STYLES = ['buzz', 'crop', 'slick', 'swoop', 'pomp', 'rough', 'curls', 'afro', 'bun', 'long', 'bald'];
  C.FACES = ['square', 'round', 'tapered', 'slim', 'broad'];
  C.BROWS = ['none', 'thin', 'thick', 'arched', 'angled'];
  C.BEARDS = ['none', 'full', 'goatee', 'stubble'];
  C.MAKEUP_EDGES = ['top', 'bottom', 'outer', 'inner'];
  C.GLASSES = ['none', 'round', 'square', 'halfRim', 'shades', 'roundShades', 'aviator'];
  C.HATS = ['none', 'cap', 'beanie', 'cowboy', 'police'];
  C.BUILDS = ['normal', 'heavy', 'lean'];
  C.SLEEVES = ['long', 'short'];
  C.PATTERNS = ['none', 'stripes', 'bands', 'check', 'dots'];
  C.GRAPHICS = ['none', 'smiley', 'thumbsup', 'heart', 'star', 'flower', 'snake', 'spider', 'skull', 'bolt'];
  C.PROPS = ['none', 'briefcase', 'laptop', 'cup', 'phone', 'pills', 'keyring', 'cigar', 'derrick'];

  // Fields that are only written when switched on.
  var OPT_COLORS = ['eyeColor', 'browColor', 'makeupColor2', 'glassesColor',
                    'lensColor', 'tie', 'lapels', 'belt', 'backText'];

  var GROUPS = [
    ['Identity', [{ k: 'name', t: 'text' }]],
    ['Body', [
      { k: 'skin', t: 'select', opts: C.SKINS },
      { k: 'build', t: 'select', opts: C.BUILDS },
      { k: 'face', t: 'select', opts: C.FACES }
    ]],
    ['Hair', [
      { k: 'hairStyle', t: 'select', opts: C.HAIR_STYLES },
      { k: 'hair', t: 'select', opts: C.HAIRS },
      { k: 'beardStyle', t: 'select', opts: C.BEARDS },
      { k: 'beardColor', t: 'select', opts: C.HAIRS },
      { k: 'hat', t: 'select', opts: C.HATS },
      { k: 'hatColor', t: 'color' }
    ]],
    ['Eyes', [
      { k: 'brows', t: 'select', opts: C.BROWS },
      { k: 'browColor', t: 'optcolor' },
      { k: 'eyeColor', t: 'optcolor' },
      { k: 'makeupTop', t: 'bool' },
      { k: 'makeupBottom', t: 'bool' },
      { k: 'makeupOuter', t: 'bool' },
      { k: 'makeupInner', t: 'bool' },
      { k: 'makeupColor', t: 'color' },
      { k: 'makeupColor2', t: 'optcolor' }
    ]],
    ['Glasses', [
      { k: 'glasses', t: 'select', opts: C.GLASSES },
      { k: 'glassesColor', t: 'optcolor' },
      { k: 'lensColor', t: 'optcolor' }
    ]],
    ['Clothes', [
      { k: 'shirt', t: 'color' },
      { k: 'pattern', t: 'select', opts: C.PATTERNS },
      { k: 'patternColor', t: 'color' },
      { k: 'graphic', t: 'select', opts: C.GRAPHICS },
      { k: 'graphicColor', t: 'color' },
      { k: 'sleeves', t: 'select', opts: C.SLEEVES },
      { k: 'pants', t: 'color' },
      { k: 'shoes', t: 'color' }
    ]],
    ['Details', [
      { k: 'tie', t: 'optcolor' },
      { k: 'lapels', t: 'optcolor' },
      { k: 'belt', t: 'optcolor' },
      { k: 'backText', t: 'optcolor' },
      { k: 'chain', t: 'bool' },
      { k: 'badge', t: 'bool' }
    ]],
    ['Prop', [{ k: 'prop', t: 'select', opts: C.PROPS }]]
  ];

  var LABELS = {
    name: 'Name', skin: 'Skin', build: 'Build', face: 'Face shape',
    hairStyle: 'Hair', hair: 'Hair colour', beardStyle: 'Beard', beardColor: 'Beard colour',
    hat: 'Hat', hatColor: 'Hat colour',
    brows: 'Brows', browColor: 'Brow colour', eyeColor: 'Eye colour',
    makeupTop: 'Ring: top', makeupBottom: 'Ring: bottom', makeupOuter: 'Ring: outer',
    makeupInner: 'Ring: inner', makeupColor: 'Ring colour', makeupColor2: 'Lower colour',
    glasses: 'Glasses', glassesColor: 'Frames', lensColor: 'Lenses',
    shirt: 'Shirt', pattern: 'Pattern', patternColor: 'Pattern colour',
    graphic: 'Graphic', graphicColor: 'Graphic colour', sleeves: 'Sleeves',
    pants: 'Trousers', shoes: 'Shoes', tie: 'Tie', lapels: 'Lapels', belt: 'Belt',
    backText: 'Back marks', chain: 'Chain', badge: 'Badge', prop: 'Prop'
  };

  C.defaults = function () {
    return {
      name: 'MY OFFICER', skin: 'olive', build: 'normal', face: 'square',
      hairStyle: 'swoop', hair: 'brown', beardStyle: 'none', beardColor: 'brown',
      hat: 'none', hatColor: '#2b3a4a',
      brows: 'thin', browColor: null, eyeColor: null,
      makeupTop: false, makeupBottom: false, makeupOuter: false, makeupInner: false,
      makeupColor: '#8a4a7a', makeupColor2: null,
      glasses: 'none', glassesColor: null, lensColor: null,
      shirt: '#33436b', pattern: 'none', patternColor: '#5a6a8c',
      graphic: 'none', graphicColor: '#f2f4f8', sleeves: 'long',
      pants: '#232c42', shoes: '#141821',
      tie: null, lapels: null, belt: '#141821', backText: null,
      chain: false, badge: true, prop: 'none'
    };
  };

  function slug(name) {
    var v = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return v || 'character';
  }

  // Editor state -> the object the sprite renderer consumes.
  C.toDef = function (S) {
    var d = {
      id: slug(S.name), name: String(S.name).toUpperCase(),
      skin: S.skin, build: S.build, face: S.face, hairStyle: S.hairStyle,
      shirt: S.shirt, sleeves: S.sleeves, pants: S.pants, shoes: S.shoes
    };
    if (S.hairStyle !== 'bald') d.hair = S.hair;
    if (S.beardStyle !== 'none') d.beard = { style: S.beardStyle, color: S.beardColor };
    if (S.hat !== 'none') { d.hat = S.hat; d.hatColor = S.hatColor; }
    if (S.brows !== 'none') d.brows = S.brows;
    var ring = C.MAKEUP_EDGES.filter(function (e) {
      return S['makeup' + e.charAt(0).toUpperCase() + e.slice(1)];
    });
    if (ring.length) { d.makeup = ring; d.makeupColor = S.makeupColor; }
    if (S.glasses !== 'none') d.glasses = S.glasses;
    if (S.pattern !== 'none') { d.pattern = S.pattern; d.patternColor = S.patternColor; }
    if (S.graphic !== 'none') { d.graphic = S.graphic; d.graphicColor = S.graphicColor; }
    OPT_COLORS.forEach(function (k) { if (S[k]) d[k] = S[k]; });
    if (S.chain) d.chain = true;
    if (S.badge) d.badge = true;
    if (S.prop !== 'none') d.prop = S.prop;
    return d;
  };

  // ...and back again, tolerating eyewear held in `eyes` and the old `pinstripe`.
  C.fromDef = function (d) {
    var S = C.defaults();
    S.name = d.name || 'CHARACTER';
    S.skin = d.skin || 'tan';
    S.build = d.build || 'normal';
    S.face = d.face || 'square';
    S.hairStyle = d.hairStyle || 'buzz';
    S.hair = d.hair || 'black';
    S.beardStyle = d.beard ? d.beard.style : 'none';
    S.beardColor = (d.beard && d.beard.color) || 'brown';
    S.hat = d.hat || 'none';
    S.hatColor = d.hatColor || '#2b3a4a';
    S.brows = d.brows || 'none';
    // Accepts the edge list, or the older shadow/liner/full names.
    var LEGACY = { shadow: ['top'], liner: ['bottom', 'outer'], full: ['top', 'bottom', 'outer'] };
    var ring = d.makeup;
    if (typeof ring === 'string') ring = LEGACY[ring] || [];
    if (!ring) ring = [];
    C.MAKEUP_EDGES.forEach(function (e) {
      S['makeup' + e.charAt(0).toUpperCase() + e.slice(1)] = ring.indexOf(e) !== -1;
    });
    S.makeupColor = d.makeupColor || '#8a4a7a';
    S.glasses = d.glasses || (d.eyes === 'round' ? 'round' : d.eyes === 'shades' ? 'shades' : 'none');
    S.shirt = d.shirt || '#33436b';
    S.pattern = d.pattern || (d.pinstripe ? 'stripes' : 'none');
    S.patternColor = d.patternColor || d.pinstripe || '#5a6a8c';
    S.graphic = d.graphic || 'none';
    S.graphicColor = d.graphicColor || '#f2f4f8';
    S.sleeves = d.sleeves || 'long';
    S.pants = d.pants || '#232c42';
    S.shoes = d.shoes || '#141821';
    OPT_COLORS.forEach(function (k) { S[k] = d[k] || null; });
    S.chain = !!d.chain;
    S.badge = !!d.badge;
    S.prop = d.prop || 'none';
    return S;
  };

  function q(v) { return typeof v === 'string' ? "'" + v + "'" : String(v); }

  C.source = function (d) {
    function line(pairs) { return '  ' + pairs.filter(Boolean).join(', ') + ','; }
    var L = [];
    L.push(line(['id: ' + q(d.id), 'name: ' + q(d.name)]));
    L.push(line([
      'skin: ' + q(d.skin), 'build: ' + q(d.build), 'face: ' + q(d.face),
      d.hair && 'hair: ' + q(d.hair), 'hairStyle: ' + q(d.hairStyle)
    ]));
    if (d.beard) L.push('  beard: { style: ' + q(d.beard.style) + ', color: ' + q(d.beard.color) + ' },');
    if (d.hat) L.push(line(['hat: ' + q(d.hat), 'hatColor: ' + q(d.hatColor)]));
    var eye = [
      d.brows && 'brows: ' + q(d.brows),
      d.browColor && 'browColor: ' + q(d.browColor),
      d.eyeColor && 'eyeColor: ' + q(d.eyeColor),
      d.makeup && 'makeup: [' + d.makeup.map(q).join(', ') + ']',
      d.makeup && 'makeupColor: ' + q(d.makeupColor),
      d.makeupColor2 && 'makeupColor2: ' + q(d.makeupColor2)
    ].filter(Boolean);
    if (eye.length) L.push(line(eye));
    var spec = [
      d.glasses && 'glasses: ' + q(d.glasses),
      d.glassesColor && 'glassesColor: ' + q(d.glassesColor),
      d.lensColor && 'lensColor: ' + q(d.lensColor)
    ].filter(Boolean);
    if (spec.length) L.push(line(spec));
    var wear = ['shirt: ' + q(d.shirt), 'sleeves: ' + q(d.sleeves)];
    if (d.pattern) wear.push('pattern: ' + q(d.pattern), 'patternColor: ' + q(d.patternColor));
    if (d.graphic) wear.push('graphic: ' + q(d.graphic), 'graphicColor: ' + q(d.graphicColor));
    ['tie', 'lapels', 'belt', 'backText'].forEach(function (k) {
      if (d[k]) wear.push(k + ': ' + q(d[k]));
    });
    if (d.chain) wear.push('chain: true');
    if (d.badge) wear.push('badge: true');
    L.push(line(wear));
    var tail = ['pants: ' + q(d.pants), 'shoes: ' + q(d.shoes)];
    if (d.prop) tail.push('prop: ' + q(d.prop));
    L.push('  ' + tail.join(', '));
    return '{\n' + L.join('\n') + '\n},';
  };

  /* Normalise a JS object literal into JSON and parse it, rather than
     evaluating whatever was pasted in. Throws on anything malformed. */
  C.parse = function (text) {
    var raw = String(text).trim().replace(/,\s*$/, '');
    var json = raw
      .replace(/'/g, '"')
      .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
      .replace(/,(\s*[}\]])/g, '$1');
    var d = JSON.parse(json);
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('not an object');
    return d;
  };

  var CSS = [
    '.pwed-group{border-top:1px solid var(--pwed-edge,#232d3c);margin:0;padding:12px 0 0}',
    '.pwed-group:first-child{border-top:0;padding-top:0}',
    '.pwed-legend{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--pwed-label,#c9ced8);padding:0 0 8px}',
    '.pwed-field{display:grid;grid-template-columns:92px 1fr;align-items:center;gap:8px;margin-bottom:6px}',
    '.pwed-field>label{font-size:11px;color:var(--pwed-dim,#78849a)}',
    '.pwed-pair{display:flex;align-items:center;gap:6px}',
    '.pwed input[type=text],.pwed select{width:100%;font:inherit;font-size:12px;color:var(--pwed-text,#dfe6f2);background:var(--pwed-sunk,#0b0f16);border:1px solid var(--pwed-edge,#232d3c);border-radius:3px;padding:4px 6px}',
    '.pwed input[type=color]{width:34px;height:26px;padding:0;background:var(--pwed-sunk,#0b0f16);border:1px solid var(--pwed-edge,#232d3c);border-radius:3px;cursor:pointer}',
    '.pwed input[type=checkbox]{accent-color:var(--pwed-accent,#f5b942);width:15px;height:15px}',
    '.pwed-hex{font-size:11px;color:var(--pwed-dim,#78849a);font-variant-numeric:tabular-nums}'
  ].join('\n');

  var styled = false;
  function injectStyle() {
    if (styled) return;
    styled = true;
    var el = document.createElement('style');
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  /* Mount the control panel. Returns { get, set } — `get` yields a character
     def, `set` takes one. `onChange` fires on every edit with the current def. */
  PW.createEditor = function (mount, opts) {
    injectStyle();
    opts = opts || {};
    var S = opts.value ? C.fromDef(opts.value) : C.defaults();
    var inputs = {};
    mount.classList.add('pwed');
    mount.textContent = '';

    function emit() { if (opts.onChange) opts.onChange(C.toDef(S)); }

    function row(labelText, control) {
      var d = document.createElement('div');
      d.className = 'pwed-field';
      var l = document.createElement('label');
      l.textContent = labelText;
      d.appendChild(l);
      d.appendChild(control);
      return d;
    }

    GROUPS.forEach(function (grp) {
      var fs = document.createElement('div');
      fs.className = 'pwed-group';
      var lg = document.createElement('div');
      lg.className = 'pwed-legend';
      lg.textContent = grp[0];
      fs.appendChild(lg);

      grp[1].forEach(function (f) {
        var control, el;
        if (f.t === 'text') {
          el = document.createElement('input');
          el.type = 'text';
          el.value = S[f.k];
          el.addEventListener('input', function () { S[f.k] = el.value; emit(); });
          control = el;
        } else if (f.t === 'select') {
          el = document.createElement('select');
          f.opts.forEach(function (o) {
            var op = document.createElement('option');
            op.value = o; op.textContent = o;
            el.appendChild(op);
          });
          el.value = S[f.k];
          el.addEventListener('change', function () { S[f.k] = el.value; emit(); });
          control = el;
        } else if (f.t === 'color') {
          control = document.createElement('div');
          control.className = 'pwed-pair';
          el = document.createElement('input');
          el.type = 'color';
          el.value = S[f.k];
          var hex = document.createElement('span');
          hex.className = 'pwed-hex';
          hex.textContent = S[f.k];
          el.addEventListener('input', function () {
            S[f.k] = el.value; hex.textContent = el.value; emit();
          });
          control.appendChild(el);
          control.appendChild(hex);
          el.hexLabel = hex;
        } else if (f.t === 'optcolor') {
          control = document.createElement('div');
          control.className = 'pwed-pair';
          var on = document.createElement('input');
          on.type = 'checkbox';
          on.checked = !!S[f.k];
          el = document.createElement('input');
          el.type = 'color';
          el.value = S[f.k] || '#8a94a6';
          el.disabled = !on.checked;
          var hx = document.createElement('span');
          hx.className = 'pwed-hex';
          hx.textContent = on.checked ? S[f.k] : 'off';
          var sync = function () {
            el.disabled = !on.checked;
            S[f.k] = on.checked ? el.value : null;
            hx.textContent = on.checked ? el.value : 'off';
            emit();
          };
          on.addEventListener('change', sync);
          el.addEventListener('input', sync);
          control.appendChild(on);
          control.appendChild(el);
          control.appendChild(hx);
          el.toggle = on;
          el.hexLabel = hx;
        } else {
          el = document.createElement('input');
          el.type = 'checkbox';
          el.checked = !!S[f.k];
          el.addEventListener('change', function () { S[f.k] = el.checked; emit(); });
          control = el;
        }
        inputs[f.k] = el;
        fs.appendChild(row(LABELS[f.k] || f.k, control));
      });

      mount.appendChild(fs);
    });

    function refresh() {
      Object.keys(inputs).forEach(function (k) {
        var el = inputs[k];
        if (el.type === 'color') {
          var v = S[k];
          if (el.toggle) {
            el.toggle.checked = !!v;
            el.disabled = !v;
            if (v) el.value = v;
            el.hexLabel.textContent = v || 'off';
          } else {
            el.value = v;
            el.hexLabel.textContent = v;
          }
        } else if (el.type === 'checkbox') {
          el.checked = !!S[k];
        } else {
          el.value = S[k];
        }
      });
    }

    emit();

    return {
      get: function () { return C.toDef(S); },
      state: function () { return S; },
      set: function (def) { S = C.fromDef(def); refresh(); emit(); },
      replaceState: function (next) { S = next; refresh(); emit(); }
    };
  };
})(window.PW);
