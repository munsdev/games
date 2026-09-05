# Character spec

A character in Perp Walk is a plain data object, not drawn pixel art.
`src/sprites.js` bakes every sprite it needs once at boot from shared parts, so
adding someone means adding an object to `PW.EXECS` in `src/roster.js` and
nothing else.

This file is self-contained on purpose: hand it to anyone (or any conversation)
that has never seen the repo, and they can produce valid characters from it.

## The current ten

Each is a white-collar archetype rather than a specific person — funnier, ages
better, and avoids the right-of-publicity problem that a recognisable caricature
would create. Each carries a **silhouette**, one **signature colour**, and at
most one **prop**; that is roughly all that survives at this sprite size.

| Name | Archetype | Visual signature |
| --- | --- | --- |
| Pharma Bro | Price-gouging drug executive | Lean, slicked dark hair, navy blazer, pill bottle |
| Crypto Founder | Token promoter | Grey beanie, black tee with bare arms, laptop |
| Oil Baron | Extraction money | Heavy, tan cowboy hat, cream suit, bolo chain |
| PE Vulture | Leveraged-buyout financier | Lean, grey slick hair, charcoal pinstripes, briefcase |
| Slumlord | Negligent landlord | Heavy, bald, rumpled maroon short sleeves, key ring |
| Tobacco Lobbyist | Influence for hire | White hair, grey suit, red tie, lit cigar |
| Payday Lender | Predatory credit | Red cap, loud gold jacket, gold chain, phone |
| Wellness Grifter | Supplement mysticism | Lean, long blonde hair, cream linen, green smoothie |
| Defense Contractor | Procurement money | Steel-grey suit, lapels, badge, briefcase |
| Casino Boss | House money | Heavy, shades, burgundy tuxedo, gold chain, cigar |

The player is a separate object, `PW.OFFICER` — plain municipal police, navy
uniform, capped shield, gold badge, duty belt. Same schema.

## Schema

Every field is optional except `id`, `name`, `skin`, `shirt`, `pants`, `shoes`.
**Any value outside these lists falls back silently to a default** — it will not
throw, it will just render wrong, so stay inside the lists.

| Field | Values | Notes |
| --- | --- | --- |
| `id` | lowercase slug, unique | Internal only |
| `name` | uppercase, 1–2 words | Shown only on the web page's roster board, never in play. Keep under ~18 characters or the card wraps to three lines |
| `skin` | `pale` `peach` `olive` `tan` `brown` `deep` | |
| `build` | `normal` `heavy` `lean` | Default `normal`. Sets torso width, arm position, leg width |
| `hair` | `black` `dark` `brown` `ginger` `blonde` `grey` `white` | Omit if `hairStyle` is `bald` |
| `hairStyle` | `buzz` `slick` `rough` `long` `bald` | Anything unlisted renders as `buzz` |
| `beard` | `{ style, color }` | `style`: `full`, `goatee`, or anything else for stubble. `color` uses the `hair` list |
| `eyes` | `plain` `round` `shades` | `round` = spectacles, `shades` = dark bar |
| `hat` | `cap` `beanie` `cowboy` `police` | Needs `hatColor` (hex) |
| `hatColor` | hex | |
| `shirt` | hex | The dominant colour of the character |
| `sleeves` | `long` `short` | `short` shows bare forearms in skin tone |
| `pants` | hex | |
| `shoes` | hex | |
| `prop` | `briefcase` `laptop` `cup` `phone` `pills` `keyring` `cigar` `derrick` | Held in the right hand. Dropped once handcuffed — cuffed sprites never show it |
| `tie` | hex | Vertical strip down the chest |
| `lapels` | hex | Suit jacket edges |
| `pinstripe` | hex | Vertical stripes across the torso |
| `chain` | `true` | Short gold neck chain |
| `badge` | `true` | Small amber shield on the chest |
| `belt` | hex | Waist band with a gold buckle |
| `backText` | hex | Two marks across the shoulder blades, visible only from behind |
| `offsetX` | integer | Shifts the whole figure sideways in its cell. Leave it out unless something needs room beside the body |

## Working within 24 pixels

A figure occupies about 16 × 20 pixels. That buys roughly **three** legible
distinguishing features, so pick them deliberately:

1. **Silhouette** — build plus hat plus hair. This is what reads first and from
   furthest away.
2. **One signature colour** — the `shirt`, essentially. Two characters with
   similar builds and similar shirt colours will be confused in motion, so
   assign shirt colours across the whole roster at once rather than one at a
   time.
3. **One prop or torso detail** — the closest read, and the one that carries the
   joke.

Two further constraints worth stating plainly:

- **Archetypes, not portraits.** A recognisable likeness of a living person,
  labelled as a criminal, is a defamation and right-of-publicity problem that
  the rest of this project does not have. Keep everyone generic.
- **Signal wealth through costume, never physiognomy.** The "greedy financier"
  has an ugly iconographic history — hooked noses, moneybag and vermin imagery.
  Use cufflinks, watches, briefcases, lanyards, golf gloves. It is better design
  anyway: props survive downscaling and facial features do not.

## Output format

Produce exactly this, one object per character, and nothing else:

```js
{
  id: 'shipping', name: 'PORT MAGNATE',
  skin: 'olive', build: 'heavy', hair: 'grey', hairStyle: 'slick',
  hat: 'cap', hatColor: '#2b3a4a',
  shirt: '#3d5a6c', lapels: '#2c4351', sleeves: 'long', chain: true,
  pants: '#2b3340', shoes: '#181c24', eyes: 'plain', prop: 'briefcase'
},
```

The roster length is not fixed at ten — the shuffled bag adapts to however many
are in `PW.EXECS`. Eight or sixteen work as well as ten.
