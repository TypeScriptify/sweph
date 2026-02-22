# House Position

Once you have calculated the house cusps and a planet's ecliptic coordinates, the next natural question is: **which house does the planet fall in?** The `housePosition()` method answers this by returning a fractional house number. For example, a return value of `10.05` means the planet is in the 10th house, very near the beginning (cusp); `3.75` means the planet is three-quarters of the way through the 3rd house.

This is essential for chart interpretation -- the house a planet occupies tells you in which area of life that planet's energy is most active.

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2000, 1, 1, 12);
const geo = { longitude: -0.1276, latitude: 51.5074 }; // London

// Step 1: Get house cusps (we need ARMC from the result)
const h = swe.houses(jd, geo, 'P'); // Placidus

// Step 2: Get the planet's ecliptic position
const sun = swe.calc(jd, SE_SUN);

// Step 3: Get the obliquity of the ecliptic
// (the ARMC and obliquity are needed for the house position calculation)
const eps = 23.4393; // approximate; for precision, compute from the engine

// Step 4: Find which house the Sun is in
const housePos = swe.housePosition(
  h.armc,            // ARMC (sidereal time in degrees)
  geo.latitude,      // geographic latitude
  eps,               // obliquity of the ecliptic
  'P',               // house system (must match what you used in houses())
  sun.longitude,     // planet's ecliptic longitude
  sun.latitude       // planet's ecliptic latitude
);

const houseNumber = Math.floor(housePos);
console.log(`Sun is in house ${houseNumber} (exact position: ${housePos.toFixed(4)})`);
// Sun is in house 10 (exact position: 10.0536)

swe.close();
```

---

## Detailed Examples

### Complete workflow: all planets with their house positions

```typescript
import { SwissEph } from '../index';
import {
  SE_SUN, SE_MOON, SE_MERCURY, SE_VENUS, SE_MARS,
  SE_JUPITER, SE_SATURN, SE_URANUS, SE_NEPTUNE, SE_PLUTO,
} from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 4, 8, 18.28);
const geo = { longitude: -104.0, latitude: 25.0 };

// Step 1: Get houses (Placidus)
const h = swe.houses(jd, geo, 'P');

// We need the obliquity. A good approximation for current dates:
const eps = 23.4393;

// Step 2: Calculate each planet and its house position
const planets = [
  { id: SE_SUN,     name: 'Sun' },
  { id: SE_MOON,    name: 'Moon' },
  { id: SE_MERCURY, name: 'Mercury' },
  { id: SE_VENUS,   name: 'Venus' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
  { id: SE_URANUS,  name: 'Uranus' },
  { id: SE_NEPTUNE, name: 'Neptune' },
  { id: SE_PLUTO,   name: 'Pluto' },
];

for (const p of planets) {
  const pos = swe.calc(jd, p.id);
  const hp = swe.housePosition(
    h.armc, geo.latitude, eps, 'P',
    pos.longitude, pos.latitude
  );
  const houseNum = Math.floor(hp);
  const fraction = hp - houseNum;
  const percent = (fraction * 100).toFixed(1);

  console.log(
    `${p.name.padEnd(9)} ` +
    `lon: ${pos.longitude.toFixed(2).padStart(7)}  ` +
    `house: ${houseNum.toString().padStart(2)}  ` +
    `(${percent}% through the house)`
  );
}

swe.close();
```

### Comparing house positions across different house systems

The same planet can fall in different houses depending on which house system you use:

```typescript
import { SwissEph } from '../index';
import { SE_MOON } from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 1, 1, 0);
const geo = { longitude: -73.9857, latitude: 40.7484 }; // New York

const moon = swe.calc(jd, SE_MOON);
const eps = 23.4393;

const systems = ['P', 'K', 'E', 'W', 'R', 'C', 'O', 'T'];

for (const sys of systems) {
  const h = swe.houses(jd, geo, sys);
  const hp = swe.housePosition(
    h.armc, geo.latitude, eps, sys,
    moon.longitude, moon.latitude
  );
  console.log(
    `${swe.houseName(sys).padEnd(25)} Moon in house ${Math.floor(hp).toString().padStart(2)} (${hp.toFixed(3)})`
  );
}

swe.close();
```

### Using obliquity from the engine

For maximum precision, compute the obliquity rather than using a constant. You can derive it from the engine by computing the ecliptic/nutation values:

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SE_ECL_NUT } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 12);
const geo = { longitude: -0.1276, latitude: 51.5074 };

// SE_ECL_NUT returns nutation and obliquity data:
//   longitude = true obliquity of the ecliptic
//   latitude  = mean obliquity
const eclNut = swe.calc(jd, SE_ECL_NUT);
const trueObliquity = eclNut.longitude;  // ~23.4362 deg for 2024

const h = swe.houses(jd, geo, 'P');
const sun = swe.calc(jd, SE_SUN);

const hp = swe.housePosition(
  h.armc, geo.latitude, trueObliquity, 'P',
  sun.longitude, sun.latitude
);
console.log(`Sun house position: ${hp.toFixed(4)} (using true obliquity ${trueObliquity.toFixed(4)} deg)`);

swe.close();
```

**Note**: `SE_ECL_NUT` has value `-1` and is a special "planet" number that returns ecliptic/nutation data instead of a planetary position.

### Interpreting the fractional house number

```typescript
// The house position is a floating-point number from 1.000 to 12.999...

const housePos = 7.333;

// Integer part = house number
const houseNumber = Math.floor(housePos);
// houseNumber = 7 (planet is in the 7th house)

// Fractional part = how far through the house (0.0 = at cusp, 1.0 = at next cusp)
const fraction = housePos - houseNumber;
// fraction = 0.333 (one-third of the way through the 7th house)

// Some astrologers divide houses into thirds:
// 0.00-0.33 = "early in the house" or "angular third"
// 0.33-0.67 = "middle of the house" or "succedent third"
// 0.67-1.00 = "late in the house" or "cadent third"
```

---

## Deep Explanation

### Parameters explained

The `housePosition()` method requires five pieces of information:

| Parameter | Description                                                                                     |
|-----------|-------------------------------------------------------------------------------------------------|
| `armc`    | ARMC (sidereal time expressed in degrees). Get this from the `armc` field of `houses()` result. ARMC = sidereal time in hours * 15. |
| `lat`     | Geographic latitude of the observer in degrees. Positive = north, negative = south.             |
| `eps`     | Obliquity of the ecliptic in degrees. Approximately 23.44 degrees for current dates. For precision, compute using `SE_ECL_NUT`. |
| `system`  | House system letter code (e.g., `'P'` for Placidus). Must match the system used when computing cusps. |
| `eclLon`  | Planet's ecliptic longitude in degrees (0-360).                                                  |
| `eclLat`  | Planet's ecliptic latitude in degrees. For the Sun this is essentially 0. For the Moon it can be up to ~5 degrees. For most planets it is small but nonzero. |

### The return value

The return value is a floating-point number:
- The integer part (1-12) is the house number.
- The fractional part (0.000 to 0.999...) indicates position within the house.
- The range is `1.0` to `12.999...` (never 13.0; after 12.999 it wraps to 1.0).

### Why ecliptic latitude matters

Most astrology software ignores ecliptic latitude when assigning house positions, effectively projecting every body onto the ecliptic (latitude = 0). This is acceptable for the Sun and inner planets (which stay very close to the ecliptic) but can matter for:

- **The Moon**: up to ~5 degrees of latitude
- **Pluto**: up to ~17 degrees of latitude
- **Asteroids**: highly inclined orbits

The Swiss Ephemeris `housePosition()` properly accounts for ecliptic latitude by converting the body's position through the house system's projection geometry. For the most accurate house placements, always pass the actual latitude.

If you want the traditional "projected onto the ecliptic" behavior, pass `0` for `eclLat`.

### House position vs. house cusp

These are different but related concepts:

- **House cusps** (`houses()`) give you the twelve boundary longitudes. They answer: "At what ecliptic degree does each house begin?"
- **House position** (`housePosition()`) gives you a planet's location within the house system. It answers: "Given this planet at this ecliptic longitude/latitude, which house is it in and how far through?"

You might think you could determine the house just by comparing the planet's longitude to the cusp longitudes. This works for simple systems (Equal, Whole Sign) but is incorrect for quadrant systems (Placidus, Koch, etc.) when the planet has nonzero ecliptic latitude. The `housePosition()` function handles the full 3D geometry correctly.

### Edge cases

**Circumpolar regions**: At high latitudes (near or beyond the Arctic/Antarctic circles), Placidus and Koch houses can become distorted or undefined. The `housePosition()` function may still return a value, but its astronomical meaning becomes questionable. Consider using Equal, Whole Sign, or Topocentric houses for locations beyond ~60 degrees latitude.

**Planets on a cusp**: If a planet's house position is very close to a whole number (e.g., 6.002 or 5.998), it is very near the cusp boundary. In practice, with a fractional position like 5.998, the planet is technically still in the 5th house but essentially at the 6th cusp. Different astrologers have different orb allowances for "conjunct the cusp."

**Consistency of system**: Always use the same house system letter code in both `houses()` (to get the ARMC and cusps) and `housePosition()`. Using mismatched systems will give incorrect results.

### Typical workflow summary

```
1. Choose a date/time and location
2. Compute Julian Day:        jd = SwissEph.julianDay(...)
3. Compute house cusps:       h  = swe.houses(jd, geo, 'P')
4. Compute planet position:   p  = swe.calc(jd, SE_SUN)
5. Get obliquity:             eps = 23.4393 (or compute via SE_ECL_NUT)
6. Get house position:        hp = swe.housePosition(h.armc, geo.latitude, eps, 'P', p.longitude, p.latitude)
7. Interpret:                 Math.floor(hp) is the house number
```
