# Occultations

A **lunar occultation** occurs when the Moon passes directly in front of another celestial body -- a planet, star, or asteroid -- temporarily hiding it from view. The word "occultation" comes from the Latin *occultare*, meaning "to conceal." While solar eclipses are technically a special case of occultation (the Moon occulting the Sun), the term "occultation" in astronomy usually refers to the Moon hiding other objects.

Occultations are significant to astronomers for several reasons:

- **Precise timing**: Because the Moon has no atmosphere, a star disappears and reappears almost instantaneously (within milliseconds). Timing these events precisely allows measurement of the Moon's position to very high accuracy, which has historically helped refine our knowledge of the lunar orbit and Earth's rotation.
- **Binary star discovery**: If a star winks out in two steps instead of one, it reveals an unsuspected close binary pair too tight to resolve with telescopes. Many binary stars were first discovered this way.
- **Stellar diameters**: A star does not vanish truly instantaneously -- the light diffracts around the Moon's edge, producing a brief Fresnel diffraction pattern. By analyzing this pattern with high-speed photometry, astronomers can measure the angular diameter of the star.
- **Asteroid occultations**: When an asteroid passes in front of a star, the shadow cast on Earth reveals the asteroid's precise size and shape. Citizen scientists across the predicted shadow path record the timing, and combining their observations produces a silhouette profile of the asteroid.
- **Historical importance**: Before modern techniques like radar ranging and space missions, lunar occultations were one of the primary methods for determining precise positions of celestial objects, especially radio sources in the early days of radio astronomy.

The Swiss Ephemeris can predict occultations of planets and fixed stars by the Moon -- finding when they happen globally, where they are visible, and how they appear from a specific location.

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_JUPITER } from '../../constants';

const swe = new SwissEph();

// Find the next occultation of Jupiter by the Moon after 2024-01-01
const jd = SwissEph.julianDay(2024, 1, 1, 0);
const occ = swe.occultationGlobal(jd, SE_JUPITER);

const date = SwissEph.fromJulianDay(occ.maximum);
console.log(`Next Jupiter occultation: ${date.year}-${date.month}-${date.day}`);

swe.close();
```

---

## Detailed Examples

### Finding the next occultation of a planet

```typescript
import { SwissEph } from '../index';
import {
  SE_VENUS, SE_MARS, SE_JUPITER, SE_SATURN,
} from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 0);

const fmt = (jd: number) => {
  const d = SwissEph.fromJulianDay(jd);
  return `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`;
};

const planets = [
  { id: SE_VENUS,   name: 'Venus' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
];

for (const p of planets) {
  const occ = swe.occultationGlobal(jd, p.id);
  console.log(`Next occultation of ${p.name}: ${fmt(occ.maximum)}`);
}

swe.close();
```

### Occultation of a fixed star

You can search for the Moon occulting a fixed star by passing the star name and using planet = 0.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 0);

// Find the next occultation of Regulus (Alpha Leonis) by the Moon
// Planet parameter should be 0 when using a star name
const occ = swe.occultationGlobal(jd, 0, 'Regulus');

const date = SwissEph.fromJulianDay(occ.maximum);
console.log(`Next Regulus occultation: ${date.year}-${date.month}-${date.day}`);

// Contact times
const fmt = (jd: number) => {
  if (jd === 0) return '(n/a)';
  const d = SwissEph.fromJulianDay(jd);
  const h = Math.floor(d.hour);
  const m = Math.floor((d.hour - h) * 60);
  return `${h}:${String(m).padStart(2,'0')} UT`;
};

console.log(`  First contact:  ${fmt(occ.first)}`);
console.log(`  Maximum:        ${fmt(occ.maximum)}`);
console.log(`  Fourth contact: ${fmt(occ.fourth)}`);

swe.close();
```

### Where is the occultation visible?

Use `occultationWhere` to find the geographic coordinates where the occultation is visible at a given moment.

```typescript
import { SwissEph } from '../index';
import { SE_JUPITER } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 0);

// Find the next Jupiter occultation
const occ = swe.occultationGlobal(jd, SE_JUPITER);

// Where is it visible at maximum?
const where = swe.occultationWhere(occ.maximum, SE_JUPITER);

console.log(`Occultation visible from:`);
console.log(`  Longitude: ${where.geopos.longitude.toFixed(2)} deg`);
console.log(`  Latitude:  ${where.geopos.latitude.toFixed(2)} deg`);
console.log(`  Type flags: ${where.type}`);

swe.close();
```

### Local occultation: is it visible from my city?

Use `occultationLocal` to find when the next occultation of a given body is visible from a specific location.

```typescript
import { SwissEph } from '../index';
import { SE_JUPITER } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 0);

const london = { longitude: -0.128, latitude: 51.507 };

// Find the next Jupiter occultation visible from London
const local = swe.occultationLocal(jd, SE_JUPITER, london);

const fmt = (jd: number) => {
  if (jd === 0) return '(n/a)';
  const d = SwissEph.fromJulianDay(jd);
  const h = Math.floor(d.hour);
  const m = Math.floor((d.hour - h) * 60);
  const s = Math.round(((d.hour - h) * 60 - m) * 60);
  return `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')} ${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} UT`;
};

console.log(`Jupiter occultation visible from London:`);
console.log(`  Disappearance (1st contact): ${fmt(local.firstContact)}`);
console.log(`  Maximum:                     ${fmt(local.maximum)}`);
console.log(`  Reappearance (4th contact):  ${fmt(local.fourthContact)}`);

// Attributes
console.log(`  Magnitude: ${local.attributes.magnitude.toFixed(4)}`);

swe.close();
```

### Occultation of a fixed star from a specific location

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 0);

const tokyo = { longitude: 139.692, latitude: 35.690 };

// Find the next occultation of Aldebaran visible from Tokyo
const local = swe.occultationLocal(jd, 0, tokyo, 'Aldebaran');

const date = SwissEph.fromJulianDay(local.maximum);
console.log(`Aldebaran occultation from Tokyo: ${date.year}-${date.month}-${date.day}`);

const fmt = (jd: number) => {
  if (jd === 0) return '(n/a)';
  const d = SwissEph.fromJulianDay(jd);
  const h = Math.floor(d.hour);
  const m = Math.floor((d.hour - h) * 60);
  const s = Math.round(((d.hour - h) * 60 - m) * 60);
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} UT`;
};

console.log(`  Star disappears: ${fmt(local.firstContact)}`);
console.log(`  Star reappears:  ${fmt(local.fourthContact)}`);

swe.close();
```

### Filtering by occultation type

Like solar eclipses, occultations can be total (the planet/star is completely hidden), annular (for large planets where the Moon does not completely cover them -- rare), or partial.

```typescript
import { SwissEph } from '../index';
import { SE_JUPITER, SE_ECL_TOTAL } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 0);

// Find only total occultations of Jupiter
const occ = swe.occultationGlobal(jd, SE_JUPITER, null, SE_ECL_TOTAL);

const date = SwissEph.fromJulianDay(occ.maximum);
console.log(`Next total Jupiter occultation: ${date.year}-${date.month}-${date.day}`);

swe.close();
```

### Listing occultations over a period

```typescript
import { SwissEph } from '../index';
import { SE_VENUS } from '../../constants';

const swe = new SwissEph();

let jd = SwissEph.julianDay(2024, 1, 1, 0);
const endJd = SwissEph.julianDay(2030, 1, 1, 0);

console.log('Venus occultations by the Moon, 2024-2029:');
while (jd < endJd) {
  const occ = swe.occultationGlobal(jd, SE_VENUS);
  if (occ.maximum > endJd) break;

  const date = SwissEph.fromJulianDay(occ.maximum);
  const where = swe.occultationWhere(occ.maximum, SE_VENUS);
  console.log(
    `  ${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}` +
    `  lon=${where.geopos.longitude.toFixed(1)}, lat=${where.geopos.latitude.toFixed(1)}`
  );

  jd = occ.maximum + 1;
}

swe.close();
```

### Searching backward

```typescript
import { SwissEph } from '../index';
import { SE_SATURN } from '../../constants';

const swe = new SwissEph();

// Find the most recent Saturn occultation before 2025-01-01
const jd = SwissEph.julianDay(2025, 1, 1, 0);
const occ = swe.occultationGlobal(jd, SE_SATURN, null, 0, true);

const date = SwissEph.fromJulianDay(occ.maximum);
console.log(`Most recent Saturn occultation: ${date.year}-${date.month}-${date.day}`);

swe.close();
```

---

## Deep Explanation

### How occultations differ from eclipses

Although the Swiss Ephemeris uses similar functions and type constants for both, occultations and eclipses are conceptually different:

| Aspect | Solar Eclipse | Occultation |
|--------|--------------|-------------|
| **Occulting body** | Moon | Moon |
| **Occulted body** | Sun | Planet or star |
| **Apparent size of occulted body** | ~0.5 degrees (large) | Tiny (stars are points; planets are a few arc-seconds to ~1 arc-minute) |
| **Duration** | Minutes to hours | Seconds (stars) to ~1 hour (planets) |
| **Visibility path** | Narrow, ~100-200 km | Can be wider or narrower depending on geometry |

### Disappearance and reappearance

When the Moon occults a star, two dramatic events occur:

1. **Disappearance** (immersion, first contact): The star vanishes almost instantaneously as the Moon's leading edge passes over it. For a bright star, this is a striking sight -- one moment the star is shining, the next instant it is gone. Because the Moon has no atmosphere, there is no gradual fading.

2. **Reappearance** (emersion, fourth contact): The star suddenly reappears from behind the Moon's trailing edge. If the Moon is a waxing crescent, the reappearance happens on the Moon's dark limb, making it particularly dramatic as the star seems to pop out of darkness.

For planets, which have a measurable angular diameter, the disappearance and reappearance are not instantaneous but take several seconds as the Moon gradually covers and then uncovers the planetary disc.

### Grazing occultations

A **grazing occultation** occurs when the star passes very close to the Moon's edge (the limb). Because the Moon's limb is not perfectly smooth -- it has mountains, craters, and valleys -- the star may blink on and off multiple times as it passes behind mountain peaks and reappears in valleys. These events are scientifically valuable because they map the Moon's limb profile with high precision.

### The contact points

The result structure for occultations is the same as for solar eclipses:

| Field | Description |
|-------|-------------|
| `first` / `firstContact` | Occultation begins (star/planet starts to disappear) |
| `second` / `secondContact` | Complete disappearance (total occultation begins) |
| `maximum` | Mid-occultation |
| `third` / `thirdContact` | Reappearance begins (total occultation ends) |
| `fourth` / `fourthContact` | Occultation fully ends (star/planet fully visible again) |

For a star (which is a point source), second and third contacts coincide with first and fourth contacts respectively -- the star is either visible or it is not. The second/third contacts are more meaningful for planets with measurable apparent diameters.

### The type bitmask

Occultation results use the same type constants as solar eclipses:

| Constant | Value | Meaning |
|----------|-------|---------|
| `SE_ECL_TOTAL` | 4 | The body is completely hidden by the Moon |
| `SE_ECL_ANNULAR` | 8 | The Moon is smaller than the body (theoretically possible for very nearby planets, but extremely rare in practice) |
| `SE_ECL_PARTIAL` | 16 | Only part of the body is covered |
| `SE_ECL_CENTRAL` | 1 | The occultation has a central line across Earth |
| `SE_ECL_NONCENTRAL` | 2 | No central line |

### The `starname` parameter

When searching for occultations of fixed stars:
- Pass the star name as a string (e.g., `'Regulus'`, `'Aldebaran'`, `'Spica'`, `'Antares'`)
- Set the `planet` parameter to `0`
- The star name follows the same conventions as `swe.fixedStar()` -- you can use the traditional name, the Bayer designation, or a catalog number

When searching for occultations of planets:
- Pass the planet constant (e.g., `SE_JUPITER`, `SE_VENUS`)
- Set `starname` to `null` (or omit it)

### Attributes

The occultation attributes are the same type as solar eclipse attributes (`EclipseAttributes`). The most relevant fields for occultations are:

- `fraction`: How much of the occulted body's area is covered (1.0 for a total occultation of a star)
- `magnitude`: How much of the occulted body's diameter is covered
- `sarosCycle` / `sarosMember`: Saros series information (occultations also follow Saros-like cycles)

### Historical importance of occultations

Lunar occultations have played a crucial role in the history of astronomy:

- **Navigation**: Before GPS and accurate clocks, sailors could determine their longitude by timing lunar occultations and comparing with predicted times in almanacs.
- **Radio astronomy**: In the 1960s, lunar occultations of radio sources were one of the few ways to determine precise positions of radio-emitting objects. The occultation of the radio source 3C 273 in 1962 led to the identification of quasars.
- **Lunar topography**: Grazing occultation observations contributed significantly to mapping the Moon's limb profile before space missions provided direct measurements.
- **Stellar astronomy**: Thousands of close binary stars and stellar diameters have been measured through occultation timing, providing data that would be difficult or impossible to obtain by other means.

### Tips

- Occultation searches can be slower than eclipse searches because the Moon must be checked against specific planet/star positions rather than the Sun's predictable path.
- When iterating through occultations, advance `jd` by at least 1 day past the previous result.
- Not all global occultations are visible from any given location. Use `occultationLocal` to find events visible from your specific location.
- The brightest stars that are regularly occulted by the Moon lie near the ecliptic: Aldebaran, Regulus, Spica, and Antares. These are the most commonly observed occultations.
- Planetary occultations are rarer but more spectacular to observe, especially for bright planets like Venus and Jupiter.
