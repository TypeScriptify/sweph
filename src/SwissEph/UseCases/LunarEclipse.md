# Lunar Eclipses

A **lunar eclipse** occurs when the Earth passes between the Sun and the Moon, casting Earth's shadow onto the Moon. Unlike solar eclipses, which are only visible from a narrow path on Earth, a lunar eclipse is visible from anywhere on the night side of the planet where the Moon is above the horizon. This makes lunar eclipses far more commonly observed than solar eclipses.

Lunar eclipses can only happen during a Full Moon, when the Sun and Moon are on opposite sides of the Earth. But just as with solar eclipses, the Moon's orbit is tilted about 5 degrees from the ecliptic, so most Full Moons pass above or below Earth's shadow. An eclipse only occurs when the Full Moon is near one of its orbital nodes.

During a total lunar eclipse, the Moon does not disappear entirely. Instead, it typically turns a deep red or copper color -- sometimes called a "Blood Moon." This happens because Earth's atmosphere bends (refracts) sunlight around the planet's edge, and the atmosphere filters out shorter blue wavelengths while allowing longer red wavelengths to reach the Moon.

---

## Quick Example

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// Find the next lunar eclipse after January 1, 2025
const jd = SwissEph.julianDay(2025, 1, 1, 0);
const eclipse = swe.lunarEclipseGlobal(jd);

const date = SwissEph.fromJulianDay(eclipse.maximum);
console.log(`Next lunar eclipse: ${date.year}-${date.month}-${date.day}`);
console.log(`Maximum at JD: ${eclipse.maximum.toFixed(6)}`);

swe.close();
```

---

## Detailed Examples

### The 2025 March 14 total lunar eclipse

```typescript
import { SwissEph } from '../index';
import { SE_ECL_TOTAL } from '../../constants';

const swe = new SwissEph();

// Search for the next total lunar eclipse after 2025-01-01
const jd = SwissEph.julianDay(2025, 1, 1, 0);
const eclipse = swe.lunarEclipseGlobal(jd, SE_ECL_TOTAL);

const fmt = (jd: number) => {
  if (jd === 0) return '(n/a)';
  const d = SwissEph.fromJulianDay(jd);
  const h = Math.floor(d.hour);
  const m = Math.floor((d.hour - h) * 60);
  return `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')} ${h}:${String(m).padStart(2,'0')} UT`;
};

console.log(`Total lunar eclipse`);
console.log(`  Maximum:          ${fmt(eclipse.maximum)}`);
console.log(`  Penumbral begin:  ${fmt(eclipse.penumbralBegin)}`);
console.log(`  Partial begin:    ${fmt(eclipse.partialBegin)}`);
console.log(`  Total begin:      ${fmt(eclipse.totalBegin)}`);
console.log(`  Total end:        ${fmt(eclipse.totalEnd)}`);
console.log(`  Partial end:      ${fmt(eclipse.partialEnd)}`);
console.log(`  Penumbral end:    ${fmt(eclipse.penumbralEnd)}`);
// 2025-03-14, maximum around 06:58 UT

swe.close();
```

### Eclipse attributes: magnitude and shadow sizes

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2025, 1, 1, 0);
const eclipse = swe.lunarEclipseGlobal(jd);

// Get detailed attributes at maximum
const how = swe.lunarEclipseHow(eclipse.maximum);

console.log(`Eclipse type flags: ${how.type}`);
console.log(`Umbral magnitude:    ${how.umbraMagnitude.toFixed(4)}`);
console.log(`Penumbral magnitude: ${how.penumbraMagnitude.toFixed(4)}`);
console.log(`Moon diameter:       ${how.moonDiameter.toFixed(2)} arc-minutes`);
console.log(`Umbra diameter:      ${how.umbraDiameter.toFixed(2)} arc-minutes`);
console.log(`Penumbra diameter:   ${how.penumbraDiameter.toFixed(2)} arc-minutes`);
console.log(`Sun dist from node:  ${how.sunDistanceFromNode.toFixed(2)} deg`);

// For the 2025 Mar 14 eclipse, umbral magnitude is about 1.176
// (greater than 1.0 = total eclipse; the Moon fits entirely inside the umbra)

swe.close();
```

### Local visibility: is the eclipse visible from my city?

Use `lunarEclipseLocal` to find when the Moon rises and sets during the eclipse at your location, which tells you how much of the eclipse you can observe.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2025, 1, 1, 0);

// Check visibility from different cities
const cities = [
  { name: 'New York',  geo: { longitude: -74.006, latitude: 40.713 } },
  { name: 'London',    geo: { longitude: -0.128,  latitude: 51.507 } },
  { name: 'Tokyo',     geo: { longitude: 139.692, latitude: 35.690 } },
  { name: 'Sydney',    geo: { longitude: 151.209, latitude: -33.868 } },
];

const fmt = (jd: number) => {
  if (jd === 0) return '(below horizon)';
  const d = SwissEph.fromJulianDay(jd);
  const h = Math.floor(d.hour);
  const m = Math.floor((d.hour - h) * 60);
  return `${h}:${String(m).padStart(2,'0')} UT`;
};

for (const city of cities) {
  const local = swe.lunarEclipseLocal(jd, city.geo);
  const date = SwissEph.fromJulianDay(local.maximum);
  console.log(`\n${city.name} (${date.year}-${date.month}-${date.day}):`);
  console.log(`  Maximum:         ${fmt(local.maximum)}`);
  console.log(`  Moon rise:       ${fmt(local.moonRise)}`);
  console.log(`  Moon set:        ${fmt(local.moonSet)}`);
  console.log(`  Umbra magnitude: ${local.attributes.umbraMagnitude.toFixed(3)}`);

  // Check if the full eclipse is visible
  if (local.moonRise === 0 || local.moonRise < local.penumbralBegin) {
    console.log(`  Full eclipse visible (Moon is up the entire time)`);
  } else {
    console.log(`  Partial visibility (Moon rises/sets during eclipse)`);
  }
}

swe.close();
```

### Filtering by eclipse type

```typescript
import { SwissEph } from '../index';
import { SE_ECL_TOTAL, SE_ECL_PARTIAL, SE_ECL_PENUMBRAL } from '../../constants';

const swe = new SwissEph();

// Find the next penumbral lunar eclipse
let jd = SwissEph.julianDay(2024, 1, 1, 0);
const penumbral = swe.lunarEclipseGlobal(jd, SE_ECL_PENUMBRAL);
const d1 = SwissEph.fromJulianDay(penumbral.maximum);
console.log(`Next penumbral: ${d1.year}-${d1.month}-${d1.day}`);

// Find the next partial lunar eclipse
const partial = swe.lunarEclipseGlobal(jd, SE_ECL_PARTIAL);
const d2 = SwissEph.fromJulianDay(partial.maximum);
console.log(`Next partial:   ${d2.year}-${d2.month}-${d2.day}`);

// Find the next total lunar eclipse
const total = swe.lunarEclipseGlobal(jd, SE_ECL_TOTAL);
const d3 = SwissEph.fromJulianDay(total.maximum);
console.log(`Next total:     ${d3.year}-${d3.month}-${d3.day}`);

swe.close();
```

### Listing all lunar eclipses over a period

```typescript
import { SwissEph } from '../index';
import { SE_ECL_TOTAL, SE_ECL_PARTIAL, SE_ECL_PENUMBRAL } from '../../constants';

const swe = new SwissEph();

let jd = SwissEph.julianDay(2024, 1, 1, 0);
const endJd = SwissEph.julianDay(2028, 1, 1, 0);

const typeName = (flags: number): string => {
  if (flags & SE_ECL_TOTAL) return 'Total';
  if (flags & SE_ECL_PARTIAL) return 'Partial';
  if (flags & SE_ECL_PENUMBRAL) return 'Penumbral';
  return 'Unknown';
};

console.log('Lunar eclipses 2024-2027:');
while (jd < endJd) {
  const ecl = swe.lunarEclipseGlobal(jd);
  if (ecl.maximum > endJd) break;

  const date = SwissEph.fromJulianDay(ecl.maximum);
  const how = swe.lunarEclipseHow(ecl.maximum);

  console.log(
    `  ${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}` +
    `  ${typeName(ecl.type).padEnd(10)}` +
    `  umbra mag: ${how.umbraMagnitude.toFixed(3)}`
  );

  jd = ecl.maximum + 1;
}

swe.close();
```

### Searching backward in time

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// Find the most recent lunar eclipse before 2025-01-01
const jd = SwissEph.julianDay(2025, 1, 1, 0);
const eclipse = swe.lunarEclipseGlobal(jd, 0, true); // backward = true

const date = SwissEph.fromJulianDay(eclipse.maximum);
console.log(`Most recent lunar eclipse: ${date.year}-${date.month}-${date.day}`);

swe.close();
```

---

## Deep Explanation

### Eclipse types

| Type | Constant | Description |
|------|----------|-------------|
| **Total** | `SE_ECL_TOTAL` (4) | The Moon passes completely into Earth's umbral shadow. The entire lunar disc turns dark/red. Umbral magnitude > 1.0. |
| **Partial** | `SE_ECL_PARTIAL` (16) | Only part of the Moon enters the umbra. Part of the Moon remains bright. Umbral magnitude between 0.0 and 1.0. |
| **Penumbral** | `SE_ECL_PENUMBRAL` (64) | The Moon passes only through Earth's penumbral shadow. The dimming is subtle and often hard to notice visually. Umbral magnitude < 0.0. |

### Umbra and penumbra

Earth casts two nested shadows into space:

- **Umbra**: The dark inner cone of shadow where all direct sunlight is blocked. If you were standing on the Moon inside the umbra, you would see Earth completely blocking the Sun.
- **Penumbra**: The lighter outer shadow where only part of the Sun is blocked. From inside the penumbra, you would see Earth covering part of the Sun but not all of it.

The umbra is about 2.5 times the Moon's diameter at the Moon's distance, which is why total lunar eclipses are possible and can last over an hour.

### Understanding magnitude

For lunar eclipses, **magnitude** has a specific meaning:

- **Umbral magnitude** (`umbraMagnitude`): How deeply the Moon penetrates into the umbra, measured as a fraction of the Moon's diameter. A value of 0.0 means the Moon just touches the umbral edge. A value of 1.0 means the Moon's edge just reaches the center of the umbra (the entire Moon is inside). Values greater than 1.0 mean the Moon is well inside the umbra (deeper totality). For the 2025 Mar 14 eclipse, the umbral magnitude is about 1.178.

- **Penumbral magnitude** (`penumbraMagnitude`): Same concept but for the penumbra. Always larger than the umbral magnitude.

A negative umbral magnitude means the Moon does not enter the umbra at all (purely penumbral eclipse).

### The Danjon scale

Astronomers use the **Danjon scale** (L value) to classify the visual appearance of a total lunar eclipse:

| L | Description |
|---|-------------|
| 0 | Very dark eclipse; Moon almost invisible at mid-totality |
| 1 | Dark eclipse; gray or brownish color; details hard to see |
| 2 | Deep red or rust-colored; very dark central shadow with brighter edge |
| 3 | Brick-red; umbral shadow usually has a bright or yellow rim |
| 4 | Very bright copper-red or orange; umbral shadow has a bluish, very bright rim |

The Danjon value cannot be predicted by ephemeris calculations alone -- it depends on atmospheric conditions, particularly volcanic aerosols. Major volcanic eruptions (like Pinatubo in 1991) can produce very dark eclipses (L=0) for several years afterward. The Swiss Ephemeris predicts *when* and *where* eclipses occur, but not their color.

### Why the Moon turns red

During totality, the only light reaching the Moon has been refracted (bent) through Earth's atmosphere. Earth's atmosphere acts like a lens that bends sunlight around the planet's edge and filters it:

1. Short-wavelength light (blue, violet) is scattered away by the atmosphere (the same Rayleigh scattering that makes our sky blue).
2. Long-wavelength light (red, orange) passes through more easily and is bent toward the Moon.

The result is that the Moon is illuminated by the combined light of all the sunrises and sunsets happening around Earth's edge at that moment. If you were standing on the Moon during a total lunar eclipse, you would see Earth surrounded by a bright red ring.

### Eclipse timeline (the `lunarEclipseGlobal` result)

| Field | Description |
|-------|-------------|
| `penumbralBegin` | Moon enters the penumbra. Very subtle dimming begins. |
| `partialBegin` | Moon enters the umbra. A dark "bite" appears on the Moon's edge. |
| `totalBegin` | Moon is completely inside the umbra. Totality begins; Moon turns red. |
| `maximum` | Mid-eclipse. The Moon is deepest inside the shadow. |
| `totalEnd` | Moon begins to exit the umbra. Totality ends. |
| `partialEnd` | Moon completely exits the umbra. Only penumbral shading remains. |
| `penumbralEnd` | Moon exits the penumbra entirely. Eclipse is over. |

For a partial eclipse, `totalBegin` and `totalEnd` are 0 (totality never occurs).
For a penumbral eclipse, `partialBegin`, `partialEnd`, `totalBegin`, and `totalEnd` are all 0.

### The `lunarEclipseHow` result

| Field | Description |
|-------|-------------|
| `type` | Bitmask of eclipse type flags |
| `umbraMagnitude` | Fraction of Moon's diameter inside the umbra (>1.0 = total) |
| `penumbraMagnitude` | Fraction of Moon's diameter inside the penumbra |
| `moonDiameter` | Apparent diameter of the Moon (arc minutes) |
| `umbraDiameter` | Apparent diameter of Earth's umbral shadow at the Moon's distance (arc minutes) |
| `penumbraDiameter` | Apparent diameter of Earth's penumbral shadow (arc minutes) |
| `sunDistanceFromNode` | Sun's angular distance from the nearest lunar node (degrees) |

### Differences from solar eclipses

| Aspect | Solar Eclipse | Lunar Eclipse |
|--------|--------------|---------------|
| **When** | New Moon | Full Moon |
| **What happens** | Moon blocks Sun | Earth's shadow covers Moon |
| **Visibility** | Narrow path (100-200 km wide) | Entire night hemisphere |
| **Duration of totality** | Up to ~7 minutes | Up to ~1 hour 47 minutes |
| **Frequency** | 2-5 per year globally | 0-3 per year |
| **Danger** | Never look at Sun without filter | Safe to watch with naked eye |
| **Timing** | Different for every location | Same UT time for all observers |

### Local visibility considerations

Unlike solar eclipses, the timing of a lunar eclipse (in UT) is the same for everyone -- the Moon enters and exits Earth's shadow at the same absolute moment. The question is whether the Moon is above the horizon at your location during that time.

The `lunarEclipseLocal` result includes `moonRise` and `moonSet` times, which tell you when the Moon is above the horizon at your location. If the Moon rises after penumbral begin or sets before penumbral end, you will miss part of the eclipse.

### Tips

- When searching for eclipses, advance `jd` by at least 1 day past the previous result to find the next one.
- A `lunarEclipseHow` call without a `geo` parameter gives the eclipse attributes as seen from the geocenter (Earth's center). With a `geo` parameter, it accounts for the observer's location, which can slightly affect the apparent magnitude since the Moon's position in the umbra shifts slightly with parallax.
- Penumbral eclipses are very subtle visually. Most observers cannot notice a penumbral eclipse unless the penumbral magnitude exceeds about 0.7.
- The `sunDistanceFromNode` value indicates how close the geometry is to producing a central eclipse. Smaller values mean deeper eclipses.
