/* On the List — Casey The American embed controller.

   The standalone page has src/main.js; this is its counterpart for the CTA
   embed, built against the minigame contract: the canvas is the machine, and
   the title, pause and result screens are DOM overlays inside .gm-root.

   window.OnTheList.init(root, base) — guards on root.dataset.booted, finds
   elements via [data-el], reads its palette from the CSS tokens so a CMS theme
   override reaches the canvas too. */
(function (PW) {
  'use strict';

  var BEST_KEY = 'otl.best';
  var CUSTOM_KEY = 'otl.custom';
  var ADMIN_KEY = 'otl.roster.admin';
  var UNLOCK_KEY = 'otl.roster.open';
  var RETRY_DELAY = 0.6;

  window.OnTheList = window.OnTheList || {};


  /* ------------------------------------------------------------- the roster ---

     Admin control from the page, so characters can be changed without a
     rebuild. Set window.OTL_ROSTER before the loader runs:

       officers / execs           replace a whole cast
       addOfficers / addExecs     append to it
       removeOfficers / removeExecs   drop entries, by id
       editOfficers / editExecs   merge fields into an entry, keyed by id

     window.OTL_OFFICERS is still honoured as a shorthand for addOfficers.
     Anything malformed is skipped with a warning rather than breaking the
     game, and a cast that would end up empty keeps what it had. */

  function valid(d) {
    return d && typeof d === 'object' && !Array.isArray(d) &&
      typeof d.name === 'string' && d.name &&
      typeof d.shirt === 'string' && d.shirt;
  }

  function slug(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function clean(list, where) {
    var out = [];
    (list || []).forEach(function (d, i) {
      if (!valid(d)) {
        console.warn('On the List: skipping ' + where + '[' + i + '] - needs at least a name and a shirt colour.', d);
        return;
      }
      if (!d.id) d.id = slug(d.name) || 'character';
      out.push(d);
    });
    return out;
  }

  function applyOne(list, cfg, key, where) {
    var next = list;
    if (Array.isArray(cfg[key])) {
      var replaced = clean(cfg[key], key);
      if (replaced.length) next = replaced;
      else console.warn('On the List: ' + key + ' had nothing usable, keeping the built-in ' + where + '.');
    }
    var addKey = 'add' + key.charAt(0).toUpperCase() + key.slice(1);
    var adds = clean(cfg[addKey], addKey);
    if (adds.length) next = next.concat(adds);

    var edits = cfg['edit' + key.charAt(0).toUpperCase() + key.slice(1)];
    if (edits && typeof edits === 'object') {
      next = next.map(function (d) {
        var patch = edits[d.id];
        if (!patch || typeof patch !== 'object') return d;
        var merged = {};
        Object.keys(d).forEach(function (k) { merged[k] = d[k]; });
        Object.keys(patch).forEach(function (k) { merged[k] = patch[k]; });
        return merged;
      });
      Object.keys(edits).forEach(function (id) {
        if (!next.some(function (d) { return d.id === id; })) {
          console.warn('On the List: no ' + where + ' with id "' + id + '" to edit.');
        }
      });
    }

    var drop = cfg['remove' + key.charAt(0).toUpperCase() + key.slice(1)];
    if (Array.isArray(drop) && drop.length) {
      var kept = next.filter(function (d) { return drop.indexOf(d.id) === -1; });
      drop.forEach(function (id) {
        if (!next.some(function (d) { return d.id === id; })) {
          console.warn('On the List: no ' + where + ' with id "' + id + '" to remove.');
        }
      });
      if (kept.length) next = kept;
      else console.warn('On the List: removing every ' + where + ' would leave none, so none were removed.');
    }
    return next;
  }

  var rosterApplied = false;
  function applyRoster() {
    if (rosterApplied) return;
    rosterApplied = true;
    var cfg = window.OTL_ROSTER;
    if (Array.isArray(window.OTL_OFFICERS)) {
      cfg = cfg && typeof cfg === 'object' ? cfg : {};
      cfg.addOfficers = (cfg.addOfficers || []).concat(window.OTL_OFFICERS);
    }
    if (!cfg || typeof cfg !== 'object') return;
    PW.PLAYERS = applyOne(PW.PLAYERS, cfg, 'officers', 'officer');
    PW.EXECS = applyOne(PW.EXECS, cfg, 'execs', 'executive');
    PW.OFFICER = PW.PLAYERS[0];
  }

  /* ---- the local override -------------------------------------------------

     What the in-game roster panel saves. It is a whole cast rather than a set
     of operations, so it round-trips exactly, and it lives in localStorage —
     which means it changes this browser only. Making a change public is still
     the CMS paste, which the panel writes out for you. */

  function readAdmin() {
    try {
      var raw = window.localStorage.getItem(ADMIN_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      return d && Array.isArray(d.officers) && Array.isArray(d.execs) ? d : null;
    } catch (e) { return null; }
  }

  function applyAdmin() {
    var d = readAdmin();
    if (!d) return;
    var officers = clean(d.officers, 'saved officers');
    var execs = clean(d.execs, 'saved executives');
    if (officers.length) PW.PLAYERS = officers;
    if (execs.length) PW.EXECS = execs;
    PW.OFFICER = PW.PLAYERS[0];
  }

  /* Prints the live roster as pasteable source, so an admin can copy a
     character out of the console, edit it, and put it back through the CMS. */
  function castSource(label, list) {
    return '  ' + label + ': [\n' +
      list.map(function (d) {
        return PW.CHAR.source(d).replace(/^/gm, '    ');
      }).join('\n') + '\n  ],';
  }

  /* The whole live cast as the block an admin pastes above the loader in the
     CMS. This is the step that makes a change public: everything the panel
     saves is local until this lands in the embed field. */
  function rosterBlock() {
    return '<script>\n' +
      'window.OTL_ROSTER = {\n' +
      castSource('officers', PW.PLAYERS) + '\n' +
      castSource('execs', PW.EXECS).replace(/,$/, '') + '\n' +
      '};\n' +
      '<\/script>';
  }

  window.OnTheList.roster = function () {
    var text = rosterBlock();
    console.log(text);
    return text;
  };

  window.OnTheList.init = function (root, base) {
    if (!root || root.dataset.booted) return;
    root.dataset.booted = '1';

    var CONFIG = {
      /* CMS-bound: Webflow fills the ''; empty falls through to the default. */
      rewardCode: '' /*CMS:reward-code*/ || '',
      rewardLink: '' /*CMS:reward-link*/ || '',
      rewardDesc: '' /*CMS:reward-desc*/ || '',
      copiedMsg:  '' /*CMS:copied-msg*/  || 'Code copied'
    };

    var el = function (name) { return root.querySelector('[data-el="' + name + '"]'); };

    /* The canvas draws in JS, so it reads the same tokens the stylesheet sets.
       A CMS colour override therefore reaches the playfield, not just chrome. */
    var css = getComputedStyle(root);
    function token(name, fallback) {
      var v = css.getPropertyValue(name);
      return (v && v.trim()) || fallback;
    }
    PW.UI.void = token('--ol-void', PW.UI.void);
    PW.UI.frame = token('--ol-frame', PW.UI.frame);
    PW.UI.frameEdge = token('--ol-frame-edge', PW.UI.frameEdge);
    PW.UI.lotA = token('--ol-plaza-a', PW.UI.lotA);
    PW.UI.lotB = token('--ol-plaza-b', PW.UI.lotB);
    PW.UI.grit = [token('--ol-grit-a', PW.UI.grit[0]), token('--ol-grit-b', PW.UI.grit[1])];
    PW.UI.barBg = token('--ol-bar', PW.UI.barBg);
    PW.UI.text = token('--gm-ink', PW.UI.text);
    PW.UI.textDim = token('--gm-dim', PW.UI.textDim);
    PW.UI.accent = token('--gm-primary', PW.UI.accent);
    PW.UI.danger = token('--gm-bad', PW.UI.danger);

    applyRoster();
    applyAdmin();
    PW.bakeAll();

    /* The RichText embed nests the game several levels deep; each wrapper has
       to become a full-height flex column or the stage collapses to a sliver. */
    (function () {
      var node = root.parentElement;
      for (var i = 0; node && i < 8; i += 1) {
        var tag = (node.tagName || '').toUpperCase();
        if (tag === 'BODY' || tag === 'HTML') break;
        node.style.display = 'flex';
        node.style.flexDirection = 'column';
        node.style.minHeight = '0';
        node.style.height = '100%';
        if (node.classList && node.classList.contains('games-script')) break;
        node = node.parentElement;
      }
    })();

    var stage = el('stage');

    /* The Webflow column has to have a real height of its own — 100% of nothing
       is nothing. Fall back to 80vh rather than collapsing to a sliver. */
    if (stage.getBoundingClientRect().height < 80) root.style.height = '80vh';

    var screen = PW.createScreen(stage, {
      width: PW.VIEW.width,
      height: PW.VIEW.height,
      background: PW.UI.void
    });
    var ctx = screen.ctx;
    var audio = PW.createAudio(null, null);
    var dust = PW.createDust();

    function readBest() {
      try {
        var v = parseInt(window.localStorage.getItem(BEST_KEY), 10);
        return isFinite(v) && v > 0 ? v : 0;
      } catch (e) { return 0; }
    }
    function writeBest(v) {
      try { window.localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* private mode */ }
    }

    function readCustom() {
      try {
        var raw = window.localStorage.getItem(CUSTOM_KEY);
        if (!raw) return null;
        var d = JSON.parse(raw);
        return d && typeof d === 'object' && d.shirt ? d : null;
      } catch (e) { return null; }
    }

    var custom = readCustom();

    /* The presets, plus whatever the player built. */
    function buildEntries() {
      var list = PW.PLAYERS.map(function (d, i) {
        return { name: d.name, art: PW.art.players[i] };
      });
      if (custom) list.push({ name: custom.name || 'MINE', art: PW.bake(custom, { cuffed: false }) });
      return list;
    }

    var entries = buildEntries();

    var ui = {
      screen: 'game',
      chrome: false,        // title, pause and result are DOM overlays here
      entries: entries,
      selectIndex: 0,
      playerArt: entries[0].art,
      best: readBest(),
      clock: 0,
      pop: 0,
      shake: 0,
      fresh: false,
      dust: dust
    };

    var game = PW.newGame();
    var phase = 'title';       // title | playing | paused | over
    var lastPhase = '';

    // ------------------------------------------------------------ officers ---

    var pickWrap = el('officers');

    function renderOfficers() {
      pickWrap.innerHTML = '';
      entries.forEach(function (entry, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ol-officer' + (i === ui.selectIndex ? ' is-on' : '');
        var cv = document.createElement('canvas');
        cv.width = PW.SPRITE * 2;
        cv.height = PW.SPRITE * 2;
        var c = cv.getContext('2d');
        c.imageSmoothingEnabled = false;
        c.drawImage(entry.art.front, 0, 0, cv.width, cv.height);
        var name = document.createElement('span');
        name.textContent = entry.name;
        btn.appendChild(cv);
        btn.appendChild(name);
        btn.addEventListener('click', function () {
          ui.selectIndex = i;
          ui.playerArt = entry.art;
          pickWrap.querySelectorAll('.ol-officer').forEach(function (b) { b.classList.remove('is-on'); });
          btn.classList.add('is-on');
          audio.steer();
        });
        pickWrap.appendChild(btn);
      });
    }

    // -------------------------------------------------------------- overlays ---

    function show(name, on) {
      var node = el(name);
      if (node) node.hidden = !on;
    }

    /* The same editor the standalone page and the forge mount, in an overlay
       sized to the embed. Saving writes to this origin's localStorage, so a
       character survives between visits to the page. */
    var maker = null;
    function openMaker() {
      audio.wake();
      show('ovTitle', false);
      show('ovMaker', true);
      if (maker) return;
      var box = el('myFacings');
      maker = PW.createEditor(el('myControls'), {
        value: custom || undefined,
        onChange: function (def) {
          var art = PW.bake(def, { cuffed: false });
          box.innerHTML = '';
          ['front', 'side', 'back'].forEach(function (f) {
            var wrap = document.createElement('div');
            var cv = document.createElement('canvas');
            cv.width = PW.SPRITE * 3;
            cv.height = PW.SPRITE * 3;
            var c = cv.getContext('2d');
            c.imageSmoothingEnabled = false;
            c.drawImage(art[f], 0, 0, cv.width, cv.height);
            wrap.appendChild(cv);
            box.appendChild(wrap);
          });
        }
      });
    }

    function closeMaker() {
      show('ovMaker', false);
      show('ovTitle', true);
    }

    function note(msg) {
      var n = el('myNote');
      if (n) n.textContent = msg || '';
    }

    function saveCustom() {
      var def = maker.get();
      custom = def;
      try { window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(def)); }
      catch (e) { note('This browser will not keep them, but they are in the line-up for now.'); }
      entries = buildEntries();
      ui.selectIndex = entries.length - 1;
      ui.playerArt = entries[ui.selectIndex].art;
      renderOfficers();
      note(def.name + ' is in the line-up.');
      closeMaker();
    }

    function clearCustom() {
      custom = null;
      try { window.localStorage.removeItem(CUSTOM_KEY); } catch (e) { /* private mode */ }
      entries = buildEntries();
      if (ui.selectIndex >= entries.length) ui.selectIndex = 0;
      ui.playerArt = entries[ui.selectIndex].art;
      renderOfficers();
      note('Removed.');
    }

    // ------------------------------------------------------- the roster door ---

    /* Nine taps on the eyebrow, then a password, opens a panel that edits the
       cast the game is actually running. Two honest limits, both stated in the
       panel itself: the password is a latch rather than a lock, since the whole
       bundle is public source anyone can read; and a save changes this browser
       only. Neither matters much, because the panel cannot publish — Copy
       roster block hands you the snippet, and pasting it into the CMS is what
       makes a change everyone sees. */

    var TAPS_NEEDED = 9;
    var TAP_GAP = 2500;      // ms; a pause resets the count
    var PASS_HASH = 3180838820;

    function hash(str) {
      var h = 5381;
      for (var i = 0; i < str.length; i += 1) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
      return h;
    }

    var taps = 0;
    var lastTap = 0;

    function countTap() {
      var now = Date.now();
      taps = (now - lastTap > TAP_GAP) ? 1 : taps + 1;
      lastTap = now;
      if (taps < TAPS_NEEDED) return;
      taps = 0;
      if (unlocked()) openAdmin();
      else openGate();
    }

    function unlocked() {
      try { return window.sessionStorage.getItem(UNLOCK_KEY) === '1'; }
      catch (e) { return false; }
    }
    function setUnlocked() {
      try { window.sessionStorage.setItem(UNLOCK_KEY, '1'); } catch (e) { /* private mode */ }
    }

    function openGate() {
      show('ovTitle', false);
      show('ovGate', true);
      el('gateNote').textContent = '';
      el('gateInput').value = '';
      el('gateInput').focus();
    }

    function closeGate() {
      show('ovGate', false);
      show('ovTitle', true);
    }

    function trySignIn() {
      if (hash(el('gateInput').value) !== PASS_HASH) {
        el('gateNote').textContent = 'Not on the roster.';
        el('gateInput').value = '';
        el('gateInput').focus();
        return;
      }
      setUnlocked();
      show('ovGate', false);
      openAdmin();
    }

    // ---- the panel ----

    var adminEditor = null;
    var adminCast = 'officers';   // officers | execs
    var adminIndex = 0;

    function cast() { return adminCast === 'officers' ? PW.PLAYERS : PW.EXECS; }

    function adminNote(msg) {
      var n = el('adminNote');
      if (n) n.textContent = msg || '';
    }

    function drawFacings(box, def) {
      var art = PW.bake(def, { cuffed: false });
      box.innerHTML = '';
      ['front', 'side', 'back'].forEach(function (f) {
        var wrap = document.createElement('div');
        var cv = document.createElement('canvas');
        cv.width = PW.SPRITE * 3;
        cv.height = PW.SPRITE * 3;
        var c = cv.getContext('2d');
        c.imageSmoothingEnabled = false;
        c.drawImage(art[f], 0, 0, cv.width, cv.height);
        wrap.appendChild(cv);
        box.appendChild(wrap);
      });
    }

    function renderCast() {
      var wrap = el('adminCast');
      wrap.innerHTML = '';
      cast().forEach(function (d, i) {
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'ol-cast-row' + (i === adminIndex ? ' is-on' : '');
        var cv = document.createElement('canvas');
        cv.width = PW.SPRITE;
        cv.height = PW.SPRITE;
        var c = cv.getContext('2d');
        c.imageSmoothingEnabled = false;
        c.drawImage(PW.bake(d, { cuffed: false }).front, 0, 0, cv.width, cv.height);
        var label = document.createElement('span');
        label.textContent = d.name;
        row.appendChild(cv);
        row.appendChild(label);
        row.addEventListener('click', function () { selectCast(i); });
        wrap.appendChild(row);
      });
    }

    function selectCast(i) {
      adminIndex = i;
      renderCast();
      adminEditor.set(cast()[i]);
      adminNote('');
    }

    function openAdmin() {
      audio.wake();
      show('ovTitle', false);
      show('ovAdmin', true);
      if (!adminEditor) {
        var box = el('adminFacings');
        adminEditor = PW.createEditor(el('adminControls'), {
          value: cast()[adminIndex],
          onChange: function (def) { drawFacings(box, def); }
        });
      }
      if (adminIndex >= cast().length) adminIndex = 0;
      renderCast();
      adminEditor.set(cast()[adminIndex]);
      adminNote(readAdmin() ? 'Editing your local copy of the cast.' : 'Editing the published cast.');
    }

    function closeAdmin() {
      show('ovAdmin', false);
      show('ovTitle', true);
    }

    /* Every change re-bakes and re-renders, so the picker and the playfield
       show the new cast without a reload. */
    function refreshFromCast() {
      PW.OFFICER = PW.PLAYERS[0];
      PW.bakeAll();
      entries = buildEntries();
      if (ui.selectIndex >= entries.length) ui.selectIndex = 0;
      ui.playerArt = entries[ui.selectIndex].art;
      renderOfficers();
      renderCast();
    }

    function persistCast() {
      try {
        window.localStorage.setItem(ADMIN_KEY, JSON.stringify({
          officers: PW.PLAYERS, execs: PW.EXECS
        }));
        return true;
      } catch (e) { return false; }
    }

    function applyEdit() {
      var def = adminEditor.get();
      cast()[adminIndex] = def;
      refreshFromCast();
      adminNote(persistCast()
        ? def.name + ' saved here. Copy roster block to publish.'
        : def.name + ' is live for now; this browser will not keep them.');
    }

    function addToCast() {
      var def = PW.CHAR.defaults();
      def.name = adminCast === 'officers' ? 'NEW OFFICER' : 'NEW NAME';
      cast().push(PW.CHAR.toDef(def));
      adminIndex = cast().length - 1;
      refreshFromCast();
      adminEditor.set(cast()[adminIndex]);
      adminNote('Added. Give them a name, then Save.');
    }

    function dropFromCast() {
      if (cast().length < 2) {
        adminNote('Someone has to be left. Add a replacement first.');
        return;
      }
      var gone = cast()[adminIndex].name;
      cast().splice(adminIndex, 1);
      if (adminIndex >= cast().length) adminIndex = cast().length - 1;
      refreshFromCast();
      adminEditor.set(cast()[adminIndex]);
      persistCast();
      adminNote(gone + ' removed. Copy roster block to publish.');
    }

    function copyBlock() {
      var text = rosterBlock();
      function fell() {
        adminNote('Clipboard blocked. OnTheList.roster() in the console prints it.');
        console.log(text);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          adminNote('Copied. Paste it above the loader in the CMS embed to publish.');
        }, fell);
      } else { fell(); }
    }

    function resetCast() {
      try { window.localStorage.removeItem(ADMIN_KEY); } catch (e) { /* private mode */ }
      adminNote('Cleared. Reload to come back to the published cast.');
    }

    el('eyebrow').addEventListener('click', countTap);
    el('gateForm').addEventListener('submit', function (ev) { ev.preventDefault(); trySignIn(); });
    el('btnGateGo').addEventListener('click', trySignIn);
    el('btnGateBack').addEventListener('click', closeGate);
    el('tabOfficers').addEventListener('click', function () { switchTab('officers', this); });
    el('tabExecs').addEventListener('click', function () { switchTab('execs', this); });
    el('btnAdminNew').addEventListener('click', addToCast);
    el('btnAdminApply').addEventListener('click', applyEdit);
    el('btnAdminDrop').addEventListener('click', dropFromCast);
    el('btnAdminCopy').addEventListener('click', copyBlock);
    el('btnAdminReset').addEventListener('click', resetCast);
    el('btnAdminBack').addEventListener('click', closeAdmin);

    function switchTab(which, btn) {
      adminCast = which;
      adminIndex = 0;
      el('ovAdmin').querySelectorAll('.ol-tab').forEach(function (b) { b.classList.remove('is-on'); });
      btn.classList.add('is-on');
      renderCast();
      adminEditor.set(cast()[0]);
      adminNote('');
    }

    function toTitle() {
      phase = 'title';
      show('ovMaker', false);
      show('ovGate', false);
      show('ovAdmin', false);
      game = PW.newGame();
      dust.clear();
      ui.fresh = false;
      show('ovTitle', true); show('ovPause', false); show('ovEnd', false);
      el('btnPause').hidden = true;
    }

    function startRun() {
      audio.wake();
      phase = 'playing';
      ui.fresh = false;
      ui.playerArt = entries[ui.selectIndex].art;
      game = PW.newGame();
      dust.clear();
      lastPhase = '';
      show('ovTitle', false); show('ovPause', false); show('ovEnd', false);
      el('btnPause').hidden = false;
      audio.start();
    }

    function pause(on) {
      if (phase !== 'playing' && phase !== 'paused') return;
      phase = on ? 'paused' : 'playing';
      show('ovPause', on);
    }

    /* Result screen, per the contract: stamp, truth, plain, receipts, reward,
       replay. Engines fill the words; the shape stays the same everywhere. */
    function finish() {
      phase = 'over';
      el('btnPause').hidden = true;
      var cleared = game.phase === 'docket';
      var n = game.score;
      el('stamp').textContent = cleared ? 'FULL DOCKET' : 'SHIFT OVER';
      el('truth').textContent = cleared
        ? 'Every name on the list is booked.'
        : 'You made ' + n + (n === 1 ? ' arrest.' : ' arrests.');
      el('plain').textContent = cleared
        ? 'There was no one left to find, which is the only way this ends.'
        : 'The column behind you is what stopped you. Every arrest made it longer.';
      var receipts = el('receipts');
      receipts.innerHTML = '';
      function receipt(label, value) {
        var s = document.createElement('span');
        s.innerHTML = label + ' <b>' + value + '</b>';
        receipts.appendChild(s);
      }
      receipt('Arrests', n);
      receipt('Best', ui.best);
      if (ui.fresh) receipt('', 'New best');
      renderReward();
      show('ovEnd', true);
    }

    /* Renders only what the CMS actually filled in; with nothing set, the
       player never learns the slot was there. */
    function renderReward() {
      var box = el('reward');
      box.innerHTML = '';
      if (!CONFIG.rewardCode && !CONFIG.rewardLink) { box.hidden = true; return; }
      box.hidden = false;
      if (CONFIG.rewardDesc) {
        var d = document.createElement('div');
        d.className = 'gm-reward-desc';
        d.textContent = CONFIG.rewardDesc;
        box.appendChild(d);
      }
      if (CONFIG.rewardCode) {
        var wrap = document.createElement('div');
        wrap.className = 'gm-code';
        wrap.appendChild(document.createTextNode(CONFIG.rewardCode));
        var copy = document.createElement('button');
        copy.type = 'button';
        copy.textContent = 'Copy';
        copy.addEventListener('click', function () {
          try { navigator.clipboard.writeText(CONFIG.rewardCode); } catch (e) { /* denied */ }
          toast(CONFIG.copiedMsg);
        });
        wrap.appendChild(copy);
        box.appendChild(wrap);
      }
      if (CONFIG.rewardLink) {
        var a = document.createElement('a');
        a.className = 'gm-btn';
        a.href = CONFIG.rewardLink;
        a.target = '_blank';
        a.rel = 'noopener';
        a.style.textDecoration = 'none';
        a.textContent = CONFIG.rewardCode ? 'Shop with it applied' : 'Shop';
        box.appendChild(a);
      }
    }

    var toastTimer = null;
    function toast(msg) {
      var t = el('toast');
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1400);
    }

    // ----------------------------------------------------------------- input ---

    function steer(dx, dy) {
      if (phase !== 'playing') return;
      audio.wake();
      if (game.phase === 'dead' || game.phase === 'docket') return;
      var wasReady = game.phase === 'ready';
      if (PW.steer(game, dx, dy) && wasReady) audio.start();
    }

    var KEYS = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0]
    };

    /* Only claim the arrow keys while a shift is actually running, so the embed
       never fights the page's own scrolling. */
    document.addEventListener('keydown', function (ev) {
      if (ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
      var key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
      if (phase === 'playing' && KEYS[key]) {
        ev.preventDefault();
        if (!ev.repeat) steer(KEYS[key][0], KEYS[key][1]);
        return;
      }
      if (key === 'Escape' && (phase === 'playing' || phase === 'paused')) pause(phase === 'playing');
    });

    /* Swipe is the natural control on a phone; a tap still steers toward the
       point, which is what a mouse expects. */
    var SWIPE = 24;
    var touch = null;

    stage.addEventListener('pointerdown', function (ev) {
      if (phase !== 'playing') return;
      ev.preventDefault();
      audio.wake();
      if (game.phase !== 'playing') { if (PW.begin(game)) audio.start(); return; }
      touch = { x: ev.clientX, y: ev.clientY, swiped: false };
    });

    stage.addEventListener('pointermove', function (ev) {
      if (!touch || touch.swiped || phase !== 'playing') return;
      var dx = ev.clientX - touch.x, dy = ev.clientY - touch.y;
      if (Math.abs(dx) < SWIPE && Math.abs(dy) < SWIPE) return;
      touch.swiped = true;
      if (Math.abs(dx) > Math.abs(dy)) steer(Math.sign(dx), 0);
      else steer(0, Math.sign(dy));
    });

    function endTouch(ev) {
      if (!touch) return;
      var was = touch;
      touch = null;
      if (was.swiped || phase !== 'playing' || game.phase !== 'playing') return;
      var p = screen.toBuffer(ev.clientX, ev.clientY);
      var head = game.body[0];
      var hx = PW.VIEW.px + head.x * PW.VIEW.cell + PW.VIEW.cell / 2;
      var hy = PW.VIEW.py + head.y * PW.VIEW.cell + PW.VIEW.cell / 2;
      var dx = p.x - hx, dy = p.y - hy;
      if (Math.abs(dx) < PW.VIEW.cell / 2 && Math.abs(dy) < PW.VIEW.cell / 2) return;
      if (Math.abs(dx) > Math.abs(dy)) steer(Math.sign(dx), 0);
      else steer(0, Math.sign(dy));
    }
    stage.addEventListener('pointerup', endTouch);
    stage.addEventListener('pointercancel', function () { touch = null; });
    stage.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

    el('btnStart').addEventListener('click', startRun);
    el('btnMake').addEventListener('click', openMaker);
    el('btnMakerBack').addEventListener('click', closeMaker);
    el('btnSaveMine').addEventListener('click', saveCustom);
    el('btnClearMine').addEventListener('click', clearCustom);
    el('btnCopyMine').addEventListener('click', function () {
      var text = PW.CHAR.source(maker.get());
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { note('Object copied. Paste it into the roster to make them public.'); },
          function () { note('Clipboard blocked by the browser.'); });
      } else {
        note('Clipboard unavailable in this browser.');
      }
    });
    el('btnPause').addEventListener('click', function () { pause(phase === 'playing'); });
    el('btnResume').addEventListener('click', function () { pause(false); });
    el('btnQuit').addEventListener('click', toTitle);
    el('btnReplay').addEventListener('click', startRun);
    el('btnChange').addEventListener('click', toTitle);

    root.otlReset = toTitle;
    root.otlPause = function () { pause(phase === 'playing'); };

    // ------------------------------------------------------------------ loop ---

    function consumeEvents() {
      for (var i = 0; i < game.events.length; i += 1) {
        var e = game.events[i];
        if (e.type === 'steer') {
          audio.steer();
        } else if (e.type === 'arrest') {
          audio.arrest();
          ui.pop = 1;
          dust.burst(
            PW.VIEW.px + e.x * PW.VIEW.cell + PW.VIEW.cell / 2,
            PW.VIEW.py + e.y * PW.VIEW.cell + PW.VIEW.cell / 2,
            PW.UI.accent, 1.2
          );
          if (e.score > ui.best) { ui.best = e.score; writeBest(e.score); ui.fresh = true; }
        } else if (e.type === 'stopped') {
          audio.stopped();
          if (!calm) ui.shake = 4;
          dust.burst(
            PW.VIEW.px + Math.max(0, Math.min(PW.COLS - 1, e.x)) * PW.VIEW.cell + PW.VIEW.cell / 2,
            PW.VIEW.py + Math.max(0, Math.min(PW.ROWS - 1, e.y)) * PW.VIEW.cell + PW.VIEW.cell / 2,
            PW.UI.danger, 1.8
          );
        } else if (e.type === 'docket') {
          audio.arrest();
        }
      }
      game.events.length = 0;
    }

    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var last = performance.now();

    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ui.clock += dt;

      if (phase === 'playing') {
        PW.advance(game, dt);
        consumeEvents();
        if (game.phase !== lastPhase) {
          lastPhase = game.phase;
          if (game.phase === 'dead' || game.phase === 'docket') {
            setTimeout(function () { if (phase === 'playing') finish(); }, RETRY_DELAY * 1000);
          }
        }
      }

      dust.update(dt);
      ui.pop = Math.max(0, ui.pop - dt * 3.5);
      ui.shake *= Math.max(0, 1 - 9 * dt);
      if (ui.shake < 0.05) ui.shake = 0;

      PW.draw(ctx, game, ui);
      var sx = ui.shake > 0 ? (Math.random() - 0.5) * 2 * ui.shake : 0;
      var sy = ui.shake > 0 ? (Math.random() - 0.5) * 2 * ui.shake : 0;
      screen.present(sx, sy);
      requestAnimationFrame(frame);
    }

    renderOfficers();
    toTitle();
    requestAnimationFrame(frame);
  };
})(window.PW);
