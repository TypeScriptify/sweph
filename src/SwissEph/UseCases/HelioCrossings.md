# Heliocentric Crossings

A **heliocentric crossing** finds the exact moment when a planet reaches a specific **heliocentric longitude** -- that is, its position as seen from the Sun (not from Earth). In heliocentric coordinates, planets move smoothly and predictably along their orbits without the apparent retrograde loops and speed variations we see from Earth.

The `helioCrossing()` method finds the next Julian Day when a planet reaches a given heliocentric longitude, searching forward (or backward) from a starting date.

This is useful for:
- Tracking actual orbital positions of planets
- Computing synodic cycles (conjunctions as seen from the Sun)
- Orbital mechanics and mission planning
- Heliocentric astrology (a niche but established branch)
- Understanding the geometry behind retrograde motion

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_MARS } from '../../constants';

const swe = new SwissEph();
const startJd = SwissEph.julianDay(2025, 1, 1, 0);

// Find when Mars next reaches 0° heliocentric longitude (vernal equinox direction)
const result = swe.helioCrossing(SE_MARS, 0, startJd);

const d = SwissEph.fromJulianDay(result.jd);
console.log(`Mars crosses 0° heliocentric: ${d.year}-${String(d.month).padStart(2,'0')}-${String(Math.floor(d.day)).padStart(2,'0')}`);

swe.close();
```

---

## Detailed Examples

### Tracking a planet's heliocentric ingresses through the zodiac

From the Sun's perspective, Mars takes about 687 days (1.88 years) to go around the full 360 degrees. We can find when it enters each 30-degree segment:

```typescript
import { SwissEph } from '../index';
import { SE_MARS } from '../../constants';

const swe = new SwissEph();
let jd = SwissEph.julianDay(2025, 1, 1, 0);

const signs = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

console.log('Mars heliocentric sign ingresses (starting 2025):');

for (let i = 0; i < 12; i++) {
  const lon = i * 30;
  const result = swe.helioCrossing(SE_MARS, lon, jd);
  const d = SwissEph.fromJulianDay(result.jd);

  console.log(
    `  Mars enters ${signs[i].padEnd(12)} (${String(lon).padStart(3)}°): ` +
    `${d.year}-${String(d.month).padStart(2,'0')}-${String(Math.floor(d.day)).padStart(2,'0')}`
  );

  jd = result.jd + 1; // advance past this crossing
}

swe.close();
```

### Comparing heliocentric and geocentric positions

One of the most instructive uses of heliocentric coordinates is understanding how geocentric retrograde motion arises. When Earth "overtakes" a slower outer planet, the planet appears to move backward (retrograde) in geocentric coordinates, even though heliocentrically it never stops or reverses.

```typescript
import { SwissEph } from '../index';
import { SE_MARS, SEFLG_HELCTR } from '../../constants';

const swe = new SwissEph();

// Check Mars geocentric vs heliocentric over a period that includes retrograde
const startJd = SwissEph.julianDay(2025, 10, 1, 0);

console.log('Date        Geocentric    Speed     Heliocentric   Speed    Retro?');
console.log('----------  ----------  --------    ------------  ------    ------');

for (let day = 0; day < 180; day += 10) {
  const jd = startJd + day;
  const d = SwissEph.fromJulianDay(jd);

  const geo = swe.calc(jd, SE_MARS);                  // geocentric (default)
  const helio = swe.calc(jd, SE_MARS, SEFLG_HELCTR);  // heliocentric

  const retrograde = geo.longitudeSpeed < 0 ? ' YES' : '  no';

  console.log(
    `${d.year}-${String(d.month).padStart(2,'0')}-${String(Math.floor(d.day)).padStart(2,'0')}  ` +
    `${geo.longitude.toFixed(2).padStart(8)}°  ` +
    `${geo.longitudeSpeed.toFixed(4).padStart(8)}  ` +
    `  ${helio.longitude.toFixed(2).padStart(8)}°  ` +
    `${helio.longitudeSpeed.toFixed(4).padStart(6)}  ` +
    `  ${retrograde}`
  );
}

swe.close();
```

Notice that the heliocentric speed is always positive (the planet never reverses in reality), while the geocentric speed can become negative during retrograde periods.

### Computing a synodic cycle heliocentrically

A **synodic cycle** is the time between two successive conjunctions of a planet with another body as seen from the Sun. The simplest case: how long between successive heliocentric conjunctions of Earth and Mars?

```typescript
import { SwissEph } from '../index';
import { SE_EARTH } from '../../constants';

const swe = new SwissEph();

// First, find Earth's heliocentric longitude at a starting point
const jd1 = SwissEph.julianDay(2025, 1, 1, 0);
const earth1 = swe.calc(jd1, SE_EARTH, 256); // SEFLG_HELCTR = 256

// Find when Mars next reaches that same heliocentric longitude
// (this approximates the heliocentric conjunction)
const mars1 = swe.helioCrossing(4, earth1.longitude, jd1); // SE_MARS = 4
const d1 = SwissEph.fromJulianDay(mars1.jd);
console.log(`Mars-Earth heliocentric conjunction ~${d1.year}-${String(d1.month).padStart(2,'0')}-${String(Math.floor(d1.day)).padStart(2,'0')}`);

// Find the next one (~780 days later, the Mars synodic period)
const mars2 = swe.helioCrossing(4, earth1.longitude, mars1.jd + 700);
const d2 = SwissEph.fromJulianDay(mars2.jd);
console.log(`Next conjunction ~${d2.year}-${String(d2.month).padStart(2,'0')}-${String(Math.floor(d2.day)).padStart(2,'0')}`);

const synodicDays = mars2.jd - mars1.jd;
console.log(`Synodic period: ${synodicDays.toFixed(1)} days (${(synodicDays / 365.25).toFixed(2)} years)`);
// Mars synodic period is approximately 780 days (2.135 years)

swe.close();
```

### Searching backward in time

The `dir` parameter allows searching in the reverse direction:

```typescript
import { SwissEph } from '../index';
import { SE_JUPITER } from '../../constants';

const swe = new SwissEph();
const now = SwissEph.julianDay(2025, 6, 15, 0);

// Find the PREVIOUS time Jupiter was at 0° heliocentric (searching backward)
const prev = swe.helioCrossing(SE_JUPITER, 0, now, 0, -1);
const dp = SwissEph.fromJulianDay(prev.jd);
console.log(`Jupiter last crossed 0° helio: ${dp.year}-${String(dp.month).padStart(2,'0')}-${String(Math.floor(dp.day)).padStart(2,'0')}`);

// Find the NEXT time (searching forward, the default)
const next = swe.helioCrossing(SE_JUPITER, 0, now, 0, 0);
const dn = SwissEph.fromJulianDay(next.jd);
console.log(`Jupiter next crosses 0° helio: ${dn.year}-${String(dn.month).padStart(2,'0')}-${String(Math.floor(dn.day)).padStart(2,'0')}`);

const period = next.jd - prev.jd;
console.log(`Jupiter heliocentric period: ${(period / 365.25).toFixed(2)} years`);
// Should be close to 11.86 years

swe.close();
```

### All outer planets: time to complete one heliocentric orbit

```typescript
import { SwissEph } from '../index';
import {
  SE_MARS, SE_JUPITER, SE_SATURN,
  SE_URANUS, SE_NEPTUNE, SE_PLUTO,
} from '../../constants';

const swe = new SwissEph();

const planets = [
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
  { id: SE_URANUS,  name: 'Uranus' },
  { id: SE_NEPTUNE, name: 'Neptune' },
  { id: SE_PLUTO,   name: 'Pluto' },
];

const now = SwissEph.julianDay(2025, 1, 1, 0);

for (const pl of planets) {
  // Find when the planet crosses 0° going forward from now
  const cross1 = swe.helioCrossing(pl.id, 0, now);
  // Find the next crossing of 0° (one full orbit later)
  const cross2 = swe.helioCrossing(pl.id, 0, cross1.jd + 30);

  const periodDays = cross2.jd - cross1.jd;
  const periodYears = periodDays / 365.25;

  console.log(`${pl.name.padEnd(9)} orbital period: ${periodYears.toFixed(2)} years (${periodDays.toFixed(0)} days)`);
}

swe.close();
```

---

## Deep Explanation

### Heliocentric vs. Geocentric Coordinates

**Geocentric** coordinates describe positions as seen from Earth. This is the traditional astronomical and astrological perspective. Geocentric positions include all the apparent effects of Earth's own orbital motion: retrograde loops, varying speeds, and the oscillation of inferior planets around the Sun.

**Heliocentric** coordinates describe positions as seen from the Sun (from the Greek "helios" = sun). From this viewpoint:
- All planets move in the same direction (counterclockwise as seen from above the ecliptic)
- Planets never go retrograde
- Orbital speeds are nearly constant (varying only due to orbital eccentricity)
- The geometry is much simpler -- it directly reflects the physical reality of the solar system

```
  Geocentric view:           Heliocentric view:

  Mars appears to            Mars moves steadily
  loop backward              in one direction
  (retrograde)               (no retrograde)

      *   *                  * * * * * * *
     *     *                  (smooth curve)
    *       *
     *     *
      *   *
```

### Why Retrograde is a Geocentric Illusion

Retrograde motion occurs because Earth orbits faster than the outer planets. When Earth "overtakes" an outer planet, that planet appears to drift backward against the background stars -- much like a slower car on the highway appears to move backward when you pass it.

Heliocentrically, no planet ever reverses direction. The heliocentric speed is always positive (for prograde orbits). This is why `helioCrossing()` gives clean, unambiguous results -- there is exactly one crossing of any longitude per orbit.

### Which Planets Can Use helioCrossing?

The `helioCrossing()` method works for any body that orbits the Sun:

| Planet | Works? | Orbital Period |
|--------|--------|---------------|
| Mercury | Yes | 0.24 years (88 days) |
| Venus | Yes | 0.62 years (225 days) |
| Earth | Yes (SE_EARTH = 14) | 1.00 year (365.25 days) |
| Mars | Yes | 1.88 years |
| Jupiter | Yes | 11.86 years |
| Saturn | Yes | 29.46 years |
| Uranus | Yes | 84.01 years |
| Neptune | Yes | 164.8 years |
| Pluto | Yes | 247.9 years |
| Chiron | Yes | ~50.7 years |
| Sun | No | The Sun IS the center in heliocentric coordinates |
| Moon | No | The Moon orbits Earth, not the Sun directly |

For the Moon, use `moonCrossing()` instead. For the Sun, use `sunCrossing()`.

### The `dir` Parameter

- `dir = 0` (default): Search **forward** in time from `jd`
- `dir = -1` (or any negative value): Search **backward** in time from `jd`

This is useful when you want to find, for example, the most recent time a planet was at a particular longitude.

### Synodic Periods

The **synodic period** is the time between successive conjunctions of two bodies as seen from a third (usually the Sun). For a planet and Earth:

```
Synodic period = 1 / |1/P_earth - 1/P_planet|
```

Where P is the orbital period. Some examples:
| Planet | Synodic Period |
|--------|---------------|
| Mercury | 116 days |
| Venus | 584 days |
| Mars | 780 days (2.14 years) |
| Jupiter | 399 days (1.09 years) |
| Saturn | 378 days (1.04 years) |

### Heliocentric Astrology

Some astrologers use heliocentric charts alongside or instead of geocentric charts. In heliocentric astrology:
- The Sun is at the center (no Sun position in the chart)
- The Moon is not used (it orbits Earth, not the Sun)
- Earth replaces the Sun as a charted body
- There are no retrograde periods
- Aspects between planets reflect the actual geometric relationships in space

Proponents argue that heliocentric aspects represent the "objective" or "cosmic" energies, while geocentric aspects represent the "subjective" or "personal" experience of those energies.

### Precision and Edge Cases

The `helioCrossing()` function uses iterative numerical methods to find the exact crossing time. For planets with nearly circular orbits (Venus, Earth), convergence is quick and very precise. For planets with higher eccentricity (Mercury, Mars, Pluto), the function still converges but may take slightly more iterations internally.

For very slow planets (Neptune, Pluto), note that a single heliocentric crossing takes a very long time -- Pluto takes nearly 248 years for one orbit, so it crosses a given longitude only once in a human lifetime. The function handles this correctly but be aware that searching for the "next" crossing of a slow planet may return a date far in the future.

### API Details

```typescript
swe.helioCrossing(
  planet: number,     // Planet constant (SE_MARS, SE_JUPITER, etc.)
  longitude: number,  // Target heliocentric longitude in degrees (0-360)
  jd: number,         // Starting Julian Day
  flags?: number,     // Calculation flags (optional, default 0)
  dir?: number        // Search direction: 0 = forward (default), negative = backward
): CrossingResult
```

**Returns:**
```typescript
interface CrossingResult {
  jd: number;  // Julian Day of the crossing
}
```

The returned Julian Day can be converted to a calendar date with `SwissEph.fromJulianDay(result.jd)`.
