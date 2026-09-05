# On the List

A small browser arcade game. Everyone out here is on a list, and you are the one
serving the warrants: patrol the plaza arresting white-collar executives, and
each one you catch joins the handcuffed column trailing behind you. Walk into
your own column or off the edge and the shift is over.

Mechanically it is endless Snake — a public-domain arcade form from 1976 — with an
original cast, art, and framing. Everything here is written from scratch.

## Playing

Open `index.html` in a browser. No build step, no dependencies, no server needed.

| Input | Action |
| --- | --- |
| Arrow keys / WASD | Steer |
| Space / Enter | Start, or retry after being stopped |
| `C` | Back to the line-up |
| Click / tap | Steer toward the tap |
| `M` | Mute |
| `R` | Restart |

## How it works

- **Board.** 16x16 cells at 24px, so a 384x384 playfield.
- **Speed.** One step every 0.30s at the start, ramping to 0.11s by a score of 30.
- **Pickups.** Ten executives are dealt from a shuffled bag: the whole roster comes
  out in a random order, then the bag reshuffles. You see everyone before anyone
  repeats.
- **The column.** An arrested executive keeps their own face, build, and clothes
  and switches to a handcuffed pose, hands joined in front. They drop whatever
  they were carrying.
- **Officers.** Four presets, plus one you build yourself in the page's own
  editor. The custom officer, the one you picked and your best score all persist
  in `localStorage` under `onthelist.*`.

## Layout

| Path | What it holds |
| --- | --- |
| `src/palette.js` | Colour tables and a shading helper |
| `src/pixel.js` | Low-res drawing surface, whole-number upscaling, frame loop |
| `src/font.js` | 5x7 bitmap font |
| `src/sprites.js` | Parametric character renderer |
| `src/roster.js` | The four officers and ten executives |
| `src/charedit.js` | The character editor panel, shared by the game page and the forge |
| `src/audio.js` | Four blips and a mute toggle |
| `src/game.js` | Rules: cells, movement, growth, collisions |
| `src/render.js` | The plaza, the column, HUD, and full-screen states |
| `src/main.js` | Input routing and wiring |

Characters are described as small objects rather than hand-drawn pixel data, so
`src/sprites.js` bakes every sprite once at boot from shared parts. Adding a
character means adding a few lines to `src/roster.js`. `docs/characters.md` is
the standalone field reference.

## Development

```sh
node test/logic.test.js          # rules checks, no browser needed
python3 -m http.server 8777      # then open the harnesses below
```

- `tools/editor.html` is the character editor: every field as a control, all six
  sprites live, the roster alongside for comparison, and the object to copy out.
  Loads any existing character to edit, or a pasted one.
- `test/sheet.html` renders every sprite at 5x for art review.
- `test/autoplay.html` drives the real game with a bot, for watching gameplay
  states without playing.
- `node tools/bundle.js [in.html] [out.html]` inlines the `../src/*.js` script
  tags of a page to produce a single self-contained file. Defaults to
  `tools/page.html` -> `dist/on-the-list.html`; pass `tools/editor.html
  dist/character-editor.html` for the editor. `src/` is the source of truth,
  `dist/` is only build output.
