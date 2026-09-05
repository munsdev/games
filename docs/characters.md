# Character format

Produce character objects for a pixel game. Each is pure data — no art.

## Fields

Required: `id`, `name`, `skin`, `shirt`, `pants`, `shoes`. Everything else optional.

**Values outside these lists fail silently and render wrong. Do not invent any.**

| Field | Values |
| --- | --- |
| `id` | lowercase slug, unique |
| `name` | uppercase, max 18 chars |
| `skin` | `pale` `peach` `olive` `tan` `brown` `deep` |
| `build` | `normal` `heavy` `lean` |
| `hair` | `black` `dark` `brown` `ginger` `blonde` `grey` `white` |
| `hairStyle` | `buzz` `slick` `rough` `long` `bald` |
| `beard` | `{ style: 'full'\|'goatee'\|'stubble', color: <hair value> }` |
| `eyes` | `plain` `round` `shades` |
| `hat` | `cap` `beanie` `cowboy` `police` — requires `hatColor` |
| `hatColor` | hex |
| `shirt` | hex |
| `sleeves` | `long` `short` |
| `pants` | hex |
| `shoes` | hex |
| `prop` | `briefcase` `laptop` `cup` `phone` `pills` `keyring` `cigar` `derrick` |
| `tie` | hex |
| `lapels` | hex |
| `pinstripe` | hex |
| `chain` | `true` |
| `badge` | `true` |
| `belt` | hex |
| `backText` | hex |

## Rules

- Sprites are 24px. Each character gets about three legible features: silhouette
  (build + hat + hair), one signature colour (`shirt`), one prop or torso detail.
- Assign `shirt` colours across the whole set at once. Similar build + similar
  shirt colour = indistinguishable in motion.
- Types, not real people. No likenesses of actual individuals.
- Signal wealth or status through costume and props, never facial features.

## Output

Emit only this, one object per character, comma-separated. No prose.

```js
{
  id: 'shipping', name: 'PORT MAGNATE',
  skin: 'olive', build: 'heavy', hair: 'grey', hairStyle: 'slick',
  hat: 'cap', hatColor: '#2b3a4a',
  shirt: '#3d5a6c', lapels: '#2c4351', sleeves: 'long', chain: true,
  pants: '#2b3340', shoes: '#181c24', eyes: 'plain', prop: 'briefcase'
},
```
